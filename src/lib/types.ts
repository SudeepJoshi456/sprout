/**
 * Shared domain types. Imported by both server routes and client components,
 * so this file must stay free of runtime dependencies.
 *
 * Money convention: every `*Cents` field is an integer in minor units (cents).
 * Practice money uses the same convention: $1 of pretend value, with no cash value.
 */

export type IdType = "ssn" | "itin" | "passport";
export type VisaType = "F-1" | "J-1" | "H-1B" | "other";
export type Reason = "new_to_us" | "new_to_money" | "learn_investing";
export type Goal = "emergency_fund" | "send_home" | "start_investing" | "understand_credit";
export type BudgetPeriod = "monthly" | "semester";

export type CategoryId =
  | "rent"
  | "groceries"
  | "dining"
  | "transport"
  | "phone"
  | "subscriptions"
  | "tuition"
  | "shopping"
  | "entertainment"
  | "health"
  | "income"
  | "transfer"
  | "other";

export interface Profile {
  id: string;
  fullName: string;
  preferredName: string;
  age: number;
  bio: string;
  idType: IdType | null;
  /** Only the last 4 characters are ever stored, e.g. "•••• 4821". */
  idMasked: string | null;
  idCountry: string | null;
  visaType: VisaType | null;
  schoolEmail: string | null;
  verified: boolean;
  reasons: Reason[];
  goal: Goal | null;
  /** ISO 4217 code for the "≈ home currency" display, e.g. "NPR". */
  homeCurrency: string | null;
  walletAddress: string | null;
  onboarded: boolean;
}

export interface Settings {
  showHomeCurrency: boolean;
  notifications: {
    bills: boolean;
    coach: boolean;
    learning: boolean;
    transfers: boolean;
  };
}

export interface Account {
  name: string;
  /** null until the first deposit opens the account. */
  lastFour: string | null;
  balanceCents: number;
  currency: "USD";
}

export interface Transaction {
  id: string;
  /** ISO timestamp */
  date: string;
  description: string;
  amountCents: number; // negative = money out
  category: CategoryId;
  transferId?: string;
  /** Added by hand (cash, card or anything outside the wallet), so it can be deleted. */
  manual?: boolean;
}

export interface BudgetCategory {
  id: CategoryId;
  monthlyLimitCents: number;
  /** Essentials are protected from "safe to spend". */
  essential: boolean;
}

export interface Semester {
  name: string;
  start: string; // ISO date
  end: string; // ISO date
}

export interface Budget {
  period: BudgetPeriod;
  semester: Semester;
  categories: BudgetCategory[];
}

export interface Bill {
  id: string;
  name: string;
  category: CategoryId;
  amountCents: number;
  dueDate: string; // ISO date
  /** Money protected for this bill. Subtracted from "safe to spend" until paid. */
  setAsideCents: number;
  paid: boolean;
  paidAt?: string;
  payeeContactId?: string;
}

export interface Contact {
  id: string;
  name: string;
  relationship: string;
  walletAddress: string;
  assetCode: string;
}

export interface MoneyAmount {
  /** Minor units (scale 2). */
  value: number;
  currency: string;
}

export type TransferStatus = "completed" | "pending" | "failed";

/**
 * One Open Payments call made while moving money. Shown on the receipt under
 * "How this payment moved" so the Interledger flow is visible and explainable.
 */
export interface PaymentStep {
  /** Stable id: wallets | incoming-grant | incoming-payment | quote-grant | quote | outgoing-grant | outgoing-payment */
  id: string;
  label: string;
  /** Plain-language explanation plus the key value (URL, amount, id). */
  detail: string;
  /** Which server handled it, e.g. "auth.interledger-test.dev". */
  server?: string;
  ms: number;
  simulated: boolean;
}

export interface Transfer {
  id: string;
  direction: "in" | "out";
  status: TransferStatus;
  counterpartyName: string;
  counterpartyWallet: string;
  /** What left (or arrived in) the user's account, in USD. */
  debit: MoneyAmount;
  /** What the other side received (out) or originally sent (in). */
  counterpart: MoneyAmount;
  feeCents: number;
  /** Units of `counterpart.currency` per 1 USD; null when same currency. */
  rate: number | null;
  createdAt: string;
  completedAt: string | null;
  idempotencyKey: string;
  mode: PaymentsMode;
  note?: string;
  billId?: string;
  /** Open Payments outgoing payment URL in interledger mode. */
  externalId?: string;
  steps?: PaymentStep[];
}

export interface PaymentRequest {
  id: string;
  amountCents: number;
  note: string;
  createdAt: string;
  url: string;
  /** Live mode: the real Open Payments incoming payment that collects this request. */
  incomingPaymentUrl?: string;
  receivedCents?: number;
  paidAt?: string;
}

/** Live-mode bookkeeping for money arriving at the user's real wallet. */
export interface IncomingSync {
  /** Only incoming payments created after this are imported (avoids replaying wallet history). */
  since: string;
  /** Incoming payment URL → USD cents already credited. */
  credited: Record<string, number>;
}

export interface Holding {
  symbol: string;
  shares: number;
  costBasisCents: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  amountCents: number;
  shares: number;
  price: number;
  at: string;
}

