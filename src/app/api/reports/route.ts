import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { ReportModel, reportOwnerFilter } from "@/lib/report-model";
import { auth } from "@/lib/auth";
import {
  enforceRateLimit,
  getSessionUserId,
  mongoErrorMessage,
  requireUserId,
} from "@/lib/api-utils";
import { createReportSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "reports-post");
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { success: false, message: "Sign in required." },
        { status: 401 }
      );
    }

    await connectMongo();
    const body = await req.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message ?? "Invalid report payload.",
        },
        { status: 400 }
      );
    }

    const userId = session.user.email;
    const orgId = session.user.orgId ?? null;
    const { title, notes, loan, strategy, summary, chartData } = parsed.data;
    const defaultTitle = `${loan.loanType} Loan — ${new Date().toLocaleDateString("en-IN")}`;

    const created = await ReportModel.create({
      userId,
      orgId,
      title: title?.trim() || defaultTitle,
      notes: notes?.trim() ?? "",
      loan,
      strategy,
      summary,
      chartData: chartData ?? null,
    });

    return NextResponse.json(
      { success: true, reportId: created._id },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: mongoErrorMessage(error, "Failed to save report") },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const limited = enforceRateLimit(req, "reports-get");
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { success: false, message: "Sign in to view your reports." },
        { status: 401 }
      );
    }
    const userId = session.user.email;
    const orgId = session.user.orgId ?? null;

    await connectMongo();
    const { searchParams } = new URL(req.url);
    const loanType = searchParams.get("loanType");
    const risk = searchParams.get("risk");
    const minAmount = Number(searchParams.get("minAmount") ?? "0");
    const maxAmount = Number(searchParams.get("maxAmount") ?? "0");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sort = searchParams.get("sort") ?? "latest";
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "10");

    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 50 ? limit : 10;

    const filters: Record<string, unknown> = { ...reportOwnerFilter(userId, orgId) };
    if (loanType && loanType !== "All") filters["loan.loanType"] = loanType;
    if (risk && risk !== "All") filters["summary.risk"] = risk;
    if (!Number.isNaN(minAmount) && minAmount > 0) {
      filters["loan.loanAmount"] = {
        ...(filters["loan.loanAmount"] as Record<string, number>),
        $gte: minAmount,
      };
    }
    if (!Number.isNaN(maxAmount) && maxAmount > 0) {
      filters["loan.loanAmount"] = {
        ...(filters["loan.loanAmount"] as Record<string, number>),
        $lte: maxAmount,
      };
    }
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.$gte = new Date(startDate);
      if (endDate) createdAt.$lte = new Date(endDate);
      filters.createdAt = createdAt;
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      latest: { createdAt: -1 },
      maxInterestSaved: { "summary.interestSaved": -1, createdAt: -1 },
      maxMonthsSaved: { "summary.monthsSaved": -1, createdAt: -1 },
    };
    const sortConfig = sortMap[sort] ?? sortMap.latest;

    const [reports, total] = await Promise.all([
      ReportModel.find(filters)
        .sort(sortConfig)
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      ReportModel.countDocuments(filters),
    ]);

    return NextResponse.json({
      success: true,
      reports,
      scope: "mine",
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        message: message.includes("MONGODB_URI")
          ? "MONGODB_URI missing. Add it to enable reports listing."
          : "Failed to load reports.",
      },
      { status: 500 }
    );
  }
}
