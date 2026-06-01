"use client";

import {
  StrategyInput,
  describeExtraEmiInterval,
  resolveStrategyFlags,
  strategySummary,
} from "@/lib/loan";
import { UI } from "@/lib/ui-classes";

export { strategySummary };

type StrategyFieldsProps = {
  strategy: StrategyInput;
  onChange: (updates: Partial<StrategyInput>) => void;
  idPrefix: string;
};

type StrategyOptionProps = {
  id: string;
  title: string;
  hint: string;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

function StrategyOption({
  id,
  title,
  hint,
  enabled,
  onToggle,
  children,
  footer,
}: StrategyOptionProps) {
  return (
    <div
      className={`lw-strategy-option rounded-xl border p-3 transition-colors ${
        enabled ? "lw-strategy-option--on" : ""
      }`}
    >
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="lw-strategy-check mt-1 h-4 w-4 shrink-0 rounded border"
        />
        <span className="min-w-0 flex-1">
          <span className="lw-label block text-sm font-semibold">{title}</span>
          <span className="lw-muted mt-0.5 block text-xs font-normal">{hint}</span>
        </span>
      </label>
      <div
        className={`mt-3 space-y-1 pl-7 ${enabled ? "" : "pointer-events-none opacity-45"}`}
        aria-hidden={!enabled}
      >
        {children}
        {footer}
      </div>
    </div>
  );
}

export function StrategyFields({ strategy, onChange, idPrefix }: StrategyFieldsProps) {
  const flags = resolveStrategyFlags(strategy);
  const monthlyOn = strategy.useMonthlyExtra ?? false;
  const periodicOn = strategy.usePeriodicExtraEmi ?? false;
  const yearlyOn = strategy.useYearlyLumpSum ?? false;

  const intervalHint = describeExtraEmiInterval(
    periodicOn ? strategy.extraEmiEveryMonths : 0
  );

  const activeCount = [flags.monthly, flags.periodic, flags.yearly].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <p className="lw-muted rounded-lg border border-dashed border-[var(--lw-border)] bg-[var(--lw-surface-muted)] px-3 py-2 text-xs leading-relaxed">
        Turn on <strong className="lw-label font-semibold">any combination</strong> — 1, 2,
        or all 3 options. Each enabled option is added to your plan; calculation updates
        instantly.
        {activeCount > 0 ? (
          <span className="lw-link mt-1 block font-medium">
            Active now: {activeCount} option{activeCount > 1 ? "s" : ""}
          </span>
        ) : null}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <StrategyOption
          id={`${idPrefix}-toggle-monthly`}
          title="Extra every month (₹)"
          hint="Fixed amount on top of EMI every month"
          enabled={monthlyOn}
          onToggle={(on) => onChange({ useMonthlyExtra: on })}
        >
          <input
            id={`${idPrefix}-monthly`}
            type="number"
            min={0}
            className={UI.input}
            value={strategy.monthlyExtra}
            onChange={(e) => onChange({ monthlyExtra: Number(e.target.value) })}
          />
        </StrategyOption>

        <StrategyOption
          id={`${idPrefix}-toggle-periodic`}
          title="Extra full EMI every X months"
          hint="X = interval (e.g. 2 → one extra EMI every 2 months)"
          enabled={periodicOn}
          onToggle={(on) => onChange({ usePeriodicExtraEmi: on })}
          footer={
            periodicOn ? (
              <span className="lw-link block text-xs leading-snug no-underline">
                {intervalHint}
              </span>
            ) : null
          }
        >
          <input
            id={`${idPrefix}-periodic`}
            type="number"
            min={0}
            step={1}
            className={UI.input}
            placeholder="e.g. 2"
            value={strategy.extraEmiEveryMonths}
            onChange={(e) =>
              onChange({
                extraEmiEveryMonths: Math.max(0, Math.floor(Number(e.target.value) || 0)),
              })
            }
          />
        </StrategyOption>

        <StrategyOption
          id={`${idPrefix}-toggle-lump`}
          title="Yearly lump sum (₹)"
          hint="Once per year (e.g. bonus, FD maturity)"
          enabled={yearlyOn}
          onToggle={(on) => onChange({ useYearlyLumpSum: on })}
        >
          <input
            id={`${idPrefix}-lump`}
            type="number"
            min={0}
            className={UI.input}
            value={strategy.yearlyLumpSum}
            onChange={(e) => onChange({ yearlyLumpSum: Number(e.target.value) })}
          />
        </StrategyOption>
      </div>
    </div>
  );
}