export interface Portfolio {
  cashCents: number;
  holdings: Holding[];
  trades: Trade[];
}

export interface LessonCompletion {
  completedAt: string;
  score: number;
  total: number;
}

export interface Learning {
  completed: Record<string, LessonCompletion>;
  /** Walkthrough ids the user has finished. */
  walkthroughs: string[];
}

export interface CoachMessage {
  id: string;
  kind: "trade" | "daily" | "budget" | "welcome";
  title: string;
  body: string;
  lessonId?: string;
  createdAt: string;
  dismissed: boolean;
  source: "rule" | "ai";
}

export interface DemoFlags {
  failNextSend: boolean;
}

export interface UserState {
  profile: Profile;
  settings: Settings;
  account: Account;
  transactions: Transaction[];
  budget: Budget;
  bills: Bill[];
  contacts: Contact[];
  transfers: Transfer[];
  requests: PaymentRequest[];
  incoming?: IncomingSync;
  portfolio: Portfolio;
  learning: Learning;
  coach: CoachMessage[];
  demo: DemoFlags;
  /** Preview of the planned bank link (Plaid in production). Simulated: no real bank data. */
  bank?: LinkedBank;
}

export interface LinkedBank {
  institution: string;
  accountName: string;
  mask: string;
  linkedAt: string;
  /** Simulated bank transfers shown in the preview (no money moves). */
  transfers: { id: string; direction: "in" | "out"; amountCents: number; at: string }[];
}

export type PaymentsMode = "mock" | "interledger";
export type AiMode = "mock" | "live";
export type MarketMode = "snapshot" | "live";

/** The person's connected wallet, as the browser sees it (never includes tokens). */
export interface ConnectedWallet {
  url: string;
  assetCode: string;
  /** Spending cap they approved, in the wallet's minor units (scale 2). */
  capMinor: number;
  linkedAt: string;
}

export interface WalletActivityItem {
  id: string;
  direction: "in" | "out";
  /** Minor units (scale 2) in `currency`, as the wallet reported it. */
  amount: number;
  currency: string;
  at: string;
  description: string | null;
  counterparty: string | null;
  /** Who it was to or from, when Sprout knows (e.g. "Maya Torres (@maya)"). */
  counterpartyName?: string | null;
  /** The note typed when sending, if any. */
  note?: string | null;
  status: "completed" | "pending" | "failed";
}

/** Real payments in and out of the connected wallet. Open Payments has no balance endpoint. */
export type WalletActivity =
  | { connected: false }
  | {
      connected: true;
      wallet: string;
      currency: string;
      receivedMinor: number;
      sentMinor: number;
      capMinor: number;
      items: WalletActivityItem[];
      /** One of the two lists couldn't be read right now. */
      partial: boolean;
    };

export interface ModeStatus {
  payments: PaymentsMode;
  /** Live only when the user's wallet is the real one we hold keys for. */
  receiving?: PaymentsMode;
  ai: AiMode;
  market: MarketMode;
}

// ---- Market data -------------------------------------------------------

export interface PricePoint {
  t: number; // epoch ms
  c: number; // close
}

export interface SymbolSeries {
  price: number;
  prevClose: number;
  high52: number | null;
  low52: number | null;
  daily: PricePoint[];
  intraday: PricePoint[];
}

export interface MarketSnapshot {
  asOf: number;
  source: string;
  symbols: Record<string, SymbolSeries>;
}

export interface Quote {
  symbol: string;
  name: string;
  kind: "etf" | "stock";
  sector: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  high52: number | null;
  low52: number | null;
  asOf: number;
  source: string;
  /** "live" means a fresh API price (still delayed ~15 min); "snapshot" is bundled data. */
  freshness: "live" | "snapshot";
}

export type ChartRange = "1D" | "1W" | "1M" | "1Y";

// ---- Payments ------------------------------------------------------------

export interface WalletInfo {
  url: string;
  assetCode: string;
  publicName: string | null;
}

export interface PaymentQuote {
  id: string;
  receiver: WalletInfo;
  receiverName: string;
  debitCents: number;
  feeCents: number;
  receive: MoneyAmount;
  rate: number | null;
  expiresAt: string;
  mode: PaymentsMode;
  /** Open Payments quote URL (interledger mode only). */
  externalQuoteId?: string;
  /** Wallet the payment debits (interledger mode only). */
  senderWallet?: string;
  /** Incoming payment the quote pays into (interledger mode only). */
  incomingPaymentUrl?: string;
  /** HMAC over the fields above so the client can't tamper with a quote. */
  signature: string;
}

// ---- Learning ------------------------------------------------------------

export type CardTone = "green" | "yellow" | "sky" | "peach" | "plum";

export interface LessonCard {
  title: string;
  body: string;
  icon: string; // lucide icon name from the allowlist in components/lesson-icon.tsx
  tone: CardTone;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface LessonAction {
  label: string;
  href: string;
}

export interface LessonContent {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  cards: LessonCard[];
  quiz: QuizQuestion[];
  action: LessonAction;
  source: "prewritten" | "ai";
}

export interface LessonSummary {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  track: "newcomer" | "money" | "investing" | "credit";
  reason: string | null;
  completed: boolean;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}
