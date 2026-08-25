/**
 * Snapshot do Board Estratégico para o Agente PSA.
 *
 * Função PURA, e é a peça central do desenho: ela recebe os MESMOS valores já
 * calculados que a tela desenha (`receitaAnoCorrente`, `concentracaoCarteira`,
 * `saudeProjetos`, ...) e os traduz em texto rotulado. O agente nunca consulta
 * o banco para responder — se consultasse, a tela mostraria R$ 4,1 mi e ele
 * responderia R$ 3,8 mi, e ninguém saberia qual dos dois está certo.
 *
 * Três disciplinas aqui:
 *  1. **Formatação igual à da tela.** `brl` é o mesmo de `BoardConcentracao`.
 *     Número que o agente cita tem que ser localizável na tela com Ctrl+F.
 *  2. **`null` é "não apurado", nunca 0.** Consulta que falhou vira `null` e
 *     entra em `avisos` — o prompt manda tratar como desconhecido.
 *  3. **A janela viaja com o bloco.** O Estratégico tem DUAS (negócio: ano
 *     corrente; execução: 7/30/90d), e comparar as duas sem dizer que são
 *     diferentes é a mentira mais fácil de contar aqui.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';
import type {
  AlertaEstrategico, Concentracao, ReceitaAno, ReceitaEmRisco,
} from '@/lib/boardEstrategico';
import type { ResumoAreaCadastro, RoiConsolidado, SaudeProjetos } from '@/lib/boardExecutivo';
import type { FaixaEmpresaPreenchimento, MetricaFaixaEmpresa } from '@/lib/preenchimentoSistema';

/** Mesma formatação de `BoardConcentracao` — o agente cita o que a tela mostra. */
const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

const pct = (v: number | null, casas = 0) =>
  v === null ? null : `${v.toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`;

const share = (v: number | null) => (v === null ? null : pct(v * 100, 1));

const lacuna = (m: MetricaFaixaEmpresa): string | null =>
  m.comLacuna === null || m.total === null
    ? null
    : `${m.comLacuna} de ${m.total}${m.nomes.length ? ` (ex.: ${m.nomes.slice(0, 3).join(', ')})` : ''}`;

export interface EntradaContextoBoard {
  /** Rótulo da janela de negócio, ex: "2026 até agosto". */
  janelaReceita: string;
  /** Rótulo da janela de execução, ex: "últimos 30 dias". */
  janelaExecucao: string;
  filtros: {
    periodo: string;
    /** Rótulo do centro de custo, `null` = todos. */
    centroCusto: string | null;
    /** Rótulo da empresa da barra global, `null` = todas. */
    empresa: string | null;
  };
  cicloAtivo: string | null;
  receita: ReceitaAno;
  emRisco: ReceitaEmRisco;
  concentracao: Concentracao;
  clientesComReceita: number;
  saude: SaudeProjetos;
  /** `null` enquanto a consulta de horas não respondeu. */
  totalHoras: number | null;
  roi: RoiConsolidado;
  areas: ResumoAreaCadastro[];
  alertas: AlertaEstrategico[];
  projetosCriticos: { name: string; computed_status: string; area_name?: string | null }[];
  preenchimento: FaixaEmpresaPreenchimento;
  /** Notas que a própria tela exibe (rateio, escopo de RLS, OS sem data). */
  notas: { receita?: string; areas?: string };
  /** Rótulos das consultas que falharam. Viram `avisos`. */
  falhas: string[];
}

/** Perguntas de partida. Ficam aqui porque dependem do que a tela tem. */
const SUGESTOES = [
  'De quem depende a minha receita hoje?',
  'O que exige decisão nesta semana?',
  'Qual área está entregando fora do prazo e quanto isso vale?',
];

