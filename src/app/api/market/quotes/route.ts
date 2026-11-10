import type { NextRequest } from "next/server";
import { errorResponse, requireUser } from "@/lib/server/http";
import { TICKERS } from "@/data/tickers";
import { getQuotes } from "@/lib/server/market";

/** GET /api/market/quotes?symbols=VOO,AAPL: delayed quotes (all tickers if omitted). */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
  } catch (err) {
    return errorResponse(err);
  }
  const param = req.nextUrl.searchParams.get("symbols");
  const symbols = param ? param.split(",").slice(0, 40) : TICKERS.map((t) => t.symbol);
  const quotes = await getQuotes(symbols);
  return Response.json({ quotes }, { headers: { "Cache-Control": "private, max-age=60" } });
}
