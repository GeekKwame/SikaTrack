import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useTransactions } from "../context/TransactionContext";
import { useBudgets } from "../context/BudgetContext";
import { useGoals } from "../context/GoalsContext";
import { ArrowLeft, Send, Sparkles } from "lucide-react";

type Message = { id: string; sender: "user" | "sika"; text: string };

export function AskSika() {
  const navigate = useNavigate();
  const { transactions, totalExpenses, totalIncome, balance } = useTransactions();
  const { budgets } = useBudgets();
  const { goals } = useGoals();
  
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", sender: "sika", text: "Hi! I'm Sika 🤖. I can give you quick insights about your spending, budgets, and goals. Try asking: 'How much did I spend?' or 'Are any budgets over?'" }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processQuery = (query: string) => {
    const q = query.toLowerCase();
    
    if (q.includes("spend") || q.includes("expenses")) {
      return `💸 You've spent a total of ₵${totalExpenses.toLocaleString("en-GH", { minimumFractionDigits: 2 })} so far. Your total income is ₵${totalIncome.toLocaleString("en-GH", { minimumFractionDigits: 2 })}.`;
    }
    
    if (q.includes("balance") || q.includes("how much do i have")) {
      return `💰 Your current calculated balance is ₵${balance.toLocaleString("en-GH", { minimumFractionDigits: 2 })}.`;
    }
    
    if (q.includes("budget")) {
      if (budgets.length === 0) return "You haven't set up any budgets yet! Head to your Dashboard to set them.";
      
      const now = new Date();
      const spentPerCat = transactions
        .filter(t => t.type === "expense" && new Date(t.date).getMonth() === now.getMonth())
        .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {} as any);
      
      const warnings = budgets.map(b => {
        const s = spentPerCat[b.category] || 0;
        return { ...b, spent: s, pct: b.amount > 0 ? (s / b.amount) * 100 : 0 };
      }).filter(b => b.pct >= 80);

      if (warnings.length > 0) {
        return `⚠️ Be careful! You are over or approaching your limit on: ${warnings.map(w => w.category).join(", ")}.`;
      }
      return "✅ Looking good! You are within your budget limits for all tracked categories this month.";
    }

    if (q.includes("goal") || q.includes("susu")) {
      if (goals.length === 0) return "You don't have any Susu goals yet. Let's create one!";
      return `🎯 You are tracking ${goals.length} goal(s). Remember to allocate funds as they come in!`;
    }
    
    if (q.includes("food")) {
      const foodSpend = transactions.filter(t => t.type === "expense" && t.category === "Food").reduce((sum, t) => sum + t.amount, 0);
      return `🍔 You have spent ₵${foodSpend.toLocaleString("en-GH", { minimumFractionDigits: 2 })} on food. Try cooking at home to save more!`;
    }

    return "Hmm, I'm not quite sure. Try asking about your 'spending', 'balance', 'budgets', or 'goals'!";
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), sender: "user", text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Simulate AI thinking delay
    setTimeout(() => {
      const reply = processQuery(userMsg.text);
      const sikaMsg: Message = { id: (Date.now() + 1).toString(), sender: "sika", text: reply };
      setMessages(prev => [...prev, sikaMsg]);
    }, 600);
  };

  return (
    <div className="h-full flex flex-col bg-background">
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
          <p className="text-white/80 text-xs">AI Financial Assistant</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl p-3.5 text-sm ${
                msg.sender === "user"
                  ? "bg-primary text-white rounded-br-none shadow-md"
                  : "bg-card border border-border text-foreground rounded-bl-none shadow-sm"
              }`}
            >
              <p className="leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card border-t border-border mt-auto">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about your spending..."
            className="flex-1 px-4 py-3 bg-input-background border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
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
