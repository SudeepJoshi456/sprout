/**
 * Catalog of assets available in practice mode.
 *
 * `about` is the prewritten plain-language description used when AI is off or
 * unavailable. Keep it at an ~8th-grade reading level and free of advice.
 */
export type AssetKind = "etf" | "stock";

export interface TickerInfo {
  symbol: string;
  name: string;
  kind: AssetKind;
  sector: string;
  about: string;
}

export const TICKERS: TickerInfo[] = [
  // Index funds and broad ETFs
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", kind: "etf", sector: "Index fund", about: "One fund that holds about 500 of the biggest US companies. When you buy a slice, you own a tiny piece of all of them at once, so no single company decides how you do." },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", kind: "etf", sector: "Index fund", about: "The oldest fund that tracks the S&P 500, a list of about 500 large US companies. It moves roughly with the overall US stock market." },
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", kind: "etf", sector: "Index fund", about: "Holds almost every public company in the US, big and small (about 3,500). It is one of the most spread-out ways to own the US market." },
  { symbol: "QQQ", name: "Invesco QQQ Trust", kind: "etf", sector: "Index fund", about: "Tracks 100 large companies on the Nasdaq exchange. It leans heavily toward technology, so it can rise and fall faster than the broad market." },
  { symbol: "VT", name: "Vanguard Total World Stock ETF", kind: "etf", sector: "Index fund", about: "Owns thousands of companies across the US and the rest of the world in one fund. Good for seeing how a truly global mix behaves." },
  { symbol: "VXUS", name: "Vanguard Total International Stock ETF", kind: "etf", sector: "Index fund", about: "Holds companies outside the US, in Europe, Asia, and emerging markets. People often pair it with a US fund to spread out their risk." },
  { symbol: "SCHD", name: "Schwab US Dividend Equity ETF", kind: "etf", sector: "Index fund", about: "Holds about 100 US companies with a history of paying dividends, which are small cash payments companies share with owners." },
  { symbol: "BND", name: "Vanguard Total Bond Market ETF", kind: "etf", sector: "Bond fund", about: "A fund of thousands of US bonds, which are loans to governments and companies. It usually moves much less than stocks." },
  // Companies you use every day
  { symbol: "AAPL", name: "Apple", kind: "stock", sector: "Technology", about: "Makes the iPhone, Mac, and AirPods, and earns money from services like the App Store and iCloud." },
  { symbol: "MSFT", name: "Microsoft", kind: "stock", sector: "Technology", about: "Makes Windows, Office, and Xbox, and runs Azure, a large cloud service that other businesses rent computing power from." },
  { symbol: "AMZN", name: "Amazon", kind: "stock", sector: "Retail & cloud", about: "Runs the Amazon online store and AWS, a cloud business that powers many apps and websites you use." },
  { symbol: "GOOGL", name: "Alphabet (Google)", kind: "stock", sector: "Technology", about: "Owns Google Search, YouTube, Android, and Google Cloud. Most of its money comes from ads." },
  { symbol: "META", name: "Meta Platforms", kind: "stock", sector: "Technology", about: "Owns Facebook, Instagram, and WhatsApp. It earns most of its money by showing ads to people who use these apps." },
  { symbol: "NVDA", name: "NVIDIA", kind: "stock", sector: "Technology", about: "Designs chips used in gaming computers and in the data centers that train and run AI tools." },
  { symbol: "TSLA", name: "Tesla", kind: "stock", sector: "Automotive", about: "Makes electric cars and batteries. Its price often moves a lot in a short time, which makes it a volatile stock." },
  { symbol: "NFLX", name: "Netflix", kind: "stock", sector: "Entertainment", about: "A streaming service that earns money from monthly subscriptions and, more recently, ads." },
  { symbol: "SPOT", name: "Spotify", kind: "stock", sector: "Entertainment", about: "A music and podcast streaming app. It earns money from Premium subscriptions and ads on the free plan." },
  { symbol: "DIS", name: "Walt Disney", kind: "stock", sector: "Entertainment", about: "Owns Disney movies, Marvel, Pixar, ESPN, Disney+ streaming, and theme parks around the world." },
  { symbol: "SBUX", name: "Starbucks", kind: "stock", sector: "Restaurants", about: "Runs tens of thousands of coffee shops worldwide and sells packaged coffee in grocery stores." },
  { symbol: "MCD", name: "McDonald's", kind: "stock", sector: "Restaurants", about: "The fast-food chain. Most restaurants are run by franchise owners who pay McDonald's rent and fees." },
  { symbol: "KO", name: "Coca-Cola", kind: "stock", sector: "Consumer staples", about: "Sells Coke, Sprite, and many other drinks in more than 200 countries. People keep buying drinks in good and bad times." },
  { symbol: "PEP", name: "PepsiCo", kind: "stock", sector: "Consumer staples", about: "Sells Pepsi plus snacks like Lay's and Doritos and foods like Quaker Oats." },
  { symbol: "COST", name: "Costco", kind: "stock", sector: "Retail", about: "Runs membership warehouse stores. A big part of its profit comes from yearly membership fees." },
  { symbol: "WMT", name: "Walmart", kind: "stock", sector: "Retail", about: "The largest retailer in the US, selling groceries and everyday goods in stores and online." },
  { symbol: "TGT", name: "Target", kind: "stock", sector: "Retail", about: "A US store chain selling groceries, clothing, and home goods in stores and online." },
  { symbol: "NKE", name: "Nike", kind: "stock", sector: "Apparel", about: "Designs and sells sneakers, sportswear, and equipment worldwide." },
  { symbol: "UBER", name: "Uber", kind: "stock", sector: "Transportation", about: "An app for rides and food delivery (Uber Eats). It takes a cut of each trip or order." },
  { symbol: "ABNB", name: "Airbnb", kind: "stock", sector: "Travel", about: "An app where people book stays in homes. It earns a fee from guests and hosts on each booking." },
  { symbol: "JPM", name: "JPMorgan Chase", kind: "stock", sector: "Banking", about: "The largest bank in the US. It runs Chase checking accounts and credit cards and serves big businesses." },
  { symbol: "V", name: "Visa", kind: "stock", sector: "Payments", about: "Runs the network that moves money when you tap a Visa card. It earns a small fee on each payment, not interest." },
];

export const TICKER_MAP: Record<string, TickerInfo> = Object.fromEntries(
  TICKERS.map((t) => [t.symbol, t]),
);

/** Curated beginner lists shown in Explore. */
export const CURATED_LISTS = [
  {
    id: "index-funds-101",
    titleKey: "grow.lists.indexFunds",
    symbols: ["VOO", "VTI", "VT", "VXUS", "SCHD", "BND"],
  },
  {
    id: "everyday",
    titleKey: "grow.lists.everyday",
    symbols: ["AAPL", "SPOT", "NFLX", "SBUX", "COST", "NKE", "UBER", "KO"],
  },
  {
    id: "big-tech",
    titleKey: "grow.lists.bigTech",
    symbols: ["MSFT", "GOOGL", "AMZN", "NVDA", "META"],
  },
] as const;
