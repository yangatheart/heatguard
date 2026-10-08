# SiteSafe SI — Site Safety Super Intelligence

**SiteSafe SI turns measurable site conditions into actionable safety intelligence.**

**Sense → Understand → Act → Record.** Environmental and site data feeds a risk assessment and its explanation. The assessment raises an alert with a recommended intervention, the supervisor confirms it, and the result goes into the safety record and analytics.

This is a working prototype for investor and customer demos. It runs on demo data. It is a construction-site safety intelligence platform, not a wearable, health-monitoring or medical system. It uses only data that can be measured, calculated, or entered by an authorised site user, and never physiological data.

**Live demo:** https://yangatheart.github.io/sitesafe-si/

Every push to `main` rebuilds the site with `.github/workflows/pages.yml`. GitHub Pages serves static files only, so the hosted Daily Report always uses the rule-based summary. The AI summary is available only when you run the app locally with an API key. Each visitor's demo state stays in their own browser.

## Run it

```bash
export PATH=$HOME/.local/node/bin:$PATH   # Node 22 was installed locally (no system changes)
npm install
npm run dev                                # http://localhost:3000
```

Production build: `npm run build && npm start`.

**Optional AI summaries.** Set `ANTHROPIC_API_KEY` in `.env.local` and Claude (`claude-opus-5-5`) writes the Daily Report narrative. Without a key, or if the call fails, the report shows a deterministic rule-based summary and labels it as such.

## What data is used

| Type | Inputs | Shown as |
|---|---|---|
| Automatically measured / accessed | Air temperature, humidity, wind, solar exposure, time, weather/location | Environmental sensor |
| Calculated | WBGT, heat-risk score, risk category, exposure accumulation | Calculated |
| Supervisor / site inputs | Task type, work intensity, PPE category, exposure duration, shade, cooling/rest area, zone setup | Supervisor input · Site/task tracking · Site configuration |

It never uses heart rate, body temperature, wearable readings or any medical or personal health information.

## 90-second demo script

1. **Enter Demo** → Madrid Central dashboard: 35°C, 68% humidity, 8 km/h wind, high solar exposure, WBGT 31°C → **Overall site risk HIGH**.
2. KPIs: **2 high-risk zones** (Roof Zone, Concrete Zone), **3 high-risk tasks**, **2 active alerts**, **4 recommended interventions**, **6 confirmed interventions** this week.
3. Open **Roof installation** in the Roof Zone. It is **HIGH heat risk**: heavy work, 82 min exposure, limited shade, cooling available. Every factor shows its points and its data source.
4. The alert recommends hydration, a cooling/rest break, moving activity to shade where possible, and work rotation.
5. **Confirm intervention**. The recommended actions are pre-checked and the supervisor and timestamp are filled in. Click **Save safety record**.
6. "Safety action recorded": Risk detected → Alert sent → Intervention confirmed → Record created. The task is reassessed with the actions applied.
7. **View safety log**. The new record is at the top with site, zone, task, conditions, trigger, and recommended vs. selected intervention. Export it to CSV.
8. **Analytics** → recurring 12:00–15:00 peak, and the riskiest tasks and zones.
9. *Optional:* **Risk Simulator** → "Morning baseline" (Moderate) → "Peak heat" (High) → "Heatwave afternoon" (Critical, with "Pause task").
10. Close: *"SiteSafe SI turns site conditions into safety action — and action into evidence."*

**Reset** (in the Risk Simulator or Settings) restores the original scenario. Demo state persists in the browser's localStorage.

## Architecture

| Area | Where |
|---|---|
| Risk engine (deterministic, configurable, no LLM) | `src/lib/risk-engine.ts` (`RISK_CONFIG`, `DEFAULT_THRESHOLDS` 30/55/75) |
| Demo dataset (3 sites, zones, tasks, teams) | `src/lib/demo-data.ts` |
| Workflow state: simulate → alert → intervene → log | `src/lib/store.tsx` |
| Alert → confirmation → record UI | `src/components/workflow.tsx` |
| Daily report API (rules for actions, LLM only narrates) | `src/app/api/report/route.ts`, `src/lib/report.ts` |
| Production schema | `supabase/schema.sql` |
| GitHub Pages deploy | `.github/workflows/pages.yml` |

Stack: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Recharts · Lucide.

### Design principles carried into the code
- **Site-first.** Risk is assessed per task, in its zone and at its site. Workers appear only for assignment and accountability.
- **Transparent scoring.** Scores come from a rule model, and every point is attributed to a named factor with its data source. AI explains and summarises; it never sets thresholds or classifications.
- **Human confirmation.** Alerts never close on their own. A supervisor must confirm, escalate, or dismiss with a logged reason.
- **Honest data.** Missing data, such as an offline weather feed, is shown as missing and never filled in.

## Not production-ready
Before any real deployment, these all need validation: occupational-health thresholds and weights, sensor performance, the WBGT method, emergency procedures, and national regulatory requirements. Auth is a demo stub and persistence is browser-local. `supabase/schema.sql` is the target model and is not wired up yet.
