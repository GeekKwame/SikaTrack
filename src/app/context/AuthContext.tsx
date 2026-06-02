import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface AppUser {
  id: string;
  displayName: string;
}

const STORAGE_USER = "sikatrack_user";

interface AuthContextValue {
  ready: boolean;
  user: AppUser | null;
  signOut: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readLocalUser(): AppUser | null {
  const raw = localStorage.getItem(STORAGE_USER);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { name?: string };
    if (!o.name || typeof o.name !== "string") return null;
    return { id: "local", displayName: o.name.trim() };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);

  const refreshUser = useCallback(() => {
    setUser(readLocalUser());
  }, []);

  useEffect(() => {
    setUser(readLocalUser());
    setReady(true);
  }, []);

  const signOut = async () => {
    localStorage.removeItem(STORAGE_USER);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ ready, user, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
