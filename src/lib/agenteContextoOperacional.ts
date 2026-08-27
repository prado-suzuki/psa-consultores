/**
 * Snapshot do Board Operacional para o Agente PSA.
 *
 * Terceiro irmão de `agenteContextoBoard` / `agenteContextoDesempenho`, mesmas
 * três disciplinas: formatação igual à da tela, `null` é "não apurado" e nunca
 * 0, e a janela viaja com o bloco.
 *
 * Esta tela tem uma peculiaridade que o snapshot precisa carregar inteira: cada
 * KPI dela declara o próprio ESCOPO ("escopo: PSA Norte", "escopo: todas as
 * empresas") porque nem toda fonte alcança o recorte por empresa da mesma
 * forma. Perder esse rótulo aqui faria o agente somar número de escopos
 * diferentes — e é o erro mais fácil de cometer nesta tela, porque os dois
 * números parecem comparáveis.
 *
 * Nasceu de uma remoção: o banner "Dados incompletos — os números abaixo podem
 * estar errados" saiu da grade. Ele NÃO foi descartado: as falhas viram
 * `avisos`, o painel do agente as desenha com destaque próprio, e o ícone ao
 * lado do título fica com ponto vermelho enquanto houver falha. É o que impede
 * que consulta que falhou volte a passar por dado real.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';
import type { RoiConsolidado, SaudeProjetos } from '@/lib/boardExecutivo';

/** Projetos listados no snapshot. Fila inteira estouraria o contexto. */
const MAX_PROJETOS = 8;

export interface DesvioEntrega {
  /** Média ASSINADA em dias: negativo = entregou antes do prazo. */
  dias: number | null;
  amostra: number;
  atrasadas: number;
}

export interface EntradaContextoOperacional {
  /** Rótulo da janela, ex: "últimos 30 dias". */
  janela: string;
  /** Rótulo do recorte de empresa, ex: "PSA Norte" ou "todas as empresas". */
  escopo: string;
  saude: SaudeProjetos;
  desvio: DesvioEntrega;
  roi: RoiConsolidado;
  metas: {
    total: number;
    individuais: number;
    emRisco: number;
    /** `null` quando não há meta individual — média de nada não é 0. */
    progresso: number | null;
    /** Escopo das metas, que pode ser MAIS LARGO que o da tela. */
    escopoLabel: string;
  };
  pessoas: { total: number; escopoLabel: string };
  projetosCriticos: { nome: string; status: string; cliente: string | null }[];
  /** Rótulos das consultas que falharam. Viram `avisos`. */
  falhas: string[];
}

const SUGESTOES = [
  'Onde estão os atrasos e de quem são os projetos?',
  'A pontualidade caiu ou o escopo mudou?',
  'A economia validada está sustentada por quantas melhorias?',
];

const pct = (v: number | null) => (v === null ? null : `${Math.round(v)}%`);

/** Mesma formatação do KPI da tela: "R$ 320k". */
const brlK = (v: number) => `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')}k`;

/** "+2.0d" / "-1.5d", com o sinal explícito, como o KPI desenha. */
const diasAssinados = (v: number | null) =>
  v === null ? null : `${v > 0 ? '+' : ''}${v.toFixed(1)}d`;

function blocoEntrega(e: EntradaContextoOperacional): BlocoContexto {
  return {
    id: 'entrega',
    titulo: 'Projetos e entrega',
    janela: e.janela,
    nota: `escopo: ${e.escopo}`,
    campos: [
      { rotulo: 'Projetos ativos', valor: String(e.saude.total) },
      { rotulo: 'No prazo', valor: String(e.saude.emDia) },
      { rotulo: 'Em risco', valor: String(e.saude.emRisco) },
      { rotulo: 'Atrasados', valor: String(e.saude.atrasados) },
      {
        rotulo: 'Taxa de pontualidade',
        // Escopo vazio não tem pontualidade: 0% afirmaria desempenho ruim onde
        // não há projeto nenhum para avaliar. É o que a tela faz com o "—".
        valor: e.saude.total > 0 ? pct(e.saude.pontualidade) : null,
        nota: e.saude.total > 0
          ? `sobre ${e.saude.total} projetos`
          : 'escopo vazio — não há projeto para avaliar',
      },
      {
        rotulo: 'Desvio médio de prazo',
        valor: diasAssinados(e.desvio.dias),
        nota: e.desvio.amostra > 0
          ? `negativo = antes do prazo · ${e.desvio.atrasadas} de ${e.desvio.amostra} entregas fora do prazo`
          : 'sem base no período — nenhuma entrega para medir',
      },
    ],
    itens: e.projetosCriticos.slice(0, MAX_PROJETOS).map((p) => ({
      projeto: p.nome,
      situacao: p.status,
      cliente: p.cliente,
    })),
  };
}

function blocoEconomia(e: EntradaContextoOperacional): BlocoContexto {
  return {
    id: 'economia',
    titulo: 'Economia validada das melhorias',
    janela: 'acumulado (não é a janela da execução)',
    nota: `escopo: ${e.escopo}`,
    campos: [
      { rotulo: 'Economia validada por ano', valor: brlK(e.roi.economiaAnual) },
      {
        rotulo: 'ROI',
        // Sem investimento cadastrado não existe ROI — a tela diz "em
        // construção" e o snapshot diz "não apurado". Nunca 0%.
        valor: e.roi.roiPct === null ? null : pct(e.roi.roiPct),
        nota: e.roi.roiPct === null
          ? 'sem investimento cadastrado — ROI em construção, não é 0%'
          : undefined,
      },
      { rotulo: 'Melhorias que sustentam o número', valor: String(e.roi.melhorias) },
    ],
  };
}

function blocoMetasEquipe(e: EntradaContextoOperacional): BlocoContexto {
  return {
    id: 'metas-equipe',
    titulo: 'Metas do ciclo e equipe',
    janela: 'ciclo ativo',
    nota: 'ATENÇÃO ao escopo: metas e pessoas podem ter recorte MAIS LARGO que o '
      + 'dos projetos, porque a atribuição é responsável → equipe → área. '
      + 'Cada campo abaixo diz o escopo dele; não some campos de escopos diferentes.',
    campos: [
      { rotulo: 'Metas no ciclo', valor: String(e.metas.total), nota: `escopo: ${e.metas.escopoLabel}` },
      { rotulo: 'Metas individuais', valor: String(e.metas.individuais) },
      { rotulo: 'Metas em risco', valor: String(e.metas.emRisco) },
      {
        rotulo: 'Progresso médio das metas individuais',
        valor: pct(e.metas.progresso),
        nota: e.metas.individuais === 0
          ? 'nenhuma meta individual no escopo — média de nada não é 0%'
          : undefined,
      },
      { rotulo: 'Pessoas no escopo', valor: String(e.pessoas.total), nota: `escopo: ${e.pessoas.escopoLabel}` },
    ],
  };
}

export function contextoBoardOperacional(e: EntradaContextoOperacional): ContextoTela {
  return {
    rotulo: 'Board · Operacional (projetos e tarefas de Tax e OSG, equipe e economia validada)',
    filtros: { janela: e.janela, empresa: e.escopo },
    // Ordem = importância: o corte por tamanho descarta os do fim.
    blocos: [blocoEntrega(e), blocoMetasEquipe(e), blocoEconomia(e)],
    avisos: e.falhas.length > 0 ? [`falha ao carregar: ${e.falhas.join(', ')}`] : undefined,
    sugestoes: SUGESTOES,
  };
}
