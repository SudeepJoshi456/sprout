import "server-only";

/**
 * Tiny Upstash Redis client over its REST API. Used on Vercel, where /tmp is
 * per-instance, for the few values every instance must agree on (the rotated
 * outgoing-payment token, incoming-payment claims). Locally it's unset and
 * callers fall back to files.
 */
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvEnabled = Boolean(url && token);

async function command<T>(args: (string | number)[]): Promise<T | null> {
  const res = await fetch(url!, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV ${args[0]} failed: ${res.status}`);
  const body = (await res.json()) as { result: T | null };
  return body.result;
}

export async function kvGet(key: string): Promise<string | null> {
  return command<string>(["GET", key]);
}

export async function kvSet(key: string, value: string): Promise<void> {
  await command(["SET", key, value]);
}

/** Sets the key only if it doesn't exist. Returns true if this call set it. */
export async function kvSetNx(key: string, value: string): Promise<boolean> {
  return (await command<string>(["SET", key, value, "NX"])) === "OK";
}