function blocoDecisao(e: EntradaContextoBoard): BlocoContexto | null {
  if (e.alertas.length === 0) return null;
  return {
    id: 'alertas',
    titulo: 'O que exige decisão (faixa de alertas da tela)',
    campos: [{ rotulo: 'Alertas abertos', valor: String(e.alertas.length) }],
    itens: e.alertas.slice(0, 8).map((a) => ({
      severidade: a.severidade,
      alerta: a.titulo,
      evidencia: a.detalhe,
      // Zero NAO vira "R$ 0 mil": nesses alertas o zero significa "faturamento
      // nao lancado nessas OS", e a propria evidencia diz isso ("o que se sabe
      // e a contagem, nao a exposicao"). Escrever R$ 0 mil ao lado do titulo
      // afirma exposicao nula, que e o oposto de "nao sei".
      valor: a.valor ? brl(a.valor) : null,
    })),
  };
}

function blocoReceita(e: EntradaContextoBoard): BlocoContexto {
  return {
    id: 'receita',
    titulo: 'Receita contratada (negócio)',
    janela: e.janelaReceita,
    nota: e.notas.receita,
    campos: [
      { rotulo: 'Receita do ano corrente', valor: brl(e.receita.atual) },
      { rotulo: 'Mesmos meses do ano anterior', valor: brl(e.receita.anterior) },
      {
        rotulo: 'Variação contra o ano anterior',
        valor: pct(e.receita.variacao),
        nota: e.receita.variacao === null ? 'sem base no ano anterior' : undefined,
      },
      {
        rotulo: 'OS sem data de início (fora da janela)',
        valor: `${e.receita.semData} OS, ${brl(e.receita.semDataValor)}`,
        nota: 'não dá para atribuir ano — fica fora dos dois lados da comparação',
      },
      { rotulo: 'Contrato vencido com trabalho em andamento', valor: `${e.emRisco.vencido.qtd} OS, ${brl(e.emRisco.vencido.valor)}` },
      { rotulo: 'Contrato a vencer em 30 dias', valor: `${e.emRisco.renovacao.qtd} OS, ${brl(e.emRisco.renovacao.valor)}` },
    ],
    itens: [
      ...e.emRisco.vencido.clientes.map((c) => ({ situacao: 'contrato vencido', cliente: c })),
      ...e.emRisco.renovacao.clientes.map((c) => ({ situacao: 'vence em 30 dias', cliente: c })),
    ],
  };
}

function blocoConcentracao(e: EntradaContextoBoard): BlocoContexto {
  return {
    id: 'concentracao',
    titulo: 'De quem a receita depende (concentração da carteira)',
    janela: e.janelaReceita,
    nota: 'Mesmo denominador do KPI de receita do ano corrente.',
    campos: [
      { rotulo: 'Clientes com receita na janela', valor: String(e.clientesComReceita) },
      { rotulo: 'Fatia do maior cliente', valor: share(e.concentracao.shareTop1) },
      { rotulo: 'Fatia dos 5 maiores', valor: share(e.concentracao.shareTop5) },
      {
        rotulo: 'Clientes que somam metade da receita',
        valor: e.concentracao.clientesParaMetade === null ? null : String(e.concentracao.clientesParaMetade),
      },
    ],
    itens: e.concentracao.top.map((c) => ({
      cliente: c.nome,
      receita: brl(c.receita),
      fatia: share(c.share),
      acumulado: share(c.acumulado),
    })),
  };
}

function blocoExecucao(e: EntradaContextoBoard): BlocoContexto {
  return {
    id: 'execucao',
    titulo: 'Execução (projetos e entrega)',
    janela: e.janelaExecucao,
    campos: [
      { rotulo: 'Projetos ativos', valor: String(e.saude.total) },
      { rotulo: 'Projetos em dia', valor: String(e.saude.emDia) },
      { rotulo: 'Projetos em risco', valor: String(e.saude.emRisco) },
      { rotulo: 'Projetos atrasados', valor: String(e.saude.atrasados) },
      { rotulo: 'Pontualidade dos projetos', valor: pct(e.saude.pontualidade) },
      {
        rotulo: 'Horas alocadas no escopo',
        valor: e.totalHoras === null ? null : `${e.totalHoras.toLocaleString('pt-BR')} h`,
        nota: e.totalHoras === null ? 'consulta ainda não respondeu' : 'estimated_hours de toda tarefa da janela',
      },
      { rotulo: 'Ciclo de avaliação ativo', valor: e.cicloAtivo },
    ],
    itens: e.projetosCriticos.slice(0, 6).map((p) => ({
      projeto: p.name,
      status: p.computed_status,
      area: p.area_name ?? null,
    })),
  };
}

