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

/**
 * De qual projeto Supabase esta função está falando.
 *
 * Vai no corpo enviado ao n8n, e é o que faz a CONFIRMAÇÃO voltar para o banco de
 * onde a reserva saiu. O nó `Resolver Status` tem o mapa dos dois projetos e usa
 * produção como padrão quando o campo não vem — então, sem isto, um aviso disparado
 * em desenvolvimento tenta fechar linha em PRODUÇÃO. Medido em 24/08/2026: o n8n já
 * esperava o campo (tem o mapa e um log de "ambiente_ref ausente, assumindo
 * produção"), mas nenhuma versão da borda o mandava.
 *
 * Sai da própria `SUPABASE_URL` em vez de um segredo novo, então cada deploy se
 * identifica sozinho e não há o que configurar ao publicar.
 */
const AMBIENTE_REF =
  (Deno.env.get("SUPABASE_URL") ?? "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? "";

type Canal = "email" | "whatsapp";

const CANAIS: Canal[] = ["email", "whatsapp"];

// Um segredo por canal. NÃO reusar o `N8N_WEBHOOK_URL`, que aponta para o fluxo
// de chamado e itera `recipients` esperando `ticket_data`.
const SEGREDO_WEBHOOK: Record<Canal, string> = {
  email: "N8N_OSG_WEBHOOK_URL",
  whatsapp: "N8N_OSG_WA_WEBHOOK_URL",
};

// ── Os TRÊS avisos ao cliente ──
//
// Eram quatro. DECISÃO DE 17/08/2026 (Bernardo e coordenação): os avisos 2
// (cobrança de pendente) e 4 (reenvio necessário) foram FUNDIDOS num só.
//
// O motivo é o fluxo real: o analista abre o checklist, confere o que chegou,
// vincula as entidades e recusa o que está errado — tudo na mesma sessão. Dois
// avisos separados sairiam do mesmo ato, um atrás do outro. E o texto do aviso 4
// já pedia "um aviso por lote de conferência, não por documento" (10/08) sem
// definir o que fecha um lote: o clique do analista fecha.
//
//   1 solicitacao_enviada    AUTOMÁTICO, no envio da solicitação
//   2 situacao_documentos    MANUAL, botão na tela do checklist       <- novo
//   3 documento_aprovado     AUTOMÁTICO, no encerramento
//
// POR QUE O MANUAL RECEBE OS DADOS DE QUEM CHAMA, e não os resolve aqui: a tela
// do consultor deriva o checklist no navegador (`checklistDerivado.ts`), e é essa
// conta que o analista está OLHANDO quando clica. Recalcular aqui — por RPC ou
// reescrevendo a subtração em SQL — abriria a porta para a mensagem divergir da
// tela, e o cliente ser cobrado por documento que o analista viu como recebido.
// Uma conta, uma fonte. É o mesmo princípio do `estadoDocumento.ts`.
//
// A contrapartida é que o corpo passa a ser dado de entrada, e por isso este
// evento exige PAPEL DE EQUIPE (ver `validateCaller`) — os outros dois nascem de
// transição do banco e não aceitam lista de fora.
const EVENTOS_COM_DISPARO = new Set([
  "solicitacao_enviada",
  "situacao_documentos",
  "documento_aprovado",
  // GES-04. É o primeiro aviso que não nasce de ação humana nem de transição do
  // banco: nasce de um relógio (pg_cron). Por isso as pré-condições dele são as
  // mais duras do arquivo — ver o bloco `solicitacao_vencida` no handler.
  "solicitacao_vencida",
]);

// Nomes antigos, dos tempos em que eram quatro avisos. Recusados com mensagem
// própria para quem chamar com o nome velho saber para onde foi.
const EVENTOS_FUNDIDOS = new Set(["cobranca_pendencia", "documento_recusado"]);

/**
 * `notificacao_tipo` é um enum do banco, e `situacao_documentos` NÃO está nele.
 *
 * Reusamos `cobranca_pendencia` como valor gravado, de propósito: acrescentar
 * valor a enum é migração, e migração aqui custa crédito do Lovable sem entregar
 * nada além do nome. O mapa deixa o nome da API honesto (o aviso não é só
 * cobrança) sem tocar no banco.
 *
 * É o mesmo desacoplamento que o mapa `TEMPLATE` do n8n faz entre valor de enum e
 * nome de modelo na Meta, e pelo mesmo motivo: nome é caro de mudar em um lado só.
 */
const TIPO_NO_BANCO: Record<string, string> = {
  situacao_documentos: "cobranca_pendencia",
  // `solicitacao_vencida` NÃO entra aqui de propósito: o valor de enum tem o mesmo
  // nome, e o `?? event_type` resolve. Aqui a migração se pagou, ao contrário do
  // aviso 2 — sem valor próprio, este aviso dividiria chave de idempotência com o
  // `cobranca_pendencia` do aviso 2 e um dos dois desapareceria sem erro.
};

/** Um documento que o cliente precisa resolver, como a tela do consultor o vê. */
interface ItemAviso {
  documento: string;
  entidade: string;
  motivo?: string;
}

interface NotificarRequest {
  event_type: string;
  solicitacao_id: string;
  /**
   * Quais canais usar. Ausente = os dois, que e o comportamento dos avisos
   * AUTOMATICOS: eles nascem de transicao e nao tem quem escolha.
   *
   * So o aviso manual manda esse campo, porque so ele tem um analista decidindo.
   * O padrao ser "os dois" e deliberado: canal esquecido e cliente nao avisado, e o
   * erro por omissao tem de ser mandar mais e nao menos.
   */
  canais?: Canal[];
  /** Só em `situacao_documentos`: o que a tela derivou no momento do clique. */
  situacao?: {
    pendentes: ItemAviso[];
    recusados: ItemAviso[];
    base: number;
    recebidos: number;
  };
}

// ── Auth ──
//
// Aceita `x-api-key` igual a N8N_CALLBACK_TOKEN (chamada de servidor) OU Bearer
// validado por getClaims. No Bearer, `service_role` passa direto e usuário
// autenticado precisa ter `claims.sub`.
//
// NÃO endureça para só service_role: a chamada vem do navegador do analista, com
// o token do usuário logado, e seria rejeitada.
/**
 * Papéis que podem disparar aviso cujo CONTEÚDO vem de fora.
 *
 * `client` e `timecliente` ficam de fora e a razão é concreta: um cliente logado
 * chamaria `situacao_documentos` com uma lista inventada e a mensagem sairia com
 * o texto dele. Nos outros dois avisos isso não se aplica — eles nascem de
 * transição gravada no banco e não aceitam lista.
 */
const PAPEIS_DE_EQUIPE = new Set(["admin", "team_member", "lider", "sublider", "marketing"]);

interface Caller {
  authorized: boolean;
  error?: string;
  /** Verdadeiro para service role e para papel de equipe. */
  equipe?: boolean;
  userId?: string;
}

async function validateCaller(req: Request): Promise<Caller> {
  const apiKey = req.headers.get("x-api-key");
  const callbackToken = Deno.env.get("N8N_CALLBACK_TOKEN");
  if (apiKey && callbackToken && apiKey === callbackToken) {
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
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return { authorized: false, error: "Invalid token" };
  if (data.claims.role === "service_role") return { authorized: true, equipe: true };

  const userId = data.claims.sub as string | undefined;
  if (!userId) return { authorized: false, error: "No user ID in token" };

  // O papel é lido com a chave de serviço, e não com o token do usuário: a
  // política de `user_roles` não é assunto desta checagem, e ler com o próprio
  // token faria a autorização depender de RLS que pode mudar por outro motivo.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: papeis } = await admin
    .from("user_roles").select("role").eq("user_id", userId);

  const equipe = (papeis ?? []).some((p: { role: string }) => PAPEIS_DE_EQUIPE.has(p.role));
  return { authorized: true, equipe, userId };
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

/**
 * O "dia" da janela de não-repetição, no fuso da casa.
 *
 * ERA UTC, e virou local em 17/08/2026 quando o aviso 2 passou a ser disparado à
 * mão. A ALE-1 escolheu UTC para a varredura diária de chamados, e ali é
 * inofensivo: aquele cron roda 11h UTC, que é 7h da manhã em Cuiabá — bem longe
 * da virada.
 *
 * Com botão manual a virada cai DENTRO do expediente. O número da casa é +55 65
 * (Mato Grosso, UTC−4, sem horário de verão desde 2019), então o dia UTC vira às
 * 20h locais:
 *
 *   analista envia 19h50  -> dia X
 *   outro envia   20h10  -> dia X+1, PASSA, e o cliente recebe duas vezes
 *
 * É exatamente o que a janela existe para evitar. Com o dia local, "já avisado
 * hoje, tente amanhã" também passa a ser verdade — em UTC a frase mentia às 20h.
 *
 * `en-CA` porque devolve AAAA-MM-DD, que é o formato que a chave usa.
 */
const FUSO_DA_CASA = "America/Cuiaba";

function diaLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: FUSO_DA_CASA });
}

