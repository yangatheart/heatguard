"use client";

import { ArrowUp, HeartOff } from "lucide-react";
import { cx } from "@/lib/format";
import type { RiskResult } from "@/lib/risk-engine";

const WHY_LABEL: Record<string, string> = {
  temperature: "Temperature",
  humidity: "Humidity",
  wbgt: "Heat indicator (WBGT)",
  solar: "Solar exposure",
  heart_rate: "Heart rate above baseline",
  activity: "Work intensity",
  exposure: "Exposure duration",
  ppe: "PPE heat retention",
  shade: "Limited shade access",
};

/** Contributing-factor breakdown: every point in the score is attributable. */
export function FactorList({ risk }: { risk: RiskResult }) {
  return (
    <ul className="space-y-3.5">
      {risk.factors.map((f) => (
        <li key={f.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-2">{f.label}</span>
            <span className="flex items-baseline gap-2">
              <span className={cx("font-medium", f.missing && "text-ink-3")}>{f.value}</span>
              <span className="tabular w-10 text-right text-xs text-ink-3">+{f.points}</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-line-2">
            {f.missing ? (
              <div className="h-full rounded-full border border-dashed border-ink-3/60" />
            ) : (
              <div
                className={cx("h-full rounded-full", f.elevated ? "bg-high" : "bg-ink-3/50")}
                style={{ width: `${(f.points / f.max) * 100}%`, transition: "width .8s cubic-bezier(.2,.8,.2,1)" }}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function WhyRiskIncreased({ risk }: { risk: RiskResult }) {
  const drivers = risk.factors.filter((f) => f.elevated && f.points > 0).sort((a, b) => b.points - a.points);
  return (
    <div>
      {drivers.length === 0 ? (
        <p className="text-sm text-ink-2">No individual factor is currently elevated.</p>
      ) : (
        <ul className="space-y-2">
          {drivers.map((f) => (
            <li key={f.key} className="flex items-center justify-between rounded-xl bg-high-bg/60 px-3 py-2 text-sm">
              <span className="font-medium">{WHY_LABEL[f.key]}</span>
              <span className="flex items-center gap-1 text-high">
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span className="tabular text-xs">+{f.points}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {risk.heartRateMissing && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-xs text-ink-2">
          <HeartOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Heart-rate data unavailable. Risk assessment is based on environmental and activity signals.
        </p>
      )}
    </div>
  );
}

/** Plain-language summary built only from the rule-model factors (no new thresholds). */
export function explainRisk(name: string, risk: RiskResult): string {
  const drivers = risk.factors.filter((f) => f.elevated && f.points > 0).sort((a, b) => b.points - a.points);
  if (drivers.length === 0) return `${name}'s current readings are within the low band of the demo risk model.`;
  const top = drivers.slice(0, 3).map((f) => `${WHY_LABEL[f.key].toLowerCase().replace("wbgt", "WBGT")} (${f.value})`);
  const list = top.length > 1 ? `${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}` : top[0];
  const share = Math.round((drivers.slice(0, 3).reduce((s, f) => s + f.points, 0) / Math.max(1, risk.score)) * 100);
  return `${name}'s score of ${risk.score} is driven mainly by ${list}, which together account for about ${share}% of the score.${
    risk.heartRateMissing ? " Heart-rate data is unavailable, so the score may understate physiological strain." : ""
  }`;
}
