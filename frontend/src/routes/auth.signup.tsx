import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your name").max(60),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
type FormValues = z.infer<typeof schema>;

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0-4
}

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { signup, isAuthenticated } = useAuth();
  const inviteToken = new URLSearchParams(window.location.search).get("invite");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [inviteProject, setInviteProject] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/dashboard" });
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: "onBlur" });

  useEffect(() => {
    if (!inviteToken) return;
    apiRequest<{ email: string; project: { name: string }; invitedBy?: { full_name?: string } }>(
      `/api/invites/${inviteToken}`,
      { auth: false },
    )
      .then((invite) => {
        setValue("email", invite.email);
        setInviteProject(invite.project.name);
      })
      .catch((error) => setErr(error instanceof Error ? error.message : "Invite link is invalid"));
  }, [inviteToken, setValue]);

  const pw = watch("password") ?? "";
  const s = strength(pw);
  const strengthLabel = ["Very weak", "Weak", "Fair", "Good", "Strong"][s];
  const strengthColor = [
    "bg-destructive",
    "bg-destructive",
    "bg-warning",
    "bg-info",
    "bg-success",
  ][s];

  const onSubmit = async (data: FormValues) => {
    setErr(null);
    const res = await signup(data.name, data.email, data.password, inviteToken);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    if (res.needsConfirmation) {
      setErr(res.message || "Check your email to confirm your account.");
      return;
    }
    navigate(res.projectId ? { to: "/projects/$id", params: { id: res.projectId } } : { to: "/dashboard" });
  };

  return (
    <div className="glass rounded-2xl border border-border p-7 shadow-glow">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {inviteProject ? `Accept your invitation to ${inviteProject}.` : "Start collaborating with your team in minutes."}
        </p>
      </div>

      {err && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" className="mt-1.5" placeholder="Ada Lovelace" {...register("name")} />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            className="mt-1.5"
            placeholder="you@company.com"
            readOnly={Boolean(inviteToken)}
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative mt-1.5">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              className="pr-10"
              placeholder="At least 8 characters"
              {...register("password")}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {pw && (
            <div className="mt-2">
              <div className="flex h-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-full flex-1 rounded-full transition-colors",
                      i < s ? strengthColor : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Strength: {strengthLabel}</p>
            </div>
          )}
          {errors.password && (
            <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type={showPw ? "text" : "password"}
            className="mt-1.5"
            {...register("confirm")}
          />
          {errors.confirm && (
            <p className="mt-1 text-xs text-destructive">{errors.confirm.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full gradient-primary text-primary-foreground shadow-glow hover:opacity-95"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a
            href={inviteToken ? `/auth/login?invite=${encodeURIComponent(inviteToken)}` : "/auth/login"}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
