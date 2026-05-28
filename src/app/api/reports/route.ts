import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import { ReportModel } from "@/lib/report-model";

export async function POST(req: Request) {
  try {
    await connectMongo();
    const payload = await req.json();
    const created = await ReportModel.create(payload);
    return NextResponse.json(
      {
        success: true,
        reportId: created._id,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        message:
          message.includes("MONGODB_URI")
            ? "MONGODB_URI missing. Add it to enable save reports."
            : `Failed to save report: ${message}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
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

    const filters: Record<string, unknown> = {};
    if (loanType && loanType !== "All") {
      filters["loan.loanType"] = loanType;
    }
    if (risk && risk !== "All") {
      filters["summary.risk"] = risk;
    }
    if (!Number.isNaN(minAmount) && minAmount > 0) {
      filters["loan.loanAmount"] = { ...(filters["loan.loanAmount"] as Record<string, number>), $gte: minAmount };
    }
    if (!Number.isNaN(maxAmount) && maxAmount > 0) {
      filters["loan.loanAmount"] = { ...(filters["loan.loanAmount"] as Record<string, number>), $lte: maxAmount };
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

    return NextResponse.json(
      {
        success: true,
        reports,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.max(1, Math.ceil(total / safeLimit)),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        message:
          message.includes("MONGODB_URI")
            ? "MONGODB_URI missing. Add it to enable reports listing."
            : "Failed to load reports.",
      },
      { status: 500 }
    );
  }
}
