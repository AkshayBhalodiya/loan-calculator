import { buildSimulationSummary } from "@/lib/simulation-service";
import { enforceRateLimit, jsonError, jsonOk, mongoErrorMessage } from "@/lib/api-utils";
import { simulateSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "simulate");
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = simulateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid payload.", 400);
    }

    const result = buildSimulationSummary(parsed.data.loan, parsed.data.strategy);
    return jsonOk({
      basePlan: result.basePlan,
      smartPlan: result.smartPlan,
      summary: result.summary,
      chartData: result.chartData,
    });
  } catch (error) {
    return jsonError(mongoErrorMessage(error, "Simulation failed"), 500);
  }
}
