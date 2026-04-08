import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export type AuthMode = "cloud" | "local";

export interface AppUser {
  id: string;
  email?: string;
  displayName: string;
}

const STORAGE_USER = "sikatrack_user";

interface AuthContextValue {
  mode: AuthMode;
  ready: boolean;
  /** Authenticated user (cloud session or local profile). */
  user: AppUser | null;
  session: Session | null;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: Error | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshDisplayName: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapSupabaseUser(s: SupabaseUser, profileName?: string): AppUser {
  const meta = s.user_metadata as { display_name?: string } | undefined;
  const fromEmail = s.email ? s.email.split("@")[0] : "";
  return {
    id: s.id,
    email: s.email ?? undefined,
    displayName: (profileName ?? meta?.display_name ?? fromEmail) || "User",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode: AuthMode = isSupabaseConfigured() ? "cloud" : "local";
  const [ready, setReady] = useState(mode === "local");
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const loadProfileName = useCallback(
    async (uid: string): Promise<string | undefined> => {
      const supa = getSupabase();
      if (!supa) return undefined;
      const { data } = await supa.from("profiles").select("display_name").eq("id", uid).maybeSingle();
      return data?.display_name ?? undefined;
    },
    []
  );

  useEffect(() => {
    const supa = getSupabase();
    if (!supa) {
      setReady(true);
      return;
    }

    let cancelled = false;

    const applySession = (s: Session | null) => {
      setSession(s);
      if (s?.user) {
        void loadProfileName(s.user.id).then((name) => {
          if (!cancelled) setUser(mapSupabaseUser(s.user, name));
        });
      } else {
        setUser(null);
      }
    };

    void supa.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      applySession(s);
      setReady(true);
    });

    const { data: sub } = supa.auth.onAuthStateChange((_event, s) => {
      applySession(s);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfileName]);

  const signInWithEmail = async (email: string, password: string) => {
    const supa = getSupabase();
    if (!supa) return { error: new Error("Supabase is not configured") };
    const { error } = await supa.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const supa = getSupabase();
    if (!supa) return { error: new Error("Supabase is not configured"), needsEmailConfirmation: false };
    const { data, error } = await supa.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    const needsEmailConfirmation = Boolean(data.user && !data.session);
    return {
      error: error ? new Error(error.message) : null,
      needsEmailConfirmation,
    };
  };

  const signOut = async () => {
    const supa = getSupabase();
    if (supa) await supa.auth.signOut();
    localStorage.removeItem(STORAGE_USER);
    setUser(null);
    setSession(null);
  };

  const refreshDisplayName = async () => {
    const supa = getSupabase();
    if (!supa || !session?.user) return;
    const name = await loadProfileName(session.user.id);
    setUser(mapSupabaseUser(session.user, name));
  };

  const localSnapshot = (): AppUser | null => {
    const raw = localStorage.getItem(STORAGE_USER);
    if (!raw) return null;
    try {
      const o = JSON.parse(raw) as { name?: string };
      if (!o.name || typeof o.name !== "string") return null;
      return { id: "local", displayName: o.name.trim() };
    } catch {
      return null;
    }
  };

  const effectiveUser = mode === "cloud" ? user : localSnapshot();

  return (
    <AuthContext.Provider
      value={{
        mode,
        ready,
        user: effectiveUser,
        session,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshDisplayName,
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
