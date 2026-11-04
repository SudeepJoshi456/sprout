/**
 * Demo seed data. Fake people only.
 *
 * Dates are generated relative to "now" so the demo always looks current;
 * transactions span the last 60 days. Practice trades for Marcus are priced
 * from the bundled market snapshot so his chart is real.
 */
import snapshot from "@/data/market-snapshot.json";
import { FX_PER_USD } from "@/data/fx";
import type {
  Bill,
  BudgetCategory,
  CategoryId,
  Contact,
  MarketSnapshot,
  PersonaId,
  Semester,
  SessionDb,
  Trade,
  Transaction,
  Transfer,
  UserState,
} from "@/lib/types";
import { STARTING_SEEDS_CENTS, applyTrade, roundShares } from "@/lib/portfolio";

const market = snapshot as unknown as MarketSnapshot;

export interface SeedOptions {
  now?: Date;
  /** Override seeded wallet addresses with real test-network wallets. */
  wallets?: { sudeep?: string; marcus?: string; roommate?: string; family?: string };
}

// Small deterministic PRNG so every reset produces the same demo.
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daysAgo(now: Date, days: number, hour = 12, minute = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** The `day`th of the month, `offset` months from now's month. */
function monthDay(now: Date, offset: number, day: number) {
  return new Date(now.getFullYear(), now.getMonth() + offset, day, 9, 0, 0);
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function currentSemester(now: Date): Semester {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m >= 7) return { name: `Fall ${y}`, start: `${y}-08-24`, end: `${y}-12-18` };
  if (m >= 4) return { name: `Summer ${y}`, start: `${y}-05-18`, end: `${y}-08-14` };
  return { name: `Spring ${y}`, start: `${y}-01-12`, end: `${y}-05-08` };
}

let idCounter = 0;
const id = (prefix: string) => `${prefix}_${(++idCounter).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Spreads `count` card purchases from `merchants` across the last 60 days. */
function purchases(
  now: Date,
  rand: () => number,
  category: CategoryId,
  merchants: string[],
  count: number,
  minCents: number,
  maxCents: number,
): Transaction[] {
  return Array.from({ length: count }, (_, i) => {
    const day = Math.floor(((i + rand()) / count) * 58) + 1;
    return {
      id: id("tx"),
      date: daysAgo(now, day, 9 + Math.floor(rand() * 11), Math.floor(rand() * 59)).toISOString(),
      description: merchants[Math.floor(rand() * merchants.length)],
      amountCents: -Math.round(minCents + rand() * (maxCents - minCents)),
      category,
    };
  });
}

function fixed(date: Date, description: string, amountCents: number, category: CategoryId, transferId?: string): Transaction {
  return { id: id("tx"), date: date.toISOString(), description, amountCents, category, transferId };
}

/** Only keep dated items inside the 60-day window (and not in the future). */
function within60(now: Date, txs: Transaction[]) {
  const from = daysAgo(now, 60, 0).getTime();
  return txs.filter((t) => {
    const ts = new Date(t.date).getTime();
    return ts >= from && ts <= now.getTime();
  });
}

function homeTransfer(now: Date, days: number, nprMinor: number, wallet: string): Transfer {
  const rate = FX_PER_USD.NPR;
  const usdCents = Math.round(nprMinor / rate);
  const at = daysAgo(now, days, 7, 42);
  return {
    id: id("tr"),
    direction: "in",
    status: "completed",
    counterpartyName: "Sita Joshi (Mom)",
    counterpartyWallet: wallet,
    debit: { value: usdCents, currency: "USD" },
    counterpart: { value: nprMinor, currency: "NPR" },
    feeCents: 0,
    rate,
    createdAt: at.toISOString(),
    completedAt: new Date(at.getTime() + 4000).toISOString(),
    idempotencyKey: id("idem"),
    mode: "mock",
    note: "For the semester. Eat well! ❤️",
  };
}

// ---------------------------------------------------------------------------

function seedSudeep(now: Date, opts: SeedOptions): UserState {
  const rand = rng(2307);
  const roommateWallet = opts.wallets?.roommate || "https://ilp.interledger-test.dev/ana-lopez";
  const familyWallet = opts.wallets?.family || "https://ilp.interledger-test.dev/sita-joshi";

  const contacts: Contact[] = [
    { id: "c_ana", name: "Ana López", relationship: "Roommate", walletAddress: roommateWallet, assetCode: "USD" },
    { id: "c_mom", name: "Sita Joshi (Mom)", relationship: "Family · Nepal", walletAddress: familyWallet, assetCode: "NPR" },
    { id: "c_dan", name: "Daniel Kim", relationship: "Classmate", walletAddress: "https://ilp.interledger-test.dev/daniel-kim", assetCode: "USD" },
  ];

  const home1 = homeTransfer(now, 56, 30_000_000, familyWallet); // NPR 3,00,000
  const home2 = homeTransfer(now, 3, 48_000_000, familyWallet); // NPR 4,80,000

  const rentOut = (offset: number): [Transaction, Transfer] => {
    const at = monthDay(now, offset, 1);
    const tr: Transfer = {
      id: id("tr"),
      direction: "out",
      status: "completed",
      counterpartyName: "Ana López",
      counterpartyWallet: roommateWallet,
      debit: { value: 95_000, currency: "USD" },
      counterpart: { value: 95_000, currency: "USD" },
      feeCents: 0,
      rate: null,
      createdAt: at.toISOString(),
      completedAt: at.toISOString(),
      idempotencyKey: id("idem"),
      mode: "mock",
      note: "Rent",
    };
    return [fixed(at, "Rent to Ana López", -95_000, "rent", tr.id), tr];
  };
  const [rentTx1, rentTr1] = rentOut(-1);
  const [rentTx2, rentTr2] = rentOut(0);

  const txs: Transaction[] = within60(now, [
    fixed(new Date(home1.createdAt), "From Sita Joshi (Mom)", home1.debit.value, "income", home1.id),
    fixed(new Date(home2.createdAt), "From Sita Joshi (Mom)", home2.debit.value, "income", home2.id),
    rentTx1,
    rentTx2,
    fixed(monthDay(now, 0, 15), "Tuition installment 2 of 4", -120_000, "tuition"),
    fixed(monthDay(now, -1, 5), "Mint Mobile", -3_000, "phone"),
    fixed(monthDay(now, 0, 5), "Mint Mobile", -3_000, "phone"),
    fixed(monthDay(now, -1, 8), "Internet (split with Ana)", -2_500, "rent"),
    fixed(monthDay(now, 0, 8), "Internet (split with Ana)", -2_500, "rent"),
    fixed(monthDay(now, -1, 12), "Spotify Student", -599, "subscriptions"),
    fixed(monthDay(now, 0, 12), "Spotify Student", -599, "subscriptions"),
    fixed(monthDay(now, -1, 20), "iCloud+ 50GB", -99, "subscriptions"),
    fixed(monthDay(now, 0, 20), "iCloud+ 50GB", -99, "subscriptions"),
    ...[4, 18, 32, 46].map((d) => fixed(daysAgo(now, d, 17), "University Library · payroll", 62_000, "income")),
    ...purchases(now, rand, "groceries", ["Trader Joe's", "Himalayan Grocery", "Aldi", "Costco"], 10, 1_800, 7_400),
    ...purchases(now, rand, "dining", ["Chipotle", "Campus Café", "Kung Fu Tea", "Sweetgreen", "Halal Guys"], 7, 650, 2_400),
    ...purchases(now, rand, "transport", ["Uber", "Metro card reload", "Lyft"], 4, 900, 2_600),
    ...purchases(now, rand, "shopping", ["Target", "Amazon", "IKEA"], 3, 1_500, 5_200),
  ]).sort((a, b) => b.date.localeCompare(a.date));

  const categories: BudgetCategory[] = [
    { id: "groceries", monthlyLimitCents: 32_000, essential: true },
    { id: "transport", monthlyLimitCents: 7_000, essential: true },
    { id: "dining", monthlyLimitCents: 9_000, essential: false },
    { id: "shopping", monthlyLimitCents: 8_000, essential: false },
    { id: "subscriptions", monthlyLimitCents: 1_000, essential: false },
    { id: "entertainment", monthlyLimitCents: 5_000, essential: false },
  ];

  const bills: Bill[] = [
    { id: "b_rent", name: "Rent (to Ana)", category: "rent", amountCents: 95_000, dueDate: isoDate(monthDay(now, 1, 1)), setAsideCents: 95_000, paid: false, payeeContactId: "c_ana" },
    { id: "b_phone", name: "Mint Mobile", category: "phone", amountCents: 3_000, dueDate: isoDate(monthDay(now, 1, 5)), setAsideCents: 3_000, paid: false },
    { id: "b_internet", name: "Internet (split)", category: "rent", amountCents: 2_500, dueDate: isoDate(monthDay(now, 1, 8)), setAsideCents: 2_500, paid: false, payeeContactId: "c_ana" },
    { id: "b_tuition", name: "Tuition installment 3 of 4", category: "tuition", amountCents: 120_000, dueDate: isoDate(monthDay(now, 1, 15)), setAsideCents: 80_000, paid: false },
  ];

  return {
    profile: {
      id: "sudeep",
      fullName: "Sudeep Joshi",
      preferredName: "Sudeep",
      age: 23,
      bio: "Master's student in Data Science · F-1 visa",
      idType: null,
      idMasked: null,
      idCountry: null,
      visaType: null,
      schoolEmail: null,
      verified: false,
      reasons: [],
      goal: null,
      homeCurrency: "NPR",
      walletAddress: opts.wallets?.sudeep || "https://ilp.interledger-test.dev/sudeep-sprout",
      onboarded: false,
    },
    settings: { showHomeCurrency: true, notifications: { bills: true, coach: true, learning: true, transfers: true } },
    account: { name: "Everyday checking", lastFour: "2048", balanceCents: 486_025, currency: "USD" },
    transactions: txs,
    budget: { period: "semester", semester: currentSemester(now), categories },
    bills,
    contacts,
    transfers: [home2, rentTr2, rentTr1, home1].filter((t) => txs.some((x) => x.transferId === t.id)),
    requests: [],
    portfolio: { cashCents: STARTING_SEEDS_CENTS, holdings: [], trades: [] },
    learning: { completed: {}, walkthroughs: [] },
    coach: [
      {
        id: "coach_welcome_sudeep",
        kind: "welcome",
        title: "Start with how US credit works",
        body: "Most people who are new to the US start with no credit score, not a bad one. This 2-minute lesson explains how to build one safely.",
        lessonId: "credit-new",
        createdAt: now.toISOString(),
        dismissed: false,
        source: "rule",
      },
    ],
    demo: { failNextSend: false },
  };
}

function seedMarcus(now: Date, opts: SeedOptions): UserState {
  const rand = rng(1984);
  const contacts: Contact[] = [
    { id: "c_jordan", name: "Jordan Reyes", relationship: "Friend", walletAddress: "https://ilp.interledger-test.dev/jordan-reyes", assetCode: "USD" },
    { id: "c_landlord", name: "Elm St. Apartments", relationship: "Landlord", walletAddress: "https://ilp.interledger-test.dev/elm-street", assetCode: "USD" },
  ];

  const jordanIn: Transfer = {
    id: id("tr"),
    direction: "in",
    status: "completed",
    counterpartyName: "Jordan Reyes",
    counterpartyWallet: contacts[0].walletAddress,
    debit: { value: 2_500, currency: "USD" },
    counterpart: { value: 2_500, currency: "USD" },
    feeCents: 0,
    rate: null,
    createdAt: daysAgo(now, 6, 21, 10).toISOString(),
    completedAt: daysAgo(now, 6, 21, 10).toISOString(),
    idempotencyKey: id("idem"),
    mode: "mock",
    note: "Concert tickets 🎟️",
  };

  const txs: Transaction[] = within60(now, [
    fixed(new Date(jordanIn.createdAt), "From Jordan Reyes", 2_500, "transfer", jordanIn.id),
    fixed(monthDay(now, -1, 1), "Elm St. Apartments", -60_000, "rent"),
    fixed(monthDay(now, 0, 1), "Elm St. Apartments", -60_000, "rent"),
    fixed(monthDay(now, -1, 12), "Visible Wireless", -4_500, "phone"),
    fixed(monthDay(now, 0, 12), "Visible Wireless", -4_500, "phone"),
    fixed(monthDay(now, -1, 9), "Spotify Premium", -1_199, "subscriptions"),
    fixed(monthDay(now, 0, 9), "Spotify Premium", -1_199, "subscriptions"),
    fixed(monthDay(now, -1, 14), "Netflix", -799, "subscriptions"),
    fixed(monthDay(now, 0, 14), "Netflix", -799, "subscriptions"),
    ...[3, 17, 31, 45, 59].map((d) => fixed(daysAgo(now, d, 16), "Campus Rec Center · payroll", 41_000, "income")),
    ...purchases(now, rand, "groceries", ["Kroger", "Walmart", "Aldi"], 7, 2_200, 6_800),
    ...purchases(now, rand, "dining", ["Chick-fil-A", "Domino's", "Starbucks", "Raising Cane's", "Taco Bell"], 9, 700, 2_900),
    ...purchases(now, rand, "transport", ["Shell", "Exxon", "Campus parking"], 4, 2_500, 4_200),
    ...purchases(now, rand, "entertainment", ["AMC Theatres", "Steam", "Bowling night"], 3, 1_200, 3_500),
    ...purchases(now, rand, "shopping", ["Nike", "Amazon", "Target"], 2, 2_000, 6_500),
  ]).sort((a, b) => b.date.localeCompare(a.date));

  const categories: BudgetCategory[] = [
    { id: "groceries", monthlyLimitCents: 25_000, essential: true },
    { id: "transport", monthlyLimitCents: 8_000, essential: true },
    { id: "dining", monthlyLimitCents: 10_000, essential: false },
    { id: "entertainment", monthlyLimitCents: 6_000, essential: false },
    { id: "shopping", monthlyLimitCents: 8_000, essential: false },
    { id: "subscriptions", monthlyLimitCents: 2_500, essential: false },
  ];

  const bills: Bill[] = [
    { id: "b_rent", name: "Elm St. Apartments", category: "rent", amountCents: 60_000, dueDate: isoDate(monthDay(now, 1, 1)), setAsideCents: 60_000, paid: false, payeeContactId: "c_landlord" },
    { id: "b_spotify", name: "Spotify Premium", category: "subscriptions", amountCents: 1_199, dueDate: isoDate(monthDay(now, 1, 9)), setAsideCents: 1_199, paid: false },
    { id: "b_phone", name: "Visible Wireless", category: "phone", amountCents: 4_500, dueDate: isoDate(monthDay(now, 1, 12)), setAsideCents: 0, paid: false },
  ];

  // Practice trades ~15 trading days before the snapshot's last bar.
  const tradeAt = (symbol: string, barsBack: number) => {
    const series = market.symbols[symbol].daily;
    const bar = series[Math.max(0, series.length - 1 - barsBack)];
    return { price: bar.c, at: new Date(bar.t + 15 * 3600_000).toISOString() };
  };
  let portfolio = { cashCents: STARTING_SEEDS_CENTS, holdings: [], trades: [] } as UserState["portfolio"];
  const seedTrade = (symbol: string, amountCents: number, barsBack: number) => {
    const { price, at } = tradeAt(symbol, barsBack);
    const t: Trade = { id: id("trd"), symbol, side: "buy", amountCents, shares: roundShares(amountCents / 100 / price), price, at };
    portfolio = applyTrade(portfolio, t);
  };
  seedTrade("AAPL", 200_000, 16);
  seedTrade("VOO", 150_000, 15);

  const done = (days: number, score: number, total: number) => ({
    completedAt: daysAgo(now, days, 20).toISOString(),
    score,
    total,
  });

  return {
    profile: {
      id: "marcus",
      fullName: "Marcus Johnson",
      preferredName: "Marcus",
      age: 21,
      bio: "Senior, Business Admin · part-time at the Campus Rec Center",
      idType: "ssn",
      idMasked: "•••• 6612",
      idCountry: "United States",
      visaType: null,
      schoolEmail: "mjohnson@state.edu",
      verified: true,
      reasons: ["new_to_money", "learn_investing"],
      goal: "understand_credit",
      homeCurrency: null,
      walletAddress: opts.wallets?.marcus || "https://ilp.interledger-test.dev/marcus-johnson",
      onboarded: true,
    },
    settings: { showHomeCurrency: false, notifications: { bills: true, coach: true, learning: true, transfers: true } },
    account: { name: "Everyday checking", lastFour: "7731", balanceCents: 128_640, currency: "USD" },
    transactions: txs,
    budget: { period: "monthly", semester: currentSemester(now), categories },
    bills,
    contacts,
    transfers: [jordanIn],
    requests: [],
    portfolio,
    learning: {
      completed: {
        "what-is-a-stock": done(12, 2, 2),
        "compound-growth": done(9, 1, 2),
        "index-funds": done(1, 2, 2),
      },
      walkthroughs: [],
    },
    coach: [
      {
        id: "coach_marcus_conc",
        kind: "daily",
        title: "Most of your practice money rides on one company",
        body: "Over half of your invested Seeds are in Apple. If one company has a bad week, your whole portfolio feels it. Here's what concentration risk means.",
        lessonId: "diversification",
        createdAt: now.toISOString(),
        dismissed: false,
        source: "rule",
      },
    ],
    demo: { failNextSend: false },
  };
}

export function seedUser(persona: PersonaId, opts: SeedOptions = {}): UserState {
  const now = opts.now ?? new Date();
  return persona === "sudeep" ? seedSudeep(now, opts) : seedMarcus(now, opts);
}

export function seedDb(opts: SeedOptions = {}, activePersona: PersonaId = "sudeep"): SessionDb {
  return {
    version: 1,
    activePersona,
    users: { sudeep: seedUser("sudeep", opts), marcus: seedUser("marcus", opts) },
    updatedAt: new Date().toISOString(),
  };
}

/** Defaults applied when someone taps "Log in" as Sudeep instead of onboarding. */
export function sudeepLoginDefaults(user: UserState): UserState {
  return {
    ...user,
    profile: {
      ...user.profile,
      idType: "passport",
      idMasked: "•••• 4821",
      idCountry: "Nepal",
      visaType: "F-1",
      schoolEmail: "sjoshi@state.edu",
      verified: true,
      reasons: ["new_to_us", "learn_investing"],
      goal: "send_home",
      onboarded: true,
    },
  };
}
