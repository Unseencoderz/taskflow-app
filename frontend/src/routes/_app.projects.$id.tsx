import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  Search,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  UserPlus,
} from "lucide-react";
import { useStore, selectProjectMembers, selectProjectTasks } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ProjectStatusBadge, RoleBadge, PriorityBadge, StatusBadge } from "@/components/Badges";
import { AvatarStack, Avatar } from "@/components/Avatar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskCreateModal } from "@/components/TaskCreateModal";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import type { ProjectStatus, TaskStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/projects/$id")({
  // Prevent `/projects/new` from matching this dynamic segment (reserved path → create flow).
  params: {
    parse: (raw) => {
      if (raw.id === "new") throw new Error("reserved");
      return raw;
    },
  },
  skipRouteOnParseError: { params: true },
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { id } = useParams({ from: "/_app/projects/$id" });
  const navigate = useNavigate();
  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const loadProjectDetail = useStore((s) => s.loadProjectDetail);

  useEffect(() => {
    loadProjectDetail(id).catch(() => undefined);
  }, [id, loadProjectDetail]);

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        description="This project may have been deleted."
        action={
          <Button asChild variant="outline">
            <Link to="/projects">Back to projects</Link>
          </Button>
        }
      />
    );
  }

  const state = useStore.getState();
  const members = selectProjectMembers(state, project.id);
  const tasks = selectProjectTasks(state, project.id);
  const isProjectAdmin = project.projectRole === "admin";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/projects" })}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
      </Button>

      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-bold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{project.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {project.category && (
              <span className="rounded-md bg-muted/60 px-2 py-0.5 font-medium text-foreground/90">{project.category}</span>
            )}
            {project.visibility && (
              <span className="capitalize">Visibility: {project.visibility}</span>
            )}
            {project.dueDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Due {format(new Date(project.dueDate), "MMM d, yyyy")}
              </span>
            )}
            <span>{tasks.length} tasks</span>
            <AvatarStack users={members} size="sm" />
          </div>
        </div>
        {isProjectAdmin && (
          <div className="flex shrink-0 items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the project and all of its tasks. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      deleteProject(project.id)
                        .then(() => {
                          toast.success("Project deleted");
                          navigate({ to: "/projects" });
                        })
                        .catch((err) => toast.error(err instanceof Error ? err.message : "Delete failed"));
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </header>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          {isProjectAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <TasksTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamTab projectId={project.id} />
        </TabsContent>

        {isProjectAdmin && (
          <TabsContent value="settings" className="mt-4">
            <SettingsTab
              project={project}
              onSave={(patch) => {
                updateProject(project.id, patch)
                  .then(() => toast.success("Project updated"))
                  .catch((err) => toast.error(err instanceof Error ? err.message : "Update failed"));
              }}
              onDelete={() => {
                deleteProject(project.id)
                  .then(() => {
                    toast.success("Project deleted");
                    navigate({ to: "/projects" });
                  })
                  .catch((err) => toast.error(err instanceof Error ? err.message : "Delete failed"));
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function TasksTab({ projectId }: { projectId: string }) {
  const tasks = useStore((s) => s.tasks.filter((t) => t.projectId === projectId));
  const users = useStore((s) => s.users);
  const project = useStore((s) => s.projects.find((p) => p.id === projectId)!);
  const members = useMemo(
    () => project.memberIds.map((id) => users.find((u) => u.id === id)).filter((u): u is NonNullable<typeof u> => Boolean(u)),
    [project, users],
  );

  const [view, setView] = useState<"board" | "list">("board");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"due" | "priority" | "created">("created");
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");

  const filtered = useMemo(() => {
    const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
    return tasks
      .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
      .filter((t) => (assigneeFilter === "all" ? true : t.assigneeId === assigneeFilter))
      .filter((t) => t.title.toLowerCase().includes(query.toLowerCase().trim()))
      .sort((a, b) => {
        if (sortBy === "due") {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return ad - bd;
        }
        if (sortBy === "priority") return priorityRank[a.priority] - priorityRank[b.priority];
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tasks, statusFilter, assigneeFilter, query, sortBy]);

  const openCreate = (status: TaskStatus) => {
    setCreateStatus(status);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | "all")}>
          <SelectTrigger className="w-full lg:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-full lg:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-full lg:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Newest</SelectItem>
            <SelectItem value="due">Due date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          <button
            className={`rounded-md p-1.5 ${view === "board" ? "bg-accent text-foreground" : "text-muted-foreground"}`}
            onClick={() => setView("board")}
            aria-label="Board view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            className={`rounded-md p-1.5 ${view === "list" ? "bg-accent text-foreground" : "text-muted-foreground"}`}
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
        <Button onClick={() => openCreate("todo")} className="gradient-primary text-primary-foreground">
          <Plus className="mr-1.5 h-4 w-4" /> Add task
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No tasks yet" description="Create your first task to get started." />
      ) : view === "board" ? (
        <KanbanBoard tasks={filtered} onAdd={openCreate} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Assignee</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const assignee = users.find((u) => u.id === t.assigneeId);
                return (
                  <tr key={t.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-3 py-2.5">
                      <Link to="/tasks/$id" params={{ id: t.id }} className="font-medium hover:underline">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={assignee.name} color={assignee.avatarColor} size="xs" />
                          <span className="text-xs">{assignee.name}</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                    <td className="px-3 py-2.5"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {t.dueDate ? format(new Date(t.dueDate), "MMM d") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TaskCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        members={members}
        defaultStatus={createStatus}
      />
    </div>
  );
}

function TeamTab({ projectId }: { projectId: string }) {
  const project = useStore((s) => s.projects.find((p) => p.id === projectId)!);
  const users = useStore((s) => s.users);
  const removeMember = useStore((s) => s.removeProjectMember);
  const inviteProjectMember = useStore((s) => s.inviteProjectMember);
  const updateProjectMemberRole = useStore((s) => s.updateProjectMemberRole);
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const isProjectAdmin = project.projectRole === "admin";

  const members = project.memberIds
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="overflow-hidden rounded-xl border border-border bg-card/40">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Member</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                {isProjectAdmin && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.name} color={m.avatarColor} size="sm" />
                      <span className="font-medium">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3">
                    {isProjectAdmin && m.id !== user?.id ? (
                      <Select
                        value={m.role}
                        onValueChange={(nextRole) => {
                          updateProjectMemberRole(projectId, m.id, nextRole as "admin" | "editor" | "viewer" | "member")
                            .then(() => toast.success("Role updated"))
                            .catch((err) => toast.error(err instanceof Error ? err.message : "Role update failed"));
                        }}
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <RoleBadge role={m.role} />
                    )}
                  </td>
                  {isProjectAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={m.id === user?.id}
                        onClick={() => {
                          removeMember(projectId, m.id)
                            .then(() => toast.success("Member removed"))
                            .catch((err) => toast.error(err instanceof Error ? err.message : "Member remove failed"));
                        }}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isProjectAdmin && (
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Add member</h3>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="invite-email">Invite by email</Label>
              <div className="mt-1.5 flex gap-2">
                <Input id="invite-email" type="email" placeholder="name@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                <Button onClick={() => {
                  if (!inviteEmail) return;
                  inviteProjectMember(projectId, inviteEmail)
                    .then((result) => {
                      toast.success(result.message || `Invitation sent to ${inviteEmail}`);
                      if (result.inviteLink) console.info("TaskFlow invite link:", result.inviteLink);
                      setInviteEmail("");
                    })
                    .catch((err) => toast.error(err instanceof Error ? err.message : "Invite failed"));
                }}>
                  Invite
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  project,
  onSave,
  onDelete,
}: {
  project: ReturnType<typeof useStore.getState>["projects"][number];
  onSave: (patch: Partial<typeof project>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [dueDate, setDueDate] = useState(project.dueDate ? project.dueDate.slice(0, 10) : "");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-card/50 p-6">
        <h3 className="mb-4 text-sm font-semibold">Project details</h3>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1.5" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due date</Label>
              <Input className="mt-1.5" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => onSave({ name, description, status, dueDate: dueDate ? new Date(dueDate).toISOString() : null })}
              className="gradient-primary text-primary-foreground"
            >
              Save changes
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <h3 className="mb-1 text-sm font-semibold text-destructive">Danger zone</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Deleting a project removes all of its tasks. This cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete project
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this project?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
