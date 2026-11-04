/**
 * Prewritten lessons. These are the fallback whenever AI_MODE=mock or the AI
 * call fails, and they define the topic catalog AI lessons are generated for.
 *
 * Writing rules: ≤ 40 words per card, ~8th-grade reading level, no
 * personalized buy/sell advice, explain US-specific terms.
 */
import type { LessonContent, LessonSummary } from "@/lib/types";

export interface LessonMeta {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  track: LessonSummary["track"];
  /** Prompt hint for AI generation. */
  topic: string;
}

type Prewritten = Omit<LessonContent, "source">;

export const LESSONS: Prewritten[] = [
  {
    id: "credit-new",
    title: "How US credit scores work when you're new",
    summary: "Why you start with no score, and the safest ways to build one.",
    minutes: 2,
    cards: [
      { title: "A score from 300 to 850", body: "In the US, lenders use a credit score to guess how likely you are to pay back money. Higher is better. Landlords and phone companies check it too.", icon: "gauge", tone: "green" },
      { title: "New here? You start blank", body: "Your credit history from home usually doesn't transfer. That's not a bad score. It's no score yet, often called being \"credit invisible.\"", icon: "globe", tone: "sky" },
      { title: "What moves your score", body: "Paying on time matters most, about 35%. How much of your limit you use is next, about 30%. Length of history and new accounts matter less.", icon: "list-checks", tone: "yellow" },
      { title: "Ways to start without an SSN", body: "Some banks offer secured cards with an ITIN or passport. You put down a deposit, say $200, and that becomes your limit. Use it lightly, pay in full.", icon: "credit-card", tone: "peach" },
      { title: "The habit that builds it", body: "Use under 30% of your limit and pay the full balance every month. After about six months of on-time payments, you'll usually have a score.", icon: "calendar-check", tone: "green" },
    ],
    quiz: [
      { question: "You just moved to the US. What's your credit score most likely to be?", options: ["Copied from your home country", "No score yet", "Automatically 300"], answerIndex: 1, explanation: "Most people start with no US credit file. That's different from a bad score." },
      { question: "Which habit matters most for your score?", options: ["Paying on time", "Opening many cards", "Checking your score often"], answerIndex: 0, explanation: "Payment history is the biggest factor, about 35% of a typical score." },
      { question: "Your secured card has a $200 limit. What's a healthy balance to carry when the bill comes?", options: ["$190", "Under $60", "It doesn't matter"], answerIndex: 1, explanation: "Staying under 30% of your limit, here $60, shows you use credit lightly." },
    ],
    action: { label: "See which bills Sprout helps you pay on time", href: "/budget" },
  },
  {
    id: "ssn-vs-itin",
    title: "SSN vs. ITIN: which one do you need?",
    summary: "Two US ID numbers, what each is for, and who can get them.",
    minutes: 2,
    cards: [
      { title: "Two kinds of US ID numbers", body: "A Social Security Number (SSN) is for people allowed to work in the US. An Individual Taxpayer Identification Number (ITIN) is for people who must file taxes but can't get an SSN.", icon: "id-card", tone: "sky" },
      { title: "Who gets an SSN", body: "Citizens, green card holders, and many visa holders with work permission, like F-1 students with an on-campus job or OPT. You apply at a Social Security office.", icon: "building", tone: "green" },
      { title: "Who gets an ITIN", body: "People with US tax filing needs who aren't eligible for an SSN, like some dependents or scholarship recipients. You apply with IRS form W-7.", icon: "file-text", tone: "yellow" },
      { title: "You can bank without either", body: "Some banks and apps, including Sprout, let you open an account with a passport and visa. You don't need to wait for an SSN to start.", icon: "wallet", tone: "peach" },
      { title: "Keep it safe", body: "Treat your SSN or ITIN like a password. Only share it when you know why it's needed, such as a job, taxes, or a credit application.", icon: "shield", tone: "plum" },
    ],
    quiz: [
      { question: "An F-1 student starts a paid on-campus job. Which number do they usually get?", options: ["An SSN", "An ITIN", "Neither"], answerIndex: 0, explanation: "Work permission makes you eligible for an SSN." },
      { question: "Which form do you use to apply for an ITIN?", options: ["I-20", "W-7", "W-2"], answerIndex: 1, explanation: "The IRS form W-7 is the ITIN application." },
    ],
    action: { label: "Review how you verified in Sprout", href: "/profile" },
  },
  {
    id: "send-home",
    title: "Sending money home without losing it to fees",
    summary: "Spot hidden costs in exchange rates and compare transfers honestly.",
    minutes: 2,
    cards: [
      { title: "Two places fees hide", body: "A transfer can cost you twice: a visible fee, and a worse exchange rate than the real one. The second is easy to miss.", icon: "search", tone: "yellow" },
      { title: "Find the real rate", body: "The mid-market rate is the one you see on Google or news sites. Compare it to the rate a service offers. The gap is a hidden fee.", icon: "scale", tone: "sky" },
      { title: "Do the math once", body: "Sending $500 at 151.90 Nepalese rupees per dollar should give NPR 75,950. If the receiver gets NPR 73,500, you paid about $16 in total costs.", icon: "calculator", tone: "green" },
      { title: "What Interledger changes", body: "Interledger connects different wallets and banks so money can move directly between them. Sprout shows the rate and fee before you confirm, every time.", icon: "send", tone: "peach" },
      { title: "Always check the review screen", body: "Before you tap send, check: amount sent, fee, rate, and amount received. If any of these is missing, ask why.", icon: "receipt", tone: "plum" },
    ],
    quiz: [
      { question: "Where can a transfer hide costs besides the fee?", options: ["The exchange rate", "The recipient's name", "The arrival time"], answerIndex: 0, explanation: "A rate worse than mid-market is a hidden cost." },
      { question: "What should a good review screen show before you send?", options: ["Only the amount", "Amount, fee, rate, and what they receive", "Just the fee"], answerIndex: 1, explanation: "Seeing everything up front lets you compare honestly." },
    ],
    action: { label: "Open Move to see a transfer quote", href: "/move" },
  },
  {
    id: "us-banking-basics",
    title: "US banking basics: checking, routing, and more",
    summary: "The words you'll hear when you open your first US account.",
    minutes: 2,
    cards: [
      { title: "Checking is for everyday money", body: "A checking account holds money you spend: rent, groceries, card payments. Most paychecks land here.", icon: "wallet", tone: "green" },
      { title: "Routing and account numbers", body: "A routing number identifies your bank (9 digits). Your account number identifies you. Employers need both to pay you by direct deposit.", icon: "hash", tone: "sky" },
      { title: "Debit vs. credit cards", body: "A debit card spends your own money right away. A credit card borrows money you repay later, and builds credit history if you pay on time.", icon: "credit-card", tone: "yellow" },
      { title: "Watch for overdraft fees", body: "If you spend more than you have, some banks charge around $35. Sprout shows \"safe to spend\" so you can see your real room first.", icon: "triangle-alert", tone: "peach" },
      { title: "Deposits are insured", body: "Money in a US bank is usually protected by FDIC insurance up to $250,000 if the bank fails. Practice money in Sprout is not real and not insured.", icon: "shield-check", tone: "plum" },
    ],
    quiz: [
      { question: "What does a routing number identify?", options: ["You", "Your bank", "Your card"], answerIndex: 1, explanation: "It's the bank's address in the US payment system." },
      { question: "A debit card spends…", options: ["Borrowed money", "Your own money", "Practice money"], answerIndex: 1, explanation: "Debit pulls directly from your account." },
    ],
    action: { label: "See your safe-to-spend number", href: "/home" },
  },
  {
    id: "first-credit-card",
    title: "Your first credit card",
    summary: "How cards work, what APR means, and how to never pay interest.",
    minutes: 2,
    cards: [
      { title: "A card is a short loan", body: "When you swipe a credit card, the bank pays the store. You pay the bank back later. If you pay it all by the due date, it's free.", icon: "credit-card", tone: "green" },
      { title: "APR is the cost of waiting", body: "APR is the yearly interest rate on money you don't pay back in time. Student cards often charge 20% to 29%. That adds up fast.", icon: "percent", tone: "yellow" },
      { title: "Statement balance vs. minimum", body: "The minimum payment keeps you in good standing but charges interest on the rest. Paying the full statement balance avoids interest entirely.", icon: "receipt", tone: "sky" },
      { title: "Keep usage low", body: "Using less than 30% of your limit helps your score. On a $1,000 limit, try to keep the balance under $300 when the statement closes.", icon: "gauge", tone: "peach" },
      { title: "Set it and forget it", body: "Turn on autopay for the full statement balance. One late payment can stay on your report for years.", icon: "calendar-check", tone: "green" },
    ],
    quiz: [
      { question: "How do you avoid paying interest on a credit card?", options: ["Pay the minimum", "Pay the full statement balance by the due date", "Use it only online"], answerIndex: 1, explanation: "Paying in full on time means no interest is charged." },
      { question: "Your limit is $1,000. Which balance is healthiest at statement time?", options: ["$250", "$800", "$1,000"], answerIndex: 0, explanation: "$250 keeps you under 30% of your limit." },
    ],
    action: { label: "Learn how scores work", href: "/learn/credit-new" },
  },
  {
    id: "index-funds",
    title: "Index funds in 3 minutes",
    summary: "Own hundreds of companies at once, with one purchase.",
    minutes: 3,
    cards: [
      { title: "One fund, many companies", body: "An index fund buys every company in a list, like the S&P 500's ~500 large US companies. One purchase gives you a sliver of all of them.", icon: "layers", tone: "green" },
      { title: "Why beginners like them", body: "If one company has a bad year, it's a small part of the fund. You don't need to pick winners to own the market.", icon: "shield", tone: "sky" },
      { title: "Low fees matter", body: "Funds charge a yearly fee called an expense ratio. Broad index funds often charge under 0.1%, or less than $1 a year per $1,000.", icon: "coins", tone: "yellow" },
      { title: "They still go down", body: "Index funds rise and fall with the market. In bad years they can drop 20% or more. They're built for years, not weeks.", icon: "trending-down", tone: "peach" },
      { title: "ETF is just the wrapper", body: "Many index funds trade like a stock and are called ETFs (exchange-traded funds). VOO and VTI are examples you can practice with.", icon: "package", tone: "plum" },
    ],
    quiz: [
      { question: "What does an S&P 500 index fund hold?", options: ["One big company", "About 500 large US companies", "Only bonds"], answerIndex: 1, explanation: "It follows the whole index, so you own a slice of each company." },
      { question: "Can index funds lose value?", options: ["No, never", "Yes, they move with the market", "Only on weekends"], answerIndex: 1, explanation: "Spreading out reduces risk but doesn't remove it." },
    ],
    action: { label: "Try it: buy $50 of an index fund in practice mode", href: "/grow/VOO?trade=buy&amount=50" },
  },
  {
    id: "diversification",
    title: "Concentration risk, explained",
    summary: "Why owning a few similar stocks is riskier than it feels.",
    minutes: 2,
    cards: [
      { title: "Eggs and baskets", body: "Concentration risk means a big share of your money depends on one company or one industry. If it stumbles, your whole portfolio feels it.", icon: "egg", tone: "yellow" },
      { title: "Similar isn't spread out", body: "Three tech stocks can fall together when tech has a rough month. Owning different industries, or a broad fund, spreads the risk.", icon: "network", tone: "sky" },
      { title: "A simple check", body: "Look at your largest holding. If it's more than half your invested money, one company is steering the ship.", icon: "pie-chart", tone: "green" },
      { title: "Funds do it for you", body: "A broad index fund already holds hundreds of companies across industries. That's why many people start there.", icon: "layers", tone: "peach" },
      { title: "Practice is the place to learn", body: "Sprout's diversification meter shows your mix in plain words. Try different mixes with play money and watch how they move.", icon: "sprout", tone: "plum" },
    ],
    quiz: [
      { question: "You own 3 tech stocks only. What's the main risk?", options: ["They may all drop together", "You'll pay more taxes", "There's no risk"], answerIndex: 0, explanation: "Similar companies often react to the same news." },
      { question: "Which is usually the most spread out?", options: ["One stock", "Two tech stocks", "A total-market index fund"], answerIndex: 2, explanation: "It holds thousands of companies across industries." },
    ],
    action: { label: "Check your diversification meter", href: "/grow" },
  },
  {
    id: "what-is-a-stock",
    title: "What is a stock, really?",
    summary: "Ownership, why prices move, and what \"delayed price\" means.",
    minutes: 2,
    cards: [
      { title: "A slice of a company", body: "A share of stock is a tiny piece of ownership. If the company grows and earns more, each slice can become worth more.", icon: "pie-chart", tone: "green" },
      { title: "Prices move on expectations", body: "The price changes when buyers and sellers change their minds about the company's future. News, earnings, and the economy all play a part.", icon: "trending-up", tone: "sky" },
      { title: "Fractional shares", body: "You don't need to buy a whole share. With $50 you can own 0.07 of a $700 share. Sprout's practice mode works this way too.", icon: "divide", tone: "yellow" },
      { title: "What \"delayed\" means", body: "Free price data is often 15 minutes behind the market. That's fine for learning. Sprout always labels when a price is from.", icon: "clock", tone: "peach" },
    ],
    quiz: [
      { question: "Owning a share means you…", options: ["Lent money to the company", "Own a small piece of it", "Work for it"], answerIndex: 1, explanation: "A share is partial ownership." },
      { question: "Can you buy $50 of a $700 stock?", options: ["Yes, as a fractional share", "No, you need $700", "Only on Fridays"], answerIndex: 0, explanation: "Fractional shares let you invest by dollar amount." },
    ],
    action: { label: "Read your first stock page", href: "/grow/AAPL?tour=stock-page" },
  },
  {
    id: "market-dips",
    title: "Why prices drop, and what to do when they do",
    summary: "Dips are normal. Here's how to think about them calmly.",
    minutes: 2,
    cards: [
      { title: "Dips are normal", body: "The US stock market has had a drop of 10% or more about once every year or two. Most recovered over time, though nothing is guaranteed.", icon: "trending-down", tone: "peach" },
      { title: "Selling locks it in", body: "A loss on paper becomes a real loss when you sell. Many beginners sell at the bottom out of fear.", icon: "lock", tone: "yellow" },
      { title: "Time is your cushion", body: "Money you'll need within a few years, like tuition or rent, shouldn't be in stocks. Invest only what can stay put through bad months.", icon: "hourglass", tone: "sky" },
      { title: "Practice the feeling", body: "Holding through a dip with play money teaches you how you'll react, without real risk. That's what Sprout's dip challenge is for.", icon: "sprout", tone: "green" },
    ],
    quiz: [
      { question: "When does a paper loss become a real loss?", options: ["When the price drops", "When you sell", "Never"], answerIndex: 1, explanation: "Until you sell, the price can still recover." },
      { question: "Which money is best kept out of stocks?", options: ["Next month's rent", "Money for 10+ years from now", "Practice money"], answerIndex: 0, explanation: "Short-term needs shouldn't ride market swings." },
    ],
    action: { label: "See your practice challenges", href: "/grow#challenges" },
  },
  {
    id: "emergency-fund",
    title: "Build an emergency fund",
    summary: "A cushion for surprises, sized for a student budget.",
    minutes: 2,
    cards: [
      { title: "What it's for", body: "An emergency fund covers surprises: a laptop repair, a flight home, a gap between jobs. It keeps you from using credit cards in a crisis.", icon: "life-buoy", tone: "sky" },
      { title: "Start tiny", body: "Aim for $500 first. Then build toward one month of essentials, then three. Small, automatic amounts beat big promises.", icon: "sprout", tone: "green" },
      { title: "Keep it boring", body: "Emergency money should be safe and easy to reach, not invested in stocks. A separate savings account works well.", icon: "piggy-bank", tone: "yellow" },
      { title: "Pay yourself first", body: "When money arrives, move a set amount to savings before spending. Even $10 a week is $520 a year.", icon: "hand-coins", tone: "peach" },
    ],
    quiz: [
      { question: "Where should an emergency fund usually live?", options: ["In stocks", "In a safe, easy-to-reach account", "In a credit card"], answerIndex: 1, explanation: "You need it to be there and stable when surprises hit." },
      { question: "$10 a week adds up to about how much in a year?", options: ["$120", "$520", "$1,000"], answerIndex: 1, explanation: "52 weeks × $10 = $520." },
    ],
    action: { label: "See what's safe to spend", href: "/budget" },
  },
  {
    id: "semester-budget",
    title: "Budgeting by semester",
    summary: "When money arrives in big chunks, spread it across the term.",
    minutes: 2,
    cards: [
      { title: "Lumpy money", body: "Students often get money in big chunks: family transfers, scholarships, loans. It can feel like a lot in September and very little in December.", icon: "calendar", tone: "sky" },
      { title: "Divide by weeks", body: "Take what's left after bills and tuition, and divide by the weeks left in the semester. That's your weekly spending room.", icon: "divide", tone: "green" },
      { title: "Protect bills first", body: "Set aside rent, phone, and tuition installments as soon as money lands. Sprout subtracts set-asides from \"safe to spend\" automatically.", icon: "shield", tone: "yellow" },
      { title: "Check in weekly", body: "Look at your categories once a week. Small corrections in October beat a scramble in December.", icon: "calendar-check", tone: "peach" },
    ],
    quiz: [
      { question: "What's a simple way to find your weekly room?", options: ["Spend freely until it's gone", "Money left after bills ÷ weeks left", "Ask a friend"], answerIndex: 1, explanation: "Spreading it evenly keeps December from being a crunch." },
      { question: "When should you set aside rent?", options: ["When money lands", "The day before it's due", "Never"], answerIndex: 0, explanation: "Protecting it early means you can't accidentally spend it." },
    ],
    action: { label: "Switch your budget to semester view", href: "/budget?period=semester" },
  },
  {
    id: "compound-growth",
    title: "How compound growth works",
    summary: "Why starting small and early beats starting big and late.",
    minutes: 2,
    cards: [
      { title: "Growth on growth", body: "Compounding means your earnings start earning too. $100 that grows 7% becomes $107, then the next year grows on $107, not $100.", icon: "sprout", tone: "green" },
      { title: "Time does the heavy lifting", body: "At 7% a year, money roughly doubles in about 10 years. Starting at 22 instead of 32 can mean double the result.", icon: "hourglass", tone: "sky" },
      { title: "It works against you too", body: "Credit card interest compounds the same way. A $1,000 balance at 25% APR grows fast if you only pay the minimum.", icon: "triangle-alert", tone: "peach" },
      { title: "Returns aren't promised", body: "7% is a long-run historical average for stocks, not a guarantee. Some years are up 20%, some down 20%.", icon: "scale", tone: "yellow" },
    ],
    quiz: [
      { question: "What makes compounding powerful?", options: ["Time", "Luck", "Checking prices often"], answerIndex: 0, explanation: "More years means more rounds of growth on growth." },
      { question: "Is a 7% yearly return guaranteed?", options: ["Yes", "No, it's a long-run average"], answerIndex: 1, explanation: "Real returns vary a lot from year to year." },
    ],
    action: { label: "Explore index funds", href: "/grow?tab=explore" },
  },
  {
    id: "money-scams",
    title: "Spot the scams that target newcomers",
    summary: "Fake officials, gift cards, and urgent threats: how to say no safely.",
    minutes: 2,
    cards: [
      { title: "Scammers know your visa", body: "Callers may know your school and visa type, then claim there's a problem with your documents. They threaten arrest or deportation unless you pay right now.", icon: "triangle-alert", tone: "peach" },
      { title: "How real agencies act", body: "USCIS, ICE, and the IRS never demand payment by phone or email, and never ask you to send money to a person. Real emails end in .gov.", icon: "building", tone: "sky" },
      { title: "The payment is the tell", body: "Gift cards, crypto, wire transfers, or payment apps to a stranger? It's a scam. Scammers like these because the money disappears fast.", icon: "credit-card", tone: "yellow" },
      { title: "Slow down, then check", body: "Hang up. Don't share your I-94, SSN, or bank details. Call your school's international office or the agency's official number yourself.", icon: "shield-check", tone: "green" },
      { title: "Report it", body: "Tell your school's designated official and report it at ReportFraud.ftc.gov. Telling friends helps too: these calls often hit a whole campus.", icon: "send", tone: "plum" },
    ],
    quiz: [
      { question: "A caller says your visa has a problem and asks for $900 in gift cards. What is it?", options: ["A real immigration fee", "A scam", "A tax payment"], answerIndex: 1, explanation: "No government agency accepts gift cards. Hang up." },
      { question: "Who should you call if you're unsure about your status?", options: ["The number the caller gives you", "Your school's international office", "Nobody"], answerIndex: 1, explanation: "Contact your designated school official using a number you look up yourself." },
    ],
    action: { label: "See how Sprout shows who you're paying", href: "/move" },
  },
  {
    id: "remittance-rights",
    title: "Your rights when sending money abroad",
    summary: "US law gives you price disclosures, a 30-minute cancel window, and error fixes.",
    minutes: 2,
    cards: [
      { title: "See the price first", body: "Before you pay, US transfer providers must show the fees, the exchange rate, and exactly how much will arrive. You get a receipt with the same numbers.", icon: "receipt", tone: "sky" },
      { title: "30 minutes to cancel", body: "Changed your mind? You can usually cancel within 30 minutes for a full refund, including fees, as long as the money hasn't been picked up or deposited.", icon: "clock", tone: "green" },
      { title: "180 days to report a mistake", body: "Wrong amount, or it never arrived? Report it within 180 days of the promised date. The provider must investigate, usually within 90 days.", icon: "calendar", tone: "yellow" },
      { title: "Keep your receipt", body: "It shows when the money should arrive, your cancel rights, and how to complain. Save it until your family confirms they got the money.", icon: "file-text", tone: "peach" },
    ],
    quiz: [
      { question: "How long do you usually have to cancel an international transfer?", options: ["5 minutes", "30 minutes", "30 days"], answerIndex: 1, explanation: "The CFPB rule gives you 30 minutes if the money hasn't been picked up." },
      { question: "Your mom never received the money. How long do you have to report it?", options: ["24 hours", "180 days", "There's no deadline"], answerIndex: 1, explanation: "You have 180 days from the date the money was supposed to arrive, but report it sooner." },
    ],
    action: { label: "Check a transfer quote in Move", href: "/move" },
  },
  {
    id: "student-taxes",
    title: "Taxes as an international student",
    summary: "Why most F-1 and J-1 students file something every year, even with no income.",
    minutes: 2,
    cards: [
      { title: "Even with no job, you file", body: "Most F-1 and J-1 students are \"nonresidents\" for taxes during their first five calendar years. Each year you were here, you file Form 8843.", icon: "file-text", tone: "sky" },
      { title: "Form 8843 is not a tax bill", body: "It's a short statement telling the IRS you're a student, so your days in the US don't count toward residency. No SSN or ITIN needed.", icon: "shield-check", tone: "green" },
      { title: "Had a campus job?", body: "If you earned US income, you'll likely file a nonresident return (Form 1040-NR) too, plus a state return. Your school often provides free software.", icon: "building", tone: "yellow" },
      { title: "Mark the deadline", body: "With no income, Form 8843 is usually due June 15. With income, the return is due April 15. Each family member files their own.", icon: "calendar-check", tone: "peach" },
    ],
    quiz: [
      { question: "An F-1 student had no US income last year. What do they file?", options: ["Nothing", "Form 8843", "Form W-2"], answerIndex: 1, explanation: "Form 8843 is required even without income." },
      { question: "Does Form 8843 mean you owe tax?", options: ["Yes", "No, it's an information statement"], answerIndex: 1, explanation: "It just explains your student status to the IRS." },
    ],
    action: { label: "Review your profile details", href: "/profile" },
  },
  {
    id: "credit-reports",
    title: "Check your credit report for free",
    summary: "Where to get the real free report, how often, and what to look for.",
    minutes: 2,
    cards: [
      { title: "Report vs. score", body: "Your credit report is the record: accounts, balances, on-time or late payments. Your score is a number calculated from it. Errors in the report hurt the score.", icon: "list-checks", tone: "sky" },
      { title: "One official website", body: "AnnualCreditReport.com is the only site authorized by federal law. Other \"free report\" sites may charge you later or collect your data.", icon: "globe", tone: "green" },
      { title: "Free every week", body: "Equifax, Experian, and TransUnion each give you a free report once a week. Checking your own report never lowers your score.", icon: "calendar-check", tone: "yellow" },
      { title: "What to look for", body: "Accounts you didn't open, wrong balances, or late payments you made on time. Dispute errors with the credit bureau. It's free.", icon: "search", tone: "peach" },
    ],
    quiz: [
      { question: "Which site gives the official free credit reports?", options: ["Any site that says \"free\"", "AnnualCreditReport.com", "Your bank's app only"], answerIndex: 1, explanation: "It's the one site authorized by federal law." },
      { question: "Does checking your own report lower your score?", options: ["Yes, a little", "No"], answerIndex: 1, explanation: "Checking your own credit is a soft check and never hurts your score." },
    ],
    action: { label: "See bills that build good habits", href: "/budget" },
  },
  {
    id: "investing-fees",
    title: "Small fees, big difference",
    summary: "How a 1% fee quietly eats your growth, and what an expense ratio is.",
    minutes: 2,
    cards: [
      { title: "Fees come out every year", body: "Funds charge a yearly fee called an expense ratio. 0.03% means $3 a year per $10,000. 1% means $100. You never see a bill; it's taken from returns.", icon: "percent", tone: "sky" },
      { title: "It compounds, too", body: "In an Investor.gov example, $100,000 growing 4% a year for 20 years ends with nearly $30,000 less at a 1% fee than at 0.25%.", icon: "trending-down", tone: "peach" },
      { title: "Index funds are often cheapest", body: "Broad index funds just follow a list of companies, so they're cheap to run. Many charge under 0.10% a year.", icon: "layers", tone: "green" },
      { title: "Check before you buy", body: "Look up the expense ratio on the fund's page. When two funds hold similar things, the cheaper one usually leaves you more.", icon: "search", tone: "yellow" },
    ],
    quiz: [
      { question: "A fund has a 0.50% expense ratio. What do you pay on $1,000 per year?", options: ["$0.50", "$5", "$50"], answerIndex: 1, explanation: "0.50% of $1,000 is $5 a year." },
      { question: "Why do small fees matter over time?", options: ["They compound like returns do", "They don't really matter", "They're refunded later"], answerIndex: 0, explanation: "Each year's fee also removes the growth that money would have earned." },
    ],
    action: { label: "Compare index funds in practice mode", href: "/grow?tab=explore" },
  },
  {
    id: "how-interledger-works",
    title: "How money moves: Interledger and Open Payments",
    summary: "The open standards that let Sprout send money between any wallets.",
    minutes: 3,
    cards: [
      { title: "Money has no common language", body: "Banks and wallets each run their own systems. Moving money between them, especially across countries, usually means middlemen, delays, and hidden fees.", icon: "globe", tone: "sky" },
      { title: "Interledger connects them", body: "Interledger is an open network for money, like the internet is for data. It splits payments into tiny packets and routes them between providers, converting currency as needed.", icon: "network", tone: "green" },
      { title: "A wallet address is your link", body: "Open Payments gives each account a web address, like https://ilp.example/sudeep. Apps read it to find the account's currency and servers.", icon: "wallet", tone: "yellow" },
      { title: "Permission, then payment", body: "Apps ask your provider for permission (a grant). Receiving needs none from you. Sending needs your approval once, with a spending limit you set.", icon: "shield-check", tone: "peach" },
      { title: "Quote first, always", body: "Before money moves, the sender's provider returns an exact quote: what leaves your account and what arrives. Sprout shows it on the review screen.", icon: "receipt", tone: "plum" },
    ],
    quiz: [
      { question: "What does Interledger do?", options: ["Stores your money", "Connects different providers so money can move between them", "Sets exchange rates"], answerIndex: 1, explanation: "It's a network that routes payments between providers." },
      { question: "What do you see before an Open Payments transfer is sent?", options: ["Nothing", "A quote with fees and the amount received", "Only the recipient's name"], answerIndex: 1, explanation: "The quote shows exactly what leaves and what arrives." },
    ],
    action: { label: "Send money and watch each step", href: "/move" },
  },
];

