"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BankRate } from "@/lib/rates";
import DashboardLink from "@/components/dashboard-link";
import PlanGuide from "@/components/plan-guide";
import { StrategyFields, strategySummary } from "@/components/strategy-fields";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
import { useNotificationStore } from "@/hooks/use-notification-store";

export default function Home() {
  const { data: session } = useSession();
  const { addNotification } = useNotificationStore();
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

  const halfPrincipalMilestone = useMemo(() => {
    const target = loan.loanAmount / 2;
    const baseMonth = basePlan.schedule.find((row) => row.balance <= target);
    const smartMonth = smartPlan.schedule.find((row) => row.balance <= target);
    return {
      base: baseMonth ? { month: baseMonth.monthIndex, label: baseMonth.monthLabel } : null,
      smart: smartMonth ? { month: smartMonth.monthIndex, label: smartMonth.monthLabel } : null,
    };
  }, [loan.loanAmount, basePlan.schedule, smartPlan.schedule]);

  const interestSaved = basePlan.totalInterest - smartPlan.totalInterest;
  const monthsSaved = basePlan.monthsTaken - smartPlan.monthsTaken;
  const yearsSaved = (monthsSaved / 12).toFixed(1);

  const cashFlowRisk = detectCashFlowRisk(basePlan.emi, strategy);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [schedulePage, setSchedulePage] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get("state");
    if (!stateParam) return;

    try {
      const jsonStr = decodeURIComponent(escape(atob(stateParam)));
      const data = JSON.parse(jsonStr);

      if (data.loan) {
        setLoan((prev) => ({ ...prev, ...data.loan }));
      }
      if (data.strategy) {
        setStrategy((prev) => ({ ...prev, ...data.strategy }));
      }
      addNotification("Successfully restored calculator inputs from shared URL! 🚀", "success");
    } catch (err) {
      console.error("Failed to restore state from URL:", err);
      addNotification("Failed to restore shared state from URL.", "error");
    }
  }, [addNotification]);

  async function copyShareUrl() {
    const payload = { loan, strategy };
    const jsonStr = JSON.stringify(payload);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const shareUrl = `${window.location.origin}/?state=${base64}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      addNotification("Calculator state URL copied to clipboard! 🔗", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      addNotification("Failed to copy share URL.", "error");
    }
  }

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
    addNotification("Recalculating on the server...", "info");
    const response = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loan, strategy }),
    });
    const result = await response.json();
    if (!result.success) {
      const msg = result.message || "Server verification failed.";
      setApiVerifyMessage(msg);
      addNotification(msg, "error");
      return;
    }
    const serverSaved = Math.round(result.summary.interestSaved);
    const localSaved = Math.round(interestSaved);
    const isMatch = serverSaved === localSaved;
    const finalMsg = isMatch
      ? `Server matches your screen — interest saved ${INR.format(serverSaved)}`
      : `Mismatch: on-screen ${INR.format(localSaved)} vs server ${INR.format(serverSaved)}`;
    setApiVerifyMessage(finalMsg);
    addNotification(finalMsg, isMatch ? "success" : "warning");
  }

  async function runCompare() {
    setCompareResult("Comparing your main plan with the alternative…");
    addNotification("Comparing main plan with alternative...", "info");
    setCompareDetails(null);
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loan, strategyA: strategy, strategyB: strategyC }),
    });
    const result = await response.json();
    if (!result.success) {
      const msg = result.message || "Compare failed.";
      setCompareResult(msg);
      addNotification(msg, "error");
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
    const finalMsg = `Lower total interest: ${winnerLabel} — saves ${INR.format(c.interestDifference)} and closes the loan ${c.monthsDifference} month(s) earlier.`;
    setCompareResult(finalMsg);
    addNotification("Comparison loaded successfully!", "success");
  }

  async function saveReport() {
    if (!session?.user?.email) {
      const msg = "Sign in required to save reports.";
      setSaveMessage(msg);
      addNotification(msg, "warning");
      return;
    }
    setSaveMessage("Saving report...");
    addNotification("Saving report to database...", "info");
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
      const msg = `Report saved. ID: ${result.reportId}`;
      setSaveMessage(msg);
      addNotification("Strategy report saved successfully!", "success");
      return;
    }
    const failMsg = result.message || "Save failed.";
    setSaveMessage(failMsg);
    addNotification(failMsg, "error");
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
              onClick={copyShareUrl}
              id="share-state-btn"
            >
              <i className="fa-solid fa-share-nodes mr-1"></i>
              {copied ? "URL Copied!" : "Share Strategy Link"}
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

      {/* Prepayment Bento Grid Hub */}
      <section className="space-y-4">
        <div>
          <h2 className={UI.title}>Step 5 — Bento Strategy Hub</h2>
          <p className={UI.subtitleSm}>
            Advanced dynamic insights, prepayment rules, and cash flow analysis based on your loan structure.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {/* Card 1: Milestones (Col-span 2, Row-span 2 on Desktop / Col-span 1, Row-span 2 on Tablet) */}
          <Card className="flex flex-col justify-between overflow-hidden border-indigo-100 dark:border-indigo-950 md:col-span-1 md:row-span-2 lg:col-span-2 lg:row-span-2 shadow-md bg-gradient-to-br from-indigo-50/30 to-violet-50/10 dark:from-indigo-950/20 dark:to-violet-950/5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">Equity Milestone</span>
              </div>
              <CardTitle className="text-2xl font-bold">50% Principal Payoff</CardTitle>
              <CardDescription>
                Track when you officially own half of your asset. Prepayments heavily accelerate this milestone.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex-grow flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Baseline (Plan A)</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {halfPrincipalMilestone.base ? `Month ${halfPrincipalMilestone.base.month} (${halfPrincipalMilestone.base.label})` : "N/A"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-slate-500 h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: halfPrincipalMilestone.base 
                          ? `${Math.min(100, (halfPrincipalMilestone.base.month / (loan.tenureYears * 12)) * 100)}%` 
                          : "0%" 
                      }} 
                    />
                  </div>
                </div>

                <div className="relative">
                  <div className="flex justify-between text-xs font-semibold mb-1 text-indigo-600 dark:text-indigo-400">
                    <span>Your Plan (Plan B)</span>
                    <span>
                      {halfPrincipalMilestone.smart ? `Month ${halfPrincipalMilestone.smart.month} (${halfPrincipalMilestone.smart.label})` : "N/A"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: halfPrincipalMilestone.smart 
                          ? `${Math.min(100, (halfPrincipalMilestone.smart.month / (loan.tenureYears * 12)) * 100)}%` 
                          : "0%" 
                      }} 
                    />
                  </div>
                </div>
              </div>

              {halfPrincipalMilestone.base && halfPrincipalMilestone.smart && halfPrincipalMilestone.base.month > halfPrincipalMilestone.smart.month ? (
                <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/20 dark:border-indigo-950/30 dark:bg-indigo-950/10 text-sm">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">Milestone Accelerated! </span>
                  You reach 50% equity <strong className="text-indigo-800 dark:text-indigo-300 font-bold">{halfPrincipalMilestone.base.month - halfPrincipalMilestone.smart.month} months</strong> ({((halfPrincipalMilestone.base.month - halfPrincipalMilestone.smart.month) / 12).toFixed(1)} years) faster with your prepayment strategy.
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-sm text-slate-500">
                  Enable prepayments in Step 2 to accelerate your 50% equity payoff milestone.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Strategy Insights (Col-span 2, Row-span 1 on Desktop & Tablet) */}
          <Card className="flex flex-col justify-between border-slate-200 dark:border-slate-800 md:col-span-2 md:row-span-1 lg:col-span-2 lg:row-span-1 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <span className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">Prepayment Power</span>
              </div>
              <CardTitle className="text-xl font-bold">Amortization Acceleration</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Regular prepayments attack the principal directly, reducing the base on which interest is compounded. 
                With your current setup, you are saving <strong className="text-emerald-600 dark:text-emerald-400">{INR.format(Math.max(0, interestSaved))}</strong> in total interest.
              </p>
              
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Avg. Interest Red. / Mo</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {INR.format(Math.max(0, interestSaved / (smartPlan.monthsTaken || 1)))}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Equivalent EMI Saved</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {Math.max(0, interestSaved / (basePlan.emi || 1)).toFixed(1)} EMIs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: The 10% Prepayment Rule (Col-span 1, Row-span 1 on Desktop & Tablet) */}
          <Card className="flex flex-col justify-between border-slate-200 dark:border-slate-800 md:col-span-1 md:row-span-1 lg:col-span-1 lg:row-span-1 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold tracking-wider text-amber-600 dark:text-amber-400 uppercase">Smart Tip</span>
              </div>
              <CardTitle className="text-lg font-bold">The 10% Rule</CardTitle>
              <CardDescription className="text-xs">
                Prepay 10% of the original principal (₹{INR.format(loan.loanAmount * 0.1)}) yearly or as a one-time lump sum.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              <p className="text-xs leading-normal text-slate-500">
                Slashing interest costs significantly by paying a lump sum early in the tenure when the balance is highest.
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <button
                type="button"
                onClick={() => {
                  updateStrategy({
                    yearlyLumpSum: loan.loanAmount * 0.1,
                    useYearlyLumpSum: true,
                  });
                  addNotification(`Applied 10% Prepayment Preset: ${INR.format(loan.loanAmount * 0.1)}`, "success");
                }}
                className="w-full text-center py-2 px-3 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors border border-amber-200/50 dark:border-amber-900/30"
              >
                Apply 10% Preset (₹{INR.format(loan.loanAmount * 0.1)})
              </button>
            </CardFooter>
          </Card>

          {/* Card 4: Cash Flow Resilience (Col-span 1, Row-span 1 on Desktop & Tablet) */}
          <Card className="flex flex-col justify-between border-slate-200 dark:border-slate-800 md:col-span-1 md:row-span-1 lg:col-span-1 lg:row-span-1 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-1">
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-2 rounded-lg ${
                  cashFlowRisk === "High" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                  cashFlowRisk === "Medium" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" :
                  "bg-green-500/10 text-green-600 dark:text-green-400"
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Resilience</span>
              </div>
              <CardTitle className="text-lg font-bold">Cash Flow Health</CardTitle>
            </CardHeader>
            <CardContent className="pt-1 pb-4 flex-grow flex flex-col justify-between">
              <div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-xs text-slate-500">Risk Score:</span>
                  <span className={`text-sm font-bold ${
                    cashFlowRisk === "High" ? "text-rose-600 dark:text-rose-400" :
                    cashFlowRisk === "Medium" ? "text-yellow-600 dark:text-yellow-400" :
                    "text-green-600 dark:text-green-400"
                  }`}>
                    {cashFlowRisk} Risk
                  </span>
                </div>
                <p className="text-xs leading-normal text-slate-500">
                  {cashFlowRisk === "High" ? "Peak payment months will require high savings. Ensure a robust liquid emergency fund." :
                   cashFlowRisk === "Medium" ? "Comfortable prepayment, but monitor months where extra EMI and yearly lump sum coincide." :
                   "Prepayment rate is very manageable. Your budget holds excellent stability."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className={UI.title}>Step 6 — Results at a glance</h2>
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
        <h2 className={UI.titleSm}>Step 7 — Strategy insights</h2>
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
          <h2 className={UI.title}>Step 8 — Charts</h2>
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
        <h2 className={UI.titleSm}>Step 9 — Payment schedule</h2>
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
