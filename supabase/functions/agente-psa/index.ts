// ============================================================================
// agente-psa — o cérebro do assistente flutuante
// ============================================================================
//
// Uma função, cinco ações, um motivo: TODA escrita das tabelas `agente_*`
// acontece aqui, com service role. O navegador não escreve mensagem, insight
// nem lição — se escrevesse, o histórico de aprendizado seria adulterável e o
// "volume de insights gerados" do cockpit deixaria de ser medida de nada.
//
// O agente NÃO consulta o banco para responder: ele responde sobre o snapshot
// que a tela publica (`contexto`). Recalcular receita aqui daria um segundo
// número para a mesma pergunta — o pior defeito possível numa tela de decisão.
//
// Ações:
//   chat            — pergunta + snapshot da tela -> resposta + insights
//   feedback        — correção do usuário -> lição reinjetada nos prompts
//   avaliar_insight — insight útil / não útil
//   historico       — reabre a última conversa do usuário naquele escopo
//   cockpit         — números da aba Agente (Digital > Acessos), admin
//   salvar_config   — prompt, modelo, nível de acesso, ativo (admin)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { motivoDeBloqueio, rankDeRoles, type Sessao } from './acesso.ts';
import { chamarIA, ErroIA } from './ai.ts';
import {
  acaoMarcarNotificacao,
  acaoNotificacoes,
  escolherNotificavel,
  registrarNotificacao,
  tituloDaNotificacao,
} from './notificacoes.ts';
import { montarPromptUsuario, montarSystemPrompt, MAX_LICOES } from './prompt.ts';
import type {
  ConfigAgente,
  ContextoTela,
  LicaoAprendida,
  ModoAgente,
  TurnoAnterior,
} from './tipos.ts';

/** Turnos anteriores reenviados. A interação é o produto: sem isto o agente
 *  não entende "e por quê?" na segunda pergunta. */
const TURNOS_DE_HISTORICO = 8;
/** Teto da varredura do cockpit. Acima disso a aba avisa que truncou. */
const TETO_COCKPIT = 3000;

const MODOS: ModoAgente[] = ['dados', 'estrategia', 'aprender'];

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const cors = buildCorsHeaders(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Não autenticado.' }, 401, cors);
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimsErr || !claims?.claims?.sub) {
      return json({ error: 'Não autenticado.' }, 401, cors);
    }

    // Service role: as tabelas `agente_*` não têm policy de INSERT de propósito.
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const userId = claims.claims.sub as string;
    const { data: roleRows } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const roles = new Set<string>((roleRows ?? []).map((r: { role: string }) => r.role));
    const sessao: Sessao = {
      userId,
      roles,
      isAdmin: roles.has('admin'),
      rank: rankDeRoles(roles),
    };

    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao ?? '');

    switch (acao) {
      case 'chat': return await acaoChat(body, sessao, admin, cors);
      case 'feedback': return await acaoFeedback(body, sessao, admin, cors);
      case 'avaliar_insight': return await acaoAvaliarInsight(body, sessao, admin, cors);
      case 'historico': return await acaoHistorico(body, sessao, admin, cors);
      case 'notificacoes': return json(await acaoNotificacoes(sessao, admin), 200, cors);
      case 'marcar_notificacao': {
        const r = await acaoMarcarNotificacao(body, sessao, admin);
        return 'erro' in r ? json({ error: r.erro }, r.status, cors) : json(r, 200, cors);
      }
      case 'cockpit': return await acaoCockpit(body, sessao, admin, cors);
      case 'salvar_config': return await acaoSalvarConfig(body, sessao, admin, cors);
      default:
        return json({ error: `Ação desconhecida: "${acao}".` }, 400, cors);
    }
  } catch (e) {
    if (e instanceof ErroIA) {
      return json({ error: e.message }, e.status, cors);
    }
    console.error('agente-psa error:', e);
    return json(
      { error: e instanceof Error ? e.message : 'Erro inesperado no agente.' },
      500,
      cors,
    );
  }
});

// ── Config e permissão ──────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type Admin = any;

async function carregarConfig(admin: Admin, escopo: string): Promise<ConfigAgente | null> {
  const { data } = await admin
    .from('agente_config')
    .select('id, escopo, rotulo, ativo, modelo, temperatura, prompt_personalizado, nivel_acesso, max_insights_por_resposta')
    .eq('escopo', escopo)
    .maybeSingle();
  return (data as ConfigAgente | null) ?? null;
}

// ── chat ────────────────────────────────────────────────────────────────────

