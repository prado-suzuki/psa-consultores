import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use service role for cross-user data access
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Check cache first (6 hours)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: cached } = await adminClient
      .from("relatorios_gerados")
      .select("*")
      .eq("tipo", "resumo_executivo")
      .is("membro_id", null)
      .eq("status", "pronto")
      .gte("gerado_em", sixHoursAgo)
      .order("gerado_em", { ascending: false })
      .limit(1);

    if (cached && cached.length > 0 && cached[0].conteudo_ia) {
      try {
        const parsed = JSON.parse(cached[0].conteudo_ia);
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch { /* regenerate */ }
    }

    // Fetch data for synthesis
    const [projectsRes, tasksRes, cicloRes, metasRes, improvementsRes] = await Promise.all([
      adminClient.from("org_projects").select("id, name, status, start_date, end_date, area_name").eq("is_active", true),
      adminClient.from("fiscal_tasks").select("id, status, category, created_at").neq("status", "done").limit(200),
      adminClient.from("ciclos_avaliacao").select("*").eq("status", "em_andamento").limit(1),
      adminClient.from("metas").select("progresso_atual, nivel, status").eq("nivel", "individual"),
      adminClient.from("process_improvements").select("id, total_savings_monthly, status"),
    ]);

    const projects = projectsRes.data ?? [];
    const tasks = tasksRes.data ?? [];
    const ciclo = (cicloRes.data ?? [])[0];
    const metas = metasRes.data ?? [];
    const improvements = improvementsRes.data ?? [];

    const totalProjects = projects.length;
    const atRisk = projects.filter((p: any) => p.status === "em_risco" || p.status === "atrasado").length;
    const openTasks = tasks.length;
    const avgProgress = metas.length > 0 ? Math.round(metas.reduce((a: number, m: any) => a + (m.progresso_atual || 0), 0) / metas.length) : 0;
    const totalSavings = improvements.reduce((a: number, i: any) => a + (i.total_savings_monthly || 0), 0) * 12;

    const contextPrompt = `Voce e um consultor estrategico da PSA Consultores, uma consultoria tributaria. Analise os seguintes dados e gere uma sintese executiva em portugues BR:

DADOS:
- Projetos ativos: ${totalProjects} (${atRisk} em risco)
- Tarefas abertas: ${openTasks}
- Ciclo ativo: ${ciclo?.nome || "Nenhum"}
- Media de progresso das metas individuais: ${avgProgress}%
- Economia anual estimada por automacoes: R$ ${totalSavings.toLocaleString("pt-BR")}

Retorne um JSON com:
- "sintese": texto analitico de 2-3 frases cruzando os dados
- "bullets": array de exatamente 3 strings com insights acionaveis (oportunidades, riscos, pessoas)

Responda APENAS com o JSON, sem markdown.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: contextPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "executive_synthesis",
            description: "Return executive synthesis with bullets",
            parameters: {
              type: "object",
              properties: {
                sintese: { type: "string" },
                bullets: { type: "array", items: { type: "string" } },
              },
              required: ["sintese", "bullets"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "executive_synthesis" } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Creditos insuficientes. Adicione creditos em Settings > Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiRes.json();
    let result: { sintese: string; bullets: string[] };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      result = JSON.parse(content);
    }

    // Cache in relatorios_gerados
    await adminClient.from("relatorios_gerados").insert({
      tipo: "resumo_executivo",
      membro_id: null,
      conteudo_ia: JSON.stringify(result),
      gerado_por: claims.claims.sub,
      status: "pronto",
    });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gerar-sintese-executiva error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
