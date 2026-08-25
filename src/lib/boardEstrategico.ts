/**
 * Camada de negócio da tela Estratégico do Board — a leitura de sócio.
 *
 * O que a distingue de `boardExecutivo.ts`: aquele mede EXECUÇÃO (projetos,
 * tarefas, pontualidade por área); este mede o NEGÓCIO (receita contratada,
 * concentração da carteira, receita em risco) e transforma tudo em uma faixa
 * de itens que **exigem decisão**.
 *
 * As fontes são as mesmas linhas que o dashboard "Clientes e OS" já monta
 * (`ClienteRow`/`OsRow`/`ProjetoRow`) — de propósito. Dois números de receita
 * com origens diferentes nas duas telas seria a pior falha possível aqui.
 *
 * Tudo neste arquivo é função pura: entra linha, sai número. Nada de data
 * "agora" implícita — `hoje` é sempre parâmetro ('YYYY-MM-DD'), como no resto
 * de `dashboardClientesOs`.
 */
import type { ClienteRow, FatiaRateio, OsRow, ProjetoRow } from '@/lib/dashboardClientesOs/types';
import { shareCentroCusto } from '@/lib/dashboardClientesOs/aggregations';
import type { ResumoAreaCadastro } from '@/lib/boardExecutivo';

// ── Limiares das regras ────────────────────────────────────────────────
// Ficam aqui, nomeados e num só lugar, porque são política de sócio — não
// devem estar espalhados como número mágico dentro de um `if` na tela.

/** Acima disto, um único cliente representa risco de dependência. */
export const LIMITE_SHARE_TOP1 = 0.2;
/** Acima disto, a carteira inteira depende de pouca gente. */
export const LIMITE_SHARE_TOP5 = 0.5;
/** Pontualidade de entrega abaixo disto é área fora da meta. */
export const META_PONTUALIDADE = 85;
/** Projeto com menos disto de horas concluídas, perto do fim do contrato, não sai. */
export const LIMITE_PROGRESSO_RISCO = 0.7;
/** Janela de renovação: contrato que vence dentro dela vira pauta. */
export const DIAS_RENOVACAO = 30;
/**
 * Abaixo disto não existe concentração a medir — com um ou dois clientes no
 * recorte, "o maior responde por 100%" é aritmética, não risco. Vale sobretudo
 * quando o sócio filtra por um cliente na barra global.
 */
export const MINIMO_CLIENTES_CONCENTRACAO = 3;

const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' → ms UTC (mesma convenção de `dashboardClientesOs`). */
function toUTCms(dateStr: string): number {
  return Date.parse(`${dateStr}T00:00:00Z`);
}

// ── Rateio por centro de custo ─────────────────────────────────────────

/**
 * Aplica o rateio de centro de custo ao faturamento das OS.
 *
 * DUAS operações independentes, e é importante não confundi-las:
 *
 * - a EMPRESA (cluster) inclui/exclui a OS inteira — atribuição, feita antes,
 *   por `ordem_servico.cluster_id`. Não muda aqui;
 * - o CENTRO DE CUSTO divide o valor da OS que sobrou. Ele é atributo da ÁREA
 *   (`estrutura_areas.cost_center_id`), um nível abaixo da empresa.
 *
 * Sem centro escolhido a coleção passa intacta (`shareCentroCusto` devolve 1).
 * Com um centro, a OS entra pela fatia dele e a que não tem fatia some — é o
 * mesmo comportamento da tela "Clientes e OS", de propósito: as duas telas
 * precisam responder o mesmo número para o mesmo recorte.
 */
export function ratearPorCentroCusto(
  os: OsRow[],
  rateioPorOs: Map<string, FatiaRateio[]>,
  centroCustoId: string | null,
): OsRow[] {
  if (!centroCustoId) return os;
  return os.reduce<OsRow[]>((acc, o) => {
    const share = shareCentroCusto(o.os_id, rateioPorOs, centroCustoId);
    if (share <= 0) return acc;
    acc.push(share === 1 ? o : { ...o, faturamento: o.faturamento * share });
    return acc;
  }, []);
}

// ── Concentração da carteira ───────────────────────────────────────────

