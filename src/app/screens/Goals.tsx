import { useState } from "react";
import { useGoals, Goal } from "../context/GoalsContext";
import { useTransactions } from "../context/TransactionContext";
import { Plus, Check, Trash2, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

function formatGHS(amount: number) {
  return amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Goals() {
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals();
  const { totalIncome, totalExpenses } = useTransactions();
  const availableSavings = Math.max(0, totalIncome - totalExpenses);

  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // New goal state
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalIcon, setNewGoalIcon] = useState("🎯");
  
  // Allocate state
  const [allocateAmount, setAllocateAmount] = useState("");

  const handleSaveGoal = () => {
    const val = parseFloat(newGoalTarget);
    if (newGoalName.trim() && val > 0) {
      addGoal({ name: newGoalName, targetAmount: val, icon: newGoalIcon });
      toast.success("Savings goal created!");
      setIsAddingGoal(false);
      setNewGoalName("");
      setNewGoalTarget("");
      setNewGoalIcon("🎯");
    } else {
      toast.error("Please enter a valid name and amount");
    }
  };

  const handleAllocate = (goal: Goal) => {
    const val = parseFloat(allocateAmount);
    if (!isNaN(val) && val > 0 && val <= availableSavings) {
      updateGoal(goal.id, val);
      toast.success(`Allocated ₵${val} to ${goal.name}`);
      
      if (goal.savedAmount + val >= goal.targetAmount) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }});
        toast.success(`You reached your goal for ${goal.name}! 🎉`);
      }
      
      setSelectedGoalId(null);
      setAllocateAmount("");
    } else if (val > availableSavings) {
      toast.error("Amount exceeds your available balance");
    } else {
      toast.error("Please enter a valid amount");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold mb-1">Savings Goals (Susu)</h1>
        <p className="text-sm text-muted-foreground flex justify-between">
          <span>Set targets and save</span>
          <span className="font-semibold text-primary">₵{formatGHS(availableSavings)} Available</span>
        </p>
      </div>

      <div className="p-5 space-y-6">
        {/* Add Goal Button or Form */}
        {!isAddingGoal ? (
          <button
            onClick={() => setIsAddingGoal(true)}
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-primary/50 text-primary rounded-2xl hover:bg-primary/5 transition-colors font-semibold"
          >
            <Plus size={18} /> Create New Goal
          </button>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-semibold text-sm">New Goal</h3>
              <button onClick={() => setIsAddingGoal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-3">
              <div className="w-16">
                <label className="text-xs font-semibold mb-1 block">Emoji</label>
                <input
                  type="text"
                  maxLength={2}
                  value={newGoalIcon}
                  onChange={(e) => setNewGoalIcon(e.target.value)}
                  className="w-full px-2 py-3 bg-input-background border border-border rounded-xl text-center text-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold mb-1 block">Goal Name</label>
                <input
                  type="text"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  placeholder="e.g. New Phone"
                  className="w-full px-4 py-3 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block">Target Amount (GHS)</label>
              <input
                type="number"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(e.target.value)}
                placeholder="e.g. 2000"
                className="w-full px-4 py-3 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
              />
            </div>
            <button
              onClick={handleSaveGoal}
              className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-1 text-sm bg-primary hover:bg-primary/90"
            >
              <Check size={16} /> Save Goal
            </button>
          </div>
        )}

        {/* Goals List */}
        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-10 opacity-60">
              <TrendingUp size={48} className="mx-auto mb-3" />
              <p className="text-sm font-semibold">No active goals</p>
              <p className="text-xs">Start a Susu box for your dreams</p>
            </div>
          ) : (
            goals.map((goal) => {
              const pct = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
              const isEditing = selectedGoalId === goal.id;

              return (
                <div key={goal.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                        {goal.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-base leading-tight">{goal.name}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          <span className="font-semibold text-foreground">₵{formatGHS(goal.savedAmount)}</span> / ₵{formatGHS(goal.targetAmount)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-primary">{pct.toFixed(0)}%</span>
                      <span className="text-muted-foreground">₵{formatGHS(goal.targetAmount - goal.savedAmount)} left</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: "var(--gradient-primary)" }}
                      />
                    </div>
                  </div>

                  {/* Allocate Money */}
                  {!isEditing ? (
                    pct < 100 && (
                      <button
                        onClick={() => { setSelectedGoalId(goal.id); setAllocateAmount(""); }}
                        className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors"
                      >
                        Allocate Cash
                      </button>
                    )
                  ) : (
                    <div className="flex gap-2 pt-2 animate-in slide-in-from-top-2">
                      <input
                        type="number"
                        placeholder="Amount"
                        value={allocateAmount}
                        onChange={(e) => setAllocateAmount(e.target.value)}
                        className="flex-1 px-3 py-2 bg-input-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                      <button
                        onClick={() => handleAllocate(goal)}
                        className="px-4 py-2 bg-primary text-white font-semibold rounded-xl text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setSelectedGoalId(null)}
                        className="px-3 py-2 bg-muted text-foreground font-semibold rounded-xl text-sm"
                      >
                        Cancel
                      </button>
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
