import { useState } from "react";
import { useTransactions, Category, Transaction } from "../context/TransactionContext";
import { CATEGORY_COLORS, CATEGORY_EMOJI } from "../components/CategoryIcon";
import { Trash2, Filter, TrendingDown, TrendingUp, X, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

function formatGHS(amount: number) {
  return amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FILTER_CATEGORIES: (Category | "All")[] = [
  "All", "Food", "Transport", "Bills", "Entertainment", "MoMo Transfer", "Savings", "Other",
];

function getLast6Months(): { label: string; month: number; year: number }[] {
  const result = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      label: d.toLocaleDateString("en-GH", { month: "long", year: "numeric" }),
      month: d.getMonth(),
      year: d.getFullYear(),
    });
  }
  return result;
}

export function TransactionHistory() {
  const { transactions, deleteTransaction, updateTransaction } = useTransactions();
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<"all" | { month: number; year: number }>("all");
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState<Category>("Food");

  const months = getLast6Months();

  const filtered = transactions
    .filter((t: Transaction) => filterCategory === "All" || t.category === filterCategory)
    .filter((t: Transaction) => {
      if (monthFilter === "all") return true;
      const d = new Date(t.date);
      return d.getMonth() === monthFilter.month && d.getFullYear() === monthFilter.year;
    });

  const monthlyTotal = filtered
    .filter((t: Transaction) => {
      const d = new Date(t.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((acc: number, t: Transaction) => (t.type === "expense" ? acc - t.amount : acc + t.amount), 0);

  const grouped = filtered.reduce((acc: Record<string, Transaction[]>, t: Transaction) => {
    const key = new Date(t.date).toLocaleDateString("en-GH", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

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

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditAmount(t.amount.toString());
    setEditNotes(t.notes);
    setEditDate(t.date);
    setEditCategory(t.category);
  };

  const saveEdit = (t: Transaction) => {
    const val = parseFloat(editAmount);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    updateTransaction(t.id, {
      amount: val,
      category: editCategory,
      notes: editNotes,
      date: editDate,
    });
    setEditingId(null);
    toast.success("Transaction updated!");
  };

  const monthLabel =
    monthFilter === "all"
      ? "All Time"
      : months.find((m) => m.month === monthFilter.month && m.year === monthFilter.year)?.label ?? "All Time";

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="bg-card border-b border-border px-5 pt-12 pb-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Transaction History</h1>
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </span>
        </div>

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

        {/* Month Filter */}
        <div className="relative mb-3">
          <button
            onClick={() => setShowMonthPicker((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs font-semibold text-foreground"
          >
            <Filter size={12} />
            {monthLabel}
            <ChevronDown size={12} />
          </button>
          {showMonthPicker && (
            <div className="absolute left-0 top-9 z-20 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-48">
              <button
                onClick={() => { setMonthFilter("all"); setShowMonthPicker(false); }}
                className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-muted transition-colors ${monthFilter === "all" ? "text-primary font-semibold" : ""}`}
              >
                All Time
              </button>
              {months.map((m) => {
                const isSelected =
                  monthFilter !== "all" && monthFilter.month === m.month && monthFilter.year === m.year;
                return (
                  <button
                    key={m.label}
                    onClick={() => { setMonthFilter({ month: m.month, year: m.year }); setShowMonthPicker(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-muted transition-colors border-t border-border ${isSelected ? "text-primary font-semibold" : ""}`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Category filter chips */}
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
              {cat === "All" ? <Filter size={12} /> : <span>{CATEGORY_EMOJI[cat as Category]}</span>}
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
              {filterCategory === "All" && monthFilter === "all"
                ? "Start adding transactions to track your MoMo money"
                : `No ${filterCategory === "All" ? "" : filterCategory + " "}transactions for this period`}
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
                  {(dayTransactions as Transaction[]).length} tx
                </span>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                {(dayTransactions as Transaction[]).map((t, idx) => {
                  const isEditing = editingId === t.id;
                  return (
                    <div key={t.id}>
                      <div
                        className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 ${
                          idx !== (dayTransactions as Transaction[]).length - 1 && !isEditing ? "border-b border-border" : ""
                        }`}
                      >
                        {/* Icon */}
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${CATEGORY_COLORS[t.category]}`}
                          onClick={() => !editingId && startEdit(t)}
                          style={{ cursor: "pointer" }}
                        >
                          <span className="text-lg">{CATEGORY_EMOJI[t.category]}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0" onClick={() => !editingId && startEdit(t)} style={{ cursor: "pointer" }}>
                          <p className="font-semibold text-sm">{t.category}</p>
                          {t.notes && (
                            <p className="text-xs text-muted-foreground truncate">{t.notes}</p>
                          )}
                        </div>

                        {/* Amount + actions */}
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
                            title={confirmDeleteId === t.id ? "Tap again to confirm delete" : "Delete"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Inline Edit Panel */}
                      {isEditing && (
                        <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/30 space-y-3">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Edit Transaction</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount (GHS)</label>
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-full px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="w-full px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                              {FILTER_CATEGORIES.filter((c) => c !== "All").map((cat) => (
                                <button
                                  key={cat}
                                  onClick={() => setEditCategory(cat as Category)}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 border transition-colors ${
                                    editCategory === cat
                                      ? "bg-primary text-white border-primary"
                                      : "bg-card text-foreground border-border"
                                  }`}
                                >
                                  {CATEGORY_EMOJI[cat as Category]} {cat}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Note</label>
                            <input
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Add a note..."
                              className="w-full px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingId(null)}
                              className="flex-1 py-2 rounded-xl bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-1"
                            >
                              <X size={14} /> Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(t)}
                              className="flex-1 py-2 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-1"
                            >
                              <Check size={14} /> Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
