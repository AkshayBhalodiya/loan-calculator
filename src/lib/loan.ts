export type LoanInput = {
  loanAmount: number;
  annualRate: number;
  tenureYears: number;
  startDate: string;
  loanType: "Home" | "Personal" | "Car";
  manualEmi: number | null;
};

export type StrategyInput = {
  monthlyExtra: number;
  extraEmiEveryMonths: number;
  yearlyLumpSum: number;
  /** When true, monthly extra is included in simulation (can combine with other options). */
  useMonthlyExtra?: boolean;
  usePeriodicExtraEmi?: boolean;
  useYearlyLumpSum?: boolean;
};

function resolveFlag(explicit: boolean | undefined, legacyActive: boolean): boolean {
  if (explicit === false) return false;
  if (explicit === true) return true;
  return legacyActive;
}

/** Which prepayment options are active (any 1, 2, or all 3 can be on). */
export function resolveStrategyFlags(strategy: StrategyInput) {
  return {
    monthly: resolveFlag(strategy.useMonthlyExtra, strategy.monthlyExtra > 0),
    periodic: resolveFlag(
      strategy.usePeriodicExtraEmi,
      strategy.extraEmiEveryMonths > 0
    ),
    yearly: resolveFlag(strategy.useYearlyLumpSum, strategy.yearlyLumpSum > 0),
  };
}

export function hasActiveStrategy(strategy: StrategyInput): boolean {
  const flags = resolveStrategyFlags(strategy);
  return flags.monthly || flags.periodic || flags.yearly;
}

export function strategySummary(strategy: StrategyInput): string {
  const flags = resolveStrategyFlags(strategy);
  const parts: string[] = [];
  if (flags.monthly && strategy.monthlyExtra > 0) {
    parts.push(`+${strategy.monthlyExtra}/month`);
  }
  if (flags.periodic && strategy.extraEmiEveryMonths > 0) {
    parts.push(`1 extra EMI every ${strategy.extraEmiEveryMonths} mo`);
  }
  if (flags.yearly && strategy.yearlyLumpSum > 0) {
    parts.push(`₹${strategy.yearlyLumpSum}/year`);
  }
  return parts.length ? parts.join(" + ") : "No extras (same as Plan A)";
}

export type AmortizationRow = {
  monthIndex: number;
  monthLabel: string;
  emi: number;
  interest: number;
  principal: number;
  extra: number;
  balance: number;
};

export type SimulationResult = {
  emi: number;
  totalInterest: number;
  totalPaid: number;
  closureDate: string;
  monthsTaken: number;
  schedule: AmortizationRow[];
};

export const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function toMonthLabel(isoDate: string, offset: number) {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function addMonths(isoDate: string, months: number) {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "long" });
}

/**
 * Whether to pay one extra full EMI in this payment month.
 * @param monthIndex 1-based month of the schedule (1st payment = 1, 2nd = 2, …)
 * @param everyMonths X = pay 1 extra full EMI every X months (0 = off)
 * @example everyMonths 2 → extra EMI in months 2, 4, 6, …
 */
export function isExtraEmiMonth(monthIndex: number, everyMonths: number): boolean {
  if (everyMonths <= 0 || monthIndex <= 0) return false;
  return monthIndex % everyMonths === 0;
}

/** User-facing explanation of the X-month interval field */
export function describeExtraEmiInterval(everyMonths: number): string {
  if (everyMonths <= 0) {
    return "Off — no periodic extra full EMI.";
  }
  if (everyMonths === 1) {
    return "Every month: 1 extra full EMI on top of your regular EMI.";
  }
  const examples = [everyMonths, everyMonths * 2, everyMonths * 3].join(", ");
  return `Every ${everyMonths} months: 1 extra full EMI (same as your EMI amount) — payment months ${examples}, …`;
}

export function calculateEmi(principal: number, annualRate: number, months: number) {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) {
    return principal / months;
  }
  const factor = (1 + monthlyRate) ** months;
  return (principal * monthlyRate * factor) / (factor - 1);
}

export function simulateLoan(
  loan: LoanInput,
  strategy: StrategyInput,
  useStrategy: boolean
): SimulationResult {
  const tenureMonths = loan.tenureYears * 12;
  const monthlyRate = loan.annualRate / 12 / 100;
  const baseEmi = loan.manualEmi && loan.manualEmi > 0
    ? loan.manualEmi
    : calculateEmi(loan.loanAmount, loan.annualRate, tenureMonths);

  let balance = loan.loanAmount;
  let totalInterest = 0;
  let totalPaid = 0;
  let month = 0;
  const rows: AmortizationRow[] = [];
  const maxMonths = tenureMonths * 2;

  while (balance > 0.01 && month < maxMonths) {
    const interest = balance * monthlyRate;
    let emi = baseEmi;
    let principal = emi - interest;
    let extra = 0;

    if (principal < 0) {
      principal = 0;
      emi = interest;
    }

    if (useStrategy) {
      const flags = resolveStrategyFlags(strategy);
      if (flags.monthly && strategy.monthlyExtra > 0) {
        extra += strategy.monthlyExtra;
      }
      if (
        flags.periodic &&
        isExtraEmiMonth(month + 1, strategy.extraEmiEveryMonths)
      ) {
        extra += baseEmi;
      }
      if (flags.yearly && (month + 1) % 12 === 0 && strategy.yearlyLumpSum > 0) {
        extra += strategy.yearlyLumpSum;
      }
    }

    const paymentApplied = Math.min(balance, principal + extra);
    const actualPrincipal = Math.min(principal, paymentApplied);
    const actualExtra = Math.max(0, paymentApplied - actualPrincipal);

    balance = Math.max(0, balance - paymentApplied);
    totalInterest += interest;
    totalPaid += interest + paymentApplied;

    rows.push({
      monthIndex: month + 1,
      monthLabel: toMonthLabel(loan.startDate, month),
      emi,
      interest,
      principal: actualPrincipal,
      extra: actualExtra,
      balance,
    });

    month += 1;
  }

  return {
    emi: baseEmi,
    totalInterest,
    totalPaid,
    closureDate: addMonths(loan.startDate, month - 1),
    monthsTaken: month,
    schedule: rows,
  };
}

/** Plain-English explanation of cash-flow risk level. */
export function describeCashFlowRisk(risk: "Low" | "Medium" | "High"): string {
  switch (risk) {
    case "Low":
      return "Your average extra payments are a small share of your EMI — usually easier on your monthly budget.";
    case "Medium":
      return "Your extra payments are a moderate share of your EMI — watch monthly cash flow when all extras apply.";
    case "High":
      return "Your extra payments are a large share of your EMI — ensure you can afford peaks (extra EMI months and yearly lump sums).";
  }
}

export function detectCashFlowRisk(
  baseEmi: number,
  strategy: StrategyInput
): "Low" | "Medium" | "High" {
  const flags = resolveStrategyFlags(strategy);
  const avgExtra =
    (flags.monthly ? strategy.monthlyExtra : 0) +
    (flags.periodic && strategy.extraEmiEveryMonths > 0
      ? baseEmi / strategy.extraEmiEveryMonths
      : 0) +
    (flags.yearly ? strategy.yearlyLumpSum / 12 : 0);
  const ratio = avgExtra / baseEmi;
  if (ratio < 0.3) return "Low";
  if (ratio < 0.7) return "Medium";
  return "High";
}
