import {
  ArrowLeftRight,
  Building,
  Bus,
  Calculator,
  Calendar,
  CalendarCheck,
  ChartPie,
  CircleDot,
  Clock,
  Coins,
  CreditCard,
  Divide,
  Egg,
  FileText,
  Gauge,
  Globe,
  GraduationCap,
  HandCoins,
  Hash,
  HeartPulse,
  Hourglass,
  House,
  IdCard,
  Layers,
  LifeBuoy,
  Lightbulb,
  ListChecks,
  Lock,
  Network,
  Package,
  Percent,
  PiggyBank,
  Receipt,
  Repeat,
  Scale,
  Search,
  Send,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sprout,
  Target,
  Ticket,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES } from "@/data/categories";
import { cn } from "@/lib/format";
import type { CardTone, CategoryId } from "@/lib/types";

/** Static map (tree-shakeable) from icon names used in data files to components. */
const ICONS: Record<string, LucideIcon> = {
  gauge: Gauge,
  globe: Globe,
  "list-checks": ListChecks,
  "credit-card": CreditCard,
  "calendar-check": CalendarCheck,
  calendar: Calendar,
  "id-card": IdCard,
  building: Building,
  "file-text": FileText,
  wallet: Wallet,
  shield: Shield,
  "shield-check": ShieldCheck,
  search: Search,
  scale: Scale,
  calculator: Calculator,
  send: Send,
  receipt: Receipt,
  hash: Hash,
  "triangle-alert": TriangleAlert,
  percent: Percent,
  layers: Layers,
  coins: Coins,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  package: Package,
  egg: Egg,
  network: Network,
  "pie-chart": ChartPie,
  sprout: Sprout,
  divide: Divide,
  clock: Clock,
  lock: Lock,
  hourglass: Hourglass,
  "life-buoy": LifeBuoy,
  "piggy-bank": PiggyBank,
  "hand-coins": HandCoins,
  lightbulb: Lightbulb,
  target: Target,
  // categories
  home: House,
  "shopping-basket": ShoppingBasket,
  utensils: Utensils,
  bus: Bus,
  smartphone: Smartphone,
  repeat: Repeat,
  "graduation-cap": GraduationCap,
  "shopping-bag": ShoppingBag,
  ticket: Ticket,
  "heart-pulse": HeartPulse,
  "arrow-left-right": ArrowLeftRight,
  "circle-dot": CircleDot,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name] ?? Lightbulb;
  return <C className={className} aria-hidden />;
}

export function CategoryIcon({ category, className }: { category: CategoryId; className?: string }) {
  const meta = CATEGORIES[category];
  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground", className)}>
      <Icon name={meta.icon} className="size-[18px]" />
    </span>
  );
}

export const TONE_BG: Record<CardTone, string> = {
  green: "bg-positive-soft text-primary",
  yellow: "bg-practice-soft text-practice",
  sky: "bg-secondary text-secondary-foreground",
  peach: "bg-practice-soft text-practice",
  plum: "bg-positive-soft text-primary",
};
