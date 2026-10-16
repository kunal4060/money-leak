import { NextRequest, NextResponse } from "next/server";

// This route must run at request time (serverless), never be prerendered.
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  "You are LeakGuard, a retail business analyst. Given these anomaly flags and KPIs from a company's transaction data, write a concise plain-English executive summary: top 3 problems, likely business causes, and prioritized actions. Keep it under 250 words, no jargon, bullet points.";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

type Flag = {
  id?: string;
  category?: string;
  region?: string;
  channel?: string;
  period?: string;
  metric?: string;
  observed?: number;
  expected?: number;
  z?: number;
  severity?: string;
  n?: number;
};

function flagsToText(flags: Flag[]): string {
  return flags
    .slice(0, 25)
    .map(
      (f) =>
        `- ${f.id ?? "?"}: ${f.metric} anomaly in ${f.category} / ${f.region} / ${f.channel} (${f.period}): observed ${f.observed} vs expected ${f.expected}, z=${f.z}, severity ${f.severity}, ${f.n} transactions`
    )
    .join("\n");
}

export async function POST(req: NextRequest) {
  // Read inside the handler so the build never needs the key.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI not configured — add GEMINI_API_KEY" },
      { status: 503 }
    );
  }

  let body: { flags?: Flag[]; kpis?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const flags = Array.isArray(body.flags) ? body.flags : [];
  const kpis =
    body.kpis && typeof body.kpis === "object" ? body.kpis : {};

  const userPrompt =
    `Company KPIs: ${JSON.stringify(kpis)}\n\n` +
    `Anomaly flags:\n${flagsToText(flags) || "(no flags detected)"}\n\n` +
    `Write the executive summary now.`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // header keeps the key out of URLs (and out of logs)
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 700, temperature: 0.7 },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Gemini API error (${res.status}): ${detail.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const summary = Array.isArray(parts)
      ? parts.map((p: { text?: string }) => p?.text || "").join("").trim()
      : "";
    if (!summary) {
      return NextResponse.json(
        { error: "Gemini returned an empty summary" },
        { status: 502 }
      );
    }
    return NextResponse.json({ summary });
  } catch (e) {
    return NextResponse.json(
      {
        error: `AI request failed: ${e instanceof Error ? e.message : "unknown error"}`,
      },
      { status: 500 }
    );
  }
}