function blocoAreas(e: EntradaContextoBoard): BlocoContexto {
  return {
    id: 'areas',
    titulo: 'Áreas em um olhar',
    janela: e.janelaExecucao,
    nota: e.notas.areas
      ?? 'Pontualidade = % das ENTREGAS concluídas no prazo. A unidade muda por linha (tarefas x entregáveis) e está em cada uma.',
    campos: [{ rotulo: 'Áreas ativas no cadastro', valor: String(e.areas.length) }],
    itens: e.areas.map((a) => ({
      area: a.label,
      projetos: a.projetos,
      em_risco: a.emRisco,
      atrasados: a.atrasados,
      concluidas: `${a.concluidas} ${a.unidade}`,
      pontualidade: pct(a.pontualidade),
    })),
  };
}

function blocoRoi(e: EntradaContextoBoard): BlocoContexto {
  return {
    id: 'roi',
    titulo: 'Resultado econômico das melhorias (ROI validado)',
    nota: 'Só melhorias JÁ AVALIADAS. Não é projeção.',
    campos: [
      { rotulo: 'Economia mensal validada', valor: brl(e.roi.economiaMensal) },
      { rotulo: 'Economia anual validada', valor: brl(e.roi.economiaAnual) },
      { rotulo: 'Investimento', valor: brl(e.roi.investimento) },
      {
        rotulo: 'ROI',
        valor: pct(e.roi.roiPct),
        nota: e.roi.roiPct === null ? 'sem investimento cadastrado' : undefined,
      },
      { rotulo: 'Melhorias avaliadas', valor: String(e.roi.melhorias) },
    ],
  };
}

function blocoPreenchimento(e: EntradaContextoBoard): BlocoContexto {
  return {
    id: 'preenchimento',
    titulo: 'Preenchimento do sistema (o que falta cadastrar)',
    nota: 'Não é resultado de trabalho: é a confiabilidade dos números acima.',
    campos: [
      { rotulo: 'OS sem data de início', valor: lacuna(e.preenchimento.osSemDataInicio) },
      { rotulo: 'Clientes sem UF', valor: lacuna(e.preenchimento.clientesSemUf) },
      { rotulo: 'Clientes sem categoria', valor: lacuna(e.preenchimento.clientesSemCategoria) },
    ],
  };
}

/**
 * Blocos em ordem de importância: o corte por tamanho no prompt descarta os do
 * FIM, então decisão e receita vêm antes de preenchimento.
 */
export function contextoBoardEstrategico(e: EntradaContextoBoard): ContextoTela {
  const blocos = [
    blocoDecisao(e),
    blocoReceita(e),
    blocoConcentracao(e),
    blocoExecucao(e),
    blocoAreas(e),
    blocoRoi(e),
    blocoPreenchimento(e),
  ].filter((b): b is BlocoContexto => b !== null);

  const filtros: Record<string, string> = {
    'janela de execução': e.janelaExecucao,
    'janela de negócio': e.janelaReceita,
    empresa: e.filtros.empresa ?? 'todas',
    'centro de custo': e.filtros.centroCusto ?? 'todos',
  };

  return {
    rotulo: 'Board · Estratégico (negócio, risco e entrega)',
    filtros,
    blocos,
    avisos: e.falhas.length > 0 ? [`falha ao carregar: ${e.falhas.join(', ')}`] : undefined,
    sugestoes: SUGESTOES,
  };
}
