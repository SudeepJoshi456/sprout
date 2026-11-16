# Sprout Demo Day: Q&A cheat sheet

**1. What is Interledger?**
An open standard for sending payments between different wallets and networks, like email for money. Sprout uses Open Payments, the web API built on it.

**2. How does a payment work?**
Sprout creates an incoming payment at the receiver's wallet, gets a quote with the exact amount and fees, then creates the outgoing payment from the sender's wallet. The user sees the quote on a review screen before confirming.

**3. How does Sprout get permission to move my money?**
You approve a spending limit (for example $50) in your own wallet, using the GNAP authorization standard. Sprout never sees your wallet password, and you can revoke access anytime.

**4. Is this real money?**
Not yet. Payments are live on the Interledger test network with play money, and the app says so before every send.

**5. Are you a money transmitter? Do you need a license?**
Sprout never holds customer money. In the production plan, a licensed wallet partner holds funds and moves money. We'll confirm the exact setup with legal before real money.

**6. Who does identity checks?**
The licensed wallet partner: identity verification (KYC), anti-money-laundering and sanctions screening at sign-up.

**7. How are accounts protected?**
Passwords are hashed with scrypt, session tokens are stored only as hashes, and sign-up and login are rate-limited. Wallet access tokens stay on the server only.

**8. What stops double charges or a changed amount?**
Quotes are signed, so the amount can't be tampered with between review and send. Sends are idempotent: a retry charges once.

**9. What if Sprout's server were hacked?**
Stored access is capped at each user's approved spending limit, and users can revoke it in their wallet. Before real money: encrypt stored tokens, rotate keys and add monitoring.

**10. How do you make money?**
Hypothetically, with 1,000 active members: 20% pay $6.99/mo for premium ($1,398), plus a 1.75% fee on an average $25 monthly transfer ($437.50). That's $1,835.50 a month, about $22,026 a year, before sponsorships or grants.

**11. Why pay 1.75% when Venmo is free?**
The fee applies to certain transfers, like instant cash-out or cross-currency, while basic transfers between friends stay free. [team to confirm]

**12. Is the bank link real?**
No. It's a labeled preview of the planned Plaid flow.

**13. Is the AI coach giving financial advice?**
No. Investing in Sprout is practice-only, and the coach is blocked from personal investment advice or promising returns.

## Placeholders and assumptions

- **Venmo fee answer** is marked [team to confirm]: which transfers carry the 1.75% fee isn't decided.
- **Revenue numbers** are the team's hypothetical (1,000 members, 20% premium, one $25 transfer a month). What premium includes isn't defined yet.
- **Wallet partner and Plaid** are planned, not signed. Don't name a specific partner.
- **QR code** was generated for https://sprout-psi-six.vercel.app/ but hasn't been scanned with a phone yet.