export interface ClienteConcentracao {
  cliente_id: string;
  nome: string;
  receita: number;
  /** Fatia do total (0-1). */
  share: number;
  /** Fatia acumulada até esta linha, inclusive (0-1). */
  acumulado: number;
}

export interface Concentracao {
  total: number;
  /** Quantos clientes têm receita na janela — a base da medida. */
  clientes: number;
  /** Os `limite` maiores, em ordem decrescente de receita. */
  top: ClienteConcentracao[];
  /** `null` quando não há receita — sem denominador não existe fatia. */
  shareTop1: number | null;
  shareTop5: number | null;
  /**
   * Quantos clientes bastam para somar metade da receita. É a leitura mais
   * honesta de dependência: "4" diz mais que qualquer percentual isolado.
   * `null` sem receita.
   */
  clientesParaMetade: number | null;
}

/**
 * Concentração da carteira pela receita das OS informadas.
 *
 * Recebe as OS **já recortadas** pelo período que a tela mostra — a fatia de um
 * cliente só significa algo contra o mesmo denominador que o KPI de receita.
 */
export function concentracaoCarteira(os: OsRow[], limite = 5): Concentracao {
  const porCliente = new Map<string, { nome: string; receita: number }>();
  for (const o of os) {
    const cur = porCliente.get(o.cliente_id) ?? { nome: o.cliente_nome, receita: 0 };
    cur.receita += o.faturamento;
    porCliente.set(o.cliente_id, cur);
  }

  const ordenados = [...porCliente.entries()]
    .map(([cliente_id, v]) => ({ cliente_id, nome: v.nome, receita: v.receita }))
    // Receita negativa (estorno) existiria como ruído no topo; ordenar desc já resolve.
    .sort((a, b) => b.receita - a.receita);

  const total = ordenados.reduce((acc, c) => acc + c.receita, 0);
  if (total <= 0) {
    return { total: 0, clientes: 0, top: [], shareTop1: null, shareTop5: null, clientesParaMetade: null };
  }

  let acumuladoAbs = 0;
  let clientesParaMetade: number | null = null;
  const comAcumulado = ordenados.map((c, i) => {
    acumuladoAbs += c.receita;
    if (clientesParaMetade === null && acumuladoAbs >= total / 2) clientesParaMetade = i + 1;
    return {
      ...c,
      share: c.receita / total,
      acumulado: acumuladoAbs / total,
    };
  });

  const shareDeN = (n: number) =>
    comAcumulado.length === 0 ? null : comAcumulado[Math.min(n, comAcumulado.length) - 1].acumulado;

  return {
    total,
    clientes: comAcumulado.length,
    top: comAcumulado.slice(0, limite),
    shareTop1: shareDeN(1),
    shareTop5: shareDeN(5),
    clientesParaMetade,
  };
}

// ── Receita em risco ───────────────────────────────────────────────────

export interface FaixaContratos {
  qtd: number;
  valor: number;
  /** As maiores primeiro — a evidência que o sócio quer ver nomeada. */
  clientes: string[];
}

export interface ReceitaEmRisco {
  /** Contrato com data_fim no passado e trabalho ainda em andamento. */
  vencido: FaixaContratos;
  /** Contrato que vence na janela de renovação e não está concluído. */
  renovacao: FaixaContratos;
}

/**
 * Receita em risco pelo STATUS DO CONTRATO, não pelo período da tela.
 *
 * OS concluída fica de fora dos dois lados: contrato encerrado com a entrega
 * feita não é risco, é trabalho terminado. O que dói é contrato vencido com
 * gente ainda trabalhando (serviço sem cobertura) e contrato prestes a vencer
 * (receita que só continua se alguém renovar).
 */
export function receitaEmRisco(os: OsRow[]): ReceitaEmRisco {
  const faixa = (filtro: (o: OsRow) => boolean): FaixaContratos => {
    const linhas = os.filter(filtro).sort((a, b) => b.faturamento - a.faturamento);
    return {
      qtd: linhas.length,
      valor: linhas.reduce((acc, o) => acc + o.faturamento, 0),
      clientes: [...new Set(linhas.map((o) => o.cliente_nome))].slice(0, 3),
    };
  };

  return {
    vencido: faixa((o) => o.status_contrato === 'Vencido' && o.situacao === 'em_andamento'),
    renovacao: faixa((o) => o.status_contrato === 'Vence em 30 dias' && o.situacao !== 'concluido'),
  };
}

