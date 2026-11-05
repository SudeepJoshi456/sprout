/**
 * Demo banks for the "connect your bank" flow. Nothing here talks to a real
 * bank; in production this step would use a bank-linking provider.
 */
export interface DemoBank {
  id: string;
  name: string;
  /** Brand-ish color for the initials badge. */
  color: string;
  accounts: { type: "checking" | "savings"; name: string; mask: string; balanceCents: number }[];
}

export const DEMO_BANKS: DemoBank[] = [
  { id: "chase", name: "Chase", color: "#117aca", accounts: [{ type: "checking", name: "Total Checking", mask: "4417", balanceCents: 245_018 }, { type: "savings", name: "Savings", mask: "8890", balanceCents: 510_000 }] },
  { id: "boa", name: "Bank of America", color: "#c41230", accounts: [{ type: "checking", name: "Advantage Checking", mask: "2231", balanceCents: 183_240 }, { type: "savings", name: "Advantage Savings", mask: "6602", balanceCents: 320_000 }] },
  { id: "wells", name: "Wells Fargo", color: "#b8860b", accounts: [{ type: "checking", name: "Everyday Checking", mask: "7310", balanceCents: 96_455 }, { type: "savings", name: "Way2Save", mask: "1148", balanceCents: 150_000 }] },
  { id: "capone", name: "Capital One", color: "#004879", accounts: [{ type: "checking", name: "360 Checking", mask: "5526", balanceCents: 128_790 }, { type: "savings", name: "360 Performance Savings", mask: "0937", balanceCents: 410_000 }] },
  { id: "citi", name: "Citi", color: "#056dae", accounts: [{ type: "checking", name: "Access Checking", mask: "3384", balanceCents: 74_310 }] },
  { id: "usbank", name: "U.S. Bank", color: "#0c2074", accounts: [{ type: "checking", name: "Smartly Checking", mask: "9051", balanceCents: 112_600 }] },
];

export const MAX_DEPOSIT_CENTS = 1_000_000;
