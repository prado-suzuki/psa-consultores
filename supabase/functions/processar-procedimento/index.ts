import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";
import {
  extrairTextoDocx,
  extrairTextoHtml,
  extrairTextoPdf,
  garantirTextoUtil,
  pareceMuroDeLogin,
} from "../_shared/extrairTextoDocumento.ts";
// corsHeaders agora vem de ../_shared/cors.ts via buildCorsHeaders(req).
const SYSTEM_PROMPT = `Você é um assistente especializado em documentação técnica tributária e fiscal brasileira.
Analise o documento fornecido e extraia as informações estruturadas solicitadas.`;

const EXTRACT_TOOL = {
  type: "function",
  function: {
    name: "extract_procedimento",
    description: "Extrai informações estruturadas de um documento de procedimento tributário/fiscal.",
    parameters: {
      type: "object",
      properties: {
        titulo: { type: "string", description: "Título claro e objetivo do procedimento" },
        resumo: { type: "string", description: "Resumo executivo em até 3 linhas" },
        etapas: {
          type: "array",
          items: { type: "string" },
          description: "Máximo 5 etapas-chave representando os grandes blocos do procedimento",
        },
        processos: {
          type: "array",
          items: {
            type: "string",
            enum: ["EFD", "XMLs", "PERDCOMP", "Selic", "IBS/CBS", "Balancetes", "PIS/COFINS", "Cruzamento de Dados", "Correções SPED"],
          },
          description: "Processos associados da área Dev",
        },
        complexidade: {
          type: "string",
          enum: ["simples", "intermediario", "avancado"],
          description: "simples = até 5 passos lineares; intermediario = validações condicionais; avancado = múltiplos sistemas",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Máximo 5 palavras-chave de busca",
        },
      },
      required: ["titulo", "resumo", "etapas", "processos", "complexidade", "tags"],
      additionalProperties: false,
    },
  },
};

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(55000) });
      if (res.status === 502 && attempt < maxRetries) {
        console.log(`502 on attempt ${attempt + 1}, retrying in ${5 * (attempt + 1)}s...`);
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < maxRetries && (err as Error).name === "TimeoutError") {
        console.log(`Timeout on attempt ${attempt + 1}, retrying...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Modelos de imagem tentados, na ordem, para a capa do card.
 *
 * O código anterior cravava `google/gemini-3.1-flash-image-preview` — um id que
 * o gateway não atende. A falha caía num `catch` mudo, então a capa nunca
 * aparecia e ninguém ficava sabendo: os cards da biblioteca estavam todos sem
 * capa desde a entrega. `PROCEDIMENTO_COVER_MODEL` permite acertar o id por
 * variável de ambiente, sem deploy de código.
 */
function modelosDeCapa(): string[] {
  const doAmbiente = Deno.env.get("PROCEDIMENTO_COVER_MODEL");
  const candidatos = [
    doAmbiente,
    "google/gemini-2.5-flash-image-preview",
    "google/gemini-3-pro-image-preview",
  ].filter((m): m is string => Boolean(m));
  return [...new Set(candidatos)];
}

type Capa = { status: "ok"; modelo: string } | { status: "falhou"; motivo: string };

async function gerarCapa(
  supabase: ReturnType<typeof createClient>,
  lovableApiKey: string,
  id: string,
  parsed: { titulo?: string; processos?: string[] },
): Promise<Capa> {
  const titulo = parsed.titulo || "Procedimento tributário";
  const processosStr = (parsed.processos || []).join(", ");
  const imagePrompt = `Create a professional, clean cover illustration for a tax procedure document titled "${titulo}". Related areas: ${processosStr}. Style: modern flat illustration, professional blue and teal color tones, abstract geometric shapes representing data analysis and compliance, no text in the image, suitable as a card thumbnail.`;

  const falhas: string[] = [];

  for (const model of modelosDeCapa()) {
    try {
      // maxRetries = 0: a capa é enfeite e o texto já foi salvo como 'gerado'.
      // Com dois modelos candidatos, deixar o retry ligado deixaria a requisição
      // rodando muito depois de o procedimento já estar pronto.
      const imageResponse = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      }, 0);

      if (!imageResponse.ok) {
        const detalhe = (await imageResponse.text()).substring(0, 200);
        falhas.push(`${model}: HTTP ${imageResponse.status} ${detalhe}`);
        continue;
      }

      const imageData = await imageResponse.json();
      const base64Url = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const base64Match = typeof base64Url === "string"
        ? base64Url.match(/^data:image\/(\w+);base64,(.+)$/)
        : null;

      if (!base64Match) {
        falhas.push(`${model}: resposta sem imagem em choices[0].message.images[0]`);
        continue;
      }

      const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
      const binaryData = Uint8Array.from(atob(base64Match[2]), (c) => c.charCodeAt(0));
      const coverPath = `procedimentos/covers/${id}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("sop-documents")
        .upload(coverPath, binaryData, {
          contentType: `image/${base64Match[1]}`,
          upsert: true,
        });

      if (uploadErr) {
        falhas.push(`${model}: upload falhou — ${uploadErr.message}`);
        continue;
      }

      await supabase.from("procedimentos").update({ ai_cover_url: coverPath }).eq("id", id);
      console.log(`Capa gerada para ${id} com ${model}`);
      return { status: "ok", modelo: model };
    } catch (err) {
      falhas.push(`${model}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // A capa é enfeite: não derruba o procedimento. Mas para de sumir em silêncio.
  const motivo = falhas.join(" | ");
  console.error(`Capa NÃO gerada para ${id}. Tentativas: ${motivo}`);
  return { status: "falhou", motivo };
}

serve(async (req) => {
  const _preflight = handleCorsPreflightRequest(req);
  if (_preflight) return _preflight;

  const corsHeaders = buildCorsHeaders(req);

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

  // Auth guard: validate JWT and require team_member or higher
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  {
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
    const roles = new Set((roleRows ?? []).map((r: any) => r.role));
    const allowed = roles.has("admin") || roles.has("lider") || roles.has("sublider") || roles.has("team_member");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden: requires team_member role" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  let procId: string | null = null;

  try {
    const { id } = await req.json();
    procId = id;
    if (!id) throw new Error("Missing procedimento id");

    const { data: proc, error: fetchErr } = await supabase
      .from("procedimentos")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !proc) throw new Error("Procedimento not found");

    // Step 1: Extract content (limited to 15k chars)
    let content = "";
    const MAX_CONTENT = 15000;

    if (proc.source_type === "link" && proc.source_url) {
      const res = await fetch(proc.source_url, { signal: AbortSignal.timeout(15000) });

      if (res.status === 401 || res.status === 403) {
        throw new Error("O link exige login para ser aberto. Use um link público ou anexe o documento.");
      }
      if (!res.ok) {
        throw new Error(`O link respondeu ${res.status}. Confira se o endereço está certo e acessível.`);
      }

      const texto = extrairTextoHtml(await res.text());

      // O fetch segue redirecionamento, então `res.url` é onde ele PAROU —
      // uma tela de login de conta, no caso de documento restrito.
      if (pareceMuroDeLogin(res.url, texto)) {
        throw new Error("O link abriu numa tela de login, não no documento. Use um link público ou anexe o arquivo.");
      }

      content = garantirTextoUtil(texto, "o link", 200).substring(0, MAX_CONTENT);
    } else if ((proc.source_type === "pdf" || proc.source_type === "docx") && proc.arquivo_path) {
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("sop-documents")
        .download(proc.arquivo_path);
      if (dlErr || !fileData) throw new Error("Failed to download file from storage");

      const bytes = new Uint8Array(await fileData.arrayBuffer());
      const texto = proc.source_type === "pdf"
        ? await extrairTextoPdf(bytes)
        : extrairTextoDocx(bytes);

      content = garantirTextoUtil(texto, `o ${proc.source_type.toUpperCase()}`, 200).substring(0, MAX_CONTENT);
    } else {
      throw new Error("No valid source provided");
    }

    // Step 2: Call AI with tool calling for structured extraction
    const aiResponse = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analise o seguinte documento e extraia as informações estruturadas:\n\n${content}` },
        ],
        tools: [EXTRACT_TOOL],
        tool_choice: { type: "function", function: { name: "extract_procedimento" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI gateway error [${aiResponse.status}]: ${errText.substring(0, 300)}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let parsed: any;
    if (toolCall?.function?.arguments) {
      parsed = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try content as JSON
      const rawContent = aiData.choices?.[0]?.message?.content || "";
      let jsonStr = rawContent.trim();
      const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (m) jsonStr = m[1].trim();
      const s = jsonStr.indexOf("{");
      const e = jsonStr.lastIndexOf("}");
      if (s !== -1 && e > s) jsonStr = jsonStr.substring(s, e + 1);
      parsed = JSON.parse(jsonStr);
    }

    // Step 3: Save text results immediately (user sees "gerado" fast)
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

    // Step 4: Generate cover image (non-blocking — failures don't affect status)
    const capa = await gerarCapa(supabase, lovableApiKey, id, parsed);

    return new Response(JSON.stringify({ success: true, capa }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("processar-procedimento error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (procId) {
      try {
        await supabase
          .from("procedimentos")
          .update({ status_geracao: "erro", erro_mensagem: errorMessage })
          .eq("id", procId);
      } catch { /* ignore */ }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
