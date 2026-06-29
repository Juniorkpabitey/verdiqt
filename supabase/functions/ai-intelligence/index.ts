import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL_KEY = "verdiqt-default";
const PROMPT_VERSION = "1.0";

type AiAction =
  | "chat"
  | "analyze"
  | "case-analyze"
  | "timeline-extract"
  | "entity-extract"
  | "rights-assess"
  | "contradiction-scan";

interface RequestBody {
  action: AiAction;
  message?: string;
  query?: string;
  case_id?: string;
  checklist?: Record<string, boolean>;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildMeta(confidence: number, taskKey: string, limitations: string[] = [], sources: string[] = []) {
  return {
    task_key: taskKey,
    model_key: MODEL_KEY,
    prompt_version: PROMPT_VERSION,
    confidence,
    limitations,
    sources,
    informational_only: true,
    requires_human_review: true,
    generated_at: new Date().toISOString(),
  };
}

async function callAi(system: string, user: string, jsonMode = false): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

  if (!openaiKey) {
    return JSON.stringify({
      demo: true,
      message: "Demo mode — set OPENAI_API_KEY for full intelligence.",
      input_preview: user.slice(0, 300),
    });
  }

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`AI provider error: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "{}";
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function getCaseContext(supabase: ReturnType<typeof createClient>, caseId: string) {
  const { data, error } = await supabase
    .from("cases")
    .select("id, title, jurisdiction, incident_report, country_code, procedural_stage")
    .eq("id", caseId)
    .single();
  if (error || !data) throw new Error("Case not found");
  return data;
}

async function maybeConsumeCredit(supabase: ReturnType<typeof createClient>, role: string) {
  if (role !== "client") return;
  const { error } = await supabase.rpc("consume_trial_credit");
  if (error) {
    const msg = error.message.includes("exhausted") ? "Free trial credits exhausted" : error.message;
    throw new Error(msg);
  }
}

async function createReview(
  supabase: ReturnType<typeof createClient>,
  caseId: string,
  outputType: string,
  draft: Record<string, unknown>,
  confidence: number,
  meta: Record<string, unknown>,
) {
  const { data, error } = await supabase.rpc("create_ai_review", {
    p_case_id: caseId,
    p_output_type: outputType,
    p_ai_draft: draft,
    p_confidence: confidence,
    p_meta: meta,
  });
  if (error) console.error("create_ai_review:", error.message);
  return data as string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body: RequestBody = await req.json();
    const { action } = body;
    if (!action) return jsonResponse({ error: "action is required" }, 400);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
    const userRole = profile?.role ?? "client";

    const systemBase =
      "You are Verdiqt, a human-centered criminal justice intelligence assistant for African legal systems. " +
      "NEVER determine guilt, sentence, bail outcomes, or risk scores. " +
      "Provide assistive analysis only. Always note outputs require human lawyer review. " +
      "This is not legal advice.";

    // --- chat / analyze ---
    if (action === "chat" || action === "analyze") {
      const prompt = (action === "chat" ? body.message : body.query)?.trim();
      if (!prompt) return jsonResponse({ error: "message or query is required" }, 400);
      await maybeConsumeCredit(supabase, userRole);
      const answer = await callAi(systemBase, prompt);
      const parsed = parseJson<{ message?: string; demo?: boolean }>(answer, { message: answer });
      const text = parsed.message ?? answer;
      const meta = buildMeta(0.65, action, ["Not verified against live legal corpus"]);
      await supabase.rpc("log_ai_interaction", {
        p_channel: action === "chat" ? "chat" : "case_analysis",
        p_prompt: prompt,
        p_response: text,
        p_meta: meta,
      });
      return jsonResponse({ answer: text, sources: [], meta });
    }

    // --- case analyze ---
    if (action === "case-analyze") {
      const caseId = body.case_id;
      if (!caseId) return jsonResponse({ error: "case_id is required" }, 400);
      const caseRow = await getCaseContext(supabase, caseId);
      await maybeConsumeCredit(supabase, userRole);

      const composed = `Case: ${caseRow.title}\nJurisdiction: ${caseRow.jurisdiction || "N/A"}\nStage: ${caseRow.procedural_stage || "unknown"}\n\n${caseRow.incident_report}`;
      const answer = await callAi(systemBase + " Provide markdown case summary with issues and suggested investigative paths (not outcomes).", composed);
      const issues = ["Review evidence admissibility", "Confirm procedural rights compliance", "Assess bail factors if applicable"];
      const outcomes = ["Investigate plea options with counsel", "Consider evidentiary challenges if inconsistencies exist"];
      const reportMd = `## AI Case Summary (Draft — Requires Review)\n\n${answer}\n\n## Key Legal Issues\n- ${issues.join("\n- ")}\n\n## Suggested Investigative Paths\n- ${outcomes.join("\n- ")}`;
      const confidence = 0.62;
      const meta = buildMeta(confidence, "case-analyze", ["Draft only — not for court use"]);

      await supabase.rpc("save_case_analysis", {
        p_case_id: caseId,
        p_report_markdown: reportMd,
        p_issues: issues,
        p_outcomes: outcomes,
        p_confidence: confidence,
        p_created_by: userRole === "client" ? "client" : userRole,
      });

