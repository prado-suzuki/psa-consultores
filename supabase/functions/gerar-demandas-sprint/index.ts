import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";

interface RequestBody {
  objetivo?: string | null;
  project_id?: string | null;
  process_id?: string | null;
  capacidade_horas?: number | null; // capacidade da equipe no período (horas)
  contexto_extra?: string | null;
}

interface DemandaGerada {
  title: string;
  description: string;
  estimated_hours: number;
  priority: "low" | "medium" | "high";
  justificativa: string;
  suggested_assignee_name?: string | null;
}

interface GeracaoResult {
  demandas: DemandaGerada[];
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

    const objetivo = (body.objetivo || "").trim();
    if (!objetivo) {
      return new Response(
        JSON.stringify({ error: "Informe o objetivo da sprint para gerar as demandas." }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ---- Enriquecimento de contexto (a IA estima com base na realidade da PSA) ----
    const [profilesRes, projectsRes, processesRes, dailysRes, deliverablesRes] = await Promise.all([
      admin.from("profiles_safe").select("id, first_name, last_name"),
      body.project_id
        ? admin.from("projects").select("id, name, status").eq("id", body.project_id)
        : admin.from("projects").select("id, name, status").eq("status", "active"),
      body.process_id
        ? admin.from("processes").select("id, name, area").eq("id", body.process_id)
        : admin.from("processes").select("id, name, area").limit(50),
      admin.from("daily_standups").select("blockers, date").order("date", { ascending: false }).limit(40),
      admin.from("sprint_deliverables").select("title, estimated_hours, status").limit(200),
    ]);

    const profiles = profilesRes.data ?? [];
    const projects = projectsRes.data ?? [];
    const processes = processesRes.data ?? [];
    const dailys = dailysRes.data ?? [];
    const deliverables = deliverablesRes.data ?? [];

    const equipe = profiles
      .map((p: any) => `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim())
      .filter(Boolean);

    const bloqueiosRecentes = dailys
      .filter((d: any) => d.blockers && String(d.blockers).trim().length > 0)
      .slice(0, 8)
      .map((d: any) => `[${d.date}] ${String(d.blockers).substring(0, 140)}`);

    const horasComputadas = deliverables
      .map((d: any) => Number(d.estimated_hours))
      .filter((h: number) => Number.isFinite(h) && h > 0);
    const horaMedia = horasComputadas.length
      ? horasComputadas.reduce((s: number, h: number) => s + h, 0) / horasComputadas.length
      : null;

    const contextoDados = `
OBJETIVO DA SPRINT (descrito pela coordenadora):
${objetivo}
${body.contexto_extra ? `\nCONTEXTO ADICIONAL:\n${body.contexto_extra}` : ""}

PROJETO EM FOCO: ${projects.map((p: any) => p.name).join(", ") || "Não especificado"}
PROCESSOS RELACIONADOS: ${processes.map((p: any) => p.name).join(", ") || "Nenhum mapeado"}

EQUIPE DISPONÍVEL (use estes nomes ao sugerir responsável): ${equipe.join(", ") || "Não informada"}
CAPACIDADE DO PERÍODO: ${body.capacidade_horas ? `${body.capacidade_horas}h totais` : "Não informada"}

REFERÊNCIA DE ESFORÇO HISTÓRICO:
- Horas médias por entregável já executado: ${horaMedia ? `${horaMedia.toFixed(1)}h` : "sem histórico"}

BLOQUEIOS RECENTES REPORTADOS NAS DAILYS (priorize demandas que destravem estes pontos):
${bloqueiosRecentes.length ? bloqueiosRecentes.join("\n") : "Nenhum bloqueio recente registrado"}
`.trim();

    const prompt = `Você é uma coordenadora sênior de tecnologia da PSA Consultores (consultoria tributária), especialista em planejamento ágil. Sua tarefa é decompor o objetivo de uma sprint em uma lista de demandas (entregáveis) claras, acionáveis e bem estimadas, que serão colocadas no backlog para distribuição.

${contextoDados}

Regras para gerar as demandas:
- Quebre o objetivo em demandas concretas e independentes (entre 4 e 12 itens, conforme a complexidade).
- Cada título deve ser específico e orientado a entrega (verbo + objeto), não genérico.
- Estime horas de forma realista, usando a referência de esforço histórico quando existir.
- Se a capacidade do período foi informada, a soma das horas das demandas NÃO deve ultrapassá-la de forma irreal — sinalize na justificativa caso o escopo exija mais do que a capacidade.
- Defina prioridade (high/medium/low) considerando dependências e bloqueios recentes.
- Sugira um responsável (suggested_assignee_name) APENAS usando nomes da equipe disponível; deixe nulo se não houver encaixe claro.
- A justificativa deve explicar em 1 frase por que a demanda existe e como contribui para o objetivo.
- Escreva tudo em português brasileiro.

Retorne a lista no formato estruturado solicitado.`;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const demandaItemSchema = {
      type: "object",
      properties: {
        title: { type: "string", description: "Título específico e acionável da demanda" },
        description: { type: "string", description: "Descrição do que precisa ser feito" },
        estimated_hours: { type: "number", description: "Horas estimadas (realista)" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        justificativa: { type: "string", description: "1 frase: por que esta demanda existe" },
        suggested_assignee_name: {
          type: ["string", "null"],
          description: "Nome de alguém da equipe disponível, ou null",
        },
      },
      required: ["title", "description", "estimated_hours", "priority", "justificativa"],
    };

    let result: GeracaoResult;

    if (ANTHROPIC_API_KEY) {
      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 3000,
          tools: [{
            name: "gerar_demandas",
            description: "Retorna a lista de demandas geradas para a sprint",
            input_schema: {
              type: "object",
              properties: {
                demandas: { type: "array", items: demandaItemSchema },
              },
              required: ["demandas"],
            },
          }],
          tool_choice: { type: "tool", name: "gerar_demandas" },
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
      result = toolUse.input as GeracaoResult;
    } else if (LOVABLE_API_KEY) {
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
              name: "gerar_demandas",
              description: "Retorna a lista de demandas geradas para a sprint",
              parameters: {
                type: "object",
                properties: {
                  demandas: { type: "array", items: demandaItemSchema },
                },
                required: ["demandas"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "gerar_demandas" } },
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

    // Normaliza e resolve o responsável sugerido para um profile id quando houver match exato.
    const demandas: DemandaGerada[] = Array.isArray(result?.demandas) ? result.demandas : [];
    const total_horas = demandas.reduce((s, d) => s + (Number(d.estimated_hours) || 0), 0);

    return new Response(
      JSON.stringify({
        demandas,
        resumo: {
          total_demandas: demandas.length,
          total_horas,
          capacidade_horas: body.capacidade_horas ?? null,
        },
        gerado_em: new Date().toISOString(),
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("gerar-demandas-sprint error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
