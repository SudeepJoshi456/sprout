/**
 * Plain-language explainer for how Sprout moves money with Interledger and
 * Open Payments. Shown from the Move screen's info button and mirrored in the
 * README so the team can answer judges' questions consistently.
 */
export const INTERLEDGER_EXPLAINER = {
  title: "How Sprout moves money",
  intro:
    "Sprout doesn't hold or move money itself. It asks your bank or wallet to pay someone else's bank or wallet using Open Payments, an open standard. The money travels over Interledger, a network that connects different providers and currencies.",
  terms: [
    {
      term: "Wallet address",
      body: "A web link that identifies an account, like https://ilp.interledger-test.dev/sudeep. Share it to get paid. It also tells apps where the account's servers are.",
    },
    {
      term: "Auth server",
      body: "Hands out permission (grants) using a standard called GNAP. Receiving needs no approval. Sending needs the account holder's consent, given once in their wallet with a spending cap.",
    },
    {
      term: "Resource server",
      body: "Where payments are created: incoming payments, quotes, and outgoing payments.",
    },
    {
      term: "Interledger",
      body: "Splits a payment into tiny packets and routes them between providers, converting currency on the way when needed. Like the internet does for data, but for money.",
    },
  ],
  steps: [
    { title: "Look up both wallets", body: "Find each account's currency and servers from its wallet address." },
    { title: "Create an incoming payment", body: "Open a \"bucket\" at the receiver's provider for this payment." },
    { title: "Get a quote", body: "The sender's provider says exactly what leaves your account and what arrives, including fees and the exchange rate. You review this before sending." },
    { title: "Create the outgoing payment", body: "Using your approved grant, your provider streams Interledger packets until the receiver's bucket is full. It usually takes seconds." },
  ],
  safety: [
    "Every send is reviewed first: amount, fee, rate, and what they receive.",
    "Quotes are signed by our server and expire after 5 minutes, so they can't be changed.",
    "Each send has an idempotency key, so a double tap or retry never pays twice.",
    "Secrets (the private key and grant token) live only on the server.",
  ],
  simulatedNote:
    "Right now this demo runs simulated payments that follow the exact same steps. With test-network credentials set, the same screens make real payments on the Interledger test network.",
  liveNote: "Payments are going over the real Interledger test network (play money, no real funds).",
};
