# Sprout final version: build plan

## 1. What we're building (locked)

**Positioning:** the beginner's investing app built around brands you love.
**Target:** college students who have never invested.
**Problem:** investing feels confusing and risky (tickers, charts, jargon), so most students never start. Gen Z answered only 38% of basic personal finance questions correctly (TIAA Institute–GFLEC Personal Finance Index, 2025).
**One line:** *Sprout gets students investing for the first time, starting with the brands they already love, funded straight from their wallet over Interledger.*

| Feature | What it does |
|---|---|
| **Your brands** | Pick the brands you love during onboarding. They shape Home and Invest. |
| **Brand page** | What the company does, how it makes money, a "Would you invest?" check, its price and 1-year move, then Buy $5 / $10 / $25. |
| **Buy and sell over Interledger** | A buy is an Interledger payment from your wallet to Sprout's wallet. A sell is a payment from Sprout's wallet back to yours. Sprout records the shares. |
| **Gift a stock** | "Send Maya $10 of Spotify." Same payment as a buy; the shares land in Maya's portfolio. |
| **AI coach (Gemini)** | Ask any money question. It knows your brands and holdings, and only educates, never advises. |
| **Learn** | Short lessons, with investing first. |

**Removed:** Budget, bills, manual expenses, the budget tile on Home.
**Kept but not pitched:** plain send and request to friends, plus the Add money / Cash out preview, all under Wallet.

**Tabs:** Home · Invest · Learn · Coach · Wallet

## 2. How the money works

```
BUY   you tap Buy $10 of Nike
      quote: your wallet → Sprout wallet          (existing createQuote, receiver = Sprout wallet)
      confirm → outgoing payment                  (existing executeQuote, within your spending limit)
      payment completed → shares = $10 / live price → added to your holdings

SELL  you tap Sell
      Sprout wallet → your wallet                 (new: Sprout pays out with its own grant)
      payment completed → shares removed

GIFT  same as BUY, but the shares are added to the friend's holdings, tagged "From <you>"
```

- **Sprout wallet:** a new, dedicated test wallet, e.g. `ilp.interledger-test.dev/sprout-treasury`. It must not be `sudeep-sprout-sender`. You may connect that one as a user, and paying yourself is blocked (`self_send`).
- **Payouts:** the Sprout wallet's owner (you) approves an outgoing grant for it once, on an admin page, using the same connect flow users go through. The token is kept on the server and rotated like user grants.
- **Funding:** add test money to the Sprout wallet once in the test wallet app, so sells can be paid out.
- **Order safety:** each buy, sell and gift is an *order* with a status (pending → filled or failed) and an idempotency key. Shares change only after the payment completes. Price and amount are locked in the signed quote.
- **Mock mode** (no Interledger keys): trades are simulated, just like sends today.

## 3. Build steps (in order, demo-critical first)

