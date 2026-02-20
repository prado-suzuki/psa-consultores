import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GESTOR_EMAIL = "patricia.melo@psaconsultores.com.br";
const PUBLISHED_URL = "https://psa-consultores.lovable.app";

const departmentLabels: Record<string, string> = {
  contabilidade: "Contabilidade/Societário",
  icms_ipi: "ICMS/IPI",
  irpj_csll: "IRPJ/CSLL",
  pis_cofins: "PIS/COFINS",
  produtor_rural: "Produtor Rural PF",
  outros: "Outros",
};

type RecipientRole = "gestor" | "responsavel" | "cliente";

interface Recipient {
  email: string;
  ticket_url: string;
  role: RecipientRole;
}

// ── Helper functions ──

async function getTicketUrlForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  ticketId: string
): Promise<{ url: string; role: RecipientRole }> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roleSet = new Set((roles || []).map((r: { role: string }) => r.role));

  if (roleSet.has("admin")) {
    return { url: `${PUBLISHED_URL}/gestao/chamados/${ticketId}`, role: "gestor" };
  }
  if (roleSet.has("team_member")) {
    return { url: `${PUBLISHED_URL}/equipe/chamados/${ticketId}`, role: "responsavel" };
  }
  return { url: `${PUBLISHED_URL}/cliente/chamados/${ticketId}`, role: "cliente" };
}

async function getEmailForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("email, first_name")
    .eq("id", userId)
    .single();
  return data?.email || null;
}

async function getNameForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", userId)
    .single();
  if (!data) return "Usuário";
  return `${data.first_name} ${data.last_name}`.trim() || "Usuário";
}

// ── Email template generation ──

// Removidas funcoes de geracao de HTML (responsabilidade do n8n)
// Payload estruturado com ticket_data para n8n gerar o template

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event_type, ticket_id, actor_name, message_preview, dias_atraso } = await req.json();

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

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, title, department, user_id, assigned_to, priority, description")
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
    const gestorUrl = `${PUBLISHED_URL}/gestao/chamados/${ticket.id}`;

    // Get assigned agent name for templates
    let assignedName = "";
    if (ticket.assigned_to) {
      assignedName = await getNameForUser(supabase, ticket.assigned_to);
    }

    // ── Build recipients by event ──

    if (event_type === "ticket_created") {
      recipients.push({ email: GESTOR_EMAIL, ticket_url: gestorUrl, role: "gestor" });

    } else if (event_type === "ticket_assigned") {
      const clientEmail = await getEmailForUser(supabase, ticket.user_id);
      if (clientEmail) {
        const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
        recipients.push({ email: clientEmail, ticket_url: clientUrl, role: "cliente" });
      }
      if (ticket.assigned_to) {
        const agentEmail = await getEmailForUser(supabase, ticket.assigned_to);
        if (agentEmail) {
          // Forçar link da área da equipe (não usar getTicketUrlForUser que pode retornar /gestao/)
          const agentUrl = `${PUBLISHED_URL}/equipe/chamados/${ticket.id}`;
          recipients.push({ email: agentEmail, ticket_url: agentUrl, role: "responsavel" });
        }
      }

    } else if (event_type === "ticket_replied") {
      // Always include all parties — n8n filters by replier_role
      const clientEmail = await getEmailForUser(supabase, ticket.user_id);
      if (clientEmail) {
        const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
        recipients.push({ email: clientEmail, ticket_url: clientUrl, role: "cliente" });
      }
      if (ticket.assigned_to) {
        const agentEmail = await getEmailForUser(supabase, ticket.assigned_to);
        if (agentEmail) {
          const agentUrl = `${PUBLISHED_URL}/equipe/chamados/${ticket.id}`;
          recipients.push({ email: agentEmail, ticket_url: agentUrl, role: "responsavel" });
        }
      }
      recipients.push({ email: GESTOR_EMAIL, ticket_url: gestorUrl, role: "gestor" });

    } else if (event_type === "ticket_overdue") {
      // Apenas gestor recebe alerta de prazo vencido
      recipients.push({ email: GESTOR_EMAIL, ticket_url: gestorUrl, role: "gestor" });

    } else if (event_type === "ticket_resolved") {
      const clientEmail = await getEmailForUser(supabase, ticket.user_id);
      if (clientEmail) {
        const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
        recipients.push({ email: clientEmail, ticket_url: clientUrl, role: "cliente" });
      }
      recipients.push({ email: GESTOR_EMAIL, ticket_url: gestorUrl, role: "gestor" });
    }

    // Deduplicate by email
    const uniqueRecipients = Array.from(
      new Map(recipients.map((r) => [`${r.email}|${r.role}`, r])).values()
    );

    console.log(
      `[notify-ticket] Event: ${event_type}, Recipients: ${uniqueRecipients.map((r) => `${r.email}(${r.role})`).join(", ") || "none"}`
    );

    // ── Send single consolidated webhook ──

    // Buscar nome e email do cliente uma única vez
    const [clientName, clientEmail] = await Promise.all([
      getNameForUser(supabase, ticket.user_id),
      getEmailForUser(supabase, ticket.user_id),
    ]);

    const ticketData = {
      id: ticket.id,
      title: ticket.title,
      department: ticketDepartment,
      priority: ticket.priority
        ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)
        : "Normal",
      description: ticket.description || "",
      cliente_nome: clientName,
      cliente_email: clientEmail || "",
      user_id: ticket.user_id,
      actor_name: actor_name || "Sistema",
      replier_role: actor_name === "Cliente" ? "cliente" : "responsavel",
      message_preview: message_preview || "",
      assigned_to_name: assignedName,
      dias_atraso: dias_atraso || 0,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type,
        ticket_data: ticketData,
        recipients: uniqueRecipients,
      }),
    });

    return new Response(
      JSON.stringify({ success: response.ok, recipients: uniqueRecipients.length }),
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
