import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SLA_DAYS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Buscar tickets abertos/em andamento que não foram resolvidos
    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("id, title, updated_at, user_id, assigned_to")
      .not("status", "in", '("resolvido","fechado")')
      .order("updated_at", { ascending: true });

    if (error) {
      console.error("[check-ticket-deadlines] Error fetching tickets:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tickets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const overdueTickets = (tickets || []).filter((t) => {
      const updatedAt = new Date(t.updated_at);
      const diffMs = now.getTime() - updatedAt.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays >= SLA_DAYS;
    });

    console.log(
      `[check-ticket-deadlines] Found ${overdueTickets.length} overdue ticket(s) out of ${tickets?.length || 0} open tickets`
    );

    // Para cada ticket vencido, chamar notify-ticket com evento ticket_overdue
    const results = await Promise.allSettled(
      overdueTickets.map((ticket) => {
        const updatedAt = new Date(ticket.updated_at);
        const diffMs = now.getTime() - updatedAt.getTime();
        const diasAtraso = Math.floor(diffMs / (1000 * 60 * 60 * 24));

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
        overdue_count: overdueTickets.length,
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
