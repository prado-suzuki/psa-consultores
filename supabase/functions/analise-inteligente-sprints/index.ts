import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  start_date?: string | null;
  end_date?: string | null;
  sprint_id?: string | null;
  project_id?: string | null;
  process_id?: string | null;
  category?: string | null;
}

interface AnalysisResult {
  sintese_executiva: string;
  evolucao_entregas: string;
  tempo_vs_resultado: string;
  saudabilidade_sprint: string;
  aderencia_escopo: string;
  gastos_extras: string;
  riscos: string[];
  oportunidades: string[];
  recomendacoes: string[];
  nivel_risco: "baixo" | "medio" | "alto";
  score_saude: number;
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const cors = buildCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json().catch(() => ({}));

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build queries with filters
    let sprintsQuery = admin.from("sprints").select("*");
    if (body.start_date) sprintsQuery = sprintsQuery.gte("start_date", body.start_date);
    if (body.end_date) sprintsQuery = sprintsQuery.lte("end_date", body.end_date);
    if (body.sprint_id) sprintsQuery = sprintsQuery.eq("id", body.sprint_id);
    if (body.project_id) sprintsQuery = sprintsQuery.eq("project_id", body.project_id);

    let dailysQuery = admin.from("daily_standups").select("*");
    if (body.start_date) dailysQuery = dailysQuery.gte("date", body.start_date);
    if (body.end_date) dailysQuery = dailysQuery.lte("date", body.end_date);
    if (body.sprint_id) dailysQuery = dailysQuery.eq("sprint_id", body.sprint_id);
    if (body.project_id) dailysQuery = dailysQuery.eq("project_id", body.project_id);
    if (body.process_id) dailysQuery = dailysQuery.eq("process_id", body.process_id);

    const [sprintsRes, dailysRes, deliverablesRes, improvementsRes, projectsRes, processesRes] = await Promise.all([
      sprintsQuery,
      dailysQuery.order("date", { ascending: false }).limit(500),
      admin.from("sprint_deliverables").select("*"),
      admin.from("process_improvements").select("sprint_deliverable_id, cost_saved_monthly, time_saved_hours, evaluation_status"),
      admin.from("projects").select("id, name, status"),
      admin.from("processes").select("id, name, area, cost_monthly"),
    ]);

    const sprints = sprintsRes.data ?? [];
    const dailys = dailysRes.data ?? [];
    const allDeliverables = deliverablesRes.data ?? [];
    const improvements = improvementsRes.data ?? [];
    const projects = projectsRes.data ?? [];
    const processes = processesRes.data ?? [];

    const sprintIds = new Set(sprints.map((s: any) => s.id));
    const deliverables = allDeliverables.filter((d: any) => !d.sprint_id || sprintIds.has(d.sprint_id));

    // Aggregations
    const totalSprints = sprints.length;
    const activeSprints = sprints.filter((s: any) => s.status === "active").length;
    const completedSprints = sprints.filter((s: any) => s.status === "completed").length;

    const totalDeliverables = deliverables.length;
    const completedDeliverables = deliverables.filter((d: any) => d.status === "completed").length;
    const inProgressDeliverables = deliverables.filter((d: any) => d.status === "in_progress").length;
    const pendingDeliverables = deliverables.filter((d: any) => d.status === "pending").length;
    const deliveryRate = totalDeliverables > 0
      ? Math.round((completedDeliverables / totalDeliverables) * 100)
      : 0;

    const totalEstimatedHours = deliverables.reduce(
      (sum: number, d: any) => sum + (Number(d.estimated_hours) || 0), 0
    );

    // Overdue: due_date passed and status !== completed
    const today = new Date().toISOString().split("T")[0];
    const overdueDeliverables = deliverables.filter(
      (d: any) => d.due_date && d.due_date < today && d.status !== "completed"
    ).length;

    // Blockers from dailys
    const dailysWithBlockers = dailys.filter((d: any) => d.blockers && d.blockers.trim().length > 0);
    const totalBlockers = dailysWithBlockers.length;

    // Sprint scope adherence (deliverables added after sprint start -> scope creep)
    const scopeCreepSignals = deliverables.filter((d: any) => {
      if (!d.sprint_id || !d.created_at) return false;
      const sprint = sprints.find((s: any) => s.id === d.sprint_id);
      if (!sprint) return false;
      const deliverableCreated = new Date(d.created_at);
      const sprintStart = new Date(sprint.start_date);
      // created more than 1 day after sprint start
      return deliverableCreated.getTime() - sprintStart.getTime() > 24 * 60 * 60 * 1000;
    }).length;

