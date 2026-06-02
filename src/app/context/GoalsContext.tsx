import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
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
  const { ready: authReady } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dataReady, setDataReady] = useState(false);

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

  useEffect(() => {
    if (!authReady) return;
    setDataReady(false);
    loadLocal();
  }, [authReady, loadLocal]);

  useEffect(() => {
    if (!dataReady) return;
    localStorage.setItem(STORAGE_GOALS, JSON.stringify(goals));
  }, [goals, dataReady]);

  const addGoal = (goal: Omit<Goal, "id" | "savedAmount">) => {
    setGoals((prev) => [...prev, { ...goal, savedAmount: 0, id: generateLocalId() }]);
  };

  const updateGoal = (id: string, amountToAdd: number) => {
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
