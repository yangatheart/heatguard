"use client";

import { ArrowLeft, ClipboardX, FlaskConical, Info, MapPin, ScrollText, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FactorList, WhyRiskIncreased, explainRisk } from "@/components/risk-explainer";
import { Avatar, Button, Card, EmptyState, RiskBadge, RiskScale, ScoreRing } from "@/components/ui";
import { AlertCard } from "@/components/workflow";
import { LEVEL_STYLE, dayLabel, hhmm, relativeTime, cx } from "@/lib/format";
import { RECOMMENDATION_LABEL, actionSummary, recommendedActions } from "@/lib/risk-engine";
import { useDemo } from "@/lib/store";

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, assess } = useDemo();
  const task = state.tasks.find((t) => t.id === id);

  if (!task) {
    return (
      <Card>
        <EmptyState
          icon={ClipboardX}
          title="Task not found"
          body="This task may have been closed or belongs to a different organisation."
          action={
            <Link href="/dashboard">
              <Button variant="secondary">Back to dashboard</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  const risk = assess(task.id);
  const zone = state.zones.find((z) => z.id === task.zone_id)!;
  const site = state.sites.find((s) => s.id === task.site_id)!;
  const alert = state.alerts.find((a) => a.task_id === task.id && a.status === "active");
  const team = state.workers.filter((w) => w.task_id === task.id);
  const history = state.log.filter((e) => e.task_id === task.id).slice(0, 5);
  const recs = recommendedActions(risk.level, risk.factors);

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{task.name}</h1>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-ink-2">
            <MapPin className="h-3.5 w-3.5" />
            {site.name} → {zone.name} ({zone.setting}) → {task.team} · {task.status} · updated {relativeTime(task.updated_at).toLowerCase()}
          </p>
        </div>
        <Link href={`/demo?task=${task.id}`}>
          <Button variant="secondary" icon={FlaskConical}>
            Simulate conditions
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <p className="text-sm font-medium text-ink-2">Task Heat Risk</p>
          <p className={cx("mt-1 text-4xl font-semibold tracking-tight", LEVEL_STYLE[risk.level].fg)}>{LEVEL_STYLE[risk.level].label} heat risk</p>
          <div className="my-6 flex justify-center">
            <ScoreRing score={risk.score} level={risk.level} />
          </div>
          <RiskScale score={risk.score} thresholds={state.thresholds} />
          <p className="mt-5 flex gap-2 rounded-xl bg-line-2/70 p-3 text-xs text-ink-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Transparent rule-based score from environmental and operational inputs only. Demo risk model — thresholds require occupational-health
            validation before real deployment.
          </p>
        </Card>

        <Card className="p-6 lg:col-span-1">
          <h2 className="font-semibold">Contributing factors</h2>
          <p className="mb-5 text-xs text-ink-3">Points added by each input, with its data source</p>
          <FactorList risk={risk} />
        </Card>

        <div className="space-y-4 lg:col-span-1">
          <Card className="p-6">
            <h2 className="font-semibold">Why risk is elevated</h2>
            <p className="mb-4 text-xs text-ink-3">Elevated factors, largest first</p>
            <WhyRiskIncreased risk={risk} />
            <div className="mt-4 rounded-xl border border-line p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                <Sparkles className="h-3.5 w-3.5" /> Explanation
              </p>
              <p className="mt-1.5 text-sm leading-relaxed">{explainRisk(`${task.name.toLowerCase()} in the ${zone.name}`, risk)}</p>
              <p className="mt-2 text-[11px] text-ink-3">Generated from the factors above. It explains the score; it does not set it.</p>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="font-semibold">Recommended safety action</h2>
            {recs.length === 0 ? (
              <p className="mt-2 text-sm text-ink-2">{actionSummary(risk)}</p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {recs.map((r) => (
                  <li key={r} className="flex items-center gap-2 text-sm">
                    <span className="h-1 w-1 rounded-full bg-ink-2" />
                    {RECOMMENDATION_LABEL[r]}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-ink-3">From configured site rules — not generated by AI.</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <h2 className="mb-3 px-1 font-semibold">Alert</h2>
          {alert ? (
            <AlertCard alert={alert} />
          ) : (
            <Card>
              <EmptyState icon={Info} title="No active alert" body="An alert is raised automatically when this task reaches High or Critical risk." />
            </Card>
          )}
        </div>
        <div>
          <h2 className="mb-3 px-1 font-semibold">Assigned team</h2>
          <Card>
            {team.length === 0 ? (
              <EmptyState icon={Users} title="No one assigned" body="Assign a team to this task to record accountability." />
            ) : (
              <ul className="divide-y divide-line-2">
                {team.map((w) => (
                  <li key={w.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <Avatar name={w.name} size={28} />
                    <span className="flex-1 font-medium">{w.name}</span>
                    <span className="text-ink-3">{w.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <p className="mt-2 px-1 text-[11px] text-ink-3">Recorded for assignment and accountability only — no personal health data.</p>
        </div>
        <div>
          <h2 className="mb-3 px-1 font-semibold">Recent safety records</h2>
          <Card>
            {history.length === 0 ? (
              <EmptyState icon={ScrollText} title="No records yet" body="Confirmed interventions for this task will appear here." />
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
