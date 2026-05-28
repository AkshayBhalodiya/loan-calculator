"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  detectCashFlowRisk,
  INR,
  LoanInput,
  simulateLoan,
  StrategyInput,
} from "@/lib/loan";

export default function Home() {
  const [loan, setLoan] = useState<LoanInput>({
    loanAmount: 5000000,
    annualRate: 8.5,
    tenureYears: 20,
    startDate: "2026-06-01",
    loanType: "Home",
    manualEmi: null,
  });
  const [strategy, setStrategy] = useState<StrategyInput>({
    monthlyExtra: 0,
    extraEmiEveryMonths: 0,
    yearlyLumpSum: 0,
  });
  const updateLoan = (updates: Partial<LoanInput>) => {
    setLoan((prev) => ({ ...prev, ...updates }));
    setSchedulePage(1);
  };
  const updateStrategy = (updates: Partial<StrategyInput>) => {
    setStrategy((prev) => ({ ...prev, ...updates }));
    setSchedulePage(1);
  };

  const basePlan = useMemo(
    () => simulateLoan(loan, strategy, false),
    [loan, strategy]
  );
  const smartPlan = useMemo(
    () => simulateLoan(loan, strategy, true),
    [loan, strategy]
  );

  const interestSaved = basePlan.totalInterest - smartPlan.totalInterest;
  const monthsSaved = basePlan.monthsTaken - smartPlan.monthsTaken;
  const yearsSaved = (monthsSaved / 12).toFixed(1);

  const cashFlowRisk = detectCashFlowRisk(basePlan.emi, strategy);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [schedulePage, setSchedulePage] = useState(1);

  const pieData = [
    { name: "Original Interest", value: Math.round(basePlan.totalInterest) },
    { name: "Interest Saved", value: Math.max(0, Math.round(interestSaved)) },
  ];
  const tenureBarData = [
    { name: "Original", months: basePlan.monthsTaken },
    { name: "Modified", months: smartPlan.monthsTaken },
  ];
  const trendData = smartPlan.schedule
    .filter((row) => row.monthIndex % 6 === 0 || row.monthIndex === 1)
    .map((row) => ({
      month: row.monthIndex,
      balance: Math.round(row.balance),
      interest: Math.round(row.interest),
    }));
  const schedulePageSize = 24;
  const totalSchedulePages = Math.max(
    1,
    Math.ceil(smartPlan.schedule.length / schedulePageSize)
  );
  const safeSchedulePage = Math.min(schedulePage, totalSchedulePages);
  const paginatedSchedule = smartPlan.schedule.slice(
    (safeSchedulePage - 1) * schedulePageSize,
    safeSchedulePage * schedulePageSize
  );

  async function saveReport() {
    setSaveMessage("Saving report...");
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loan,
        strategy,
        summary: {
          originalClosureDate: basePlan.closureDate,
          newClosureDate: smartPlan.closureDate,
          monthsSaved,
          interestSaved,
          risk: cashFlowRisk,
        },
        chartData: {
          pie: pieData,
          line: trendData.slice(0, 36),
        },
      }),
    });
    const result = await response.json();
    if (result.success) {
      setSaveMessage(`Report saved. ID: ${result.reportId}`);
      return;
    }
    setSaveMessage(result.message || "Save failed.");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-8">
      <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold">LoanWise - EMI Strategy Planner</h1>
        <p className="mt-2 text-slate-200">
          See how extra EMI and lump sums can close your loan faster and save
          interest.
        </p>
        <Link
          href="/reports"
          className="mt-4 inline-block rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          View Saved Reports
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">1) Loan Input</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Loan Amount
              <input
                type="number"
                className="mt-1 w-full rounded-md border p-2"
                value={loan.loanAmount}
                onChange={(e) =>
                  updateLoan({ loanAmount: Number(e.target.value) })
                }
              />
            </label>
            <label className="text-sm">
              Interest Rate (%)
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full rounded-md border p-2"
                value={loan.annualRate}
                onChange={(e) =>
                  updateLoan({ annualRate: Number(e.target.value) })
                }
              />
            </label>
            <label className="text-sm">
              Tenure (Years)
              <input
                type="number"
                className="mt-1 w-full rounded-md border p-2"
                value={loan.tenureYears}
                onChange={(e) =>
                  updateLoan({ tenureYears: Number(e.target.value) })
                }
              />
            </label>
            <label className="text-sm">
              Start Date
              <input
                type="date"
                className="mt-1 w-full rounded-md border p-2"
                value={loan.startDate}
                onChange={(e) =>
                  updateLoan({ startDate: e.target.value })
                }
              />
            </label>
            <label className="text-sm">
              Loan Type
              <select
                className="mt-1 w-full rounded-md border p-2"
                value={loan.loanType}
                onChange={(e) =>
                  updateLoan({ loanType: e.target.value as LoanInput["loanType"] })
                }
              >
                <option>Home</option>
                <option>Personal</option>
                <option>Car</option>
              </select>
            </label>
            <label className="text-sm">
              Manual EMI (Optional)
              <input
                type="number"
                className="mt-1 w-full rounded-md border p-2"
                value={loan.manualEmi ?? ""}
                onChange={(e) =>
                  updateLoan({
                    manualEmi: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">2) Strategy Options</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Fixed Monthly Extra
              <input
                type="number"
                className="mt-1 w-full rounded-md border p-2"
                value={strategy.monthlyExtra}
                onChange={(e) =>
                  updateStrategy({ monthlyExtra: Number(e.target.value) })
                }
              />
            </label>
            <label className="text-sm">
              Extra EMI Every X Months
              <input
                type="number"
                className="mt-1 w-full rounded-md border p-2"
                value={strategy.extraEmiEveryMonths}
                onChange={(e) =>
                  updateStrategy({ extraEmiEveryMonths: Number(e.target.value) })
                }
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Yearly Lump Sum
              <input
                type="number"
                className="mt-1 w-full rounded-md border p-2"
                value={strategy.yearlyLumpSum}
                onChange={(e) =>
                  updateStrategy({ yearlyLumpSum: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
              onClick={() => window.print()}
            >
              Export PDF (Print)
            </button>
            <button
              className="rounded-lg bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-600"
              onClick={saveReport}
            >
              Save Report
            </button>
          </div>
          {saveMessage ? (
            <p className="mt-2 text-sm text-slate-600">{saveMessage}</p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Current EMI</p>
          <p className="mt-1 text-2xl font-bold">{INR.format(basePlan.emi)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Interest Saved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {INR.format(Math.max(0, interestSaved))}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Years Saved</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{yearsSaved}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-semibold">3) AI-style Insights</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Original Closure: {basePlan.closureDate}</li>
            <li>New Closure: {smartPlan.closureDate}</li>
            <li>Months Saved: {Math.max(0, monthsSaved)}</li>
            <li>Cash Flow Risk: {cashFlowRisk}</li>
            <li>
              Best Strategy: Hybrid (monthly + periodic EMI + yearly lump sum)
            </li>
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-semibold">4) Interest Breakdown (Pie)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} fill="#4f46e5" />
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-semibold">5) Tenure Comparison (Bar)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tenureBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="months" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-semibold">6) Principal Reduction (Line)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="balance" stroke="#10b981" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-lg font-semibold">7) Interest Trend (Area)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="interest" stroke="#f97316" fill="#fdba74" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-lg font-semibold">8) Amortization Schedule (Modified Plan)</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="p-2">Month</th>
                <th className="p-2">EMI</th>
                <th className="p-2">Interest</th>
                <th className="p-2">Principal</th>
                <th className="p-2">Extra</th>
                <th className="p-2">Balance</th>
              </tr>
            </thead>
            <tbody className="print:hidden">
              {paginatedSchedule.map((row) => (
                <tr key={row.monthIndex} className="border-b border-slate-100">
                  <td className="p-2">
                    {row.monthIndex}. {row.monthLabel}
                  </td>
                  <td className="p-2">{INR.format(row.emi)}</td>
                  <td className="p-2">{INR.format(row.interest)}</td>
                  <td className="p-2">{INR.format(row.principal)}</td>
                  <td className="p-2">{INR.format(row.extra)}</td>
                  <td className="p-2">{INR.format(row.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tbody className="hidden print:table-row-group">
              {smartPlan.schedule.map((row) => (
                <tr key={`print-${row.monthIndex}`} className="border-b border-slate-100">
                  <td className="p-2">
                    {row.monthIndex}. {row.monthLabel}
                  </td>
                  <td className="p-2">{INR.format(row.emi)}</td>
                  <td className="p-2">{INR.format(row.interest)}</td>
                  <td className="p-2">{INR.format(row.principal)}</td>
                  <td className="p-2">{INR.format(row.extra)}</td>
                  <td className="p-2">{INR.format(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between print:hidden">
          <p className="text-xs text-slate-500">
            Showing {(safeSchedulePage - 1) * schedulePageSize + 1}-
            {Math.min(safeSchedulePage * schedulePageSize, smartPlan.schedule.length)} of{" "}
            {smartPlan.schedule.length} months
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}
              disabled={safeSchedulePage === 1}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-2 py-1 text-sm">
              {safeSchedulePage}/{totalSchedulePages}
            </span>
            <button
              type="button"
              onClick={() =>
                setSchedulePage((p) => Math.min(totalSchedulePages, p + 1))
              }
              disabled={safeSchedulePage === totalSchedulePages}
              className="rounded border border-slate-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
