/**
 * Status de entregável de sprint, nos papéis de status da área — espelha
 * `taskStatusColors`, `projetoStatusColors`, `chamadoStatusColors` e
 * `mapeamentoStatusColors` (ver `docs/geral/paleta-por-area.md`).
 *
 * Por que centralizar: as mesmas três chaves viviam em três arquivos com três
 * colorações. `pending` era `bg-slate-400` no calendário e `bg-amber-400` no
 * formulário; `in_progress` era `bg-amber-500` num e `bg-sky-500` no outro —
 * ou seja o âmbar significava coisas OPOSTAS nas duas telas, "não começou" numa
 * e "está andando" na outra.
 *
 * `pending` é `fila` e não `neutro` porque o entregável já entrou na sprint: ele
 * está na fila, não fora dela. O `SprintHoursDashboard` já dizia isso ao chamá-lo
 * de "A Fazer", que é o rótulo que o contrato dá ao papel `fila`.
 *
 * ⚠️ Este mapa NÃO carrega rótulo, e a falta é deliberada: `pending` aparece como
 * "Pendente" no calendário e como "A Fazer" no dashboard de horas. São duas
 * palavras diferentes na cara do usuário, e escolher uma é decisão de produto —
 * não cabe numa unificação de cor. Cada tela segue com o rótulo dela até alguém
 * decidir.
 */
export interface EntregavelStatusConfig {
  key: EntregavelStatus;
  /** Pílula clara: fundo suave + texto na cor cheia. */
  badge: string;
  /** Cor cheia como texto. */
  text: string;
  /** Ponto indicador, na cor cheia. */
  dot: string;
}

export type EntregavelStatus = 'pending' | 'in_progress' | 'completed';

function papel(key: EntregavelStatus, nome: string): EntregavelStatusConfig {
  return {
    key,
    badge: `bg-status-${nome}-soft text-status-${nome}`,
    text: `text-status-${nome}`,
    dot: `bg-status-${nome}`,
  };
}

export const entregavelStatusColors: Record<EntregavelStatus, EntregavelStatusConfig> = {
  pending: papel('pending', 'fila'),
  in_progress: papel('in_progress', 'andamento'),
  completed: papel('completed', 'feito'),
};

/** Configuração com fallback em `pending` — o valor no banco é texto livre. */
export function entregavelStatusConfig(status: string | null | undefined): EntregavelStatusConfig {
  if (status && status in entregavelStatusColors) {
    return entregavelStatusColors[status as EntregavelStatus];
  }
  return entregavelStatusColors.pending;
}
