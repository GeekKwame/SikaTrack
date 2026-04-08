import { useState } from "react";
import { useBudgets } from "../context/BudgetContext";
import { useTransactions, Category } from "../context/TransactionContext";
import { CATEGORY_HEX, CATEGORY_EMOJI } from "../components/CategoryIcon";
import { AlertCircle, Target, Plus, Check } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: Category[] = ["Food", "Transport", "Bills", "Entertainment", "MoMo Transfer", "Savings", "Other"];

function formatGHS(amount: number) {
  return amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Budget() {
  const { budgets, setBudget } = useBudgets();
  const { transactions } = useTransactions();
  
  const [selectedCategory, setSelectedCategory] = useState<Category>("Food");
  const [amountInput, setAmountInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveBudget = () => {
    const val = parseFloat(amountInput);
    if (!isNaN(val) && val >= 0) {
      setBudget(selectedCategory, val);
      toast.success(`${selectedCategory} budget set to ₵${formatGHS(val)}`);
      setIsEditing(false);
      setAmountInput("");
    } else {
      toast.error("Please enter a valid positive number.");
    }
  };

  const getSpent = (category: Category) => {
    const now = new Date();
    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return t.type === "expense" && t.category === category && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const budgetItems = CATEGORIES.map((cat) => {
    const budgetAmount = budgets.find((b) => b.category === cat)?.amount || 0;
    const spentAmount = getSpent(cat);
    const pct = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
    return {
      category: cat,
      budget: budgetAmount,
      spent: spentAmount,
      pct,
    };
  }).filter((b) => b.budget > 0 || getSpent(b.category) > 0);

  const startEdit = (cat: Category) => {
    setSelectedCategory(cat);
    const b = budgets.find((x) => x.category === cat);
    setAmountInput(b ? b.amount.toString() : "");
    setIsEditing(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold mb-1">Monthly Budgets</h1>
        <p className="text-sm text-muted-foreground">Keep your spending in check</p>
      </div>

      <div className="p-5 space-y-6">
        {/* Set Budget CTA */}
        {!isEditing ? (
          <button
            onClick={() => { setSelectedCategory("Food"); setAmountInput(""); setIsEditing(true); }}
            className="w-full flex items-center justify-center gap-2 p-4 bg-primary/10 border border-primary/20 rounded-2xl hover:bg-primary/20 transition-colors text-primary font-semibold"
          >
            <Plus size={18} /> Add / Update Budget
          </button>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm">Set Budget Limit</h3>
            <div>
              <label className="text-xs font-semibold mb-2 block">Category</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                      selectedCategory === cat ? "bg-primary text-white border-primary" : "bg-muted text-foreground border-border hover:bg-muted/80"
                    }`}
                  >
                    {CATEGORY_EMOJI[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-2 block">Monthly Limit (GHS)</label>
              <input
                type="number"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-4 py-3 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 rounded-xl bg-muted font-semibold text-sm hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBudget}
                className="flex-1 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-1 text-sm bg-primary hover:bg-primary/90"
              >
                <Check size={16} /> Save Limit
              </button>
            </div>
          </div>
        )}

        {/* Budget list */}
        <div className="space-y-4">
          {budgetItems.length === 0 ? (
            <div className="text-center py-10 opacity-60">
              <Target size={48} className="mx-auto mb-3" />
              <p className="text-sm font-semibold">No budgets set</p>
              <p className="text-xs">Set a budget to track your limits</p>
            </div>
          ) : (
            budgetItems.map((item) => {
              const isOver = item.pct >= 100;
              const isWarn = item.pct >= 80 && !isOver;
              const barColor = isOver ? "bg-destructive" : isWarn ? "bg-orange-500" : CATEGORY_HEX[item.category];

              return (
                <div key={item.category} className="bg-card border border-border rounded-2xl p-4 shadow-sm" onClick={() => startEdit(item.category)}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{CATEGORY_EMOJI[item.category]}</span>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{item.category}</p>
                        <p className="text-xs text-muted-foreground">{item.budget === 0 ? "No limit set" : `${item.pct.toFixed(0)}% used`}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${isOver ? "text-destructive" : ""}`}>
                        ₵{formatGHS(item.spent)}
                      </p>
                      <p className="text-xs text-muted-foreground">/ ₵{formatGHS(item.budget)}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {item.budget > 0 && (
                    <div className="relative h-2.5 bg-muted rounded-full overflow-hidden mt-3">
                      <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${isWarn ? "bg-orange-500" : isOver ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${Math.min(item.pct, 100)}%`, backgroundColor: barColor }}
                      />
                    </div>
                  )}

                  {/* Badges */}
                  {isOver && item.budget > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-destructive font-semibold bg-destructive/10 w-fit px-2 py-0.5 rounded-full">
                      <AlertCircle size={12} /> Over budget
                    </div>
                  )}
                  {isWarn && item.budget > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-orange-600 font-semibold bg-orange-100 dark:bg-orange-900/30 w-fit px-2 py-0.5 rounded-full">
                      <AlertCircle size={12} /> Almost there
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
