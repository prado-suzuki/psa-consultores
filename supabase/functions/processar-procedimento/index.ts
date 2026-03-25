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
        content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 50000);
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

    // Step 2: Call Lovable AI Gateway for text analysis
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

    // Step 3: Generate cover image using AI
    let aiCoverUrl: string | null = null;
    try {
      const titulo = parsed.titulo || "Procedimento tributário";
      const processosStr = (parsed.processos || []).join(", ");
      const imagePrompt = `Create a professional, clean cover illustration for a tax procedure document titled "${titulo}". Related areas: ${processosStr}. Style: modern flat illustration, professional blue and teal color tones, abstract geometric shapes representing data analysis and compliance, no text in the image, suitable as a card thumbnail.`;

      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const base64Url = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (base64Url && base64Url.startsWith("data:image/")) {
          // Extract base64 data and upload to storage
          const base64Match = base64Url.match(/^data:image\/(\w+);base64,(.+)$/);
          if (base64Match) {
            const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
            const base64Data = base64Match[2];
            const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
            const coverPath = `procedimentos/covers/${id}.${ext}`;

            const { error: uploadErr } = await supabase.storage
              .from("sop-documents")
              .upload(coverPath, binaryData, {
                contentType: `image/${base64Match[1]}`,
                upsert: true,
              });

            if (!uploadErr) {
              aiCoverUrl = coverPath;
            } else {
              console.error("Cover upload error:", uploadErr);
            }
          }
        }
      } else {
        console.error("Image generation failed:", await imageResponse.text());
      }
    } catch (imgErr) {
      console.error("Cover image generation error:", imgErr);
      // Non-fatal: proceed without cover
    }

    // Step 4: Update record with success
    const { error: updateErr } = await supabase
      .from("procedimentos")
      .update({
        ai_titulo: parsed.titulo || null,
        ai_resumo: parsed.resumo || null,
        ai_etapas: parsed.etapas || [],
        ai_complexidade: parsed.complexidade || "intermediario",
        ai_tags: parsed.tags || [],
        processos_associados: parsed.processos || [],
        ai_cover_url: aiCoverUrl,
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
