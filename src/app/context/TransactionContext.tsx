import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "./AuthContext";

export type Category =
  | "Food"
  | "Transport"
  | "Bills"
  | "Entertainment"
  | "MoMo Transfer"
  | "Savings"
  | "Other";

export interface Transaction {
  id: string;
  amount: number;
  category: Category;
  notes: string;
  date: string;
  type: "expense" | "income";
}

interface TransactionContextType {
  transactions: Transaction[];
  dataReady: boolean;
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  deleteTransaction: (id: string) => void;
  balance: number;
  monthlySpending: number;
  totalIncome: number;
  totalExpenses: number;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

const STORAGE_TRANSACTIONS = "sikatrack_transactions";

function generateLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function rowToTransaction(row: {
  id: string;
  amount: number | string;
  category: string;
  notes: string | null;
  date: string;
  type: string;
}): Transaction | null {
  const type = row.type === "income" ? "income" : "expense";
  const category = row.category as Category;
  const allowed: Category[] = [
    "Food",
    "Transport",
    "Bills",
    "Entertainment",
    "MoMo Transfer",
    "Savings",
    "Other",
  ];
  if (!allowed.includes(category)) return null;
  return {
    id: row.id,
    amount: typeof row.amount === "number" ? row.amount : parseFloat(row.amount),
    category,
    notes: row.notes ?? "",
    date: row.date,
    type,
  };
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { mode, ready: authReady, session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataReady, setDataReady] = useState(false);

  const userId = mode === "cloud" ? session?.user?.id : "local";

  const loadLocal = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_TRANSACTIONS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTransactions(parsed as Transaction[]);
          setDataReady(true);
          return;
        }
      } catch (e) {
        console.error("Failed to parse transactions:", e);
      }
    }
    setTransactions([]);
    localStorage.setItem(STORAGE_TRANSACTIONS, JSON.stringify([]));
    setDataReady(true);
  }, []);

  const loadCloud = useCallback(async (uid: string) => {
    const supa = getSupabase();
    if (!supa) {
      setDataReady(true);
      return;
    }
    const { data, error } = await supa
      .from("transactions")
      .select("id, amount, category, notes, date, type")
      .eq("user_id", uid)
      .order("date", { ascending: false });

    if (error) {
      console.error("Failed to load transactions:", error.message);
      setTransactions([]);
      setDataReady(true);
      return;
    }

    const list: Transaction[] = [];
    for (const row of data ?? []) {
      const t = rowToTransaction(row as Parameters<typeof rowToTransaction>[0]);
      if (t) list.push(t);
    }
    setTransactions(list);
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
      setTransactions([]);
      setDataReady(true);
      return;
    }
    void loadCloud(userId);
  }, [authReady, mode, userId, loadLocal, loadCloud]);

  useEffect(() => {
    if (mode !== "local" || !dataReady) return;
    localStorage.setItem(STORAGE_TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions, mode, dataReady]);

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    if (mode === "cloud" && userId) {
      const id = crypto.randomUUID();
      const newTx: Transaction = { ...transaction, id };
      setTransactions((prev) => [newTx, ...prev]);
      void (async () => {
        const supa = getSupabase();
        if (!supa) return;
        const { error } = await supa.from("transactions").insert({
          id,
          user_id: userId,
          amount: transaction.amount,
          category: transaction.category,
          notes: transaction.notes,
          date: transaction.date,
          type: transaction.type,
        });
        if (error) {
          console.error("Insert transaction failed:", error.message);
          setTransactions((prev) => prev.filter((t) => t.id !== id));
        }
      })();
      return;
    }

    const newTransaction: Transaction = { ...transaction, id: generateLocalId() };
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    if (mode === "cloud" && userId) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      void (async () => {
        const supa = getSupabase();
        if (!supa) return;
        const { error } = await supa.from("transactions").delete().eq("id", id).eq("user_id", userId);
        if (error) {
          console.error("Delete transaction failed:", error.message);
          void loadCloud(userId);
        }
      })();
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const monthlySpending = transactions
    .filter((t) => {
      const d = new Date(t.date);
      const now = new Date();
      return (
        t.type === "expense" &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        dataReady,
        addTransaction,
        deleteTransaction,
        balance,
        monthlySpending,
        totalIncome,
        totalExpenses,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) throw new Error("useTransactions must be used within TransactionProvider");
  return context;
}
