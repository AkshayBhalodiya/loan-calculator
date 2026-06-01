import { z } from "zod";

export const loanInputSchema = z.object({
  loanAmount: z.number().positive().max(100_000_000_000),
  annualRate: z.number().min(0).max(50),
  tenureYears: z.number().positive().max(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  loanType: z.enum(["Home", "Personal", "Car"]),
  manualEmi: z.number().positive().nullable(),
});

export const strategyInputSchema = z.object({
  monthlyExtra: z.number().min(0).max(100_000_000),
  extraEmiEveryMonths: z.number().int().min(0).max(120),
  yearlyLumpSum: z.number().min(0).max(100_000_000),
  useMonthlyExtra: z.boolean().optional(),
  usePeriodicExtraEmi: z.boolean().optional(),
  useYearlyLumpSum: z.boolean().optional(),
});

export const summarySchema = z.object({
  originalClosureDate: z.string(),
  newClosureDate: z.string(),
  monthsSaved: z.number(),
  interestSaved: z.number(),
  risk: z.enum(["Low", "Medium", "High"]),
});

export const chartDataSchema = z
  .object({
    pie: z.array(z.object({ name: z.string(), value: z.number() })).optional(),
    line: z
      .array(
        z.object({
          month: z.number().optional(),
          balance: z.number().optional(),
          interest: z.number().optional(),
        })
      )
      .optional(),
  })
  .optional();

export const createReportSchema = z.object({
  title: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
  loan: loanInputSchema,
  strategy: strategyInputSchema,
  summary: summarySchema,
  chartData: chartDataSchema,
});

export const patchReportSchema = z.object({
  title: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
});

export const simulateSchema = z.object({
  loan: loanInputSchema,
  strategy: strategyInputSchema,
});

export const compareSchema = z.object({
  loan: loanInputSchema,
  strategyA: strategyInputSchema,
  strategyB: strategyInputSchema,
});

export const emailReportSchema = z.object({
  to: z.string().email(),
});

export const signUpSchema = z.object({
  name: z.string().max(80).optional(),
  email: z.string().email().max(120),
  password: z.string().min(6, "Password must be at least 6 characters.").max(128),
});
