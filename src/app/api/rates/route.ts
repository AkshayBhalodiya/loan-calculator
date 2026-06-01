import { getRatesForLoanType, suggestRate } from "@/lib/rates";
import { jsonOk } from "@/lib/api-utils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const loanType = searchParams.get("loanType") ?? undefined;
  const rates = getRatesForLoanType(loanType ?? undefined);
  const suggested =
    loanType === "Home" || loanType === "Personal" || loanType === "Car"
      ? suggestRate(loanType)
      : suggestRate("Home");

  return jsonOk({ rates, suggestedRate: suggested });
}
