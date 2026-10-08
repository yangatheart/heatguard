"use client";

import { ArrowUp } from "lucide-react";
import { cx } from "@/lib/format";
import { topDrivers, type RiskResult } from "@/lib/risk-engine";
import { SourceTag } from "./ui";

/** Contributing-factor breakdown: every point in the score is attributable, with its data source. */
export function FactorList({ risk }: { risk: RiskResult }) {
  return (
    <ul className="space-y-3.5">
      {risk.factors.map((f) => (
        <li key={f.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="block text-ink-2">{f.label}</span>
              <SourceTag source={f.source} className="block" />
            </span>
            <span className="flex shrink-0 items-baseline gap-2 self-start">
              <span className="font-medium">{f.value}</span>
              <span className="tabular w-10 text-right text-xs text-ink-3">+{f.points}</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-line-2">
            <div
              className={cx("h-full rounded-full", f.elevated ? "bg-high" : "bg-ink-3/50")}
              style={{ width: `${(f.points / f.max) * 100}%`, transition: "width .8s cubic-bezier(.2,.8,.2,1)" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function WhyRiskIncreased({ risk }: { risk: RiskResult }) {
  const drivers = topDrivers(risk, 6);
  if (drivers.length === 0) return <p className="text-sm text-ink-2">No individual factor is currently elevated.</p>;
  return (
    <ul className="space-y-2">
      {drivers.map((f) => (
        <li key={f.key} className="flex items-center justify-between rounded-xl bg-high-bg/60 px-3 py-2 text-sm">
          <span className="font-medium">
            {f.label} <span className="font-normal text-ink-2">· {f.value}</span>
          </span>
          <span className="flex items-center gap-1 text-high">
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span className="tabular text-xs">+{f.points}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Plain-language summary built only from the rule-model factors (no new thresholds). */
export function explainRisk(subject: string, risk: RiskResult): string {
  const drivers = topDrivers(risk);
  if (drivers.length === 0) return `Conditions for ${subject} are within the low band of the demo risk model.`;
  const top = drivers.map((f) => `${f.key === "wbgt" ? f.label : f.label.toLowerCase()} (${f.value})`);
  const list = top.length > 1 ? `${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}` : top[0];
  const share = Math.round((drivers.reduce((s, f) => s + f.points, 0) / Math.max(1, risk.score)) * 100);
  return `The score of ${risk.score} for ${subject} is driven mainly by ${list}, which together account for about ${share}% of the score.`;
}
