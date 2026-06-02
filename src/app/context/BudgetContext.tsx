import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { Category } from "./TransactionContext";
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
  const { ready: authReady } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [dataReady, setDataReady] = useState(false);

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

  useEffect(() => {
    if (!authReady) return;
    setDataReady(false);
    loadLocal();
  }, [authReady, loadLocal]);

  useEffect(() => {
    if (!dataReady) return;
    localStorage.setItem(STORAGE_BUDGETS, JSON.stringify(budgets));
  }, [budgets, dataReady]);

  const setBudget = (category: Category, amount: number) => {
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
