import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";
import { montarMensagens, separarPorEspaco, type AvisoDoChat } from "../_shared/mensagemDoChat.ts";

// ── Avisos de tarefa no espaço do Google Chat ──
//
// Plano em docs/planos/avisos-de-tarefa-no-google-chat.md.
//
// O DESENHO É "O CHAT ESPELHA O SINO". Nenhum aviso nasce aqui: os quatro tipos
// já existem em `public.notificacao`, gravados por trigger e pelo cron
// `alertar-tarefas-prazo-diario`, com destinatário e régua decididos na GES-01A.
// Esta função só leva ao espaço o que já foi decidido — por isso ela não sabe
// quem é responsável, nem o que é prazo, nem quando avisar.
//
// FUNÇÃO NOVA, E NÃO UM CANAL NA `notificar`. Aquela é moldada em aviso ao
// CLIENTE: entidade `solicitacao`, destinatário com e-mail e telefone, envio
// pelo n8n. Aqui a entidade é `org_task`, não há destinatário (a mensagem é do
// ESPAÇO) e o envio é um POST direto. É a mesma razão pela qual a `notificar`
// não estendeu a `notify-ticket`.
//
// SEM n8n, ao contrário dos outros dois canais externos. Lá o n8n é quem fala
// com o Gmail e com a Meta; aqui o webhook de espaço é um POST JSON, e o
// intermediário só acrescentaria uma peça para cair.
//
// ORDEM: reservar -> enviar -> confirmar, igual à `notificar`. A linha nasce
// `pendente` ANTES do POST: se a função morrer no meio, sobra evidência de que
// houve tentativa e o desfecho é desconhecido. E a reserva É a checagem de
// dedup, porque `reservar_envio` faz INSERT ... ON CONFLICT DO NOTHING
// RETURNING id — sem a corrida de consultar e depois decidir.
//
// A RESERVA É POR TAREFA, MESMO QUANDO A MENSAGEM É UM RESUMO com várias. Assim
// uma tarefa nunca é publicada duas vezes, e um POST que falha marca exatamente
// quais tarefas não saíram.

const PUBLISHED_URL = "https://psa-consultores.lovable.app";

const ENTIDADE_TIPO = "org_task";
const CANAL = "google_chat";

/**
 * Um segredo por área. O mapa mora aqui, e não no banco, porque a URL do webhook
 * É A CREDENCIAL INTEIRA: quem a tem posta no espaço sem mais nada. Em tabela ela
 * viraria dado legível por qualquer policy distraída; em arquivo versionado,
 * histórico do git.
 *
 * Área fora deste mapa simplesmente não envia, e isso NÃO É ERRO: é como as áreas
 * ativas sem projeto ficam de fora sem precisar de código. Para ligar uma área
 * nova, grave o segredo e acrescente a linha.
 *
 * Os nomes são iguais nos dois bancos, com valores diferentes: no sandbox ambos
 * apontam para o webhook de teste, em produção cada um para o seu espaço. Por
 * isso nenhuma linha deste arquivo pergunta em que ambiente está rodando.
 */
const SEGREDO_DA_AREA: Record<string, string> = {
  Tax: "GCHAT_WEBHOOK_TAX",
  OSG: "GCHAT_WEBHOOK_OSG",
};

/**
 * Janela da varredura, em minutos. Curta de propósito: a trava contra repetir é a
 * chave de idempotência, não a janela. Ela existe para que um despachante parado
 * por dias não desove o acumulado no espaço quando voltar.
 */
const JANELA_PADRAO_MINUTOS = 90;

const PAPEIS_DE_EQUIPE = new Set(["admin", "team_member", "lider", "sublider", "marketing"]);

interface Caller {
  authorized: boolean;
  error?: string;
  equipe?: boolean;
}

/**
 * Molde do `validateCaller` da `notificar`, com o mesmo cuidado de separar "token
 * inválido" de "Auth fora do ar": são saídas opostas para quem depura.
 *
 * Quem chama de verdade é o cron, com `x-api-key`. O caminho do JWT existe para
 * uma pessoa de equipe disparar a passada de teste (`simular`) sem precisar do
 * segredo do cron.
 */
