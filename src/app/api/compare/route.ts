import { compareStrategies } from "@/lib/simulation-service";
import { enforceRateLimit, jsonError, jsonOk } from "@/lib/api-utils";
import { compareSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "compare");
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = compareSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.", 400);
    }

    const comparison = compareStrategies(
      parsed.data.loan,
      parsed.data.strategyA,
      parsed.data.strategyB
    );
    return jsonOk({ comparison });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compare failed";
    return jsonError(message, 500);
  }
}
