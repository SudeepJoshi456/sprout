# Prompt: build the Sprout Demo Day pitch deck

Copy everything below the line into your agent.

---

You are helping build a **2-minute pitch deck** for **Sprout**, a student team's app being presented at **Dollarcraft Demo Day**. Build the deck end to end: slide content, design, speaker notes, and a QR code on the last slide. Use only the facts in this brief. Do **not** invent statistics, user numbers, quotes, partners or features. If something is missing, leave a clearly marked placeholder like `[__]` and list it at the end.

## 1. The idea in one line

Sprout is a money app for students that helps them **send, budget and grow** their money. Payments run on **Interledger** (an open payment standard), and the app teaches money habits while you use it.

## 2. The problem

Students already move money every day, but payments, budgeting and learning about investing live in separate apps, and nothing helps them actually manage money. (No statistics are available; don't add any.)

## 3. What the product does (built and live)

Live site: **https://sprout-psi-six.vercel.app/**

- **Send and request:** pay a friend by @username or wallet address. These are **real wallet-to-wallet payments on the Interledger test network** (play money, not real dollars). Both sides see real names, for example "From Maya (@maya)", and there's a review screen with the amount, fee and a test-money notice before every send. Requests can be shared as a link or QR code.
- **Budget:** wallet payments show up in the budget automatically. Users can add cash expenses by hand, set category limits and track bills.
- **Grow:** short money lessons and a **practice** investing portfolio (play money only, no real investing). An AI coach answers questions but is blocked from giving personal investment advice or promising returns.
- **Activity:** Home shows live wallet activity with details and a "See all" page.
- **Add money / Cash out (preview):** a simulated bank link and transfer flow, clearly labeled "Preview", showing the planned Plaid flow.

## 4. How it works (the "Option B" plan)

Flow: **Your bank → Sprout wallet → Any wallet**

1. **Bank:** connected with **Plaid** (planned; preview today).
2. **Sprout wallet:** created at sign-up and held by a **licensed wallet partner**, which also does identity checks (KYC, anti-money-laundering, sanctions). **Sprout never holds customer money.**
3. **Any wallet:** payments travel over **Interledger / Open Payments**, so any compliant wallet can pay any other. Think of it as "email for money".

**Live today:** wallet-to-wallet payments on the Interledger test network. **Not live yet:** real money, the bank link and the wallet partner.

How a payment works, if asked:
- Sprout creates an *incoming payment* at the receiver's wallet, gets a *quote* (exact amount and fees), then creates an *outgoing payment* from the sender's wallet.
- The user approves a **spending limit** (for example $50) in their own wallet, using the GNAP authorization standard. Sprout never sees their wallet password and they can revoke access anytime.

## 5. Security and compliance (keep it short on slides)

- **You set the limit:** spending limit approved in your own wallet, revocable anytime.
- **Licensed partner:** holds funds and verifies identity; Sprout holds no money.
- **Clear by design:** 18+ consent with Terms and Privacy at sign-up (date and version recorded), plain disclosures ("test network, play money, not a bank"), a review before every send.
- **Behind the scenes:** passwords hashed with scrypt, hashed session tokens, rate limits, signed quotes so amounts can't be tampered with, idempotent sends so there are no double charges, wallet tokens kept only on the server.

**Never say on slides:** "bank", "FDIC insured", "we hold your money", "fully compliant", "licensed" (about Sprout itself), "investment advice", "guaranteed returns". Say instead: "test network", "licensed partner", "preview", "we'll confirm with legal before real money".

## 6. Business model (must be its own slide; these are the team's numbers)

Hypothetical, 1,000 active members:

| Stream | Assumption | Monthly |
|---|---|---|
| Premium subscription | 20% subscribe (200 people) at $6.99/mo | $1,398.00 |
| Transfer fee | Each member makes 1 transfer/mo averaging $25, 1.75% fee | $437.50 |
| **Total** | Before sponsorships or grants | **$1,835.50/mo ≈ $22,026/yr** |

Label it **"Hypothetical"** on the slide. Show it as a simple sum (Premium + Fees = Total) with big numbers, not a dense table.

Likely question: "Why pay 1.75% when Venmo is free?" Prepare a short answer in the notes, for example that the fee applies to certain transfers (instant cash-out or cross-currency) while basic transfers between friends stay free. Mark it `[team to confirm]`.

## 7. Deck structure (7 slides, about 15–20 seconds each)

1. **Cover:** "Sprout", "Dollarcraft Demo Day", the subtitle "The money app that helps students send, budget and grow", and the team's Sprout logo.
2. **The problem + Why Sprout (must stand out):** a bold accent slide, lime `#C7F07A` background with dark green text. Headline: "Students move money every day. Nobody teaches them to manage it." Underneath, "Why Sprout" with three dark green cards: One app (pay, budget and learn in one place) / Zero effort (every payment updates your budget) / Learn by doing (practice investing with play money).
3. **One app, three habits:** three cards: Send / Budget / Grow, one line each.
4. **How the money moves:** Bank (Plaid) → Sprout wallet (licensed partner) → Any wallet (Interledger), plus one line: "Today: live wallet-to-wallet payments on the Interledger test network. Bank link is a preview."
5. **Built to be trusted:** three cards: You set the limit / Licensed partner / Clear by design.
6. **How Sprout makes money:** the revenue sum from section 6.
7. **Try it live:** a large QR code for https://sprout-psi-six.vercel.app/, the URL in text, and "Scan to grow with Sprout".

Rules: one idea per slide, very little text (aim for no more than about 25 words per slide, except the revenue numbers), no bullet walls, and speaker notes on every slide (2–4 sentences, plain speech).

## 8. Design

- Feel: friendly, clean, student-focused fintech.
- Colors: dark green `#14532D` (cover and last slide backgrounds), light `#F4F8EE` (content slide backgrounds), accent green `#1F7A45`, lime highlight `#C7F07A` (only on dark green), white cards `#FFFFFF` with a soft border `#D6E6CF`, body text `#3F5A47`.
- Typeface: **DM Sans** (bold headings, regular body).
- 16:9. Large type: headings around 88px and body at least 28px on a 1920×1080 canvas, so it reads from the back of a room.
- Simple icons are fine (paper plane, chart, graduation cap, lock, check badge). No stock photos.

## 9. QR code

Generate a QR code for `https://sprout-psi-six.vercel.app/` with high error correction, dark green `#14532D` on white, in a white rounded tile on the dark last slide. Scan it once to confirm it opens the site.

## 10. Deliverables

1. The 7-slide deck (editable, plus PDF and PowerPoint export if your tool supports it).
2. Speaker notes for every slide that fit 2 minutes in total, about 300 words.
3. A short Q&A cheat sheet (about 10 questions) covering Interledger, security, compliance and the business model, using only the facts above.
4. A list of every placeholder or assumption you made.

Don't do anything outside this deck: don't change the app or its code, and don't publish or share anything without asking.
