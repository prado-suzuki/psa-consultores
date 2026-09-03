import { addMonths, format, isSameMonth, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/dateUtils';
import type { OrgTask } from '@/hooks/useOrgTasks';

/**
 * O recorte de tempo das abas do painel de tarefas.
 *
 * Lista, Tabela, Kanban e Calendário andam no tempo pela mesma barra, e o
 * recorte é um só entre elas: trocar de aba não devolve a pessoa para o mês
 * corrente. O Gantt fica fora — ele tem âncora e escala próprias
 * (semana/mês/trimestre), e forçá-lo a compartilhar o mês tiraria a escala.
 *
 * O recorte tem dois estados: `tudo` (o projeto inteiro, que é o PADRÃO) e um
 * mês. Só o mês existia, e a trava aparecia justamente onde ela mais dói —
 * quem abre um projeto no Kanban ou na Tabela quer ver as entregas dele, e
 * entrega do mês que vem ficava fora da tela sem dizer que estava fora.
 */

/** "Agosto de 2026" — o mesmo formato do título do Gantt na escala de mês. */
export function tituloDoMes(mes: Date): string {
  return format(mes, "MMMM 'de' yyyy", { locale: ptBR });
}

export function passoDeMes(mes: Date, direcao: 1 | -1): Date {
  return addMonths(mes, direcao);
}

/** O valor de "sem recorte" no seletor do título. */
export const ESCOPO_TUDO = 'tudo';

/** O rótulo de `ESCOPO_TUDO`, que também é o título da barra nesse estado. */
export const ROTULO_TUDO = 'Tudo';

export interface OpcaoDeEscopo {
  /** `ESCOPO_TUDO` ou o mês em `yyyy-MM`. */
  valor: string;
  /** O rótulo como o menu mostra, já com a maiúscula: "Setembro de 2026". */
  rotulo: string;
}

/** O mês como valor do seletor: "2026-09". */
export function valorDoMes(mes: Date): string {
  return format(mes, 'yyyy-MM');
}

/** O caminho de volta. `null` é "tudo" — e também o que sobra de valor inválido. */
export function mesDoValor(valor: string): Date | null {
  const [ano, mes] = valor.split('-').map(Number);
  if (!ano || !mes || mes < 1 || mes > 12) return null;
  return new Date(ano, mes - 1, 1);
}

/** Meia dúzia para cada lado de hoje é o alcance do seletor sem virar rolagem. */
const MESES_AO_REDOR = 6;

/** O rótulo do menu começa frase; `tituloDoMes` vem do date-fns em minúscula. */
const maiusculaInicial = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * As opções do seletor: `Tudo` e uma janela de meses em volta de hoje.
 *
 * `mes` entra na lista mesmo fora da janela porque as setas levam mais longe do
 * que o seletor mostra, e o `Select` sem o próprio valor abre em branco.
 */
export function opcoesDeEscopo(hoje: Date, mes: Date): OpcaoDeEscopo[] {
  const janela = new Map<string, Date>();
  for (let passo = -MESES_AO_REDOR; passo <= MESES_AO_REDOR; passo++) {
    const candidato = startOfMonth(addMonths(hoje, passo));
    janela.set(valorDoMes(candidato), candidato);
  }
  const ancora = startOfMonth(mes);
  janela.set(valorDoMes(ancora), ancora);

  return [
    { valor: ESCOPO_TUDO, rotulo: ROTULO_TUDO },
    ...[...janela.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([valor, data]) => ({ valor, rotulo: maiusculaInicial(tituloDoMes(data)) })),
  ];
}

/**
 * As tarefas que o mês mostra.
 *
 * **Tarefa sem prazo fica parada em hoje**, e só aparece enquanto o mês
 * corrente está à vista. Ela não pertence a mês nenhum, e as duas saídas ruins
 * eram: escondê-la (Calendário e Gantt já a ignoram porque dependem de
 * `due_date`, então ela não apareceria em ABA NENHUMA do painel — trabalho
 * sumindo da tela por causa de um controle de navegação) ou repeti-la em todo
 * mês (ela vira ruído permanente e ninguém arruma a data).
 *
 * Parada em hoje ela é uma cobrança: está no caminho de quem olha o mês
 * corrente, e sai de lá no instante em que alguém define o prazo. No Calendário
 * isso é literal — ela ocupa a célula de hoje, marcada como sem prazo.
 *
 * Subtarefa cujo pai caiu fora do mês continua visível: `buildTaskTree` promove
 * a filha a raiz quando não acha o pai no conjunto. Ela perde o aninhamento, não
 * a existência.
 *
 * Nada disso vale no escopo `tudo`: lá não há recorte, e esta função não é
 * chamada.
 */
export function tarefasNoPeriodo(tasks: OrgTask[], mes: Date, hoje: Date): OrgTask[] {
  const hojeEstaAVista = isSameMonth(mes, hoje);
  return tasks.filter(task =>
    task.due_date ? isSameMonth(parseDate(task.due_date), mes) : hojeEstaAVista,
  );
}

/**
 * Da mais próxima para a mais distante.
 *
 * A aba Futuras herdava a ordem em que as tarefas chegavam da consulta. Os
 * grupos de semana já saíam em ordem, mas DENTRO de cada um não: em "Esta
 * semana", uma que vencia na sexta podia aparecer antes de uma de segunda — e a
 * aba que existe justamente para responder "o que vem primeiro" não respondia.
 *
 * Tarefa sem prazo vai para o fim: ela não tem lugar na fila de vencimento.
 * Empate mantém a ordem de entrada, porque `Array.sort` é estável.
 */
export function ordenarPorVencimento(tasks: OrgTask[]): OrgTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.due_date) return b.due_date ? 1 : 0;
    if (!b.due_date) return -1;
    return parseDate(a.due_date).getTime() - parseDate(b.due_date).getTime();
  });
}
