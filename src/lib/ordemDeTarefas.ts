/**
 * Ordem alfabética das tarefas do painel (Tax e OSG), aplicada **dentro do
 * mesmo escopo** — irmãs da mesma mãe, ou tarefas-raiz do mesmo projeto.
 *
 * A regra é essa e só essa: ordena quem divide o mesmo pai. Onde a tela achata
 * projetos diferentes numa lista só (a tabela, as colunas do quadro, o dia do
 * calendário, a semana das Futuras, o responsável do Gantt), o escopo não
 * existe e nada é reordenado — ordenar ali intercalaria a "1. Apuração" de um
 * cliente com a "1. Diagnóstico" de outro.
 *
 * `numeric: true` é o ponto todo. Em texto puro `"10"` vem antes de `"2"`, e as
 * tarefas daqui são numeradas ("4.1", "4.2", …, "4.10"). Sem ele a lista
 * ordenada mente na primeira dezena — foi o que aconteceu com as filhas de
 * "3.01.Cisão (parcial)", onde "Elaborar 10ª Alteração" aparecia antes da "1ª".
 * Com ele, deixa de ser necessário preencher com zero à esquerda ("2.01") só
 * para enganar a ordenação.
 */

/** Compara dois títulos de tarefa: alfabético pt-BR, com número lido como número. */
export function compararTitulosDeTarefa(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { numeric: true });
}

/**
 * Cópia ordenada por título. Não ordena no lugar de propósito: as listas que
 * chegam aqui costumam ser o array do cache do React Query.
 */
export function ordenarPorTitulo<T extends { title: string }>(tarefas: readonly T[]): T[] {
  return [...tarefas].sort((a, b) => compararTitulosDeTarefa(a.title, b.title));
}