/** Where each lesson's facts come from (shown on the lesson result screen). */
export const LESSON_SOURCES: Record<string, Array<{ label: string; url: string }>> = {
  "credit-new": [
    { label: "CFPB: Building credit from scratch", url: "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/" },
    { label: "myFICO: What's in my score", url: "https://www.myfico.com/credit-education/whats-in-your-credit-score" },
  ],
  "ssn-vs-itin": [
    { label: "IRS: Individual Taxpayer Identification Number", url: "https://www.irs.gov/individuals/individual-taxpayer-identification-number" },
    { label: "SSA: International students and SSNs", url: "https://www.ssa.gov/ssnumber/" },
  ],
  "send-home": [{ label: "CFPB: Sending money abroad", url: "https://www.consumerfinance.gov/consumer-tools/sending-money/" }],
  "us-banking-basics": [
    { label: "FDIC: Deposit insurance", url: "https://www.fdic.gov/resources/deposit-insurance" },
    { label: "FDIC Money Smart", url: "https://www.fdic.gov/consumer-resource-center/money-smart" },
  ],
  "first-credit-card": [{ label: "CFPB: Credit cards", url: "https://www.consumerfinance.gov/consumer-tools/credit-cards/" }],
  "index-funds": [{ label: "Investor.gov: Index funds", url: "https://www.investor.gov/introduction-investing/investing-basics/investment-products/mutual-funds-and-exchange-traded-1" }],
  diversification: [{ label: "Investor.gov: Asset allocation and diversification", url: "https://www.investor.gov/additional-resources/general-resources/publications-research/info-sheets/beginners-guide-asset" }],
  "what-is-a-stock": [{ label: "Investor.gov: Stocks", url: "https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks" }],
  "market-dips": [{ label: "FINRA: Market volatility", url: "https://www.finra.org/investors/insights/volatility" }],
  "emergency-fund": [{ label: "CFPB: Emergency savings", url: "https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/" }],
  "semester-budget": [{ label: "CFPB: Your Money, Your Goals", url: "https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/" }],
  "compound-growth": [{ label: "Investor.gov: Compound interest calculator", url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator" }],
  "money-scams": [
    { label: "USCIS: Common scams", url: "https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/common-scams" },
    { label: "DHS Study in the States: Beware of imposters", url: "https://studyinthestates.dhs.gov/2026/02/beware-of-dhs-imposters-protecting-foreign-students-from-scams" },
    { label: "FTC: Gift card scams", url: "https://consumer.ftc.gov/articles/avoiding-and-reporting-gift-card-scams" },
  ],
  "remittance-rights": [
    { label: "CFPB: Remittance transfers and your rights", url: "https://www.consumerfinance.gov/ask-cfpb/what-is-a-remittance-transfer-and-what-are-my-rights-en-1161/" },
    { label: "CFPB: Money transfer FAQs", url: "https://www.consumerfinance.gov/consumer-tools/money-transfers-revisions-sept-2023/money-transfer-frequently-asked-questions/" },
  ],
  "student-taxes": [
    { label: "IRS: Exempt individual — who is a student", url: "https://www.irs.gov/individuals/international-taxpayers/exempt-individual-who-is-a-student" },
    { label: "IRS: About Form 8843", url: "https://www.irs.gov/forms-pubs/about-form-8843" },
  ],
  "credit-reports": [
    { label: "FTC: Free credit reports", url: "https://consumer.ftc.gov/articles/free-credit-reports" },
    { label: "CFPB: How to get your free credit reports", url: "https://www.consumerfinance.gov/ask-cfpb/where-can-i-get-my-credit-report-en-5/" },
  ],
  "investing-fees": [
    { label: "Investor.gov: How fees affect your portfolio", url: "https://www.investor.gov/introduction-investing/getting-started/understanding-fees" },
  ],
  "how-interledger-works": [
    { label: "Interledger Foundation", url: "https://interledger.org/" },
    { label: "Open Payments documentation", url: "https://openpayments.dev/" },
  ],
};

const TRACKS: Record<string, LessonSummary["track"]> = {
  "credit-new": "credit",
  "ssn-vs-itin": "newcomer",
  "send-home": "newcomer",
  "us-banking-basics": "newcomer",
  "first-credit-card": "credit",
  "index-funds": "investing",
  diversification: "investing",
  "what-is-a-stock": "investing",
  "market-dips": "investing",
  "emergency-fund": "money",
  "semester-budget": "money",
  "compound-growth": "money",
  "money-scams": "newcomer",
  "remittance-rights": "newcomer",
  "student-taxes": "newcomer",
  "credit-reports": "credit",
  "investing-fees": "investing",
  "how-interledger-works": "money",
};

export const LESSON_META: LessonMeta[] = LESSONS.map((l) => ({
  id: l.id,
  title: l.title,
  summary: l.summary,
  minutes: l.minutes,
  track: TRACKS[l.id] ?? "money",
  topic: l.title,
}));

export function getPrewrittenLesson(id: string): LessonContent | null {
  const l = LESSONS.find((x) => x.id === id);
  return l ? { ...l, source: "prewritten" } : null;
}

export const INVESTING_LESSON_IDS = ["index-funds", "diversification", "what-is-a-stock", "market-dips", "compound-growth"];
