import "server-only";
import { randomBytes } from "node:crypto";
import { del, getJson, setJson } from "./db";
import type { PendingConnect } from "./payments/interledger";
import type { GrantStore, OutgoingGrant } from "./payments/types";

/**
 * A person's connected wallet and the spending grant they approved for it.
 * Stored apart from their app data because that data is sent to the browser
 * and access tokens must never be.
 */
export interface LinkedWallet extends OutgoingGrant {
  wallet: string;
  assetCode: string;
  assetScale: number;
  capMinor: number;
  linkedAt: string;
}

const linkKey = (userId: string) => `wallet-link:${userId}`;
const pendingKey = (state: string) => `wallet-connect:${state}`;
const PENDING_TTL_SECONDS = 15 * 60;

export function getLinkedWallet(userId: string) {
  return getJson<LinkedWallet>(linkKey(userId));
}

export function saveLinkedWallet(userId: string, link: LinkedWallet) {
  return setJson(linkKey(userId), link);
}

export function removeLinkedWallet(userId: string) {
  return del(linkKey(userId));
}

/** Grant access for one wallet; token rotation writes the new token back. */
export function grantStoreFor(userId: string, link: LinkedWallet): GrantStore {
  let current = link;
  return {
    async get() {
      current = (await getLinkedWallet(userId)) ?? current;
      return { accessToken: current.accessToken, manageUrl: current.manageUrl };
    },
    async save(g) {
      current = { ...current, ...g };
      await saveLinkedWallet(userId, current);
    },
  };
}

export interface PendingConnectRecord extends PendingConnect {
  userId: string;
  returnTo: string;
}

export function newConnectState() {
  return randomBytes(24).toString("base64url");
}

export function savePendingConnect(state: string, record: PendingConnectRecord) {
  return setJson(pendingKey(state), record, PENDING_TTL_SECONDS);
}

/** One-time: the pending approval is deleted as soon as it's read. */
export async function takePendingConnect(state: string) {
  const record = await getJson<PendingConnectRecord>(pendingKey(state));
  if (record) await del(pendingKey(state));
  return record;
}
