import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Logo } from "../components/Logo";
import { useTransactions, Category } from "../context/TransactionContext";
import { useBudgets } from "../context/BudgetContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Moon, Sun, ArrowUpRight, ArrowDownRight, Plus, ChevronRight, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CategoryIcon, CATEGORY_HEX, CATEGORY_EMOJI } from "../components/CategoryIcon";

function formatGHS(amount: number) {
  return amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
        <p className="font-semibold">{payload[0].name}</p>
        <p className="text-primary">₵{formatGHS(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const { transactions, dataReady, balance, monthlySpending, totalIncome, totalExpenses } = useTransactions();
  const { budgets } = useBudgets();
  const { theme, toggleTheme } = useTheme();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [showOpeningPrompt, setShowOpeningPrompt] = useState(false);

  const displayName = authUser?.displayName ?? "Friend";

  const now = new Date();
  const categoryData = transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<Category, number>);

  const chartData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const recentTransactions = transactions.slice(0, 5);
  const firstName = displayName.split(" ")[0];
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const onboardingSeenKey = `sikatrack_opening_balance_prompt_seen_${authUser?.id ?? "local"}`;

  useEffect(() => {
    if (!dataReady) return;
    if (transactions.length > 0) {
      setShowOpeningPrompt(false);
      return;
    }
    const seen = localStorage.getItem(onboardingSeenKey) === "1";
    setShowOpeningPrompt(!seen);
  }, [dataReady, transactions.length, onboardingSeenKey]);

  // Find budgets that are almost exceeded (>80%) or over
  const budgetWarnings = budgets.map((b) => {
    const spent = categoryData[b.category] || 0;
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    return { ...b, spent, pct };
  }).filter((b) => b.pct >= 80);

  return (
    <div className="flex flex-col gap-5 pb-4">
      {showOpeningPrompt && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 shadow-2xl">
            <h3 className="text-lg font-bold mb-1">Set Your Opening Balance</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Start with your current wallet/account amount so your balance reflects real money from day one.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  localStorage.setItem(onboardingSeenKey, "1");
                  setShowOpeningPrompt(false);
                  navigate("/add?type=income");
                }}
                className="flex-1 rounded-xl py-2.5 text-white font-semibold bg-green-600 hover:bg-green-700"
              >
                Set Balance
              </button>
              <button
                onClick={() => {
                  localStorage.setItem(onboardingSeenKey, "1");
                  setShowOpeningPrompt(false);
                }}
                className="flex-1 rounded-xl py-2.5 font-semibold bg-muted text-foreground"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="px-5 pt-12 pb-6 text-white"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <Logo size={34} />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} className="text-white" /> : <Sun size={18} className="text-white" />}
          </button>
        </div>

        <p className="text-white/80 text-sm font-medium mb-1">
          {greeting}, {firstName} 👋
        </p>
        <p className="text-white/70 text-xs mb-4">
          {now.toLocaleDateString("en-GH", { weekday: "long", month: "long", day: "numeric" })}
        </p>

        {/* Balance Card */}
        <div className="bg-white/15 rounded-2xl p-5 backdrop-blur-sm">
          <p className="text-white/80 text-xs font-medium uppercase tracking-widest mb-1">Total Balance</p>
          <h2 className="text-4xl font-extrabold text-white mb-4">
            ₵{formatGHS(balance)}
          </h2>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 flex-1">
              <ArrowUpRight size={16} className="text-green-200" />
              <div>
                <p className="text-white/70 text-xs">Income</p>
                <p className="text-white font-bold text-sm">₵{formatGHS(totalIncome)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 flex-1">
              <ArrowDownRight size={16} className="text-red-200" />
              <div>
                <p className="text-white/70 text-xs">Expenses</p>
                <p className="text-white font-bold text-sm">₵{formatGHS(totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="px-5">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {now.toLocaleDateString("en-GH", { month: "long" })} Spending
            </p>
            <p className="text-2xl font-extrabold mt-0.5">₵{formatGHS(monthlySpending)}</p>
          </div>
          <button
            onClick={() => navigate("/insights")}
            className="flex items-center gap-1 text-primary text-sm font-semibold"
          >
            View Insights <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Budget Warnings */}
      {budgetWarnings.length > 0 && (
        <div className="px-5 space-y-2">
          {budgetWarnings.map((warning, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border ${warning.pct >= 100 ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/30 text-orange-600'}`}>
              <AlertTriangle size={18} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs truncate">
                  {warning.pct >= 100 ? `Over ${warning.category} Budget!` : `Approaching ${warning.category} Limit`}
                </p>
              </div>
              <span className="font-bold text-xs flex-shrink-0">{warning.pct >= 100 ? "100+" : warning.pct.toFixed(0)}% used</span>
            </div>
          ))}
        </div>
      )}

      {/* Category Pie Chart */}
      {chartData.length > 0 && (
        <div className="px-5">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Spending by Category</h3>
            <div className="flex items-center gap-4">
              <div className="h-36 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_HEX[entry.name as Category]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {chartData.slice(0, 4).map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_HEX[entry.name as Category] }}
                    />
                    <span className="text-xs text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/add")}
            className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-2xl hover:bg-primary/15 transition-colors active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Plus size={18} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-primary">Add Expense</span>
          </button>
          <button
            onClick={() => navigate("/add")}
            className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 dark:bg-green-900/10 dark:border-green-900/30 rounded-2xl hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center">
              <ArrowUpRight size={18} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-green-700 dark:text-green-400">Add Income</span>
          </button>
        </div>
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="px-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent Transactions</h3>
            <button
              onClick={() => navigate("/history")}
              className="text-sm text-primary font-semibold flex items-center gap-1"
            >
              See all <ChevronRight size={16} />
            </button>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {recentTransactions.map((t, index) => (
              <div
                key={t.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${
                  index !== recentTransactions.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg`}
                  style={{ backgroundColor: CATEGORY_HEX[t.category] + "25" }}>
                  <span>{CATEGORY_EMOJI[t.category]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{t.category}</p>
                  {t.notes && <p className="text-xs text-muted-foreground truncate">{t.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-bold text-sm ${t.type === "income" ? "text-primary" : "text-foreground"}`}>
                    {t.type === "income" ? "+" : "-"}₵{formatGHS(t.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {transactions.length === 0 && (
        <div className="px-5 py-8 text-center">
          <div className="text-5xl mb-3">₵</div>
          <h3 className="text-lg font-bold mb-1">Start From Real Numbers</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Add your opening balance first, then track real expenses and income.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/add?type=income")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold bg-green-600 hover:bg-green-700"
            >
              <ArrowUpRight size={18} /> Set Opening Balance
            </button>
            <button
              onClick={() => navigate("/add")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Plus size={18} /> Add Expense
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
