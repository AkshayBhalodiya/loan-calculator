import { connectMongo } from "@/lib/mongodb";
import { ReportModel, reportOwnerFilter } from "@/lib/report-model";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  jsonError,
  jsonOk,
  mongoErrorMessage,
} from "@/lib/api-utils";

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, "stats");
  if (limited) return limited;

  try {
    const session = await auth();
    const userId = session?.user?.email;
    const orgId = session?.user?.orgId ?? null;
    if (!userId) {
      return jsonError("Sign in to view dashboard stats.", 401);
    }

    await connectMongo();
    const ownerFilter =
      session?.user?.role === "admin" ? {} : reportOwnerFilter(userId, orgId);

    const [totalReports, agg, highRiskCount] = await Promise.all([
      ReportModel.countDocuments(ownerFilter),
      ReportModel.aggregate([
        { $match: ownerFilter },
        {
          $group: {
            _id: null,
            totalInterestSaved: { $sum: "$summary.interestSaved" },
            avgMonthsSaved: { $avg: "$summary.monthsSaved" },
            maxInterestSaved: { $max: "$summary.interestSaved" },
          },
        },
      ]),
      ReportModel.countDocuments({ ...ownerFilter, "summary.risk": "High" }),
    ]);

    const stats = agg[0] ?? {
      totalInterestSaved: 0,
      avgMonthsSaved: 0,
      maxInterestSaved: 0,
    };

    const byLoanType = await ReportModel.aggregate([
      { $match: ownerFilter },
      { $group: { _id: "$loan.loanType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return jsonOk({
      totalReports,
      highRiskCount,
      totalInterestSaved: Math.round(stats.totalInterestSaved ?? 0),
      avgMonthsSaved: Math.round((stats.avgMonthsSaved ?? 0) * 10) / 10,
      maxInterestSaved: Math.round(stats.maxInterestSaved ?? 0),
      byLoanType,
      scope: userId ? "mine" : "public",
    });
  } catch (error) {
    return jsonError(mongoErrorMessage(error, "Failed to load stats"), 500);
  }
}