async function acaoChat(
  // deno-lint-ignore no-explicit-any
  body: any,
  sessao: Sessao,
  admin: Admin,
  cors: Record<string, string>,
): Promise<Response> {
  const escopo = String(body?.escopo ?? '');
  const pergunta = String(body?.pergunta ?? '').trim();
  const modo: ModoAgente = MODOS.includes(body?.modo) ? body.modo : 'estrategia';
  const contexto = body?.contexto as ContextoTela | undefined;

  if (!escopo) return json({ error: 'Escopo não informado.' }, 400, cors);
  if (!pergunta) return json({ error: 'Pergunta vazia.' }, 400, cors);
  if (!contexto?.blocos?.length) {
    return json(
      { error: 'A tela ainda não publicou os dados. Aguarde o carregamento e pergunte de novo.' },
      409,
      cors,
    );
  }

  const config = await carregarConfig(admin, escopo);
  if (!config) return json({ error: `Escopo "${escopo}" não está configurado.` }, 404, cors);

  const bloqueio = motivoDeBloqueio(config, sessao);
  if (bloqueio) return json({ error: bloqueio }, 403, cors);

  // ── Conversa: reaproveita a que veio ou abre uma nova ──────────────────
  let conversaId = typeof body?.conversaId === 'string' ? body.conversaId : null;
  if (conversaId) {
    const { data: dona } = await admin
      .from('agente_conversas')
      .select('id')
      .eq('id', conversaId)
      .eq('user_id', sessao.userId)
      .maybeSingle();
    // Conversa de outra pessoa (ou inexistente) não continua: abre uma nova.
    if (!dona) conversaId = null;
  }

  if (!conversaId) {
    const { data: nova, error } = await admin
      .from('agente_conversas')
      .insert({
        escopo,
        user_id: sessao.userId,
        titulo: pergunta.slice(0, 120),
        filtros: contexto.filtros ?? {},
      })
      .select('id')
      .single();
    if (error) throw error;
    conversaId = nova.id as string;
  }

  // ── Histórico da conversa + lições da casa ────────────────────────────
  const [{ data: anteriores }, { data: licoesRows }] = await Promise.all([
    admin
      .from('agente_mensagens')
      .select('papel, conteudo, criado_em')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: false })
      .limit(TURNOS_DE_HISTORICO),
    admin
      .from('agente_aprendizados')
      .select('licao, tipo, peso')
      .eq('escopo', escopo)
      .eq('ativo', true)
      .order('peso', { ascending: false })
      .order('criado_em', { ascending: false })
      .limit(MAX_LICOES),
  ]);

  const historico: TurnoAnterior[] = ((anteriores ?? []) as TurnoAnterior[])
    .slice()
    .reverse();
  const licoes = (licoesRows ?? []) as LicaoAprendida[];

  const systemPrompt = montarSystemPrompt(config, modo, licoes);
  const promptUsuario = montarPromptUsuario(contexto, pergunta);

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY não configurada.');

  const inicio = Date.now();
  const ia = await chamarIA({
    apiKey,
    modelo: config.modelo,
    temperatura: Number(config.temperatura),
    systemPrompt,
    historico,
    promptUsuario,
  });
  const latenciaMs = Date.now() - inicio;

  // ── Persistência: pergunta, resposta, insights ────────────────────────
  await admin.from('agente_mensagens').insert({
    conversa_id: conversaId,
    papel: 'user',
    conteudo: pergunta,
    modo,
  });

  const insights = ia.insights.slice(0, config.max_insights_por_resposta);

  const { data: msgAssistente, error: erroMsg } = await admin
    .from('agente_mensagens')
    .insert({
      conversa_id: conversaId,
      papel: 'assistant',
      conteudo: ia.resposta,
      campos_usados: ia.campos_usados,
      modo,
      metricas: {
        latencia_ms: latenciaMs,
        modelo: config.modelo,
        confianca: ia.confianca,
        licoes_aplicadas: licoes.length,
        blocos_no_contexto: contexto.blocos.length,
        avisos_na_tela: contexto.avisos?.length ?? 0,
      },
    })
    .select('id')
    .single();
  if (erroMsg) throw erroMsg;

  let insightsSalvos: { id: string; texto: string; categoria: string; severidade: string }[] = [];
  if (insights.length > 0) {
    const { data } = await admin
      .from('agente_insights')
      .insert(insights.map((i) => ({
        mensagem_id: msgAssistente.id,
        conversa_id: conversaId,
        escopo,
        texto: i.texto,
        categoria: i.categoria,
        severidade: i.severidade,
      })))
      .select('id, texto, categoria, severidade');
    insightsSalvos = data ?? [];
  }

  await admin
    .from('agente_conversas')
    .update({ atualizado_em: new Date().toISOString() })
    .eq('id', conversaId);

  return json({
    conversaId,
    mensagemId: msgAssistente.id,
    resposta: ia.resposta,
    camposUsados: ia.campos_usados,
    confianca: ia.confianca,
    insights: insightsSalvos,
    metricas: { latenciaMs, modelo: config.modelo, licoesAplicadas: licoes.length },
  }, 200, cors);
}

