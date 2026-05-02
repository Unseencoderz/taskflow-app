import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ListTodo } from "lucide-react";
import { isBefore } from "date-fns";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskListItem } from "@/components/TaskListItem";
import { EmptyState } from "@/components/EmptyState";
import type { TaskStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { user } = useAuth();
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const loadTasks = useStore((s) => s.loadTasks);
  const [filter, setFilter] = useState<"all" | TaskStatus | "overdue">("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"due" | "priority" | "created">("due");

  const myTasks = useMemo(() => {
    const priorityRank = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
    const now = new Date();
    return tasks
      .filter((t) => t.assigneeId === user?.id)
      .filter((t) => {
        if (filter === "all") return true;
        if (filter === "overdue") return t.status !== "done" && t.dueDate && isBefore(new Date(t.dueDate), now);
        return t.status === filter;
      })
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
  }, [tasks, user?.id, filter, query, sortBy]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof myTasks>();
    for (const t of myTasks) {
      const arr = map.get(t.projectId) ?? [];
      arr.push(t);
      map.set(t.projectId, arr);
    }
    return Array.from(map.entries());
  }, [myTasks]);

  useEffect(() => {
    loadTasks().catch(() => undefined);
  }, [loadTasks]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Tasks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All tasks assigned to you across every project.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="todo">Todo</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:text-destructive">
              Overdue
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <div className="relative flex-1 lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="due">Due date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="created">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-6 w-6" />}
          title="No tasks here"
          description="Try a different filter, or sit back and enjoy."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([projectId, ts]) => {
            const proj = projects.find((p) => p.id === projectId);
            return (
              <div key={projectId}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{proj?.name ?? "Project"}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {ts.length}
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-card/40">
                  {ts.map((t, i) => (
                    <TaskListItem key={t.id} task={t} divider={i < ts.length - 1} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
