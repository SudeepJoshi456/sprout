import { aiAvailable } from "@/lib/server/ai";
import { config, modeStatus } from "@/lib/server/config";
import { marketAsOf } from "@/lib/server/market";
import { interledgerConfigured } from "@/lib/server/payments/interledger";

/** GET /api/health: which modes are on and whether live services are configured. No secrets. */
export async function GET() {
  return Response.json({
    ok: true,
    modes: modeStatus(),
    configured: {
      interledger: interledgerConfigured(),
      ai: aiAvailable(),
      finnhub: Boolean(config.market.finnhubKey),
    },
    aiModel: config.aiMode === "live" ? config.ai.model : null,
    marketSnapshotAsOf: new Date(marketAsOf()).toISOString(),
  });
}
