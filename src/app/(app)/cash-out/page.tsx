"use client";

import { BankTransfer } from "@/components/money/bank-transfer";

/** Cash out: from the Sprout wallet back to a linked bank (preview of the Plaid + ACH flow). */
export default function CashOutPage() {
  return <BankTransfer direction="out" />;
}
