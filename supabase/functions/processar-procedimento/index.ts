import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um assistente especializado em documentação técnica tributária e fiscal brasileira.
Analise o documento fornecido e retorne APENAS um JSON válido, sem texto adicional, no seguinte formato exato:
{
  "titulo": "título claro e objetivo do procedimento",
  "resumo": "resumo executivo em até 3 linhas explicando o que esse procedimento resolve e quando usar",
  "etapas": ["etapa-chave 1", "etapa-chave 2", "etapa-chave 3"],
  "processos": ["EFD", "XMLs"],
  "complexidade": "simples|intermediario|avancado",
  "tags": ["tag1", "tag2", "tag3"]
}

Regras:
- etapas: máximo 5 itens representando os grandes blocos do procedimento, não passos detalhados
- processos: selecione apenas entre os valores [EFD, XMLs, PERDCOMP, Selic, IBS/CBS, Balancetes, PIS/COFINS, Cruzamento de Dados, Correções SPED] — estes são os processos executados dentro da área Dev
- complexidade: simples = até 5 passos lineares sem ramificações; intermediario = envolve validações ou múltiplas etapas condicionais; avancado = envolve múltiplos sistemas ou validações cruzadas
- tags: máximo 5, palavras-chave de busca relevantes para o procedimento`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!lovableApiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { id } = await req.json();
    if (!id) throw new Error("Missing procedimento id");

    // Fetch the procedimento record
    const { data: proc, error: fetchErr } = await supabase
      .from("procedimentos")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !proc) throw new Error("Procedimento not found");

    let content = "";

    // Step 1: Extract content
    if (proc.source_type === "link" && proc.source_url) {
      try {
        const res = await fetch(proc.source_url);
        const html = await res.text();
        // Strip HTML tags for plain text extraction
        content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 50000); // Limit content size
      } catch (e) {
        throw new Error(`Failed to fetch URL: ${e.message}`);
      }
    } else if ((proc.source_type === "pdf" || proc.source_type === "docx") && proc.arquivo_path) {
      try {
        const { data: fileData, error: dlErr } = await supabase.storage
          .from("sop-documents")
          .download(proc.arquivo_path);
        if (dlErr || !fileData) throw new Error("Failed to download file from storage");
        content = await fileData.text();
        content = content.substring(0, 50000);
      } catch (e) {
        throw new Error(`Failed to read file: ${e.message}`);
      }
    } else {
      throw new Error("No valid source provided");
    }

    if (!content || content.length < 20) {
      throw new Error("Content too short or empty to analyze");
    }

    // Step 2: Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analise o seguinte documento e retorne o JSON estruturado:\n\n${content}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI gateway error [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("Empty AI response");

    // Parse JSON from AI response (handle markdown code blocks)
    let jsonStr = rawContent.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Step 3: Update record with success
    const { error: updateErr } = await supabase
      .from("procedimentos")
      .update({
        ai_titulo: parsed.titulo || null,
        ai_resumo: parsed.resumo || null,
        ai_etapas: parsed.etapas || [],
        ai_complexidade: parsed.complexidade || "intermediario",
        ai_tags: parsed.tags || [],
        processos_associados: parsed.processos || [],
        status_geracao: "gerado",
        erro_mensagem: null,
      })
      .eq("id", id);

    if (updateErr) throw new Error(`Failed to update: ${updateErr.message}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("processar-procedimento error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Try to update the record with error status
    try {
      const { id } = await req.clone().json().catch(() => ({ id: null }));
      if (id) {
        await supabase
          .from("procedimentos")
          .update({ status_geracao: "erro", erro_mensagem: errorMessage })
          .eq("id", id);
      }
    } catch { /* ignore update errors */ }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
