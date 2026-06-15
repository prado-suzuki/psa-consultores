// Temporary loader: executes the bundled PSA MAPA migration SQL using
// the project's exec_sql_admin RPC (service-role only). Single-shot, idempotent
// due to ON CONFLICT semantics on the underlying inserts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(url, serviceKey, { auth: { persistSession: false } });

    const sqlPath = new URL("./migration.sql", import.meta.url);
    const sql = await Deno.readTextFile(sqlPath);

    const { data, error } = await supa.rpc("exec_sql_admin", { p_sql: sql });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message, details: error }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, bytes: sql.length, result: data }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
