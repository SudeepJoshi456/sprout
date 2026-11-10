import "server-only";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config";
import { kvEnabled, kvGet, kvSet, kvSetNx } from "./kv";

/**
 * Bookkeeping for real incoming payments. Two accounts can connect the same
 * wallet, so each incoming payment is credited to exactly one of them.
 * Without this, one real $1 would show up as received twice.
 */
const CLAIMS_FILE = join(config.dataDir, "incoming-claims.json");
const gc = globalThis as unknown as { __sproutClaims?: Record<string, string> };

function claims(): Record<string, string> {
  if (!gc.__sproutClaims) {
    try {
      gc.__sproutClaims = JSON.parse(readFileSync(CLAIMS_FILE, "utf8")) as Record<string, string>;
    } catch {
      gc.__sproutClaims = {};
    }
  }
  return gc.__sproutClaims;
}

/**
 * Payments an account sent to another Sprout wallet. The sender shouldn't
 * also see them as "received", but the account receiving into that wallet should.
 */
const gs = globalThis as unknown as { __sproutSent?: Map<string, string> };
const sentLocal = (gs.__sproutSent ??= new Map());

export async function markSentIncoming(url: string, userId: string) {
  sentLocal.set(url, userId);
  if (kvEnabled) await kvSet(`sprout:sent:${url}`, userId);
}

export async function sentBySession(url: string, userId: string): Promise<boolean> {
  if (sentLocal.get(url) === userId) return true;
  return kvEnabled ? (await kvGet(`sprout:sent:${url}`)) === userId : false;
}

/** True if this account owns the incoming payment (claiming it if nobody has). */
export async function claimIncoming(url: string, userId: string): Promise<boolean> {
  if (kvEnabled) {
    const key = `sprout:claim:${url}`;
    return (await kvSetNx(key, userId)) || (await kvGet(key)) === userId;
  }
  const all = claims();
  if (all[url]) return all[url] === userId;
  all[url] = userId;
  try {
    mkdirSync(config.dataDir, { recursive: true });
    writeFileSync(CLAIMS_FILE, JSON.stringify(all));
  } catch (err) {
    console.warn("[store] could not persist incoming claims", err);
  }
  return true;
}
