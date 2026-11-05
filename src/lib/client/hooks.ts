"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api, ApiClientError, resources, store, type ClientState } from "./api";

/** The active persona's state, or null while loading. */
export function useClientState(): ClientState | null {
  return useSyncExternalStore(store.subscribe, store.get, () => null);
}

/** Like useClientState but for components rendered only after the app guard. */
export function useAppState(): ClientState {
  const s = useClientState();
  if (!s) throw new Error("useAppState used before state loaded");
  return s;
}

/**
 * Read an API resource with caching and background revalidation.
 * Pass `null` to skip. Stale data stays visible while refreshing.
 */
export function useResource<T>(key: string | null) {
  useSyncExternalStore(resources.subscribe, resources.version, () => 0);
  useEffect(() => {
    if (key) void resources.load(key);
  }, [key]);
  const entry = key ? resources.peek(key) : undefined;
  const reload = useCallback(() => (key ? resources.load(key, true) : Promise.resolve()), [key]);
  return {
    data: entry?.data as T | undefined,
    error: entry?.error as ApiClientError | undefined,
    loading: Boolean(key) && entry?.data === undefined && !entry?.error,
    refreshing: Boolean(entry?.promise),
    reload,
  };
}

/** Loads state once on app start. */
export function useBootstrap() {
  const state = useClientState();
  const [error, setError] = useState<ApiClientError | null>(null);
  const fetchState = useCallback(
    () => api("/api/state").catch((e) => setError(e instanceof ApiClientError ? e : new ApiClientError(0, "unknown", String(e)))),
    [],
  );
  const load = useCallback(() => {
    setError(null);
    void fetchState();
  }, [fetchState]);
  useEffect(() => {
    if (!store.get()) void fetchState();
  }, [fetchState]);
  return { state, error, retry: load };
}

/** True when the user prefers reduced motion. */
export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
