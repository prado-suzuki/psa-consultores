/**
 * Snapshot do Board · Projetos (Clientes e OS) para o Agente PSA.
 *
 * Mesmo contrato do `agenteContextoBoard`: função PURA que recebe os valores
 * JÁ CALCULADOS pela tela e os traduz em texto rotulado. Nada é recalculado
 * aqui — o número que o agente cita tem que ser o mesmo que a pessoa vê.
 *
 * O que esta tela tem e o Estratégico não:
 *
 * - **a série mensal do faturamento**, mês a mês. É o bloco que permite
 *   perguntar "que mês foge do padrão?" — e foi por um valor absurdo num mês
 *   (R$ 196 mi em jun/26) que esta tela ganhou o agente;
 * - **a matriz centro de custo × mês**, que é onde o valor errado se localiza
 *   por CENTRO, não só por mês;
 * - **horas estimadas contra realizadas**, que o Estratégico não mostra.
 *
 * A ordem dos blocos é a ordem de importância: o corte por tamanho no prompt
 * descarta os do fim (ver `serializarContexto` na edge function).
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';
import type {
  KpisClientes, KpisOperacional, KpisProjetos, MatrizMensal, MesFaturamento,
  StatusContagem,
} from '@/lib/dashboardClientesOs/types';
import type { MixAtivos } from '@/lib/boardDiretoria';
import { MIX_ROTULO } from '@/lib/boardDiretoria';

/** Mesma formatação da tela (`FaturamentoDetalhe`/`KpiStrip`): R$ mil. */
const brl = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** 'YYYY-MM' -> 'jun/26', como o eixo do gráfico. */
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const rotuloMes = (mes: string): string => {
  const [ano, m] = mes.split('-');
  const i = Number(m) - 1;
  return i >= 0 && i < 12 ? `${MESES[i]}/${ano.slice(2)}` : mes;
};

export interface EntradaContextoProjetos {
  /** Rótulo da janela, como a barra de filtros mostra. */
  janela: string;
  filtros: {
    periodo: string;
    cliente: string | null;
    tipo: string | null;
    categoria: string | null;
    centroCusto: string | null;
    empresa: string | null;
  };
  kpisClientes: KpisClientes;
  kpisOperacional: KpisOperacional;
  kpisProjetos: KpisProjetos;
  /** Valor das OS sem data de início — some da série mensal, não do total. */
  valorSemData: number;
  serieMensal: MesFaturamento[];
  matriz: MatrizMensal;
  /** Como a matriz está quebrada: centro de custo, produto ou cliente. */
  detalhe: 'centro_custo' | 'produto' | 'cliente';
  status: StatusContagem[];
  /**
   * Leitura de diretoria (Board). Quando presente, vai na frente e o
   * faturamento total operacional deixa de ser a história da tela.
   */
  leitura?: {
    mix: MixAtivos;
    caixa: number;
    horizonteSemFim: number;
  };
  carga?: {
    projetos: number;
    pessoas: number;
    valor: number;
    absorviveis: number | null;
  };
  /** Falhas de carregamento; viram `avisos`. */
  falhas: string[];
}

const SUGESTOES = [
  'Qual mês foge do padrão de faturamento?',
  'De quem depende o faturamento desta carteira?',
  'Quanto de faturamento está em OS sem data de início?',
];

const SUGESTOES_DIRETORIA = [
  'O crescimento de ativos é cliente novo ou aditivo?',
  'Quanto de caixa contratado vence nos próximos meses?',
  'Mais projeto sem cliente novo ou aditivo é só entrega já paga?',
];

const SUGESTOES_CARGA = [
  'Quais projetos concentram hora e gente?',
  'Quantos projetos a mais a hora das ferramentas cobre?',
  'O custo interno por cargo existe no cadastro?',
];

/**
 * Bloco da série mensal COM a mediana e o maior mês nomeados.
 *
 * A mediana não está desenhada na tela — mas ela não é número novo, é leitura
 * da mesma série que o gráfico desenha, e sem ela o agente não tem como
 * responder "que mês foge do padrão" sem estimar. É a diferença entre dar o
 * dado e dar o dado com a régua ao lado dele.
 */
