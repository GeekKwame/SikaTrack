import { useState } from "react";
import { useTransactions, Category } from "../context/TransactionContext";
import { CategoryIcon, CATEGORY_COLORS, CATEGORY_EMOJI } from "../components/CategoryIcon";
import { Trash2, Filter, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

function formatGHS(amount: number) {
  return amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FILTER_CATEGORIES: (Category | "All")[] = [
  "All", "Food", "Transport", "Bills", "Entertainment", "MoMo Transfer", "Savings", "Other",
];

export function TransactionHistory() {
  const { transactions, deleteTransaction } = useTransactions();
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered =
    filterCategory === "All"
      ? transactions
      : transactions.filter((t) => t.category === filterCategory);

  const monthlyTotal = filtered
    .filter((t) => {
      const d = new Date(t.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((acc, t) => (t.type === "expense" ? acc - t.amount : acc + t.amount), 0);

  const grouped = filtered.reduce((acc, t) => {
    const key = new Date(t.date).toLocaleDateString("en-GH", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, typeof transactions>);

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      deleteTransaction(id);
      setConfirmDeleteId(null);
      toast.success("Transaction deleted");
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="bg-card border-b border-border px-5 pt-12 pb-3 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold mb-3">Transaction History</h1>

        {/* Monthly summary banner */}
        <div className="flex items-center justify-between bg-primary/8 rounded-xl px-4 py-2.5 mb-3 border border-primary/15">
          <div className="flex items-center gap-2">
            {monthlyTotal >= 0 ? (
              <TrendingUp size={16} className="text-primary" />
            ) : (
              <TrendingDown size={16} className="text-destructive" />
            )}
            <span className="text-sm text-muted-foreground font-medium">
              {filterCategory === "All" ? "This month" : `${filterCategory} this month`}
            </span>
          </div>
          <span className={`font-bold text-sm ${monthlyTotal >= 0 ? "text-primary" : "text-destructive"}`}>
            {monthlyTotal >= 0 ? "+" : ""}₵{formatGHS(Math.abs(monthlyTotal))}
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-all flex-shrink-0 ${
                filterCategory === cat
                  ? "bg-primary text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat === "All" ? (
                <Filter size={12} />
              ) : (
                <span>{CATEGORY_EMOJI[cat as Category]}</span>
              )}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="px-5 py-4 space-y-5">
        {Object.entries(grouped).length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📊</div>
            <h3 className="text-lg font-bold mb-1">No transactions found</h3>
            <p className="text-sm text-muted-foreground">
              {filterCategory === "All"
                ? "Start adding transactions to track your money"
                : `No ${filterCategory} transactions yet`}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dayTransactions]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {date}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {dayTransactions.length} tx
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                {dayTransactions.map((t, idx) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 ${
                      idx !== dayTransactions.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${CATEGORY_COLORS[t.category]}`}>
                      <span className="text-lg">{CATEGORY_EMOJI[t.category]}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{t.category}</p>
                      {t.notes && (
                        <p className="text-xs text-muted-foreground truncate">{t.notes}</p>
                      )}
                    </div>

                    {/* Amount + Delete */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className={`font-bold text-sm ${t.type === "income" ? "text-primary" : "text-foreground"}`}>
                          {t.type === "income" ? "+" : "-"}₵{formatGHS(t.amount)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className={`p-1.5 rounded-lg transition-all ${
                          confirmDeleteId === t.id
                            ? "bg-destructive text-white"
                            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        }`}
                        title={confirmDeleteId === t.id ? "Tap again to confirm" : "Delete"}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
