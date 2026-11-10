"use client";

import type { LiveWallet, ModeStatus, PersonaId, UserState } from "@/lib/types";
import { t } from "@/i18n";

/**
 * Client API layer.
 *
 * - Every request carries this browser's demo session id.
 * - Any response with `state` updates the global store, so screens re-render
 *   from one source of truth.
 * - The latest state per persona is snapshotted in localStorage; if a
 *   serverless instance doesn't know our session (409), we restore it.
 */

export interface ClientState {
  persona: PersonaId;
  user: UserState;
  modes: ModeStatus;
  /** Real wallets to pick from in live mode (empty when simulated). */
  wallets?: LiveWallet[];
  /** The wallet live sends actually debit. */
  sendFrom?: string | null;
  serverTime: string;
}

const SID_KEY = "sprout.sid";
const SNAP_KEY = "sprout.snapshot.v2";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// ---- Session id ------------------------------------------------------------

export function getSid(): string {
  let sid = localStorage.getItem(SID_KEY);
  if (!sid || !/^[a-zA-Z0-9_-]{8,64}$/.test(sid)) {
    sid = crypto.randomUUID();
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

// ---- Global state store (useSyncExternalStore) ----------------------------

let current: ClientState | null = null;
const listeners = new Set<() => void>();

export const store = {
  get: () => current,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  set(next: ClientState) {
    current = next;
    saveSnapshot(next);
    listeners.forEach((l) => l());
  },
};

interface Snapshot {
  activePersona: PersonaId;
  users: Partial<Record<PersonaId, UserState>>;
}

function saveSnapshot(s: ClientState) {
  try {
    const prev = JSON.parse(localStorage.getItem(SNAP_KEY) ?? "null") as Snapshot | null;
    const snap: Snapshot = { activePersona: s.persona, users: { ...(prev?.users ?? {}), [s.persona]: s.user } };
    localStorage.setItem(SNAP_KEY, JSON.stringify(snap));
  } catch {
    /* storage full or disabled: the server copy still works */
  }
}

export function clearSnapshot() {
  localStorage.removeItem(SNAP_KEY);
}

// ---- Requests ----------------------------------------------------------------

interface Options {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

async function raw(path: string, opts: Options) {
  try {
    return await fetch(path, {
      method: opts.method ?? "GET",
      headers: { "content-type": "application/json", "x-sprout-session": getSid() },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
      cache: "no-store",
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiClientError(0, "offline", t("app.offline"));
  }
}

let restoring: Promise<void> | null = null;

/** Recreate the server session from our snapshot (or seed a fresh one). */
async function restore() {
  restoring ??= (async () => {
    const snap = localStorage.getItem(SNAP_KEY);
    const res = snap
      ? await raw("/api/session/restore", { method: "POST", body: { snapshot: JSON.parse(snap) } })
      : await raw("/api/demo/reset", { method: "POST", body: {} });
    const data = await res.json();
    if (data.state) store.set(data.state);
  })().finally(() => {
    restoring = null;
  });
  return restoring;
}

let sent = 0;
let applied = 0;

export async function api<T = Record<string, unknown>>(path: string, opts: Options = {}): Promise<T> {
  const seq = ++sent;
  let res = await raw(path, opts);
  if (res.status === 409) {
    const peek = await res.clone().json().catch(() => null);
    if (peek?.error?.code === "session_missing") {
      await restore();
      res = await raw(path, opts);
    }
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiClientError(res.status, data?.error?.code ?? "unknown", data?.error?.message ?? t("app.genericError"));
  }
  // Responses can land out of order; never let an older state overwrite a newer one.
  if (data?.state && seq > applied) {
    applied = seq;
    store.set(data.state as ClientState);
  }
  return data as T;
}

/** Fresh session for a brand-new demo (used by "Reset demo"). */
export async function resetDemo(persona: PersonaId = "sudeep") {
  clearSnapshot();
  invalidate("");
  return api("/api/demo/reset", { method: "POST", body: { persona } });
}

// ---- Tiny resource cache for read endpoints (SWR-style) ----------------------

interface Entry {
  data?: unknown;
  error?: ApiClientError;
  promise?: Promise<unknown>;
  at: number;
}
const cache = new Map<string, Entry>();
const resourceListeners = new Set<() => void>();
let version = 0;

export const resources = {
  subscribe(fn: () => void) {
    resourceListeners.add(fn);
    return () => resourceListeners.delete(fn);
  },
  version: () => version,
  peek: (key: string) => cache.get(key),
  load(key: string, force = false) {
    const hit = cache.get(key);
    if (hit?.promise) return hit.promise;
    if (hit && !force && (hit.data !== undefined || hit.error)) return Promise.resolve(hit.data);
    const entry: Entry = { ...hit, at: Date.now() };
    entry.promise = api(key)
      .then((d) => {
        entry.data = d;
        entry.error = undefined;
        return d;
      })
      .catch((e) => {
        entry.error = e instanceof ApiClientError ? e : new ApiClientError(0, "unknown", t("app.genericError"));
      })
      .finally(() => {
        entry.promise = undefined;
        version++;
        resourceListeners.forEach((l) => l());
      });
    cache.set(key, entry);
    return entry.promise;
  },
};

/** Revalidate cached reads whose key starts with `prefix` (keeps stale data visible meanwhile). */
export function invalidate(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) void resources.load(key, true);
  }
}

export function newIdempotencyKey() {
  return crypto.randomUUID();
}
