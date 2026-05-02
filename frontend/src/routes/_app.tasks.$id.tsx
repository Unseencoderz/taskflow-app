import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, FolderKanban, Plus, Send, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import type { Priority, TaskStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/tasks/$id")({
  component: TaskDetailPage,
});

function TaskDetailPage() {
  const { id } = useParams({ from: "/_app/tasks/$id" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const task = useStore((s) => s.tasks.find((t) => t.id === id));
  const projects = useStore((s) => s.projects);
  const users = useStore((s) => s.users);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const addSubtask = useStore((s) => s.addSubtask);
  const toggleSubtask = useStore((s) => s.toggleSubtask);
  const removeSubtask = useStore((s) => s.removeSubtask);
  const addComment = useStore((s) => s.addComment);
  const loadTaskDetail = useStore((s) => s.loadTaskDetail);

  const [newSub, setNewSub] = useState("");
  const [newComment, setNewComment] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(task?.description ?? "");

  useEffect(() => {
    loadTaskDetail(id).catch(() => undefined);
  }, [id, loadTaskDetail]);

  useEffect(() => {
    if (task) setDesc(task.description);
  }, [task?.id, task?.description]);

  if (!task) {
    return (
      <EmptyState
        title="Task not found"
        action={
          <Button asChild variant="outline">
            <Link to="/tasks">Back to tasks</Link>
          </Button>
        }
      />
    );
  }

  const project = projects.find((p) => p.id === task.projectId);
  const projectMembers = (project?.memberIds ?? [])
    .map((uid) => users.find((u) => u.id === uid))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));
  const canEditAll = project?.projectRole === "admin";
  const canEditStatus = canEditAll || task.assigneeId === user?.id;
  const canDelete = canEditAll;

  const update = (patch: Parameters<typeof updateTask>[1]) =>
    user
      ? updateTask(task.id, patch, user.id).catch((err) =>
          toast.error(err instanceof Error ? err.message : "Task update failed"),
        )
      : Promise.resolve();

  const doneSubs = task.subtasks.filter((s) => s.done).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/tasks" })}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
      </Button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card/50 p-6">
            <Input
              defaultValue={task.title}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== task.title) {
                  if (canEditAll) {
                    update({ title: e.target.value.trim() });
                    toast.success("Title updated");
                  }
                }
              }}
              readOnly={!canEditAll}
              className="border-0 bg-transparent px-0 text-xl font-bold focus-visible:ring-0"
            />
            {project && (
              <Link
                to="/projects/$id"
                params={{ id: project.id }}
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <FolderKanban className="h-3 w-3" /> {project.name}
              </Link>
            )}

            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
                {!editingDesc && canEditAll && (
                  <Button variant="ghost" size="sm" onClick={() => { setDesc(task.description); setEditingDesc(true); }}>
                    Edit
                  </Button>
                )}
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingDesc(false)}>Cancel</Button>
                    <Button size="sm" onClick={() => { update({ description: desc }); setEditingDesc(false); toast.success("Description updated"); }}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {task.description || "No description yet."}
                </p>
              )}
            </div>
          </div>

          {/* Subtasks */}
          <div className="rounded-2xl border border-border bg-card/50 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Subtasks</h3>
              <span className="text-xs text-muted-foreground">{doneSubs}/{task.subtasks.length}</span>
            </div>
            <div className="space-y-1.5">
              {task.subtasks.map((s) => (
                <div key={s.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40">
                  <Checkbox
                    checked={s.done}
                    onCheckedChange={() => {
                      toggleSubtask(task.id, s.id).catch((err) =>
                        toast.error(err instanceof Error ? err.message : "Subtask update failed"),
                      );
                    }}
                  />
                  <span className={s.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>
                    {s.title}
                  </span>
                  <button
                    onClick={() => {
                      removeSubtask(task.id, s.id).catch((err) =>
                        toast.error(err instanceof Error ? err.message : "Subtask remove failed"),
                      );
                    }}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newSub.trim()) {
                    addSubtask(task.id, newSub.trim())
                      .then(() => setNewSub(""))
                      .catch((err) => toast.error(err instanceof Error ? err.message : "Subtask add failed"));
                  }
                }}
              >
                <Input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add a subtask..." />
                <Button type="submit" variant="outline" size="icon"><Plus className="h-4 w-4" /></Button>
              </form>
            </div>
          </div>

          {/* Comments */}
          <div className="rounded-2xl border border-border bg-card/50 p-6">
            <h3 className="mb-3 text-sm font-semibold">Comments</h3>
            <div className="space-y-4">
              {task.comments.length === 0 && (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              )}
              {task.comments.map((c) => {
                const author = users.find((u) => u.id === c.authorId);
                return (
                  <div key={c.id} className="flex gap-3">
                    {author && <Avatar name={author.name} color={author.avatarColor} size="sm" />}
                    <div className="min-w-0 flex-1 rounded-xl border border-border bg-background p-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">{author?.name ?? "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{c.text}</p>
                    </div>
                  </div>
                );
              })}
              <form
                className="flex gap-2 border-t border-border pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (user && newComment.trim()) {
                    addComment(task.id, user.id, newComment.trim())
                      .then(() => setNewComment(""))
                      .catch((err) => toast.error(err instanceof Error ? err.message : "Comment failed"));
                  }
                }}
              >
                {user && <Avatar name={user.name} color={user.avatarColor} size="sm" />}
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="flex-1 resize-none"
                />
                <Button type="submit" size="icon" className="self-end gradient-primary text-primary-foreground">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="space-y-4 rounded-2xl border border-border bg-card/50 p-5">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
              <Select value={task.status} onValueChange={(v) => update({ status: v as TaskStatus })} disabled={!canEditStatus}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Priority</Label>
              <Select value={task.priority} onValueChange={(v) => update({ priority: v as Priority })} disabled={!canEditAll}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Assignee</Label>
              <Select
                value={task.assigneeId ?? "none"}
                onValueChange={(v) => update({ assigneeId: v === "none" ? null : v })}
                disabled={!canEditAll}
              >
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {projectMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Due date</Label>
              <Input
                type="date"
                className="mt-1.5"
                defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                onChange={(e) => update({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                disabled={!canEditAll}
              />
            </div>
            {canDelete && (
              <Button
                variant="outline"
                className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  deleteTask(task.id)
                    .then(() => {
                      toast.success("Task deleted");
                      navigate({ to: "/tasks" });
                    })
                    .catch((err) => toast.error(err instanceof Error ? err.message : "Delete failed"));
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Delete task
              </Button>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <h3 className="mb-3 text-sm font-semibold">Activity</h3>
            <ol className="relative space-y-3 border-l border-border pl-4">
              {[...task.activity].reverse().map((a) => {
                const actor = users.find((u) => u.id === a.actorId);
                return (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                    <p className="text-xs">
                      <span className="font-medium">{actor?.name ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{a.text}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(a.createdAt), "MMM d, h:mm a")}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
