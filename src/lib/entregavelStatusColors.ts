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
 * O rótulo mora aqui junto com a cor, e a escolha de `pending` = "A Fazer" foi
 * tomada olhando o produto inteiro: onze telas decidiam essa palavra sozinhas,
 * seis dizendo "A Fazer" e cinco "Pendente". O desempate não foi a contagem, foi
 * a precisão — "A Fazer" só significa o papel `fila` em todo o sistema, e é a
 * palavra que o próprio contrato usa (`taskStatusColors`, papel `fila`).
 * "Pendente" já significa outras nove coisas: documento não enviado, ROI
 * incompleto, item de DIFAL não validado, "Pendente de Análise" do PER/DCOMP, e
 * — o pior — "Pendente Cliente", que é o papel `espera`, não o `fila`.
 *
 * ⚠️ `waiting_client` ("Pendente Cliente", papel `espera`) NÃO entrou nessa
 * troca e não deve entrar: é outro status, de outro domínio, e continua com a
 * palavra dele.
 */
export interface EntregavelStatusConfig {
  key: EntregavelStatus;
  /** O que o usuário lê. Uma palavra por status, no produto inteiro. */
  label: string;
  /** Pílula clara: fundo suave + texto na cor cheia. */
  badge: string;
  /** Cor cheia como texto. */
  text: string;
  /** Ponto indicador, na cor cheia. */
  dot: string;
}

export type EntregavelStatus = 'pending' | 'in_progress' | 'completed';

function papel(key: EntregavelStatus, label: string, nome: string): EntregavelStatusConfig {
  return {
    key,
    label,
    badge: `bg-status-${nome}-soft text-status-${nome}`,
    text: `text-status-${nome}`,
    dot: `bg-status-${nome}`,
  };
}

export const entregavelStatusColors: Record<EntregavelStatus, EntregavelStatusConfig> = {
  pending: papel('pending', 'A Fazer', 'fila'),
  in_progress: papel('in_progress', 'Em Progresso', 'andamento'),
  completed: papel('completed', 'Concluído', 'feito'),
};

/** Configuração com fallback em `pending` — o valor no banco é texto livre. */
export function entregavelStatusConfig(status: string | null | undefined): EntregavelStatusConfig {
  if (status && status in entregavelStatusColors) {
    return entregavelStatusColors[status as EntregavelStatus];
  }
  return entregavelStatusColors.pending;
}
