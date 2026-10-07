# HeatGuard AI — Demo MVP

**Heat-risk signals → actionable intervention → supervisor confirmation → auditable safety record → analytics.**

This is a working prototype for investor and customer demos. It uses simulated worker and wearable data: it shows the workflow and the commercial concept, and makes no claim of clinical or occupational-health efficacy.

## Run it

```bash
export PATH=$HOME/.local/node/bin:$PATH   # Node 22 was installed locally (no system changes)
npm install
npm run dev                                # http://localhost:3000
```

Production build: `npm run build && npm start`.

**Optional AI summaries.** Set `ANTHROPIC_API_KEY` in `.env.local` and the Daily Report narrative is written by Claude (`claude-opus-5-5`, with server-side refusal fallback enabled). Without a key, or if the call fails, a deterministic rule-based summary is shown and labelled as such.

## 90-second demo script

1. **Enter Demo** → Madrid Central dashboard: 35°C, 68% humidity, WBGT 31°C, site risk **HIGH**.
2. KPIs: 24 workers, 14 low / 6 moderate / 3 high / **1 critical**, 2 active alerts.
3. Click **Carlos M.** → **87/100 CRITICAL** with every contributing factor and "why risk increased".
4. The alert card shows the recommended intervention: cooling break, hydration, move to shade.
5. **Confirm intervention** → actions are pre-checked; supervisor and timestamp are filled in → **Save safety record**.
6. "Safety action recorded": Risk detected → Alert sent → Intervention confirmed → Record created.
7. **View safety log** → the new record is at the top. Export to CSV or print.
8. **Analytics** → recurring 12:00–15:00 peak; heavy manual work is the highest-risk task.
9. *Optional:* **Demo Mode** → "Morning baseline" (MODERATE) → slide temperature 31→35°C → **HIGH**, explained factor by factor.
10. Close: *"HeatGuard connects prediction to action — and action to evidence."*

**Reset** (in Demo Mode or Settings) restores the original scenario. Demo state persists in the browser's localStorage.

## Architecture

| Area | Where |
|---|---|
| Risk engine (deterministic, configurable, no LLM) | `src/lib/risk-engine.ts` (`RISK_CONFIG`, `DEFAULT_THRESHOLDS`) |
| Demo dataset (73 workers, 3 sites, fixed values) | `src/lib/demo-data.ts` |
| Workflow state: simulate → alert → intervene → log | `src/lib/store.tsx` |
| Alert → confirmation → record UI | `src/components/workflow.tsx` |
| Daily report API (rules for actions, LLM only narrates) | `src/app/api/report/route.ts` |
| Production schema | `supabase/schema.sql` |

Stack: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Recharts · Lucide.

### Design principles carried into the code
- Scores come from a transparent rule model, and every point is attributed to a named factor. The LLM never sets thresholds or makes medical calls.
- Alerts never close on their own. A supervisor must confirm, escalate, or dismiss with a logged reason (human override).
- Missing heart-rate data is shown as missing ("Heart-rate data unavailable…"), never filled in.
- Wearable data can be switched off in Settings; risk then uses environmental and activity signals only.

## Not production-ready
These all need validation before real deployment: occupational-health thresholds and weights, sensor performance, privacy and worker consent flows, emergency procedures, and national regulatory requirements. Auth is a demo stub, and persistence is browser-local. `supabase/schema.sql` is the target model, but it is not wired up yet.
