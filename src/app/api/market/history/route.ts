import type { NextRequest } from "next/server";
import { errorResponse, requireUser } from "@/lib/server/http";
import { getHistory, getQuote } from "@/lib/server/market";
import type { ChartRange } from "@/lib/types";

const RANGES: ChartRange[] = ["1D", "1W", "1M", "1Y"];

/** GET /api/market/history?symbol=VOO&range=1M */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
  } catch (err) {
    return errorResponse(err);
  }
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "").toUpperCase();
  const rangeParam = req.nextUrl.searchParams.get("range") as ChartRange;
  const range = RANGES.includes(rangeParam) ? rangeParam : "1M";
  const quote = await getQuote(symbol);
  if (!quote) {
    return Response.json({ error: { code: "not_found", message: `We don't have ${symbol} in practice mode.` } }, { status: 404 });
  }
  const points = await getHistory(symbol, range);
  return Response.json({ quote, points, range }, { headers: { "Cache-Control": "private, max-age=60" } });
}
