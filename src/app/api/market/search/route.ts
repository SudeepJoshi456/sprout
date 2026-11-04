import type { NextRequest } from "next/server";
import { getQuotes, searchTickers } from "@/lib/server/market";

/** GET /api/market/search?q=apple — search by ticker, name, or sector. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const matches = searchTickers(q).slice(0, 20);
  const quotes = await getQuotes(matches.map((m) => m.symbol));
  return Response.json({ quotes });
}
