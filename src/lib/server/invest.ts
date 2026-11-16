import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { roundShares } from "@/lib/portfolio";
import type { Holding, Owned, OwnedTrade } from "@/lib/types";
import { config } from "./config";
import { getJson, setJson } from "./db";
import { ApiError } from "./http";
import { normalizeWalletAddress } from "./payments";
import type { GrantStore } from "./payments/types";
import type { LinkedWallet } from "./wallet-link";

/**
 * Investing with your own wallet. Money moves over Interledger between the
 * person's wallet and Sprout's treasury wallet; Sprout records the shares.
 *
 *   buy:  your wallet → treasury, then shares are added
 *   sell: treasury → your wallet, then shares are removed
 *
 * On the test network this is test money and practice holdings; in production
 * a licensed broker partner would hold real shares.
 */

export const INVEST_MIN_CENTS = 100;
export const INVEST_MAX_CENTS = 50_000;
export const TREASURY_NAME = "Sprout Invest";

export function treasuryWallet(): string {
  if (!config.treasuryWallet) throw new ApiError(409, "invest_off", "Investing with your wallet isn't set up on this server yet.");
  return normalizeWalletAddress(config.treasuryWallet);
}

export function isAdmin(email: string) {
  return config.adminEmails.includes(email.toLowerCase());
}

// ---- Treasury grant (lets Sprout pay out sells) ------------------------------

const TREASURY_KEY = "treasury-link";

export function getTreasuryLink() {
  return getJson<LinkedWallet>(TREASURY_KEY);
}

export function saveTreasuryLink(link: LinkedWallet) {
  return setJson(TREASURY_KEY, link);
}

export function treasuryGrantStore(link: LinkedWallet): GrantStore {
  let current = link;
  return {
    async get() {
      current = (await getTreasuryLink()) ?? current;
      return { accessToken: current.accessToken, manageUrl: current.manageUrl };
    },
    async save(g) {
      current = { ...current, ...g };
      await saveTreasuryLink(current);
    },
  };
}

// ---- Orders ----------------------------------------------------------------

/** What the person agreed to on the review screen, bound to one payment quote. */
export interface InvestOrder {
  quoteId: string;
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  amountCents: number;
  shares: number;
  price: number;
  /** Who gets the shares (gifts); the buyer's own id for a normal buy. */
  recipientId: string;
  signature?: string;
}

function signOrder(o: Omit<InvestOrder, "signature">) {
  const payload = JSON.stringify(["invest", o.quoteId, o.userId, o.symbol, o.side, o.amountCents, o.shares, o.price, o.recipientId]);
  return createHmac("sha256", config.sessionSecret).update(payload).digest("hex");
}

export function newOrder(o: Omit<InvestOrder, "signature">): InvestOrder {
  return { ...o, signature: signOrder(o) };
}

export function verifyOrder(o: InvestOrder, userId: string, quoteId: string) {
  const expected = Buffer.from(signOrder(o), "hex");
  const actual = Buffer.from(o.signature ?? "", "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual) || o.userId !== userId || o.quoteId !== quoteId) {
    throw new ApiError(400, "order_invalid", "This order couldn't be verified. Please review it again.");
  }
}

// ---- Holdings ----------------------------------------------------------------

export function ownedOf(state: { owned?: Owned }): Owned {
  state.owned ??= { holdings: [], trades: [] };
  return state.owned;
}

export function ownedHolding(state: { owned?: Owned }, symbol: string): Holding | undefined {
  return state.owned?.holdings.find((h) => h.symbol === symbol && h.shares > 0);
}

/** Applies a filled trade. Cost basis shrinks in proportion on a sell. */
export function applyOwnedTrade(owned: Owned, trade: OwnedTrade) {
  let h = owned.holdings.find((x) => x.symbol === trade.symbol);
  if (!h) {
    h = { symbol: trade.symbol, shares: 0, costBasisCents: 0 };
    owned.holdings.push(h);
  }
  if (trade.side === "buy") {
    h.shares = roundShares(h.shares + trade.shares);
    h.costBasisCents += trade.amountCents;
  } else {
    const fraction = h.shares > 0 ? Math.min(1, trade.shares / h.shares) : 1;
    h.costBasisCents = Math.round(h.costBasisCents * (1 - fraction));
    h.shares = roundShares(Math.max(0, h.shares - trade.shares));
  }
  owned.holdings = owned.holdings.filter((x) => x.shares > 0);
  owned.trades.unshift(trade);
  owned.trades = owned.trades.slice(0, 200);
}
