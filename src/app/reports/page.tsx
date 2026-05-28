import Link from "next/link";
import { connectMongo } from "@/lib/mongodb";
import { ReportModel } from "@/lib/report-model";
import { INR } from "@/lib/loan";
import CopyShareButton from "@/components/copy-share-button";

export const dynamic = "force-dynamic";

type ReportDoc = {
  _id: { toString: () => string };
  createdAt?: string;
  loan?: {
    loanType?: string;
    loanAmount?: number;
    annualRate?: number;
    tenureYears?: number;
  };
  strategy?: {
    monthlyExtra?: number;
    extraEmiEveryMonths?: number;
    yearlyLumpSum?: number;
  };
  summary?: {
    originalClosureDate?: string;
    newClosureDate?: string;
    monthsSaved?: number;
    interestSaved?: number;
    risk?: string;
  };
};

type ReportsPageProps = {
  searchParams: Promise<{
    loanType?: string;
    risk?: string;
    minAmount?: string;
    maxAmount?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
    page?: string;
  }>;
};

type QueryState = {
  loanType: string;
  risk: string;
  minAmount: string;
  maxAmount: string;
  startDate: string;
  endDate: string;
  sort: string;
  page: number;
};

function buildPageLink(state: QueryState) {
  const params = new URLSearchParams();
  if (state.loanType && state.loanType !== "All") params.set("loanType", state.loanType);
  if (state.risk && state.risk !== "All") params.set("risk", state.risk);
  if (state.minAmount) params.set("minAmount", state.minAmount);
  if (state.maxAmount) params.set("maxAmount", state.maxAmount);
  if (state.startDate) params.set("startDate", state.startDate);
  if (state.endDate) params.set("endDate", state.endDate);
  if (state.sort && state.sort !== "latest") params.set("sort", state.sort);
  params.set("page", String(state.page));
  return `/reports?${params.toString()}`;
}

function isoDateNDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const selectedLoanType = params.loanType ?? "All";
  const selectedRisk = params.risk ?? "All";
  const selectedMinAmount = params.minAmount ?? "";
  const selectedMaxAmount = params.maxAmount ?? "";
  const selectedStartDate = params.startDate ?? "";
  const selectedEndDate = params.endDate ?? "";
  const selectedSort = params.sort ?? "latest";
  const page = Number(params.page ?? "1");
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;

  const currentState: QueryState = {
    loanType: selectedLoanType,
    risk: selectedRisk,
    minAmount: selectedMinAmount,
    maxAmount: selectedMaxAmount,
    startDate: selectedStartDate,
    endDate: selectedEndDate,
    sort: selectedSort,
    page: safePage,
  };
  const shareUrl = `http://localhost:3000${buildPageLink(currentState)}`;

  let reports: ReportDoc[] = [];
  let error = "";
  let totalPages = 1;

  const filters: Record<string, unknown> = {};
  if (selectedLoanType !== "All") {
    filters["loan.loanType"] = selectedLoanType;
  }
  if (selectedRisk !== "All") {
    filters["summary.risk"] = selectedRisk;
  }
  const minAmountNum = Number(selectedMinAmount);
  const maxAmountNum = Number(selectedMaxAmount);
  if (!Number.isNaN(minAmountNum) && minAmountNum > 0) {
    filters["loan.loanAmount"] = {
      ...(filters["loan.loanAmount"] as Record<string, number>),
      $gte: minAmountNum,
    };
  }
  if (!Number.isNaN(maxAmountNum) && maxAmountNum > 0) {
    filters["loan.loanAmount"] = {
      ...(filters["loan.loanAmount"] as Record<string, number>),
      $lte: maxAmountNum,
    };
  }
  if (selectedStartDate || selectedEndDate) {
    const createdAt: Record<string, Date> = {};
    if (selectedStartDate) createdAt.$gte = new Date(selectedStartDate);
    if (selectedEndDate) createdAt.$lte = new Date(selectedEndDate);
    filters.createdAt = createdAt;
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    latest: { createdAt: -1 },
    maxInterestSaved: { "summary.interestSaved": -1, createdAt: -1 },
    maxMonthsSaved: { "summary.monthsSaved": -1, createdAt: -1 },
  };
  const sortConfig = sortMap[selectedSort] ?? sortMap.latest;

  try {
    await connectMongo();
    const limit = 8;
    const [docs, total] = await Promise.all([
      ReportModel.find(filters)
        .sort(sortConfig)
        .skip((safePage - 1) * limit)
        .limit(limit)
        .lean(),
      ReportModel.countDocuments(filters),
    ]);
    reports = docs as ReportDoc[];
    totalPages = Math.max(1, Math.ceil(total / limit));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    error = message.includes("MONGODB_URI")
      ? "MONGODB_URI missing. Add it in .env.local to view saved reports."
      : "Unable to load reports right now.";
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8">
      <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Saved Reports</h1>
        <p className="mt-2 text-slate-200">
          Review previously generated loan strategy reports.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900"
        >
          Back to Calculator
        </Link>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <Link
            href={buildPageLink({
              ...currentState,
              startDate: isoDateNDaysAgo(7),
              endDate: new Date().toISOString().slice(0, 10),
              page: 1,
            })}
            className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white"
          >
            Last 7 Days
          </Link>
          <Link
            href={buildPageLink({
              ...currentState,
              startDate: isoDateNDaysAgo(30),
              endDate: new Date().toISOString().slice(0, 10),
              page: 1,
            })}
            className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white"
          >
            Last 30 Days
          </Link>
          <Link
            href={buildPageLink({ ...currentState, risk: "High", page: 1 })}
            className="rounded-full bg-rose-600 px-3 py-1 text-xs text-white"
          >
            High Risk Only
          </Link>
          <CopyShareButton url={shareUrl} />
        </div>
        <form className="grid gap-3 md:grid-cols-4">
          <label className="text-sm text-slate-700">
            Loan Type
            <select
              name="loanType"
              defaultValue={selectedLoanType}
              className="mt-1 w-full rounded-md border p-2"
            >
              <option>All</option>
              <option>Home</option>
              <option>Personal</option>
              <option>Car</option>
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Risk
            <select
              name="risk"
              defaultValue={selectedRisk}
              className="mt-1 w-full rounded-md border p-2"
            >
              <option>All</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Sort
            <select
              name="sort"
              defaultValue={selectedSort}
              className="mt-1 w-full rounded-md border p-2"
            >
              <option value="latest">Latest</option>
              <option value="maxInterestSaved">Max Interest Saved</option>
              <option value="maxMonthsSaved">Max Months Saved</option>
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Min Amount
            <input
              type="number"
              name="minAmount"
              defaultValue={selectedMinAmount}
              className="mt-1 w-full rounded-md border p-2"
              placeholder="e.g. 1000000"
            />
          </label>
          <label className="text-sm text-slate-700">
            Max Amount
            <input
              type="number"
              name="maxAmount"
              defaultValue={selectedMaxAmount}
              className="mt-1 w-full rounded-md border p-2"
              placeholder="e.g. 9000000"
            />
          </label>
          <label className="text-sm text-slate-700">
            Start Date
            <input
              type="date"
              name="startDate"
              defaultValue={selectedStartDate}
              className="mt-1 w-full rounded-md border p-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            End Date
            <input
              type="date"
              name="endDate"
              defaultValue={selectedEndDate}
              className="mt-1 w-full rounded-md border p-2"
            />
          </label>
          <input type="hidden" name="page" value="1" />
          <div className="flex items-end gap-2 md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            >
              Apply Filters
            </button>
            <Link
              href="/reports"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {error ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          {error}
        </section>
      ) : null}

      {!error && reports.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
          No reports found yet. Save one from the calculator page.
        </section>
      ) : null}

      {!error ? (
        <section className="grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <article
              key={report._id.toString()}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {(report.loan?.loanType ?? "Loan")} Loan Report
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  Risk: {report.summary?.risk ?? "N/A"}
                </span>
              </div>

              <div className="grid gap-2 text-sm text-slate-700">
                <p>Amount: {INR.format(report.loan?.loanAmount ?? 0)}</p>
                <p>Rate: {report.loan?.annualRate ?? 0}%</p>
                <p>Tenure: {report.loan?.tenureYears ?? 0} years</p>
                <p>
                  Interest Saved:{" "}
                  <span className="font-semibold text-emerald-700">
                    {INR.format(report.summary?.interestSaved ?? 0)}
                  </span>
                </p>
                <p>Months Saved: {Math.max(0, report.summary?.monthsSaved ?? 0)}</p>
                <p>Original Close: {report.summary?.originalClosureDate ?? "-"}</p>
                <p>New Close: {report.summary?.newClosureDate ?? "-"}</p>
                <p className="text-xs text-slate-500">
                  Saved:{" "}
                  {report.createdAt
                    ? new Date(report.createdAt).toLocaleString("en-IN")
                    : "-"}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
                <p>
                  Strategy: +{INR.format(report.strategy?.monthlyExtra ?? 0)} monthly,
                  extra EMI every {report.strategy?.extraEmiEveryMonths ?? 0} months,
                  yearly lump sum {INR.format(report.strategy?.yearlyLumpSum ?? 0)}.
                </p>
                <Link
                  href={`/reports/${report._id.toString()}`}
                  className="mt-2 inline-block text-indigo-700 hover:underline"
                >
                  View Full Detail
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {!error ? (
        <section className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={buildPageLink({ ...currentState, page: Math.max(1, safePage - 1) })}
              className={`rounded-md px-3 py-2 text-sm ${
                safePage === 1
                  ? "pointer-events-none bg-slate-100 text-slate-400"
                  : "bg-slate-900 text-white"
              }`}
            >
              Previous
            </Link>
            <Link
              href={buildPageLink({
                ...currentState,
                page: Math.min(totalPages, safePage + 1),
              })}
              className={`rounded-md px-3 py-2 text-sm ${
                safePage >= totalPages
                  ? "pointer-events-none bg-slate-100 text-slate-400"
                  : "bg-slate-900 text-white"
              }`}
            >
              Next
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}
