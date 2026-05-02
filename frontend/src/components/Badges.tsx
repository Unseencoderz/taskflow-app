import { cn } from "@/lib/utils";
import type { Priority, ProjectMemberRole, ProjectStatus, Role, TaskStatus } from "@/lib/types";

const base =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide";

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const map: Record<Priority, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-info/15 text-info",
    high: "bg-warning/20 text-warning",
    urgent: "bg-destructive/20 text-destructive",
  };
  return <span className={cn(base, map[priority], className)}>{priority}</span>;
}

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const map: Record<TaskStatus, string> = {
    todo: "bg-muted text-muted-foreground",
    in_progress: "bg-info/15 text-info",
    done: "bg-success/15 text-success",
  };
  const label = status === "in_progress" ? "In Progress" : status === "todo" ? "Todo" : "Done";
  return <span className={cn(base, map[status], className)}>{label}</span>;
}

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  const map: Record<ProjectStatus, string> = {
    active: "bg-success/15 text-success",
    completed: "bg-info/15 text-info",
    archived: "bg-muted text-muted-foreground",
  };
  return <span className={cn(base, map[status], className)}>{status}</span>;
}

const roleStyles: Record<Role | ProjectMemberRole, string> = {
  admin: "bg-primary/15 text-primary",
  member: "bg-muted text-muted-foreground",
  editor: "bg-info/15 text-info",
  viewer: "bg-secondary text-secondary-foreground",
};

export function RoleBadge({ role, className }: { role: Role | ProjectMemberRole; className?: string }) {
  return <span className={cn(base, roleStyles[role] ?? roleStyles.member, className)}>{role}</span>;
}
