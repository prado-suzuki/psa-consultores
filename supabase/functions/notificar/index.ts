import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";

// ── ALE-2 / ALE-2.1 · Avisos ao cliente no ciclo de coleta de documentos ──
//
// Função de borda NOVA, e não uma extensão de `notify-ticket`. Aquela é moldada
// em chamado de ponta a ponta: lê `tickets`, monta rótulo de departamento, monta
// URL por papel, e o campo raiz do envio é `ticket_data`. O fluxo de automação em
// produção interpreta esse formato — reusar a mesma porta faria o e-mail sair com
// campos vazios.
//
// ORDEM DELIBERADA: reservar -> enviar -> confirmar.
// A `notify-ticket` grava DEPOIS de enviar. Se a função morre entre os dois
// passos (timeout, deploy, cold start), a mensagem sai e o banco não guarda nada.
// Aqui a linha nasce `pendente` ANTES do envio: se algo travar no meio, sobra
// evidência de que houve tentativa e o desfecho é desconhecido.
//
// E a reserva É a checagem de dedup. `reservar_envio` faz INSERT ... ON CONFLICT
// DO NOTHING RETURNING id: devolve id quando ganhou a vaga, NULL quando a chave
// já existia. Sem a corrida do `jaEnviadoHoje`, que consulta e depois decide.
//
// DOIS CANAIS, DUAS ROTAS, UM CONTRATO. Cada canal tem seu workflow no n8n, com
// URL própria em segredo próprio, e recebe o MESMO corpo — muda só o campo
// `canal`. Os dois são processados de forma independente: WhatsApp mal
// configurado, sem telefone ou fora do ar não impede o e-mail de sair, e
// vice-versa. Cada canal reserva a sua própria linha, então o registro diz por
// onde cada mensagem foi.
//
// Canal `sino` NÃO entra: `NotificationPopover` é montado em AdminLayout,
// DevLayout, EquipeLayout, FiscalLayout, OsgLayout e GestaoLayout — em NENHUM
// layout de cliente. Criar linha em `notificacao` para o cliente gravaria algo
// que ninguém vê.
//
// Esta função NÃO monta texto: resolve os valores e entrega ao fluxo, que
// renderiza. É o padrão do Agente de Notificação, onde o nó de envio é genérico e
// o texto vive no Code node. Os textos são os de docs/geral/avisos-cliente.md
// (ALE-12) e docs/geral/whatsapp-templates.md (ALE-11).

const PUBLISHED_URL = "https://psa-consultores.lovable.app";

// Prazo de envio: 30 dias por regra, decidido em 11/08/2026 e registrado em
// docs/geral/avisos-cliente.md. Não há coluna de prazo, e o mesmo valor vale
// para todo cliente e produto.
const PRAZO_DIAS = 30;

const ENTIDADE_TIPO = "solicitacao";

type Canal = "email" | "whatsapp";

const CANAIS: Canal[] = ["email", "whatsapp"];

// Um segredo por canal. NÃO reusar o `N8N_WEBHOOK_URL`, que aponta para o fluxo
// de chamado e itera `recipients` esperando `ticket_data`.
const SEGREDO_WEBHOOK: Record<Canal, string> = {
  email: "N8N_OSG_WEBHOOK_URL",
  whatsapp: "N8N_OSG_WA_WEBHOOK_URL",
};

// ── Quais avisos esta versão dispara ──
//
// Os quatro textos estão escritos e os quatro modelos estão APPROVED na Meta, mas
// só dois têm gatilho:
//
//   1 solicitacao_enviada  -> clique em "enviar solicitação"      (ALE-2)
//   3 documento_aprovado   -> encerramento da solicitação          (aviso 3)
//
// Os outros dois são recusados de propósito, em vez de sair incompletos:
//   2 cobranca_pendencia  -> depende da varredura periódica e da fonte do
//                            pendente (tabela das faltas do Bernardo, card `2`,
//                            ou cálculo do checklist — decisão EDU-6/EDU-9)
//   4 documento_recusado  -> depende do ato de aceitar/recusar documento, que
//                            não existe em tela e não tem card. O modelo de
//                            WhatsApp diz "o motivo de cada um está no portal";
//                            sem a tela, o aviso mentiria para o cliente.
const EVENTOS_COM_DISPARO = new Set(["solicitacao_enviada", "documento_aprovado"]);
const EVENTOS_SEM_DISPARO = new Set(["cobranca_pendencia", "documento_recusado"]);

