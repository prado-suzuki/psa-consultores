import { format } from 'date-fns';

import { parseDate } from '@/lib/dateUtils';

/**
 * A regra de prazo entre tarefa-mãe e subtarefa: **a filha não vence depois da
 * mãe**.
 *
 * Ela não existia até 09/09/2026 — nem no formulário, nem no banco — e o
 * feedback que a pediu veio de quem usa (`docs/planos/lista-de-tarefas-texto-e-prazo.md`).
 *
 * DUAS COISAS DESENHAM ESTE ARQUIVO.
 *
 * A primeira: em produção, 35 dos 204 pares mãe/filha com as duas datas
 * preenchidas **já estavam fora da regra** quando ela foi escrita, com estouro
 * de até 1.346 dias. Por isso quem chama isto (`useOrgTasks`) só cobra a regra
 * quando o prazo é o campo que está mudando — editar o responsável de uma
 * tarefa antiga e torta continua possível. É a mesma forma do guard de horas,
 * que barra a conclusão sem apontamento e não a edição de tarefa velha sem
 * horas.
 *
 * A segunda: a comparação é de string, não de `Date`. `due_date` é `date` no
 * banco e chega como `yyyy-MM-dd`, formato em que a ordem lexicográfica **é** a
 * ordem cronológica. Converter para `Date` aqui só abriria porta para fuso —
 * `parseDate` entra apenas na hora de escrever a data na mensagem.
 */

/** `true` quando a filha vence depois da mãe. Sem uma das datas, não há regra. */
export function prazoDaFilhaEstoura(
  prazoDaFilha: string | null | undefined,
  prazoDaMae: string | null | undefined,
): boolean {
  if (!prazoDaFilha || !prazoDaMae) return false;
  return prazoDaFilha > prazoDaMae;
}

function dataEmPortugues(iso: string) {
  return format(parseDate(iso), 'dd/MM/yyyy');
}

/**
 * Recusa de gravar o prazo da subtarefa.
 *
 * A redação das duas mensagens é da Patrícia, de 09/09/2026 — regra de negócio
 * tem texto curado, e "tarefa-principal" é a palavra dela para a mãe. Não
 * reescrever sem ela.
 */
export function mensagemPrazoDaFilha(prazoDaMae: string): string {
  return `Esta subtarefa não pode vencer depois de ${dataEmPortugues(prazoDaMae)}, que é o prazo da tarefa-principal.`;
}

/**
 * As filhas que ficariam para fora se a mãe passasse a vencer em `novoPrazo`.
 * Devolve `null` quando nenhuma fica — é o caso comum, e quem chama testa isso.
 */
export function filhasQueEstouram(
  filhas: readonly { due_date: string | null }[],
  novoPrazoDaMae: string,
): { quantidade: number; ultima: string } | null {
  const fora = filhas
    .map(filha => filha.due_date)
    .filter((prazo): prazo is string => prazoDaFilhaEstoura(prazo, novoPrazoDaMae));
  if (fora.length === 0) return null;
  return { quantidade: fora.length, ultima: fora.reduce((maior, prazo) => (prazo > maior ? prazo : maior)) };
}

/**
 * Recusa de recuar o prazo da mãe para trás de uma filha que já existe.
 *
 * A mensagem diz **quantas** e **até quando**, porque é isso que decide o que a
 * pessoa faz em seguida: quem tem uma filha estourando por dois dias resolve na
 * hora; quem tem seis, com a última em dezembro, precisa saber disso antes de
 * escolher a data.
 */
export function mensagemPrazoDaMae(estouro: { quantidade: number; ultima: string }): string {
  const { quantidade, ultima } = estouro;
  return quantidade === 1
    ? `1 subtarefa vence depois desta data (em ${dataEmPortugues(ultima)}). Ajuste o prazo dela antes.`
    : `${quantidade} subtarefas vencem depois desta data (a última em ${dataEmPortugues(ultima)}). Ajuste o prazo delas antes.`;
}
