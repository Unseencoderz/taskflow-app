import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const loadWorkspace = useStore((s) => s.loadWorkspace);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate({ to: "/auth/login" });
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      loadWorkspace().catch(() => undefined);
    }
  }, [isAuthenticated, loadWorkspace]);

  const title = useMemo(() => {
    if (path.startsWith("/dashboard")) return "Dashboard";
    if (path === "/projects/new") return "New Project";
    const projMatch = path.match(/^\/projects\/([^/]+)/);
    if (projMatch) {
      const proj = projects.find((p) => p.id === projMatch[1]);
      return proj ? proj.name : "Project";
    }
    if (path === "/projects") return "Projects";
    const taskMatch = path.match(/^\/tasks\/([^/]+)/);
    if (taskMatch) {
      const task = tasks.find((t) => t.id === taskMatch[1]);
      return task ? task.title : "Task";
    }
    if (path === "/tasks") return "My Tasks";
    if (path === "/profile") return "Profile";
    return "TaskFlow";
  }, [path, projects, tasks]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <TopBar title={title} />
          <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
