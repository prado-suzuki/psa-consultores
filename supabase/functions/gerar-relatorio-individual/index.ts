import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";
// corsHeaders agora vem de ../_shared/cors.ts via buildCorsHeaders(req).
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

    const { member_id, ciclo_id, tipo } = await req.json();
    if (!member_id || !ciclo_id || !tipo) {
      return new Response(JSON.stringify({ error: "member_id, ciclo_id e tipo sao obrigatorios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Create placeholder record
    const { data: relatorio, error: insertErr } = await adminClient.from("relatorios_gerados").insert({
      ciclo_id,
      membro_id: member_id,
      tipo,
      status: "gerando",
      gerado_por: claims.claims.sub,
    }).select().single();
    if (insertErr) throw insertErr;

    // Fetch member data
    const [profileRes, metasRes, feedbacksRes, reunioesRes, ciclosRes, comentariosRes] = await Promise.all([
      adminClient.from("profiles").select("*").eq("id", member_id).single(),
      adminClient.from("metas").select("*").eq("ciclo_id", ciclo_id).eq("responsavel_id", member_id).eq("nivel", "individual"),
      adminClient.from("feedbacks").select("*").eq("ciclo_id", ciclo_id).eq("para_usuario_id", member_id),
      adminClient.from("reunioes_1a1").select("*").eq("ciclo_id", ciclo_id).or(`lider_id.eq.${member_id},membro_id.eq.${member_id}`),
      adminClient.from("ciclos_avaliacao").select("*").eq("status", "encerrado").order("data_inicio", { ascending: true }),
      adminClient.from("comentarios_avaliacao").select("*").eq("ciclo_id", ciclo_id).eq("destinatario_id", member_id),
    ]);

    const profile = profileRes.data;
    const metas = metasRes.data ?? [];
    const feedbacks = feedbacksRes.data ?? [];
    const reunioes = reunioesRes.data ?? [];
    const ciclosEncerrados = ciclosRes.data ?? [];
    const comentarios = comentariosRes.data ?? [];

    const totalPeso = metas.reduce((a: number, m: any) => a + (m.peso || 1), 0);
    const ppr = totalPeso > 0 ? Math.round(metas.reduce((a: number, m: any) => a + (m.progresso_atual || 0) * (m.peso || 1), 0) / totalPeso) : 0;

    const tipoPrompts: Record<string, string> = {
      avaliacao_completa: `Gere um relatorio de avaliacao completa para ${profile?.first_name} ${profile?.last_name}.`,
      resumo_executivo: `Gere um resumo executivo da performance de ${profile?.first_name} ${profile?.last_name}.`,
      recomendacao_bonus: `Gere uma recomendacao de bonus/PPR para ${profile?.first_name} ${profile?.last_name}.`,
      historico_evolucao: `Gere uma analise de evolucao historica de ${profile?.first_name} ${profile?.last_name}.`,
    };

    const prompt = `${tipoPrompts[tipo] || tipoPrompts.avaliacao_completa}

DADOS DO MEMBRO:
- Nome: ${profile?.first_name} ${profile?.last_name}
- PPR calculado: ${ppr}%
- Metas no ciclo: ${metas.length}
- Metas concluidas: ${metas.filter((m: any) => m.status === 'concluida').length}
- Feedbacks recebidos: ${feedbacks.length}
- Reunioes 1:1: ${reunioes.length}
- Ciclos anteriores encerrados: ${ciclosEncerrados.length}
- Comentarios de avaliacao: ${comentarios.length}

DETALHAMENTO DAS METAS:
${metas.map((m: any) => `  - ${m.titulo}: progresso=${m.progresso_atual}%, peso=${m.peso}, dimensao=${m.dimensao}, status=${m.status}`).join("\n")}

FEEDBACKS:
${feedbacks.map((f: any) => `  - Tipo: ${f.tipo}, Contexto: ${f.contexto?.substring(0, 100)}`).join("\n")}

Retorne o relatorio em formato JSON com:
- "pontos_fortes": texto com ate 3 paragrafos curtos
- "pontos_desenvolvimento": texto com ate 2 paragrafos (ou null se nao houver)
- "recomendacao_rh": texto com acao recomendada e justificativa
- "tipo_recomendacao": "promocao" | "reajuste" | "manter"
- "dimensoes": array de { dimensao, peso, progresso }
- "resumo": texto geral do relatorio

Responda APENAS com JSON.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await adminClient.from("relatorios_gerados").update({ status: "erro", conteudo_ia: "LOVABLE_API_KEY not configured" }).eq("id", relatorio.id);
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "individual_report",
            description: "Generate individual performance report",
            parameters: {
              type: "object",
              properties: {
                pontos_fortes: { type: "string" },
                pontos_desenvolvimento: { type: "string" },
                recomendacao_rh: { type: "string" },
                tipo_recomendacao: { type: "string", enum: ["promocao", "reajuste", "manter"] },
                dimensoes: { type: "array", items: { type: "object", properties: { dimensao: { type: "string" }, peso: { type: "number" }, progresso: { type: "number" } }, required: ["dimensao", "peso", "progresso"] } },
                resumo: { type: "string" },
              },
              required: ["pontos_fortes", "recomendacao_rh", "tipo_recomendacao", "dimensoes", "resumo"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "individual_report" } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      await adminClient.from("relatorios_gerados").update({ status: "erro", conteudo_ia: `AI error: ${status}` }).eq("id", relatorio.id);
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Creditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiRes.json();
    let result: any;

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      const content = aiData.choices?.[0]?.message?.content || "{}";
      result = JSON.parse(content);
    }

    // Update relatorio with result
    await adminClient.from("relatorios_gerados").update({
      status: "pronto",
      conteudo_ia: JSON.stringify({ ...result, ppr, profile: { first_name: profile?.first_name, last_name: profile?.last_name } }),
    }).eq("id", relatorio.id);

    return new Response(JSON.stringify({ id: relatorio.id, ...result, ppr }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gerar-relatorio-individual error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
