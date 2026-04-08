import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "./AuthContext";

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: string;
  icon?: string;
}

interface GoalsContextType {
  goals: Goal[];
  dataReady: boolean;
  addGoal: (goal: Omit<Goal, "id" | "savedAmount">) => void;
  updateGoal: (id: string, savedAmountDelta: number) => void;
  deleteGoal: (id: string) => void;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

const STORAGE_GOALS = "sikatrack_goals";

function generateLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { mode, ready: authReady, session } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dataReady, setDataReady] = useState(false);

  const userId = mode === "cloud" ? session?.user?.id : "local";

  const loadLocal = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_GOALS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Goal[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGoals(parsed);
          setDataReady(true);
          return;
        }
      } catch {
        /* fall through */
      }
    }
    setGoals([]);
    localStorage.setItem(STORAGE_GOALS, JSON.stringify([]));
    setDataReady(true);
  }, []);

  const loadCloud = useCallback(async (uid: string) => {
    const supa = getSupabase();
    if (!supa) {
      setDataReady(true);
      return;
    }
    const { data, error } = await supa
      .from("goals")
      .select("id, name, target_amount, saved_amount, deadline, icon")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load goals:", error.message);
      setGoals([]);
      setDataReady(true);
      return;
    }

    setGoals(
      (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        targetAmount:
          typeof row.target_amount === "number"
            ? row.target_amount
            : parseFloat(String(row.target_amount)),
        savedAmount:
          typeof row.saved_amount === "number"
            ? row.saved_amount
            : parseFloat(String(row.saved_amount)),
        deadline: row.deadline ?? undefined,
        icon: row.icon ?? undefined,
      }))
    );
    setDataReady(true);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    setDataReady(false);
    if (mode === "local") {
      loadLocal();
      return;
    }
    if (!userId) {
      setGoals([]);
      setDataReady(true);
      return;
    }
    void loadCloud(userId);
  }, [authReady, mode, userId, loadLocal, loadCloud]);

  useEffect(() => {
    if (mode !== "local" || !dataReady) return;
    localStorage.setItem(STORAGE_GOALS, JSON.stringify(goals));
  }, [goals, mode, dataReady]);

  const addGoal = (goal: Omit<Goal, "id" | "savedAmount">) => {
    if (mode === "cloud" && userId) {
      const id = crypto.randomUUID();
      const row = {
        id,
        user_id: userId,
        name: goal.name,
        target_amount: goal.targetAmount,
        saved_amount: 0,
        deadline: goal.deadline ?? null,
        icon: goal.icon ?? null,
      };
      setGoals((prev) => [
        ...prev,
        { ...goal, id, savedAmount: 0 },
      ]);
      void (async () => {
        const supa = getSupabase();
        if (!supa) return;
        const { error } = await supa.from("goals").insert(row);
        if (error) {
          console.error("Insert goal failed:", error.message);
          void loadCloud(userId);
        }
      })();
      return;
    }

    setGoals((prev) => [...prev, { ...goal, savedAmount: 0, id: generateLocalId() }]);
  };

  const updateGoal = (id: string, amountToAdd: number) => {
    if (mode === "cloud" && userId) {
      setGoals((prev) => {
        const target = prev.find((g) => g.id === id);
        if (!target) return prev;
        const nextSaved = Math.max(0, target.savedAmount + amountToAdd);
        void (async () => {
          const supa = getSupabase();
          if (!supa) return;
          const { error } = await supa
            .from("goals")
            .update({ saved_amount: nextSaved })
            .eq("id", id)
            .eq("user_id", userId);
          if (error) {
            console.error("Update goal failed:", error.message);
            void loadCloud(userId);
          }
        })();
        return prev.map((g) => (g.id === id ? { ...g, savedAmount: nextSaved } : g));
      });
      return;
    }

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          const newAmount = Math.max(0, g.savedAmount + amountToAdd);
          return { ...g, savedAmount: newAmount };
        }
        return g;
      })
    );
  };

  const deleteGoal = (id: string) => {
    if (mode === "cloud" && userId) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
      void (async () => {
        const supa = getSupabase();
        if (!supa) return;
        const { error } = await supa.from("goals").delete().eq("id", id).eq("user_id", userId);
        if (error) {
          console.error("Delete goal failed:", error.message);
          void loadCloud(userId);
        }
      })();
      return;
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <GoalsContext.Provider value={{ goals, dataReady, addGoal, updateGoal, deleteGoal }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (!context) throw new Error("useGoals must be used within GoalsProvider");
  return context;
}