// ── feedback (é aqui que ele aprende) ───────────────────────────────────────

async function acaoFeedback(
  // deno-lint-ignore no-explicit-any
  body: any,
  sessao: Sessao,
  admin: Admin,
  cors: Record<string, string>,
): Promise<Response> {
  const mensagemId = String(body?.mensagemId ?? '');
  const correcao = String(body?.correcao ?? '').trim();
  const tipo = ['correcao', 'preferencia', 'glossario', 'regra'].includes(body?.tipo)
    ? body.tipo
    : 'correcao';

  if (!mensagemId) return json({ error: 'Mensagem não informada.' }, 400, cors);
  if (correcao.length < 4) {
    return json({ error: 'Escreva o que estava errado — é isso que ele guarda.' }, 400, cors);
  }

  // A mensagem tem que ser de uma conversa do próprio usuário: ninguém ensina
  // o agente em nome de outra pessoa.
  const { data: msg } = await admin
    .from('agente_mensagens')
    .select('id, conteudo, conversa_id, agente_conversas!inner(id, escopo, user_id)')
    .eq('id', mensagemId)
    .maybeSingle();

  if (!msg) return json({ error: 'Mensagem não encontrada.' }, 404, cors);
  const conversa = msg.agente_conversas as { escopo: string; user_id: string };
  if (conversa.user_id !== sessao.userId && !sessao.isAdmin) {
    return json({ error: 'Essa conversa não é sua.' }, 403, cors);
  }

  // A pergunta que gerou a resposta: o turno de usuário imediatamente anterior.
  const { data: perguntaRow } = await admin
    .from('agente_mensagens')
    .select('conteudo, criado_em')
    .eq('conversa_id', msg.conversa_id)
    .eq('papel', 'user')
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: licao, error } = await admin
    .from('agente_aprendizados')
    .insert({
      escopo: conversa.escopo,
      conversa_id: msg.conversa_id,
      mensagem_id: msg.id,
      tipo,
      pergunta: perguntaRow?.conteudo ?? null,
      resposta_original: msg.conteudo,
      correcao,
      // Nasce igual à correção, em texto do usuário. O admin refina na aba
      // Agente — reescrever com IA aqui inventaria regra que ninguém disse.
      licao: correcao,
      criado_por: sessao.userId,
    })
    .select('id, licao, escopo, criado_em')
    .single();
  if (error) throw error;

  return json({ aprendizado: licao }, 200, cors);
}

async function acaoAvaliarInsight(
  // deno-lint-ignore no-explicit-any
  body: any,
  sessao: Sessao,
  admin: Admin,
  cors: Record<string, string>,
): Promise<Response> {
  const insightId = String(body?.insightId ?? '');
  const util = body?.util;
  if (!insightId || typeof util !== 'boolean') {
    return json({ error: 'Insight ou avaliação não informados.' }, 400, cors);
  }

  const { data: insight } = await admin
    .from('agente_insights')
    .select('id, agente_conversas!inner(user_id)')
    .eq('id', insightId)
    .maybeSingle();
  if (!insight) return json({ error: 'Insight não encontrado.' }, 404, cors);
  const dono = (insight.agente_conversas as { user_id: string }).user_id;
  if (dono !== sessao.userId && !sessao.isAdmin) {
    return json({ error: 'Esse insight não é seu.' }, 403, cors);
  }

  await admin.from('agente_insights').update({ util }).eq('id', insightId);
  return json({ ok: true }, 200, cors);
}

// ── historico ───────────────────────────────────────────────────────────────

