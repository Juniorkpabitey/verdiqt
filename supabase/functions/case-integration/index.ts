import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const apiKey = req.headers.get("x-api-key") || body.api_key;

    // API key path for external case management systems
    if (apiKey) {
      const { data: keyInfo, error: keyErr } = await supabase.rpc("validate_api_key", { p_key: apiKey });
      if (keyErr || !keyInfo) {
        return jsonResponse({ error: "Invalid API key" }, 401);
      }

      if (action === "case-export" && body.case_id) {
        const scopes = (keyInfo as { scopes?: string[] }).scopes ?? [];
        if (!scopes.includes("case:read")) {
          return jsonResponse({ error: "Insufficient scope" }, 403);
        }

        const { data, error } = await supabase.rpc("export_case_for_integration", {
          p_case_id: body.case_id,
        });
        if (error) return jsonResponse({ error: error.message }, 400);

        await supabase.rpc("log_security_event", {
          p_event_type: "data.api_access",
          p_resource_type: "case",
          p_resource_id: body.case_id,
          p_meta: { via: "api_key", key_prefix: (keyInfo as { name?: string }).name },
        });

        return jsonResponse({ data, informational_only: true });
      }

      if (action === "health") {
        return jsonResponse({ status: "ok", scope: (keyInfo as { scopes?: string[] }).scopes });
      }

      return jsonResponse({ error: "Unknown action" }, 400);
    }

    // JWT-authenticated path (filing export from app)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);

    if (action === "filing-export" && body.case_id) {
      const exportType = body.export_type || "filing_prep";
      const { data: exportId, error } = await userClient.rpc("build_filing_export", {
        p_case_id: body.case_id,
        p_export_type: exportType,
      });
      if (error) return jsonResponse({ error: error.message }, 400);

      const { data: exportRow } = await userClient
        .from("filing_exports")
        .select("id, export_type, bundle, created_at")
        .eq("id", exportId)
        .single();

      return jsonResponse({
        export_id: exportId,
        export: exportRow,
        informational_only: true,
        requires_lawyer_review: true,
      });
    }

    if (action === "case-export" && body.case_id) {
      const { data, error } = await userClient.rpc("export_case_for_integration", {
        p_case_id: body.case_id,
      });
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ data, informational_only: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