// ── Entrega que não cabe no contrato ───────────────────────────────────

export interface EntregaEmRisco {
  projeto_id: string;
  projeto_nome: string;
  cliente_nome: string | null;
  valor_os: number;
  /** Fração das horas planejadas já concluída (0-1). */
  progresso: number;
  /** Dias até o fim do contrato; negativo = já venceu. */
  diasParaFim: number;
}

/**
 * Projetos ativos que provavelmente não saem dentro do contrato: pouco avançado
 * e com a OS vencendo (ou já vencida).
 *
 * ATENÇÃO ao significado de `horas_realizadas`: é a soma das horas ESTIMADAS
 * das tarefas com status 'done' — não é apontamento real. Logo o par
 * estimadas/realizadas mede PROGRESSO (sempre ≤ 100%), nunca estouro. Este
 * cálculo trata como progresso justamente por isso; ler `desvio_pct` como
 * "estouro de horas" seria inventar um risco que o dado não sustenta.
 */
export function entregasEmRisco(projetos: ProjetoRow[], hoje: string): EntregaEmRisco[] {
  const h = toUTCms(hoje);
  return projetos
    .filter((p) => p.status_projeto === 'active' && p.os_data_fim && p.horas_estimadas > 0)
    .map((p) => ({
      projeto_id: p.projeto_id,
      projeto_nome: p.projeto_nome,
      cliente_nome: p.cliente_nome,
      valor_os: p.valor_os,
      progresso: p.horas_realizadas / p.horas_estimadas,
      diasParaFim: Math.round((toUTCms(p.os_data_fim as string) - h) / DAY_MS),
    }))
    .filter((p) => p.progresso < LIMITE_PROGRESSO_RISCO && p.diasParaFim <= DIAS_RENOVACAO)
    .sort((a, b) => b.valor_os - a.valor_os);
}

// ── Carteira dormindo ──────────────────────────────────────────────────

export interface CarteiraDormindo {
  qtd: number;
  /** Receita histórica dos clientes sem OS em andamento. */
  valorHistorico: number;
  clientes: string[];
}

/**
 * Cliente marcado como ativo, com histórico de receita e nenhuma OS em
 * andamento. É o churn que não avisa: ninguém cancelou, só parou de contratar.
 */
export function carteiraDormindo(clientes: ClienteRow[]): CarteiraDormindo {
  const linhas = clientes
    .filter((c) => c.ativo && c.qtd_os_ativas === 0 && c.faturamento_total > 0)
    .sort((a, b) => b.faturamento_total - a.faturamento_total);
  return {
    qtd: linhas.length,
    valorHistorico: linhas.reduce((acc, c) => acc + c.faturamento_total, 0),
    clientes: linhas.slice(0, 3).map((c) => c.cliente_nome),
  };
}

// ── A faixa "exige decisão" ────────────────────────────────────────────

export type SeveridadeAlerta = 'risco' | 'atencao';

export interface AlertaEstrategico {
  id: string;
  severidade: SeveridadeAlerta;
  /** O fato, em uma linha. */
  titulo: string;
  /** A evidência: quem, quanto, desde quando. */
  detalhe: string;
  /** R$ em jogo — ordena a faixa. `null` quando o alerta não tem valor. */
  valor: number | null;
  /** Para onde o sócio vai resolver isto. */
  rota?: string;
}

export interface EntradaAlertas {
  os: OsRow[];
  clientes: ClienteRow[];
  projetos: ProjetoRow[];
  /** Concentração já calculada sobre o mesmo recorte de receita da tela. */
  concentracao: Concentracao;
  /** Bloco E2 (21/08): áreas do CADASTRO, não mais bucket de 4 categorias. */
  areas: ResumoAreaCadastro[];
  hoje: string;
}