async function validateCaller(req: Request): Promise<Caller> {
  const apiKey = req.headers.get("x-api-key");
  const cronToken = Deno.env.get("CRON_CHAT_TOKEN");
  if (apiKey && cronToken && apiKey === cronToken) {
    return { authorized: true, equipe: true };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { authorized: false, error: "No authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await supabase.auth.getClaims(token);
  if (error) {
    console.error("[notificar-equipe] getClaims falhou:", error.message);
    return { authorized: false, error: "Auth service unavailable" };
  }
  if (!data?.claims) return { authorized: false, error: "Invalid token" };
  if (data.claims.role === "service_role") return { authorized: true, equipe: true };

  const userId = data.claims.sub as string | undefined;
  if (!userId) return { authorized: false, error: "No user ID in token" };

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: papeis } = await admin
    .from("user_roles").select("role").eq("user_id", userId);

  const equipe = (papeis ?? []).some((p: { role: string }) => PAPEIS_DE_EQUIPE.has(p.role));
  return { authorized: true, equipe };
}

/** Dia em `America/Cuiaba`, no mesmo formato que a chave de idempotência usa. */
function diaLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Cuiaba" });
}

/**
 * Quanto esperar entre duas mensagens para o MESMO espaço.
 *
 * O Google Chat limita webhook a cerca de uma mensagem por segundo por espaço.
 * Medido em 14/09/2026, no primeiro envio de verdade: onze mensagens seguidas, e
 * a última voltou 429 (RESOURCE_EXHAUSTED). A folga de 200ms é para o relógio
 * deles não discordar do nosso por uma fração.
 */
const PAUSA_ENTRE_MENSAGENS_MS = 1200;

/** Espera do 429, antes da única nova tentativa. */
const ESPERA_APOS_429_MS = 2500;

const espere = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Posta no espaço, com uma nova tentativa quando o Chat diz que estamos rápidos
 * demais.
 *
 * `threadKey` mais `REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD` é o que faz a mensagem
 * cair na conversa do projeto em vez de numa parede plana; sem o fallback, uma
 * thread que ainda não existe devolveria erro em vez de começar a conversa.
 *
 * O ERRO NUNCA CARREGA A URL. `key` e `token` vão na query string do webhook, e
 * um log com a URL inteira é o segredo entregue a quem puder ler log.
 */
