import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, logout } = useAuth();
  const updateUser = useStore((s) => s.updateUser);
  const [name, setName] = useState(user?.name ?? "");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwNew, setPwNew] = useState("");

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal information and credentials.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} color={user.avatarColor} size="xl" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold">{user.name}</h3>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-6">
        <h3 className="mb-4 text-sm font-semibold">Personal info</h3>
        <div className="space-y-4">
          <div>
            <Label>Full name</Label>
            <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-1.5" value={user.email} disabled readOnly />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!name.trim()) { toast.error("Name is required"); return; }
                updateUser(user.id, { name: name.trim() })
                  .then(() => toast.success("Profile updated"))
                  .catch((err) => toast.error(err instanceof Error ? err.message : "Profile update failed"));
              }}
              className="gradient-primary text-primary-foreground"
            >
              Save changes
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-6">
        <h3 className="mb-4 text-sm font-semibold">Change password</h3>
        <div className="space-y-4">
          <div>
            <Label>Current password</Label>
            <Input className="mt-1.5" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
          </div>
          <div>
            <Label>New password</Label>
            <Input className="mt-1.5" type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input className="mt-1.5" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={async () => {
                if (!pw1 || !pwNew || pwNew.length < 8) { toast.error("Provide a current password and a new one of at least 8 characters"); return; }
                if (pwNew !== pw2) { toast.error("Passwords do not match"); return; }
                const { error } = await supabase.auth.updateUser({ password: pwNew });
                if (error) { toast.error(error.message); return; }
                setPw1(""); setPwNew(""); setPw2("");
                toast.success("Password updated");
              }}
              className="gradient-primary text-primary-foreground"
            >
              Update password
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-6">
        <h3 className="mb-2 text-sm font-semibold">Session</h3>
        <p className="mb-4 text-sm text-muted-foreground">Sign out on this device when you are finished.</p>
        <Button type="button" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
