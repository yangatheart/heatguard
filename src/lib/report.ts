/**
 * Rule-based parts of the Daily Safety Report, shared by the API route and the
 * static (GitHub Pages) build. Actions are deterministic; the summary is a template.
 */
import type { ReportFacts } from "./analytics";

const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0]);

export function actionsFor(f: ReportFacts): string[] {
  const top = new Set(f.topFactors.map((t) => t.factor));
  const actions: string[] = [];
  if (f.highRiskZones.length) actions.push(`Prioritise supervisor checks in ${list(f.highRiskZones)}`);
  if (top.has("Temperature") || top.has("Humidity") || top.has("WBGT")) actions.push("Increase hydration reminders for outdoor zones");
  if (top.has("Exposure duration"))
    actions.push(`Review afternoon work rotation against the configured ${f.configuredMaxExposureMinutes}-minute maximum continuous exposure`);
  if (top.has("Shade availability")) actions.push("Prioritise shaded work and rest areas");
  if (top.has("Cooling / rest area")) actions.push("Confirm cooling/rest areas are available for every outdoor zone");
  if (top.has("Work intensity")) actions.push(`Schedule heavy tasks outside peak heat where possible${f.peakWindowToday ? ` (${f.peakWindowToday})` : ""}`);
  if (top.has("PPE / clothing category")) actions.push("Review PPE options for heavy-clothing tasks during peak hours");
  if (f.openAlerts > 0) actions.push(`Close ${f.openAlerts} open alert${f.openAlerts > 1 ? "s" : ""} with a confirmed intervention or documented override`);
  if (!f.conditions.weatherOnline) actions.push("Restore the site weather feed");
  return actions.length ? actions : ["Continue routine monitoring"];
}

export function templateSummary(f: ReportFacts): string {
  const high = f.todaysEvents.filter((e) => e.level === "HIGH").length;
  const crit = f.todaysEvents.filter((e) => e.level === "CRITICAL").length;
  const tasks = [...new Set(f.todaysEvents.map((e) => `${e.task.toLowerCase()} (${e.zone})`))];
  const factors = f.topFactors.slice(0, 3).map((t) => (t.factor === "WBGT" ? t.factor : t.factor.toLowerCase()));
  const parts = [
    `Today's heat conditions at ${f.site} were ${f.conditions.wbgt >= 29 ? "elevated" : f.conditions.wbgt >= 25 ? "warm" : "within normal range"}, at ${f.conditions.temperature}°C, ${f.conditions.humidity}% humidity and ${f.conditions.windKmh} km/h wind (calculated WBGT ${f.conditions.wbgt}°C)${f.peakWindowToday ? `, with risk events concentrated between ${f.peakWindowToday}` : ""}.`,
    f.highRiskZones.length
      ? `${f.highRiskZones.length} zone${f.highRiskZones.length > 1 ? "s are" : " is"} currently at high heat risk: ${list(f.highRiskZones)}.`
      : "No zone is currently at high heat risk.",
    f.todaysEvents.length
      ? `${[crit && `${crit} critical-risk`, high && `${high} high-risk`].filter(Boolean).join(" and ")} event${f.todaysEvents.length === 1 ? " was" : "s were"} recorded today${tasks.length ? `, affecting ${tasks.slice(0, 3).join(", ")}${tasks.length > 3 ? " and others" : ""}` : ""}.`
      : "No high or critical heat-risk events were recorded today.",
    factors.length ? `The most common contributing factors were ${list(factors)}.` : "",
    f.openAlerts ? `${f.openAlerts} alert${f.openAlerts > 1 ? "s remain" : " remains"} open and awaiting supervisor confirmation.` : "All alerts raised today have been actioned by a supervisor.",
  ];
  return parts.filter(Boolean).join(" ").replace(/\.\./g, ".");
}
