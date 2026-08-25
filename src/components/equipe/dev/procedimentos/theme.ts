import type { CSSProperties } from 'react';

/**
 * Vocabulário e paleta da Biblioteca de Procedimentos.
 *
 * A lista de processos, o mapa de cores e a régua de complexidade estavam
 * copiados em TRÊS arquivos (`ProcedimentosDev.tsx`, `ProcedimentoCard.tsx`,
 * `ReviewProcedimentoModal.tsx`), cada um com o hex cravado de novo. Mesma
 * cor, três fontes da verdade, sem ligação entre elas no código. Mora aqui.
 *
 * A cor aqui é IDENTIDADE de processo (qual assunto é), não papel de status —
 * por isso ela é um hex escolhido e não um token do tema. Estado (erro,
 * pendente, travado) continua resolvido por classe utilitária no componente,
 * onde o papel é que manda.
 *
 * `PROCEDIMENTO_PROCESSOS` precisa continuar espelhando o `enum` do campo
 * `processos` na tool de extração da edge function `processar-procedimento`:
 * o que a IA devolve fora dessa lista cai no cinza de fallback e não casa com
 * nenhum filtro.
 */

export const PROCEDIMENTO_PROCESSOS = [
  'EFD', 'XMLs', 'PERDCOMP', 'Selic', 'IBS/CBS',
  'Balancetes', 'PIS/COFINS', 'Cruzamento de Dados', 'Correções SPED',
] as const;

export type ProcedimentoProcesso = (typeof PROCEDIMENTO_PROCESSOS)[number];

/** Cinza usado quando a IA devolve um processo fora da lista acima. */
export const PROCESSO_COR_FALLBACK = '#6B7280';

export const PROCESSO_COLORS: Record<string, string> = {
  'EFD': '#3B82F6',
  'XMLs': '#8B5CF6',
  'PERDCOMP': '#10B981',
  'Selic': '#06B6D4',
  'IBS/CBS': '#F59E0B',
  'Balancetes': '#EC4899',
  'PIS/COFINS': '#6366F1',
  'Cruzamento de Dados': '#D97706',
  'Correções SPED': '#EF4444',
};

export function corDoProcesso(processo: string): string {
  return PROCESSO_COLORS[processo] ?? PROCESSO_COR_FALLBACK;
}

/**
 * Estilo do chip de processo. O `26` no fim do hex é o alpha (~15%) do fundo —
 * inline porque a cor vem de dados, e classe Tailwind arbitrária montada com
 * variável não sai no build de produção.
 */
export function estiloChipProcesso(processo: string): CSSProperties {
  const cor = corDoProcesso(processo);
  return { backgroundColor: `${cor}26`, color: cor };
}

export const COMPLEXIDADE_CONFIG = {
  simples: { label: 'Simples', color: '#10B981', ajuda: 'Até 5 passos lineares.' },
  intermediario: { label: 'Intermediário', color: '#F59E0B', ajuda: 'Tem validação condicional pelo caminho.' },
  avancado: { label: 'Avançado', color: '#EF4444', ajuda: 'Atravessa mais de um sistema.' },
} as const;

export type Complexidade = keyof typeof COMPLEXIDADE_CONFIG;

/**
 * Minutos até um procedimento em `processando` ser considerado travado.
 *
 * Tem que ser o MESMO número dos dois lados: o card usava 10 e a função
 * `mark_stuck_procedimentos` usa 15 por padrão, então entre 10 e 15 minutos o
 * card dizia "travado" enquanto o backend ainda o considerava vivo. Este
 * constante é o valor passado para a RPC.
 */
export const PROCESSANDO_TIMEOUT_MIN = 15;
