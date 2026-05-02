import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] translate-x-1/3 translate-y-1/3 rounded-full bg-primary-glow/20 blur-3xl" />
      </div>

      <header className="px-6 py-5">
        <Link to="/">
          <BrandLogo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
        © 2026 TaskFlow · Team task management
      </footer>
    </div>
  );
}
