import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

const STORAGE_USER = "sikatrack_user";

export function Signup() {
  const navigate = useNavigate();

  const [step, setStep] = useState<"name" | "pin" | "confirm">("name");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Please enter your full name");
      return;
    }
    setError("");
    setStep("pin");
  };

  const handlePinKey = (digit: string) => {
    if (digit === "⌫") {
      if (step === "pin") setPin((p) => p.slice(0, -1));
      else setConfirmPin((p) => p.slice(0, -1));
      setError("");
      return;
    }

    if (step === "pin") {
      const next = pin + digit;
      if (next.length <= 4) {
        setPin(next);
        if (next.length === 4) setTimeout(() => setStep("confirm"), 300);
      }
    } else {
      const next = confirmPin + digit;
      if (next.length <= 4) {
        setConfirmPin(next);
        if (next.length === 4) {
          setTimeout(() => {
            if (next === pin) {
              localStorage.setItem(STORAGE_USER, JSON.stringify({ name: name.trim(), pin }));
              navigate("/");
            } else {
              setError("PINs don't match. Try again.");
              setConfirmPin("");
            }
          }, 200);
        }
      }
    }
  };

  const pinKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  const currentPin = step === "pin" ? pin : confirmPin;

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-12">
      <button
        type="button"
        onClick={() =>
          step === "name" ? navigate("/login") : step === "pin" ? setStep("name") : setStep("pin")
        }
        className="flex items-center gap-2 text-muted-foreground mb-8 self-start"
      >
        <ArrowLeft size={20} />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="flex flex-col items-center gap-3 mb-10">
        <div
          className="rounded-2xl flex items-center justify-center shadow-lg"
          style={{ width: 64, height: 64, background: "var(--gradient-primary)" }}
        >
          <span className="text-white font-bold text-3xl">₵</span>
        </div>
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-sm text-muted-foreground text-center">
          {step === "name"
            ? "What should we call you?"
            : step === "pin"
              ? "Create a 4-digit PIN"
              : "Confirm your PIN"}
        </p>
      </div>

      {step === "name" && (
        <form onSubmit={handleNameSubmit} className="flex flex-col gap-4 w-full max-w-xs mx-auto">
          <div>
            <label htmlFor="local-name" className="block text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              id="local-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="e.g. Kofi Mensah"
              className="w-full px-4 py-4 text-lg bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full py-4 rounded-2xl font-semibold text-primary-foreground transition-all active:scale-95"
            style={{ background: "var(--gradient-primary)" }}
          >
            Continue →
          </button>
        </form>
      )}

      {(step === "pin" || step === "confirm") && (
        <div className="flex flex-col items-center gap-8 w-full max-w-xs mx-auto">
          <div className="flex gap-4" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  i < currentPin.length ? "bg-primary border-primary scale-110" : "bg-transparent border-muted-foreground"
                }`}
              />
            ))}
          </div>

          {error && <p className="text-destructive text-sm -mt-4">{error}</p>}

          <div className="grid grid-cols-3 gap-4 w-full">
            {pinKeys.map((key, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => key && handlePinKey(key)}
                disabled={!key}
                className={`h-16 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                  key === "⌫"
                    ? "bg-muted text-foreground"
                    : key === ""
                      ? "invisible"
                      : "bg-card border border-border shadow-sm hover:bg-muted"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="w-6 h-1.5 rounded-full bg-primary" />
            <div className={`w-6 h-1.5 rounded-full ${step === "confirm" ? "bg-primary" : "bg-muted"}`} />
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center mt-auto pt-8">SikaTrack · Built for Ghana 🇬🇭</p>
    </div>
  );
}
