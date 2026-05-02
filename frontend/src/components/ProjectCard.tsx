import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { CalendarDays, FolderKanban } from "lucide-react";
import type { Project } from "@/lib/types";
import { useStore, selectTaskProgress } from "@/lib/store";
import { ProjectStatusBadge } from "@/components/Badges";
import { AvatarStack } from "@/components/Avatar";
import { ProgressBar } from "@/components/ProgressBar";

export function ProjectCard({ project }: { project: Project }) {
  const users = useStore((s) => s.users);
  const state = useStore.getState();
  const members = project.memberIds
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));
  const progress = selectTaskProgress(state, project.id);

  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      className="group flex flex-col rounded-2xl border border-border bg-card/50 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-glow"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
          <FolderKanban className="h-5 w-5" />
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>
      <h3 className="line-clamp-1 text-base font-semibold">{project.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {progress.done} of {progress.total} tasks
          </span>
          <span>{progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)}%</span>
        </div>
        <ProgressBar value={progress.done} max={progress.total || 1} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <AvatarStack users={members} size="sm" />
        {project.dueDate && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(new Date(project.dueDate), "MMM d, yyyy")}
          </span>
        )}
      </div>
    </Link>
  );
}
