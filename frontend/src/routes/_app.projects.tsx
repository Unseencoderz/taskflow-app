import { createFileRoute, useNavigate, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, FolderKanban } from "lucide-react";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectCard } from "@/components/ProjectCard";
import { EmptyState } from "@/components/EmptyState";
import type { ProjectStatus } from "@/lib/types";

export const Route = createFileRoute("/_app/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const isExact = matchRoute({ to: "/projects", fuzzy: false });
  const projects = useStore((s) => s.projects);
  const loadProjects = useStore((s) => s.loadProjects);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");

  const goToNewProject = () => {
    void navigate({ to: "/projects/new" });
  };

  const filtered = useMemo(() => {
    return projects
      .filter((p) => (status === "all" ? true : p.status === status))
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase().trim()));
  }, [projects, query, status]);

  useEffect(() => {
    loadProjects().catch(() => undefined);
  }, [loadProjects]);

  if (!isExact) {
    return <Outlet />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and manage every project in your workspace.
          </p>
        </div>
        <Button
          type="button"
          onClick={goToNewProject}
          className="gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
        >
          <Plus className="mr-1.5 h-4 w-4" /> New Project
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus | "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="No projects found"
          description={query ? "Try a different search term." : "Create your first project to get started."}
          action={
            <Button type="button" onClick={goToNewProject} className="gradient-primary text-primary-foreground">
              <Plus className="mr-1.5 h-4 w-4" /> Create Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
