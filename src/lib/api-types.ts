/** Response shapes for read endpoints, shared by routes and screens. */
import type { Diversification, PortfolioView } from "./portfolio";
import type { Challenge } from "./progress";
import type { ChartRange, CoachMessage, LessonContent, LessonSummary, PaymentQuote, PricePoint, Quote, Trade, Transfer } from "./types";

export interface PortfolioResponse {
  portfolio: {
    view: PortfolioView;
    diversification: Diversification;
    series: PricePoint[];
    range: ChartRange;
    challenges: Challenge[];
    graduate: { lessons: number; days: number; progress: number; ready: boolean };
    quotes: Quote[];
    asOf: number;
  };
}

export interface LessonsResponse {
  lessons: LessonSummary[];
  streak: number;
}

export interface LessonResponse {
  lesson: LessonContent;
}

export interface HistoryResponse {
  quote: Quote;
  points: PricePoint[];
  range: ChartRange;
}

export interface QuotesResponse {
  quotes: Quote[];
}

export interface QuoteResponse {
  quote: PaymentQuote;
}

export interface SendResponse {
  transfer: Transfer;
  duplicate?: boolean;
  paidBillId?: string | null;
}

export interface TradeResponse {
  trade: Trade;
  coach?: CoachMessage;
  quote?: Quote;
  duplicate?: boolean;
}
