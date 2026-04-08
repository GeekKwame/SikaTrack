import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTransactions } from "../context/TransactionContext";
import { useBudgets } from "../context/BudgetContext";
import { useGoals } from "../context/GoalsContext";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { askGemini } from "../../lib/gemini";

type Message = { id: string; sender: "user" | "sika"; text: string };

const SUGGESTIONS = [
  "How much did I spend?",
  "What's my balance?",
  "Am I over budget?",
  "How are my goals?",
  "How much on food?",
  "How much on transport?",
  "What's my savings rate?",
  "Tips to save money",
];

export function AskSika() {
  const navigate = useNavigate();
  const { transactions, totalExpenses, totalIncome, balance, monthlySpending } = useTransactions();
  const { budgets } = useBudgets();
  const { goals } = useGoals();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "sika",
      text: "Hi! I'm Sika 🤖 — your personal AI money helper, powered by Gemini.\n\nTap a question below or ask me anything about your MoMo spending, budgets, and savings goals!",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const buildFinanceContext = () => {
    const now = new Date();
    const month = now.toLocaleDateString("en-GH", { month: "long", year: "numeric" });
    const monthlyCategoryTotals = transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          new Date(t.date).getMonth() === now.getMonth() &&
          new Date(t.date).getFullYear() === now.getFullYear()
      )
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      currency: "GHS (₵)",
      currentMonth: month,
      totals: { balance, totalIncome, totalExpenses, monthlySpending },
      budgets: budgets.map((b) => {
        const spent = monthlyCategoryTotals[b.category] || 0;
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        return { category: b.category, budget: b.amount, spent, percentUsed: Number(pct.toFixed(1)) };
      }),
      goals: goals.map((g) => ({
        name: g.name,
        icon: g.icon ?? "🎯",
        targetAmount: g.targetAmount,
        savedAmount: g.savedAmount,
      })),
      recentTransactions: transactions.slice(0, 15).map((t) => ({
        date: t.date,
        type: t.type,
        category: t.category,
        amount: t.amount,
        notes: t.notes || "",
      })),
    };
  };

  const buildPrompt = (userQuery: string, history: Message[]) => {
    const finance = buildFinanceContext();
    const conversation = history
      .slice(-8)
      .map((m) => `${m.sender === "user" ? "User" : "Sika"}: ${m.text}`)
      .join("\n");

    return [
      "You are Sika, a friendly Ghana-focused personal finance assistant in the SikaTrack app.",
      "Reply in clear plain text, under 140 words, with practical and specific guidance.",
      "Use ₵ for Ghana cedi values and base answers on the provided finance data.",
      "If user asks for advice, provide 2-4 concise bullet points.",
      "If asked a follow-up question, use the conversation history to stay consistent.",
      "",
      `Conversation history:\n${conversation || "No prior messages."}`,
      "",
      `Latest user question: ${userQuery}`,
      "",
      `Finance data (JSON): ${JSON.stringify(finance)}`,
    ].join("\n");
  };

  const sendMessage = async (text: string) => {
    const q = text.trim();
    if (!q || isTyping) return;
    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: q };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsTyping(true);

    try {
      const prompt = buildPrompt(q, nextMessages);
      const reply = await askGemini(prompt);
      const sikaMsg: Message = { id: (Date.now() + 1).toString(), sender: "sika", text: reply };
      setMessages((prev) => [...prev, sikaMsg]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong while contacting Gemini.";
      const sikaMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "sika",
        text: `I couldn't reach Gemini right now. ${message}`,
      };
      setMessages((prev) => [...prev, sikaMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    void sendMessage(input);
  };

  return (
    <div className="h-full flex flex-col bg-background" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5 flex items-center gap-3 text-white sticky top-0 z-10 shadow-sm"
        style={{ background: "var(--gradient-primary)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white flex items-center gap-1.5">
            <Sparkles size={16} /> Ask Sika
          </h1>
          <p className="text-white/80 text-xs">Your AI Money Helper 🇬🇭</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-base font-bold">
          🤖
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 pb-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            {msg.sender === "sika" && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1"
                style={{ background: "var(--gradient-primary)" }}>
                🤖
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl p-3.5 text-sm ${
                msg.sender === "user"
                  ? "bg-primary text-white rounded-br-none shadow-md"
                  : "bg-card border border-border text-foreground rounded-bl-none shadow-sm"
              }`}
            >
              <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: "var(--gradient-primary)" }}>
              🤖
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => void sendMessage(s)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20 hover:bg-primary/20 transition-colors active:scale-95"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card border-t border-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void sendMessage(input)}
            placeholder="Ask about your money..."
            className="flex-1 px-4 py-3 bg-background border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <button
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="p-3.5 rounded-full text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
