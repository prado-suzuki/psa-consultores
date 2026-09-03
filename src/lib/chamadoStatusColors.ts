import type { PrazoInfo } from '@/lib/equipeChamados';

/**
 * Cores de chamado nos papéis de status da área — espelha `taskStatusColors` e
 * `projetoStatusColors` (ver `docs/geral/paleta-por-area.md`).
 *
 * Por que centralizar: o mesmo status vivia em seis mapas diferentes (o lib da
 * equipe, o portal do cliente em duas telas, a gestão em duas e a tabela da
 * equipe), com cores que não batiam entre si — "Aberto" era azul sólido para o
 * cliente, `--info` na gestão e azul claro na equipe. Agora é um lugar só.
 *
 * E por que em papéis: a classe deixa de nomear a cor e passa a nomear a ideia,
 * então o mesmo componente pega a paleta da área que o hospeda. Chamado montado
 * dentro da Tax sai teal; dentro da OSG, musgo; no portal do cliente, a base.
 */
export interface ChamadoStatusConfig {
  key: string;
  label: string;
  /** Pílula clara: fundo suave + texto na cor cheia. */
  badge: string;
  /** Fundo na cor cheia com texto branco (badge de destaque). */
  solid: string;
  /** Ponto indicador. */
  dot: string;
  /** Cor cheia como TEXTO, sobre a superfície do tema — número de KPI, rótulo.
      Espelha o campo de mesmo nome em `taskStatusColors`. */
  text: string;
}

function papel(key: string, label: string, nome: string): ChamadoStatusConfig {
  return {
    key,
    label,
    badge: `bg-status-${nome}-soft text-status-${nome}`,
    solid: `bg-status-${nome} text-white hover:bg-status-${nome}/90`,
    dot: `bg-status-${nome}`,
    text: `text-status-${nome}`,
  };
}

/** Ciclo de vida do chamado. */
export const chamadoStatusColors: Record<string, ChamadoStatusConfig> = {
  aberto: papel('aberto', 'Aberto', 'fila'),
  em_andamento: papel('em_andamento', 'Em Andamento', 'andamento'),
  resolvido: papel('resolvido', 'Resolvido', 'feito'),
  fechado: papel('fechado', 'Fechado', 'neutro'),
};

/**
 * Prioridade. `normal` e `media` coexistem no banco (telas diferentes gravaram
 * rótulos diferentes ao longo do tempo), então as duas chaves apontam para o
 * mesmo papel em vez de uma delas cair no fallback.
 */
export const chamadoPrioridadeColors: Record<string, ChamadoStatusConfig> = {
  baixa: papel('baixa', 'Baixa', 'neutro'),
  normal: papel('normal', 'Normal', 'fila'),
  media: papel('media', 'Média', 'fila'),
  alta: papel('alta', 'Alta', 'alerta'),
  urgente: papel('urgente', 'Urgente', 'ajuste'),
};

/** Situação da conversa (quem deve o próximo movimento). */
export const chamadoAtividadeColors: Record<string, ChamadoStatusConfig> = {
  aguardando_resposta: papel('aguardando_resposta', 'Aguardando resposta', 'espera'),
  respondido: papel('respondido', 'Respondido', 'feito'),
  em_analise: papel('em_analise', 'Em análise', 'andamento'),
};

const FALLBACK: ChamadoStatusConfig = {
  key: '',
  label: 'Sem status',
  badge: 'bg-muted text-muted-foreground',
  solid: 'bg-muted-foreground text-white hover:bg-muted-foreground/90',
  dot: 'bg-muted-foreground',
  text: 'text-muted-foreground',
};

/** Configuração com fallback neutro — o valor no banco é texto livre. */
function configDe(mapa: Record<string, ChamadoStatusConfig>, valor: string | null | undefined): ChamadoStatusConfig {
  if (valor && mapa[valor]) return mapa[valor];
  return { ...FALLBACK, key: valor || '', label: valor || FALLBACK.label };
}

export const chamadoStatusConfig = (status: string | null | undefined) => configDe(chamadoStatusColors, status);
export const chamadoPrioridadeConfig = (prioridade: string | null | undefined) => configDe(chamadoPrioridadeColors, prioridade);
export const chamadoAtividadeConfig = (atividade: string | null | undefined) => configDe(chamadoAtividadeColors, atividade);

/**
 * Prazo de resposta, em escada de urgência: `fila` (tranquilo) → `alerta`
 * (chegando) → `ajuste` (estourou). O sólido é reservado ao que vence hoje ou já
 * venceu — pílula clara para o resto, senão a lista inteira grita.
 */
export function chamadoPrazoBadge(prazo: PrazoInfo): { className: string; texto: string } {
  if (prazo.tipo === 'concluido') return { className: 'bg-status-feito-soft text-status-feito hover:bg-status-feito-soft', texto: 'Concluído' };
  if (prazo.tipo === 'aguardando_cliente') return { className: 'bg-status-espera-soft text-status-espera hover:bg-status-espera-soft', texto: 'Aguardando Cliente' };
  if (prazo.tipo === 'expirado') return { className: 'bg-status-ajuste text-white animate-pulse hover:bg-status-ajuste', texto: `⚠️ ATRASADO ${Math.abs(prazo.dias || 0)}d` };
  if (prazo.prazoHoje) return { className: 'bg-status-ajuste text-white hover:bg-status-ajuste', texto: `HOJE (${prazo.horas}h)` };
  if (prazo.tipo === 'urgente') return { className: 'bg-status-alerta-soft text-status-alerta hover:bg-status-alerta-soft', texto: `Amanhã (${prazo.horas}h)` };
  if (prazo.tipo === 'atencao') return { className: 'bg-status-alerta-soft text-status-alerta hover:bg-status-alerta-soft', texto: `${prazo.dias} dias` };
  return { className: 'bg-status-fila-soft text-status-fila hover:bg-status-fila-soft', texto: `${prazo.dias} dias` };
}

/**
 * Opções de Select, na ordem do ciclo de vida.
 *
 * É lista escrita, e não `Object.keys`, por dois motivos: a ordem passa a ser a
 * do ciclo de vida em vez da de declaração por acidente, e `media` fica **de
 * fora** da prioridade — ela existe no mapa para ler o que já está gravado no
 * banco, e oferecê-la num seletor criaria registro novo com a chave duplicada.
 *
 * Cada item já é a config inteira, então o mesmo objeto serve para o rótulo e
 * para a cor. Quem precisa do subconjunto que o analista pode escolher filtra
 * por `equipePodeSelecionarStatus` (em `@/lib/chamadosStatus`).
 */
export const CHAMADO_STATUS_OPCOES: ChamadoStatusConfig[] =
  ['aberto', 'em_andamento', 'resolvido', 'fechado'].map((k) => chamadoStatusColors[k]);

export const CHAMADO_PRIORIDADE_OPCOES: ChamadoStatusConfig[] =
  ['baixa', 'normal', 'alta', 'urgente'].map((k) => chamadoPrioridadeColors[k]);

export const CHAMADO_ATIVIDADE_OPCOES: ChamadoStatusConfig[] =
  ['aguardando_resposta', 'respondido', 'em_analise'].map((k) => chamadoAtividadeColors[k]);
