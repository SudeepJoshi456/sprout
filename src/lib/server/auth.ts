import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { del, getJson, incr, setJson } from "./db";

/**
 * Email + password accounts.
 *
 * - Passwords are hashed with scrypt and a per-user salt; plaintext is never stored or logged.
 * - The session cookie holds a random token. Only its SHA-256 hash is stored,
 *   so a leaked database can't be replayed as a login.
 * - Cookies are httpOnly (no JavaScript access), SameSite=Lax, and Secure in production.
 */
export const SESSION_TTL_SECONDS = 30 * 86_400;
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-sprout_session" : "sprout_session";

const SCRYPT = { N: 16_384, r: 8, p: 1, keylen: 64 };

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scryptAsync(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Checked when an email doesn't exist, so response time doesn't reveal which emails have accounts. */
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword(randomBytes(12).toString("hex"));
  await verifyPassword(password, await dummyHash);
}

// ---- Sessions ---------------------------------------------------------------

interface SessionRecord {
  userId: string;
  createdAt: string;
}

const tokenKey = (token: string) => `session:${createHash("sha256").update(token).digest("hex")}`;

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await setJson(tokenKey(token), { userId, createdAt: new Date().toISOString() } satisfies SessionRecord, SESSION_TTL_SECONDS);
  return token;
}

export function sessionToken(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) {
      const value = rest.join("=");
      return /^[A-Za-z0-9_-]{20,100}$/.test(value) ? value : null;
    }
  }
  return null;
}

export async function sessionUserId(req: Request): Promise<string | null> {
  const token = sessionToken(req);
  if (!token) return null;
  return (await getJson<SessionRecord>(tokenKey(token)))?.userId ?? null;
}

export async function destroySession(req: Request) {
  const token = sessionToken(req);
  if (token) await del(tokenKey(token));
}

export function sessionCookie(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearedSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

// ---- Request checks ---------------------------------------------------------

/**
 * Blocks cross-site form posts and fetches (CSRF). Browsers always send
 * Origin on these requests; it must match the host serving the app.
 */
export function isSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** True if this key is still under `limit` hits for the current window. */
export async function underLimit(key: string, limit: number, windowSeconds: number) {
  return (await incr(`rl:${key}`, windowSeconds)) <= limit;
}
