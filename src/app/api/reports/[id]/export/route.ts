import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { ReportModel } from "@/lib/report-model";
import {
  enforceRateLimit,
  getSessionUserId,
  jsonError,
  mongoErrorMessage,
} from "@/lib/api-utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const limited = enforceRateLimit(req, "report-export");
  if (limited) return limited;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") ?? "json";

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid report id.", 400);
  }

  try {
    await connectMongo();
    const userId = await getSessionUserId();
    const report = await ReportModel.findById(id).lean();
    if (!report) return jsonError("Report not found.", 404);
    if (report.userId && report.userId !== userId) {
      return jsonError("Not allowed to export this report.", 403);
    }
    if (!report.userId && userId) {
      /* public report — allowed */
    } else if (report.userId && !userId) {
      return jsonError("Sign in to export this report.", 401);
    }

    if (format === "csv") {
      const rows = [
        ["field", "value"],
        ["id", id],
        ["title", report.title ?? ""],
        ["loanType", report.loan?.loanType ?? ""],
        ["loanAmount", String(report.loan?.loanAmount ?? "")],
        ["annualRate", String(report.loan?.annualRate ?? "")],
        ["interestSaved", String(report.summary?.interestSaved ?? "")],
        ["monthsSaved", String(report.summary?.monthsSaved ?? "")],
        ["risk", report.summary?.risk ?? ""],
      ];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="loanwise-${id}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify(report, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="loanwise-${id}.json"`,
      },
    });
  } catch (error) {
    return jsonError(mongoErrorMessage(error, "Export failed"), 500);
  }
}
