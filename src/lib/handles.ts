/**
 * Sprout usernames (@ana). Friendlier than a wallet address; each one maps to
 * the person's Open Payments wallet behind the scenes.
 */
export function handleFor(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

export const atHandle = (name: string) => `@${handleFor(name)}`;
