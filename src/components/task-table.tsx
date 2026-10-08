"use client";

import { ChevronRight, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { relativeTime, cx } from "@/lib/format";
import { actionSummary, type RiskResult } from "@/lib/risk-engine";
import type { Task, Zone } from "@/lib/types";
import { EmptyState, RiskBadge } from "./ui";

export interface TaskRow {
  task: Task;
  zone: Zone;
  risk: RiskResult;
}

/** Task risk table: the primary operational view (Zone → Task → Team). */
export function TaskTable({ rows }: { rows: TaskRow[] }) {
  const router = useRouter();

  if (rows.length === 0) {
    return <EmptyState icon={ClipboardList} title="No tasks match" body="Try a different filter or site. Tasks appear here once they are assigned to a zone." />;
  }

  const open = (id: string) => router.push(`/tasks/${id}`);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              <th className="py-3 pr-3 pl-5 font-medium">Task · team</th>
              <th className="px-3 py-3 font-medium">Zone</th>
              <th className="px-3 py-3 font-medium">Risk</th>
              <th className="px-3 py-3 font-medium">Intensity</th>
              <th className="px-3 py-3 text-right font-medium">Exposure</th>
              <th className="px-3 py-3 font-medium">Recommended action</th>
              <th className="py-3 pr-5 pl-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ task: t, zone, risk }) => (
              <tr
                key={t.id}
                onClick={() => open(t.id)}
                className={cx("group cursor-pointer border-b border-line-2 transition-colors last:border-0 hover:bg-line-2/50", risk.level === "CRITICAL" && "bg-critical-bg/40")}
              >
                <td className="py-3 pr-3 pl-5">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-ink-3">
                    {t.team} · updated {relativeTime(t.updated_at).toLowerCase()}
                  </p>
                </td>
                <td className="px-3 py-3 text-ink-2">
                  {zone.name}
                  <span className="block text-xs text-ink-3">{zone.setting}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={risk.level} />
                    <span className="tabular text-xs text-ink-3">{risk.score}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-ink-2">{t.intensity}</td>
                <td className="tabular px-3 py-3 text-right">{t.exposure_minutes} min</td>
                <td className="max-w-64 px-3 py-3 text-xs text-ink-2">{actionSummary(risk)}</td>
                <td className="py-3 pr-5 pl-3 text-right">
                  <span className="inline-flex items-center gap-0.5 text-sm font-medium text-ink-2 group-hover:text-ink">
                    View <ChevronRight className="h-4 w-4" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <ul className="divide-y divide-line-2 md:hidden">
        {rows.map(({ task: t, zone, risk }) => (
          <li key={t.id}>
            <button onClick={() => open(t.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{t.name}</span>
                  <RiskBadge level={risk.level} />
                </div>
                <p className="truncate text-xs text-ink-2">
                  {zone.name} · {t.team} · {t.intensity} · {t.exposure_minutes} min
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-3" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
