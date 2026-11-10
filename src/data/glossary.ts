/**
 * Plain-language definitions. Any <Term id="..."> in the UI opens one of these.
 * `newcomer` adds context for people new to the US system.
 */
export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
  newcomer?: string;
  lessonId?: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { id: "ssn", term: "SSN (Social Security Number)", definition: "A 9-digit US ID number for people allowed to work in the US. Used for jobs, taxes, and credit.", newcomer: "Many visa holders can get one once they have work permission. You don't need one to use Sprout.", lessonId: "ssn-vs-itin" },
  { id: "itin", term: "ITIN", definition: "Individual Taxpayer Identification Number. A 9-digit number from the IRS for people who need to file US taxes but can't get an SSN.", lessonId: "ssn-vs-itin" },
  { id: "credit-score", term: "Credit score", definition: "A number from 300 to 850 that estimates how reliably you repay borrowed money. Lenders, landlords, and phone companies may check it.", newcomer: "Credit history from other countries usually doesn't carry over, so most newcomers start with no score.", lessonId: "credit-new" },
  { id: "utilization", term: "Credit utilization", definition: "How much of your credit limit you're using. $300 on a $1,000 limit is 30%. Lower is better for your score.", lessonId: "first-credit-card" },
  { id: "routing-number", term: "Routing number", definition: "A 9-digit number that identifies your bank, used for direct deposit and bank transfers.", newcomer: "It's like a bank's address. Your account number identifies you within that bank.", lessonId: "us-banking-basics" },
  { id: "apr", term: "APR", definition: "Annual percentage rate: the yearly cost of borrowing, like credit card interest. A 25% APR is expensive.", lessonId: "first-credit-card" },
  { id: "f1", term: "F-1 visa", definition: "A US visa for full-time international students. Work is limited, usually to on-campus jobs or approved training like OPT." },
  { id: "i20", term: "I-20", definition: "A form your school issues that shows you're admitted as an F-1 or M-1 student. You'll often be asked for it alongside your passport." },
  { id: "stock", term: "Stock", definition: "A small piece of ownership in a company. Its price moves as people's expectations about the company change.", lessonId: "what-is-a-stock" },
  { id: "share", term: "Share", definition: "One unit of a stock or fund. Sprout lets you buy fractions of a share by dollar amount.", lessonId: "what-is-a-stock" },
  { id: "fractional-share", term: "Fractional share", definition: "Part of a share. $50 of a $700 stock is about 0.071 shares.", lessonId: "what-is-a-stock" },
  { id: "index-fund", term: "Index fund", definition: "A fund that holds every company in a list, like the S&P 500. One purchase spreads your money across many companies.", lessonId: "index-funds" },
  { id: "etf", term: "ETF", definition: "Exchange-traded fund: a fund you can buy and sell like a stock. Many index funds are ETFs.", lessonId: "index-funds" },
  { id: "sp500", term: "S&P 500", definition: "A list of about 500 large US companies. People use it as a quick measure of how the US stock market is doing.", lessonId: "index-funds" },
  { id: "expense-ratio", term: "Expense ratio", definition: "The yearly fee a fund charges, as a percent of what you invest. 0.03% means $0.30 a year per $1,000.", lessonId: "index-funds" },
  { id: "diversification", term: "Diversification", definition: "Spreading money across many investments so one bad result doesn't sink everything.", lessonId: "diversification" },
  { id: "concentration-risk", term: "Concentration risk", definition: "The extra risk of having a big share of your money in one company or industry.", lessonId: "diversification" },
  { id: "dividend", term: "Dividend", definition: "A cash payment some companies make to shareholders, usually every three months." },
  { id: "market-cap", term: "Market cap", definition: "A company's total value on the stock market: share price × number of shares." },
  { id: "52-week-range", term: "52-week range", definition: "The lowest and highest price over the past year. It shows how much the price has swung." },
  { id: "volatility", term: "Volatility", definition: "How much and how fast a price moves up and down. Higher volatility means bigger swings both ways.", lessonId: "market-dips" },
  { id: "bond", term: "Bond", definition: "A loan you make to a government or company in exchange for interest. Usually steadier than stocks." },
  { id: "delayed-price", term: "Delayed price", definition: "Free market data is often 15 minutes or more behind. Sprout labels every price with when it's from." },
  { id: "portfolio", term: "Portfolio", definition: "Everything you've invested in, taken together." },
  { id: "sprout-seeds", term: "Practice money", definition: "Fake money for learning to invest. You start with $10,000 of it. Practice money has no cash value and can't be withdrawn, traded, or turned into prizes." },
  { id: "compound-growth", term: "Compound growth", definition: "Earning returns on your past returns, so growth speeds up over time.", lessonId: "compound-growth" },
  { id: "open-payments", term: "Open Payments", definition: "An open standard that lets apps send and receive money between wallets and banks that support it." },
  { id: "interledger", term: "Interledger", definition: "A protocol that connects different payment networks so money can move between them, even across currencies." },
  { id: "wallet-address", term: "Wallet address", definition: "A web address (like https://ilp.example/sudeep) that identifies an Open Payments account. Share it to get paid." },
  { id: "exchange-rate", term: "Exchange rate", definition: "How much of one currency you get for another. Sprout compares it to the mid-market rate so hidden markups are visible.", lessonId: "send-home" },
  { id: "mid-market-rate", term: "Mid-market rate", definition: "The 'real' exchange rate halfway between buy and sell prices. Many services quietly give you a worse rate.", lessonId: "send-home" },
  { id: "safe-to-spend", term: "Safe to spend", definition: "Your balance minus money set aside for bills and the rest of your essentials budget. It's what you can spend without short-changing a bill." },
  { id: "set-aside", term: "Set aside", definition: "Money you've protected for a specific bill. Sprout won't count it as spendable until the bill is paid." },
  { id: "emergency-fund", term: "Emergency fund", definition: "Savings kept safe and easy to reach for surprises like repairs or travel.", lessonId: "emergency-fund" },
];

export const GLOSSARY_MAP: Record<string, GlossaryEntry> = Object.fromEntries(GLOSSARY.map((g) => [g.id, g]));
