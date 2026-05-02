import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  FolderKanban,
  Kanban,
  LayoutDashboard,
  Menu,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#preview", label: "Product" },
  { href: "#faq", label: "FAQ" },
] as const;

const features = [
  {
    icon: LayoutDashboard,
    title: "Command-center dashboard",
    description: "See open work, deadlines, and team health in one calm, focused view—no more hunting across tools.",
  },
  {
    icon: FolderKanban,
    title: "Projects that stay organized",
    description: "Create workspaces per initiative, track status, and keep scope visible from kickoff to delivery.",
  },
  {
    icon: Kanban,
    title: "Kanban boards & lists",
    description: "Move tasks across stages with clarity. Works for engineering, ops, and creative workflows alike.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description: "Roles, membership, and invites help everyone know who owns what—without endless status meetings.",
  },
  {
    icon: Bell,
    title: "Notifications that matter",
    description: "Stay informed when assignments change or deadlines approach—without drowning in noise.",
  },
  {
    icon: Shield,
    title: "Secure by design",
    description: "Modern authentication and API-backed permissions so your work stays in the right hands.",
  },
] as const;

const steps = [
  {
    step: "01",
    title: "Create your account",
    body: "Sign up in seconds. Your workspace is ready for projects and tasks immediately.",
  },
  {
    step: "02",
    title: "Set up projects",
    body: "Define initiatives, dates, and descriptions so every initiative has a single source of truth.",
  },
  {
    step: "03",
    title: "Invite collaborators",
    body: "Bring teammates in with clear roles. Everyone sees the same board and backlog.",
  },
  {
    step: "04",
    title: "Ship with visibility",
    body: "Use boards and lists to move work forward—dashboards keep leadership aligned without extra tooling.",
  },
] as const;

const testimonials = [
  {
    quote:
      "We replaced scattered spreadsheets with TaskFlow. Everyone finally agrees on what ‘done’ means for each initiative.",
    name: "Sarah Chen",
    role: "Engineering Manager",
    org: "Product-led SaaS",
  },
  {
    quote:
      "The dashboard alone saves our leads fifteen minutes a day. Deadlines and ownership are obvious.",
    name: "Marcus Webb",
    role: "Operations Lead",
    org: "Logistics partner",
  },
  {
    quote:
      "Kanban plus notifications means fewer ‘where is this?’ pings. The team just moves work.",
    name: "Elena Rossi",
    role: "Creative Director",
    org: "Brand studio",
  },
] as const;

const faqs = [
  {
    q: "What is TaskFlow?",
    a: "TaskFlow is a team workspace for projects and tasks: dashboards, Kanban-style boards, collaboration, and notifications—designed to keep everyone aligned without extra overhead.",
  },
  {
    q: "Do I need a credit card to try it?",
    a: "You can get started by creating an account. Check your deployment or administrator for any billing policy specific to your organization.",
  },
  {
    q: "Can I use TaskFlow with my existing stack?",
    a: "TaskFlow runs in the browser with a dedicated API. Bring your team; tasks and projects live in one place while you keep your other tools as needed.",
  },
  {
    q: "How does collaboration work?",
    a: "Projects support members and roles. Invite teammates, assign tasks, and use notifications so updates reach the right people at the right time.",
  },
  {
    q: "Is my data secure?",
    a: "TaskFlow uses modern authentication for sign-in and protects API access with standard tokens. Always follow your organization’s security policies for sensitive work.",
  },
] as const;

