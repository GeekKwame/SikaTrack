import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
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
  updateTransaction: (id: string, updates: Omit<Transaction, "id" | "type">) => void;
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

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { ready: authReady } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataReady, setDataReady] = useState(false);

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

  useEffect(() => {
    if (!authReady) return;
    setDataReady(false);
    loadLocal();
  }, [authReady, loadLocal]);

  useEffect(() => {
    if (!dataReady) return;
    localStorage.setItem(STORAGE_TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions, dataReady]);

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransaction: Transaction = { ...transaction, id: generateLocalId() };
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTransaction = (id: string, updates: Omit<Transaction, "id" | "type">) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
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
        updateTransaction,
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
