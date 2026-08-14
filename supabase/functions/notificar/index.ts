import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";

// ── ALE-2 · Aviso ao cliente quando a solicitação de documentos é enviada ──
//
// Função de borda NOVA, e não uma extensão de `notify-ticket`. Aquela é moldada
// em chamado de ponta a ponta: lê `tickets`, monta rótulo de departamento, monta
// URL por papel, e o campo raiz do envio é `ticket_data`. O fluxo de automação em
// produção interpreta esse formato — reusar a mesma porta faria o e-mail sair com
// campos vazios.
//
// O molde ESTRUTURAL é `notify-ticket/index.ts`, na ordem dele: imports, constante
// de URL, validação de quem chamou, servidor com pré-voo de origem cruzada / não
// autorizado / validação de campos, leitura do endereço do fluxo com erro
// explícito, UM envio, e a captura final.
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
// Canal e-mail apenas, não sino. Conferido: `NotificationPopover` é montado em
// AdminLayout, DevLayout, EquipeLayout, FiscalLayout, OsgLayout e GestaoLayout —
// em NENHUM layout de cliente. Criar linha em `notificacao` para o cliente
// gravaria algo que ninguém vê.
//
// Esta função NÃO monta texto: resolve os valores e entrega ao fluxo, que
// renderiza. É o padrão do Agente de Notificação, onde o nó Gmail é genérico
// (`recipient_email` / `subject` / `final_html`) e o texto vive no Code node.
// Os textos são os de docs/geral/avisos-cliente.md (ALE-12).

const PUBLISHED_URL = "https://psa-consultores.lovable.app";

// Prazo de envio: 30 dias por regra, decidido em 11/08/2026 e registrado em
// docs/geral/avisos-cliente.md. Não há coluna de prazo, e o mesmo valor vale
// para todo cliente e produto.
const PRAZO_DIAS = 30;

const TIPO = "solicitacao_enviada";
const ENTIDADE_TIPO = "solicitacao";
const CANAL = "email";

interface NotificarRequest {
  event_type: "solicitacao_enviada";
  solicitacao_id: string;
}

