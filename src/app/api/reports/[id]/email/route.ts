import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { ReportModel } from "@/lib/report-model";
import { INR } from "@/lib/loan";
import {
  enforceRateLimit,
  getSessionUserId,
  jsonError,
  jsonOk,
  mongoErrorMessage,
} from "@/lib/api-utils";
import { emailReportSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const limited = enforceRateLimit(req, "report-email");
  if (limited) return limited;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return jsonError(
      "Email not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL in .env.local.",
      501
    );
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return jsonError("Invalid report id.", 400);
  }

  try {
    const body = await req.json();
    const parsed = emailReportSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid email.", 400);
    }

    await connectMongo();
    const userId = await getSessionUserId();
    const report = await ReportModel.findById(id).lean();
    if (!report) return jsonError("Report not found.", 404);
    if (report.userId && report.userId !== userId) {
      return jsonError("Not allowed to email this report.", 403);
    }

    const title = report.title ?? "LoanWise Report";
    const html = `
      <h2>${title}</h2>
      <p>Loan: ${report.loan?.loanType} — ${INR.format(report.loan?.loanAmount ?? 0)}</p>
      <p>Interest saved: ${INR.format(report.summary?.interestSaved ?? 0)}</p>
      <p>Months saved: ${report.summary?.monthsSaved ?? 0}</p>
      <p>Risk: ${report.summary?.risk ?? "-"}</p>
      <p><a href="${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reports/${id}">View online</a></p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: parsed.data.to,
        subject: `LoanWise: ${title}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return jsonError(`Email provider error: ${errText}`, 502);
    }

    return jsonOk({ sent: true, to: parsed.data.to });
  } catch (error) {
    return jsonError(mongoErrorMessage(error, "Failed to send email"), 500);
  }
}
