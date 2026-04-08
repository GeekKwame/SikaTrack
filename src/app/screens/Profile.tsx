import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { User, KeyRound, TriangleAlert, Info, Download, Upload, AlertCircle, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import type { Transaction, Category } from "../context/TransactionContext";
import type { Budget } from "../context/BudgetContext";
import type { Goal } from "../context/GoalsContext";

const STORAGE_USER = "sikatrack_user";
const STORAGE_TRANSACTIONS = "sikatrack_transactions";
const STORAGE_BUDGETS = "sikatrack_budgets";
const STORAGE_GOALS = "sikatrack_goals";

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Profile() {
  const navigate = useNavigate();
  const { mode, user, session, signOut, refreshDisplayName } = useAuth();

  const storedLocal = localStorage.getItem(STORAGE_USER);
  const localParsed = storedLocal
    ? (JSON.parse(storedLocal) as { name?: string })
    : { name: "User" };

  const displayName = user?.displayName ?? localParsed.name ?? "User";

  const [name, setName] = useState(displayName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const saveName = async () => {
    if (name.trim().length < 2) return;

    if (mode === "cloud" && session?.user) {
      const supa = getSupabase();
      if (!supa) return;
      const { error } = await supa
        .from("profiles")
        .update({ display_name: name.trim(), updated_at: new Date().toISOString() })
        .eq("id", session.user.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await refreshDisplayName();
      toast.success("Name updated");
      setIsEditingName(false);
      return;
    }

    const raw = localStorage.getItem(STORAGE_USER);
    if (raw) {
      try {
        const o = JSON.parse(raw) as { name?: string; pin?: string };
        localStorage.setItem(STORAGE_USER, JSON.stringify({ ...o, name: name.trim() }));
        toast.success("Name updated successfully!");
        setIsEditingName(false);
      } catch {
        toast.error("Could not update name");
      }
    }
  };

  const exportData = async () => {
    if (mode === "cloud" && session?.user) {
      const supa = getSupabase();
      if (!supa) { toast.error("Sync unavailable"); return; }
      const uid = session.user.id;
      const [txRes, budRes, golRes] = await Promise.all([
        supa.from("transactions").select("id, amount, category, notes, date, type").eq("user_id", uid),
        supa.from("budgets").select("category, amount").eq("user_id", uid),
        supa.from("goals").select("id, name, target_amount, saved_amount, deadline, icon").eq("user_id", uid),
      ]);

      if (txRes.error || budRes.error || golRes.error) {
        toast.error("Could not read cloud data for backup");
        return;
      }

      const transactions: Transaction[] = (txRes.data ?? []).map((row) => ({
        id: row.id,
        amount: typeof row.amount === "number" ? row.amount : parseFloat(String(row.amount)),
        category: row.category as Category,
        notes: row.notes ?? "",
        date: row.date,
        type: row.type === "income" ? "income" : "expense",
      }));

      const budgets: Budget[] = (budRes.data ?? []).map((row) => ({
        category: row.category as Category,
        amount: typeof row.amount === "number" ? row.amount : parseFloat(String(row.amount)),
      }));

      const goals: Goal[] = (golRes.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        targetAmount: typeof row.target_amount === "number" ? row.target_amount : parseFloat(String(row.target_amount)),
        savedAmount: typeof row.saved_amount === "number" ? row.saved_amount : parseFloat(String(row.saved_amount)),
        deadline: row.deadline ?? undefined,
        icon: row.icon ?? undefined,
      }));

      const data = {
        version: 1, mode: "cloud" as const, exportedAt: new Date().toISOString(),
        transactions, budgets, goals,
      };

      downloadJSON(data);
      toast.success("Backup file downloaded!");
      return;
    }

    const data = {
      version: 1, mode: "local" as const,
      user: localStorage.getItem(STORAGE_USER),
      transactions: localStorage.getItem(STORAGE_TRANSACTIONS),
      budgets: localStorage.getItem(STORAGE_BUDGETS),
      goals: localStorage.getItem(STORAGE_GOALS),
    };
    downloadJSON(data);
    toast.success("Backup file downloaded!");
  };

  function downloadJSON(data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sikatrack-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as Record<string, unknown>;

        if (mode === "cloud" && session?.user) {
          const supa = getSupabase();
          if (!supa) { toast.error("Sync unavailable"); return; }
          const uid = session.user.id;

          const parseSlice = (v: unknown): unknown[] => {
            if (Array.isArray(v)) return v;
            if (typeof v === "string") {
              try { const p = JSON.parse(v) as unknown; return Array.isArray(p) ? p : []; } catch { return []; }
            }
            return [];
          };

          const txRaw = parseSlice(data.transactions) as Record<string, unknown>[];
          const budRaw = parseSlice(data.budgets) as Record<string, unknown>[];
          const goalRaw = parseSlice(data.goals) as Record<string, unknown>[];

          const mapTx = (t: Record<string, unknown>): Transaction | null => {
            if (typeof t.amount !== "number" && typeof t.amount !== "string") return null;
            return {
              id: String(t.id ?? ""),
              amount: typeof t.amount === "number" ? t.amount : parseFloat(String(t.amount)),
              category: t.category as Category,
              notes: String(t.notes ?? ""),
              date: String(t.date ?? ""),
              type: t.type === "income" ? "income" : "expense",
            };
          };

          const mapBud = (b: Record<string, unknown>): Budget | null => {
            if (typeof b.amount !== "number" && typeof b.amount !== "string") return null;
            return {
              category: b.category as Category,
              amount: typeof b.amount === "number" ? b.amount : parseFloat(String(b.amount)),
            };
          };

          const mapGoal = (g: Record<string, unknown>): Goal | null => {
            const ta = g.targetAmount ?? g.target_amount;
            const sa = g.savedAmount ?? g.saved_amount;
            if (typeof ta !== "number" && typeof ta !== "string") return null;
            return {
              id: String(g.id ?? ""),
              name: String(g.name ?? "Goal"),
              targetAmount: typeof ta === "number" ? ta : parseFloat(String(ta)),
              savedAmount: typeof sa === "number" ? sa : typeof sa === "string" ? parseFloat(sa) : 0,
              deadline: g.deadline ? String(g.deadline) : undefined,
              icon: g.icon ? String(g.icon) : undefined,
            };
          };

          const transactions = txRaw.map(mapTx).filter(Boolean) as Transaction[];
          const budgets = budRaw.map(mapBud).filter(Boolean) as Budget[];
          const goals = goalRaw.map(mapGoal).filter(Boolean) as Goal[];

          await supa.from("transactions").delete().eq("user_id", uid);
          await supa.from("budgets").delete().eq("user_id", uid);
          await supa.from("goals").delete().eq("user_id", uid);

          if (transactions.length) {
            const rows = transactions.map((t) => ({ id: crypto.randomUUID(), user_id: uid, amount: t.amount, category: t.category, notes: t.notes, date: t.date, type: t.type }));
            const { error: e1 } = await supa.from("transactions").insert(rows);
            if (e1) throw new Error(e1.message);
          }
          if (budgets.length) {
            const rows = budgets.map((b) => ({ user_id: uid, category: b.category, amount: b.amount }));
            const { error: e2 } = await supa.from("budgets").insert(rows);
            if (e2) throw new Error(e2.message);
          }
          if (goals.length) {
            const rows = goals.map((g) => ({ id: crypto.randomUUID(), user_id: uid, name: g.name, target_amount: g.targetAmount, saved_amount: g.savedAmount, deadline: g.deadline ?? null, icon: g.icon ?? null }));
            const { error: e3 } = await supa.from("goals").insert(rows);
            if (e3) throw new Error(e3.message);
          }

          toast.success("Data restored from backup. Reloading…");
          setTimeout(() => window.location.reload(), 800);
          return;
        }

        if (typeof data.user === "string") localStorage.setItem(STORAGE_USER, data.user);
        if (typeof data.transactions === "string") localStorage.setItem(STORAGE_TRANSACTIONS, data.transactions);
        if (typeof data.budgets === "string") localStorage.setItem(STORAGE_BUDGETS, data.budgets);
        if (typeof data.goals === "string") localStorage.setItem(STORAGE_GOALS, data.goals);

        toast.success("Data restored successfully!");
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        toast.error("Invalid backup file. Please use a SikaTrack backup.");
      }
    };
    reader.readAsText(file);
  };

  const clearData = async () => {
    if (mode === "cloud" && session?.user) {
      const supa = getSupabase();
      if (!supa) return;
      const uid = session.user.id;
      await supa.from("transactions").delete().eq("user_id", uid);
      await supa.from("budgets").delete().eq("user_id", uid);
      await supa.from("goals").delete().eq("user_id", uid);
      for (const b of [
        { category: "Food" as const, amount: 1500 },
        { category: "Transport" as const, amount: 500 },
        { category: "Bills" as const, amount: 1000 },
      ]) {
        await supa.from("budgets").insert({ user_id: uid, category: b.category, amount: b.amount });
      }
      toast.success("All data cleared.");
      setShowClearConfirm(false);
      navigate("/");
      window.location.reload();
      return;
    }

    localStorage.removeItem(STORAGE_TRANSACTIONS);
    localStorage.removeItem(STORAGE_BUDGETS);
    localStorage.removeItem(STORAGE_GOALS);
    toast.success("All data cleared!");
    setShowClearConfirm(false);
    navigate("/");
    window.location.reload();
  };

  const logout = async () => {
    await signOut();
    navigate("/login");
  };

  const sendPasswordReset = async () => {
    const email = session?.user?.email;
    if (!email) { toast.error("No email on this account"); return; }
    const supa = getSupabase();
    if (!supa) return;
    setResetSending(true);
    const { error } = await supa.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setResetSending(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for a reset link.");
  };

  const initials = getInitials(displayName);

  return (
    <div className="min-h-screen bg-background">
      {/* Custom Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-5">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} className="text-destructive" />
              </div>
              <button onClick={() => setShowClearConfirm(false)} className="p-2 rounded-lg hover:bg-muted">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
            <h3 className="text-lg font-bold mb-2">Clear All Data?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete all your transactions, budgets, and goals.{" "}
              <strong className="text-foreground">This cannot be undone.</strong>
              {" "}We recommend backing up first.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-muted font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={clearData}
                className="flex-1 py-3 rounded-xl bg-destructive text-white font-semibold text-sm"
              >
                Yes, Clear Data
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border-b border-border px-5 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold">Profile & Settings</h1>
      </div>

      <div className="p-5 space-y-6">
        {/* Avatar + Name */}
        <section className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-md flex-shrink-0"
              style={{ background: "var(--gradient-primary)" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Signed in as</p>
              <p className="font-bold text-lg truncate">{displayName}</p>
              {mode === "cloud" && session?.user?.email && (
                <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
              )}
            </div>
          </div>

          <h2 className="font-semibold text-sm text-primary uppercase tracking-wider flex items-center gap-2">
            <User size={16} /> Personal Info
          </h2>
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Display Name</label>
            {isEditingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button
                  type="button"
                  onClick={saveName}
                  className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">{displayName}</p>
                <button
                  type="button"
                  onClick={() => { setName(displayName); setIsEditingName(true); }}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Account Security */}
        <section className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-sm text-primary uppercase tracking-wider flex items-center gap-2">
            <KeyRound size={16} /> Account Security
          </h2>
          {mode === "cloud" ? (
            <>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="font-semibold text-sm">Password</p>
                  <p className="text-xs text-muted-foreground">We'll email you a secure reset link</p>
                </div>
                <button
                  type="button"
                  onClick={sendPasswordReset}
                  disabled={resetSending}
                  className="text-primary text-sm font-semibold px-3 py-1.5 bg-primary/10 rounded-lg disabled:opacity-50"
                >
                  {resetSending ? "Sending…" : "Reset"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="font-semibold text-sm">PIN Code</p>
                <p className="text-xs text-muted-foreground">Stored on this device only</p>
              </div>
              <button
                type="button"
                onClick={() => { localStorage.removeItem(STORAGE_USER); navigate("/signup"); }}
                className="text-primary text-sm font-semibold px-3 py-1.5 bg-primary/10 rounded-lg"
              >
                Reset PIN
              </button>
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-semibold text-sm">Sign out</p>
              <p className="text-xs text-muted-foreground">End your session on this device</p>
            </div>
            <button type="button" onClick={logout} className="text-sm font-semibold px-3 py-1.5 bg-muted rounded-lg">
              Sign Out
            </button>
          </div>
        </section>

        {/* Backup & Restore (was "Data Portability") */}
        <section className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-sm text-primary uppercase tracking-wider flex items-center gap-2">
            <Download size={16} /> Backup & Restore
          </h2>
          <p className="text-xs text-muted-foreground">
            {mode === "cloud"
              ? "Download a copy of all your cloud data as a backup file."
              : "Save a copy of your data stored on this device."}
          </p>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="font-semibold text-sm">Download Backup</p>
              <p className="text-xs text-muted-foreground">Save a .json file you can restore later</p>
            </div>
            <button
              type="button"
              onClick={exportData}
              className="text-sm font-semibold px-3 py-1.5 bg-muted rounded-lg flex items-center gap-1"
            >
              <Download size={14} /> Backup
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-semibold text-sm">Restore from Backup</p>
              <p className="text-xs text-muted-foreground">
                {mode === "cloud" ? "Replaces your cloud data with a backup file" : "Loads a previous backup from your device"}
              </p>
            </div>
            <label className="text-sm font-semibold px-3 py-1.5 bg-primary/10 text-primary rounded-lg flex items-center gap-1 cursor-pointer">
              <Upload size={14} /> Restore
              <input type="file" accept=".json,application/json" onChange={importData} className="hidden" />
            </label>
          </div>
        </section>

        {/* Clear Data (was "Danger Zone") */}
        <section className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-sm text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
            <TriangleAlert size={16} /> Clear Data
          </h2>
          <p className="text-xs text-destructive/80">
            {mode === "cloud"
              ? "Removes all your transactions, budgets, and goals from the cloud. Your login account is kept."
              : "Deletes all transactions and goals saved on this device."}
            {" "}We recommend downloading a backup first.
          </p>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-3 bg-destructive text-white rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
          >
            Clear My Data
          </button>
        </section>

        <div className="text-center text-xs text-muted-foreground space-y-1 mt-6 opacity-60">
          <p className="flex items-center justify-center gap-1">
            <Info size={12} /> SikaTrack · {mode === "cloud" ? "Cloud sync enabled" : "Offline mode"}
          </p>
          <p>Built for Ghanaians 🇬🇭</p>
        </div>
      </div>
    </div>
  );
}
