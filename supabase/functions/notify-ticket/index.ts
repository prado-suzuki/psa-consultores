import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

interface TemplateConfig {
  emoji: string;
  title: string;
  description: string;
  ctaText: string;
  extraRows: { label: string; value: string }[];
}

function getTemplateConfig(
  eventType: string,
  recipientRole: RecipientRole,
  actorName: string,
  messagePreview: string,
  assignedName: string
): TemplateConfig {
  // ticket_created → gestor
  if (eventType === "ticket_created") {
    return {
      emoji: "📩",
      title: "Novo Chamado Aberto",
      description: "Um cliente abriu um novo chamado que precisa da sua atenção.",
      ctaText: "Ver Chamado",
      extraRows: [],
    };
  }

  // ticket_assigned
  if (eventType === "ticket_assigned") {
    if (recipientRole === "cliente") {
      return {
        emoji: "👤",
        title: "Chamado Atribuído",
        description: "Seu chamado foi atribuído a um responsável da nossa equipe. Em breve você receberá uma resposta.",
        ctaText: "Ver Chamado",
        extraRows: assignedName ? [{ label: "RESPONSÁVEL", value: assignedName }] : [],
      };
    }
    // responsavel
    return {
      emoji: "🎯",
      title: "Novo Chamado Atribuído",
      description: "Você recebeu um novo chamado para atendimento. Confira os detalhes abaixo.",
      ctaText: "Atender Chamado",
      extraRows: [],
    };
  }

  // ticket_replied
  if (eventType === "ticket_replied") {
    if (recipientRole === "cliente") {
      return {
        emoji: "💬",
        title: "Nova Resposta da Equipe",
        description: "A equipe PSA enviou uma nova mensagem no seu chamado.",
        ctaText: "Responder",
        extraRows: [
          { label: "RESPONDIDO POR", value: actorName || "Equipe PSA" },
          ...(messagePreview ? [{ label: "MENSAGEM", value: messagePreview }] : []),
        ],
      };
    }
    if (recipientRole === "responsavel") {
      return {
        emoji: "💬",
        title: "Nova Mensagem do Cliente",
        description: "O cliente enviou uma nova mensagem no chamado.",
        ctaText: "Responder",
        extraRows: [
          { label: "RESPONDIDO POR", value: actorName || "Cliente" },
          ...(messagePreview ? [{ label: "MENSAGEM", value: messagePreview }] : []),
        ],
      };
    }
    // gestor
    return {
      emoji: "💬",
      title: "Nova Mensagem do Cliente",
      description: "O cliente enviou uma nova mensagem em um chamado.",
      ctaText: "Ver Detalhes",
      extraRows: [
        { label: "RESPONDIDO POR", value: actorName || "Cliente" },
        ...(messagePreview ? [{ label: "MENSAGEM", value: messagePreview }] : []),
      ],
    };
  }

  // ticket_resolved
  if (eventType === "ticket_resolved") {
    if (recipientRole === "cliente") {
      return {
        emoji: "✅",
        title: "Chamado Resolvido",
        description: "Seu chamado foi marcado como resolvido pela equipe PSA. Caso precise de algo mais, você pode abrir um novo chamado.",
        ctaText: "Ver Detalhes",
        extraRows: [],
      };
    }
    // gestor
    return {
      emoji: "✅",
      title: "Chamado Finalizado",
      description: "Um chamado foi marcado como resolvido.",
      ctaText: "Ver Detalhes",
      extraRows: [],
    };
  }

  // fallback
  return {
    emoji: "📋",
    title: "Atualização no Chamado",
    description: "Houve uma atualização em um chamado.",
    ctaText: "Ver Chamado",
    extraRows: [],
  };
}

function generateEmailSubject(eventType: string, recipientRole: RecipientRole, ticketTitle: string): string {
  const t = ticketTitle.length > 50 ? ticketTitle.substring(0, 47) + "..." : ticketTitle;

  if (eventType === "ticket_created") return `[PSA] Novo Chamado: ${t}`;
  if (eventType === "ticket_assigned") {
    return recipientRole === "cliente"
      ? `[PSA] Chamado Atribuído: ${t}`
      : `[PSA] Novo Chamado para Você: ${t}`;
  }
  if (eventType === "ticket_replied") {
    return recipientRole === "cliente"
      ? `[PSA] Resposta no Chamado: ${t}`
      : `[PSA] Mensagem do Cliente: ${t}`;
  }
  if (eventType === "ticket_resolved") return `[PSA] Chamado Resolvido: ${t}`;
  return `[PSA] Atualização: ${t}`;
}

