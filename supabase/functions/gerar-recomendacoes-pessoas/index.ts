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

    const { ciclo_id } = await req.json();
    if (!ciclo_id) {
      return new Response(JSON.stringify({ error: "ciclo_id obrigatorio" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch all member data
    const [metasRes, feedbacksRes, profilesRes, reunioesRes] = await Promise.all([
      adminClient.from("metas").select("*").eq("ciclo_id", ciclo_id).eq("nivel", "individual"),
      adminClient.from("feedbacks").select("*").eq("ciclo_id", ciclo_id),
      adminClient.from("profiles").select("id, first_name, last_name"),
      adminClient.from("reunioes_1a1").select("*").eq("ciclo_id", ciclo_id),
    ]);

    const metas = metasRes.data ?? [];
    const feedbacks = feedbacksRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const reunioes = reunioesRes.data ?? [];

    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

    // Group by member
    const byMembro = new Map<string, any[]>();
    metas.forEach((m: any) => {
      if (!m.responsavel_id) return;
      if (!byMembro.has(m.responsavel_id)) byMembro.set(m.responsavel_id, []);
      byMembro.get(m.responsavel_id)!.push(m);
    });

    const membersContext: string[] = [];
    byMembro.forEach((memberMetas, membroId) => {
      const p = profileMap.get(membroId);
      if (!p) return;
      const totalPeso = memberMetas.reduce((a: number, m: any) => a + (m.peso || 1), 0);
      const ppr = totalPeso > 0 ? Math.round(memberMetas.reduce((a: number, m: any) => a + (m.progresso_atual || 0) * (m.peso || 1), 0) / totalPeso) : 0;
      const mf = feedbacks.filter((f: any) => f.para_usuario_id === membroId);
      const mr = reunioes.filter((r: any) => r.membro_id === membroId || r.lider_id === membroId);

      membersContext.push(`- ${p.first_name} ${p.last_name}: PPR=${ppr}%, ${memberMetas.length} metas, ${mf.length} feedbacks, ${mr.length} 1:1s, concluidas=${memberMetas.filter((m: any) => m.status === 'concluida').length}`);
    });

    const prompt = `Voce e um consultor de RH da PSA Consultores. Analise os dados dos membros e gere recomendacoes de decisoes de pessoas (promocao, reajuste, acompanhamento urgente ou manter).

MEMBROS:
${membersContext.join("\n")}

Para cada membro, retorne uma recomendacao no formato JSON array com campos:
- membro_id (uuid)
- tipo_recomendacao: "promocao" | "reajuste" | "acompanhamento" | "manter"
- justificativa: texto explicativo
- percentual_reajuste_sugerido: numero ou null

Tambem retorne um campo "sintese" com texto resumido das tendencias gerais.
Responda APENAS com JSON.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "people_recommendations",
            description: "Return people recommendations",
            parameters: {
              type: "object",
              properties: {
                sintese: { type: "string" },
                recomendacoes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      membro_id: { type: "string" },
                      tipo_recomendacao: { type: "string", enum: ["promocao", "reajuste", "acompanhamento", "manter"] },
                      justificativa: { type: "string" },
                      percentual_reajuste_sugerido: { type: "number" },
                    },
                    required: ["membro_id", "tipo_recomendacao", "justificativa"],
                  },
                },
              },
              required: ["sintese", "recomendacoes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "people_recommendations" } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
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

    // Save to relatorios_gerados
    await adminClient.from("relatorios_gerados").insert({
      ciclo_id,
      tipo: "recomendacao_bonus",
      membro_id: null,
      conteudo_ia: JSON.stringify(result),
      gerado_por: claims.claims.sub,
      status: "pronto",
    });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("gerar-recomendacoes-pessoas error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
