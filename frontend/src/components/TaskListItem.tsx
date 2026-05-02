import { Link } from "@tanstack/react-router";
import { format, isBefore } from "date-fns";
import { Calendar, FolderKanban } from "lucide-react";
import type { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/Avatar";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Props {
  task: Task;
  divider?: boolean;
  showProject?: boolean;
  warning?: boolean;
}

export function TaskListItem({ task, divider, showProject, warning }: Props) {
  const projects = useStore((s) => s.projects);
  const users = useStore((s) => s.users);
  const setStatus = useStore((s) => s.setTaskStatus);
  const { user } = useAuth();

  const project = projects.find((p) => p.id === task.projectId);
  const assignee = users.find((u) => u.id === task.assigneeId);
  const overdue =
    task.status !== "done" && task.dueDate && isBefore(new Date(task.dueDate), new Date());

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40",
        divider && "border-b border-border",
      )}
    >
      <Checkbox
        checked={task.status === "done"}
        onCheckedChange={(v) =>
          user && setStatus(task.id, v ? "done" : "todo", user.id)
        }
        aria-label="Toggle task done"
      />
      <Link
        to="/tasks/$id"
        params={{ id: task.id }}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "truncate text-sm font-medium",
                task.status === "done" && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </span>
            {showProject && project && (
              <span className="hidden shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
                <FolderKanban className="h-3 w-3" /> {project.name}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  (overdue || warning) && "text-destructive",
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
          </div>
        </div>
        {assignee && (
          <Avatar
            name={assignee.name}
            color={assignee.avatarColor}
            size="sm"
            className="shrink-0"
          />
        )}
      </Link>
    </div>
  );
}
