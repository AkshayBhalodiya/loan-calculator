import Link from "next/link";
import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { ReportModel } from "@/lib/report-model";
import { INR } from "@/lib/loan";

type DetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

async function getReport(id: string) {
  try {
    await connectMongo();
    const report = await ReportModel.findById(id).lean();
    return { report, error: "" };
  } catch {
    return { report: null, error: "Failed to load report detail." };
  }
}

export default async function ReportDetailPage({ params }: DetailPageProps) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-8">
        <p className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-900">
          Invalid report ID.
        </p>
      </main>
    );
  }

  const { report, error } = await getReport(id);

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-8">
        <p className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-900">
          {error}
        </p>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-8">
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Report not found.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-8">
      <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Report Detail</h1>
        <p className="mt-2 text-slate-200">Complete saved strategy analysis.</p>
        <Link
          href="/reports"
          className="mt-4 inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900"
        >
          Back to Reports
        </Link>
        <a
          href={`/api/reports/${id}/pdf`}
          className="mt-4 ml-2 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          Download PDF
        </a>
      </section>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <p>Loan Type: {report.loan?.loanType ?? "-"}</p>
        <p>Loan Amount: {INR.format(report.loan?.loanAmount ?? 0)}</p>
        <p>Interest Rate: {report.loan?.annualRate ?? 0}%</p>
        <p>Tenure: {report.loan?.tenureYears ?? 0} years</p>
        <p>Risk: {report.summary?.risk ?? "-"}</p>
        <p>
          Saved At:{" "}
          {report.createdAt ? new Date(report.createdAt).toLocaleString("en-IN") : "-"}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Outcome Summary</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p>Original Close: {report.summary?.originalClosureDate ?? "-"}</p>
          <p>New Close: {report.summary?.newClosureDate ?? "-"}</p>
          <p>Months Saved: {Math.max(0, report.summary?.monthsSaved ?? 0)}</p>
          <p className="font-semibold text-emerald-700">
            Interest Saved: {INR.format(report.summary?.interestSaved ?? 0)}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Applied Strategy</h2>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p>Monthly Extra: {INR.format(report.strategy?.monthlyExtra ?? 0)}</p>
          <p>Extra EMI Every: {report.strategy?.extraEmiEveryMonths ?? 0} months</p>
          <p>Yearly Lump Sum: {INR.format(report.strategy?.yearlyLumpSum ?? 0)}</p>
        </div>
      </section>
    </main>
  );
}
