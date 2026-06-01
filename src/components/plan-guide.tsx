import { UI } from "@/lib/ui-classes";

type PlanLegendProps = {
  plan: "A" | "B" | "C";
  title: string;
  description: string;
  example: string;
};

const planSurface = {
  A: UI.planA,
  B: UI.planB,
  C: UI.planC,
} as const;

const badges = {
  A: "bg-slate-600 text-white",
  B: "bg-indigo-600 text-white",
  C: "bg-emerald-600 text-white",
};

function PlanLegend({ plan, title, description, example }: PlanLegendProps) {
  return (
    <div className={`rounded-xl p-4 ${planSurface[plan]}`}>
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${badges[plan]}`}
      >
        Plan {plan}
      </span>
      <h3 className={`mt-2 font-semibold ${UI.titleSm}`}>{title}</h3>
      <p className={UI.subtitleSm}>{description}</p>
      <p className="lw-muted mt-2 text-xs">{example}</p>
    </div>
  );
}

export default function PlanGuide() {
  return (
    <section className={UI.card}>
      <h2 className={UI.titleSm}>How Plan A, B, and C work</h2>
      <p className={UI.subtitleSm}>
        One loan, three views. Charts and savings compare Plan A (baseline) with Plan B (your
        main prepayment plan). Plan C is optional — test another prepayment idea against Plan B.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <PlanLegend
          plan="A"
          title="Baseline (bank schedule)"
          description="Regular EMI only — no monthly extra, no periodic extra EMI, no yearly lump sum."
          example="Example: ₹41,822 EMI every month until the loan ends."
        />
        <PlanLegend
          plan="B"
          title="Your main prepayment plan"
          description="Enable any combination of monthly extra, extra full EMI every X months, and yearly lump sum."
          example="Example: +₹5,000/month, extra EMI every 2 months (X=2), ₹50,000/year."
        />
        <PlanLegend
          plan="C"
          title="Alternative plan (optional compare)"
          description="A second prepayment mix to see if it beats your main plan (Plan B)."
          example="Example: higher monthly extra or a shorter X interval."
        />
      </div>
    </section>
  );
}
