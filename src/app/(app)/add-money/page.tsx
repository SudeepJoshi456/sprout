"use client";

import { BankTransfer } from "@/components/money/bank-transfer";

/** ★ Add money: from a linked bank into the Sprout wallet (bank link is a preview of the Plaid integration). */
export default function AddMoneyPage() {
  return <BankTransfer direction="in" />;
}
