export type BankRate = {
  bank: string;
  loanType: "Home" | "Personal" | "Car";
  rateMin: number;
  rateMax: number;
  updatedAt: string;
};

/** Reference rates for suggestions (not live bank feeds). */
export const REFERENCE_RATES: BankRate[] = [
  { bank: "SBI", loanType: "Home", rateMin: 8.5, rateMax: 9.25, updatedAt: "2026-06-01" },
  { bank: "HDFC", loanType: "Home", rateMin: 8.6, rateMax: 9.4, updatedAt: "2026-06-01" },
  { bank: "ICICI", loanType: "Home", rateMin: 8.65, rateMax: 9.35, updatedAt: "2026-06-01" },
  { bank: "Axis", loanType: "Personal", rateMin: 10.5, rateMax: 18.0, updatedAt: "2026-06-01" },
  { bank: "Kotak", loanType: "Personal", rateMin: 10.75, rateMax: 17.5, updatedAt: "2026-06-01" },
  { bank: "SBI", loanType: "Car", rateMin: 8.7, rateMax: 10.5, updatedAt: "2026-06-01" },
  { bank: "HDFC", loanType: "Car", rateMin: 8.75, rateMax: 10.75, updatedAt: "2026-06-01" },
];

export function getRatesForLoanType(loanType?: string) {
  if (!loanType || loanType === "All") return REFERENCE_RATES;
  return REFERENCE_RATES.filter((r) => r.loanType === loanType);
}

export function suggestRate(loanType: "Home" | "Personal" | "Car") {
  const rows = getRatesForLoanType(loanType);
  if (rows.length === 0) return 8.5;
  const avg =
    rows.reduce((sum, row) => sum + (row.rateMin + row.rateMax) / 2, 0) / rows.length;
  return Math.round(avg * 100) / 100;
}
