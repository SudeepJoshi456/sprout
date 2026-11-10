import type { NextRequest } from "next/server";
import { errorResponse, requireUser } from "@/lib/server/http";
import { getQuotes, searchTickers } from "@/lib/server/market";

/** GET /api/market/search?q=apple: search by ticker, name, or sector. */
export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
  } catch (err) {
    return errorResponse(err);
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const matches = searchTickers(q).slice(0, 20);
  const quotes = await getQuotes(matches.map((m) => m.symbol));
  return Response.json({ quotes });
}
