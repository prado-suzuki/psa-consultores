/**
 * Ordem das tarefas do painel (Tax e OSG), aplicada **dentro do mesmo escopo**
 * — irmãs da mesma mãe, ou tarefas-raiz do mesmo projeto.
 *
 * O escopo é a regra e só ela: ordena quem divide o mesmo pai. Onde a tela
 * achata projetos diferentes numa lista só (as tarefas-pai da tabela, os cards
 * da coluna do quadro, o dia do calendário, a semana das Futuras, o responsável
 * do Gantt), o escopo não existe e nada é reordenado.
 *
 * **Dentro do escopo quem manda é o prazo**, do mais próximo ao mais distante,
 * com a tarefa SEM prazo na frente de todas — ela é a que precisa de data, e no
 * fim da lista ninguém a veria. O título só desempata: é o que devolve as
 * irmãs de mesma data à sequência numerada em que foram escritas ("1.1., 1.2.,
 * 1.3."), sem a qual um bloco de cinco tarefas do mesmo dia sairia em ordem
 * aleatória a cada render.
 *
 * `ordenarPorTitulo` continua existindo para os SELETORES (a mãe no modal de
 * tarefa): ali se procura por nome, e ordenar por prazo esconderia o item que a
 * pessoa está lendo na lista.
 *
 * `numeric: true` é o ponto todo do desempate. Em texto puro `"10"` vem antes de `"2"`, e as
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

/** O mínimo para ordenar uma tarefa: o prazo que manda e o título que desempata. */
export interface TarefaOrdenavelPorPrazo {
  title: string;
  due_date?: string | null;
}

/**
 * Compara duas tarefas irmãs: prazo mais próximo primeiro, sem prazo antes de
 * todas, título como desempate.
 *
 * A comparação é de TEXTO, não de `Date`. `org_tasks.due_date` é coluna `date`,
 * e chega como `YYYY-MM-DD` — formato em que a ordem alfabética já é a ordem
 * cronológica. Passar por `new Date()` só acrescentaria fuso a uma comparação
 * que não precisa dele (ver `parseDate` em `@/lib/dateUtils` para o estrago que
 * o fuso faz numa data sem hora).
 */
export function compararTarefasPorPrazo(a: TarefaOrdenavelPorPrazo, b: TarefaOrdenavelPorPrazo): number {
  // `|| null` e não `?? null`: prazo apagado num formulário chega como string
  // vazia, e string vazia é ausência de prazo, não uma data anterior a todas.
  const prazoA = a.due_date || null;
  const prazoB = b.due_date || null;
  if (prazoA !== prazoB) {
    if (prazoA === null) return -1;
    if (prazoB === null) return 1;
    return prazoA < prazoB ? -1 : 1;
  }
  return compararTitulosDeTarefa(a.title, b.title);
}

/** Cópia ordenada por prazo. Não ordena no lugar, pelo mesmo motivo de `ordenarPorTitulo`. */
export function ordenarPorPrazo<T extends TarefaOrdenavelPorPrazo>(tarefas: readonly T[]): T[] {
  return [...tarefas].sort(compararTarefasPorPrazo);
}
