import "server-only";
import type { UserState } from "@/lib/types";
import { liveMode } from "./payments";
import { getLinkedWallet } from "./wallet-link";

/** The person's wallet if it's real and they proved it's theirs; otherwise null. */
export async function connectedWallet(userId: string, user: UserState) {
  if (!liveMode() || !user.profile.walletAddress) return null;
  const link = await getLinkedWallet(userId);
  return link && link.wallet === user.profile.walletAddress ? link : null;
}
