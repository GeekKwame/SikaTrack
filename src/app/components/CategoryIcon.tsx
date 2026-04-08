import { UtensilsCrossed, Car, Zap, Tv2, Smartphone, PiggyBank, MoreHorizontal } from "lucide-react";
import type { Category } from "../context/TransactionContext";

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  Transport: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  Bills: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  Entertainment: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  "MoMo Transfer": "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
  Savings: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  Other: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export const CATEGORY_HEX: Record<Category, string> = {
  Food: "#f97316",
  Transport: "#3b82f6",
  Bills: "#a855f7",
  Entertainment: "#ec4899",
  "MoMo Transfer": "#eab308",
  Savings: "#06b6d4",
  Other: "#6b7280",
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  Food: "🍲",
  Transport: "🚗",
  Bills: "⚡",
  Entertainment: "🎬",
  "MoMo Transfer": "📱",
  Savings: "🐖",
  Other: "💼",
};

interface CategoryIconProps {
  category: Category;
  size?: number;
}

export function CategoryIcon({ category, size = 20 }: CategoryIconProps) {
  const props = { size, strokeWidth: 2 };
  switch (category) {
    case "Food":          return <UtensilsCrossed {...props} />;
    case "Transport":     return <Car {...props} />;
    case "Bills":         return <Zap {...props} />;
    case "Entertainment": return <Tv2 {...props} />;
    case "MoMo Transfer": return <Smartphone {...props} />;
    case "Savings":       return <PiggyBank {...props} />;
    default:              return <MoreHorizontal {...props} />;
  }
}
