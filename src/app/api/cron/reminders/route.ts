import { connectMongo } from "@/lib/mongodb";
import { ReportModel } from "@/lib/report-model";
import { jsonError, jsonOk, mongoErrorMessage } from "@/lib/api-utils";
import { markMissedRecurringTransactions } from "@/lib/recurring-service";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return jsonError("Unauthorized cron request.", 401);
  }

  try {
    await connectMongo();
    const highRisk = await ReportModel.find({ "summary.risk": "High" })
      .sort({ createdAt: -1 })
      .limit(20)
      .select({ title: 1, userId: 1, "summary.interestSaved": 1 })
      .lean();

    const reminders = highRisk.map((r) => ({
      reportId: String(r._id),
      userId: r.userId,
      title: r.title,
      message: "High cash-flow risk — review your extra EMI strategy.",
      interestSaved: r.summary?.interestSaved ?? 0,
    }));

    // also run recurring missed transaction marking
    const recurringResult = await markMissedRecurringTransactions();

    return jsonOk({
      processed: reminders.length,
      reminders,
      recurring: recurringResult,
      note: "Wire this route to Vercel Cron with CRON_SECRET for scheduled runs.",
    });
  } catch (error) {
    return jsonError(mongoErrorMessage(error, "Cron failed"), 500);
  }
}
