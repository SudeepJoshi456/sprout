import "server-only";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config";
import { kvDel, kvEnabled, kvGet, kvIncr, kvSet, kvSetEx, kvSetNx } from "./kv";

/**
 * Key/value storage for accounts, sessions and user data.
 *
 * Upstash Redis when configured (required on Vercel, where /tmp is wiped
 * between instances); otherwise one JSON file per key under .data/kv locally.
 * File names are hashes of the key, so emails never appear on disk as names.
 */
const DIR = join(config.dataDir, "kv");

if (process.env.VERCEL && !kvEnabled) {
  console.warn("[db] Upstash KV is not configured; accounts will not survive between serverless instances");
}

interface FileEntry {
  v: string;
  exp: number | null;
}

const fileFor = (key: string) => join(DIR, `${createHash("sha256").update(key).digest("hex")}.json`);

function readFile(key: string): string | null {
  try {
    const entry = JSON.parse(readFileSync(fileFor(key), "utf8")) as FileEntry;
    if (entry.exp && entry.exp < Date.now()) {
      rmSync(fileFor(key), { force: true });
      return null;
    }
    return entry.v;
  } catch {
    return null;
  }
}

function writeFile(key: string, value: string, ttlSeconds?: number) {
  mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const entry: FileEntry = { v: value, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null };
  writeFileSync(fileFor(key), JSON.stringify(entry), { mode: 0o600 });
}

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = kvEnabled ? await kvGet(key) : readFile(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown, ttlSeconds?: number) {
  const raw = JSON.stringify(value);
  if (!kvEnabled) return writeFile(key, raw, ttlSeconds);
  if (ttlSeconds) await kvSetEx(key, raw, ttlSeconds);
  else await kvSet(key, raw);
}

/** Writes only if the key is free. Returns false if someone already holds it. */
export async function setJsonIfAbsent(key: string, value: unknown): Promise<boolean> {
  const raw = JSON.stringify(value);
  if (kvEnabled) return kvSetNx(key, raw);
  if (readFile(key) !== null) return false;
  writeFile(key, raw);
  return true;
}

export async function del(key: string) {
  if (kvEnabled) await kvDel(key);
  else rmSync(fileFor(key), { force: true });
}

/** Counter within a fixed time window (for rate limiting). */
export async function incr(key: string, windowSeconds: number): Promise<number> {
  if (kvEnabled) return kvIncr(key, windowSeconds);
  const current = Number(readFile(key) ?? 0) + 1;
  const existing = (() => {
    try {
      return (JSON.parse(readFileSync(fileFor(key), "utf8")) as FileEntry).exp;
    } catch {
      return null;
    }
  })();
  const remaining = existing ? Math.max(1, Math.ceil((existing - Date.now()) / 1000)) : windowSeconds;
  writeFile(key, String(current), remaining);
  return current;
}