### Step 1: Remove Budget (S)
- Tab bar: replace Budget with Invest (`src/components/shell/tab-bar.tsx`).
- Home: remove the budget and bills tiles from the overview (`src/app/(app)/home/page.tsx`).
- Delete the `budget` page and the `budget`, `bills` and `transactions` APIs and UI. Drop the `budget` coach messages. Leave old saved data in place (it's ignored).
- Onboarding: the goal becomes "start investing". Remove the budget questions.

### Step 2: Brand catalog and "Pick your brands" (M)
- New `src/data/brands.ts`: about 20 brands students know (Apple, Nike, Spotify, Starbucks, Chipotle, Netflix, Target, Amazon, Disney, Coca-Cola, McDonald's, Tesla, Microsoft, Google, Meta, Costco, Uber, Roblox, Lululemon, Walmart). Each one has:
  - ticker and display name, with a colored monogram tile (no logos, to avoid trademark issues)
  - **what it does** and **how it makes money**, in plain English (reuse `about` from `tickers.ts`)
  - **Would you invest?** three short facts: profit, growth, one real risk
  - `inSP500: true/false`
- Add `profile.brands: string[]`. Onboarding step "Pick at least 3 brands you love", editable later in Invest.
- Prewritten content is the source of truth, so the demo never depends on the AI.

### Step 3: Home and Invest built around your brands (M)
- **Home:** portfolio value and today's move, a "Your brands" row (tap → brand page), any gifts received, next lesson, and a compact wallet activity list.
- **Invest:** your brands grid, then "Explore more brands", then your holdings. Below that, the **index fund insight**: "4 of your 5 brands are in the S&P 500. VOO owns all of them."
- Reuses the existing Grow page, quotes and history APIs (`src/app/(app)/grow`, `/api/market/*`).

### Step 4: Brand page (M)
- Route `/invest/[symbol]`, built from `grow/[symbol]`.
- Sections:
  - header with price and 1-year chart
  - What they do / How they make money
  - **Would you invest?** (the three facts, plus one quick question)
  - "Also inside VOO" note
  - a sticky **Buy** button
- The Buy sheet uses amount chips $5 / $10 / $25 and shows the quote: amount, fee, estimated shares, and a test-money note. This reuses `trade-sheet.tsx`.

### Step 5: Buy and sell over Interledger (L, core technical piece)
- Config: `SPROUT_TREASURY_WALLET` env var.
- New `POST /api/invest/quote` `{ symbol, side, amountCents }`:
  - **buy:** `createQuote({ senderWallet: user, receiverWallet: treasury })` plus the live price → returns a signed order quote.
  - **sell:** checks the shares you own, quotes the payout from treasury to the user.
- New `POST /api/invest/execute` `{ quote, idempotencyKey }`: verifies the quote, runs the payment, and on success applies the trade (`applyTrade` in `src/lib/portfolio.ts`) and records the order.
- Treasury grant: an admin-only page to connect the Sprout wallet, with the token stored under the KV key `treasury-grant`. A sell uses this grant to pay the user's wallet.
- Portfolio change: holdings are bought with wallet money rather than "Seeds". Seeds stay only in mock mode.
- The trade shows in wallet activity as "Bought $10 of Nike" / "Sold Nike" (payment memo).

### Step 6: Gift a stock (M)
- Brand page → **Gift** → pick a friend (existing @username search) → amount → optional message.
- `POST /api/gifts/quote` and `/api/gifts/execute`: same payment as a buy, but shares go to the recipient's holdings, tagged `gift: { from, message }`.
- Recipient: a gift card on Home ("🎁 Sudeep sent you $10 of Spotify") that opens the brand page.
- Version 1 gifts only to people already on Sprout. Claim links for others come later.

### Step 7: Coach on Gemini (M)
- Swap the AI provider in `src/lib/server/ai.ts` from Anthropic to Gemini. Env: `GEMINI_API_KEY`, `GEMINI_MODEL` (a current Flash model), `AI_MODE=live`.
- New **Coach** tab: a chat with suggested questions ("What does owning a stock mean?", "Why do people buy index funds?").
- Context sent: your brands and holdings (symbols and amounts only, no personal details).
- Guardrails (system prompt plus checks): education only, no buy/sell advice, no promised returns, short answers, and a nudge to a lesson.
- Rate limit per user. If Gemini fails, show a friendly message and suggest a lesson.
- Brand explanations can use Gemini too, falling back to the prewritten text.

### Step 8: Learn (S)
- Reorder: investing lessons first. Add "Liking a brand vs. owning the stock" and "Why one index fund beats one favorite brand".
- Move the international-student lessons to an optional track.

### Step 9: Pitch and docs (S)
- Deck: new problem, solution and "How money moves" slides (buy, sell and gift over Interledger). Keep the revenue slide.
- Update `docs/technical-design.md`, `docs/pitch-qa.md` and `docs/pitch-deck-prompt.md`.

## 4. Testing
- Typecheck, lint and the existing end-to-end tests in mock mode, updated for the new tabs.
- Live test on the Interledger test network with two accounts:
  1. Connect wallet → buy $5 of a brand
  2. Sell it → payout arrives
  3. Gift $5 to the other account → it shows on their Home
- Check the coach refuses "Should I buy Tesla?" and still explains what a stock is.

## 5. Setup needed from you
1. Create the test wallet `sprout-treasury` on wallet.interledger-test.dev and add test money to it.
2. After Step 5 ships, open the admin page once to approve Sprout's wallet.
3. Get a Gemini API key from Google AI Studio and add `GEMINI_API_KEY` in Vercel.

## 6. Open questions (defaults in bold)
- Smallest buy: **$1**
- Gifts to people not on Sprout yet: **later**
- Brand logos: **colored monograms**, no trademarked logos
- Keep plain send and request: **yes, inside Wallet, not pitched**