function blocoMensal(e: EntradaContextoProjetos): BlocoContexto | null {
  if (e.serieMensal.length === 0) return null;

  const valores = e.serieMensal.map((m) => m.faturamento).sort((a, b) => a - b);
  const meio = Math.floor(valores.length / 2);
  const mediana = valores.length % 2 === 0
    ? (valores[meio - 1] + valores[meio]) / 2
    : valores[meio];
  const maior = e.serieMensal.reduce((a, b) => (b.faturamento > a.faturamento ? b : a));
  // Quantas vezes o maior mês é a mediana. `null` com mediana zero: dividir por
  // zero devolveria Infinity, e "infinitas vezes acima do normal" não é medida.
  const vezes = mediana > 0 ? maior.faturamento / mediana : null;

  return {
    id: 'mensal',
    titulo: 'Faturamento por mês',
    janela: e.janela,
    nota: 'Só OS COM data de início entram na série. As sem data aparecem no bloco de visão geral.',
    campos: [
      { rotulo: 'Meses com faturamento', valor: String(e.serieMensal.length) },
      { rotulo: 'Mediana mensal', valor: brl(mediana), nota: 'a régua do que é normal nesta carteira' },
      {
        rotulo: 'Maior mês',
        valor: `${rotuloMes(maior.mes)} · ${brl(maior.faturamento)}`,
        nota: vezes === null
          ? 'sem mediana para comparar'
          : `${num(vezes)}x a mediana`,
      },
    ],
    itens: e.serieMensal.map((m) => ({
      mes: rotuloMes(m.mes),
      faturamento: brl(m.faturamento),
    })),
  };
}

function blocoMix(e: EntradaContextoProjetos): BlocoContexto | null {
  if (!e.leitura) return null;
  const m = e.leitura.mix;
  return {
    id: 'mix',
    titulo: 'De onde veio o ativo',
    janela: e.janela,
    nota: 'Mais projeto só é saúde se for cliente novo ou aditivo.',
    campos: [
      { rotulo: 'OS ativas', valor: String(m.ativos) },
      {
        rotulo: 'Delta vs 30d anteriores',
        valor: `${m.delta > 0 ? '+' : ''}${m.delta}`,
      },
      { rotulo: MIX_ROTULO.cliente_novo, valor: String(m.fatias.cliente_novo) },
      { rotulo: MIX_ROTULO.aditivo, valor: String(m.fatias.aditivo) },
      { rotulo: MIX_ROTULO.entrega_planejada, valor: String(m.fatias.entrega_planejada) },
      { rotulo: MIX_ROTULO.inclassificavel, valor: String(m.fatias.inclassificavel) },
    ],
  };
}

function blocoCaixa(e: EntradaContextoProjetos): BlocoContexto | null {
  if (!e.leitura) return null;
  return {
    id: 'caixa',
    titulo: 'Caixa vigente',
    janela: e.janela,
    nota: 'Contratado, não faturado. Total de faturamento incompleto não entra.',
    campos: [
      { rotulo: 'Caixa vigente', valor: brl(e.leitura.caixa) },
      {
        rotulo: 'OS sem data de fim',
        valor: String(e.leitura.horizonteSemFim),
        nota: 'ficam fora do horizonte',
      },
    ],
  };
}

function blocoVisaoGeral(e: EntradaContextoProjetos): BlocoContexto {
  const k = e.kpisClientes;
  return {
    id: 'visao_geral',
    titulo: 'Faturamento e carteira',
    janela: e.janela,
    campos: [
      { rotulo: 'Faturamento total', valor: brl(k.faturamento_total) },
      {
        rotulo: 'Valor em OS sem data de início',
        valor: brl(e.valorSemData),
        nota: 'está no total acima, mas fica fora do gráfico mensal',
      },
      { rotulo: 'Clientes ativos', valor: String(k.clientes_ativos) },
      { rotulo: 'Clientes ativos fixos', valor: String(k.clientes_ativos_fixos) },
      { rotulo: 'Clientes ativos pontuais', valor: String(k.clientes_ativos_pontuais) },
      {
        rotulo: 'Ticket médio',
        valor: k.ticket_medio === null ? null : brl(k.ticket_medio),
        nota: k.ticket_medio === null ? 'sem base para calcular' : undefined,
      },
      { rotulo: 'OS ativas', valor: String(k.os_ativas) },
    ],
  };
}

function blocoMatriz(e: EntradaContextoProjetos): BlocoContexto | null {
  if (e.matriz.linhas.length === 0) return null;
  const dimensao = e.detalhe === 'centro_custo'
    ? 'centro de custo'
    : e.detalhe === 'produto' ? 'produto' : 'cliente';

  return {
    id: 'matriz',
    titulo: `Faturamento por ${dimensao} e mês`,
    janela: e.janela,
    nota: e.detalhe === 'centro_custo'
      ? 'Receita da OS dividida pelo percentual de rateio de cada centro de custo.'
      : undefined,
    campos: [
      { rotulo: `Linhas (${dimensao})`, valor: String(e.matriz.linhas.length) },
      {
        rotulo: 'Tem coluna "sem data"',
        valor: e.matriz.temSemData ? 'sim' : 'não',
      },
    ],
    // Só as linhas COM valor: linha zerada é ruído num prompt, e a tela já
    // mostra "R$ 0 mil · 0.0%" para quem quiser ver o cadastro completo.
    itens: e.matriz.linhas
      .filter((l) => l.total !== 0)
      .slice(0, 12)
      .map((l) => ({
        [dimensao]: l.label,
        total: brl(l.total),
        maior_mes: (() => {
          const entradas = Object.entries(l.porMes).filter(([, v]) => v !== 0);
          if (entradas.length === 0) return null;
          const [mes, valor] = entradas.reduce((a, b) => (b[1] > a[1] ? b : a));
          return `${rotuloMes(mes)} · ${brl(valor)}`;
        })(),
      })),
  };
}