async function acaoHistorico(
  // deno-lint-ignore no-explicit-any
  body: any,
  sessao: Sessao,
  admin: Admin,
  cors: Record<string, string>,
): Promise<Response> {
  const escopo = String(body?.escopo ?? '');
  if (!escopo) return json({ error: 'Escopo não informado.' }, 400, cors);

  // Disponibilidade viaja JUNTO com o histórico, e não como chamada própria: o
  // painel precisa saber ao ABRIR se pode perguntar. Descobrir isso só no envio
  // faria o usuário escrever a pergunta para então ouvir que não tem acesso.
  const config = await carregarConfig(admin, escopo);
  const motivo = config
    ? motivoDeBloqueio(config, sessao)
    : 'Esta tela ainda não tem o agente configurado.';

  const { data: conversa } = await admin
    .from('agente_conversas')
    .select('id, titulo, criado_em, atualizado_em')
    .eq('escopo', escopo)
    .eq('user_id', sessao.userId)
    .eq('excluido', false)
    .order('atualizado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  const disponibilidade = {
    disponivel: !motivo,
    motivo: motivo ?? null,
    rotulo: config?.rotulo ?? null,
  };

  if (!conversa) {
    return json({ ...disponibilidade, conversa: null, mensagens: [], insights: [] }, 200, cors);
  }

  const [{ data: mensagens }, { data: insights }] = await Promise.all([
    admin
      .from('agente_mensagens')
      .select('id, papel, conteudo, campos_usados, metricas, modo, criado_em')
      .eq('conversa_id', conversa.id)
      .order('criado_em', { ascending: true })
      .limit(60),
    admin
      .from('agente_insights')
      .select('id, mensagem_id, texto, categoria, severidade, util')
      .eq('conversa_id', conversa.id),
  ]);

  return json({
    ...disponibilidade,
    conversa,
    mensagens: mensagens ?? [],
    insights: insights ?? [],
  }, 200, cors);
}

// ── cockpit (aba Agente, em Digital > Acessos) ──────────────────────────────

