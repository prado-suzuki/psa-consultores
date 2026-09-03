import { addMonths, format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/dateUtils';
import { matchesUrgency, type UrgencyFilter } from '@/lib/areaDashboardData';
import type { OrgTask } from '@/hooks/useOrgTasks';

/**
 * O recorte de tempo das abas do painel de tarefas.
 *
 * Lista, Tabela, Kanban e Calendário andam no tempo pela mesma barra, e o
 * recorte é um só entre elas: trocar de aba não devolve a pessoa para o mês
 * corrente. O Gantt fica fora — ele tem âncora e escala próprias
 * (semana/mês/trimestre), e forçá-lo a compartilhar o mês tiraria a escala.
 *
 * `tudo` (o projeto inteiro) é o PADRÃO. Só o mês existia, e a trava aparecia
 * justamente onde ela mais dói — quem abre um projeto no Kanban ou na Tabela
 * quer ver as entregas dele, e entrega do mês que vem ficava fora da tela sem
 * dizer que estava fora.
 *
 * Os outros três recortes — atrasadas, próximos 30 dias, sem prazo — NÃO têm
 * conta própria: são os do dashboard de área, pelo `matchesUrgency`. "Atrasada"
 * já tinha definição no sistema, e duas contas de atrasada é como uma tela passa
 * a discordar da outra.
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

/**
 * O recorte: tudo, um mês, ou uma das três faixas de prazo.
 *
 * As três faixas são valores do `UrgencyFilter` do dashboard de área, de
 * propósito: assim o filtro daqui e o de lá não podem divergir.
 */
export type EscopoDeTarefas = 'tudo' | 'mes' | 'overdue' | 'next_30' | 'no_due';

export interface RecorteDeTarefas {
  escopo: EscopoDeTarefas;
  /** O mês âncora. Vale para o escopo `mes`, e é onde as setas continuam de. */
  mes: Date;
}

export interface OpcaoDeEscopo {
  /** Um `EscopoDeTarefas` que não seja `mes`, ou um mês em `yyyy-MM`. */
  valor: string;
  /** O rótulo como o menu mostra: "Tudo", "Atrasadas", "set". */
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

/** O título começa frase; `tituloDoMes` vem do date-fns em minúscula. */
const maiusculaInicial = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** O mês como TÍTULO da barra: "Setembro de 2026", igual ao Gantt e ao Calendário. */
export function rotuloDoMes(mes: Date): string {
  return maiusculaInicial(tituloDoMes(mes));
}

/** O mês como ITEM da grade: "set". O ano está no cabeçalho dela. */
export function abreviacaoDoMes(mes: Date): string {
  return format(mes, 'MMM', { locale: ptBR });
}

/**
 * Os atalhos do menu, na ordem em que aparecem.
 *
 * "Este mês" é o mês corrente, então o valor dele é um MÊS e não um escopo
 * próprio: escolher o atalho e clicar em `set` na grade têm de ser o mesmo
 * estado, senão a tela passa a ter duas maneiras de estar em setembro.
 *
 * A redação é a do dashboard de área ("Atrasadas", "Próximos 30 dias", "Sem
 * prazo"), porque o filtro por baixo é literalmente o mesmo.
 */
export function atalhosDeEscopo(hoje: Date): OpcaoDeEscopo[] {
  return [
    { valor: ESCOPO_TUDO, rotulo: ROTULO_TUDO },
    { valor: 'overdue', rotulo: 'Atrasadas' },
    { valor: valorDoMes(hoje), rotulo: 'Este mês' },
    { valor: 'next_30', rotulo: 'Próximos 30 dias' },
    { valor: 'no_due', rotulo: 'Sem prazo' },
  ];
}

/**
 * Os doze meses de um ano, para a grade.
 *
 * A grade existe porque a lista única de treze meses era rolagem: mês e ano
 * separados, o ano navega no cabeçalho e os doze cabem sem rolar.
 */
export function mesesDoAno(ano: number): OpcaoDeEscopo[] {
  return Array.from({ length: 12 }, (_, indice) => {
    const data = new Date(ano, indice, 1);
    return { valor: valorDoMes(data), rotulo: abreviacaoDoMes(data) };
  });
}

/** O valor que marca o item escolhido no menu. */
export function valorDoRecorte({ escopo, mes }: RecorteDeTarefas): string {
  return escopo === 'mes' ? valorDoMes(mes) : escopo;
}

/** O caminho de volta: do valor clicado no menu para o recorte. */
export function recorteDoValor(valor: string, ancora: Date): RecorteDeTarefas {
  const mes = mesDoValor(valor);
  if (mes) return { escopo: 'mes', mes };
  const escopo = valor as EscopoDeTarefas;
  return {
    escopo: escopo === 'mes' ? 'tudo' : escopo,
    mes: ancora,
  };
}

/** O que a barra escreve como título. */
export function rotuloDoRecorte({ escopo, mes }: RecorteDeTarefas): string {
  if (escopo === 'mes') return rotuloDoMes(mes);
  if (escopo === ESCOPO_TUDO) return ROTULO_TUDO;
  const atalho = atalhosDeEscopo(mes).find(opcao => opcao.valor === escopo);
  return atalho?.rotulo ?? ROTULO_TUDO;
}

/**
 * A frase que explica a tela vazia, ou `null` quando não há recorte a culpar.
 *
 * Existe porque "Nenhuma tarefa encontrada" num recorte é meia informação: a
 * tarefa existe, ela é que está fora dele. Em `tudo` o vazio é o vazio, e quem
 * chama escreve o texto próprio.
 */
export function mensagemDoVazio({ escopo, mes }: RecorteDeTarefas): string | null {
  if (escopo === 'mes') return `Nada com prazo em ${tituloDoMes(mes)}`;
  if (escopo === 'overdue') return 'Nenhuma tarefa atrasada';
  if (escopo === 'next_30') return 'Nada com prazo nos próximos 30 dias';
  if (escopo === 'no_due') return 'Nenhuma tarefa sem prazo';
  return null;
}

/**
 * O recorte aplicado.
 *
 * As faixas de prazo saem do `matchesUrgency` do dashboard de área — mesma
 * conta, mesma resposta nas duas telas.
 */
export function tarefasNoEscopo(
  tasks: OrgTask[],
  { escopo, mes }: RecorteDeTarefas,
  hoje: Date,
): OrgTask[] {
  if (escopo === ESCOPO_TUDO) return tasks;
  if (escopo === 'mes') return tarefasNoPeriodo(tasks, mes, hoje);
  const urgencia: UrgencyFilter = escopo;
  return tasks.filter(task => matchesUrgency(task, urgencia, hoje));
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
