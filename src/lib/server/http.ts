import "server-only";
import type { z } from "zod";
import type { UserState } from "@/lib/types";
import { isSameOrigin, sessionUserId } from "./auth";
import { modeStatus } from "./config";
import { loadUser, saveUser, type UserRecord } from "./users";
import { getLinkedWallet } from "./wallet-link";

/** Errors thrown inside handlers become `{ error: { code, message } }` responses. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  console.error("[api] unexpected error", err);
  return Response.json(
    { error: { code: "server_error", message: "Something went wrong on our side. Your data is safe, so please try again." } },
    { status: 500 },
  );
}

export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "bad_json", "The request body wasn't valid JSON.");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ApiError(400, "invalid_input", first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input.");
  }
  return result.data;
}

export function assertSameOrigin(req: Request) {
  if (!isSameOrigin(req)) throw new ApiError(403, "bad_origin", "This request came from another site and was blocked.");
}

/** The signed-in account, or a 401. */
export async function requireUser(req: Request): Promise<UserRecord> {
  assertSameOrigin(req);
  const userId = await sessionUserId(req);
  const record = userId ? await loadUser(userId) : null;
  if (!record) throw new ApiError(401, "signed_out", "Please log in to continue.");
  return record;
}

export interface SessionCtx {
  userId: string;
  record: UserRecord;
  user: UserState;
  /** Persist now (e.g. before a slow network call). */
  save: () => Promise<void>;
}

/**
 * Loads the signed-in user, runs the handler, saves (for mutations), and
 * returns `{ ...result, state }` so the client always gets fresh state back.
 */
export async function withSession(
  req: Request,
  handler: (ctx: SessionCtx) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void,
  opts: { mutates?: boolean } = { mutates: true },
) {
  try {
    const record = await requireUser(req);
    const save = () => saveUser(record);
    const result = (await handler({ userId: record.id, record, user: record.state, save })) ?? {};
    if (opts.mutates !== false) await save();
    return Response.json({ ...result, state: await clientState(record) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function clientState(record: UserRecord) {
  const modes = modeStatus();
  const live = modes.payments === "interledger";
  const link = live ? await getLinkedWallet(record.id) : null;
  const connected = Boolean(link && link.wallet === record.state.profile.walletAddress);
  return {
    userId: record.id,
    email: record.email,
    handle: record.handle,
    user: record.state,
    modes: { ...modes, receiving: connected ? "interledger" : "mock" },
    wallet: link && connected ? { url: link.wallet, assetCode: link.assetCode, capMinor: link.capMinor, linkedAt: link.linkedAt } : null,
    serverTime: new Date().toISOString(),
  };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
