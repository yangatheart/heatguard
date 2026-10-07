"use client";

import { ChevronRight, HeartOff, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { relativeTime, cx } from "@/lib/format";
import type { RiskResult } from "@/lib/risk-engine";
import { useDemo } from "@/lib/store";
import type { Worker } from "@/lib/types";
import { EmptyState, RiskBadge } from "./ui";

export interface WorkerRow {
  worker: Worker;
  risk: RiskResult;
}

type Variant = "dashboard" | "directory";

export function WorkerTable({ rows, variant = "dashboard" }: { rows: WorkerRow[]; variant?: Variant }) {
  const router = useRouter();
  const { state } = useDemo();
  const siteName = (id: string) => state.sites.find((s) => s.id === id)?.name ?? id;

  if (rows.length === 0) {
    return <EmptyState icon={Users} title="No workers match" body="Try a different filter or site. Workers appear here once they are assigned to a site." />;
  }

  const open = (id: string) => router.push(`/workers/${id}`);

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              <th className="py-3 pr-3 pl-5 font-medium">Worker</th>
              {variant === "directory" && <th className="px-3 py-3 font-medium">Site</th>}
              <th className="px-3 py-3 font-medium">{variant === "directory" ? "Role" : "Task"}</th>
              <th className="px-3 py-3 font-medium">Risk</th>
              {variant === "dashboard" ? (
                <>
                  <th className="px-3 py-3 text-right font-medium">Exposure</th>
                  <th className="px-3 py-3 text-right font-medium">Heart rate</th>
                </>
              ) : (
                <th className="px-3 py-3 font-medium">Current status</th>
              )}
              <th className="px-3 py-3 font-medium">Last update</th>
              <th className="py-3 pr-5 pl-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ worker: w, risk }) => {
              const rd = state.readings[w.id];
              return (
                <tr
                  key={w.id}
                  onClick={() => open(w.id)}
                  className={cx("group cursor-pointer border-b border-line-2 transition-colors last:border-0 hover:bg-line-2/50", risk.level === "CRITICAL" && "bg-critical-bg/40")}
                >
                  <td className="py-3 pr-3 pl-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={w.name} />
                      <span className="font-medium">{w.name}</span>
                    </div>
                  </td>
                  {variant === "directory" && <td className="px-3 py-3 text-ink-2">{siteName(w.site_id)}</td>}
                  <td className="px-3 py-3 text-ink-2">{variant === "directory" ? w.role : w.task}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <RiskBadge level={risk.level} />
                      <span className="tabular text-xs text-ink-3">{risk.score}</span>
                    </div>
                  </td>
                  {variant === "dashboard" ? (
                    <>
                      <td className="tabular px-3 py-3 text-right">{rd.exposure_minutes} min</td>
                      <td className="tabular px-3 py-3 text-right">
                        {risk.heartRateMissing ? (
                          <span className="inline-flex items-center gap-1 text-ink-3" title="Heart-rate data unavailable">
                            <HeartOff className="h-3.5 w-3.5" /> —
                          </span>
                        ) : (
                          `${rd.heart_rate} bpm`
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-3 text-ink-2">{w.status}</td>
                  )}
                  <td className="px-3 py-3 text-ink-2">{relativeTime(rd.timestamp)}</td>
                  <td className="py-3 pr-5 pl-3 text-right">
                    <span className="inline-flex items-center gap-0.5 text-sm font-medium text-ink-2 group-hover:text-ink">
                      View <ChevronRight className="h-4 w-4" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <ul className="divide-y divide-line-2 md:hidden">
        {rows.map(({ worker: w, risk }) => {
          const rd = state.readings[w.id];
          return (
            <li key={w.id}>
              <button onClick={() => open(w.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <Avatar name={w.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{w.name}</span>
                    <RiskBadge level={risk.level} />
                  </div>
                  <p className="truncate text-xs text-ink-2">
                    {variant === "directory" ? `${siteName(w.site_id)} · ${w.role}` : w.task} · {rd.exposure_minutes} min ·{" "}
                    {risk.heartRateMissing ? "HR unavailable" : `${rd.heart_rate} bpm`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  const hue = [...name].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
      style={{ width: size, height: size, background: `hsl(${hue} 30% 92%)`, color: `hsl(${hue} 25% 32%)`, fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  );
}
