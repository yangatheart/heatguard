"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { WorkerTable } from "@/components/worker-table";
import { Card, PageHeader, SimulatedTag } from "@/components/ui";
import { LEVEL_ORDER } from "@/lib/risk-engine";
import { LEVEL_STYLE, cx } from "@/lib/format";
import { useDemo } from "@/lib/store";
import type { RiskLevel } from "@/lib/types";

export default function WorkersPage() {
  const { state, assess } = useDemo();
  const [q, setQ] = useState("");
  const [site, setSite] = useState<string>("all");
  const [level, setLevel] = useState<RiskLevel | "all">("all");

  const rows = useMemo(
    () =>
      state.workers
        .map((worker) => ({ worker, risk: assess(worker.id) }))
        .filter(({ worker, risk }) => (site === "all" || worker.site_id === site) && (level === "all" || risk.level === level))
        .filter(({ worker }) => !q || `${worker.name} ${worker.role} ${worker.task}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.risk.score - a.risk.score),
    [state, assess, q, site, level],
  );

  return (
    <div>
      <PageHeader title="Workers" subtitle={<span className="flex items-center gap-2">{state.workers.length} workers across {state.sites.length} sites <SimulatedTag /></span>} />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, role or task"
              className="w-full rounded-xl border border-line py-2 pr-3 pl-9 text-sm outline-none focus:border-ink-3"
            />
          </div>
          <select value={site} onChange={(e) => setSite(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2 text-sm">
            <option value="all">All sites</option>
            {state.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...LEVEL_ORDER] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cx(
                  "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
                  level === l ? "bg-ink text-white ring-ink" : "bg-white text-ink-2 ring-line hover:text-ink",
                )}
              >
                {l === "all" ? "All" : LEVEL_STYLE[l].label}
              </button>
            ))}
          </div>
        </div>
        <WorkerTable rows={rows} variant="directory" />
      </Card>
      <p className="mt-3 px-1 text-xs text-ink-3">
        HeatGuard stores only what safety management needs: name, role, site and heat-risk signals. No productivity metrics are collected.
      </p>
    </div>
  );
}
