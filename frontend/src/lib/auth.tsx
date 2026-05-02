import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest, jsonBody } from "./api";
import { adaptUser } from "./adapters";
import { hasSupabaseConfig, supabase } from "./supabase";
import { useStore } from "./store";
import type { User, Role } from "./types";

type AuthResult =
  | { ok: true; needsConfirmation?: boolean; message?: string; projectId?: string | null }
  | { ok: false; error: string };

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, inviteToken?: string | null) => Promise<AuthResult>;
  signup: (name: string, email: string, password: string, inviteToken?: string | null) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchCurrentUser() {
  const raw = await apiRequest<unknown>("/api/auth/me");
  return adaptUser(raw);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      if (!hasSupabaseConfig) {
        setIsLoading(false);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;

        const current = await fetchCurrentUser();
        if (!active) return;
        setUser(current);
        setCurrentUser(current);
      } catch {
        await supabase.auth.signOut();
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    hydrate();

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [setCurrentUser]);

  const login: AuthContextValue["login"] = async (email, password, inviteToken) => {
    if (!hasSupabaseConfig) {
      return { ok: false, error: "Supabase frontend env vars are missing." };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) return { ok: false, error: error.message };

    try {
      const current = await fetchCurrentUser();
      let projectId: string | null = null;
      if (inviteToken) {
        const accepted = await apiRequest<{ project_id: string }>(`/api/invites/${inviteToken}/accept`, {
          method: "POST",
        });
        projectId = accepted.project_id;
      }
      setUser(current);
      setCurrentUser(current);
      return { ok: true, projectId };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Could not load profile." };
    }
  };

  const signup: AuthContextValue["signup"] = async (name, email, password, inviteToken) => {
    if (!hasSupabaseConfig) {
      return { ok: false, error: "Supabase frontend env vars are missing." };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
      },
    });

    if (error) return { ok: false, error: error.message };

    let registeredProjectId: string | null = null;

    try {
      const registered = await apiRequest<{ project_id?: string | null }>("/api/auth/register", {
        method: "POST",
        auth: false,
        body: jsonBody({ full_name: name.trim(), email: email.trim(), invite_token: inviteToken || undefined }),
      });
      registeredProjectId = registered.project_id || null;
    } catch {
      // The profile trigger may already have created the row; /me below is the source of truth.
    }

    if (!data.session) {
      return {
        ok: true,
        needsConfirmation: true,
        message: "Check your email to confirm your account, then sign in.",
      };
    }

    const current = await fetchCurrentUser();
    setUser(current);
    setCurrentUser(current);
    return { ok: true, projectId: registeredProjectId };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