const brl = (v: number) =>
  v >= 1000
    ? `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`
    : `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

const listaNomes = (nomes: string[], total: number) => {
  if (nomes.length === 0) return '';
  const resto = total - nomes.length;
  return resto > 0 ? `${nomes.join(', ')} e mais ${resto}` : nomes.join(', ');
};

/**
 * Traduz o estado do negócio em uma lista de itens que pedem decisão.
 *
 * Determinístico de ponta a ponta: mesma entrada, mesma saída, sem IA. A
 * síntese de IA continua existindo na tela — mas ela COMENTA, não decide o que
 * é alerta. Uma faixa que muda de conteúdo a cada geração não seria pauta de
 * reunião de sócio.
 *
 * Ordem: risco antes de atenção; dentro de cada nível, o maior valor primeiro.
 * Alerta sem valor vai para o fim do seu nível.
 */
export function alertasEstrategicos(entrada: EntradaAlertas): AlertaEstrategico[] {
  const { os, clientes, projetos, concentracao, areas, hoje } = entrada;
  const alertas: AlertaEstrategico[] = [];

  const risco = receitaEmRisco(os);

  if (risco.vencido.qtd > 0) {
    const contratos = `${risco.vencido.qtd} ${risco.vencido.qtd === 1 ? 'contrato vencido' : 'contratos vencidos'}`;
    alertas.push({
      id: 'contrato-vencido',
      severidade: 'risco',
      // O VALOR só entra no título quando existe. Com OS sem faturamento
      // lançado, a versão anterior escrevia "R$ 0 em 1 contrato vencido com
      // trabalho em andamento" e repetia o zero na pílula de valor: o zero
      // ocupava a posição de destaque da frase e não dizia nada. O FATO é o
      // contrato vencido com gente trabalhando; o valor é o agravante, e
      // agravante que não existe não se anuncia. Visto com dado real do
      // sandbox em 21/08/2026, mas o caminho é o mesmo em produção para OS de
      // valor nulo.
      titulo: risco.vencido.valor > 0
        ? `${brl(risco.vencido.valor)} em ${contratos} com trabalho em andamento`
        : `${contratos} com trabalho em andamento`,
      detalhe: `Serviço sendo prestado fora da vigência: ${listaNomes(risco.vencido.clientes, risco.vencido.qtd)}.`
        + (risco.vencido.valor > 0 ? '' : ' Sem faturamento lançado nessas OS — o que se sabe é a contagem, não a exposição.'),
      valor: risco.vencido.valor,
      rota: '/equipe/board/dashboard-clientes-os',
    });
  }

  if (risco.renovacao.qtd > 0) {
    const vencem = `${risco.renovacao.qtd} ${risco.renovacao.qtd === 1 ? 'contrato vence' : 'contratos vencem'}`;
    alertas.push({
      id: 'renovacao-30d',
      severidade: 'atencao',
      // Mesma regra do alerta acima: sem valor lançado, quem lidera a frase é
      // a contagem.
      titulo: risco.renovacao.valor > 0
        ? `${brl(risco.renovacao.valor)} em renovação nos próximos ${DIAS_RENOVACAO} dias`
        : `${vencem} nos próximos ${DIAS_RENOVACAO} dias`,
      detalhe: risco.renovacao.valor > 0
        ? `${vencem} na janela: ${listaNomes(risco.renovacao.clientes, risco.renovacao.qtd)}.`
        : `Na janela: ${listaNomes(risco.renovacao.clientes, risco.renovacao.qtd)}. Sem faturamento lançado nessas OS — o que se sabe é a contagem, não a exposição.`,
      valor: risco.renovacao.valor,
      rota: '/equipe/board/dashboard-clientes-os',
    });
  }

  const { shareTop1, shareTop5, top, clientesParaMetade, clientes: qtdClientes } = concentracao;
  // Concentração precisa de carteira para significar algo: com um ou dois
  // clientes no recorte, "o maior responde por 100%" é aritmética, não risco.
  // Importa quando o sócio filtra por um cliente na barra global.
  const mediveis = qtdClientes >= MINIMO_CLIENTES_CONCENTRACAO;
  if (mediveis && shareTop1 !== null && shareTop1 > LIMITE_SHARE_TOP1) {
    alertas.push({
      id: 'concentracao-top1',
      severidade: 'risco',
      titulo: `${top[0].nome} responde por ${pct1(shareTop1)} da receita`,
      detalhe: `Acima do limite de ${pct1(LIMITE_SHARE_TOP1)} para um só cliente${clientesParaMetade !== null ? ` · ${clientesParaMetade} ${clientesParaMetade === 1 ? 'cliente soma' : 'clientes somam'} metade da carteira` : ''}.`,
      valor: top[0].receita,
      rota: '/equipe/board/dashboard-clientes-os',
    });
  } else if (mediveis && shareTop5 !== null && shareTop5 > LIMITE_SHARE_TOP5) {
    alertas.push({
      id: 'concentracao-top5',
      severidade: 'atencao',
      titulo: `Os 5 maiores clientes somam ${pct1(shareTop5)} da receita`,
      detalhe: `Acima do limite de ${pct1(LIMITE_SHARE_TOP5)}${clientesParaMetade !== null ? ` · ${clientesParaMetade} ${clientesParaMetade === 1 ? 'cliente soma' : 'clientes somam'} metade da carteira` : ''}.`,
      valor: top.slice(0, 5).reduce((acc, c) => acc + c.receita, 0),
      rota: '/equipe/board/dashboard-clientes-os',
    });
  }

  const entregas = entregasEmRisco(projetos, hoje);
  if (entregas.length > 0) {
    const valor = entregas.reduce((acc, e) => acc + e.valor_os, 0);
    const pior = entregas[0];
    alertas.push({
      id: 'entrega-fora-do-contrato',
      severidade: 'risco',
      titulo: `${entregas.length} ${entregas.length === 1 ? 'projeto ativo não cabe' : 'projetos ativos não cabem'} no prazo do contrato`,
      detalhe: `Maior exposição: ${pior.projeto_nome}${pior.cliente_nome ? ` (${pior.cliente_nome})` : ''} — ${Math.round(pior.progresso * 100)}% das horas concluídas e o contrato ${pior.diasParaFim < 0 ? `venceu há ${Math.abs(pior.diasParaFim)} dias` : `vence em ${pior.diasParaFim} dias`}.`,
      valor,
      rota: '/equipe/board/capacidade',
    });
  }

  const dormindo = carteiraDormindo(clientes);
  if (dormindo.qtd > 0) {
    alertas.push({
      id: 'carteira-dormindo',
      severidade: 'atencao',
      titulo: `${dormindo.qtd} ${dormindo.qtd === 1 ? 'cliente ativo sem OS' : 'clientes ativos sem OS'} em andamento`,
      detalhe: `Já contrataram ${brl(dormindo.valorHistorico)} e não têm trabalho em curso: ${listaNomes(dormindo.clientes, dormindo.qtd)}.`,
      // O valor histórico não é receita em jogo hoje — não entra na ordenação
      // por dinheiro, senão a carteira dormindo dominaria a faixa inteira.
      valor: null,
      rota: '/equipe/board/clientes',
    });
  }

  for (const a of areas) {
    if (a.pontualidade !== null && a.pontualidade < META_PONTUALIDADE && a.concluidas > 0) {
      alertas.push({
        id: `pontualidade-${a.id}`,
        severidade: 'atencao',
        titulo: `${a.label} entregou ${a.pontualidade}% no prazo`,
        detalhe: `Meta de ${META_PONTUALIDADE}% · ${a.concluidas} ${a.concluidas === 1 ? 'entrega' : 'entregas'} no período, ${a.emRisco + a.atrasados} ${a.emRisco + a.atrasados === 1 ? 'projeto fora' : 'projetos fora'} de prazo.`,
        valor: null,
        rota: '/equipe/board/performance',
      });
    }
  }

  const peso = (s: SeveridadeAlerta) => (s === 'risco' ? 0 : 1);
  return alertas.sort((a, b) => {
    if (peso(a.severidade) !== peso(b.severidade)) return peso(a.severidade) - peso(b.severidade);
    // Sem valor vai para o fim do nível: o que tem dinheiro medido decide antes.
    if ((a.valor ?? -1) !== (b.valor ?? -1)) return (b.valor ?? -1) - (a.valor ?? -1);
    return a.id.localeCompare(b.id);
  });
}

// ── Receita do ano corrente ────────────────────────────────────────────

export interface ReceitaAno {
  /** Receita das OS iniciadas no ano de `hoje`, até hoje. */
  atual: number;
  /** Mesmos meses do ano anterior. */
  anterior: number;
  /** `null` quando não há base no ano anterior. */
  variacao: number | null;
  /** Meses 'YYYY-MM' do ano corrente que entraram na conta. */
  meses: string[];
  /** OS sem `data_inicio` — ficam fora dos dois lados e a tela precisa dizer. */
  semData: number;
  /**
   * Valor (R$) das OS sem `data_inicio` -- Bloco D/D3, 21/08: antes só a
   * CONTAGEM aparecia na tela, o valor ficava escondido. Confirmado: é 37% do
   * total (R$ 418k de R$ 1.139k), grande demais pra viver em nota de rodapé.
   * `atual + semDataValor` é o "valor total" que a tela de Projetos mostra.
   */
  semDataValor: number;
}

/**
 * Receita contratada no ano corrente contra os mesmos meses do ano anterior.
 *
 * Por que ano corrente e não a janela de 7/30/90 dias do filtro: receita de
 * consultoria é lumpy — uma OS grande num mês e nenhuma no seguinte. "Últimos
 * 7 dias" não é um número de sócio, é ruído. A tela rotula esta janela
 * explicitamente para não se confundir com a janela de execução.
 *
 * Base de data: `data_inicio` da OS (a mesma de `comparativoAnoAnterior`, para
 * as duas telas não divergirem). OS sem data fica fora e é reportada.
 */
export function receitaAnoCorrente(os: OsRow[], hoje: string): ReceitaAno {
  const anoAtual = Number(hoje.slice(0, 4));
  const mesAtual = Number(hoje.slice(5, 7));
  const meses = Array.from({ length: mesAtual }, (_, i) => `${anoAtual}-${String(i + 1).padStart(2, '0')}`);
  const mesesAnteriores = meses.map((m) => `${anoAtual - 1}-${m.slice(5, 7)}`);

  const soma = (alvo: string[]) => {
    const set = new Set(alvo);
    return os.reduce(
      (acc, o) => (o.data_inicio && set.has(o.data_inicio.slice(0, 7)) ? acc + o.faturamento : acc),
      0,
    );
  };

  const atual = soma(meses);
  const anterior = soma(mesesAnteriores);
  const semDataOs = os.filter((o) => !o.data_inicio);
  return {
    atual,
    anterior,
    variacao: anterior > 0 ? (atual - anterior) / anterior : null,
    meses,
    semData: semDataOs.length,
    semDataValor: semDataOs.reduce((acc, o) => acc + o.faturamento, 0),
  };
}

/** Uma barra do gráfico de receita mensal: mês do ano corrente × mesmo mês do anterior. */
export interface MesComparado {
  mes: string; // 'YYYY-MM' do ano corrente
  atual: number;
  anterior: number;
}

/** Série mensal do ano corrente com o mesmo mês do ano anterior ao lado. */
export function serieReceitaComparada(os: OsRow[], hoje: string): MesComparado[] {
  const anoAtual = Number(hoje.slice(0, 4));
  const mesAtual = Number(hoje.slice(5, 7));

  const porMes = new Map<string, number>();
  for (const o of os) {
    if (!o.data_inicio) continue;
    const m = o.data_inicio.slice(0, 7);
    porMes.set(m, (porMes.get(m) ?? 0) + o.faturamento);
  }

  return Array.from({ length: mesAtual }, (_, i) => {
    const mm = String(i + 1).padStart(2, '0');
    return {
      mes: `${anoAtual}-${mm}`,
      atual: porMes.get(`${anoAtual}-${mm}`) ?? 0,
      anterior: porMes.get(`${anoAtual - 1}-${mm}`) ?? 0,
    };
  });
}

/** Ticket médio por OS ativa — `null` sem OS ativa (não é zero, é indefinido). */
export function ticketMedioAtivo(os: OsRow[]): number | null {
  const ativas = os.filter((o) => o.situacao === 'em_andamento');
  if (ativas.length === 0) return null;
  return ativas.reduce((acc, o) => acc + o.faturamento, 0) / ativas.length;
}