    // Impact from improvements linked to deliverables
    const deliverableIds = new Set(deliverables.map((d: any) => d.id));
    const linkedImprovements = improvements.filter((imp: any) =>
      imp.sprint_deliverable_id && deliverableIds.has(imp.sprint_deliverable_id)
    );
    const totalCostSaved = linkedImprovements.reduce(
      (sum: number, i: any) => sum + (Number(i.cost_saved_monthly) || 0), 0
    );
    const totalTimeSaved = linkedImprovements.reduce(
      (sum: number, i: any) => sum + (Number(i.time_saved_hours) || 0), 0
    );

    // Extra costs signal: overdue deliverables * avg hourly cost (using 150 BRL/hour as baseline)
    const HOURLY_RATE = 150;
    const estimatedExtraCost = overdueDeliverables * HOURLY_RATE * 4; // ~4h extras per late item

    // Health score (0-100)
    const deliveryComp = deliveryRate; // 0-100
    const blockerComp = Math.max(0, 100 - (totalBlockers / Math.max(totalSprints, 1)) * 20);
    const scopeComp = Math.max(0, 100 - (scopeCreepSignals / Math.max(totalDeliverables, 1)) * 100);
    const overdueComp = Math.max(0, 100 - (overdueDeliverables / Math.max(totalDeliverables, 1)) * 100);
    const scoreSaude = Math.round((deliveryComp + blockerComp + scopeComp + overdueComp) / 4);

    // Build context for Claude
    const contextoDados = `
PERÍODO: ${body.start_date || "início"} a ${body.end_date || "hoje"}
FILTROS APLICADOS: ${[
      body.sprint_id && `Sprint específica`,
      body.project_id && `Projeto específico`,
      body.process_id && `Processo específico`,
      body.category && `Categoria: ${body.category}`,
    ].filter(Boolean).join(", ") || "Nenhum filtro adicional"}

MÉTRICAS DE SPRINTS:
- Total de sprints: ${totalSprints} (${activeSprints} ativas, ${completedSprints} concluídas)
- Total de entregáveis: ${totalDeliverables}
- Entregáveis concluídos: ${completedDeliverables} (${deliveryRate}%)
- Entregáveis em progresso: ${inProgressDeliverables}
- Entregáveis pendentes: ${pendingDeliverables}
- Entregáveis atrasados: ${overdueDeliverables}
- Horas estimadas totais: ${totalEstimatedHours.toFixed(0)}h

MÉTRICAS DE DAILYS:
- Total de dailys no período: ${dailys.length}
- Dailys com bloqueios reportados: ${totalBlockers}
- Bloqueios recentes (últimos 5): ${dailysWithBlockers.slice(0, 5).map((d: any) =>
      `[${d.date}] ${(d.blockers || "").substring(0, 100)}`
    ).join(" | ")}

ADERÊNCIA AO ESCOPO:
- Sinais de scope creep (entregáveis adicionados após início da sprint): ${scopeCreepSignals}
- Proporção scope creep / total: ${totalDeliverables > 0 ? Math.round((scopeCreepSignals / totalDeliverables) * 100) : 0}%

IMPACTO GERADO:
- Economia mensal gerada por melhorias vinculadas: R$ ${totalCostSaved.toLocaleString("pt-BR")}
- Horas liberadas por mês: ${totalTimeSaved.toFixed(0)}h
- Melhorias completadas vinculadas: ${linkedImprovements.length}

GASTOS EXTRAS ESTIMADOS:
- Custo estimado com atrasos (4h extras x ${overdueDeliverables} itens x R$ ${HOURLY_RATE}/h): R$ ${estimatedExtraCost.toLocaleString("pt-BR")}

SCORE DE SAÚDE CALCULADO: ${scoreSaude}/100

CONTEXTO DA ORGANIZAÇÃO:
- PSA Consultores é uma consultoria tributária especializada
- Projetos ativos no sistema: ${projects.filter((p: any) => p.status === "active").length}
- Processos mapeados: ${processes.length}
`.trim();

    const prompt = `Você é um consultor estratégico senior da PSA Consultores, especializado em gestão ágil de projetos tributários. Analise os dados operacionais abaixo e produza um relatório executivo completo em português brasileiro.

${contextoDados}

Gere uma análise estratégica e acionável, cobrindo os seguintes eixos. Seja direto, numérico quando possível, e focado em insights acionáveis (não descreva os números, interprete-os).

Retorne a análise no formato estruturado solicitado.`;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let result: AnalysisResult;

