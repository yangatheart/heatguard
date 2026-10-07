"use client";

import { ArrowLeft, FlaskConical, Info, ScrollText, Sparkles, UserX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FactorList, WhyRiskIncreased, explainRisk } from "@/components/risk-explainer";
import { Avatar } from "@/components/worker-table";
import { Button, Card, EmptyState, RiskBadge, RiskScale, ScoreRing } from "@/components/ui";
import { AlertCard } from "@/components/workflow";
import { LEVEL_STYLE, dayLabel, hhmm, relativeTime, cx } from "@/lib/format";
import { useDemo } from "@/lib/store";

export default function WorkerDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, assess } = useDemo();
  const worker = state.workers.find((w) => w.id === id);

  if (!worker) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="Worker not found"
          body="This worker may have been removed or belongs to a different organisation."
          action={
            <Link href="/workers">
              <Button variant="secondary">Back to workers</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const risk = assess(worker.id);
  const reading = state.readings[worker.id];
  const site = state.sites.find((s) => s.id === worker.site_id)!;
  const alert = state.alerts.find((a) => a.worker_id === worker.id && a.status === "active");
  const history = state.log.filter((e) => e.worker_id === worker.id).slice(0, 5);

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={worker.name} size={56} />
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">{worker.name}</h1>
            <p className="text-sm text-ink-2">
              {worker.role} · {worker.task} · {site.name} · {worker.status} · updated {relativeTime(reading.timestamp)}
            </p>
          </div>
        </div>
        <Link href={`/demo?worker=${worker.id}`}>
          <Button variant="secondary" icon={FlaskConical}>
            Simulate conditions
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <p className="text-sm font-medium text-ink-2">Current Heat Risk</p>
          <p className={cx("mt-1 text-4xl font-semibold tracking-tight", LEVEL_STYLE[risk.level].fg)}>{risk.level}</p>
          <div className="my-6 flex justify-center">
            <ScoreRing score={risk.score} level={risk.level} />
          </div>
          <RiskScale score={risk.score} thresholds={state.thresholds} />
          <p className="mt-5 flex gap-2 rounded-xl bg-line-2/70 p-3 text-xs text-ink-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Simulated MVP risk score from a transparent, rule-based model. Demo risk model — thresholds require occupational-health validation before
            real deployment. Not a medical assessment.
          </p>
        </Card>

        <Card className="p-6 lg:col-span-1">
          <h2 className="font-semibold">Contributing factors</h2>
          <p className="mb-5 text-xs text-ink-3">Points added to the score by each input</p>
          <FactorList risk={risk} />
        </Card>

        <div className="space-y-4 lg:col-span-1">
          <Card className="p-6">
            <h2 className="font-semibold">Why risk increased</h2>
            <p className="mb-4 text-xs text-ink-3">Elevated factors, largest first</p>
            <WhyRiskIncreased risk={risk} />
            <div className="mt-4 rounded-xl border border-line p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                <Sparkles className="h-3.5 w-3.5" /> Explanation
              </p>
              <p className="mt-1.5 text-sm leading-relaxed">{explainRisk(worker.name, risk)}</p>
              <p className="mt-2 text-[11px] text-ink-3">Generated from the factors above. It explains the score; it does not set it.</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 px-1 font-semibold">Alert</h2>
          {alert ? (
            <AlertCard alert={alert} />
          ) : (
            <Card>
              <EmptyState icon={Info} title="No active alert" body="An alert is raised automatically when this worker reaches High or Critical risk." />
            </Card>
          )}
        </div>
        <div>
          <h2 className="mb-3 px-1 font-semibold">Recent safety records</h2>
          <Card>
            {history.length === 0 ? (
              <EmptyState icon={ScrollText} title="No records yet" body="Confirmed interventions for this worker will appear here." />
            ) : (
              <ul className="divide-y divide-line-2">
                {history.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
                    <div>
                      <p className="font-medium">{e.intervention}</p>
                      <p className="text-xs text-ink-3">
                        {dayLabel(e.timestamp)} · {hhmm(e.timestamp)} · {e.supervisor}
                      </p>
                    </div>
                    <RiskBadge level={e.risk_level} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