async function acaoCockpit(
  // deno-lint-ignore no-explicit-any
  body: any,
  sessao: Sessao,
  admin: Admin,
  cors: Record<string, string>,
): Promise<Response> {
  if (!sessao.isAdmin) return json({ error: 'Só administradores.' }, 403, cors);

  const dias = Number.isFinite(Number(body?.dias)) ? Math.min(365, Math.max(1, Number(body.dias))) : 30;
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

  const [configs, mensagens, insights, aprendizados, conversas] = await Promise.all([
    admin.from('agente_config').select('*').order('escopo'),
    admin
      .from('agente_mensagens')
      .select('id, papel, campos_usados, metricas, modo, criado_em, agente_conversas!inner(escopo, user_id)')
      .gte('criado_em', desde)
      .order('criado_em', { ascending: false })
      .limit(TETO_COCKPIT),
    admin
      .from('agente_insights')
      .select('id, escopo, categoria, severidade, util, criado_em')
      .gte('criado_em', desde)
      .order('criado_em', { ascending: false })
      .limit(TETO_COCKPIT),
    admin
      .from('agente_aprendizados')
      .select('id, escopo, tipo, pergunta, resposta_original, correcao, licao, peso, ativo, criado_em, criado_por')
      .order('criado_em', { ascending: false })
      .limit(200),
    admin
      .from('agente_conversas')
      .select('id, escopo, user_id, criado_em')
      .gte('criado_em', desde)
      .limit(TETO_COCKPIT),
  ]);

  // Agregação em JS: o volume da casa cabe no teto acima, e assim o cockpit
  // não depende de RPC nova em produção para existir.
  // deno-lint-ignore no-explicit-any
  const msgs = (mensagens.data ?? []) as any[];
  // deno-lint-ignore no-explicit-any
  const ins = (insights.data ?? []) as any[];
  // deno-lint-ignore no-explicit-any
  const convs = (conversas.data ?? []) as any[];

  const porEscopo = new Map<string, {
    escopo: string;
    perguntas: number;
    respostas: number;
    insights: number;
    conversas: number;
    usuarios: Set<string>;
    latenciaSoma: number;
    latenciaN: number;
    confiancaBaixa: number;
  }>();

  const bucket = (escopo: string) => {
    let b = porEscopo.get(escopo);
    if (!b) {
      b = {
        escopo, perguntas: 0, respostas: 0, insights: 0, conversas: 0,
        usuarios: new Set(), latenciaSoma: 0, latenciaN: 0, confiancaBaixa: 0,
      };
      porEscopo.set(escopo, b);
    }
    return b;
  };

  const camposUsados = new Map<string, number>();
  const porModo = new Map<string, number>();

  for (const m of msgs) {
    const escopo = m.agente_conversas?.escopo ?? 'desconhecido';
    const b = bucket(escopo);
    if (m.agente_conversas?.user_id) b.usuarios.add(m.agente_conversas.user_id);
    if (m.papel === 'user') {
      b.perguntas += 1;
      if (m.modo) porModo.set(m.modo, (porModo.get(m.modo) ?? 0) + 1);
      continue;
    }
    b.respostas += 1;
    const lat = Number(m.metricas?.latencia_ms);
    if (Number.isFinite(lat)) { b.latenciaSoma += lat; b.latenciaN += 1; }
    if (m.metricas?.confianca === 'baixa') b.confiancaBaixa += 1;
    for (const campo of (m.campos_usados ?? []) as string[]) {
      camposUsados.set(campo, (camposUsados.get(campo) ?? 0) + 1);
    }
  }

  for (const i of ins) bucket(i.escopo).insights += 1;
  for (const c of convs) bucket(c.escopo).conversas += 1;

  const metricas = [...porEscopo.values()].map((b) => ({
    escopo: b.escopo,
    perguntas: b.perguntas,
    respostas: b.respostas,
    insights: b.insights,
    conversas: b.conversas,
    usuarios: b.usuarios.size,
    latenciaMediaMs: b.latenciaN > 0 ? Math.round(b.latenciaSoma / b.latenciaN) : null,
    confiancaBaixa: b.confiancaBaixa,
  })).sort((a, b) => b.perguntas - a.perguntas);

  return json({
    dias,
    truncado: msgs.length >= TETO_COCKPIT || ins.length >= TETO_COCKPIT,
    configs: configs.data ?? [],
    metricas,
    camposMaisUsados: [...camposUsados.entries()]
      .map(([campo, vezes]) => ({ campo, vezes }))
      .sort((a, b) => b.vezes - a.vezes)
      .slice(0, 12),
    porModo: [...porModo.entries()].map(([modo, vezes]) => ({ modo, vezes })),
    insightsPorCategoria: Object.entries(
      ins.reduce((acc: Record<string, number>, i) => {
        acc[i.categoria] = (acc[i.categoria] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([categoria, vezes]) => ({ categoria, vezes: vezes as number })),
    insightsUteis: ins.filter((i) => i.util === true).length,
    insightsDescartados: ins.filter((i) => i.util === false).length,
    aprendizados: aprendizados.data ?? [],
  }, 200, cors);
}

// ── salvar_config ───────────────────────────────────────────────────────────

async function acaoSalvarConfig(
  // deno-lint-ignore no-explicit-any
  body: any,
  sessao: Sessao,
  admin: Admin,
  cors: Record<string, string>,
): Promise<Response> {
  if (!sessao.isAdmin) return json({ error: 'Só administradores.' }, 403, cors);

  const escopo = String(body?.escopo ?? '');
  if (!escopo) return json({ error: 'Escopo não informado.' }, 400, cors);

  // Lista branca: nada de repassar o body para o update. `escopo` não é
  // editável — é a chave que a tela usa para se achar.
  // deno-lint-ignore no-explicit-any
  const patch: Record<string, any> = { updated_by: sessao.userId };
  const p = body?.patch ?? {};

  if (typeof p.ativo === 'boolean') patch.ativo = p.ativo;
  if (typeof p.rotulo === 'string' && p.rotulo.trim()) patch.rotulo = p.rotulo.trim();
  if (typeof p.modelo === 'string' && p.modelo.trim()) patch.modelo = p.modelo.trim();
  if (typeof p.prompt_personalizado === 'string') {
    patch.prompt_personalizado = p.prompt_personalizado.trim() || null;
  }
  if (['admin', 'lider', 'sublider', 'team_member'].includes(p.nivel_acesso)) {
    patch.nivel_acesso = p.nivel_acesso;
  }
  if (Number.isFinite(Number(p.temperatura))) {
    patch.temperatura = Math.min(1, Math.max(0, Number(p.temperatura)));
  }
  if (Number.isFinite(Number(p.max_insights_por_resposta))) {
    patch.max_insights_por_resposta = Math.min(6, Math.max(0, Math.round(Number(p.max_insights_por_resposta))));
  }

  const { data, error } = await admin
    .from('agente_config')
    .update(patch)
    .eq('escopo', escopo)
    .select('*')
    .single();
  if (error) throw error;

  // Curadoria das lições: ativar/desativar e refinar o texto que volta no
  // prompt. Chega junto do config porque é a mesma tela e o mesmo dono.
  if (Array.isArray(body?.aprendizados)) {
    for (const a of body.aprendizados) {
      if (typeof a?.id !== 'string') continue;
      // deno-lint-ignore no-explicit-any
      const up: Record<string, any> = { revisado_por: sessao.userId, revisado_em: new Date().toISOString() };
      if (typeof a.ativo === 'boolean') up.ativo = a.ativo;
      if (typeof a.licao === 'string' && a.licao.trim()) up.licao = a.licao.trim();
      if (Number.isFinite(Number(a.peso))) up.peso = Math.min(5, Math.max(1, Math.round(Number(a.peso))));
      await admin.from('agente_aprendizados').update(up).eq('id', a.id);
    }
  }

  return json({ config: data }, 200, cors);
}
