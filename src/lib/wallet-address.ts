/**
 * Everyone on the Interledger test network shares the same wallet host, so
 * people only need to type the part after the last slash (e.g. "sudeep-sprout").
 * Full addresses and "$host/name" payment pointers still work when pasted.
 */
export const WALLET_HOST = "ilp.interledger-test.dev";

const HOST_PREFIX = new RegExp(`^(?:https?://|\\$)?${WALLET_HOST.replace(/\./g, "\\.")}/+`, "i");

/** True when the text is a whole address on some host, not just a name. */
export function isFullAddress(input: string): boolean {
  const v = input.trim();
  return v.startsWith("$") || /^https?:\/\//i.test(v) || /^[\w-]+(\.[\w-]+)+\//.test(v);
}

/** Drops the shared host so the field shows only the name. Other hosts are kept as typed. */
export function walletNameFrom(input: string): string {
  return input.trim().replace(HOST_PREFIX, "");
}

/** Turns a name, payment pointer or full address into the https address the server expects. */
export function toWalletUrl(input: string): string {
  const v = input.trim();
  if (!v) return "";
  if (v.startsWith("$")) return `https://${v.slice(1)}`;
  if (/^https?:\/\//i.test(v)) return v;
  if (isFullAddress(v)) return `https://${v}`;
  return `https://${WALLET_HOST}/${v.replace(/^\/+/, "")}`;
}
