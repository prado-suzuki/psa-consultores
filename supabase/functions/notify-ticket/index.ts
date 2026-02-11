import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── FASE DE TESTE: admin fixo ──
const TEST_ADMIN_EMAIL = "alexandre.silva@psaconsultores.com.br";

const PUBLISHED_URL = "https://psa-consultores.lovable.app";

const departmentLabels: Record<string, string> = {
  contabilidade: "Contabilidade/Societário",
  icms_ipi: "ICMS/IPI",
  irpj_csll: "IRPJ/CSLL",
  pis_cofins: "PIS/COFINS",
  produtor_rural: "Produtor Rural PF",
  outros: "Outros",
};

interface Recipient {
  email: string;
  ticket_url: string;
}

async function getTicketUrlForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  ticketId: string
): Promise<string> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roleSet = new Set((roles || []).map((r: { role: string }) => r.role));

  if (roleSet.has("admin")) {
    return `${PUBLISHED_URL}/gestao/chamados/${ticketId}`;
  }
  if (roleSet.has("team_member")) {
    return `${PUBLISHED_URL}/equipe/chamados/${ticketId}`;
  }
  return `${PUBLISHED_URL}/cliente/chamados/${ticketId}`;
}

async function getEmailForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  return data?.email || null;
}

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

    const ticketDepartment = departmentLabels[ticket.department] || ticket.department || "N/A";

    const recipients: Recipient[] = [];

    // ── ADMIN DE TESTE: URL fixa para gestão ──
    const adminTestUrl = `${PUBLISHED_URL}/gestao/chamados/${ticket.id}`;

    if (event_type === "ticket_created") {
      // Cliente criou chamado → notificar admin de teste
      recipients.push({ email: TEST_ADMIN_EMAIL, ticket_url: adminTestUrl });

    } else if (event_type === "ticket_assigned") {
      // Gestor atribuiu responsável → notificar cliente + responsável
      const clientEmail = await getEmailForUser(supabase, ticket.user_id);
      if (clientEmail) {
        const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
        recipients.push({ email: clientEmail, ticket_url: clientUrl });
      }

      if (ticket.assigned_to) {
        const agentEmail = await getEmailForUser(supabase, ticket.assigned_to);
        if (agentEmail) {
          const agentUrl = await getTicketUrlForUser(supabase, ticket.assigned_to, ticket.id);
          recipients.push({ email: agentEmail, ticket_url: agentUrl });
        }
      }

    } else if (event_type === "ticket_replied") {
      // Mensagem enviada → notificar a outra parte + admin de teste
      if (actor_name === "Equipe PSA" || actor_name === "Responsável") {
        // Equipe/Responsável respondeu → notificar cliente
        const clientEmail = await getEmailForUser(supabase, ticket.user_id);
        if (clientEmail) {
          const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
          recipients.push({ email: clientEmail, ticket_url: clientUrl });
        }
        // Também notificar admin de teste (se não for o próprio autor)
        recipients.push({ email: TEST_ADMIN_EMAIL, ticket_url: adminTestUrl });
      } else {
        // Cliente respondeu → notificar responsável + admin de teste
        if (ticket.assigned_to) {
          const agentEmail = await getEmailForUser(supabase, ticket.assigned_to);
          if (agentEmail) {
            const agentUrl = await getTicketUrlForUser(supabase, ticket.assigned_to, ticket.id);
            recipients.push({ email: agentEmail, ticket_url: agentUrl });
          }
        }
        recipients.push({ email: TEST_ADMIN_EMAIL, ticket_url: adminTestUrl });
      }

    } else if (event_type === "ticket_resolved") {
      // Chamado resolvido → notificar cliente + admin de teste
      const clientEmail = await getEmailForUser(supabase, ticket.user_id);
      if (clientEmail) {
        const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
        recipients.push({ email: clientEmail, ticket_url: clientUrl });
      }
      recipients.push({ email: TEST_ADMIN_EMAIL, ticket_url: adminTestUrl });
    }

    // Deduplicate by email (keep first occurrence for URL)
    const uniqueRecipients = Array.from(
      new Map(recipients.map((r) => [r.email, r])).values()
    );

    console.log(
      `[notify-ticket] Event: ${event_type}, Recipients: ${uniqueRecipients.map((r) => r.email).join(", ") || "none"}`
    );

    // Send webhook for each recipient with their specific URL
    const results = await Promise.allSettled(
      uniqueRecipients.map((recipient) =>
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type,
            recipient_email: recipient.email,
            ticket_title: ticket.title,
            ticket_department: ticketDepartment,
            actor_name: actor_name || "Sistema",
            message_preview: message_preview || "",
            ticket_url: recipient.ticket_url,
          }),
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: uniqueRecipients.length }),
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
