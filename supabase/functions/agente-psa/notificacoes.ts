// ============================================================================
// Notificações — o pop-up de análise estratégica / insight crítico
// ============================================================================
//
// Uma resposta do agente gera NO MÁXIMO uma notificação. Se três insights
// altos saíssem em três notificações, a diretoria receberia três pop-ups
// empilhados sobre o mesmo assunto e desligaria o recurso na primeira semana.
//
// A notificação é endereçada ao ESCOPO, não a uma pessoa: quem recebe é quem
// tem o papel exigido pelo `agente_config` daquele escopo (ver `acesso.ts`).
// Quem gerou não recebe — acabou de ler a resposta na tela.

import { motivoDeBloqueio, type Sessao } from './acesso.ts';
import type { InsightGerado, ModoAgente } from './tipos.ts';

// deno-lint-ignore no-explicit-any
type Admin = any;

/** Janela de entrega. Insight de duas semanas atrás não é notícia. */
const DIAS_DE_JANELA = 7;
/** Teto por consulta: o pop-up mostra um por vez e não é caixa de entrada. */
const TETO = 20;

export interface NotificacaoNova {
  escopo: string;
  tipo: 'insight_critico' | 'analise_estrategica';
  titulo: string;
  texto: string;
  severidade: string;
  conversaId: string;
  mensagemId: string;
  insightId: string | null;
  origemUserId: string;
}

/**
 * Decide se a resposta virou notícia, e qual insight a sustenta.
 *
 * Função pura de propósito: é a regra que define o que interrompe a tela de um
 * sócio, e regra dessas tem que ser legível sem subir servidor nenhum.
 *
 * - Insight `severidade: alta` -> `insight_critico`, sempre.
 * - Modo estratégia com insight de `risco`/`oportunidade` -> `analise_estrategica`.
 * - Qualquer outra combinação -> nada. Observação, dado e execução em modo
 *   dados são leitura de tela, não notícia.
 */
export function escolherNotificavel(
  insights: (InsightGerado & { id?: string })[],
  modo: ModoAgente,
): { insight: InsightGerado & { id?: string }; tipo: NotificacaoNova['tipo'] } | null {
  const alto = insights.find((i) => i.severidade === 'alta');
  if (alto) return { insight: alto, tipo: 'insight_critico' };

  if (modo !== 'estrategia') return null;
  const estrategico = insights.find(
    (i) => i.categoria === 'risco' || i.categoria === 'oportunidade',
  );
  return estrategico ? { insight: estrategico, tipo: 'analise_estrategica' } : null;
}

/** Título curto do pop-up. O texto do insight é o corpo, não o título. */
export function tituloDaNotificacao(
  tipo: NotificacaoNova['tipo'],
  categoria: string,
): string {
  if (tipo === 'analise_estrategica') return 'Análise estratégica';
  return categoria === 'oportunidade' ? 'Oportunidade crítica' : 'Insight crítico';
}

export async function registrarNotificacao(
  admin: Admin,
  nova: NotificacaoNova,
): Promise<void> {
  // Falha aqui NÃO derruba a resposta do agente: a pergunta foi respondida e
  // persistida: perder o aviso é ruim, perder a resposta é pior.
  const { error } = await admin.from('agente_notificacoes').insert({
    escopo: nova.escopo,
    tipo: nova.tipo,
    titulo: nova.titulo,
    texto: nova.texto,
    severidade: nova.severidade,
    conversa_id: nova.conversaId,
    mensagem_id: nova.mensagemId,
    insight_id: nova.insightId,
    origem_user_id: nova.origemUserId,
  });
  if (error) console.error('agente-psa: notificação não registrada:', error.message);
}

/** Escopos que ESTA pessoa pode receber, com o rótulo para o pop-up. */
async function escoposPermitidos(
  admin: Admin,
  sessao: Sessao,
): Promise<Map<string, string>> {
  const { data } = await admin
    .from('agente_config')
    .select('escopo, rotulo, ativo, nivel_acesso');

  const permitidos = new Map<string, string>();
  for (const c of (data ?? []) as { escopo: string; rotulo: string; ativo: boolean; nivel_acesso: string }[]) {
    if (motivoDeBloqueio(c, sessao) === null) permitidos.set(c.escopo, c.rotulo);
  }
  return permitidos;
}

/**
 * O que ainda não foi visto por esta pessoa, nos escopos que ela pode ver.
 *
 * Ausência de linha em `agente_notificacoes_vistas` é o que faz o pop-up
 * aparecer — nunca um flag `lida` na própria notificação, que é do escopo e
 * não de uma pessoa.
 */
export async function acaoNotificacoes(
  sessao: Sessao,
  admin: Admin,
): Promise<{
  notificacoes: {
    id: string;
    escopo: string;
    escopoRotulo: string;
    tipo: string;
    titulo: string;
    texto: string;
    severidade: string;
    criadoEm: string;
  }[];
}> {
  const permitidos = await escoposPermitidos(admin, sessao);
  if (permitidos.size === 0) return { notificacoes: [] };

  const desde = new Date(Date.now() - DIAS_DE_JANELA * 86_400_000).toISOString();

  const { data: linhas } = await admin
    .from('agente_notificacoes')
    .select('id, escopo, tipo, titulo, texto, severidade, criado_em, origem_user_id')
    .in('escopo', [...permitidos.keys()])
    .gte('criado_em', desde)
    .order('criado_em', { ascending: false })
    .limit(TETO);

  // deno-lint-ignore no-explicit-any
  const candidatas = ((linhas ?? []) as any[]).filter(
    (n) => n.origem_user_id !== sessao.userId,
  );
  if (candidatas.length === 0) return { notificacoes: [] };

  const { data: vistas } = await admin
    .from('agente_notificacoes_vistas')
    .select('notificacao_id')
    .eq('user_id', sessao.userId)
    .in('notificacao_id', candidatas.map((n) => n.id));

  const jaVistas = new Set(
    ((vistas ?? []) as { notificacao_id: string }[]).map((v) => v.notificacao_id),
  );

  return {
    notificacoes: candidatas
      .filter((n) => !jaVistas.has(n.id))
      .map((n) => ({
        id: n.id,
        escopo: n.escopo,
        escopoRotulo: permitidos.get(n.escopo) ?? n.escopo,
        tipo: n.tipo,
        titulo: n.titulo,
        texto: n.texto,
        severidade: n.severidade,
        criadoEm: n.criado_em,
      })),
  };
}

/** Marca uma notificação como vista por esta pessoa (e só por ela). */
export async function acaoMarcarNotificacao(
  // deno-lint-ignore no-explicit-any
  body: any,
  sessao: Sessao,
  admin: Admin,
): Promise<{ ok: true } | { erro: string; status: number }> {
  const id = String(body?.notificacaoId ?? '');
  if (!id) return { erro: 'Notificação não informada.', status: 400 };

  const { error } = await admin
    .from('agente_notificacoes_vistas')
    .upsert(
      {
        notificacao_id: id,
        user_id: sessao.userId,
        dispensada: body?.dispensada === true,
      },
      { onConflict: 'notificacao_id,user_id' },
    );
  if (error) return { erro: error.message, status: 400 };
  return { ok: true };
}