interface NotificarRequest {
  event_type: string;
  solicitacao_id: string;
}

// ── Auth ──
//
// Aceita `x-api-key` igual a N8N_CALLBACK_TOKEN (chamada de servidor) OU Bearer
// validado por getClaims. No Bearer, `service_role` passa direto e usuário
// autenticado precisa ter `claims.sub`.
//
// NÃO endureça para só service_role: a chamada vem do navegador do analista, com
// o token do usuário logado, e seria rejeitada.
async function validateCaller(req: Request): Promise<{ authorized: boolean; error?: string }> {
  const apiKey = req.headers.get("x-api-key");
  const callbackToken = Deno.env.get("N8N_CALLBACK_TOKEN");
  if (apiKey && callbackToken && apiKey === callbackToken) {
    return { authorized: true };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { authorized: false, error: "No authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return { authorized: false, error: "Invalid token" };
  if (data.claims.role === "service_role") return { authorized: true };
  if (!data.claims.sub) return { authorized: false, error: "No user ID in token" };
  return { authorized: true };
}

// ── Helpers ──

async function getEmailForUser(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("email").eq("id", userId).single();
  return data?.email || null;
}

async function getNameForUser(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles").select("first_name, last_name").eq("id", userId).single();
  if (!data) return "Equipe PSA";
  return `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || "Equipe PSA";
}

function prazoDeEnvio(enviadaEm: string | null): string | null {
  const base = enviadaEm ? new Date(enviadaEm) : new Date();
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + PRAZO_DIAS);
  return base.toISOString().slice(0, 10);
}

// tipo:entidade_tipo:entidade_id:canal:destinatario:AAAA-MM-DD
//
// A data no fim deixa a cobrança diária repetir dia após dia e impede o mesmo
// aviso sair duas vezes no mesmo dia. O canal no meio é o que permite o mesmo
// aviso sair por e-mail E por WhatsApp para a mesma pessoa no mesmo dia, sem uma
// reserva bloquear a outra. Ver comentário da coluna no banco.
function chaveIdempotencia(tipo: string, entidadeId: string, canal: Canal, destino: string): string {
  const dia = new Date().toISOString().slice(0, 10);
  return `${tipo}:${ENTIDADE_TIPO}:${entidadeId}:${canal}:${destino}:${dia}`;
}

interface Alcancavel {
  email: string | null;
  telefone: string | null;
  nome: string;
}

interface Reservado extends Alcancavel {
  envio_id: string;
}

/**
 * O que torna um destinatário alcançável depende do canal, e é por isso que a
 * mesma pessoa pode receber por um e não pelo outro. Medido em 14/08/2026:
 * e-mail em 38 de 38 destinatários com acesso ao portal, telefone em 8 de 38.
 */
function destinoDoCanal(canal: Canal, d: Alcancavel): string | null {
  const bruto = canal === "email" ? d.email : d.telefone;
  const limpo = bruto?.trim();
  return limpo ? limpo : null;
}

Deno.serve(async (req) => {
  const _preflight = handleCorsPreflightRequest(req);
  if (_preflight) return _preflight;

  const corsHeaders = buildCorsHeaders(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authResult = await validateCaller(req);
    if (!authResult.authorized) {
      console.error("[notificar] Auth failed:", authResult.error);
      return json({ error: "Não autorizado" }, 401);
    }

    const { event_type, solicitacao_id } = (await req.json()) as NotificarRequest;
    if (!event_type || !solicitacao_id) {
      return json({ error: "event_type and solicitacao_id are required" }, 400);
    }

    if (!EVENTOS_COM_DISPARO.has(event_type)) {
      const motivo = EVENTOS_SEM_DISPARO.has(event_type)
        ? "tem texto e modelo aprovado, mas o gatilho não existe nesta versão"
        : "desconhecido";
      return json({ error: `event_type ${motivo}: ${event_type}` }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: solicitacao, error: solicitacaoError } = await supabase
      .from("solicitacao")
      .select("id, cliente_id, ordem_servico_id, status, enviada_em, encerrada_em, created_by")
      .eq("id", solicitacao_id)
      .single();

    if (solicitacaoError || !solicitacao) {
      console.error("[notificar] Solicitação not found:", solicitacaoError);
      return json({ error: "Solicitação not found" }, 404);
    }

    // ── Pré-condições por aviso ──
    //
    // O aviso 3 afirma "recebemos e conferimos ... não há pendências". Duas
    // coisas têm de ser verdade antes de afirmar isso, e nenhuma é garantida pelo
    // chamador:
    //
    //   `enviada_em`   -> o cliente foi de fato solicitado. `encerrarSolicitacao`
    //                     aceita sair de 'rascunho', e um rascunho encerrado nunca
    //                     chegou ao cliente: dizer "recebemos e conferimos" seria
    //                     falso.
    //   `encerrada_em` -> a conferência terminou. É o gatilho que o
    //                     avisos-cliente.md autoriza ("sai quando o cliente enviou
    //                     tudo ou quando a solicitação é encerrada").
    //
    // O "não houver documento pendente" do doc fica satisfeito pelo encerramento,
    // que é o ato do consultor declarando o pedido concluído. Contar pendente
    // exigiria a fonte do checklist, que é decisão aberta (EDU-6/EDU-9) — e é
    // justamente por isso que o aviso 2 não sai nesta versão.
    if (event_type === "documento_aprovado") {
      if (!solicitacao.enviada_em) {
        console.log(`[notificar] Skipped: solicitação ${solicitacao.id} encerrada sem nunca ter sido enviada`);
        return json({ success: true, skipped: true, reason: "nunca_enviada" });
      }
      if (!solicitacao.encerrada_em) {
        console.log(`[notificar] Skipped: solicitação ${solicitacao.id} não está encerrada`);
        return json({ success: true, skipped: true, reason: "nao_encerrada" });
      }
    }

    // ── Destinatários ──
    //
    // `destinatarios_cliente` devolve uma linha por representante COM acesso ao
    // portal (`user_id` não nulo). O buraco não é contato ausente — é cliente sem
    // representante com acesso, que existe.
    const { data: brutos, error: destinatariosError } = await supabase.rpc(
      "destinatarios_cliente",
      { _cliente_id: solicitacao.cliente_id }
    );
    if (destinatariosError) {
      console.error("[notificar] destinatarios_cliente failed:", destinatariosError);
      return json({ error: "Falha ao resolver destinatários" }, 500);
    }

    const alcancaveis: Alcancavel[] = [];
    for (const d of brutos ?? []) {
      // Fallback pelo perfil quando o representante não tem e-mail próprio.
      const email = d.email?.trim() || (d.user_id ? await getEmailForUser(supabase, d.user_id) : null);
      const telefone = d.telefone?.trim() || null;
      if (!email && !telefone) continue;
      alcancaveis.push({ email: email ?? null, telefone, nome: d.nome ?? "" });
    }

    // Cliente sem NENHUM destinatário alcançável em NENHUM canal: sucesso dizendo
    // que ignorou, e NÃO grava linha. É o critério de aceite da ALE-2, literal. A
    // tela do analista continua mostrando a solicitação como enviada — a transição
    // já gravou status e data antes desta chamada.
    if (alcancaveis.length === 0) {
      console.log(`[notificar] Skipped: nenhum destinatário alcançável para cliente ${solicitacao.cliente_id}`);
      return json({ success: true, skipped: true, reason: "no_recipient" });
    }

    // ── Dados do aviso ──
    //
    // UM contrato para os dois canais e para os dois avisos: cada Code node do n8n
    // escolhe os campos de que precisa. Assim acrescentar aviso não muda o formato
    // do corpo, e o payload de um canal continua válido no outro.

    const { data: cliente } = await supabase
      .from("cliente").select("nome").eq("id", solicitacao.cliente_id).single();

    // Objeto: produtos contratados na OS, sem repetição. Pré-condição dura
    // registrada nos dois docs: sem OS o objeto vai vazio e o texto sai quebrado.
    // A ALE-31 fez a solicitação nascer sempre da OS, mas a coluna segue nullable.
    let objeto: string[] = [];
    if (solicitacao.ordem_servico_id) {
      const { data: produtos } = await supabase
        .from("os_produtos_contratados")
        .select("produto_segmento(nome)")
        .eq("ordem_servico_id", solicitacao.ordem_servico_id);
      objeto = [
        ...new Set(
          (produtos ?? [])
            .map((p: any) => p.produto_segmento?.nome)
            .filter((n: string | undefined): n is string => Boolean(n))
        ),
      ];
    }

    // Sem OS o texto sai quebrado ("documentos necessários .") e no WhatsApp o
    // parâmetro vazio é recusado pela Meta (131008/132000). Barra ANTES de
    // reservar: assim não sobra linha `pendente` órfã para fechar depois.
    if (objeto.length === 0) {
      console.error(`[notificar] Solicitação ${solicitacao.id} sem produtos na OS: objeto vazio`);
      return json({ success: true, skipped: true, reason: "sem_os" });
    }

    // Total e quebra por tema. `grupo` é o enum osg_doc_grupo: pf | pj |
    // bens_imoveis | outros — a mesma ordem dos marcadores {{4}}..{{7}} do aviso 1.
    // No aviso 3 o total é a contagem de aceitos: no encerramento, o pedido
    // inteiro está conferido.
    const { data: itens } = await supabase
      .from("solicitacao_item")
      .select("grupo")
      .eq("solicitacao_id", solicitacao.id)
      .eq("status", "ativo");

    const porGrupo: Record<string, number> = { pf: 0, pj: 0, bens_imoveis: 0, outros: 0 };
    for (const item of itens ?? []) {
      const g = (item as { grupo: string }).grupo;
      if (g in porGrupo) porGrupo[g] += 1;
    }

    const solicitacaoData = {
      id: solicitacao.id,
      cliente_id: solicitacao.cliente_id,
      cliente_nome: cliente?.nome ?? "",
      objeto,
      total_documentos: itens?.length ?? 0,
      por_grupo: porGrupo,
      enviada_em: solicitacao.enviada_em,
      encerrada_em: solicitacao.encerrada_em,
      prazo: prazoDeEnvio(solicitacao.enviada_em),
      responsavel: solicitacao.created_by
        ? await getNameForUser(supabase, solicitacao.created_by)
        : "Equipe PSA",
      portal_url: `${PUBLISHED_URL}/cliente`,
    };

    // ── Um envio por canal, independentes ──
    //
    // Sequencial de propósito: são 2 chamadas e a ordem torna o log legível. O
    // resultado de cada canal entra na resposta, então "o WhatsApp não saiu" é uma
    // informação visível na chamada, e não algo que só aparece no banco depois.
    const resultado: Record<string, unknown> = {};
    let algumEnviado = false;

    for (const canal of CANAIS) {
      const webhookUrl = Deno.env.get(SEGREDO_WEBHOOK[canal]);
      if (!webhookUrl) {
        // Sem segredo é configuração faltando, não caminho normal: reporta em vez
        // de devolver silêncio. Não derruba o outro canal.
        console.error(`[notificar] ${SEGREDO_WEBHOOK[canal]} not configured: canal ${canal} não enviado`);
        resultado[canal] = { skipped: true, reason: "webhook_nao_configurado" };
        continue;
      }

      const doCanal = alcancaveis.filter((d) => destinoDoCanal(canal, d) !== null);
      if (doCanal.length === 0) {
        // Esperado, não erro: hoje 8 de 38 destinatários têm telefone. Não grava
        // linha nem consome retry.
        console.log(`[notificar] Canal ${canal}: nenhum destinatário alcançável`);
        resultado[canal] = { skipped: true, reason: "no_recipient" };
        continue;
      }

      // ── Reserva ANTES do envio ──
      // NULL do reservar_envio = a chave já existia, então este destinatário já
      // recebeu (ou está recebendo) este aviso hoje por este canal. Não é erro: é
      // o dedup funcionando.
      const reservados: Reservado[] = [];
      let erroReserva = false;
      for (const d of doCanal) {
        const destino = destinoDoCanal(canal, d)!;
        const { data: envioId, error: reservaError } = await supabase.rpc("reservar_envio", {
          _chave: chaveIdempotencia(event_type, solicitacao.id, canal, destino),
          _canal: canal,
          _tipo: event_type,
          _entidade_tipo: ENTIDADE_TIPO,
          _entidade_id: solicitacao.id,
          _email: d.email,
          _telefone: d.telefone,
          _papel: "cliente",
        });

        if (reservaError) {
          // Falha na reserva é falha de banco, e aqui ela IMPORTA: sem a linha não
          // há dedup nem rastro, então não envia por este canal. Diferente do log
          // pós-envio da ALE-1, que pode falhar sem consequência.
          console.error(`[notificar] reservar_envio failed (${canal}):`, reservaError);
          erroReserva = true;
          break;
        }
        if (!envioId) {
          console.log(`[notificar] Dedup: ${destino} já reservado hoje (${event_type}/${canal})`);
          continue;
        }
        reservados.push({ ...d, envio_id: envioId });
      }

      if (erroReserva) {
        resultado[canal] = { success: false, reason: "falha_ao_reservar" };
        continue;
      }
      if (reservados.length === 0) {
        resultado[canal] = { skipped: true, reason: "already_sent_today" };
        continue;
      }

      console.log(
        `[notificar] ${event_type}/${canal} · solicitação ${solicitacao.id} · ${reservados.length} destinatário(s)`
      );

      let ok = false;
      let erroEnvio: string | null = null;
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type,
            canal,
            solicitacao: solicitacaoData,
            // envio_id vai junto para o fluxo fechar a linha por conta própria,
            // com o identificador do provedor quando houver (o wamid).
            recipients: reservados.map((r) => ({
              email: r.email, nome: r.nome, telefone: r.telefone, envio_id: r.envio_id,
            })),
          }),
        });
        ok = response.ok;
        if (!ok) erroEnvio = `n8n respondeu ${response.status}`;
      } catch (err) {
        erroEnvio = err instanceof Error ? err.message : String(err);
      }

      // ── Se o POST não chegou, fecha como `falhou` ──
      //
      // No caminho de SUCESSO não escrevemos nada, de propósito: 200 do webhook
      // significa "o n8n aceitou", não "a mensagem saiu". Quem sabe o desfecho é o
      // n8n, e é ele que chama confirmar_envio pela notificacao-status.
      //
      // Um único dono por transição, e aqui isso é regra e não estilo: se a borda
      // marcasse `enviado`, a guarda "só avança" do confirmar_envio REJEITARIA o
      // `falhou` que o n8n manda quando o envio falha — e a linha ficaria afirmando
      // um envio que não houve.
      //
      // Até o n8n fechar, a linha fica `pendente`, que é exatamente o que ela é:
      // está na mão dele e o desfecho é desconhecido.
      if (!ok) {
        await Promise.all(
          reservados.map(async (r) => {
            const { error } = await supabase.rpc("confirmar_envio", {
              _id: r.envio_id,
              _status: "falhou",
              _erro: erroEnvio,
            });
            if (error) console.error(`[notificar] confirmar_envio failed (${canal}):`, error);
          })
        );
      }

      algumEnviado = algumEnviado || ok;
      resultado[canal] = ok
        ? { success: true, recipients: reservados.length }
        : { success: false, recipients: reservados.length, erro: erroEnvio };
    }

    return json({ success: algumEnviado, event_type, canais: resultado });
  } catch (error) {
    console.error("[notificar] Error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
