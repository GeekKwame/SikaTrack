import { Category } from "../context/TransactionContext";

export interface ParsedSms {
  amount: number;
  type: "income" | "expense";
  category: Category;
  notes: string;
}

export function parseMoMoSms(sms: string): ParsedSms | null {
  const text = sms.toLowerCase();

  // Very basic regex to look for GHS or GHS followed by amount
  // E.g., GHS 50.00, GHS50, 50GHS
  const amountMatch = text.match(/ghs\s*(\d+(?:\.\d{1,2})?)/i) || text.match(/(?:amount|paid|received|sent).*?(\d+(?:\.\d{1,2})?)/i);
  
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1]);
  if (isNaN(amount) || amount <= 0) return null;

  let type: "income" | "expense" = "expense";
  let category: Category = "Other";
  let notes = "Imported from MoMo SMS";

  // Infer Type
  if (text.includes("received") || text.includes("credited") || text.includes("deposited") || text.includes("cash in")) {
    type = "income";
  } else if (text.includes("payment made") || text.includes("paid") || text.includes("sent") || text.includes("cash out",) || text.includes("withdrawn")) {
    type = "expense";
  }

  // Infer Category
  if (text.includes("airtime") || text.includes("bundle") || text.includes("data")) {
    category = "Bills";
    notes = "Airtime/Data Purchase";
  } else if (text.includes("ecg") || text.includes("gwcl") || text.includes("bill")) {
    category = "Bills";
    notes = "Utility Bill";
  } else if (text.includes("uber") || text.includes("bolt") || text.includes("yango")) {
    category = "Transport";
    notes = "Ride Hailing";
  } else if (text.includes("food") || text.includes("restaurant") || text.includes("kfc") || text.includes("papaye")) {
    category = "Food";
    notes = "Food Purchase";
  } else if (text.includes("sent") && type === "expense") {
    category = "MoMo Transfer";
    notes = "MoMo Transfer Sent";
  }

  return { amount, type, category, notes };
}