      const reviewId = await createReview(supabase, caseId, "case_analysis", { report_markdown: reportMd }, confidence, meta);
      await supabase.rpc("log_ai_interaction", { p_channel: "case_analysis", p_prompt: composed, p_response: answer, p_case_id: caseId, p_meta: meta });

      return jsonResponse({ ok: true, report_markdown: reportMd, review_id: reviewId, meta });
    }

    const caseId = body.case_id;
    if (!caseId) return jsonResponse({ error: "case_id is required" }, 400);
    const caseRow = await getCaseContext(supabase, caseId);
    const caseText = `Title: ${caseRow.title}\nJurisdiction: ${caseRow.jurisdiction}\nReport:\n${caseRow.incident_report}`;

    if (action === "timeline-extract") {
      const raw = await callAi(
        systemBase + " Return JSON: { events: [{ title, description, event_date, actors[] }] }. Dates may be null if unknown.",
        caseText,
        true,
      );
      const parsed = parseJson<{ events: Record<string, unknown>[] }>(raw, { events: [] });
      const confidence = parsed.events.length ? 0.7 : 0.4;
      const meta = buildMeta(confidence, "timeline-extract", ["Dates may be incomplete"]);

      for (const ev of parsed.events.slice(0, 20)) {
        await supabase.from("case_timeline_events").insert({
          case_id: caseId,
          title: String(ev.title || "Event"),
          description: ev.description ? String(ev.description) : null,
          event_date: ev.event_date ? String(ev.event_date) : null,
          actors: ev.actors ?? [],
          ai_generated: true,
        });
      }

      const reviewId = await createReview(supabase, caseId, "timeline", { events: parsed.events }, confidence, meta);
      return jsonResponse({ output: parsed, meta, review_id: reviewId });
    }

    if (action === "entity-extract") {
      const raw = await callAi(
        systemBase + " Return JSON: { entities: [{ entity_type, label, attributes }] }. Types: person, location, charge, statute, object, event.",
        caseText,
        true,
      );
      const parsed = parseJson<{ entities: Record<string, unknown>[] }>(raw, { entities: [] });
      const confidence = parsed.entities.length ? 0.72 : 0.4;
      const meta = buildMeta(confidence, "entity-extract");

      for (const ent of parsed.entities.slice(0, 30)) {
        await supabase.from("case_entities").insert({
          case_id: caseId,
          entity_type: String(ent.entity_type || "other"),
          label: String(ent.label || "Unknown"),
          attributes: ent.attributes ?? {},
          ai_generated: true,
        });
      }

      const reviewId = await createReview(supabase, caseId, "entities", { entities: parsed.entities }, confidence, meta);
      return jsonResponse({ output: parsed, meta, review_id: reviewId });
    }

    if (action === "rights-assess") {
      const checklist = body.checklist ?? {};
      const raw = await callAi(
        systemBase + " Return JSON: { summary: string, alerts: string[] }. Suggest areas for lawyer review only — never legal conclusions.",
        `Checklist responses:\n${JSON.stringify(checklist)}\n\nCase:\n${caseText}`,
        true,
      );
      const parsed = parseJson<{ summary: string; alerts: string[] }>(raw, {
        summary: "Preliminary rights review — requires lawyer verification.",
        alerts: [],
      });
      const meta = buildMeta(0.68, "rights-assess", ["Non-binding assessment"]);

      await supabase.from("rights_assessments").insert({
        case_id: caseId,
        assessment_type: "fair_trial",
        checklist_responses: checklist,
        ai_summary: parsed.summary,
        risk_alerts: parsed.alerts,
        created_by: userData.user.id,
        status: "draft",
      });

      const reviewId = await createReview(supabase, caseId, "rights_assessment", parsed, 0.68, meta);
      return jsonResponse({ output: parsed, meta, review_id: reviewId });
    }

    if (action === "contradiction-scan") {
      const { data: statements } = await supabase.from("witness_statements").select("id, witness_label, statement_text").eq("case_id", caseId);
      const raw = await callAi(
        systemBase + " Return JSON: { flags: [{ description, source_a, source_b, confidence }] }. Flag potential inconsistencies only.",
        `${caseText}\n\nStatements:\n${JSON.stringify(statements ?? [])}`,
        true,
      );
      const parsed = parseJson<{ flags: Record<string, unknown>[] }>(raw, { flags: [] });
      const meta = buildMeta(0.6, "contradiction-scan", ["Requires lawyer materiality assessment"]);

      for (const flag of parsed.flags.slice(0, 10)) {
        await supabase.from("contradiction_flags").insert({
          case_id: caseId,
          source_a_type: "incident_report",
          source_a_id: caseId,
          source_b_type: "statement",
          source_b_id: caseId,
          description: String(flag.description || "Potential inconsistency"),
          ai_confidence: typeof flag.confidence === "number" ? flag.confidence : 0.5,
        });
      }

      const reviewId = await createReview(supabase, caseId, "contradictions", parsed, 0.6, meta);
      return jsonResponse({ output: parsed, meta, review_id: reviewId });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal error";
    const status = message.includes("exhausted") ? 402 : 500;
    return jsonResponse({ error: message }, status);
  }
});
