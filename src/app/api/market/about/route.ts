import type { NextRequest } from "next/server";
import { explainAsset } from "@/lib/server/ai";

/** GET /api/market/about?symbol=VOO — plain-language "What is this?" (AI, cached, with fallback). */
export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get("symbol") ?? "").toUpperCase();
  const about = await explainAsset(symbol);
  return Response.json(about, { headers: { "Cache-Control": "private, max-age=3600" } });
}
