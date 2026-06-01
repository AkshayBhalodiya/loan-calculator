import {
  detectCashFlowRisk,
  LoanInput,
  simulateLoan,
  StrategyInput,
} from "@/lib/loan";

export function buildSimulationSummary(
  loan: LoanInput,
  strategy: StrategyInput
) {
  const basePlan = simulateLoan(loan, strategy, false);
  const smartPlan = simulateLoan(loan, strategy, true);
  const interestSaved = basePlan.totalInterest - smartPlan.totalInterest;
  const monthsSaved = basePlan.monthsTaken - smartPlan.monthsTaken;

  return {
    basePlan,
    smartPlan,
    summary: {
      originalClosureDate: basePlan.closureDate,
      newClosureDate: smartPlan.closureDate,
      monthsSaved,
      interestSaved,
      risk: detectCashFlowRisk(basePlan.emi, strategy),
    },
    chartData: {
      pie: [
        { name: "Original Interest", value: Math.round(basePlan.totalInterest) },
        { name: "Interest Saved", value: Math.max(0, Math.round(interestSaved)) },
      ],
      line: smartPlan.schedule
        .filter((row) => row.monthIndex % 6 === 0 || row.monthIndex === 1)
        .slice(0, 36)
        .map((row) => ({
          month: row.monthIndex,
          balance: Math.round(row.balance),
          interest: Math.round(row.interest),
        })),
    },
  };
}

export function compareStrategies(
  loan: LoanInput,
  strategyA: StrategyInput,
  strategyB: StrategyInput
) {
  const planA = simulateLoan(loan, strategyA, true);
  const planB = simulateLoan(loan, strategyB, true);
  return {
    strategyA: {
      plan: planA,
      risk: detectCashFlowRisk(planA.emi, strategyA),
      totalInterest: planA.totalInterest,
      monthsTaken: planA.monthsTaken,
      closureDate: planA.closureDate,
    },
    strategyB: {
      plan: planB,
      risk: detectCashFlowRisk(planB.emi, strategyB),
      totalInterest: planB.totalInterest,
      monthsTaken: planB.monthsTaken,
      closureDate: planB.closureDate,
    },
    winner:
      planA.totalInterest < planB.totalInterest
        ? "A"
        : planB.totalInterest < planA.totalInterest
          ? "B"
          : "tie",
    interestDifference: Math.abs(planA.totalInterest - planB.totalInterest),
    monthsDifference: Math.abs(planA.monthsTaken - planB.monthsTaken),
  };
}
