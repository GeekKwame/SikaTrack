import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

const STORAGE_USER = "sikatrack_user";

export function Login() {
  const navigate = useNavigate();
  const { mode, ready, session, signInWithEmail } = useAuth();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cloudLoading, setCloudLoading] = useState(false);

  let localUser: { name?: string; pin?: string } | null = null;
  try {
    const stored = localStorage.getItem(STORAGE_USER);
    localUser = stored ? (JSON.parse(stored) as { name?: string; pin?: string }) : null;
  } catch {
    localUser = null;
  }

  useEffect(() => {
    if (!ready) return;
    if (mode === "cloud" && session?.user) {
      navigate("/", { replace: true });
    }
  }, [mode, session, ready, navigate]);

  const handleCloudLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCloudLoading(true);
    const { error: err } = await signInWithEmail(email.trim(), password);
    setCloudLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    navigate("/", { replace: true });
  };

  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localUser) {
      navigate("/signup");
      return;
    }
    if (pin === localUser.pin) {
      navigate("/");
    } else {
      setError("Incorrect PIN. Try again.");
      setPin("");
    }
  };

  const handlePinKey = (digit: string) => {
    if (digit === "⌫") {
      setPin((p) => p.slice(0, -1));
      setError("");
    } else if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      setError("");
      if (next.length === 4) {
        setTimeout(() => {
          if (localUser && next === localUser.pin) {
            navigate("/");
          } else {
            setError("Incorrect PIN. Try again.");
            setPin("");
          }
        }, 200);
      }
    }
  };

  const pinKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  if (mode === "cloud") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-between bg-background px-6 py-12">
        <div className="flex flex-col items-center gap-3 pt-8">
          <Logo size={72} />
          <div>
            <p className="text-sm text-muted-foreground text-center mt-1">Your MoMo Expense Tracker</p>
          </div>
        </div>

        <form
          onSubmit={handleCloudLogin}
          className="w-full max-w-xs flex flex-col gap-4 flex-1 justify-center"
        >
          <h2 className="text-xl font-semibold text-center">Sign in</h2>
          <p className="text-sm text-muted-foreground text-center -mt-2">
            Use the email and password you registered with
          </p>
          <div>
            <label htmlFor="login-email" className="text-xs font-medium text-muted-foreground block mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="text-xs font-medium text-muted-foreground block mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-destructive text-sm font-medium text-center">{error}</p>}
          <button
            type="submit"
            disabled={cloudLoading}
            className="w-full py-4 rounded-2xl font-semibold text-primary-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {cloudLoading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="w-full max-w-xs pb-4 space-y-3">
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="w-full text-sm text-primary font-medium underline-offset-2 hover:underline"
          >
            Create account →
          </button>
          <p className="text-xs text-muted-foreground text-center">SikaTrack · Built for Ghana 🇬🇭</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-background px-6 py-12">
      <div className="flex flex-col items-center gap-3 pt-8">
        <Logo size={72} />
        <div>
          <p className="text-sm text-muted-foreground text-center mt-1">Your MoMo Expense Tracker</p>
        </div>
      </div>

      <form onSubmit={handleLocalLogin} className="w-full max-w-xs flex flex-col items-center gap-8 flex-1 justify-center">
        <div>
          <h2 className="text-xl font-semibold text-center mb-1">
            {localUser ? `Welcome back, ${localUser.name}! 👋` : "No account found"}
          </h2>
          <p className="text-sm text-muted-foreground text-center">
            {localUser ? "Enter your 4-digit PIN" : "Let's get you set up"}
          </p>
        </div>

        <div className="flex gap-4" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                i < pin.length ? "bg-primary border-primary scale-110" : "bg-transparent border-muted-foreground"
              }`}
            />
          ))}
        </div>

        {error && <p className="text-destructive text-sm font-medium -mt-4">{error}</p>}

        <div className="grid grid-cols-3 gap-4 w-full">
          {pinKeys.map((key, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => key && handlePinKey(key)}
              disabled={!key}
              className={`h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                key === "⌫"
                  ? "bg-muted text-foreground"
                  : key === ""
                    ? "invisible"
                    : "bg-card border border-border shadow-sm hover:bg-muted"
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate("/signup")}
          className="text-sm text-primary font-medium underline-offset-2 hover:underline"
        >
          {localUser ? "Forgot PIN? Create new account" : "Create account →"}
        </button>
      </form>

      <p className="text-xs text-muted-foreground pb-4">SikaTrack · Built for Ghana 🇬🇭</p>
    </div>
  );
}