function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
      style={{ transitionDelay: inView ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TaskFlow",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Team workspace for projects and tasks: dashboards, Kanban boards, collaboration, and notifications.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
} as const;

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const previousDesc = metaDesc?.getAttribute("content") ?? "";
    document.title = "TaskFlow — Team projects & tasks in one workspace";
    metaDesc?.setAttribute(
      "content",
      "Plan projects, run Kanban boards, and collaborate with your team in one fast, modern workspace. Sign up free.",
    );
    return () => {
      document.title = previousTitle;
      metaDesc?.setAttribute("content", previousDesc);
    };
  }, []);

  useEffect(() => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.textContent = JSON.stringify(structuredData);
    el.setAttribute("data-taskflow-ld", "1");
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="focus:border-ring fixed left-4 top-4 z-[100] -translate-y-24 rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[min(80vw,720px)] w-[min(80vw,720px)] -translate-x-1/2 rounded-full bg-primary/18 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[480px] w-[480px] translate-x-1/4 translate-y-1/4 rounded-full bg-primary-glow/15 blur-3xl" />
        <div className="absolute bottom-1/3 left-0 h-[320px] w-[320px] -translate-x-1/3 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2 rounded-md outline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,320px)]">
              <SheetHeader>
                <SheetTitle className="text-left">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {l.label}
                  </a>
                ))}
                {!isAuthenticated && (
                  <>
                    <Link
                      to="/auth/login"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/auth/signup"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-sm font-semibold text-primary"
                    >
                      Get started
                    </Link>
                  </>
                )}
                {isAuthenticated && (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-semibold text-primary"
                  >
                    Dashboard
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <Button asChild variant="default" size="sm" className="gradient-primary text-primary-foreground shadow-glow">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/auth/login">Log in</Link>
                </Button>
                <Button asChild size="sm" className="gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
                  <Link to="/auth/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="relative px-4 pb-20 pt-14 sm:px-6 sm:pb-28 sm:pt-20 md:pt-24" aria-labelledby="hero-heading">
          <div className="mx-auto max-w-6xl">
            <div className="landing-hero-enter mx-auto max-w-3xl text-center">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                Team projects & tasks—without the chaos
              </p>
              <h1 id="hero-heading" className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Ship work your whole team{" "}
                <span className="text-gradient-primary">can see</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
                TaskFlow brings projects, tasks, and collaboration into one fast workspace—so priorities stay clear,
                ownership is obvious, and nothing slips through the cracks.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Button
                  asChild
                  size="lg"
                  className="gradient-primary min-h-11 w-full min-w-[200px] text-primary-foreground shadow-glow hover:opacity-95 sm:w-auto"
                >
                  <Link to="/auth/signup">
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="min-h-11 w-full border-border/80 bg-card/40 sm:w-auto">
                  <a href="#features">Explore features</a>
                </Button>
                {!isAuthenticated && (
                  <Button asChild variant="ghost" size="lg" className="min-h-11 w-full sm:w-auto">
                    <Link to="/auth/login">Log in</Link>
                  </Button>
                )}
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                No clutter. Built for teams who need clarity—not another heavyweight suite.
              </p>
            </div>

            <Reveal className="mt-16 md:mt-20">
              <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border/80 bg-card/30 shadow-glow ring-1 ring-primary/10">
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" aria-hidden />
                <img
                  src="/landing/dashboard-preview.png"
                  alt="TaskFlow dashboard showing stats, tasks, and recent projects"
                  width={1200}
                  height={675}
                  loading="eager"
                  decoding="async"
                  className="h-auto w-full object-cover object-top"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Value props */}
        <section className="border-y border-border/60 bg-card/20 px-4 py-16 sm:px-6" aria-labelledby="value-heading">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 id="value-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
                Why teams choose TaskFlow
              </h2>
              <p className="mt-3 text-muted-foreground">
                Clear priorities, visible progress, and collaboration that scales—without enterprise overhead.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              <Reveal>
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Zap className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Move faster</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      One place for priorities cuts context-switching so your team spends time on outcomes—not status syncs.
                    </p>
                  </div>
                </div>
              </Reveal>
              <Reveal delayMs={80}>
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <BarChart3 className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Stay aligned</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Dashboards and boards make progress visible for ICs and leads—without duplicating work in slides.
                    </p>
                  </div>
                </div>
              </Reveal>
              <Reveal delayMs={160}>
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Users className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Scale collaboration</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Projects, roles, and invites give growing teams a sane structure as scope expands.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24" aria-labelledby="features-heading">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 id="features-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to run team work
              </h2>
              <p className="mt-4 text-muted-foreground">
                Purpose-built flows for modern teams—tasks, boards, and visibility without enterprise bloat.
              </p>
            </Reveal>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Reveal key={f.title} delayMs={i * 50}>
                  <article className="group h-full rounded-2xl border border-border/70 bg-card/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-glow">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary/20">
                      <f.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <h3 className="mt-4 font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-24 border-y border-border/60 bg-card/15 px-4 py-20 sm:px-6 sm:py-24"
          aria-labelledby="how-heading"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 id="how-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                How TaskFlow works
              </h2>
              <p className="mt-4 text-muted-foreground">
                From signup to shipped work—four straightforward steps your whole team can follow.
              </p>
            </Reveal>

            <ol className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <Reveal key={s.step} delayMs={i * 60}>
                  <li className="relative rounded-2xl border border-border/70 bg-background/50 p-6">
                    <span className="text-gradient-primary font-mono text-sm font-bold tracking-wider">{s.step}</span>
                    <h3 className="mt-3 font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Preview */}
        <section id="preview" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24" aria-labelledby="preview-heading">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 id="preview-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                See your work on a board
              </h2>
              <p className="mt-4 text-muted-foreground">
                Drag-ready columns, clear ownership, and progress you can scan in seconds—ideal for delivery teams.
              </p>
            </Reveal>

            <Reveal className="mt-12">
              <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/30 shadow-glow ring-1 ring-primary/10">
                <img
                  src="/landing/kanban-preview.png"
                  alt="TaskFlow Kanban board with task cards across columns"
                  width={1200}
                  height={675}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full object-cover"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Trust */}
        <section className="border-y border-border/60 bg-card/20 px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="trust-heading">
          <div className="mx-auto max-w-6xl">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 id="trust-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built for teams who ship
              </h2>
              <p className="mt-4 text-muted-foreground">
                Whether you’re ten people or scaling fast—TaskFlow keeps work visible and accountable.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                { label: "Tasks coordinated", value: "10k+", sub: "per workspace targets" },
                { label: "Avg. time saved", value: "15 min", sub: "per person / day (self-reported)" },
                { label: "Workflow clarity", value: "Single", sub: "source of truth for initiatives" },
              ].map((stat, i) => (
                <Reveal key={stat.label} delayMs={i * 70}>
                  <div className="rounded-2xl border border-border/70 bg-background/60 px-6 py-8 text-center">
                    <p className="text-gradient-primary text-3xl font-bold tabular-nums sm:text-4xl">{stat.value}</p>
                    <p className="mt-2 font-medium">{stat.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <Reveal key={t.name} delayMs={i * 80}>
                  <blockquote className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/40 p-6">
                    <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                    <footer className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary"
                        aria-hidden
                      >
                        {t.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <cite className="not-italic text-sm font-semibold">{t.name}</cite>
                        <p className="text-xs text-muted-foreground">
                          {t.role}, {t.org}
                        </p>
                      </div>
                    </footer>
                  </blockquote>
                </Reveal>
              ))}
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Illustrative outcomes—your results will depend on how your team adopts TaskFlow.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-3xl">
            <Reveal className="text-center">
              <h2 id="faq-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-muted-foreground">Straight answers about TaskFlow and how teams use it.</p>
            </Reveal>

            <Reveal className="mt-10">
              <Accordion type="single" collapsible className="w-full rounded-2xl border border-border/70 bg-card/30 px-2">
                {faqs.map((item, i) => (
                  <AccordionItem key={item.q} value={`faq-${i}`} className="border-border/60 px-2">
                    <AccordionTrigger className="text-left text-base hover:no-underline">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border/60 px-4 py-20 sm:px-6" aria-labelledby="cta-heading">
          <Reveal className="mx-auto max-w-4xl">
            <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/20 via-card/80 to-background px-6 py-14 text-center sm:px-12">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/25 blur-3xl" aria-hidden />
              <h2 id="cta-heading" className="relative text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to align your team?
              </h2>
              <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
                Create your workspace, invite collaborators, and turn scattered tasks into a workflow everyone trusts.
              </p>
              <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="gradient-primary min-w-[200px] text-primary-foreground shadow-glow hover:opacity-95">
                  <Link to="/auth/signup">
                    Get started
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="min-w-[160px] border-border/80 bg-background/50">
                  <a href="#preview">View product</a>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-card/20 px-4 py-12 sm:px-6" role="contentinfo">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <BrandLogo />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              TaskFlow helps teams plan initiatives, assign ownership, and track delivery—in one calm, modern workspace.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Product</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="transition-colors hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="transition-colors hover:text-foreground">
                  How it works
                </a>
              </li>
              <li>
                <a href="#preview" className="transition-colors hover:text-foreground">
                  Preview
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Account</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/auth/login" className="transition-colors hover:text-foreground">
                  Log in
                </Link>
              </li>
              <li>
                <Link to="/auth/signup" className="transition-colors hover:text-foreground">
                  Sign up
                </Link>
              </li>
              {isAuthenticated && (
                <li>
                  <Link to="/dashboard" className="transition-colors hover:text-foreground">
                    Dashboard
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} TaskFlow. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
            Secure auth · Built for teams
          </p>
        </div>
      </footer>
    </div>
  );
}
