import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// ── Dynamic gestor lookup ──

async function getGestorRecipients(
  supabase: ReturnType<typeof createClient>,
  ticketId: string
): Promise<Recipient[]> {
  const { data: areas } = await supabase
    .from("estrutura_areas")
    .select("id")
    .contains("page_categories", ["tax"])
    .eq("is_active", true);

  if (!areas?.length) return [];

  const areaIds = areas.map((a: { id: string }) => a.id);

  const { data: lideres } = await supabase
    .from("estrutura_area_lideres")
    .select("user_id")
    .in("area_id", areaIds);

  if (!lideres?.length) return [];

  const userIds = [...new Set(lideres.map((l: { user_id: string }) => l.user_id))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  if (!profiles?.length) return [];

  const gestorUrl = `${PUBLISHED_URL}/gestao/chamados/${ticketId}`;

  return profiles
    .filter((p: { email: string | null }) => p.email)
    .map((p: { id: string; email: string }) => ({
      email: p.email,
      ticket_url: gestorUrl,
      role: "gestor" as RecipientRole,
    }));
}

// ── Auth helper ──

async function validateCaller(req: Request): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { authorized: false, error: "No authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return { authorized: false, error: "Invalid token" };
  }

  if (data.claims.role === "service_role") {
    return { authorized: true };
  }

  const userId = data.claims.sub as string;
  if (!userId) {
    return { authorized: false, error: "No user ID in token" };
  }

  return { authorized: true };
}

// ── Helper functions ──

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

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await validateCaller(req);
    if (!authResult.authorized) {
      console.error("[notify-ticket] Auth failed:", authResult.error);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    let assignedName = "";
    if (ticket.assigned_to) {
      assignedName = await getNameForUser(supabase, ticket.assigned_to);
    }

    // ── Build recipients by event ──

    if (event_type === "ticket_created") {
      const gestores = await getGestorRecipients(supabase, ticket.id);
      recipients.push(...gestores);

    } else if (event_type === "ticket_assigned") {
      const clientEmail = await getEmailForUser(supabase, ticket.user_id);
      if (clientEmail) {
        const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
        recipients.push({ email: clientEmail, ticket_url: clientUrl, role: "cliente" });
      }
      if (ticket.assigned_to) {
        const agentEmail = await getEmailForUser(supabase, ticket.assigned_to);
        if (agentEmail) {
          const agentUrl = "https://psaconsultores.com.br/equipe";
          recipients.push({ email: agentEmail, ticket_url: agentUrl, role: "responsavel" });
        }
      }

    } else if (event_type === "ticket_replied") {
      const clientEmail = await getEmailForUser(supabase, ticket.user_id);
      if (clientEmail) {
        const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
        recipients.push({ email: clientEmail, ticket_url: clientUrl, role: "cliente" });
      }
      if (ticket.assigned_to) {
        const agentEmail = await getEmailForUser(supabase, ticket.assigned_to);
        if (agentEmail) {
          const agentUrl = "https://psaconsultores.com.br/equipe";
          recipients.push({ email: agentEmail, ticket_url: agentUrl, role: "responsavel" });
        }
      }
      const gestores = await getGestorRecipients(supabase, ticket.id);
      recipients.push(...gestores);

    } else if (event_type === "ticket_overdue") {
      const gestores = await getGestorRecipients(supabase, ticket.id);
      recipients.push(...gestores);

    } else if (event_type === "ticket_resolved") {
      const clientEmail = await getEmailForUser(supabase, ticket.user_id);
      if (clientEmail) {
        const clientUrl = `${PUBLISHED_URL}/cliente/chamados/${ticket.id}`;
        recipients.push({ email: clientEmail, ticket_url: clientUrl, role: "cliente" });
      }
      const gestores = await getGestorRecipients(supabase, ticket.id);
      recipients.push(...gestores);
    }

    // Deduplicate by email+role
    const uniqueRecipients = Array.from(
      new Map(recipients.map((r) => [`${r.email}|${r.role}`, r])).values()
    );

    console.log(
      `[notify-ticket] Event: ${event_type}, Recipients: ${uniqueRecipients.map((r) => `${r.email}(${r.role})`).join(", ") || "none"}`
    );

    // ── Send single consolidated webhook ──

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
