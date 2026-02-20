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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Buscar tickets com deadline preenchido, vencido ou igual a hoje, e status ainda aberto
    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("id, title, deadline, user_id, assigned_to")
      .not("status", "in", '("resolvido","fechado")')
      .not("deadline", "is", null)
      .lte("deadline", today)
      .order("deadline", { ascending: true });

    if (error) {
      console.error("[check-ticket-deadlines] Error fetching tickets:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tickets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[check-ticket-deadlines] Found ${tickets?.length || 0} overdue ticket(s) (deadline <= ${today})`
    );

    // Para cada ticket vencido, calcular dias_atraso e chamar notify-ticket
    const results = await Promise.allSettled(
      (tickets || []).map((ticket) => {
        const deadlineDate = new Date(ticket.deadline + "T00:00:00Z");
        const todayDate = new Date(today + "T00:00:00Z");
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
        checked_date: today,
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