// ── Auth ──
//
// Aceita `x-api-key` igual a DW_SYNC_TOKEN (chamada de servidor) OU Bearer
// validado por getClaims. No Bearer, `service_role` passa direto e usuário
// autenticado precisa ter `claims.sub`.
//
// NÃO endureça para só service_role: a chamada vem do navegador do analista, com
// o token do usuário logado, e seria rejeitada.
async function validateCaller(req: Request): Promise<{ authorized: boolean; error?: string }> {
  const apiKey = req.headers.get("x-api-key");
  const syncToken = Deno.env.get("DW_SYNC_TOKEN");
  if (apiKey && syncToken && apiKey === syncToken) {
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
// A data no fim deixa a cobrança diária repetir dia após dia e impede o mesmo
// aviso sair duas vezes no mesmo dia. Ver comentário da coluna no banco.
function chaveIdempotencia(entidadeId: string, destinatario: string): string {
  const dia = new Date().toISOString().slice(0, 10);
  return `${TIPO}:${ENTIDADE_TIPO}:${entidadeId}:${CANAL}:${destinatario}:${dia}`;
}

interface Destinatario {
  email: string;
  nome: string;
  telefone: string | null;
  envio_id: string;
}

// ── Main ──

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

    // Os avisos 2, 3 e 4 têm texto escrito em docs/geral/avisos-cliente.md mas
    // não têm disparo nesta sprint (ALE-12). Recusa explícita em vez de enviar
    // algo incompleto.
    if (event_type !== TIPO) {
      return json({ error: `event_type não atendido nesta versão: ${event_type}` }, 400);
    }

    // Segredo PRÓPRIO. O N8N_WEBHOOK_URL aponta para o fluxo de chamado, que
    // itera `recipients` esperando `ticket_data`.
    const webhookUrl = Deno.env.get("N8N_OSG_WEBHOOK_URL");
    if (!webhookUrl) {
      console.error("[notificar] N8N_OSG_WEBHOOK_URL not configured");
      return json({ error: "Webhook URL not configured" }, 500);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: solicitacao, error: solicitacaoError } = await supabase
      .from("solicitacao")
      .select("id, cliente_id, ordem_servico_id, status, enviada_em, created_by")
      .eq("id", solicitacao_id)
      .single();

    if (solicitacaoError || !solicitacao) {
      console.error("[notificar] Solicitação not found:", solicitacaoError);
      return json({ error: "Solicitação not found" }, 404);
    }

    // ── Destinatários ──
    //
    // `destinatarios_cliente` devolve uma linha por representante COM acesso ao
    // portal (`user_id` não nulo). Medido em 14/08/2026: e-mail preenchido em 38
    // de 38 desses. O buraco não é e-mail ausente — é cliente sem representante
    // com acesso, que existe.
    const { data: brutos, error: destinatariosError } = await supabase.rpc(
      "destinatarios_cliente",
      { _cliente_id: solicitacao.cliente_id }
    );
    if (destinatariosError) {
      console.error("[notificar] destinatarios_cliente failed:", destinatariosError);
      return json({ error: "Falha ao resolver destinatários" }, 500);
    }

    const alcancaveis: Array<{ email: string; nome: string; telefone: string | null }> = [];
    for (const d of brutos ?? []) {
      // Fallback pelo perfil quando o representante não tem e-mail próprio.
      const email = d.email?.trim() || (d.user_id ? await getEmailForUser(supabase, d.user_id) : null);
      if (!email) continue;
      alcancaveis.push({ email, nome: d.nome ?? "", telefone: d.telefone ?? null });
    }

    // Cliente sem destinatário alcançável: sucesso dizendo que ignorou, e NÃO
    // grava linha. É o critério de aceite da ALE-2, literal. A tela do analista
    // continua mostrando a solicitação como enviada — a transição já gravou
    // status e data antes desta chamada.
    if (alcancaveis.length === 0) {
      console.log(`[notificar] Skipped: nenhum destinatário alcançável para cliente ${solicitacao.cliente_id}`);
      return json({ success: true, skipped: true, reason: "no_recipient", recipients: 0 });
    }

    // ── Reserva ANTES do envio ──
    // NULL do reservar_envio = a chave já existia, então este destinatário já
    // recebeu (ou está recebendo) hoje. Não é erro: é o dedup funcionando.
    const recipients: Destinatario[] = [];
    for (const d of alcancaveis) {
      const { data: envioId, error: reservaError } = await supabase.rpc("reservar_envio", {
        _chave: chaveIdempotencia(solicitacao.id, d.email),
        _canal: CANAL,
        _tipo: TIPO,
        _entidade_tipo: ENTIDADE_TIPO,
        _entidade_id: solicitacao.id,
        _email: d.email,
        _telefone: d.telefone,
        _papel: "cliente",
      });

      if (reservaError) {
        // Falha na reserva é falha de banco, e aqui ela IMPORTA: sem a linha não
        // há dedup nem rastro, então não envia. Diferente do log pós-envio da
        // ALE-1, que pode falhar sem consequência.
        console.error("[notificar] reservar_envio failed:", reservaError);
        return json({ error: "Falha ao reservar o envio" }, 500);
      }
      if (!envioId) {
        console.log(`[notificar] Dedup: ${d.email} já reservado hoje para ${solicitacao.id}`);
        continue;
      }
      recipients.push({ ...d, envio_id: envioId });
    }

    if (recipients.length === 0) {
      return json({ success: true, skipped: true, reason: "already_sent_today", recipients: 0 });
    }

    // ── Dados do aviso ──

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

    if (objeto.length === 0) {
      // Sem OS o texto sai quebrado ("documentos necessários ."). Fecha as linhas
      // já reservadas como `ignorado` para não deixar `pendente` órfão.
      console.error(`[notificar] Solicitação ${solicitacao.id} sem produtos na OS: objeto vazio`);
      await Promise.all(
        recipients.map((r) =>
          supabase.rpc("confirmar_envio", {
            _id: r.envio_id,
            _status: "ignorado",
            _erro: "Solicitação sem produtos contratados na OS: objeto vazio",
          })
        )
      );
      return json({ success: true, skipped: true, reason: "sem_os", recipients: 0 });
    }

    // Total e quebra por tema. `grupo` é o enum osg_doc_grupo: pf | pj |
    // bens_imoveis | outros — a mesma ordem dos marcadores {{4}}..{{7}}.
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
      prazo: prazoDeEnvio(solicitacao.enviada_em),
      responsavel: solicitacao.created_by
        ? await getNameForUser(supabase, solicitacao.created_by)
        : "Equipe PSA",
      portal_url: `${PUBLISHED_URL}/cliente`,
    };

    console.log(
      `[notificar] Event: ${event_type}, Solicitação: ${solicitacao.id}, Recipients: ${recipients.map((r) => r.email).join(", ")}`
    );

    // ── Um único envio ──

    let ok = false;
    let erroEnvio: string | null = null;
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type,
          canal: CANAL,
          solicitacao: solicitacaoData,
          // envio_id vai junto para o fluxo poder confirmar por conta própria no
          // dia em que houver identificador de provedor (WhatsApp).
          recipients: recipients.map((r) => ({
            email: r.email, nome: r.nome, telefone: r.telefone, envio_id: r.envio_id,
          })),
        }),
      });
      ok = response.ok;
      if (!ok) erroEnvio = `n8n respondeu ${response.status}`;
    } catch (err) {
      erroEnvio = err instanceof Error ? err.message : String(err);
    }

    // ── Fecha as linhas reservadas ──
    // `enviado` significa "o n8n aceitou o POST", NÃO "o cliente recebeu".
    // Entrega real só existe no WhatsApp, e chega pelo webhook da Meta.
    await Promise.all(
      recipients.map(async (r) => {
        const { error } = await supabase.rpc("confirmar_envio", {
          _id: r.envio_id,
          _status: ok ? "enviado" : "falhou",
          _erro: erroEnvio,
        });
        if (error) console.error("[notificar] confirmar_envio failed:", error);
      })
    );

    return json({ success: ok, recipients: recipients.length });
  } catch (error) {
    console.error("[notificar] Error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
