import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTransactions, Category } from "../context/TransactionContext";
import { CategoryIcon, CATEGORY_COLORS, CATEGORY_EMOJI } from "../components/CategoryIcon";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { parseMoMoSms } from "../utils/SmsParserUtils";

const CATEGORIES: Category[] = ["Food", "Transport", "Bills", "Entertainment", "MoMo Transfer", "Savings", "Other"];

function formatGHS(amount: number) {
  return amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AddTransaction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addTransaction } = useTransactions();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const initialType = searchParams.get("type") === "income" ? "income" : "expense";
  const [type, setType] = useState<"expense" | "income">(initialType);

  const displayAmount = amount ? `₵${formatGHS(parseFloat(amount) || 0)}` : "₵0.00";

  const handleSmsPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseMoMoSms(text);
      if (parsed) {
        setAmount(parsed.amount.toString());
        setType(parsed.type);
        setCategory(parsed.category);
        setNotes(parsed.notes);
        toast.success("SMS parsed successfully! Verify details below.");
      } else {
        toast.error("Could not find a valid transaction in clipboard text.");
      }
    } catch {
      toast.error("Clipboard permission denied or empty.");
    }
  };

  const handleNumpad = (key: string) => {
    if (key === "⌫") {
      setAmount((a) => a.slice(0, -1));
    } else if (key === "." && amount.includes(".")) {
      return;
    } else if (key === "." && amount === "") {
      setAmount("0.");
    } else {
      const decimals = amount.split(".")[1];
      if (decimals && decimals.length >= 2) return;
      setAmount((a) => a + key);
    }
  };

  const numpadKeys = ["1","2","3","4","5","6","7","8","9",".","0","⌫"];

  const handleSubmit = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    addTransaction({ amount: amountNum, category, notes, date, type });

    if (type === "expense") {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#16a34a", "#22c55e", "#86efac", "#ffffff"],
      });
    }

    toast.success(type === "expense" ? "Expense recorded! 📝" : "Income added! 🎉");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div
        className="px-5 pt-10 pb-5 text-white"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <h1 className="text-lg font-bold text-white flex-1">Add Transaction</h1>
          <button
            onClick={handleSmsPaste}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold"
          >
            <MessageSquarePlus size={14} /> Paste SMS
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex gap-2 p-1 bg-white/15 rounded-xl">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all capitalize ${
                type === t ? "bg-white text-foreground shadow-sm" : "text-white/80"
              }`}
            >
              {t === "expense" ? "💸 Expense" : "💰 Income"}
            </button>
          ))}
        </div>
      </div>

      {/* Amount display */}
      <div className="flex flex-col items-center py-6 px-5">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Amount (GHS)</p>
        <div className="text-5xl font-extrabold tracking-tight text-foreground">
          {displayAmount}
        </div>
      </div>

      {/* Numpad */}
      <div className="px-8 grid grid-cols-3 gap-3 mb-4">
        {numpadKeys.map((key) => (
          <button
            key={key}
            onClick={() => handleNumpad(key)}
            className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
              key === "⌫"
                ? "bg-muted text-muted-foreground"
                : "bg-card border border-border shadow-sm hover:bg-muted/60"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Category */}
      <div className="px-5 mb-4">
        <p className="text-sm font-semibold mb-3">Category</p>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all active:scale-95 ${
                category === cat
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-card hover:border-border"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${CATEGORY_COLORS[cat]}`}>
                <span>{CATEGORY_EMOJI[cat]}</span>
              </div>
              <span className="text-xs font-medium text-center leading-tight">{cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notes + Date */}
      <div className="px-5 flex flex-col gap-3 mb-4">
        <div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note (optional)..."
            rows={2}
            className="w-full px-4 py-3 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
          />
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
      </div>

      {/* Submit */}
      <div className="px-5 pb-8 mt-auto">
        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-[0.98] shadow-lg"
          style={{ background: "var(--gradient-primary)" }}
        >
          {type === "expense" ? "Record Expense 📝" : "Record Income 💰"}
        </button>
      </div>
    </div>
  );
}
