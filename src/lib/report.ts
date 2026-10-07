/**
 * Rule-based parts of the Daily Safety Report, shared by the API route and the
 * static (GitHub Pages) build. Actions are deterministic; the summary is a template.
 */
import type { ReportFacts } from "./analytics";

export function actionsFor(f: ReportFacts): string[] {
  const top = new Set(f.topFactors.map((t) => t.factor));
  const actions: string[] = [];
  if (top.has("Temperature") || top.has("Humidity") || top.has("Heat indicator (WBGT est.)")) actions.push("Increase hydration reminders");
  if (top.has("Exposure duration"))
    actions.push(`Review afternoon work rotation against the configured ${f.configuredMaxExposureMinutes}-minute maximum continuous exposure`);
  if (top.has("Shade access")) actions.push("Prioritize shaded recovery areas");
  if (top.has("Activity intensity")) actions.push(`Monitor heavy manual tasks during peak heat${f.peakWindowToday ? ` (${f.peakWindowToday})` : ""}`);
  if (top.has("PPE / clothing coverage")) actions.push("Review PPE options for high-coverage roles during peak hours");
  if (f.heartRateUnavailable > 0) actions.push(`Check wearable connectivity for ${f.heartRateUnavailable} worker${f.heartRateUnavailable > 1 ? "s" : ""} with missing heart-rate data`);
  if (f.openAlerts > 0) actions.push(`Close ${f.openAlerts} open alert${f.openAlerts > 1 ? "s" : ""} with a confirmed intervention or documented override`);
  if (!f.conditions.weatherOnline) actions.push("Restore the site weather feed");
  return actions.length ? actions : ["Continue routine monitoring"];
}

export function templateSummary(f: ReportFacts): string {
  const high = f.todaysEvents.filter((e) => e.level === "HIGH").length;
  const crit = f.todaysEvents.filter((e) => e.level === "CRITICAL").length;
  const names = [...new Set(f.todaysEvents.map((e) => e.worker))];
  const factors = f.topFactors.slice(0, 3).map((t) => t.factor.toLowerCase().replace(" (wbgt est.)", ""));
  const parts = [
    `Today's heat conditions at ${f.site} were ${f.conditions.wbgt >= 29 ? "elevated" : f.conditions.wbgt >= 25 ? "warm" : "within normal range"}, at ${f.conditions.temperature}°C and ${f.conditions.humidity}% humidity (estimated WBGT ${f.conditions.wbgt}°C)${f.peakWindowToday ? `, with risk events concentrated between ${f.peakWindowToday}` : ""}.`,
    f.todaysEvents.length
      ? `${[crit && `${crit} critical-risk`, high && `${high} high-risk`].filter(Boolean).join(" and ")} event${f.todaysEvents.length === 1 ? " was" : "s were"} recorded today${names.length ? `, involving ${names.slice(0, 4).join(", ")}${names.length > 4 ? " and others" : ""}` : ""}.`
      : "No high or critical heat-risk events were recorded today.",
    factors.length ? `The most common contributing factors were ${factors.length > 1 ? `${factors.slice(0, -1).join(", ")} and ${factors[factors.length - 1]}` : factors[0]}.` : "",
    f.openAlerts ? `${f.openAlerts} alert${f.openAlerts > 1 ? "s remain" : " remains"} open and awaiting supervisor confirmation.` : "All alerts raised today have been actioned by a supervisor.",
    f.heartRateUnavailable ? `Heart-rate data was unavailable for ${f.heartRateUnavailable} worker${f.heartRateUnavailable > 1 ? "s" : ""}; their assessments used environmental and activity signals only.` : "",
  ];
  return parts.filter(Boolean).join(" ").replace(/\.\./g, ".");
}
