import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { format, isAfter, isBefore, startOfWeek } from "date-fns";
import {
  FolderKanban,
  ListTodo,
  CheckCheck,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { useStore, selectTaskProgress } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/Badges";
import { AvatarStack } from "@/components/Avatar";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState } from "@/components/EmptyState";
import { TaskListItem } from "@/components/TaskListItem";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  icon,
  intent = "default",
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  intent?: "default" | "danger";
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/70 bg-card/60 transition-all hover:-translate-y-0.5 hover:shadow-glow",
        intent === "danger" && "border-destructive/30",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p
              className={cn(
                "mt-2 text-3xl font-bold tabular-nums",
                intent === "danger" && "text-destructive",
              )}
            >
              {value}
            </p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              intent === "danger"
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/15 text-primary",
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const users = useStore((s) => s.users);
  const dashboardStats = useStore((s) => s.dashboardStats);
  const loadDashboardStats = useStore((s) => s.loadDashboardStats);
  const state = useStore.getState();

  useEffect(() => {
    loadDashboardStats().catch(() => undefined);
  }, [loadDashboardStats]);

  const myTasks = useMemo(
    () => tasks.filter((t) => t.assigneeId === user?.id),
    [tasks, user?.id],
  );
  const openTasks = myTasks.filter((t) => t.status !== "done");
  const now = new Date();
  const overdue = openTasks.filter((t) => t.dueDate && isBefore(new Date(t.dueDate), now));
  const weekStart = startOfWeek(now);
  const completedThisWeek = myTasks.filter(
    (t) => t.status === "done" && isAfter(new Date(t.createdAt), weekStart),
  );
  const myProjects = projects.filter(
    (p) => user && p.memberIds.includes(user.id) && p.status !== "archived",
  );
  const recentProjects = myProjects.slice(0, 4);
  const todayTasks = openTasks.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.name.split(" ")[0] ?? "there"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's on your plate today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Projects" value={dashboardStats?.totalProjects ?? myProjects.length} icon={<FolderKanban className="h-5 w-5" />} />
        <StatCard label="My Open Tasks" value={dashboardStats?.openTasks ?? openTasks.length} icon={<ListTodo className="h-5 w-5" />} />
        <StatCard label="Done This Week" value={dashboardStats?.completedThisWeek ?? completedThisWeek.length} icon={<CheckCheck className="h-5 w-5" />} />
        <StatCard
          label="Overdue"
          value={dashboardStats?.overdueTasks ?? overdue.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          intent={(dashboardStats?.overdueTasks ?? overdue.length) > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">My Tasks</h3>
            <Link
              to="/tasks"
              className="inline-flex items-center text-xs font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
          {todayTasks.length === 0 ? (
            <EmptyState
              icon={<CheckCheck className="h-6 w-6" />}
              title="Nothing on your list"
              description="You're all caught up. Enjoy the calm."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card/40">
              {todayTasks.map((t, i) => (
                <TaskListItem
                  key={t.id}
                  task={t}
                  divider={i < todayTasks.length - 1}
                  showProject
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-base font-semibold">Recent Projects</h3>
          <div className="space-y-3">
            {recentProjects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="h-6 w-6" />}
                title="No projects yet"
              />
            ) : (
              recentProjects.map((p) => {
                const progress = selectTaskProgress(state, p.id);
                const members = p.memberIds
                  .map((id) => users.find((u) => u.id === id))
                  .filter((u): u is NonNullable<typeof u> => Boolean(u));
                return (
                  <Link
                    key={p.id}
                    to="/projects/$id"
                    params={{ id: p.id }}
                    className="block rounded-xl border border-border bg-card/40 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate font-medium">{p.name}</h4>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {p.description}
                        </p>
                      </div>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    <ProgressBar
                      className="mt-3"
                      value={progress.done}
                      max={progress.total || 1}
                      showLabel
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <AvatarStack users={members} size="xs" />
                      {p.dueDate && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(p.dueDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-base font-semibold">Overdue</h3>
          {overdue.length > 0 && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive">
              {overdue.length}
            </span>
          )}
        </div>
        {overdue.length === 0 ? (
          <EmptyState
            icon={<CheckCheck className="h-6 w-6" />}
            title="No overdue tasks"
            description="Nice work staying ahead of deadlines."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-destructive/30 bg-destructive/5">
            {overdue.map((t, i) => (
              <TaskListItem
                key={t.id}
                task={t}
                divider={i < overdue.length - 1}
                showProject
                warning
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