    if (ANTHROPIC_API_KEY) {
      // Direct Claude API
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 2000,
          tools: [{
            name: "relatorio_analise",
            description: "Retorna análise estratégica estruturada das sprints e dailys",
            input_schema: {
              type: "object",
              properties: {
                sintese_executiva: { type: "string", description: "2-3 frases com o diagnóstico geral" },
                evolucao_entregas: { type: "string", description: "Análise da evolução das entregas semanais" },
                tempo_vs_resultado: { type: "string", description: "Análise do tempo gasto versus resultado obtido" },
                saudabilidade_sprint: { type: "string", description: "Análise de saudabilidade da sprint e do projeto" },
                aderencia_escopo: { type: "string", description: "Análise da aderência ao escopo acordado" },
                gastos_extras: { type: "string", description: "Análise de gastos extras identificados" },
                riscos: { type: "array", items: { type: "string" }, description: "Até 4 riscos prioritários" },
                oportunidades: { type: "array", items: { type: "string" }, description: "Até 4 oportunidades identificadas" },
                recomendacoes: { type: "array", items: { type: "string" }, description: "Até 5 recomendações acionáveis" },
                nivel_risco: { type: "string", enum: ["baixo", "medio", "alto"] },
                score_saude: { type: "number", description: "Score de 0-100 baseado nos dados" },
              },
              required: [
                "sintese_executiva", "evolucao_entregas", "tempo_vs_resultado",
                "saudabilidade_sprint", "aderencia_escopo", "gastos_extras",
                "riscos", "oportunidades", "recomendacoes", "nivel_risco", "score_saude"
              ],
            },
          }],
          tool_choice: { type: "tool", name: "relatorio_analise" },
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        throw new Error(`Claude API error ${aiRes.status}: ${errText}`);
      }

      const aiData = await aiRes.json();
      const toolUse = aiData.content?.find((c: any) => c.type === "tool_use");
      if (!toolUse) throw new Error("No tool_use block returned by Claude");
      result = toolUse.input as AnalysisResult;
    } else if (LOVABLE_API_KEY) {
      // Fallback: Lovable AI Gateway (follows project convention)
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4-5",
          messages: [{ role: "user", content: prompt }],
          tools: [{
            type: "function",
            function: {
              name: "relatorio_analise",
              description: "Retorna análise estratégica estruturada",
              parameters: {
                type: "object",
                properties: {
                  sintese_executiva: { type: "string" },
                  evolucao_entregas: { type: "string" },
                  tempo_vs_resultado: { type: "string" },
                  saudabilidade_sprint: { type: "string" },
                  aderencia_escopo: { type: "string" },
                  gastos_extras: { type: "string" },
                  riscos: { type: "array", items: { type: "string" } },
                  oportunidades: { type: "array", items: { type: "string" } },
                  recomendacoes: { type: "array", items: { type: "string" } },
                  nivel_risco: { type: "string", enum: ["baixo", "medio", "alto"] },
                  score_saude: { type: "number" },
                },
                required: [
                  "sintese_executiva", "evolucao_entregas", "tempo_vs_resultado",
                  "saudabilidade_sprint", "aderencia_escopo", "gastos_extras",
                  "riscos", "oportunidades", "recomendacoes", "nivel_risco", "score_saude"
                ],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "relatorio_analise" } },
        }),
      });

      if (!aiRes.ok) {
        const status = aiRes.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }),
            { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }),
            { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
        }
        const errText = await aiRes.text();
        throw new Error(`AI gateway error ${status}: ${errText}`);
      }

      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        result = JSON.parse(toolCall.function.arguments);
      } else {
        const content = aiData.choices?.[0]?.message?.content || "{}";
        result = JSON.parse(content);
      }
    } else {
      return new Response(
        JSON.stringify({
          error: "Nenhuma chave de IA configurada. Configure ANTHROPIC_API_KEY ou LOVABLE_API_KEY no Supabase.",
        }),
        { status: 503, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Ensure score_saude comes from computed metrics (overrides AI guess with real number)
    result.score_saude = scoreSaude;

    const metricas = {
      total_sprints: totalSprints,
      sprints_ativas: activeSprints,
      sprints_concluidas: completedSprints,
      total_entregaveis: totalDeliverables,
      entregaveis_concluidos: completedDeliverables,
      entregaveis_em_progresso: inProgressDeliverables,
      entregaveis_pendentes: pendingDeliverables,
      entregaveis_atrasados: overdueDeliverables,
      taxa_entrega: deliveryRate,
      total_horas_estimadas: totalEstimatedHours,
      total_dailys: dailys.length,
      dailys_com_bloqueios: totalBlockers,
      scope_creep_sinais: scopeCreepSignals,
      economia_mensal: totalCostSaved,
      horas_liberadas_mes: totalTimeSaved,
      gasto_extra_estimado: estimatedExtraCost,
      score_saude: scoreSaude,
    };

    return new Response(
      JSON.stringify({ analise: result, metricas, gerado_em: new Date().toISOString() }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analise-inteligente-sprints error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
