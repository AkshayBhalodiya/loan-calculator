import Link from "next/link";
import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongodb";
import { ReportModel } from "@/lib/report-model";
import { INR } from "@/lib/loan";
import { auth } from "@/lib/auth";
import ReportActions from "@/components/report-actions";
import { UI } from "@/lib/ui-classes";

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

  const session = await auth();
  const { report, error } = await getReport(id);

  if (
    report?.userId &&
    report.userId !== session?.user?.email &&
    session?.user?.role !== "admin"
  ) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-8">
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          This report is private. Please sign in with the owner account.
        </p>
        <Link href="/login" className={`${UI.link} mt-4 inline-block`}>
          Sign in
        </Link>
      </main>
    );
  }

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
      <section className={UI.hero}>
        <h1 className={UI.titleHero}>Report Detail</h1>
        <p className={UI.subtitle}>Complete saved strategy analysis.</p>
        <Link href="/reports" className={`${UI.btnHero} mt-4`}>
          Back to Reports
        </Link>
        <a href={`/api/reports/${id}/pdf`} className={`${UI.btnPrimary} mt-4 ml-2`}>
          Download PDF
        </a>
      </section>

      <ReportActions
        reportId={id}
        initialTitle={report.title ?? `${report.loan?.loanType ?? "Loan"} Report`}
        initialNotes={report.notes ?? ""}
      />

      <section className={`${UI.card} grid gap-4 sm:grid-cols-2`}>
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

      <section className={UI.card}>
        <h2 className={UI.title}>Loan outcome summary</h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <p>Original Close: {report.summary?.originalClosureDate ?? "-"}</p>
          <p>New Close: {report.summary?.newClosureDate ?? "-"}</p>
          <p>Months Saved: {Math.max(0, report.summary?.monthsSaved ?? 0)}</p>
          <p className={UI.success}>
            Interest Saved: {INR.format(report.summary?.interestSaved ?? 0)}
          </p>
        </div>
      </section>

      <section className={UI.card}>
        <h2 className={UI.title}>Prepayment strategy used</h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <p>Extra every month: {INR.format(report.strategy?.monthlyExtra ?? 0)}</p>
          <p>Extra full EMI every: {report.strategy?.extraEmiEveryMonths ?? 0} months (0 = off)</p>
          <p>Yearly lump sum: {INR.format(report.strategy?.yearlyLumpSum ?? 0)}</p>
        </div>
      </section>
    </main>
  );
}
