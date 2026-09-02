import type { Ambiente } from '@/config/api';
import { hrefDeOrigem, type AreaDeProjetos } from '@/lib/feedComentarios';
import type { Database } from '@/integrations/supabase/types';

/**
 * Regras puras da caixa de avisos internos: o que cada tipo diz, para onde o
 * clique leva e quais avisos pertencem a este ambiente.
 *
 * Ao contrário das outras três fontes do sino (`useTicketNotifications`,
 * `useReviewTaskNotifications`, `useNotificacoesMencao`), que são DERIVADAS —
 * o aviso existe enquanto o estado existe —, aqui existe tabela genérica de
 * notificação: `public.notificacao`, criada na EDU-1, gravada pelos triggers da
 * EDU-2, e "não lida" é `lido_em IS NULL`.
 *
 * Fora do React e fora do Supabase, porque é onde estão as decisões: o rótulo
 * por tipo, o destino do clique e o recorte de ambiente.
 */

/**
 * Tipo do aviso, DERIVADO do enum do banco em vez de reescrito à mão.
 *
 * O enunciado pedia a união dos sete valores digitada aqui. Derivar espelha o
 * mesmo enum e ainda torna o `Record` abaixo exaustivo: um oitavo valor no banco,
 * depois de regenerar `types.ts`, quebra a compilação e obriga quem acrescentou a
 * escrever o rótulo. União à mão não quebraria, e o rótulo sairia `undefined` na
 * tela sem erro nenhum — é o que está para acontecer com `OrgCommentKind`, em
 * `useDomainOrgComments.ts`, que ganhou `documentos_solicitados` no banco e
 * continua com seis valores no código.
 */
export type NotificacaoTipo = Database['public']['Enums']['notificacao_tipo'];

/** Linha de `public.notificacao` na fatia que o sino usa. */
export interface NotificacaoInterna {
  id: string;
  tipo: NotificacaoTipo;
  titulo: string;
  corpo: string | null;
  /** Tabela de origem: `org_task`, `cliente`, ... Decide o destino do clique. */
  entidade_tipo: string;
  entidade_id: string;
  /**
   * Nulo para todo aviso gravado pelos triggers da EDU-2, por decisão registrada
   * na migração: a rota é do front e depende de qual sino a pessoa está olhando.
   * A coluna fica para o aviso cujo destino não sai da entidade.
   */
  href: string | null;
  /** Quantas vezes o mesmo evento repetiu enquanto o aviso seguia não lido. */
  quantidade: number;
  /** Sobras do evento. Hoje carrega `ambiente` nos avisos de documento. */
  metadata: unknown;
  created_at: string;
}

/** Como cada tipo se apresenta na linha do sino. */
export interface ApresentacaoDoAviso {
  /** Etiqueta curta, na altura de "Revisão pendente" dos avisos derivados. */
  rotulo: string;
  /** Classe do círculo do ícone, reusando a paleta que o sino já usa. */
  tom: string;
}

const PRIMARIO = 'bg-primary/10 text-primary';
const ROXO ='bg-purple-100 text-purple-700';
const VERDE ='bg-emerald-100 text-emerald-700';
const VERMELHO = 'bg-destructive text-destructive-foreground';
const AMBAR = 'bg-amber-500 text-white';

/**
 * Rótulo e tom por tipo. `tarefa_em_revisao` reusa o roxo do
 * `ReviewNotificationItem` de propósito: é o mesmo assunto visto de outro lado,
 * e duas cores para a mesma coisa confundiriam quem olha o balão.
 *
 * Os 5 `chamado_*` (ALE-1) nunca deveriam aparecer aqui de fato: chamado só
 * grava em `notificacao_envio` (log de borda, via `registrar_envio()`), nunca
 * em `notificacao` (esta caixa, via `criar_notificacao()`) — chamado tem sino
 * próprio, derivado direto de `tickets` (`useTicketNotifications.ts`). Os 5
 * valores existem aqui só porque o enum do banco é compartilhado entre as duas
 * tabelas, e este `Record` continua exaustivo de propósito (não virou
 * `Partial`): a trava de compilação para tipo novo continua valendo para
 * qualquer valor que ainda vá ganhar gatilho de verdade. Rótulo idêntico ao
 * `PADRAO` abaixo — se um dia aparecer aqui por bug em outro lugar, o usuário
 * vê "Aviso" genérico, igual ao que já aconteceria pelo fallback.
 */
