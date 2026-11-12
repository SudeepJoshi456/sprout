import "server-only";
import { randomUUID } from "node:crypto";
import type { BudgetCategory, UserState } from "@/lib/types";
import { handleFor } from "@/lib/handles";
import { STARTING_SEEDS_CENTS } from "@/lib/portfolio";
import { del, getJson, setJson, setJsonIfAbsent } from "./db";

/**
 * Accounts and their app data.
 *   account:<email>  → login record (password hash)
 *   user:<id>        → everything the app shows for that person
 *   handle:<name>    → user id, so @username lookups resolve to a real wallet
 */
interface AccountRecord {
  userId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  /** When they confirmed they're 18+ and agreed to the Terms and Privacy Policy. */
  termsAcceptedAt?: string;
  termsVersion?: string;
}

export const TERMS_VERSION = "2026-11-11";

export interface UserRecord {
  id: string;
  email: string;
  handle: string | null;
  state: UserState;
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
const accountKey = (email: string) => `account:${normalizeEmail(email)}`;
const userKey = (id: string) => `user:${id}`;
const handleKey = (handle: string) => `handle:${handle}`;

export function findAccount(email: string) {
  return getJson<AccountRecord>(accountKey(email));
}

/** Returns null if the email is already registered. */
export async function createAccount(email: string, passwordHash: string): Promise<UserRecord | null> {
  const userId = randomUUID();
  const now = new Date().toISOString();
  const account: AccountRecord = { userId, email: normalizeEmail(email), passwordHash, createdAt: now, termsAcceptedAt: now, termsVersion: TERMS_VERSION };
  if (!(await setJsonIfAbsent(accountKey(email), account))) return null;
  const record: UserRecord = { id: userId, email: account.email, handle: null, state: newUserState(userId) };
  await setJson(userKey(userId), record);
  return record;
}

export function loadUser(id: string) {
  return getJson<UserRecord>(userKey(id));
}

export function saveUser(record: UserRecord) {
  return setJson(userKey(record.id), record);
}

export async function deleteUser(record: UserRecord) {
  if (record.handle) await del(handleKey(record.handle));
  await del(accountKey(record.email));
  await del(userKey(record.id));
}

/** Claims a unique @username from the person's first name (ana, ana2, ana3…). */
export async function claimHandle(record: UserRecord, name: string) {
  const base = handleFor(name).slice(0, 20) || "sprout";
  if (record.handle?.replace(/\d+$/, "") === base) return record.handle;
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? base : `${base}${n}`;
    if (await setJsonIfAbsent(handleKey(candidate), record.id)) {
      if (record.handle) await del(handleKey(record.handle));
      record.handle = candidate;
      return candidate;
    }
  }
  throw new Error("Could not find a free username");
}

export async function findByHandle(handle: string) {
  const id = await getJson<string>(handleKey(handle.replace(/^@/, "").toLowerCase()));
  return id ? loadUser(id) : null;
}

/** Which Sprout member uses a wallet, so payments can show their name, not the wallet's. */
const walletOwnerKey = (wallet: string) => `wallet-owner:${wallet}`;

export function setWalletOwner(wallet: string, userId: string) {
  return setJson(walletOwnerKey(wallet), userId);
}

/** The member whose current wallet this is (a stale entry from a disconnected wallet is ignored). */
export async function findByWallet(wallet: string) {
  const id = await getJson<string>(walletOwnerKey(wallet));
  const record = id ? await loadUser(id) : null;
  return record && record.state.profile.walletAddress === wallet ? record : null;
}

/** "Maya Torres (@maya)", or whatever part of that the member has set. */
export function memberLabel(record: UserRecord) {
  const name = record.state.profile.fullName || record.state.profile.preferredName;
  const handle = record.handle ? `@${record.handle}` : "";
  return name && handle ? `${name} (${handle})` : name || handle || "Sprout member";
}

/** Standard categories with no limits yet; the person sets their own. */
const STARTER_CATEGORIES: BudgetCategory[] = [
  { id: "groceries", monthlyLimitCents: 0, essential: true },
  { id: "transport", monthlyLimitCents: 0, essential: true },
  { id: "dining", monthlyLimitCents: 0, essential: false },
  { id: "shopping", monthlyLimitCents: 0, essential: false },
  { id: "subscriptions", monthlyLimitCents: 0, essential: false },
  { id: "entertainment", monthlyLimitCents: 0, essential: false },
];

export function currentSemester(now: Date) {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m >= 7) return { name: `Fall ${y}`, start: `${y}-08-24`, end: `${y}-12-18` };
  if (m >= 4) return { name: `Summer ${y}`, start: `${y}-05-18`, end: `${y}-08-14` };
  return { name: `Spring ${y}`, start: `${y}-01-12`, end: `${y}-05-08` };
}

export function newUserState(id: string, now = new Date()): UserState {
  return {
    profile: {
      id,
      fullName: "",
      preferredName: "",
      age: 0,
      bio: "",
      idType: null,
      idMasked: null,
      idCountry: null,
      visaType: null,
      schoolEmail: null,
      verified: false,
      reasons: [],
      goal: null,
      homeCurrency: null,
      walletAddress: null,
      onboarded: false,
    },
    settings: { showHomeCurrency: false, notifications: { bills: true, coach: true, learning: true, transfers: true } },
    account: { name: "Interledger wallet", lastFour: null, balanceCents: 0, currency: "USD" },
    transactions: [],
    budget: { period: "monthly", semester: currentSemester(now), categories: STARTER_CATEGORIES.map((c) => ({ ...c })) },
    bills: [],
    contacts: [],
    transfers: [],
    requests: [],
    portfolio: { cashCents: STARTING_SEEDS_CENTS, holdings: [], trades: [] },
    learning: { completed: {}, walkthroughs: [] },
    coach: [],
    demo: { failNextSend: false },
  };
}
