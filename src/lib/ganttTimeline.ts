import {
  addMonths,
  addQuarters,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  getISOWeek,
  getQuarter,
  isSameDay,
  isWeekend,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * O eixo do tempo do Gantt: quais colunas existem, onde cada barra cai nelas e
 * para onde as setas de navegação levam.
 *
 * O eixo é um PERÍODO NAVEGÁVEL, não um intervalo derivado dos itens. Essa é a
 * diferença que decide o resto do arquivo: a largura de um dia é constante
 * (`pxPorDia`), a barra é posicionada em pixel e não em porcentagem, e um item
 * fora da janela não some em silêncio — `geometriaDaBarra` devolve `fora`, e a
 * linha desenha a seta de borda que leva até ele. No modelo anterior (0–100%
 * do menor início ao maior vencimento) a mesma tarefa mudava de largura toda
 * vez que outra tarefa entrava no filtro, e a comparação entre duas telas não
 * significava nada.
 *
 * Semana e mês contam a coluna em DIA; trimestre conta em SEMANA. `pxPorDia`
 * existe para que a geometria não precise saber qual dos dois é o caso.
 */

export type GanttEscala = 'semana' | 'mes' | 'trimestre';

export const ESCALAS_DO_GANTT: ReadonlyArray<{ valor: GanttEscala; rotulo: string }> = [
  { valor: 'semana', rotulo: 'Semana' },
  { valor: 'mes', rotulo: 'Mês' },
  { valor: 'trimestre', rotulo: 'Trimestre' },
];

/** Coluna de baixo do cabeçalho: um dia (semana/mês) ou uma semana (trimestre). */
export interface GanttUnidade {
  inicio: Date;
  /** Quantos dias a coluna cobre — 1 no dia, 7 na semana. */
  dias: number;
  /** Linha de cima da célula: `ter`, `S35`. */
  legenda: string;
  /** Linha de baixo, o número que se lê: `25`, `23/8`. */
  rotulo: string;
  contemHoje: boolean;
  /** Sábado e domingo, hachurados. Só faz sentido quando a coluna é um dia. */
  fimDeSemana: boolean;
}

/** Coluna de cima do cabeçalho, agrupando N unidades. */
export interface GanttGrupoDeColuna {
  chave: string;
  rotulo: string;
  unidades: number;
}

export interface GanttEixo {
  escala: GanttEscala;
  /** Primeiro dia desenhado (já esticado até semana cheia). */
  inicio: Date;
  /** Último dia desenhado, inclusivo. */
  fim: Date;
  /** O período que a barra de navegação nomeia: `Agosto de 2026`. */
  titulo: string;
  unidades: GanttUnidade[];
  grupos: GanttGrupoDeColuna[];
  larguraDaUnidade: number;
  pxPorDia: number;
  /** Largura total da faixa de tempo, em px. */
  largura: number;
}

/** Largura de UMA coluna, por escala. Muda a densidade, não o cálculo. */
const LARGURA_DA_UNIDADE: Record<GanttEscala, number> = {
  semana: 104,
  mes: 44,
  trimestre: 56,
};

const DIAS_POR_UNIDADE: Record<GanttEscala, number> = {
  semana: 1,
  mes: 1,
  trimestre: 7,
};

/** Domingo, como o calendário do sistema. */
const INICIO_DA_SEMANA = 0 as const;

const maiuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Os dois extremos desenhados, já esticados até semana cheia. Os dois são
 * MEIA-NOITE do dia: `endOfWeek` devolveria 23:59:59.999, e um extremo com hora
 * quebrada faz `item.fim >= janela.inicio` mentir para quem compara instantes.
 */
function janelaDaEscala(escala: GanttEscala, ancora: Date): { inicio: Date; fim: Date } {
  if (escala === 'semana') {
    return {
      inicio: startOfWeek(ancora, { weekStartsOn: INICIO_DA_SEMANA }),
      fim: startOfDay(endOfWeek(ancora, { weekStartsOn: INICIO_DA_SEMANA })),
    };
  }
  const bruto =
    escala === 'mes'
      ? { inicio: startOfMonth(ancora), fim: endOfMonth(ancora) }
      : { inicio: startOfQuarter(ancora), fim: endOfQuarter(ancora) };
  // Estica até semana cheia: semana partida ao meio quebra o agrupamento do
  // cabeçalho — é por isso que a referência mostra `set 6–12` dentro de agosto.
  return {
    inicio: startOfWeek(bruto.inicio, { weekStartsOn: INICIO_DA_SEMANA }),
    fim: startOfDay(endOfWeek(bruto.fim, { weekStartsOn: INICIO_DA_SEMANA })),
  };
}

function tituloDaJanela(escala: GanttEscala, ancora: Date, janela: { inicio: Date; fim: Date }): string {
  if (escala === 'semana') {
    return `${format(janela.inicio, 'd MMM', { locale: ptBR })} – ${format(janela.fim, 'd MMM yyyy', { locale: ptBR })}`;
  }
  if (escala === 'mes') {
    return maiuscula(format(ancora, "MMMM 'de' yyyy", { locale: ptBR }));
  }
  return `${getQuarter(ancora)}º trimestre de ${format(ancora, 'yyyy')}`;
}

/** Rótulo do grupo de semana: `S35 · 23–29 ago`. */
function rotuloDaSemana(inicio: Date): string {
  const fim = endOfWeek(inicio, { weekStartsOn: INICIO_DA_SEMANA });
  return `S${getISOWeek(inicio)} · ${format(inicio, 'd', { locale: ptBR })}–${format(fim, 'd MMM', { locale: ptBR })}`;
}

/** Monta as colunas e a geometria da janela em torno da âncora. */
export function construirEixo(escala: GanttEscala, ancora: Date, hoje: Date): GanttEixo {
  const janela = janelaDaEscala(escala, ancora);
  const diasPorUnidade = DIAS_POR_UNIDADE[escala];
  const larguraDaUnidade = LARGURA_DA_UNIDADE[escala];
  const totalDeDias = differenceInCalendarDays(janela.fim, janela.inicio) + 1;

  const unidades: GanttUnidade[] = [];
  const grupos: GanttGrupoDeColuna[] = [];

  for (let dia = 0; dia < totalDeDias; dia += diasPorUnidade) {
    const inicio = new Date(janela.inicio);
    inicio.setDate(inicio.getDate() + dia);
    const fimDaUnidade = new Date(inicio);
    fimDaUnidade.setDate(fimDaUnidade.getDate() + diasPorUnidade - 1);

    unidades.push(
      diasPorUnidade === 1
        ? {
            inicio,
            dias: 1,
            legenda: format(inicio, 'EEEEEE', { locale: ptBR }),
            rotulo: format(inicio, 'd'),
            contemHoje: isSameDay(inicio, hoje),
            fimDeSemana: isWeekend(inicio),
          }
        : {
            inicio,
            dias: diasPorUnidade,
            legenda: `S${getISOWeek(inicio)}`,
            rotulo: format(inicio, 'd/M'),
            contemHoje: hoje >= inicio && hoje <= fimDaUnidade,
            fimDeSemana: false,
          },
    );

    // Semana e mês agrupam por semana; trimestre agrupa por mês. Em ambos o
    // grupo cresce enquanto a chave não muda.
    const chave =
      escala === 'trimestre'
        ? format(inicio, 'yyyy-MM')
        : format(startOfWeek(inicio, { weekStartsOn: INICIO_DA_SEMANA }), 'yyyy-MM-dd');
    const ultimo = grupos.at(-1);
    if (ultimo?.chave === chave) {
      ultimo.unidades += 1;
    } else {
      grupos.push({
        chave,
        rotulo:
          escala === 'trimestre'
            ? maiuscula(format(inicio, 'MMMM', { locale: ptBR }))
            : rotuloDaSemana(inicio),
        unidades: 1,
      });
    }
  }

  const pxPorDia = larguraDaUnidade / diasPorUnidade;
  return {
    escala,
    inicio: janela.inicio,
    fim: janela.fim,
    titulo: tituloDaJanela(escala, ancora, janela),
    unidades,
    grupos,
    larguraDaUnidade,
    pxPorDia,
    largura: unidades.length * larguraDaUnidade,
  };
}

/** Uma janela para trás (-1) ou para frente (1), na escala corrente. */
export function passoDoEixo(escala: GanttEscala, ancora: Date, direcao: 1 | -1): Date {
  if (escala === 'semana') return addWeeks(ancora, direcao);
  if (escala === 'mes') return addMonths(ancora, direcao);
  return addQuarters(ancora, direcao);
}

export interface GanttGeometria {
  esquerda: number;
  largura: number;
  /** `null` quando a barra aparece; senão, para que lado ela ficou. */
  fora: 'antes' | 'depois' | null;
}

/** Largura mínima para uma barra de um dia continuar clicável. */
const LARGURA_MINIMA = 10;

/**
 * Onde a barra cai no eixo, em px. Barra que cruza a borda é DESENHADA cortada
 * (`fora` nulo) — só quem está inteiramente fora vira seta de borda.
 */
export function geometriaDaBarra(eixo: GanttEixo, inicio: Date, fim: Date): GanttGeometria {
  const totalDeDias = differenceInCalendarDays(eixo.fim, eixo.inicio) + 1;
  const doInicio = differenceInCalendarDays(inicio, eixo.inicio);
  const doFim = differenceInCalendarDays(fim, eixo.inicio);

  if (doFim < 0) return { esquerda: 0, largura: 0, fora: 'antes' };
  if (doInicio > totalDeDias - 1) return { esquerda: 0, largura: 0, fora: 'depois' };

  const primeiro = Math.max(0, doInicio);
  const ultimo = Math.min(totalDeDias - 1, doFim);
  return {
    esquerda: primeiro * eixo.pxPorDia,
    largura: Math.max((ultimo - primeiro + 1) * eixo.pxPorDia, LARGURA_MINIMA),
    fora: null,
  };
}

/** Px da linha do agora, ou `null` quando hoje não está na janela. */
export function posicaoDeAgora(eixo: GanttEixo, agora: Date): number | null {
  const dia = differenceInCalendarDays(agora, eixo.inicio);
  const totalDeDias = differenceInCalendarDays(eixo.fim, eixo.inicio) + 1;
  if (dia < 0 || dia > totalDeDias - 1) return null;
  const fracao = (agora.getHours() * 60 + agora.getMinutes()) / 1440;
  return (dia + fracao) * eixo.pxPorDia;
}

/**
 * Onde a tela abre. Hoje, quando algum item cruza a janela de hoje; senão o
 * começo do item mais antigo — abrir num mês vazio faz a tela parecer quebrada.
 */
export function ancoraInicial(
  escala: GanttEscala,
  intervalos: ReadonlyArray<{ inicio: Date; fim: Date }>,
  hoje: Date,
): Date {
  if (intervalos.length === 0) return hoje;
  const janela = janelaDaEscala(escala, hoje);
  const cruzaHoje = intervalos.some((item) => item.inicio <= janela.fim && item.fim >= janela.inicio);
  if (cruzaHoje) return hoje;
  return intervalos.reduce(
    (menor, item) => (item.inicio < menor ? item.inicio : menor),
    intervalos[0].inicio,
  );
}
