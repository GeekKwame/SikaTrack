import { Outlet, useLocation, useNavigate, Navigate } from "react-router";
import { Home, Plus, TrendingUp, Target, User, Sparkles, Activity } from "lucide-react";
import { TransactionProvider } from "../context/TransactionContext";
import { ThemeProvider } from "../context/ThemeContext";
import { BudgetProvider } from "../context/BudgetContext";
import { GoalsProvider } from "../context/GoalsContext";
import { useAuth } from "../context/AuthContext";

const STORAGE_USER = "sikatrack_user";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, mode, session } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
          style={{ background: "var(--gradient-primary)" }}
        >
          <span className="text-white font-extrabold text-3xl">₵</span>
        </div>
        <p className="text-sm font-semibold text-muted-foreground">SikaTrack</p>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (mode === "cloud") {
    if (!session?.user) return <Navigate to="/login" replace />;
  } else if (!localStorage.getItem(STORAGE_USER)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const mobileNav = [
  { path: "/",        Icon: Home,     label: "Home",    isAdd: false },
  { path: "/history", Icon: TrendingUp, label: "History", isAdd: false },
  { path: "/add",     Icon: Plus,     label: "Add",     isAdd: true  },
  { path: "/budget",  Icon: Target,   label: "Budget",  isAdd: false },
  { path: "/goals",   Icon: Activity, label: "Goals",   isAdd: false },
  { path: "/profile", Icon: User,     label: "Profile", isAdd: false },
];

const desktopNav = mobileNav.filter((i) => !i.isAdd);

export function Root() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ThemeProvider>
      <AuthGuard>
        <TransactionProvider>
          <BudgetProvider>
            <GoalsProvider>
              <div className="min-h-screen bg-background relative">
                {/* Desktop header */}
                <header className="hidden md:block sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
                  <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="text-lg font-extrabold tracking-tight"
                    >
                      SikaTrack
                    </button>
                    <div className="flex items-center gap-2">
                      {desktopNav.map(({ path, Icon, label }) => {
                        const isActive = location.pathname === path;
                        return (
                          <button
                            key={path}
                            type="button"
                            onClick={() => navigate(path)}
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <Icon size={16} />
                            {label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => navigate("/add")}
                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>
                  </div>
                </header>

                <main className="w-full max-w-6xl mx-auto md:px-6">
                  <div className="min-h-screen md:min-h-0 pb-24 md:pb-6">
                    <Outlet />
                  </div>
                </main>

                {/* Ask Sika floating button */}
                {location.pathname !== "/ask" && location.pathname !== "/add" && (
                  <button
                    type="button"
                    onClick={() => navigate("/ask")}
                    className="fixed bottom-24 right-5 md:bottom-6 md:right-8 p-4 rounded-full shadow-2xl transition-transform active:scale-95 flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      boxShadow: "0 8px 30px rgba(16, 185, 129, 0.4)",
                    }}
                    aria-label="Ask Sika AI"
                  >
                    <Sparkles size={24} className="text-white" />
                  </button>
                )}

                {/* Mobile bottom nav — 6 items */}
                <nav
                  className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom"
                  style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}
                >
                  <div className="flex items-end justify-around px-1 pt-2 pb-4">
                    {mobileNav.map(({ path, Icon, label, isAdd }) => {
                      const isActive = location.pathname === path;

                      if (isAdd) {
                        return (
                          <button
                            key={path}
                            type="button"
                            onClick={() => navigate(path)}
                            className="flex flex-col items-center -mt-5"
                            aria-label="Add transaction"
                          >
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95"
                              style={{ background: "var(--gradient-primary)" }}
                            >
                              <Icon size={22} className="text-white" />
                            </div>
                            <span className="text-[10px] font-medium mt-1 text-muted-foreground">Add</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={path}
                          type="button"
                          onClick={() => navigate(path)}
                          className="flex flex-col items-center gap-0.5 min-w-10 transition-all active:scale-95"
                        >
                          <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-primary/10" : ""}`}>
                            <Icon
                              size={20}
                              className={isActive ? "text-primary" : "text-muted-foreground"}
                              strokeWidth={isActive ? 2.5 : 2}
                            />
                          </div>
                          <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </nav>
              </div>
            </GoalsProvider>
          </BudgetProvider>
        </TransactionProvider>
      </AuthGuard>
    </ThemeProvider>
  );
}
