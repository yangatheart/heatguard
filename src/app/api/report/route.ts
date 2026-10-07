/**
 * Daily Safety Report.
 *
 * Division of labour:
 *  - Recommended operational actions: deterministic rules below (never the LLM).
 *  - Narrative summary: Claude, when ANTHROPIC_API_KEY is set, constrained to
 *    restate the structured facts. Otherwise a deterministic template.
 * The LLM never sets thresholds, scores or medical recommendations.
 */
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { ReportFacts } from "@/lib/analytics";

export const runtime = "nodejs";

const SYSTEM = `You write the narrative summary for a construction-site heat-safety daily report.
Rules:
- Use ONLY the facts in the JSON provided. Do not invent numbers, events, workers, times or causes.
- Do not introduce thresholds, limits, durations or medical/clinical advice of any kind. Do not diagnose.
- Use concise enterprise language: "heat risk detected", "risk assessment", "intervention". Never "medical diagnosis".
- 3–5 sentences, one paragraph, plain text, no headings, no lists, no markdown.
- Refer to workers by the names given. Mention if any data was unavailable (heart rate or weather feed).
- The data is simulated demonstration data; do not claim real-world outcomes.`;

function actionsFor(f: ReportFacts): string[] {
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

function templateSummary(f: ReportFacts): string {
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

export async function POST(req: Request) {
  let facts: ReportFacts;
  try {
    facts = (await req.json()) as ReportFacts;
    if (!facts?.site || !Array.isArray(facts.todaysEvents)) throw new Error("bad payload");
  } catch {
    return NextResponse.json({ error: "Invalid report request." }, { status: 400 });
  }

  const actions = actionsFor(facts);
  const generatedAt = new Date().toISOString();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ summary: templateSummary(facts), actions, source: "template", generatedAt });
  }

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: `Site safety facts (JSON):\n${JSON.stringify(facts, null, 2)}\n\nWrite the summary paragraph.` }],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (response.stop_reason === "refusal" || !text) throw new Error(`No summary (stop_reason=${response.stop_reason})`);
    return NextResponse.json({ summary: text, actions, source: "ai", generatedAt });
  } catch (err) {
    console.error("[report] AI summary failed, using template:", err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
    return NextResponse.json({
      summary: templateSummary(facts),
      actions,
      source: "template",
      notice: "AI summary unavailable — showing rule-based summary.",
      generatedAt,
    });
  }
}
