import { useTransactions, Category } from "../context/TransactionContext";
import { useTheme } from "../context/ThemeContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, AlertCircle, Lightbulb, Flame, Moon, Sun } from "lucide-react";
import { CATEGORY_HEX, CATEGORY_EMOJI } from "../components/CategoryIcon";

function formatGHS(amount: number) {
  return amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-bold text-primary">₵{formatGHS(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function Insights() {
  const { transactions } = useTransactions();
  const { theme, toggleTheme } = useTheme();

  // Last 6 months spending
  const monthlyData = (() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const month = d.toLocaleDateString("en-GH", { month: "short" });
      const amount = transactions
        .filter((t) => {
          const td = new Date(t.date);
          return t.type === "expense" && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
        })
        .reduce((s, t) => s + t.amount, 0);
      return { month, amount };
    });
  })();

  // Top categories (all-time)
  const topCategories = (() => {
    const totals = transactions
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<Category, number>);
    const max = Math.max(...Object.values(totals), 1);
    return Object.entries(totals)
      .map(([cat, total]) => ({ cat: cat as Category, total, pct: (total / max) * 100 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  })();

  // Current vs last month
  const now = new Date();
  const curSpend = transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, t) => s + t.amount, 0);

  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevSpend = transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getMonth() === prevDate.getMonth() && d.getFullYear() === prevDate.getFullYear();
    })
    .reduce((s, t) => s + t.amount, 0);

  const pctChange = prevSpend > 0 ? ((curSpend - prevSpend) / prevSpend) * 100 : 0;

  // Savings rate
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Ghanaian smart recommendations
  const recommendations = (() => {
    const recs = [];
    const topCat = topCategories[0];

    if (pctChange > 20) {
      recs.push({
        icon: AlertCircle,
        color: "text-destructive",
        bg: "bg-destructive/10",
        title: "Spending Alert! 🚨",
        message: `You spent ${Math.abs(pctChange).toFixed(0)}% more than last month. Time to cut back a little.`,
      });
    } else if (pctChange < -20) {
      recs.push({
        icon: TrendingDown,
        color: "text-primary",
        bg: "bg-primary/10",
        title: "Great Progress! 🎉",
        message: `You reduced spending by ${Math.abs(pctChange).toFixed(0)}% this month. Ayekoo!`,
      });
    }

    if (topCat && topCat.total > curSpend * 0.4) {
      recs.push({
        icon: Flame,
        color: "text-orange-500",
        bg: "bg-orange-100 dark:bg-orange-900/20",
        title: "Big Spender Category 👀",
        message: `${topCat.cat} takes up ${((topCat.total / (totalExpenses || 1)) * 100).toFixed(0)}% of all your spending. Consider setting a budget.`,
      });
    }

    if (savingsRate < 10 && totalIncome > 0) {
      recs.push({
        icon: Lightbulb,
        color: "text-yellow-500",
        bg: "bg-yellow-100 dark:bg-yellow-900/20",
        title: "Save More 💡",
        message: `You're saving only ${savingsRate.toFixed(0)}% of your income. Aim for at least 20% — even a daily Susu helps!`,
      });
    }

    if (recs.length === 0) {
      recs.push({
        icon: Lightbulb,
        color: "text-muted-foreground",
        bg: "bg-muted",
        title: "Keep Tracking",
        message: "Add more transactions to get personalised insights on your spending habits.",
      });
    }
    return recs;
  })();

  const hasTransactions = transactions.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Insights & Analytics</h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-2xl p-3 text-center shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Transactions</p>
            <p className="text-xl font-extrabold">{transactions.length}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">vs Last Month</p>
            <p className={`text-xl font-extrabold ${pctChange > 0 ? "text-destructive" : "text-primary"}`}>
              {pctChange > 0 ? "+" : ""}{pctChange.toFixed(0)}%
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 text-center shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Savings Rate</p>
            <p className={`text-xl font-extrabold ${savingsRate >= 20 ? "text-primary" : savingsRate >= 10 ? "text-yellow-500" : "text-destructive"}`}>
              {savingsRate.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Spending Trend */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Spending Trend</h3>
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
              pctChange > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            }`}>
              {pctChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(pctChange).toFixed(0)}%
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ left: -20, right: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₵${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--color-primary)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Categories with Progress Bars */}
        {topCategories.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Top Spending Categories</h3>
            <div className="space-y-4">
              {topCategories.map(({ cat, total, pct }, i) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{CATEGORY_EMOJI[cat]}</span>
                      <span className="text-sm font-semibold">
                        {i === 0 && <span className="text-xs mr-1">🏆</span>}
                        {cat}
                      </span>
                    </div>
                    <span className="text-sm font-bold">₵{formatGHS(total)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: CATEGORY_HEX[cat],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bar Chart by category */}
        {topCategories.length > 1 && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Category Breakdown</h3>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCategories.map((c) => ({ name: c.cat.split(" ")[0], total: c.total }))}
                  margin={{ left: -20, right: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₵${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Smart Recommendations */}
        <div>
          <h3 className="font-semibold mb-3">Smart Recommendations</h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              const Icon = rec.icon;
              return (
                <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <div className="flex gap-3 items-start">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${rec.bg}`}>
                      <Icon size={18} className={rec.color} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-0.5">{rec.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty state */}
        {!hasTransactions && (
          <div className="text-center py-10">
            <div className="text-5xl mb-3">📈</div>
            <h3 className="font-bold mb-1">No data yet</h3>
            <p className="text-sm text-muted-foreground">Add some transactions to see your insights!</p>
          </div>
        )}
      </div>
    </div>
  );
}
