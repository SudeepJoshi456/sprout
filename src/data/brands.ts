/**
 * Brands students know, each tied to the public company behind it.
 *
 * The brand is the way in, not a recommendation: every entry teaches how the
 * company makes money and what could go wrong, at an ~8th-grade reading level.
 * Facts are general and written to stay true for a while; the UI labels them
 * "as of 2025" and never tells anyone to buy.
 *
 * Every symbol here must exist in `tickers.ts` and the market snapshot so the
 * brand page always has a price and a chart.
 */
export interface BrandCheck {
  /** Is it making money? */
  profit: string;
  /** Is it growing? */
  growth: string;
  /** One real risk an owner should know about. */
  risk: string;
}

export interface Brand {
  symbol: string;
  /** What people call it. */
  name: string;
  /** Products students recognize, shown under the name. */
  known: string;
  /** Monogram tile background (a hex color; text on it is white). */
  color: string;
  /** How the company makes money, in one or two plain sentences. */
  howItMakesMoney: string;
  check: BrandCheck;
  /** In the S&P 500, so an S&P 500 index fund like VOO already owns a slice. */
  inSP500: boolean;
}

export const BRANDS: Brand[] = [
  {
    symbol: "AAPL",
    name: "Apple",
    known: "iPhone, AirPods, Mac",
    color: "#1F2937",
    howItMakesMoney: "Most of its money comes from selling iPhones. A growing share comes from services you pay for every month, like iCloud, Apple Music and the App Store.",
    check: {
      profit: "One of the most profitable companies in the world.",
      growth: "Services like iCloud and the App Store keep growing.",
      risk: "It still depends heavily on people buying new iPhones.",
    },
    inSP500: true,
  },
  {
    symbol: "NKE",
    name: "Nike",
    known: "Sneakers, Jordan, sportswear",
    color: "#111827",
    howItMakesMoney: "Sells shoes and clothes through its own stores and app, and through stores like Foot Locker. Famous athletes help sell the brand.",
    check: {
      profit: "Profitable for decades.",
      growth: "Sales have slowed recently as newer brands like On and Hoka grew.",
      risk: "Fashion changes fast, and rivals are taking customers.",
    },
    inSP500: true,
  },
  {
    symbol: "SPOT",
    name: "Spotify",
    known: "Music and podcasts",
    color: "#15803D",
    howItMakesMoney: "Charges Premium subscribers every month and shows ads to free listeners.",
    check: {
      profit: "Only recently started making a steady profit.",
      growth: "Keeps adding subscribers around the world.",
      risk: "It pays a large share of what it earns to record labels.",
    },
    inSP500: false,
  },
  {
    symbol: "SBUX",
    name: "Starbucks",
    known: "Coffee, Frappuccinos",
    color: "#065F46",
    howItMakesMoney: "Sells drinks and food in tens of thousands of cafes, plus coffee sold in grocery stores.",
    check: {
      profit: "Profitable, with millions of loyal app users.",
      growth: "US store sales have slowed, and a new CEO is working on a turnaround.",
      risk: "Coffee prices, wages and cheaper rivals squeeze its profits.",
    },
    inSP500: true,
  },
  {
    symbol: "NFLX",
    name: "Netflix",
    known: "Shows and movies",
    color: "#B91C1C",
    howItMakesMoney: "Monthly subscriptions, plus a cheaper plan with ads.",
    check: {
      profit: "Solidly profitable.",
      growth: "Its ad plan and limits on password sharing brought in new members.",
      risk: "Making shows is expensive, and YouTube and other streamers compete for your time.",
    },
    inSP500: true,
  },
  {
    symbol: "TGT",
    name: "Target",
    known: "Stores and Target.com",
    color: "#C2410C",
    howItMakesMoney: "Sells everyday goods, clothes and home items in stores and online.",
    check: {
      profit: "Profitable, but it keeps only a few cents of each dollar it sells.",
      growth: "Sales have been mostly flat lately.",
      risk: "It competes on price with Walmart and Amazon.",
    },
    inSP500: true,
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    known: "Shopping, Prime, Twitch",
    color: "#B45309",
    howItMakesMoney: "Its online store brings in the most sales, but most of its profit comes from AWS, which rents computing power to other companies, and from ads.",
    check: {
      profit: "Very profitable, mostly thanks to AWS.",
      growth: "Cloud computing and ads keep growing.",
      risk: "Online shopping earns thin profits, and regulators watch it closely.",
    },
    inSP500: true,
  },
  {
    symbol: "DIS",
    name: "Disney",
    known: "Disney+, Marvel, theme parks",
    color: "#1D4ED8",
    howItMakesMoney: "Theme parks and cruises, movies, Disney+ and ESPN, and merchandise from characters you know.",
    check: {
      profit: "Profitable, with parks earning a big share.",
      growth: "Its streaming business has turned profitable.",
      risk: "Cable TV, an old money maker, keeps shrinking.",
    },
    inSP500: true,
  },
  {
    symbol: "KO",
    name: "Coca-Cola",
    known: "Coke, Sprite, Dasani",
    color: "#DC2626",
    howItMakesMoney: "Sells drink syrups and brands to bottlers around the world, who make and deliver the drinks.",
    check: {
      profit: "Very profitable and steady.",
      growth: "Grows slowly, and it pays owners a dividend.",
      risk: "More people are cutting back on sugary drinks.",
    },
    inSP500: true,
  },
  {
    symbol: "MCD",
    name: "McDonald's",
    known: "Burgers, fries, McFlurry",
    color: "#CA8A04",
    howItMakesMoney: "Most restaurants are run by franchise owners, who pay McDonald's rent and a share of their sales.",
    check: {
      profit: "Very profitable, thanks to franchise fees and rent.",
      growth: "Steady, with growth around the world.",
      risk: "When prices rise, budget-minded customers eat out less.",
    },
    inSP500: true,
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    known: "Electric cars",
    color: "#991B1B",
    howItMakesMoney: "Sells electric cars, plus home batteries, solar panels and software.",
    check: {
      profit: "Profitable, but profits have dropped recently.",
      growth: "Car sales have slowed as competition grew.",
      risk: "Its stock swings a lot, and it depends heavily on its CEO.",
    },
    inSP500: true,
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    known: "Xbox, Windows, Office",
    color: "#0369A1",
    howItMakesMoney: "Office and Windows subscriptions, Xbox, and Azure, a cloud service businesses rent.",
    check: {
      profit: "One of the most profitable companies in the world.",
      growth: "Azure cloud and AI products are growing fast.",
      risk: "It is spending huge amounts on AI that need to pay off.",
    },
    inSP500: true,
  },
  {
    symbol: "GOOGL",
    name: "Google",
    known: "Search, YouTube, Android",
    color: "#2563EB",
    howItMakesMoney: "Most of its money comes from ads on Google Search and YouTube. Its company name is Alphabet.",
    check: {
      profit: "Very profitable, mostly from ads.",
      growth: "YouTube and Google Cloud keep growing.",
      risk: "AI chatbots and government lawsuits could hurt its search business.",
    },
    inSP500: true,
  },
  {
    symbol: "META",
    name: "Instagram",
    known: "Instagram, WhatsApp, Facebook",
    color: "#BE185D",
    howItMakesMoney: "Shows ads on Instagram, Facebook and WhatsApp. Its company name is Meta.",
    check: {
      profit: "Very profitable, mostly from ads.",
      growth: "Ad sales keep growing.",
      risk: "It spends billions on AI and virtual reality, and faces privacy rules.",
    },
    inSP500: true,
  },
  {
    symbol: "COST",
    name: "Costco",
    known: "Warehouse club",
    color: "#1E40AF",
    howItMakesMoney: "Members pay a yearly fee to shop. It sells in bulk at low prices, and fees bring in much of its profit.",
    check: {
      profit: "Steadily profitable.",
      growth: "Membership keeps growing, and most members renew.",
      risk: "Its stock often costs a lot compared with what it earns.",
    },
    inSP500: true,
  },
  {
    symbol: "UBER",
    name: "Uber",
    known: "Rides, Uber Eats",
    color: "#27272A",
    howItMakesMoney: "Keeps a cut of every ride and food delivery booked in the app.",
    check: {
      profit: "Only became profitable in the last few years.",
      growth: "Rides and deliveries keep growing.",
      risk: "Self-driving cars and new rules for drivers could change its business.",
    },
    inSP500: true,
  },
  {
    symbol: "ABNB",
    name: "Airbnb",
    known: "Places to stay",
    color: "#E11D48",
    howItMakesMoney: "Charges guests and hosts a fee on each booking.",
    check: {
      profit: "Profitable.",
      growth: "Grows with travel around the world.",
      risk: "Many cities limit short-term rentals.",
    },
    inSP500: true,
  },
  {
    symbol: "PEP",
    name: "Pepsi",
    known: "Pepsi, Doritos, Gatorade",
    color: "#1D4ED8",
    howItMakesMoney: "Sells drinks and snacks. Frito-Lay chips like Doritos and Cheetos bring in a big share.",
    check: {
      profit: "Very profitable.",
      growth: "Grows slowly, and it pays owners a dividend.",
      risk: "People are choosing healthier food and drinks.",
    },
    inSP500: true,
  },
  {
    symbol: "WMT",
    name: "Walmart",
    known: "Stores, Walmart+",
    color: "#2563EB",
    howItMakesMoney: "The biggest retailer in the world. Groceries are a large part of its sales.",
    check: {
      profit: "Profitable, but it keeps only a few cents of each dollar.",
      growth: "Online orders and ads on its website are growing.",
      risk: "Thin profits leave little room for mistakes.",
    },
    inSP500: true,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    known: "Gaming graphics cards, AI chips",
    color: "#4D7C0F",
    howItMakesMoney: "Designs chips. Gamers know its graphics cards, but most of its money now comes from chips that power AI.",
    check: {
      profit: "Its profits have exploded with the AI boom.",
      growth: "Demand for AI chips has grown very fast.",
      risk: "If companies spend less on AI, its sales and stock could drop sharply.",
    },
    inSP500: true,
  },
];

export const BRAND_MAP: Record<string, Brand> = Object.fromEntries(BRANDS.map((b) => [b.symbol, b]));
export const BRAND_SYMBOLS = BRANDS.map((b) => b.symbol);
/** The fund used to show "one fund owns most of your brands". */
export const SP500_FUND = "VOO";
export const MIN_BRANDS = 3;
