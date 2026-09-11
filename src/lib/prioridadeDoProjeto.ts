/**
 * Prioridade do PROJETO — quatro degraus, dois vocabulários, um mapa.
 *
 * ## Por que este arquivo existe
 *
 * A prioridade do projeto chega em duas línguas e de duas origens: o backlog
 * grava `high`/`medium`/`low` numa coluna, e o cadastro de projeto guarda a
 * palavra em português DENTRO da descrição (`extractPriority` a pesca de
 * "Prioridade: X"). Quem pinta sem normalizar acaba com um `switch` por tela —
 * e foi o que havia.
 *
 * ## O defeito que a decisão dela desfez (11/09/2026)
 *
 * O `switch` do `projectPresentation` tinha **dois caminhos devolvendo a mesma
 * palavra**: `crítica`, `urgent` e `high` mostravam "Alta" em vermelho, e
 * `alta` mostrava "Alta" em laranja. Na tela, dois projetos com prioridades
 * diferentes apareciam com a MESMA palavra em cores diferentes — e quem lesse a
 * cor não tinha como saber qual era qual.
 *
 * Decisão dela, opção (a): **crítica e urgent viram "Crítica"**, e só
 * `high`/`alta` fica "Alta". Os dados já distinguiam os dois; era a tela que
 * apagava a diferença.
 *
 * ## A escada
 *
 * `neutro → espera → alerta → ajuste`, subindo com a urgência — a mesma que a
 * etapa do projeto e o backlog já vestiam desde `fff931b3`.
 *
 * **E agora é a mesma da TAREFA, degrau por degrau.** Por algumas horas do dia
 * 11/09 a tarefa ficou com `fila` no "Média" e o projeto com `espera`: duas
 * escadas iguais em três degraus e diferentes no segundo, que é o defeito que
 * esta frente existe para matar. Decisão dela, no fim do dia: `espera` nas
 * duas. Quem mexer numa tem que mexer na outra —
 * [`taskPriorityColors.ts`](./taskPriorityColors.ts) é a irmã desta.
 */
export interface PrioridadeDoProjetoConfig {
  /** Chave normalizada, já em português. */
  key: 'critica' | 'alta' | 'media' | 'baixa';
  label: string;
  /** `bg + text + border` para a pílula. */
  badge: string;
}

const ESCADA: Record<PrioridadeDoProjetoConfig['key'], PrioridadeDoProjetoConfig> = {
  critica: {
    key: 'critica',
    label: 'Crítica',
    badge: 'bg-status-ajuste-soft text-status-ajuste border-status-ajuste/30',
  },
  alta: {
    key: 'alta',
    label: 'Alta',
    badge: 'bg-status-alerta-soft text-status-alerta border-status-alerta/30',
  },
  media: {
    key: 'media',
    label: 'Média',
    badge: 'bg-status-espera-soft text-status-espera border-status-espera/30',
  },
  baixa: {
    key: 'baixa',
    label: 'Baixa',
    badge: 'bg-status-neutro-soft text-status-neutro border-status-neutro/20',
  },
};

/** As duas línguas que chegam do banco e da descrição, apontando para a escada. */
const SINONIMOS: Record<string, PrioridadeDoProjetoConfig['key']> = {
  'crítica': 'critica',
  'critica': 'critica',
  'critical': 'critica',
  'urgent': 'critica',
  'urgente': 'critica',
  'alta': 'alta',
  'high': 'alta',
  'média': 'media',
  'media': 'media',
  'medium': 'media',
  'baixa': 'baixa',
  'low': 'baixa',
};

/**
 * A config de um valor de prioridade de projeto, ou `null` quando a palavra não
 * é nenhuma das conhecidas.
 *
 * `null` em vez de um degrau qualquer: a prioridade daqui sai de texto livre na
 * descrição, então "—" e lixo de digitação chegam mesmo. Quem recebe `null`
 * mostra o valor cru, sem afirmar urgência que ninguém escreveu.
 */
export function prioridadeDoProjeto(valor: string | null | undefined): PrioridadeDoProjetoConfig | null {
  if (!valor) return null;
  const chave = SINONIMOS[valor.trim().toLowerCase()];
  return chave ? ESCADA[chave] : null;
}

/** A escada inteira, da menor para a maior urgência. */
export const prioridadeDoProjetoLista: PrioridadeDoProjetoConfig[] = [
  ESCADA.baixa,
  ESCADA.media,
  ESCADA.alta,
  ESCADA.critica,
];