function blocoOperacional(e: EntradaContextoProjetos): BlocoContexto {
  return {
    id: 'operacional',
    titulo: 'Contratos e entrada de clientes',
    campos: [
      { rotulo: 'Contratos a vencer em 30 dias', valor: String(e.kpisOperacional.contratos_30d) },
      { rotulo: 'Contratos vencidos', valor: String(e.kpisOperacional.contratos_vencidos) },
      { rotulo: 'Novos clientes no trimestre', valor: String(e.kpisOperacional.novos_clientes_trimestre) },
    ],
  };
}

function blocoCarga(e: EntradaContextoProjetos): BlocoContexto | null {
  if (!e.carga) return null;
  return {
    id: 'carga',
    titulo: 'Carga dos projetos',
    campos: [
      { rotulo: 'Projetos', valor: String(e.carga.projetos) },
      { rotulo: 'Pessoas no time', valor: String(e.carga.pessoas) },
      { rotulo: 'Contratado', valor: brl(e.carga.valor) },
      {
        rotulo: 'Projetos a mais que as ferramentas cobrem',
        valor: e.carga.absorviveis == null ? null : num(e.carga.absorviveis),
        nota: e.carga.absorviveis == null
          ? 'sem hora liberada ou sem hora estimada no projeto'
          : 'hora das ferramentas ÷ mediana do projeto',
      },
      { rotulo: 'Custo interno por cargo', valor: null, nota: 'pessoa não tem cargo/hora no cadastro' },
    ],
  };
}

function blocoExecucao(e: EntradaContextoProjetos): BlocoContexto {
  const k = e.kpisProjetos;
  return {
    id: 'execucao',
    titulo: 'OS e projetos',
    janela: e.janela,
    campos: [
      { rotulo: 'OS em andamento', valor: `${k.os_em_andamento} de ${k.os_total}` },
      { rotulo: 'Horas estimadas', valor: `${num(k.horas_estimadas)} h` },
      { rotulo: 'Horas realizadas', valor: `${num(k.horas_realizadas)} h` },
      {
        rotulo: 'Desvio médio entre estimado e realizado',
        valor: k.desvio_medio === null ? null : `${num(k.desvio_medio)}%`,
        nota: k.desvio_medio === null ? 'sem projeto com as duas medidas' : undefined,
      },
    ],
    itens: e.status.map((s) => ({ status: s.status, os: s.qtd })),
  };
}

export function contextoBoardProjetos(e: EntradaContextoProjetos): ContextoTela {
  const diretoria = Boolean(e.leitura || e.carga);
  const blocos = [
    blocoCarga(e),
    blocoMix(e),
    blocoCaixa(e),
    // Faturamento total operacional só na Gerencial (Tax/OSG). No Board a
    // reunião de 28/08 tirou essa leitura da frente.
    diretoria ? null : blocoVisaoGeral(e),
    blocoMensal(e),
    diretoria ? null : blocoMatriz(e),
    diretoria ? null : blocoOperacional(e),
    diretoria ? null : blocoExecucao(e),
  ].filter((b): b is BlocoContexto => b !== null);

  return {
    rotulo: e.carga
      ? 'Board · Projetos (carga, hora, gente e capacidade das ferramentas)'
      : diretoria
      ? 'Board · Projetos (mix do ativo, caixa vigente e horizonte)'
      : 'Board · Projetos (clientes, OS e faturamento)',
    filtros: {
      janela: e.janela,
      empresa: e.filtros.empresa ?? 'todas',
      cliente: e.filtros.cliente ?? 'todos',
      tipo: e.filtros.tipo ?? 'todos',
      categoria: e.filtros.categoria ?? 'todas',
      'centro de custo': e.filtros.centroCusto ?? 'todos',
    },
    blocos,
    avisos: e.falhas.length > 0 ? [`falha ao carregar: ${e.falhas.join(', ')}`] : undefined,
    sugestoes: e.carga ? SUGESTOES_CARGA : diretoria ? SUGESTOES_DIRETORIA : SUGESTOES,
  };
}
