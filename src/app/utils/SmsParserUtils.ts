import { Category } from "../context/TransactionContext";

export interface ParsedSms {
  amount: number;
  type: "income" | "expense";
  category: Category;
  notes: string;
}

/**
 * Parses Ghana Mobile Money (MTN MoMo, Vodafone Cash, AirtelTigo Money) SMS messages
 * into SikaTrack transactions.
 */
export function parseMoMoSms(sms: string): ParsedSms | null {
  const raw = sms; // Keep original for display
  const text = sms.toLowerCase();

  // ── Amount extraction ──────────────────────────────────────────────────────
  // Handles: GHS 50.00 | GHS50.00 | GHs50 | GH¢50 | GHC50 | 50 GHS | Amount: 50.00
  const amountPatterns: RegExp[] = [
    /ghs\s*(\d[\d,]*(?:\.\d{1,2})?)/i,   // GHS 50.00 or GHS50.00
    /gh[c¢₵]\s*(\d[\d,]*(?:\.\d{1,2})?)/i, // GHC, GH¢, GH₵
    /(\d[\d,]*(?:\.\d{1,2})?)\s*ghs/i,   // 50.00 GHS (suffix)
    /amount[:\s]+(?:ghs\s*)?(\d[\d,]*(?:\.\d{1,2})?)/i,  // Amount: 50.00
    /(?:paid|received|sent|transferred|withdrawn|deposited|cash\s*out|cash\s*in)[^\d]*(\d[\d,]*(?:\.\d{1,2})?)/i,
  ];

  let amount: number | null = null;
  for (const pattern of amountPatterns) {
    const m = text.match(pattern);
    if (m) {
      const cleaned = m[1].replace(/,/g, ""); // Remove thousands separators
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  if (amount === null) return null;

  // ── Type inference ────────────────────────────────────────────────────────
  let type: "income" | "expense" = "expense"; // default

  const incomeKeywords = [
    "received", "credited", "deposited", "cash in", "cash-in",
    "you have received", "has been credited", "payment received", "transfer received",
    "momo received", "incoming", "you received",
  ];
  const expenseKeywords = [
    "payment made", "paid", "sent", "cash out", "cash-out", "withdrawn",
    "withdrawal", "deducted", "you have sent", "you sent", "you paid",
    "payment successful", "transfer to", "transferred to",
    "you have made a payment", "merchant payment",
  ];

  for (const kw of incomeKeywords) {
    if (text.includes(kw)) { type = "income"; break; }
  }
  for (const kw of expenseKeywords) {
    if (text.includes(kw)) { type = "expense"; break; }
  }

  // ── Category inference ────────────────────────────────────────────────────
  let category: Category = "MoMo Transfer";
  let notes = type === "income" ? "MoMo Received" : "MoMo Transfer Sent";

  // Bills / Utilities
  if (text.includes("airtime") || text.includes("bundle") || text.includes("data purchase") || text.includes("internet")) {
    category = "Bills";
    notes = "Airtime / Data Purchase";
  } else if (
    text.includes("ecg") || text.includes("electricity") ||
    text.includes("gwcl") || text.includes("water") ||
    text.includes("dstv") || text.includes("gotv") ||
    text.includes("paying bills") || text.includes("bill payment")
  ) {
    category = "Bills";
    notes = "Utility Bill Payment";
  }
  // Transport
  else if (
    text.includes("uber") || text.includes("bolt") || text.includes("yango") ||
    text.includes("indriver") || text.includes("okayafrica") || text.includes("ride")
  ) {
    category = "Transport";
    notes = "Ride Hailing";
  }
  // Food
  else if (
    text.includes("food") || text.includes("restaurant") ||
    text.includes("kfc") || text.includes("papaye") || text.includes("chicken republic") ||
    text.includes("pizza") || text.includes("bistro") || text.includes("café") ||
    text.includes("canteen") || text.includes("chop bar") || text.includes("jumia food") ||
    text.includes("glovo")
  ) {
    category = "Food";
    notes = "Food Purchase";
  }
  // Entertainment
  else if (
    text.includes("cinema") || text.includes("movie") || text.includes("netflix") ||
    text.includes("showmax") || text.includes("gaming") || text.includes("event") ||
    text.includes("ticket")
  ) {
    category = "Entertainment";
    notes = "Entertainment";
  }
  // Savings
  else if (text.includes("susu") || text.includes("savings account") || text.includes("momo savings")) {
    category = "Savings";
    notes = "Savings Contribution";
  }
  // Transfer sent
  else if ((text.includes("sent") || text.includes("transfer")) && type === "expense") {
    // Try to extract recipient name (common in MTN MoMo format: "sent to John Mensah")
    const recipientMatch = raw.match(/(?:sent to|transfer to|payment to)\s+([A-Z][A-Za-z\s]{2,30}?)(?:\s*[-.]|\s*on|\s*\d|$)/);
    category = "MoMo Transfer";
    notes = recipientMatch ? `Transfer to ${recipientMatch[1].trim()}` : "MoMo Transfer Sent";
  }
  // Received
  else if (type === "income") {
    const senderMatch = raw.match(/(?:from|received from)\s+([A-Z][A-Za-z\s]{2,30}?)(?:\s*[-.]|\s*on|\s*\d|$)/);
    category = "MoMo Transfer";
    notes = senderMatch ? `Received from ${senderMatch[1].trim()}` : "MoMo Received";
  }

  return { amount, type, category, notes };
}
