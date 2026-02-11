import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── FASE DE TESTES: apenas estes e-mails recebem notificações ──
const TEST_EMAILS = [
  "alexandre.silva@psaconsultores.com.br",
  "alexandre.g.s.silva04@gmail.com",
];

const PUBLISHED_URL = "https://psa-consultores.lovable.app";

const departmentLabels: Record<string, string> = {
  contabilidade: "Contabilidade/Societário",
  icms_ipi: "ICMS/IPI",
  irpj_csll: "IRPJ/CSLL",
  pis_cofins: "PIS/COFINS",
  produtor_rural: "Produtor Rural PF",
  outros: "Outros",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_type, ticket_id, actor_name, message_preview } = await req.json();

    if (!event_type || !ticket_id) {
      return new Response(
        JSON.stringify({ error: "event_type and ticket_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

    if (!webhookUrl) {
      console.error("[notify-ticket] N8N_WEBHOOK_URL not configured");
      return new Response(
        JSON.stringify({ error: "Webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch ticket data
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, title, department, user_id, assigned_to")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error("[notify-ticket] Ticket not found:", ticketError);
      return new Response(
        JSON.stringify({ error: "Ticket not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ticketUrl = `${PUBLISHED_URL}/gestao/chamados/${ticket.id}`;
    const ticketDepartment = departmentLabels[ticket.department] || ticket.department || "N/A";

    let recipientEmails: string[] = [];

    if (event_type === "ticket_created") {
      // Notify managers: fetch users with admin or gestao roles
      const { data: managerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin"]);

      if (managerRoles && managerRoles.length > 0) {
        const managerIds = managerRoles.map((r: { user_id: string }) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", managerIds);

        recipientEmails = (profiles || [])
          .map((p: { email: string | null }) => p.email)
          .filter((e): e is string => !!e);
      }
    } else if (event_type === "ticket_replied") {
      // Determine who to notify based on who replied
      // If actor is "Equipe PSA" → notify the client (ticket.user_id)
      // If actor is "Cliente" → notify the assigned agent (ticket.assigned_to) or admins
      if (actor_name === "Equipe PSA") {
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", ticket.user_id)
          .single();

        if (clientProfile?.email) {
          recipientEmails = [clientProfile.email];
        }
      } else {
        // Client replied → notify assigned agent or admins
        if (ticket.assigned_to) {
          const { data: agentProfile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", ticket.assigned_to)
            .single();

          if (agentProfile?.email) {
            recipientEmails = [agentProfile.email];
          }
        }

        // Also notify admins
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminRoles && adminRoles.length > 0) {
          const adminIds = adminRoles.map((r: { user_id: string }) => r.user_id);
          const { data: adminProfiles } = await supabase
            .from("profiles")
            .select("email")
            .in("id", adminIds);

          const adminEmails = (adminProfiles || [])
            .map((p: { email: string | null }) => p.email)
            .filter((e): e is string => !!e);

          recipientEmails = [...new Set([...recipientEmails, ...adminEmails])];
        }
      }
    }

    // ── FILTRO DE TESTE: só envia para e-mails da lista de teste ──
    const filteredEmails = recipientEmails.filter((email) =>
      TEST_EMAILS.includes(email.toLowerCase())
    );

    console.log(`[notify-ticket] Event: ${event_type}, Recipients (filtered): ${filteredEmails.join(", ") || "none"}`);

    // Send webhook for each recipient
    const results = await Promise.allSettled(
      filteredEmails.map((email) =>
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type,
            recipient_email: email,
            ticket_title: ticket.title,
            ticket_department: ticketDepartment,
            actor_name: actor_name || "Sistema",
            message_preview: message_preview || "",
            ticket_url: ticketUrl,
          }),
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: filteredEmails.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[notify-ticket] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
