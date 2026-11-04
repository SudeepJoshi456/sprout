import { en } from "./en";

/** Dot-path keys into the message tree, e.g. "home.evening". */
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<typeof en>;
export type Vars = Record<string, string | number>;

const messages = en;

function lookup(key: string): string {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    node = (node as Record<string, unknown>)?.[part];
  }
  return typeof node === "string" ? node : key;
}

/** Translate a key. `{name}` placeholders are replaced from `vars`. */
export function t(key: MessageKey, vars?: Vars): string {
  const raw = lookup(key);
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}