function generateEmailHtml(
  config: TemplateConfig,
  ticketTitle: string,
  ticketDepartment: string,
  ticketUrl: string
): string {
  const dataRows = [
    { label: "TÍTULO", value: ticketTitle },
    { label: "DEPARTAMENTO", value: ticketDepartment },
    ...config.extraRows,
  ];

  const rowsHtml = dataRows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 12px;color:#888;font-size:12px;font-weight:600;text-transform:uppercase;width:140px;vertical-align:top;">${r.label}</td>
        <td style="padding:8px 12px;color:#333;font-size:14px;">${escapeHtml(r.value)}</td>
      </tr>`
    )
    .join("");

  return `
<div style="max-width:600px;margin:0 auto;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;background:#f4f4f5;">
  <!-- Header -->
  <div style="background:#0d9488;color:#ffffff;padding:28px 24px;border-radius:8px 8px 0 0;text-align:center;">
    <div style="font-size:32px;margin-bottom:8px;">${config.emoji}</div>
    <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">${config.title}</h1>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;padding:28px 24px;">
    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px 0;">${config.description}</p>

    <!-- Data table -->
    <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:6px;overflow:hidden;margin-bottom:28px;">
      ${rowsHtml}
    </table>

    <!-- CTA -->
    <div style="text-align:center;">
      <a href="${ticketUrl}" style="display:inline-block;background:#0d9488;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
        ${config.ctaText} →
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding:20px 24px;text-align:center;border-radius:0 0 8px 8px;">
    <p style="margin:0;color:#aaa;font-size:12px;">PSA Consultores — Este e-mail foi enviado automaticamente.</p>
    <p style="margin:4px 0 0;color:#ccc;font-size:11px;">Você recebeu este e-mail porque está envolvido neste chamado.</p>
  </div>
</div>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Main handler ──

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

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, title, department, user_id, assigned_to, priority")
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
    const adminTestUrl = `${PUBLISHED_URL}/gestao/chamados/${ticket.id}`;

    // Get assigned agent name for templates
    let assignedName = "";
    if (ticket.assigned_to) {
      assignedName = await getNameForUser(supabase, ticket.assigned_to);
    }

    // ── Build recipients by event ──

    if (event_type === "ticket_created") {
      recipients.push({ email: TEST_ADMIN_EMAIL, ticket_url: adminTestUrl, role: "gestor" });

    } else if (event_type === "ticket_assigned") {
      const clientEmail = await getEmailForUser(supabase, ticket.user_id);
      if (clientEmail) {
        const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
        recipients.push({ email: clientEmail, ticket_url: clientUrl, role: "cliente" });
      }
      if (ticket.assigned_to) {
        const agentEmail = await getEmailForUser(supabase, ticket.assigned_to);
        if (agentEmail) {
          const { url: agentUrl } = await getTicketUrlForUser(supabase, ticket.assigned_to, ticket.id);
          recipients.push({ email: agentEmail, ticket_url: agentUrl, role: "responsavel" });
        }
      }

    } else if (event_type === "ticket_replied") {
      if (actor_name === "Equipe PSA" || actor_name === "Responsável") {
        const clientEmail = await getEmailForUser(supabase, ticket.user_id);
        if (clientEmail) {
          const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
          recipients.push({ email: clientEmail, ticket_url: clientUrl, role: "cliente" });
        }
        recipients.push({ email: TEST_ADMIN_EMAIL, ticket_url: adminTestUrl, role: "gestor" });
      } else {
        if (ticket.assigned_to) {
          const agentEmail = await getEmailForUser(supabase, ticket.assigned_to);
          if (agentEmail) {
            const { url: agentUrl } = await getTicketUrlForUser(supabase, ticket.assigned_to, ticket.id);
            recipients.push({ email: agentEmail, ticket_url: agentUrl, role: "responsavel" });
          }
        }
        recipients.push({ email: TEST_ADMIN_EMAIL, ticket_url: adminTestUrl, role: "gestor" });
      }

    } else if (event_type === "ticket_resolved") {
      const clientEmail = await getEmailForUser(supabase, ticket.user_id);
      if (clientEmail) {
        const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
        recipients.push({ email: clientEmail, ticket_url: clientUrl, role: "cliente" });
      }
      recipients.push({ email: TEST_ADMIN_EMAIL, ticket_url: adminTestUrl, role: "gestor" });
    }

    // Deduplicate by email
    const uniqueRecipients = Array.from(
      new Map(recipients.map((r) => [r.email, r])).values()
    );

    console.log(
      `[notify-ticket] Event: ${event_type}, Recipients: ${uniqueRecipients.map((r) => `${r.email}(${r.role})`).join(", ") || "none"}`
    );

    // ── Send webhooks with individualized email content ──

    const results = await Promise.allSettled(
      uniqueRecipients.map((recipient) => {
        const config = getTemplateConfig(
          event_type,
          recipient.role,
          actor_name || "Sistema",
          message_preview || "",
          assignedName
        );

        const emailSubject = generateEmailSubject(event_type, recipient.role, ticket.title);
        const emailBodyHtml = generateEmailHtml(config, ticket.title, ticketDepartment, recipient.ticket_url);

        return fetch(webhookUrl, {
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
            email_subject: emailSubject,
            email_body_html: emailBodyHtml,
          }),
        });
      })
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
