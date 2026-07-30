// Janelas de tempo das abas de Auditoria.
//
// Duas famílias convivem no mesmo seletor: "últimos N dias", que anda com o
// relógio, e recortes fixos de calendário (semestres, todo o histórico). Por isso
// a janela é sempre um par de datas — quem consome não precisa saber de qual
// família ela veio.
//
// Funções puras: a data de hoje entra por parâmetro (YYYY-MM-DD), nada aqui lê o
// relógio. Isso é o que deixa o teste determinístico e o cache do React Query
// estável dentro do mesmo dia.

export interface PeriodoAuditoria {
  valor: string;
  label: string;
}

export interface JanelaAuditoria {
  /** Primeiro dia (YYYY-MM-DD), inclusivo. `null` = sem limite: todo o histórico. */
  desde: string | null;
  /** Último dia (YYYY-MM-DD), inclusivo. `null` = até agora. */
  ate: string | null;
  /**
   * Dias do período que JÁ aconteceram — denominador do "dias com atividade".
   * `null` quando não há como saber (todo o histórico) ou quando o período ainda
   * não começou; nesses casos a tela mostra a contagem sem inventar o total.
   */
  dias: number | null;
  /** Sufixo do nome do arquivo exportado. */
  slug: string;
}

export const PERIODO_PADRAO = 'ultimos-30';

const DIA_MS = 86_400_000;

function paraData(dia: string): Date {
  return new Date(`${dia}T00:00:00.000Z`);
}

function paraDia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function somarDias(dia: string, quantidade: number): string {
  return paraDia(new Date(paraData(dia).getTime() + quantidade * DIA_MS));
}

/** Dias inclusivos entre duas datas; 0 quando o fim é anterior ao início. */
function diasEntre(inicio: string, fim: string): number {
  const total = (paraData(fim).getTime() - paraData(inicio).getTime()) / DIA_MS + 1;
  return total > 0 ? total : 0;
}

/**
 * Semestre de uma data, e o anterior a ele.
 *
 * `anterior` atravessa a virada de ano sozinho: em março de 2027 o semestre
 * anterior é jul–dez/2026. É isso que evita opções datadas no código, que
 * envelhecem e escondem o ano passado.
 */
function semestreDe(hoje: string, anterior: boolean): { ano: number; primeiro: boolean } {
  const ano = Number(hoje.slice(0, 4));
  const primeiroAgora = Number(hoje.slice(5, 7)) <= 6;

  if (!anterior) return { ano, primeiro: primeiroAgora };
  return primeiroAgora ? { ano: ano - 1, primeiro: false } : { ano, primeiro: true };
}

/** `jul–dez/26` — mês e ano curtos, só para situar a opção relativa. */
function rotuloSemestre({ ano, primeiro }: { ano: number; primeiro: boolean }): string {
  const meses = primeiro ? 'jan–jun' : 'jul–dez';
  return `${meses}/${String(ano).slice(2)}`;
}

/**
 * Opções do seletor.
 *
 * Os semestres são RELATIVOS a `hoje` ("atual" e "anterior"), nunca um ano
 * escrito no código: quando o ano vira, a lista continua certa e o semestre que
 * acabou segue alcançável. As datas aparecem entre parênteses só para situar.
 */
export function periodosAuditoria(hoje: string): PeriodoAuditoria[] {
  return [
    { valor: 'ultimos-7', label: 'Últimos 7 dias' },
    { valor: 'ultimos-30', label: 'Últimos 30 dias' },
    { valor: 'ultimos-90', label: 'Últimos 90 dias' },
    {
      valor: 'semestre-atual',
      label: `Semestre atual (${rotuloSemestre(semestreDe(hoje, false))})`,
    },
    {
      valor: 'semestre-anterior',
      label: `Semestre anterior (${rotuloSemestre(semestreDe(hoje, true))})`,
    },
    { valor: 'tudo', label: 'Todo o período' },
  ];
}

/**
 * Datas de um valor do seletor.
 *
 * O semestre tem fim fixo (30/06 e 31/12), então o atual consultado em julho traz
 * só o que já aconteceu — a data futura não some, apenas não tem log. Já `dias`
 * conta a parte do período que passou, para o "dias com atividade" não se
 * comparar com dias que ainda não existem.
 *
 * O `slug` do arquivo, ao contrário do rótulo, é datado: o CSV é de um semestre
 * específico e dois downloads em anos diferentes não podem sair com o mesmo nome.
 *
 * Valor desconhecido cai no padrão em vez de estourar: o seletor é a única fonte
 * desses valores, mas URL e cache antigo não são de confiança.
 */
export function janelaDoPeriodo(valor: string, hoje: string): JanelaAuditoria {
  if (valor === 'tudo') {
    return { desde: null, ate: null, dias: null, slug: 'tudo' };
  }

  if (valor === 'semestre-atual' || valor === 'semestre-anterior') {
    const { ano, primeiro } = semestreDe(hoje, valor === 'semestre-anterior');
    const desde = `${ano}-${primeiro ? '01-01' : '07-01'}`;
    const ate = `${ano}-${primeiro ? '06-30' : '12-31'}`;
    // O denominador para no dia de hoje quando o semestre ainda está correndo.
    const dias = diasEntre(desde, ate < hoje ? ate : hoje);
    return {
      desde,
      ate,
      dias: dias > 0 ? dias : null,
      slug: `${primeiro ? 'sem1' : 'sem2'}-${ano}`,
    };
  }

  const dias = valor === 'ultimos-7' ? 7 : valor === 'ultimos-90' ? 90 : 30;
  return { desde: somarDias(hoje, -dias), ate: null, dias, slug: `${dias}d` };
}