const APRESENTACAO: Record<NotificacaoTipo, ApresentacaoDoAviso> = {
  tarefa_atribuida: { rotulo: 'Tarefa atribuída', tom: PRIMARIO },
  tarefa_em_revisao: { rotulo: 'Revisão pendente', tom: ROXO },
  documento_recebido: { rotulo: 'Documento recebido', tom: PRIMARIO },
  solicitacao_enviada: { rotulo: 'Solicitação enviada', tom: PRIMARIO },
  // "Solicitacao finalizada" e nao "Documento aprovado": o rotulo antigo era o
  // nome TECNICO do tipo vazando para a tela. O gatilho deste aviso sempre foi o
  // encerramento da solicitacao, nunca uma aprovacao de documento. Patricia,
  // 27/08/2026.
  documento_aprovado: { rotulo: 'Solicitação finalizada', tom: VERDE },
  documento_recusado: { rotulo: 'Documento recusado', tom: VERMELHO },
  cobranca_pendencia: { rotulo: 'Pendência em cobrança', tom: AMBAR },
  // GES-04, mesmo caso dos `chamado_*`: aviso EXTERNO, que só grava em
  // `notificacao_envio` pela borda e nunca em `notificacao`. Está aqui porque o
  // enum é compartilhado, e com rótulo genérico porque não tem lugar no sino.
  solicitacao_vencida: { rotulo: 'Aviso', tom: PRIMARIO },
  chamado_criado: { rotulo: 'Aviso', tom: PRIMARIO },
  chamado_atribuido: { rotulo: 'Aviso', tom: PRIMARIO },
  chamado_respondido: { rotulo: 'Aviso', tom: PRIMARIO },
  chamado_vencido: { rotulo: 'Aviso', tom: PRIMARIO },
  chamado_resolvido: { rotulo: 'Aviso', tom: PRIMARIO },
  // GES-01A. Ambar para atenção e vermelho para estouro, seguindo o que o
  // arquivo já faz: o âmbar é o mesmo de "Pendência em cobrança", que também é
  // um lembrete antes do problema, e o vermelho é o de "Documento recusado",
  // que também é um fato consumado. Ao contrário dos `chamado_*` e do
  // `solicitacao_vencida`, estes dois RENDERIZAM aqui de verdade: nascem por
  // `criar_notificacao`, na varredura diária de prazo.
  // "Prazo de tarefa", e não "Prazo próximo": o mesmo tipo cobre os dois avisos
  // que vêm antes do vencimento — três dias antes e vence hoje. Patricia,
  // 02/09/2026, em docs/geral/avisos-prazo-tarefa.md.
  tarefa_prazo_proximo: { rotulo: 'Prazo de tarefa', tom: AMBAR },
  tarefa_atrasada: { rotulo: 'Tarefa atrasada', tom: VERMELHO },
};

const PADRAO: ApresentacaoDoAviso = { rotulo: 'Aviso', tom: PRIMARIO };

/**
 * O `Record` é exaustivo em tempo de compilação, mas o padrão existe para o
 * intervalo em que o banco já tem um valor novo e o `types.ts` ainda não foi
 * regenerado: melhor "Aviso" do que etiqueta vazia.
 */
export function apresentacaoDoAviso(tipo: NotificacaoTipo): ApresentacaoDoAviso {
  return APRESENTACAO[tipo] ?? PADRAO;
}

/**
 * Para onde o clique leva, ou `null` quando não há destino.
 *
 * O endereço é montado aqui, e não gravado no banco, porque depende de qual sino
 * a pessoa está olhando: a mesma tarefa abre em `/equipe/tax/...` pelo sino do
 * Tax e em `/equipe/osg/...` pelo da OSG, e `tarefasBase` chega ao
 * `NotificationPopover` como propriedade do layout. É o mesmo caminho que o aviso
 * derivado de revisão já usa.
 *
 * `href` gravado tem precedência, para o dia em que existir aviso cujo destino
 * não saia da entidade. Aviso de `cliente` (documento recebido) não tem tela de
 * destino hoje e devolve `null`.
 */
export function destinoDoAviso(
  aviso: Pick<NotificacaoInterna, 'href' | 'entidade_tipo' | 'entidade_id'>,
  tarefasBase: string,
  area: AreaDeProjetos,
): string | null {
  if (aviso.href) return aviso.href;
  if (aviso.entidade_tipo === 'org_task') return `${tarefasBase}?taskId=${aviso.entidade_id}`;
  // Aviso de projeto (GES-03): reusa o endereço que o feed já monta, em vez de
  // montar um segundo formato que sairia de sincronia no primeiro renome de rota.
  if (aviso.entidade_tipo === 'org_project') {
    return hrefDeOrigem({ entity_type: 'org_project', entity_id: aviso.entidade_id }, area);
  }
  return null;
}

/**
 * Texto da repetição, ou `null` quando o evento aconteceu uma vez só.
 *
 * Sem isto o agrupamento fica invisível: 63 documentos do mesmo cliente no mesmo
 * dia são uma linha com `quantidade = 63`, e a pessoa leria "Documento recebido"
 * sem saber que foram 63.
 */
export function textoDaRepeticao(quantidade: number): string | null {
  if (quantidade <= 1) return null;
  return `${quantidade} movimentações`;
}

/**
 * Ambiente gravado nos metadados do aviso, ou `null` quando o aviso não carrega
 * ambiente nenhum.
 */
function ambienteDoAviso(metadata: unknown): Ambiente | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const valor = (metadata as Record<string, unknown>).ambiente;
  return valor === 'prod' || valor === 'dev' ? valor : null;
}

/**
 * Descarta os avisos de outro ambiente.
 *
 * `public.notificacao` não tem coluna `ambiente` de propósito: o destinatário é
 * um `profile`, e `profiles` não é multi-ambiente. Quem carrega ambiente é o
 * evento — o gatilho de documento recebido grava `{"ambiente": "..."}` nos
 * metadados justamente para o sino não misturar dev e prod.
 *
 * O filtro é aqui e não no `select` porque só parte dos avisos carrega ambiente:
 * os de tarefa não carregam, e um `.eq('metadata->>ambiente', ...)` no PostgREST
 * descartaria todos eles junto. Aviso sem ambiente vale para os dois.
 */
export function avisosDoAmbiente<T extends { metadata: unknown }>(
  avisos: T[],
  ambiente: Ambiente,
): T[] {
  return avisos.filter((aviso) => {
    const doAviso = ambienteDoAviso(aviso.metadata);
    return doAviso === null || doAviso === ambiente;
  });
}
