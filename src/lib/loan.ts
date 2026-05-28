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
};

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
      extra += strategy.monthlyExtra;
      if (
        strategy.extraEmiEveryMonths > 0 &&
        (month + 1) % strategy.extraEmiEveryMonths === 0
      ) {
        extra += baseEmi;
      }
      if ((month + 1) % 12 === 0) {
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

export function detectCashFlowRisk(baseEmi: number, strategy: StrategyInput) {
  const avgExtra =
    strategy.monthlyExtra +
    (strategy.extraEmiEveryMonths > 0 ? baseEmi / strategy.extraEmiEveryMonths : 0) +
    strategy.yearlyLumpSum / 12;
  const ratio = avgExtra / baseEmi;
  if (ratio < 0.3) return "Low";
  if (ratio < 0.7) return "Medium";
  return "High";
}
