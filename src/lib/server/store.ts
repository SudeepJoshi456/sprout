import "server-only";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { PersonaId, SessionDb, UserState } from "@/lib/types";
import { config } from "./config";
import { seedDb, seedUser } from "./seed";

/**
 * JSON file store, one file per demo session.
 *
 * Each browser gets a random session id (sent as `x-sprout-session`), so
 * several judges can run the demo at once without stepping on each other.
 * On Vercel the file lives in /tmp, which is per-instance and ephemeral, so
 * the client also keeps a snapshot and can restore it (see /api/session/restore).
 */
const SESSIONS_DIR = join(config.dataDir, "sessions");

type Mem = Map<string, SessionDb>;
const g = globalThis as unknown as { __sproutSessions?: Mem };
const mem: Mem = (g.__sproutSessions ??= new Map());

export const SESSION_HEADER = "x-sprout-session";
const SID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

export function isValidSid(sid: string | null): sid is string {
  return !!sid && SID_RE.test(sid);
}

function fileFor(sid: string) {
  return join(SESSIONS_DIR, `${sid}.json`);
}

export function seedOptions() {
  return {
    wallets: {
      sudeep: config.op.senderWalletAddress,
      roommate: config.op.roommateWallet,
      family: config.op.familyWallet,
      friend: config.op.friendWallet,
    },
  };
}

const PLACEHOLDER = (name: string) => `https://ilp.interledger-test.dev/${name}`;

/**
 * Sessions created before live wallets were configured still point at the
 * placeholder addresses. Swap in the real ones so they don't silently fall
 * back to simulated payments.
 */
function upgradeWallets(db: SessionDb) {
  const { senderWalletAddress: sender, familyWallet, roommateWallet, friendWallet } = config.op;
  const sudeep = db.users?.sudeep;
  if (sender && sudeep?.profile?.walletAddress === PLACEHOLDER("sudeep-sprout")) sudeep.profile.walletAddress = sender;
  for (const user of Object.values(db.users ?? {})) {
    for (const c of user?.contacts ?? []) {
      if (familyWallet && c.walletAddress === PLACEHOLDER("sita-joshi")) c.walletAddress = familyWallet;
      if (roommateWallet && c.walletAddress === PLACEHOLDER("ana-lopez")) c.walletAddress = roommateWallet;
      if (friendWallet && c.walletAddress === PLACEHOLDER("jordan-reyes")) c.walletAddress = friendWallet;
    }
  }
  return db;
}

export function loadSession(sid: string): SessionDb | null {
  const hit = mem.get(sid);
  if (hit) return upgradeWallets(hit);
  try {
    const f = fileFor(sid);
    if (!existsSync(f)) return null;
    const db = upgradeWallets(JSON.parse(readFileSync(f, "utf8")) as SessionDb);
    mem.set(sid, db);
    return db;
  } catch {
    return null;
  }
}

export function saveSession(sid: string, db: SessionDb) {
  db.updatedAt = new Date().toISOString();
  mem.set(sid, db);
  try {
    mkdirSync(SESSIONS_DIR, { recursive: true });
    writeFileSync(fileFor(sid), JSON.stringify(db));
  } catch (err) {
    // Read-only filesystems still work from memory; just log it.
    console.warn("[store] could not persist session", err);
  }
}

export function resetSession(sid: string, persona: PersonaId = "sudeep"): SessionDb {
  const db = seedDb(seedOptions(), persona);
  saveSession(sid, db);
  return db;
}

export function restoreSession(sid: string, snapshot: Partial<SessionDb>): SessionDb {
  const fresh = seedDb(seedOptions());
  const db: SessionDb = {
    version: 1,
    activePersona: snapshot.activePersona === "marcus" ? "marcus" : "sudeep",
    users: {
      sudeep: (snapshot.users?.sudeep as UserState) ?? fresh.users.sudeep,
      marcus: (snapshot.users?.marcus as UserState) ?? fresh.users.marcus,
    },
    updatedAt: new Date().toISOString(),
  };
  saveSession(sid, upgradeWallets(db));
  return db;
}

/**
 * Every demo session that uses the real wallet watches the same incoming
 * payments, so each one is claimed by exactly one session. Without this, one
 * real $1 would show up as received in every open session.
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

/** True if this session owns the incoming payment (claiming it if nobody has). */
export function claimIncoming(url: string, sid: string): boolean {
  const all = claims();
  if (all[url]) return all[url] === sid;
  all[url] = sid;
  try {
    mkdirSync(config.dataDir, { recursive: true });
    writeFileSync(CLAIMS_FILE, JSON.stringify(all));
  } catch (err) {
    console.warn("[store] could not persist incoming claims", err);
  }
  return true;
}

export function reseedPersona(db: SessionDb, persona: PersonaId) {
  db.users[persona] = seedUser(persona, seedOptions());
}

/** Wipes all local sessions (used by `npm run seed`). */
export function clearAllSessions() {
  mem.clear();
  rmSync(SESSIONS_DIR, { recursive: true, force: true });
}