// tipo:entidade_tipo:entidade_id:canal:destinatario:AAAA-MM-DD
//
// A data no fim impede o mesmo aviso sair duas vezes no mesmo dia — regra da
// ALE-1, mantida por decisão do Bernardo em 17/08: evita que dois analistas
// avisem o mesmo cliente e que o número caia por sinal de spam, que é o que
// derruba a nota de qualidade e leva modelo a `FLAGGED` e depois `PAUSED`.
//
// O canal no meio é o que permite o mesmo aviso sair por e-mail E por WhatsApp
// para a mesma pessoa no mesmo dia, sem uma reserva bloquear a outra.
function chaveIdempotencia(tipo: string, entidadeId: string, canal: Canal, destino: string): string {
  return `${tipo}:${ENTIDADE_TIPO}:${entidadeId}:${canal}:${destino}:${diaLocal()}`;
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

    const { event_type, solicitacao_id, situacao, canais } = (await req.json()) as NotificarRequest;
    if (!event_type || !solicitacao_id) {
      return json({ error: "event_type and solicitacao_id are required" }, 400);
    }

    if (!EVENTOS_COM_DISPARO.has(event_type)) {
      const motivo = EVENTOS_FUNDIDOS.has(event_type)
        ? "foi fundido em situacao_documentos na decisão de 17/08/2026"
        : "desconhecido";
      return json({ error: `event_type ${motivo}: ${event_type}` }, 400);
    }

    // O aviso manual carrega conteúdo de fora, então exige papel de equipe. Os
    // automáticos não: eles nascem de transição gravada e não aceitam lista.
    if (event_type === "situacao_documentos") {
      if (!authResult.equipe) {
        console.error(`[notificar] ${authResult.userId} sem papel de equipe tentou situacao_documentos`);
        return json({ error: "Apenas a equipe pode enviar este aviso" }, 403);
      }
      if (!situacao || (!situacao.pendentes?.length && !situacao.recusados?.length)) {
        // Sem nada para o cliente resolver não há aviso: "faltam 0 documentos"
        // pediria ação inexistente, e quem cobre o pedido completo é o aviso 3.
        return json({ error: "situacao com pendentes ou recusados é obrigatória" }, 400);
      }
    }

    // Canal desconhecido no pedido e recusado em vez de ignorado: ignorar faria a
    // tela achar que mandou por um canal que a borda nunca percorreu.
    if (canais) {
      const invalido = canais.find((c) => !CANAIS.includes(c));
      if (invalido) return json({ error: `canal desconhecido: ${invalido}` }, 400);
      if (canais.length === 0) return json({ error: "canais nao pode ser lista vazia" }, 400);
    }
    const canaisDoEnvio: Canal[] = canais?.length ? CANAIS.filter((c) => canais.includes(c)) : CANAIS;

    const tipoNoBanco = TIPO_NO_BANCO[event_type] ?? event_type;

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
    // que é o ato do consultor declarando o pedido concluído.
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

    // O aviso 2 cobra documento. Cobrar quem nunca foi solicitado é pedir o que
    // não se pediu — o rascunho é a lista sendo montada, e o cliente não a viu.
    // A tela deixa o botão fora do rascunho; aqui é a segunda linha de defesa,
    // porque a borda pode ser chamada de fora dela.
    if (event_type === "situacao_documentos" && !solicitacao.enviada_em) {
      console.log(`[notificar] Skipped: solicitação ${solicitacao.id} nunca foi enviada ao cliente`);
      return json({ success: true, skipped: true, reason: "nunca_enviada" });
    }

    // ── O aviso 4 afirma um NEGATIVO, e é o único que faz isso ──
    //
    // "não consta o recebimento de nenhum documento". Os outros três nascem de um
    // clique ou de uma transição, e quem dispara está olhando a tela. Este nasce de
    // um relógio: a borda é o único lugar onde a afirmação do texto pode ser
    // conferida contra o banco antes de sair. Cada guarda abaixo evita uma mensagem
    // FALSA, não um envio a mais.
    if (event_type === "solicitacao_vencida") {
      if (!solicitacao.enviada_em) {
        console.log(`[notificar] Skipped: solicitação ${solicitacao.id} nunca foi enviada ao cliente`);
        return json({ success: true, skipped: true, reason: "nunca_enviada" });
      }
      if (solicitacao.encerrada_em) {
        console.log(`[notificar] Skipped: solicitação ${solicitacao.id} já encerrada`);
        return json({ success: true, skipped: true, reason: "encerrada" });
      }

      // O primeiro disparo é no dia SEGUINTE ao vencimento: `prazo < hoje`, não `<=`.
      //
      // Nota sobre o dia: `prazoDeEnvio` soma 30 dias em UTC e `diaLocal` lê o dia em
      // Cuiabá. Para solicitação enviada depois das 20h locais o prazo sai um dia à
      // frente. É comportamento ANTIGO, compartilhado com a data que os outros três
      // avisos imprimem no texto — corrigir aqui só faria a guarda discordar da data
      // que o cliente lê. Fica registrado, não é defeito introduzido aqui.
      const prazo = prazoDeEnvio(solicitacao.enviada_em);
      if (!prazo || prazo >= diaLocal()) {
        console.log(`[notificar] Skipped: solicitação ${solicitacao.id} com prazo em curso (${prazo})`);
        return json({ success: true, skipped: true, reason: "prazo_em_curso" });
      }

      // Nada recebido — a condição que dá nome ao aviso.
      //
      // `fonte = 'cliente'` e NÃO `solicitacao_id`: o vínculo com a solicitação só é
      // gravado pelo upload do próprio cliente dentro do portal
      // (`ColetaDocumentosCliente.tsx`). Documento que o cliente mandou por e-mail e
      // o analista anexou pelo lado da OSG entra sem vínculo — e cobrar quem enviou é
      // o pior erro possível neste aviso.
      //
      // `documento_gerado_id is null` blinda contra a fatia 2 do plano de storage
      // (`docs/planos/plano-osg-documentos-recebidos.md`), que vai fazer documento
      // GERADO pela casa cair nesta mesma tabela. O default da coluna `fonte` no
      // banco é `'cliente'`, então sem esta guarda um documento que a PSA produziu
      // silenciaria a cobrança — e mensagem que não sai ninguém percebe.
      const { count: recebidos, error: erroRecebidos } = await supabase
        .from("documento_arquivo")
        .select("id", { count: "exact", head: true })
        .eq("cliente_id", solicitacao.cliente_id)
        .eq("fonte", "cliente")
        .eq("excluido", false)
        .is("documento_gerado_id", null)
        .gte("created_at", solicitacao.enviada_em);

      // Erro aqui NÃO cai para zero. Contagem que falhou é "não sei", e afirmar
      // "nada chegou" sem saber é a mensagem falsa que estas guardas existem para
      // impedir. Falha alto e o relógio tenta amanhã.
      if (erroRecebidos) {
        console.error("[notificar] Falha ao contar documentos recebidos:", erroRecebidos);
        return json({ error: "não foi possível verificar os documentos recebidos" }, 500);
      }
      if ((recebidos ?? 0) > 0) {
        console.log(`[notificar] Skipped: solicitação ${solicitacao.id} já recebeu ${recebidos} documento(s)`);
        return json({ success: true, skipped: true, reason: "ja_recebeu_documento" });
      }

      // A RÉGUA DE 30 EM 30 DIAS NÃO MORA AQUI, E É DE PROPÓSITO.
      //
      // A divisão: a borda guarda a VERDADE, o agendador guarda a FREQUÊNCIA. As
      // quatro guardas acima impedem uma mensagem FALSA, e por isso ficam mesmo com
      // um chamador só — a solicitação pode mudar de estado entre a consulta do job
      // e esta chamada, e aí o cliente que acabou de enviar receberia "não consta o
      // recebimento de nenhum documento".
      //
      // Quantas vezes uma mensagem VERDADEIRA pode sair é outra coisa, e mora na
      // `solicitacoes_a_cobrar`, que filtra quem já foi cobrado no ciclo corrente
      // lendo `notificacao_envio.created_at`.
      //
      // Havia uma cópia dessa regra aqui, e ela saiu em 24/08/2026 por dois motivos.
      // Primeiro: este aviso não tem chamador humano — sem botão, sem tela, o job é
      // o único caminho. (O aviso 2 tem botão, e é por isso que lá a segunda linha
      // de defesa se justifica.) Segundo: as duas cópias usavam noções diferentes de
      // "agora" — `current_date` do Postgres aqui, `Date.now()` do Deno lá —, e perto
      // da virada de um ciclo elas discordariam em um dia.
      //
      // O que traria a regra de volta: um botão de "cobrar agora" na tela. Aí passa a
      // existir chamador fora do job, e a frequência precisa ser reforçada aqui.
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

    // Percorre so os canais pedidos. `CANAIS.filter` acima preserva a ordem
    // canonica (e-mail primeiro), para o log sair legivel independente da ordem em
    // que a tela mandou.
    for (const canal of canaisDoEnvio) {
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
          _chave: chaveIdempotencia(tipoNoBanco, solicitacao.id, canal, destino),
          _canal: canal,
          _tipo: tipoNoBanco,
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
            // De onde este disparo saiu. Sem ele o n8n confirma em produção — ver
            // AMBIENTE_REF.
            ambiente_ref: AMBIENTE_REF,
            solicitacao: solicitacaoData,
            // Presente so no aviso 2. Vai como veio da tela: e a mesma conta que
            // o analista estava olhando quando clicou.
            ...(situacao ? { situacao } : {}),
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
