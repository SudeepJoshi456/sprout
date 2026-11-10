"use client";

import type { ConnectedWallet, ModeStatus, UserState } from "@/lib/types";
import { t } from "@/i18n";

/**
 * Client API layer.
 *
 * - The session lives in an httpOnly cookie the browser sends automatically;
 *   page JavaScript never sees it.
 * - Any response with `state` updates the global store, so screens re-render
 *   from one source of truth.
 * - A 401 means the session ended, so we go to the login screen.
 */

export interface ClientState {
  userId: string;
  email: string;
  handle: string | null;
  user: UserState;
  modes: ModeStatus;
  /** The person's own approved wallet, or null if they haven't connected one. */
  wallet: ConnectedWallet | null;
  serverTime: string;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
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
  set(next: ClientState | null) {
    current = next;
    listeners.forEach((l) => l());
  },
};

/** Forget everything cached for the signed-in person (log out, account deleted). */
export function clearClient() {
  cache.clear();
  store.set(null);
  // Older builds kept a copy of demo data here.
  localStorage.removeItem("sprout.snapshot.v2");
  localStorage.removeItem("sprout.sid");
  localStorage.removeItem("sprout.onboarding.v1");
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
      headers: { "content-type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiClientError(0, "offline", t("app.offline"));
  }
}

let sent = 0;
let applied = 0;

export async function api<T = Record<string, unknown>>(path: string, opts: Options = {}): Promise<T> {
  const seq = ++sent;
  const res = await raw(path, opts);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && data?.error?.code === "signed_out" && !path.startsWith("/api/auth/")) {
      clearClient();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload drops everything held in memory for the old session
      window.location.assign("/login");
    }
    throw new ApiClientError(res.status, data?.error?.code ?? "unknown", data?.error?.message ?? t("app.genericError"));
  }
  // Responses can land out of order; never let an older state overwrite a newer one.
  if (data?.state && seq > applied) {
    applied = seq;
    store.set(data.state as ClientState);
  }
  return data as T;
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
