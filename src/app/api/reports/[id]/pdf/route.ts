import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import mongoose from "mongoose";
import * as PImage from "pureimage";
import { PassThrough } from "stream";
import { connectMongo } from "@/lib/mongodb";
import { ReportModel } from "@/lib/report-model";
import { auth } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

type ReportChartPoint = {
  month?: number;
  balance?: number;
};

type ReportChartSlice = {
  name?: string;
  value?: number;
};

function formatAmount(value: number | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

async function generateChartImage(
  pieData: ReportChartSlice[],
  lineData: ReportChartPoint[]
): Promise<Buffer> {
  const width = 950;
  const height = 420;
  const image = PImage.make(width, height);
  const ctx = image.getContext("2d");

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#0f172a";
  ctx.font = "26pt Arial";
  ctx.fillText("Calculator Chart Snapshot", 24, 40);

  // pie chart
  const pieX = 200;
  const pieY = 220;
  const radius = 110;
  const totalPie = Math.max(
    1,
    pieData.reduce((sum, item) => sum + Math.max(0, item.value ?? 0), 0)
  );
  let currentAngle = -Math.PI / 2;
  const pieColors = ["#6366f1", "#16a34a", "#f97316", "#0ea5e9"];

  pieData.forEach((slice, index) => {
    const value = Math.max(0, slice.value ?? 0);
    const sliceAngle = (value / totalPie) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(pieX, pieY);
    ctx.fillStyle = pieColors[index % pieColors.length];
    ctx.arc(pieX, pieY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();
    currentAngle += sliceAngle;
  });

  ctx.fillStyle = "#0f172a";
  ctx.font = "16pt Arial";
  ctx.fillText("Interest Breakdown (Pie)", 80, 360);

  // line chart
  const chartX = 430;
  const chartY = 80;
  const chartW = 460;
  const chartH = 260;
  const linePoints = lineData.length > 1 ? lineData : [{ month: 1, balance: 0 }, { month: 2, balance: 0 }];
  const maxBalance = Math.max(1, ...linePoints.map((p) => p.balance ?? 0));
  const maxMonth = Math.max(1, ...linePoints.map((p) => p.month ?? 0));

  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.strokeRect(chartX, chartY, chartW, chartH);

  ctx.beginPath();
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 3;
  linePoints.forEach((point, index) => {
    const x = chartX + ((point.month ?? 0) / maxMonth) * chartW;
    const y = chartY + chartH - ((point.balance ?? 0) / maxBalance) * chartH;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "16pt Arial";
  ctx.fillText("Principal Reduction (Line)", 540, 360);

  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  await PImage.encodePNGToStream(image, stream);
  return Buffer.concat(chunks);
}

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid report id." }, { status: 400 });
  }

  try {
    await connectMongo();
    const session = await auth();
    const userId = session?.user?.email ?? null;
    const orgId = session?.user?.orgId ?? null;
    const role = session?.user?.role ?? null;

    const report = await ReportModel.findById(id).lean();
    if (!report) {
      return NextResponse.json({ success: false, message: "Report not found." }, { status: 404 });
    }

    if (report.userId) {
      if (role !== "admin") {
        const isOwner = report.userId === userId;
        const isOrgMember = report.orgId && orgId && report.orgId.toString() === orgId;
        if (!isOwner && !isOrgMember) {
          if (!userId) {
            return NextResponse.json(
              { success: false, message: "Sign in to access this PDF." },
              { status: 401 }
            );
          }
          return NextResponse.json(
            { success: false, message: "Unauthorized to access this report PDF." },
            { status: 403 }
          );
        }
      }
    }

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

    const monthsSaved = Math.max(0, report.summary?.monthsSaved ?? 0);
    const interestSaved = Math.max(0, report.summary?.interestSaved ?? 0);
    const reportPieData = (report.chartData?.pie as ReportChartSlice[] | undefined) ?? [
      { name: "Original Interest", value: report.loan?.loanAmount ?? 0 },
      { name: "Interest Saved", value: interestSaved },
    ];
    const reportLineData = (report.chartData?.line as ReportChartPoint[] | undefined) ?? [];

    doc.rect(0, 0, doc.page.width, 90).fill("#0f172a");
    doc.fillColor("#ffffff").fontSize(26).text("LoanWise", 40, 28);
    doc
      .fontSize(12)
      .text("Smart EMI Strategy Report", 40, 60);
    doc
      .fontSize(10)
      .text(new Date().toLocaleString("en-IN"), 420, 60);
    doc.fillColor("#000000");
    doc.moveDown(4);

    doc.fontSize(12).text(`Loan Type: ${report.loan?.loanType ?? "-"}`);
    doc.text(`Loan Amount: ${formatAmount(report.loan?.loanAmount)}`);
    doc.text(`Interest Rate: ${report.loan?.annualRate ?? 0}%`);
    doc.text(`Tenure: ${report.loan?.tenureYears ?? 0} years`);
    doc.text(`Risk: ${report.summary?.risk ?? "-"}`);
    doc.moveDown();

    doc.fontSize(14).text("Outcome Summary", { underline: true });
    doc.fontSize(12).moveDown(0.4);
    doc.text(`Original Close: ${report.summary?.originalClosureDate ?? "-"}`);
    doc.text(`New Close: ${report.summary?.newClosureDate ?? "-"}`);
    doc.text(`Months Saved: ${monthsSaved}`);
    doc.text(`Interest Saved: ${formatAmount(interestSaved)}`);
    doc.moveDown();

    const chartBuffer = await generateChartImage(reportPieData, reportLineData);
    doc.fontSize(14).text("Embedded Calculator Charts", { underline: true });
    doc.moveDown(0.4);
    doc.image(chartBuffer, { fit: [500, 180], align: "center" });
    doc.moveDown();

    doc.fontSize(14).text("Applied Strategy", { underline: true });
    doc.fontSize(12).moveDown(0.4);
    doc.text(`Monthly Extra: ${formatAmount(report.strategy?.monthlyExtra)}`);
    doc.text(`Extra EMI Every: ${report.strategy?.extraEmiEveryMonths ?? 0} months`);
    doc.text(`Yearly Lump Sum: ${formatAmount(report.strategy?.yearlyLumpSum)}`);

    doc.end();
    await new Promise<void>((resolve) => doc.on("end", () => resolve()));
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="loanwise-report-${id}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to generate PDF." },
      { status: 500 }
    );
  }
}
