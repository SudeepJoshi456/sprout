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

export const COURSE_TITLE = "Invest in what you know";
export const COURSE_SUBTITLE = "Short units that start with brands you love and build up to smart investing habits.";

export const COURSE_UNITS: CourseUnit[] = [
  {
    id: "invest",
    title: "Start with brands you love",
    summary: "What owning a company means, and how to judge one.",
    icon: "trending-up",
    lessonIds: ["brand-vs-stock", "what-is-a-stock", "one-fund-vs-one-brand", "index-funds"],
  },
  {
    id: "habits",
    title: "Smart investing habits",
    summary: "Spreading risk, fees, time, and staying calm in dips.",
    icon: "sprout",
    lessonIds: ["diversification", "investing-fees", "compound-growth", "market-dips"],
  },
  {
    id: "moves",
    title: "How money moves",
    summary: "The open network behind Sprout's payments.",
    icon: "network",
    lessonIds: ["how-interledger-works"],
  },
  {
    id: "credit",
    title: "Build credit",
    summary: "Start from no score and build one safely.",
    icon: "gauge",
    lessonIds: ["credit-new", "first-credit-card", "credit-reports"],
  },
  {
    id: "everyday",
    title: "Everyday money",
    summary: "A safety cushion and a simple plan for each semester.",
    icon: "wallet",
    lessonIds: ["emergency-fund", "semester-budget"],
  },
  {
    id: "land",
    title: "New to the US (optional)",
    summary: "Banking, ID numbers, taxes, scams, and sending money home.",
    icon: "building",
    lessonIds: ["us-banking-basics", "ssn-vs-itin", "money-scams", "student-taxes", "send-home", "remittance-rights"],
  },
];