async function postarNoEspaco(
  webhook: string,
  texto: string,
  threadKey: string,
  tentativa = 1,
): Promise<{ ok: boolean; erro?: string }> {
  let alvo: URL;
  try {
    alvo = new URL(webhook);
  } catch {
    return { ok: false, erro: "webhook malformado" };
  }
  alvo.searchParams.set("threadKey", threadKey);
  alvo.searchParams.set("messageReplyOption", "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD");

  try {
    const resposta = await fetch(alvo.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text: texto }),
    });
    if (!resposta.ok) {
      const corpo = await resposta.text();
      // 429 é "rápido demais", não "mensagem inválida": esperar e repetir resolve.
      // Uma tentativa só — se a segunda também bater no limite, a reserva é
      // liberada e a próxima passada do cron, 15 minutos depois, tenta de novo.
      if (resposta.status === 429 && tentativa === 1) {
        await espere(ESPERA_APOS_429_MS);
        return postarNoEspaco(webhook, texto, threadKey, 2);
      }
      return { ok: false, erro: `Chat respondeu ${resposta.status}: ${corpo.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: `falha de rede: ${(e as Error).message}` };
  }
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const cors = buildCorsHeaders(req);
  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const caller = await validateCaller(req);
    if (!caller.authorized) return json({ error: caller.error }, 401);
    if (!caller.equipe) return json({ error: "Requer papel de equipe" }, 403);

    const corpo = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const janelaMinutos = Number(corpo.janela_minutos) || JANELA_PADRAO_MINUTOS;
    const ambiente = typeof corpo.ambiente === "string" ? corpo.ambiente : "prod";
    // `simular` monta o texto e devolve sem reservar nem postar. É como se revê a
    // redação sem gastar a chave de idempotência do dia — reservar e não enviar
    // bloquearia o aviso de verdade até o dia seguinte.
    const simular = corpo.simular === true;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: avisos, error: erroLeitura } = await admin.rpc("avisos_para_o_chat", {
      _janela: `${janelaMinutos} minutes`,
      _ambiente: ambiente,
    });

    if (erroLeitura) {
      console.error("[notificar-equipe] avisos_para_o_chat falhou:", erroLeitura);
      return json({ error: "falha ao ler os avisos" }, 500);
    }

    const pendentes = (avisos ?? []) as AvisoDoChat[];
    if (pendentes.length === 0) {
      return json({ avisos: 0, mensagens: 0, detalhe: "nada a enviar" });
    }

    // Área sem espaço sai ANTES da reserva. Ver `separarPorEspaco`: reservar e
    // marcar falhou queimaria a chave do dia, e o aviso não sairia nem quando o
    // espaço daquela área existisse.
    const { comEspaco, semEspaco } = separarPorEspaco(pendentes, (area) => {
      const segredo = SEGREDO_DA_AREA[area];
      return Boolean(segredo && Deno.env.get(segredo));
    });

    if (comEspaco.length === 0) {
      return json({ avisos: pendentes.length, mensagens: 0, sem_espaco: semEspaco });
    }

    if (simular) {
      return json({
        simulado: true,
        avisos: comEspaco.length,
        sem_espaco: semEspaco,
        mensagens: montarMensagens(comEspaco, PUBLISHED_URL, diaLocal()),
      });
    }

    // ── Reserva ANTES do envio, uma por tarefa ──
    // NULL do `reservar_envio` = a chave já existia: esta tarefa já saiu hoje
    // neste espaço. Não é erro, é o dedup funcionando.
    const envioPorChave = new Map<string, string>();
    const reservados: AvisoDoChat[] = [];
    for (const aviso of comEspaco) {
      const { data: envioId, error: erroReserva } = await admin.rpc("reservar_envio", {
        _chave: aviso.chave,
        _canal: CANAL,
        _tipo: aviso.tipo,
        _entidade_tipo: ENTIDADE_TIPO,
        _entidade_id: aviso.entidade_id,
        _papel: "equipe",
        _metadata: { area: aviso.area_nome, project_id: aviso.project_id },
      });

      if (erroReserva) {
        // Sem a linha não há dedup nem rastro, então esta tarefa não sai. As
        // outras seguem: falha de banco numa linha não é motivo para o espaço
        // ficar sem as demais.
        console.error("[notificar-equipe] reservar_envio falhou:", erroReserva);
        continue;
      }
      if (!envioId) continue;
      envioPorChave.set(aviso.chave, envioId);
      reservados.push(aviso);
    }

    if (reservados.length === 0) {
      return json({
        avisos: pendentes.length,
        mensagens: 0,
        sem_espaco: semEspaco,
        detalhe: "tudo já reservado hoje",
      });
    }

    const mensagens = montarMensagens(reservados, PUBLISHED_URL, diaLocal());
    const resultado: Record<string, { enviadas: number; falhas: number; erro?: string }> = {};

    for (const [indice, mensagem] of mensagens.entries()) {
      // Uma pausa ENTRE as mensagens, nunca antes da primeira nem depois da
      // última: o limite do Chat é por espaço e por segundo, e esperar sem ter
      // acabado de postar só queima o tempo da função.
      if (indice > 0) await espere(PAUSA_ENTRE_MENSAGENS_MS);

      // O `separarPorEspaco` acima já garantiu que existe segredo para esta área.
      // A string vazia no impossível cai em "webhook malformado" no POST, que
      // marca a falha como qualquer outra de envio — em vez de repetir a decisão
      // aqui e abrir a porta para os dois lugares divergirem.
      const webhook = Deno.env.get(SEGREDO_DA_AREA[mensagem.area] ?? "") ?? "";
      const idsDaMensagem = mensagem.chaves
        .map((chave) => envioPorChave.get(chave))
        .filter((id): id is string => Boolean(id));

      const linha = resultado[mensagem.area] ?? { enviadas: 0, falhas: 0 };

      const envio = await postarNoEspaco(webhook, mensagem.texto, mensagem.threadKey);
      if (envio.ok) {
        for (const id of idsDaMensagem) {
          await admin.rpc("confirmar_envio", { _id: id, _status: "enviado" });
        }
        linha.enviadas += mensagem.chaves.length;
      } else {
        // `liberar_reserva_falha` e NÃO `confirmar_envio('falhou')`: a segunda
        // deixaria a chave gravada, e `avisos_para_o_chat` filtra por existência
        // de chave, sem olhar status — a tarefa nunca mais seria oferecida e o
        // aviso sumiria em silêncio por uma oscilação de rede. A primeira anula a
        // chave e mantém a linha com o erro escrito.
        for (const id of idsDaMensagem) {
          await admin.rpc("liberar_reserva_falha", { _id: id, _erro: envio.erro ?? null });
        }
        linha.falhas += mensagem.chaves.length;
        linha.erro = envio.erro;
        console.error(`[notificar-equipe] envio falhou (${mensagem.area}):`, envio.erro);
      }
      resultado[mensagem.area] = linha;
    }

    return json({
      avisos: pendentes.length,
      mensagens: mensagens.length,
      por_area: resultado,
      sem_espaco: semEspaco,
    });
  } catch (e) {
    console.error("[notificar-equipe] erro inesperado:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
