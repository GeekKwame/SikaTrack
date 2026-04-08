import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { Category } from "./TransactionContext";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "./AuthContext";

export interface Budget {
  category: Category;
  amount: number;
}

interface BudgetContextType {
  budgets: Budget[];
  dataReady: boolean;
  setBudget: (category: Category, amount: number) => void;
  getBudget: (category: Category) => number;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

const STORAGE_BUDGETS = "sikatrack_budgets";

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { mode, ready: authReady, session } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [dataReady, setDataReady] = useState(false);

  const userId = mode === "cloud" ? session?.user?.id : "local";

  const loadLocal = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_BUDGETS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Budget[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBudgets(parsed);
          setDataReady(true);
          return;
        }
      } catch {
        /* fall through */
      }
    }
    setBudgets([]);
    localStorage.setItem(STORAGE_BUDGETS, JSON.stringify([]));
    setDataReady(true);
  }, []);

  const loadCloud = useCallback(async (uid: string) => {
    const supa = getSupabase();
    if (!supa) {
      setDataReady(true);
      return;
    }
    const { data, error } = await supa.from("budgets").select("category, amount").eq("user_id", uid);

    if (error) {
      console.error("Failed to load budgets:", error.message);
      setBudgets([]);
      setDataReady(true);
      return;
    }

    if (!data?.length) {
      setBudgets([]);
      setDataReady(true);
      return;
    }

    setBudgets(
      data.map((row) => ({
        category: row.category as Category,
        amount: typeof row.amount === "number" ? row.amount : parseFloat(String(row.amount)),
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
      setBudgets([]);
      setDataReady(true);
      return;
    }
    void loadCloud(userId);
  }, [authReady, mode, userId, loadLocal, loadCloud]);

  useEffect(() => {
    if (mode !== "local" || !dataReady) return;
    localStorage.setItem(STORAGE_BUDGETS, JSON.stringify(budgets));
  }, [budgets, mode, dataReady]);

  const setBudget = (category: Category, amount: number) => {
    if (mode === "cloud" && userId) {
      setBudgets((prev) => {
        const existing = prev.find((b) => b.category === category);
        if (existing) {
          return prev.map((b) => (b.category === category ? { ...b, amount } : b));
        }
        return [...prev, { category, amount }];
      });
      void (async () => {
        const supa = getSupabase();
        if (!supa) return;
        const { error } = await supa.from("budgets").upsert(
          { user_id: userId, category, amount },
          { onConflict: "user_id,category" }
        );
        if (error) console.error("Upsert budget failed:", error.message);
      })();
      return;
    }

    setBudgets((prev) => {
      const existing = prev.find((b) => b.category === category);
      if (existing) {
        return prev.map((b) => (b.category === category ? { ...b, amount } : b));
      }
      return [...prev, { category, amount }];
    });
  };

  const getBudget = (category: Category) => {
    const b = budgets.find((x) => x.category === category);
    return b ? b.amount : 0;
  };

  return (
    <BudgetContext.Provider value={{ budgets, dataReady, setBudget, getBudget }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudgets() {
  const context = useContext(BudgetContext);
  if (!context) throw new Error("useBudgets must be used within BudgetProvider");
  return context;
}
