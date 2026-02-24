import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Authentication: accept service_role JWT or DW_SYNC_TOKEN API key ──
    const authHeader = req.headers.get("Authorization");
    const apiKey = req.headers.get("x-api-key");

    let authorized = false;

    // Option 1: API key (for external cron callers)
    const syncToken = Deno.env.get("DW_SYNC_TOKEN");
    if (apiKey && syncToken && apiKey === syncToken) {
      authorized = true;
    }

    // Option 2: Service role JWT (for server-to-server calls)
    if (!authorized && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await tempClient.auth.getClaims(token);
      if (!error && data?.claims?.role === "service_role") {
        authorized = true;
      }
    }

    if (!authorized) {
      console.error("[check-ticket-deadlines] Unauthorized access attempt");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const todayStr = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Buscar tickets vencidos (deadline < hoje), com status ativo e aguardando resposta da equipe
    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("id, title, deadline, user_id, assigned_to")
      .in("status", ["aberto", "em_andamento"])
      .neq("activity_status", "respondido")
      .not("deadline", "is", null)
      .lt("deadline", todayStr)
      .order("deadline", { ascending: true });

    if (error) {
      console.error("[check-ticket-deadlines] Error fetching tickets:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tickets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[check-ticket-deadlines] Found ${tickets?.length || 0} overdue ticket(s) (deadline < ${todayStr})`
    );

    // Para cada ticket vencido, calcular dias_atraso e chamar notify-ticket
    const results = await Promise.allSettled(
      (tickets || []).map((ticket) => {
        const deadlineDate = new Date(ticket.deadline + "T00:00:00Z");
        const todayDate = new Date(todayStr + "T00:00:00Z");
        const diffMs = todayDate.getTime() - deadlineDate.getTime();
        const diasAtraso = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        console.log(
          `[check-ticket-deadlines] Ticket ${ticket.id} - deadline: ${ticket.deadline}, dias_atraso: ${diasAtraso}`
        );

        return fetch(`${supabaseUrl}/functions/v1/notify-ticket`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            event_type: "ticket_overdue",
            ticket_id: ticket.id,
            actor_name: "Sistema",
            dias_atraso: diasAtraso,
          }),
        });
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        success: true,
        checked_date: todayStr,
        overdue_count: tickets?.length || 0,
        sent,
        failed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-ticket-deadlines] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
