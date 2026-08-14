import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── ALE-2 · Status de entrega vindo da Meta ──────────────────────────────────
//
// Terceira perna do fluxo, e a única em que NÓS somos chamados:
//   1. app/banco -> n8n        (nós chamamos, no clique)
//   2. n8n -> Meta / Gmail     (n8n chama, segundos depois)
//   3. Meta -> AQUI            (eles chamam, minutos ou horas depois)
//
// Por isso não cabe no mesmo job: quando esta chamada chega, o job do envio
// terminou há muito tempo. Cada mensagem pode gerar até 3 chamadas (`sent`,
// `delivered`, `read`).
//
// POR QUE AQUI E NÃO NO n8n: a Meta assina o corpo com X-Hub-Signature-256, um
// HMAC-SHA256 sobre o CORPO BRUTO. Validar exige os bytes exatos como chegaram.
// Em Deno é `await req.text()`; no nó Webhook do n8n o parse do JSON e a
// re-serialização quebram o hash, e aí sobra desligar a validação — deixando o
// endpoint aberto a quem descobrir a URL.
//
// SEM verify_jwt: a Meta não fala o protocolo de auth do Supabase. A autenticação
// é a assinatura HMAC, validada à mão abaixo. Padrão do AGENTS.md para função
// chamada por provedor externo.
//
// SÓ ENTREGA DADO REAL DEPOIS DO APP PUBLICADO. Enquanto o app estiver em
// dev_mode, a Meta manda apenas webhook de teste do painel.
//
// Correlação: a linha é encontrada por `provedor_message_id` (o `wamid`), que vem
// na resposta do envio e volta aqui. Sem ele não há como saber a qual envio o
// status pertence. No e-mail via nó Gmail não existe identificador equivalente,
// então lá o estado final permanece `enviado`.

// Meta -> nosso enum. `played` (áudio) não se aplica aos nossos avisos.
const STATUS_META: Record<string, string> = {
  sent: "enviado",
  delivered: "entregue",
  read: "lido",
  failed: "falhou",
};

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Comparação de tempo constante: evita vazar o prefixo correto por timing. */
function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function assinaturaValida(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return igual(hex(mac), header.slice("sha256=".length));
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── Handshake de verificação (GET) ──
  // Regra dura da Meta: responder 200 com o hub.challenge em texto puro, senão o
  // webhook não é aceito no painel.
  if (req.method === "GET") {
    const verifyToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN");
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    console.error("[notificacao-status] Handshake recusado");
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  try {
    // Corpo BRUTO antes de qualquer parse — é sobre ele que o HMAC é calculado.
    const raw = await req.text();

    const appSecret = Deno.env.get("META_APP_SECRET");
    if (!appSecret) {
      console.error("[notificacao-status] META_APP_SECRET not configured");
      return new Response("misconfigured", { status: 500 });
    }

    if (!(await assinaturaValida(raw, req.headers.get("x-hub-signature-256"), appSecret))) {
      console.error("[notificacao-status] Assinatura inválida");
      return new Response("invalid signature", { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = JSON.parse(raw);
    let tratados = 0;
    let ignorados = 0;

    // A Meta envia lotes: entry[] -> changes[] -> value.statuses[].
    for (const entry of payload?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        for (const st of change?.value?.statuses ?? []) {
          const wamid: string | undefined = st?.id;
          const statusNovo = STATUS_META[st?.status];
          if (!wamid || !statusNovo) {
            ignorados++;
            continue;
          }

          const { data: linha } = await supabase
            .from("notificacao_envio")
            .select("id")
            .eq("provedor_message_id", wamid)
            .maybeSingle();

          // Sem linha: mensagem enviada por fora deste fluxo, ou webhook de
          // teste do painel. Não é erro — só não há o que atualizar.
          if (!linha) {
            ignorados++;
            continue;
          }

          const erro = st?.errors?.[0];
          const { error } = await supabase.rpc("confirmar_envio", {
            _id: linha.id,
            _status: statusNovo,
            _provedor_message_id: wamid,
            _erro_codigo: erro?.code ? String(erro.code) : null,
            _erro: erro?.title ?? erro?.message ?? null,
          });

          if (error) console.error("[notificacao-status] confirmar_envio failed:", error);
          else tratados++;
        }
      }
    }

    console.log(`[notificacao-status] tratados=${tratados} ignorados=${ignorados}`);

    // 200 sempre que a assinatura for válida. A Meta reentrega por até 7 dias
    // quando não recebe 200, e reentrega de lote inteiro por causa de uma linha
    // nossa que não casou só geraria ruído — o dado de entrega é complementar,
    // não crítico para o negócio.
    return new Response(JSON.stringify({ tratados, ignorados }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[notificacao-status] Error:", error);
    // 200 de propósito: erro nosso não deve fazer a Meta reentregar por 7 dias.
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
