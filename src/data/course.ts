/**
 * "Starting from Zero": the Learn course. Units order the lessons in
 * src/data/lessons.ts from day-one essentials to investing. Facts are drawn
 * from CFPB, FDIC, IRS, SEC (Investor.gov), FTC, DHS, and the Interledger
 * Foundation; see LESSON_SOURCES.
 */
export interface CourseUnit {
  id: string;
  title: string;
  summary: string;
  icon: string;
  lessonIds: string[];
}

export const COURSE_TITLE = "Starting from Zero";
export const COURSE_SUBTITLE = "Five short units from your first US bank account to your first practice investment.";

export const COURSE_UNITS: CourseUnit[] = [
  {
    id: "land",
    title: "Land on your feet",
    summary: "Banking, ID numbers, and staying safe in your first months.",
    icon: "building",
    lessonIds: ["us-banking-basics", "ssn-vs-itin", "money-scams", "student-taxes"],
  },
  {
    id: "credit",
    title: "Build US credit",
    summary: "Start from no score and build one safely.",
    icon: "gauge",
    lessonIds: ["credit-new", "first-credit-card", "credit-reports"],
  },
  {
    id: "everyday",
    title: "Everyday money",
    summary: "Budgets, a safety cushion, and sending money home.",
    icon: "wallet",
    lessonIds: ["semester-budget", "emergency-fund", "send-home", "remittance-rights"],
  },
  {
    id: "moves",
    title: "How money moves",
    summary: "The open network behind Sprout's transfers.",
    icon: "network",
    lessonIds: ["how-interledger-works"],
  },
  {
    id: "invest",
    title: "Start investing (practice)",
    summary: "Stocks, funds, fees, and patience, with play money.",
    icon: "trending-up",
    lessonIds: ["what-is-a-stock", "index-funds", "diversification", "investing-fees", "compound-growth", "market-dips"],
  },
];
