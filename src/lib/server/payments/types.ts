import type { MoneyAmount, PaymentStep, PaymentsMode, WalletInfo } from "@/lib/types";

export interface QuoteInput {
  senderWallet: string;
  receiverWallet: string;
  /** Amount the user typed, in USD cents. Fees are shown on top of this. */
  amountCents: number;
}

export interface ProviderQuote {
  receiver: WalletInfo;
  feeCents: number;
  receive: MoneyAmount;
  rate: number | null;
  externalQuoteId?: string;
  steps: PaymentStep[];
}

export interface ExecuteInput {
  externalQuoteId?: string;
  idempotencyKey: string;
  note?: string;
}

export interface PaymentsProvider {
  mode: PaymentsMode;
  resolveWallet(url: string): Promise<WalletInfo>;
  quote(input: QuoteInput): Promise<ProviderQuote>;
  execute(input: ExecuteInput): Promise<{ externalId?: string; steps: PaymentStep[] }>;
}

/** Thrown for problems the user can fix (bad address, etc.). Never triggers fallback. */
export class PaymentUserError extends Error {
  constructor(
    public code: "invalid_address" | "wallet_not_found" | "unsupported_currency",
    message: string,
  ) {
    super(message);
  }
}

/** Records the Open Payments calls of one quote or send, with timings. */
export class StepRecorder {
  readonly steps: PaymentStep[] = [];
  constructor(private simulated: boolean) {}

  async run<T>(id: string, label: string, fn: () => Promise<T>, describe: (r: T) => { detail: string; server?: string }): Promise<T> {
    const start = Date.now();
    const result = await fn();
    this.steps.push({ id, label, ...describe(result), ms: Date.now() - start, simulated: this.simulated });
    return result;
  }
}

export const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};
