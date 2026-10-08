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
import { actionsFor, templateSummary } from "@/lib/report";

export const runtime = "nodejs";

const SYSTEM = `You write the narrative summary for SiteSafe SI, a construction-site heat-safety daily report.
Rules:
- Use ONLY the facts in the JSON provided. Do not invent numbers, events, zones, tasks, teams, times or causes.
- Do not introduce thresholds, limits, durations or medical/clinical advice of any kind.
- The data is environmental (sensors, weather) and operational (tasks, zones, site configuration). Never describe or imply anything about a worker's body, health or physiological condition.
- Talk about sites, zones, tasks and teams — not individual workers.
- Use concise enterprise language: "heat risk detected", "risk assessment", "intervention".
- 3–5 sentences, one paragraph, plain text, no headings, no lists, no markdown.
- Mention if the weather feed was unavailable.
- The data is demonstration data; do not claim real-world outcomes.`;

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
