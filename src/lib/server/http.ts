import "server-only";
import type { z } from "zod";
import type { PersonaId, SessionDb, UserState } from "@/lib/types";
import { config, modeStatus } from "./config";
import { SESSION_HEADER, isValidSid, loadSession, saveSession } from "./store";

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

export function getSid(req: Request) {
  const sid = req.headers.get(SESSION_HEADER);
  if (!isValidSid(sid)) throw new ApiError(400, "no_session", "Missing or invalid session id.");
  return sid;
}

export interface SessionCtx {
  sid: string;
  db: SessionDb;
  persona: PersonaId;
  user: UserState;
}

/**
 * Loads the caller's session, runs the handler, saves (for mutations), and
 * returns `{ ...result, state }` so the client always gets fresh state back.
 */
export async function withSession(
  req: Request,
  handler: (ctx: SessionCtx) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void,
  opts: { mutates?: boolean } = { mutates: true },
) {
  try {
    const sid = getSid(req);
    const db = loadSession(sid);
    if (!db) throw new ApiError(409, "session_missing", "Session not found on this server.");
    const persona = db.activePersona;
    const result = (await handler({ sid, db, persona, user: db.users[persona] })) ?? {};
    if (opts.mutates !== false) saveSession(sid, db);
    return Response.json({ ...result, state: clientState(db) });
  } catch (err) {
    return errorResponse(err);
  }
}

export function clientState(db: SessionDb) {
  const modes = modeStatus();
  const user = db.users[db.activePersona];
  const receivingLive = modes.payments === "interledger" && !!user.profile.walletAddress && user.profile.walletAddress === config.op.senderWalletAddress;
  return {
    persona: db.activePersona,
    user,
    modes: { ...modes, receiving: receivingLive ? "interledger" : "mock" },
    serverTime: new Date().toISOString(),
  };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
