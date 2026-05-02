import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Loader2, Mail, Plus, Shield, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import type { CreateProjectInput, ProjectMemberRole, ProjectVisibility } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Basics", description: "Name & purpose" },
  { id: 2, title: "Access", description: "Visibility & timeline" },
  { id: 3, title: "Team", description: "Invites & roles" },
  { id: 4, title: "Review", description: "Confirm & create" },
] as const;

const inviteRowSchema = z.object({
  email: z.union([z.literal(""), z.string().email("Enter a valid email")]),
  role: z.enum(["admin", "editor", "viewer", "member"]),
});

const formSchema = z
  .object({
    name: z.string().trim().min(2, "Project name is required").max(80),
    description: z.string().trim().max(500).default(""),
    category: z.string().trim().max(64).default(""),
    visibility: z.enum(["private", "team", "public"]),
    dueDate: z.string().optional().default(""),
    invites: z.array(inviteRowSchema).max(50).default([{ email: "", role: "member" }]),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.invites.forEach((row, index) => {
      const e = row.email.trim().toLowerCase();
      if (!e) return;
      if (seen.has(e)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate email in invite list",
          path: ["invites", index, "email"],
        });
      }
      seen.add(e);
    });
  });

type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute("/_app/projects/new")({
  component: NewProjectPage,
});

function toPayload(values: FormValues, creatorEmail: string | undefined): CreateProjectInput {
  const self = (creatorEmail || "").toLowerCase().trim();
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    status: "active",
    dueDate: values.dueDate?.trim() ? values.dueDate : null,
    category: values.category.trim() ? values.category.trim() : null,
    visibility: values.visibility as ProjectVisibility,
    invites: values.invites
      .map((r) => ({ email: r.email.trim().toLowerCase(), role: r.role as ProjectMemberRole }))
      .filter((r) => r.email.length > 0)
      .filter((r) => !self || r.email !== self),
  };
}

function NewProjectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const addProject = useStore((s) => s.addProject);
  const [step, setStep] = useState(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      visibility: "team",
      dueDate: "",
      invites: [{ email: "", role: "member" }],
    },
    mode: "onBlur",
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "invites" });

  const watched = watch();

  const canProceed = useMemo(() => {
    if (step === 1) return watched.name.trim().length >= 2;
    if (step === 2) return Boolean(watched.visibility);
    if (step === 3) return true;
    return true;
  }, [step, watched.name, watched.visibility]);

  const goNext = async () => {
    if (step === 1) {
      const ok = await trigger(["name", "description", "category"]);
      if (!ok) return;
    }
    if (step === 2) {
      const ok = await trigger(["visibility", "dueDate"]);
      if (!ok) return;
    }
    if (step === 3) {
      const ok = await trigger("invites");
      if (!ok) return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error("You must be signed in to create a project.");
      return;
    }
    try {
      const payload = toPayload(values, user.email);
      const { project, invitesSummary } = await addProject(payload);
      const extra =
        invitesSummary && (invitesSummary.added_members > 0 || invitesSummary.pending_invites > 0)
          ? `${invitesSummary.added_members} teammate(s) added instantly, ${invitesSummary.pending_invites} pending invite(s).`
          : payload.invites.length
            ? "Invites were processed (existing users join immediately; others get email when configured)."
            : "Your workspace is ready.";
      toast.success("Project created", { description: extra });
      navigate({ to: "/projects/$id", params: { id: project.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create project");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" type="button" onClick={() => navigate({ to: "/projects" })} className="-ml-2">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to projects
          </Button>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Create new project</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            A short guided flow: describe the work, choose who can see it, invite collaborators with roles, then open
            your new workspace.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <nav aria-label="Progress" className="rounded-2xl border border-border/80 bg-card/40 p-4">
        <ol className="flex flex-wrap gap-2 sm:grid sm:grid-cols-4 sm:gap-3">
          {STEPS.map((s) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <li key={s.id} className="flex min-w-0 flex-1 sm:flex-none">
                <div
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    active && "border-primary/50 bg-primary/10 shadow-glow",
                    done && !active && "border-border bg-muted/20",
                    !active && !done && "border-border/60 bg-background/40 opacity-80",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      done ? "bg-primary text-primary-foreground" : active ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : s.id}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium leading-tight">{s.title}</span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:block">{s.description}</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {step === 1 && (
          <section className="space-y-5 rounded-2xl border border-border bg-card/50 p-6 shadow-sm" aria-labelledby="step1">
            <h2 id="step1" className="text-lg font-semibold">
              Project basics
            </h2>
            <div>
              <Label htmlFor="name">Project name *</Label>
              <Input id="name" className="mt-1.5" placeholder="e.g. Q3 Mobile launch" autoComplete="off" {...register("name")} />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                className="mt-1.5"
                placeholder="Goals, scope, or context for your team (recommended)"
                {...register("description")}
              />
              {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div>
              <Label htmlFor="category">Type / category</Label>
              <Input
                id="category"
                className="mt-1.5"
                placeholder="e.g. Product, Marketing, Internal ops"
                {...register("category")}
              />
              <p className="mt-1 text-xs text-muted-foreground">Optional label to group this project in your workspace.</p>
              {errors.category && <p className="mt-1 text-xs text-destructive">{errors.category.message}</p>}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6 rounded-2xl border border-border bg-card/50 p-6 shadow-sm" aria-labelledby="step2">
            <h2 id="step2" className="text-lg font-semibold">
              Access & timeline
            </h2>
            <div>
              <Label className="text-base">Visibility</Label>
              <p className="mb-3 text-sm text-muted-foreground">Who should be able to access this project once they are members.</p>
              <Controller
                name="visibility"
                control={control}
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                    <label
                      htmlFor="vis-private"
                      className={cn(
                        "flex cursor-pointer flex-col rounded-xl border p-4 transition-colors hover:border-primary/40",
                        field.value === "private" ? "border-primary/50 bg-primary/5" : "border-border bg-background/50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="private" id="vis-private" />
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Private</span>
                      </div>
                      <p className="mt-2 pl-6 text-xs text-muted-foreground">Only invited members see this project.</p>
                    </label>
                    <label
                      htmlFor="vis-team"
                      className={cn(
                        "flex cursor-pointer flex-col rounded-xl border p-4 transition-colors hover:border-primary/40",
                        field.value === "team" ? "border-primary/50 bg-primary/5" : "border-border bg-background/50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="team" id="vis-team" />
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Team</span>
                      </div>
                      <p className="mt-2 pl-6 text-xs text-muted-foreground">Standard workspace project for your org.</p>
                    </label>
                    <label
                      htmlFor="vis-public"
                      className={cn(
                        "flex cursor-pointer flex-col rounded-xl border p-4 transition-colors hover:border-primary/40",
                        field.value === "public" ? "border-primary/50 bg-primary/5" : "border-border bg-background/50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="public" id="vis-public" />
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Public</span>
                      </div>
                      <p className="mt-2 pl-6 text-xs text-muted-foreground">Listed as open collaboration (same member rules).</p>
                    </label>
                  </RadioGroup>
                )}
              />
              {errors.visibility && <p className="mt-1 text-xs text-destructive">{errors.visibility.message}</p>}
            </div>
            <div className="max-w-xs">
              <Label htmlFor="dueDate">Target due date</Label>
              <Input id="dueDate" type="date" className="mt-1.5" {...register("dueDate")} />
              {errors.dueDate && <p className="mt-1 text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-5 rounded-2xl border border-border bg-card/50 p-6 shadow-sm" aria-labelledby="step3">
            <h2 id="step3" className="text-lg font-semibold">
              Invite team members
            </h2>
            <p className="text-sm text-muted-foreground">
              Add email addresses for people who should join. Existing users are added immediately; others receive an
              invite link by email when email is configured (otherwise the API still creates a pending invite).
            </p>
            {errors.invites && typeof errors.invites.message === "string" && (
              <p className="text-xs text-destructive">{errors.invites.message}</p>
            )}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col gap-2 rounded-xl border border-border/80 bg-background/40 p-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`invite-email-${index}`}>Email</Label>
                    <Input
                      id={`invite-email-${index}`}
                      type="email"
                      autoComplete="email"
                      placeholder="colleague@company.com"
                      className="mt-1.5"
                      {...register(`invites.${index}.email` as const)}
                    />
                    {errors.invites?.[index]?.email && (
                      <p className="mt-1 text-xs text-destructive">{errors.invites[index]?.email?.message}</p>
                    )}
                  </div>
                  <div className="w-full sm:w-40">
                    <Label>Role</Label>
                    <Controller
                      name={`invites.${index}.role` as const}
                      control={control}
                      render={({ field: r }) => (
                        <Select value={r.value} onValueChange={r.onChange}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                    aria-label="Remove invite row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ email: "", role: "member" })}
              className="border-dashed"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add another invite
            </Button>
            <p className="text-xs text-muted-foreground">
              <strong>Admin</strong> can manage members and settings. <strong>Editor</strong> can manage tasks.{" "}
              <strong>Viewer</strong> is read-focused. <strong>Member</strong> is the default collaborator role.
            </p>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-4 rounded-2xl border border-border bg-card/50 p-6 shadow-sm" aria-labelledby="step4">
            <h2 id="step4" className="text-lg font-semibold">
              Review
            </h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</dt>
                <dd className="mt-1 font-medium">{watched.name || "—"}</dd>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visibility</dt>
                <dd className="mt-1 font-medium capitalize">{watched.visibility}</dd>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/50 p-3 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</dt>
                <dd className="mt-1 text-muted-foreground">{watched.description?.trim() || "—"}</dd>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Category</dt>
                <dd className="mt-1">{watched.category?.trim() || "—"}</dd>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Due date</dt>
                <dd className="mt-1">{watched.dueDate || "—"}</dd>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/50 p-3 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invites</dt>
                <dd className="mt-1">
                  {watched.invites?.filter((i) => i.email.trim()).length ? (
                    <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                      {watched.invites
                        .filter((i) => i.email.trim())
                        .map((i) => (
                          <li key={i.email + i.role}>
                            {i.email} — <span className="capitalize">{i.role}</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground">No invites (you can add people later).</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => navigate({ to: "/projects" })}>
                Cancel
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < 4 ? (
              <Button type="button" onClick={() => void goNext()} disabled={!canProceed} className="gradient-primary text-primary-foreground">
                Continue
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[160px] gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create project
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
