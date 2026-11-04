import type { CategoryId } from "@/lib/types";

/** Display metadata for spending categories. `icon` names map in components/category-icon.tsx. */
export const CATEGORIES: Record<CategoryId, { label: string; icon: string; color: string }> = {
  rent: { label: "Rent", icon: "home", color: "var(--chart-1)" },
  groceries: { label: "Groceries", icon: "shopping-basket", color: "var(--chart-1)" },
  dining: { label: "Dining out", icon: "utensils", color: "var(--chart-3)" },
  transport: { label: "Transport", icon: "bus", color: "var(--chart-4)" },
  phone: { label: "Phone", icon: "smartphone", color: "var(--chart-4)" },
  subscriptions: { label: "Subscriptions", icon: "repeat", color: "var(--chart-5)" },
  tuition: { label: "Tuition", icon: "graduation-cap", color: "var(--chart-2)" },
  shopping: { label: "Shopping", icon: "shopping-bag", color: "var(--chart-3)" },
  entertainment: { label: "Fun", icon: "ticket", color: "var(--chart-5)" },
  health: { label: "Health", icon: "heart-pulse", color: "var(--chart-4)" },
  income: { label: "Income", icon: "wallet", color: "var(--chart-1)" },
  transfer: { label: "Transfers", icon: "arrow-left-right", color: "var(--chart-4)" },
  other: { label: "Other", icon: "circle-dot", color: "var(--chart-2)" },
};

/** Categories a user can pick when re-categorizing a card purchase. */
export const EDITABLE_CATEGORIES: CategoryId[] = [
  "groceries",
  "dining",
  "transport",
  "shopping",
  "entertainment",
  "subscriptions",
  "health",
  "phone",
  "rent",
  "tuition",
  "other",
];
