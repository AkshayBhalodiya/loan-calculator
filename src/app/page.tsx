"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BankRate } from "@/lib/rates";
import DashboardLink from "@/components/dashboard-link";
import PlanGuide from "@/components/plan-guide";
import { StrategyFields, strategySummary } from "@/components/strategy-fields";
import { useSession } from "next-auth/react";
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
  describeCashFlowRisk,
  detectCashFlowRisk,
  INR,
  LoanInput,
  simulateLoan,
  StrategyInput,
} from "@/lib/loan";
import { UI } from "@/lib/ui-classes";
import { useChartTheme } from "@/hooks/use-chart-theme";

export default function Home() {
  const { data: session } = useSession();
  const chart = useChartTheme();
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
    useMonthlyExtra: false,
    usePeriodicExtraEmi: false,
    useYearlyLumpSum: false,
  });
  const [strategyC, setStrategyC] = useState<StrategyInput>({
    monthlyExtra: 5000,
    extraEmiEveryMonths: 6,
    yearlyLumpSum: 50000,
    useMonthlyExtra: true,
    usePeriodicExtraEmi: true,
    useYearlyLumpSum: true,
  });
  const [compareDetails, setCompareDetails] = useState<{
    winner: string;
    interestDifference: number;
    monthsDifference: number;
    strategyA: { closureDate: string; totalInterest: number; monthsTaken: number; risk: string };
    strategyB: { closureDate: string; totalInterest: number; monthsTaken: number; risk: string };
  } | null>(null);
  const [reportTitle, setReportTitle] = useState("");
  const [bankRates, setBankRates] = useState<BankRate[]>([]);
  const [suggestedRate, setSuggestedRate] = useState<number | null>(null);
  const [compareResult, setCompareResult] = useState<string>("");
  const [apiVerifyMessage, setApiVerifyMessage] = useState("");
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
  const planCPreview = useMemo(
    () => simulateLoan(loan, strategyC, true),
    [loan, strategyC]
  );

  const interestSaved = basePlan.totalInterest - smartPlan.totalInterest;
  const monthsSaved = basePlan.monthsTaken - smartPlan.monthsTaken;
  const yearsSaved = (monthsSaved / 12).toFixed(1);

  const cashFlowRisk = detectCashFlowRisk(basePlan.emi, strategy);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [schedulePage, setSchedulePage] = useState(1);

  useEffect(() => {
    fetch(`/api/rates?loanType=${loan.loanType}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setBankRates(data.rates ?? []);
          setSuggestedRate(data.suggestedRate ?? null);
        }
      })
      .catch(() => {});
  }, [loan.loanType]);

  const pieData = [
    { name: "Interest on baseline plan", value: Math.round(basePlan.totalInterest) },
    {
      name: "Interest saved with your plan",
      value: Math.max(0, Math.round(interestSaved)),
    },
  ];
  const tenureBarData = [
    { name: "Baseline (no extras)", months: basePlan.monthsTaken },
    { name: "Your prepayment plan", months: smartPlan.monthsTaken },
  ];

  const PLAN_C_PRESETS: { label: string; hint: string; value: StrategyInput }[] = [
    {
      label: "Light",
      hint: "Monthly + yearly",
      value: {
        monthlyExtra: 2000,
        extraEmiEveryMonths: 0,
        yearlyLumpSum: 25000,
        useMonthlyExtra: true,
        usePeriodicExtraEmi: false,
        useYearlyLumpSum: true,
      },
    },
    {
      label: "Moderate",
      hint: "All 3 options",
      value: {
        monthlyExtra: 5000,
        extraEmiEveryMonths: 6,
        yearlyLumpSum: 50000,
        useMonthlyExtra: true,
        usePeriodicExtraEmi: true,
        useYearlyLumpSum: true,
      },
    },
    {
      label: "Aggressive",
      hint: "All 3 options",
      value: {
        monthlyExtra: 10000,
        extraEmiEveryMonths: 3,
        yearlyLumpSum: 100000,
        useMonthlyExtra: true,
        usePeriodicExtraEmi: true,
        useYearlyLumpSum: true,
      },
    },
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

  async function verifyViaApi() {
    setApiVerifyMessage("Recalculating on the server…");
    const response = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loan, strategy }),
    });
    const result = await response.json();
    if (!result.success) {
      setApiVerifyMessage(result.message || "Server verification failed.");
      return;
    }
    const serverSaved = Math.round(result.summary.interestSaved);
    const localSaved = Math.round(interestSaved);
    setApiVerifyMessage(
      serverSaved === localSaved
        ? `Server matches your screen — interest saved ${INR.format(serverSaved)}`
        : `Mismatch: on-screen ${INR.format(localSaved)} vs server ${INR.format(serverSaved)}`
    );
  }

  async function runCompare() {
    setCompareResult("Comparing your main plan with the alternative…");
    setCompareDetails(null);
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loan, strategyA: strategy, strategyB: strategyC }),
    });
    const result = await response.json();
    if (!result.success) {
      setCompareResult(result.message || "Compare failed.");
      return;
    }
    const c = result.comparison;
    setCompareDetails(c);
    const winnerLabel =
      c.winner === "A"
        ? "Plan B (your main plan)"
        : c.winner === "B"
          ? "Plan C (alternative)"
          : "Both are equal";
    setCompareResult(
      `Lower total interest: ${winnerLabel} — saves ${INR.format(c.interestDifference)} and closes the loan ${c.monthsDifference} month(s) earlier.`
    );
  }

  async function saveReport() {
    if (!session?.user?.email) {
      setSaveMessage("Sign in required to save reports.");
      return;
    }
    setSaveMessage("Saving report...");
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: reportTitle.trim() || undefined,
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
      <section className={UI.hero}>
        <h1 className={UI.titleHero}>LoanWise — EMI Strategy Planner</h1>
        <p className={UI.subtitle}>
          Compare your bank&apos;s baseline schedule with a custom prepayment plan.
          See interest saved, loan end date, charts, and a full payment schedule.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/reports" className={UI.btnHero}>
            View Saved Reports
          </Link>
          <DashboardLink className={UI.btnPrimary} />
        </div>
      </section>

      <PlanGuide />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className={UI.planAEdit}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="inline-block rounded-full bg-slate-600 px-2.5 py-0.5 text-xs font-bold text-white">
                Loan setup
              </span>
              <h2 className={`mt-1 ${UI.title}`}>Step 1 — Loan details</h2>
              <p className={UI.subtitle}>
                Enter amount, rate, tenure, and start date. Used for Plan A (baseline) and
                Plan B (your prepayment plan).
              </p>
            </div>
            <p className="lw-muted max-w-[10rem] text-right text-xs sm:text-left">
              <span className="block font-medium text-[var(--lw-text)]">Baseline EMI</span>
              {INR.format(basePlan.emi)}
            </p>
          </div>

          {bankRates.length > 0 ? (
            <p className="lw-muted mb-4 rounded-lg border border-dashed border-[var(--lw-border)] bg-[var(--lw-surface)] px-3 py-2 text-xs leading-relaxed">
              <span className="lw-label font-semibold">Reference rates ({loan.loanType}): </span>
              {bankRates
                .slice(0, 3)
                .map((r) => `${r.bank} ${r.rateMin}–${r.rateMax}%`)
                .join(" · ")}
              {suggestedRate !== null ? (
                <span className="lw-link mt-1 block">
                  Suggested for this type: {suggestedRate}% — use the button on the rate field.
                </span>
              ) : null}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`${UI.loanField} sm:col-span-2`}>
              <label className={UI.label}>
                Loan amount (₹)
                <span className="lw-muted mt-0.5 block text-xs font-normal">
                  Total principal you are borrowing
                </span>
                <input
                  type="number"
                  className={UI.input}
                  value={loan.loanAmount}
                  onChange={(e) =>
                    updateLoan({ loanAmount: Number(e.target.value) })
                  }
                />
              </label>
            </div>

            <div className={`${UI.loanField} sm:col-span-2`}>
              <label className={UI.label}>
                Interest rate (% per year)
                <span className="lw-muted mt-0.5 block text-xs font-normal">
                  Annual rate from your bank or agreement
                </span>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    className={UI.inputInline}
                    value={loan.annualRate}
                    onChange={(e) =>
                      updateLoan({ annualRate: Number(e.target.value) })
                    }
                  />
                  {suggestedRate !== null ? (
                    <button
                      type="button"
                      className="lw-btn-secondary shrink-0 px-3 text-xs font-medium"
                      onClick={() => updateLoan({ annualRate: suggestedRate })}
                    >
                      Use {suggestedRate}%
                    </button>
                  ) : null}
                </div>
              </label>
            </div>

            <div className={UI.loanField}>
              <label className={UI.label}>
                Tenure (years)
                <span className="lw-muted mt-0.5 block text-xs font-normal">
                  Original loan length
                </span>
                <input
                  type="number"
                  className={UI.input}
                  value={loan.tenureYears}
                  onChange={(e) =>
                    updateLoan({ tenureYears: Number(e.target.value) })
                  }
                />
              </label>
            </div>

            <div className={UI.loanField}>
              <label className={UI.label}>
                Start date
                <span className="lw-muted mt-0.5 block text-xs font-normal">
                  First EMI payment month
                </span>
                <input
                  type="date"
                  className={UI.input}
                  value={loan.startDate}
                  onChange={(e) =>
                    updateLoan({ startDate: e.target.value })
                  }
                />
              </label>
            </div>

            <div className={UI.loanField}>
              <label className={UI.label}>
                Loan type
                <span className="lw-muted mt-0.5 block text-xs font-normal">
                  Used for reference rates
                </span>
                <select
                  className={UI.input}
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
            </div>

            <div className={UI.loanField}>
              <label className={UI.label}>
                Manual EMI (optional)
                <span className="lw-muted mt-0.5 block text-xs font-normal">
                  Leave blank to auto-calculate from amount, rate, and tenure
                </span>
                <input
                  type="number"
                  className={UI.input}
                  placeholder="Auto-calculated"
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
        </div>

        <div className={UI.planBEdit}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="inline-block rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
                Plan B
              </span>
              <h2 className={`mt-1 ${UI.title}`}>Step 2 — Your prepayment plan</h2>
              <p className={UI.subtitle}>
                Turn on any extras below. All charts and savings compare Plan A (baseline)
                with this plan (Plan B).
              </p>
            </div>
            <p className="lw-muted max-w-xs text-xs">{strategySummary(strategy)}</p>
          </div>
          <StrategyFields
            strategy={strategy}
            onChange={updateStrategy}
            idPrefix="plan-b"
          />
          <label className={`mt-3 block ${UI.label} sm:col-span-2`}>
            Report name (optional, for saving)
            <input
              className={UI.input}
              placeholder="e.g. Home loan — moderate prepayment"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={UI.btnSecondary}
              onClick={() => window.print()}
            >
              Print or save as PDF
            </button>
            <button
              type="button"
              className="rounded-lg bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-600"
              onClick={saveReport}
            >
              Save this strategy
            </button>
            <button
              type="button"
              className={UI.btnSecondary}
              onClick={verifyViaApi}
            >
              Verify with server
            </button>
          </div>
          {saveMessage ? <p className="lw-muted mt-2 text-sm">{saveMessage}</p> : null}
          {!session?.user?.email ? (
            <p className="lw-muted mt-2 text-sm">
              <Link href="/signup" className={UI.link}>
                Sign up
              </Link>{" "}
              or{" "}
              <Link href="/login" className={UI.link}>
                sign in
              </Link>{" "}
              to save reports to your account.
            </p>
          ) : null}
          {apiVerifyMessage ? <p className={`mt-1 text-sm ${UI.link}`}>{apiVerifyMessage}</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className={UI.title}>Step 3 — Plan comparison</h2>
          <p className={UI.subtitleSm}>
            Side-by-side results: baseline (Plan A) versus your prepayment plan (Plan B).
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
        <div className={UI.planA}>
          <span className="inline-block rounded-full bg-slate-600 px-2.5 py-0.5 text-xs font-bold text-white">
            Plan A
          </span>
          <h2 className={`mt-2 ${UI.titleSm}`}>Baseline — no prepayment</h2>
          <p className={UI.subtitle}>
            Standard EMI only, as the bank would schedule. Use this as your reference.
          </p>
          <ul className={UI.list}>
            <li>
              <span className="lw-muted">EMI: </span>
              <strong>{INR.format(basePlan.emi)}</strong>
            </li>
            <li>
              <span className="lw-muted">Total interest: </span>
              <strong>{INR.format(basePlan.totalInterest)}</strong>
            </li>
            <li>
              <span className="lw-muted">Loan ends: </span>
              <strong>{basePlan.closureDate}</strong>
            </li>
            <li>
              <span className="lw-muted">Duration: </span>
              <strong>{basePlan.monthsTaken} months</strong>
            </li>
          </ul>
        </div>

        <div className={UI.planB}>
          <span className="inline-block rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-bold text-white">
            Plan B
          </span>
          <h2 className={`mt-2 ${UI.titleSm}`}>Your plan — with prepayment</h2>
          <p className={UI.subtitle}>Active strategy: {strategySummary(strategy)}</p>
          <ul className={UI.list}>
            <li>
              <span className="lw-muted">Total interest: </span>
              <strong className={UI.success}>{INR.format(smartPlan.totalInterest)}</strong>
            </li>
            <li>
              <span className="lw-muted">You save vs Plan A: </span>
              <strong className={UI.success}>{INR.format(Math.max(0, interestSaved))}</strong>
            </li>
            <li>
              <span className="lw-muted">Loan ends: </span>
              <strong>{smartPlan.closureDate}</strong>
            </li>
            <li>
              <span className="lw-muted">Cash-flow risk: </span>
              <strong>{cashFlowRisk}</strong>
            </li>
          </ul>
        </div>
        </div>
      </section>

      <section className={UI.planC}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="inline-block rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
              Plan C
            </span>
            <h2 className={`mt-1 ${UI.title}`}>Step 4 — Alternative plan (optional)</h2>
            <p className={UI.subtitle}>
              Build a second prepayment mix (Plan C) and compare it with your main plan (Plan B).
            </p>
          </div>
        </div>

        <p className="lw-muted mb-2 text-xs font-medium">Quick presets for Plan C (alternative):</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {PLAN_C_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setStrategyC(preset.value)}
              className={UI.preset}
            >
              <span className="font-medium">{preset.label}</span>
              <span className="lw-muted block text-xs">{preset.hint}</span>
            </button>
          ))}
        </div>

        <StrategyFields
          strategy={strategyC}
          onChange={(u) => setStrategyC((s) => ({ ...s, ...u }))}
          idPrefix="plan-c"
        />

        <div className={`mt-4 text-sm ${UI.boxEmerald}`}>
          <p className="font-medium">Alternative plan preview (Plan C)</p>
          <p className="lw-muted mt-1">
            Total interest {INR.format(planCPreview.totalInterest)} · Loan ends{" "}
            {planCPreview.closureDate} · {planCPreview.monthsTaken} months
          </p>
        </div>

        <button
          type="button"
          onClick={runCompare}
          className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-600"
        >
          Compare main plan vs alternative
        </button>

        {compareResult ? (
          <p className="mt-3 text-sm font-medium">{compareResult}</p>
        ) : null}

        {compareDetails ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className={UI.boxIndigo}>
              <p className="text-xs font-bold">Your main plan (Plan B)</p>
              <p className="mt-1 text-sm">
                Total interest: {INR.format(compareDetails.strategyA.totalInterest)}
              </p>
              <p className="text-sm">Loan closes: {compareDetails.strategyA.closureDate}</p>
              <p className="text-sm">Cash-flow risk: {compareDetails.strategyA.risk}</p>
            </div>
            <div className={UI.boxEmerald}>
              <p className="text-xs font-bold">Alternative plan (Plan C)</p>
              <p className="mt-1 text-sm">
                Total interest: {INR.format(compareDetails.strategyB.totalInterest)}
              </p>
              <p className="text-sm">Loan closes: {compareDetails.strategyB.closureDate}</p>
              <p className="text-sm">Cash-flow risk: {compareDetails.strategyB.risk}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className={UI.title}>Step 5 — Results at a glance</h2>
          <p className={UI.subtitleSm}>Key numbers from your baseline versus prepayment plan.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
        <div className={UI.statCard}>
          <p className="lw-muted text-sm">Monthly EMI (baseline)</p>
          <p className="mt-1 text-2xl font-bold">{INR.format(basePlan.emi)}</p>
        </div>
        <div className={UI.statCard}>
          <p className="lw-muted text-sm">Total interest saved</p>
          <p className={`mt-1 text-2xl font-bold ${UI.success}`}>
            {INR.format(Math.max(0, interestSaved))}
          </p>
        </div>
        <div className={UI.statCard}>
          <p className="lw-muted text-sm">Years off the loan (earlier payoff)</p>
          <p className={`mt-1 ${UI.accentStat}`}>{yearsSaved}</p>
        </div>
        </div>
      </section>

      <section className={UI.card}>
        <h2 className={UI.titleSm}>Step 6 — Strategy insights</h2>
        <p className={UI.subtitleSm}>
          A plain summary of how your prepayment plan changes the loan — not AI-generated;
          calculated from your inputs.
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          <li>
            <span className="lw-muted font-medium">Baseline loan ends (Plan A): </span>
            {basePlan.closureDate} ({basePlan.monthsTaken} months, total interest{" "}
            {INR.format(basePlan.totalInterest)})
          </li>
          <li>
            <span className="lw-muted font-medium">With your plan (Plan B): </span>
            {smartPlan.closureDate} ({smartPlan.monthsTaken} months, total interest{" "}
            {INR.format(smartPlan.totalInterest)})
          </li>
          <li>
            <span className="lw-muted font-medium">Time saved: </span>
            {Math.max(0, monthsSaved)} months ({yearsSaved} years) earlier payoff
          </li>
          <li>
            <span className="lw-muted font-medium">Interest saved: </span>
            <span className={UI.success}>{INR.format(Math.max(0, interestSaved))}</span> versus
            baseline
          </li>
          <li>
            <span className="lw-muted font-medium">Active prepayment: </span>
            {strategySummary(strategy)}
          </li>
          <li>
            <span className="lw-muted font-medium">Cash-flow risk ({cashFlowRisk}): </span>
            {describeCashFlowRisk(cashFlowRisk)}
          </li>
          <li className="lw-muted border-t border-[var(--lw-border)] pt-3">
            Optional: use Step 4 above to test another prepayment mix (Plan C) against your main
            plan (Plan B).
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className={UI.title}>Step 7 — Charts</h2>
          <p className={UI.subtitleSm}>Visual comparison of interest, tenure, balance, and monthly interest.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
        <div className={UI.chartCard}>
          <h3 className={UI.titleSm}>Interest paid vs interest saved</h3>
          <p className="lw-muted mb-2 text-xs">Share of total interest on baseline plan versus amount saved with prepayment.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} fill="#4f46e5" />
                <Tooltip contentStyle={chart.tooltipStyle} />
                <Legend wrapperStyle={{ color: chart.axis }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={UI.chartCard}>
          <h3 className={UI.titleSm}>Loan tenure (months until fully paid)</h3>
          <p className="lw-muted mb-2 text-xs">How many months until the loan balance reaches zero.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tenureBarData}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: chart.axis }} />
                <YAxis tick={{ fill: chart.axis }} />
                <Tooltip contentStyle={chart.tooltipStyle} />
                <Legend wrapperStyle={{ color: chart.axis }} />
                <Bar dataKey="months" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={UI.chartCard}>
          <h3 className={UI.titleSm}>Outstanding balance over time</h3>
          <p className="lw-muted mb-2 text-xs">Remaining principal on your prepayment plan (Plan B), sampled every 6 months.</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: chart.axis }} />
                <YAxis tick={{ fill: chart.axis }} />
                <Tooltip contentStyle={chart.tooltipStyle} />
                <Legend wrapperStyle={{ color: chart.axis }} />
                <Line type="monotone" dataKey="balance" stroke="#10b981" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={UI.chartCard}>
          <h3 className={UI.titleSm}>Monthly interest over time</h3>
          <p className="lw-muted mb-2 text-xs">Interest portion of each payment on your prepayment plan (Plan B).</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: chart.axis }} />
                <YAxis tick={{ fill: chart.axis }} />
                <Tooltip contentStyle={chart.tooltipStyle} />
                <Legend wrapperStyle={{ color: chart.axis }} />
                <Area type="monotone" dataKey="interest" stroke="#f97316" fill="#fdba74" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>
      </section>

      <section className={UI.card}>
        <h2 className={UI.titleSm}>Step 8 — Payment schedule</h2>
        <p className={UI.subtitleSm}>
          Month-by-month breakdown for your prepayment plan (Plan B): EMI, interest, principal,
          extra payments, and remaining balance.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--lw-border)]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className={UI.tableHead}>
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
                <tr key={row.monthIndex} className={UI.tableRow}>
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
                <tr key={`print-${row.monthIndex}`} className={UI.tableRow}>
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
          <p className="lw-muted text-xs">
            Showing {(safeSchedulePage - 1) * schedulePageSize + 1}-
            {Math.min(safeSchedulePage * schedulePageSize, smartPlan.schedule.length)} of{" "}
            {smartPlan.schedule.length} months
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}
              disabled={safeSchedulePage === 1}
              className={`${UI.btnSecondary} px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Previous
            </button>
            <span className="lw-muted px-2 py-1 text-sm">
              {safeSchedulePage}/{totalSchedulePages}
            </span>
            <button
              type="button"
              onClick={() =>
                setSchedulePage((p) => Math.min(totalSchedulePages, p + 1))
              }
              disabled={safeSchedulePage === totalSchedulePages}
              className={`${UI.btnSecondary} px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
