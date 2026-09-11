import type { OrgTaskPriority } from '@/hooks/useOrgTasks';

/**
 * Prioridade da tarefa: UM mapa, quatro degraus, uma escada.
 *
 * ## O que estava errado antes de 11/09/2026
 *
 * O mesmo campo era pintado por quatro mapas — este e três cópias locais em
 * `TaskCard`, `TaskTable` e `TaskTodayView` —, e o rótulo por cinco, contando o
 * `subtaskPriorityLabels` de `orgSubtasks.ts`. Nenhuma delas tinha cor crua: o
 * defeito era INCOERÊNCIA, que é o que mapa de domínio existe para matar.
 *
 * As três divergências medidas, e nenhuma estava onde se esperava:
 *
 * - **"Média" trocava de cor de verdade**: `status-fila` no cartão contra `info`
 *   na tabela e aqui. E `info` sobre `info/10` dá 4,49:1 — reprova o AA, e
 *   passava por certo em revisão justamente por ser token;
 * - **a superfície trocava de mecânica**: `-soft` no cartão contra `/10` na
 *   tabela. Não é erro de um dos dois — são duas escadas;
 * - **"Baixa" trocava de papel de texto**: `muted-foreground` em três lugares,
 *   `foreground` na tabela.
 *
 * E havia uma quarta, invisível no claro: o cartão escrevia `status-ajuste` e a
 * tabela `destructive`, que o `index.css` declara como o MESMO valor nos três
 * temas claros. No `.dark` o `--destructive` tem valor próprio e o `.dark` não
 * declara `--status-*` — ou seja, as duas cópias divergiriam no dia em que o
 * escuro entrasse, e a diferença estaria em quatro arquivos.
 *
 * ## A escada (decisão dela, 11/09/2026)
 *
 * `neutro → fila → alerta → ajuste`, subindo de tom junto com a urgência. É a
 * mesma escada decidida para a prioridade do PROJETO, e fechar as duas com ela
 * é o que faz disto uma decisão só. `info` saiu do caminho: era o único degrau
 * que reprovava, é semântico e não acompanha a área.
 *
 * **A superfície é `-soft`, e isso foi escolhido, não herdado.** `-soft` tem
 * luminosidade fixa e não muda com o fundo; `/10` é alfa e escurece junto com o
 * cartão. Os dois passam com folga hoje — a escolha decide se a pílula muda de
 * tom ao entrar no escuro, e a resposta é que ela lê igual em qualquer área.
 */
export interface TaskPriorityConfig {
  key: OrgTaskPriority;
  label: string;
  /** `bg + text + border` para Badge/pílula. */
  badge: string;
  /** Só o texto, para quem lista sem pílula. */
  texto: string;
  /** `bg` do ponto indicador. */
  dot: string;
}

export const taskPriorityColors: Record<OrgTaskPriority, TaskPriorityConfig> = {
  urgent: {
    key: 'urgent',
    label: 'Urgente',
    badge: 'bg-status-ajuste-soft text-status-ajuste border-status-ajuste/20',
    texto: 'text-status-ajuste',
    dot: 'bg-status-ajuste',
  },
  high: {
    key: 'high',
    label: 'Alta',
    badge: 'bg-status-alerta-soft text-status-alerta border-status-alerta/20',
    texto: 'text-status-alerta',
    dot: 'bg-status-alerta',
  },
  medium: {
    key: 'medium',
    label: 'Média',
    badge: 'bg-status-fila-soft text-status-fila border-status-fila/20',
    texto: 'text-status-fila',
    dot: 'bg-status-fila',
  },
  low: {
    key: 'low',
    label: 'Baixa',
    badge: 'bg-status-neutro-soft text-status-neutro border-status-neutro/15',
    texto: 'text-muted-foreground',
    dot: 'bg-status-neutro',
  },
};

/**
 * A config de um valor de prioridade, tolerante a chave desconhecida.
 *
 * Segue a forma de `chamadoStatusConfig`: chave que não existe devolve o valor
 * cru como rótulo, em vez de cair num degrau qualquer — foi assim que a cópia
 * do chamado ficou sem a chave `media` e a pílula saiu VAZIA no portal, sem
 * ninguém notar.
 */
export function taskPriorityConfig(prioridade: OrgTaskPriority | string | null | undefined): TaskPriorityConfig {
  const config = prioridade ? taskPriorityColors[prioridade as OrgTaskPriority] : undefined;
  if (config) return config;
  return {
    key: (prioridade ?? 'low') as OrgTaskPriority,
    label: prioridade ? String(prioridade) : 'Sem prioridade',
    badge: taskPriorityColors.low.badge,
    texto: taskPriorityColors.low.texto,
    dot: taskPriorityColors.low.dot,
  };
}

/** Ordem de exibição no select: da menor para a maior urgência. */
export const taskPriorityList: TaskPriorityConfig[] = [
  taskPriorityColors.low,
  taskPriorityColors.medium,
  taskPriorityColors.high,
  taskPriorityColors.urgent,
];

/**
 * Só os rótulos, para quem não precisa de cor — era o `subtaskPriorityLabels`
 * de `orgSubtasks.ts`, a quinta cópia das mesmas quatro palavras. Deriva da
 * escada: palavra nova entra aqui sozinha.
 */
export const taskPriorityLabels: Record<OrgTaskPriority, string> = Object.fromEntries(
  taskPriorityList.map((config) => [config.key, config.label]),
) as Record<OrgTaskPriority, string>;

/**
 * Peso para ordenar lista por urgência — o mais urgente primeiro.
 *
 * Sai da própria escada, invertida, em vez de um `{ urgent: 0, high: 1, ... }`
 * escrito à mão: degrau novo entra na ordenação sem ninguém lembrar de mexer
 * aqui.
 */
export const taskPriorityOrder: Record<OrgTaskPriority, number> = Object.fromEntries(
  [...taskPriorityList].reverse().map((config, indice) => [config.key, indice]),
) as Record<OrgTaskPriority, number>;
