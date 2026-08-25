/**
 * Snapshot de Desempenho › Visão Geral para o Agente PSA.
 *
 * Irmão de `agenteContextoBoard`, e com as mesmas três disciplinas: formatação
 * idêntica à da tela, `null` é "não apurado" e nunca 0, e a janela viaja com o
 * bloco. Aqui a janela é o CICLO — comparar PPR de ciclos diferentes sem dizer
 * que são ciclos diferentes é a mentira mais fácil de contar nesta tela.
 *
 * Este arquivo nasceu de uma remoção: o card "Análise IA do Ciclo" e o card
 * "Alertas que Requerem Ação" saíram da grade, e o conteúdo deles passou a
 * viver atrás do ícone ao lado do título. Para que a mudança não perdesse
 * informação, os alertas — que a tela já calculava — passaram a ser publicados
 * aqui, no bloco `alertas`, que é de onde `AgentePainelDecisao` os desenha.
 *
 * Uma regra própria desta tela, que não existe no Estratégico: aqui há NOME de
 * pessoa. O bloco de PPR entra recortado (`MAX_PESSOAS`) e ordenado, e nada de
 * salário, cargo ou histórico disciplinar chega ao prompt — o agente conversa
 * sobre progresso de meta, não sobre a pessoa.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';

/** Teto de pessoas no snapshot. Time inteiro estouraria o contexto e diluiria
 *  a pergunta; o extremo (quem está abaixo) é o que decide conversa. */
const MAX_PESSOAS = 12;

const BLOCO_ALERTAS = 'alertas';

const pct = (v: number | null) => (v === null ? null : `${Math.round(v)}%`);
const num = (v: number | null) => (v === null ? null : String(v));

export type SeveridadeAlerta = 'risco' | 'atencao' | 'info';

export interface AlertaDesempenho {
  severidade: SeveridadeAlerta;
  titulo: string;
  detalhe: string;
}

export interface PessoaPpr {
  nome: string;
  ppr: number;
  classificacao: string;
  metas: number;
  metasAtivas: number;
  feedbacks: number;
  reunioes: number;
}

export interface EntradaContextoDesempenho {
  ciclo: {
    nome: string | null;
    status: string | null;
    /** Data de encerramento, como a tela a mostra (ISO ou `null`). */
    fim: string | null;
    pctDecorrido: number;
    analiseSemestral: string | null;
  };
  /** `null` = a consulta de overview ainda não respondeu (ou falhou). */
  totalMetas: number | null;
  metasConcluidas: number | null;
  metasEmRisco: number | null;
  mediaProgresso: number | null;
  feedbacks: { total: number | null; reconhecimento: number; desenvolvimento: number };
  reunioes: { noCiclo: number; membrosSem1a1: number; itensVencidos: number };
  ppr: PessoaPpr[];
  /** Os mesmos alertas que a tela calculava para o card removido. */
  alertas: AlertaDesempenho[];
  /** Rótulos das consultas que falharam. Viram `avisos`. */
  falhas: string[];
}

const SUGESTOES = [
  'Quem está abaixo da linha e o que explica isso?',
  'O ciclo vai fechar dentro da meta com o ritmo atual?',
  'Onde a falta de 1:1 está batendo com meta em risco?',
];

/**
 * O bloco que o painel desenha como "Exige decisão".
 *
 * Mesma forma de item do Estratégico (`severidade`/`alerta`/`evidencia`/`valor`)
 * de propósito: `itensDeDecisao` é um só para as duas telas, e forma diferente
 * por tela viraria um `if` por tela dentro do painel.
 */
function blocoDecisao(e: EntradaContextoDesempenho): BlocoContexto | null {
  if (e.alertas.length === 0) return null;
  return {
    id: BLOCO_ALERTAS,
    titulo: 'O que exige decisão (alertas do ciclo)',
    janela: e.ciclo.nome ? `ciclo ${e.ciclo.nome}` : 'ciclo ativo',
    campos: [{ rotulo: 'Alertas abertos', valor: String(e.alertas.length) }],
    itens: e.alertas.slice(0, 8).map((a) => ({
      // 'info' vira 'atencao': o painel tem duas gravidades, e um terceiro tom
      // para "informativo" só ensinaria o leitor a ignorar cor.
      severidade: a.severidade === 'risco' ? 'risco' : 'atencao',
      alerta: a.titulo,
      evidencia: a.detalhe,
      valor: null,
    })),
  };
}

function blocoCiclo(e: EntradaContextoDesempenho): BlocoContexto {
  return {
    id: 'ciclo',
    titulo: 'O ciclo',
    janela: e.ciclo.nome ?? 'ciclo ativo',
    campos: [
      { rotulo: 'Ciclo', valor: e.ciclo.nome },
      { rotulo: 'Situação', valor: e.ciclo.status },
      {
        rotulo: 'Decorrido',
        valor: pct(e.ciclo.pctDecorrido),
        nota: 'tempo do ciclo já passado — a referência para julgar se o progresso está no ritmo',
      },
      { rotulo: 'Encerramento', valor: e.ciclo.fim },
      { rotulo: 'Análise semestral', valor: e.ciclo.analiseSemestral },
    ],
  };
}

function blocoMetas(e: EntradaContextoDesempenho): BlocoContexto {
  return {
    id: 'metas',
    titulo: 'Metas e progresso',
    janela: e.ciclo.nome ? `ciclo ${e.ciclo.nome}` : 'ciclo ativo',
    campos: [
      { rotulo: 'Total de metas', valor: num(e.totalMetas) },
      { rotulo: 'Metas concluídas', valor: num(e.metasConcluidas) },
      {
        rotulo: 'Metas em risco',
        valor: num(e.metasEmRisco),
        nota: 'meta ativa com progresso abaixo de 70%',
      },
      {
        rotulo: 'Média de progresso',
        valor: pct(e.mediaProgresso),
        nota: 'média simples entre as metas do ciclo — não é ponderada por peso',
      },
    ],
  };
}

function blocoPessoas(e: EntradaContextoDesempenho): BlocoContexto | null {
  if (e.ppr.length === 0) return null;
  return {
    id: 'ppr',
    titulo: 'PPR por pessoa (o que a tela lista)',
    janela: e.ciclo.nome ? `ciclo ${e.ciclo.nome}` : 'ciclo ativo',
    nota: 'PPR é a média das metas da pessoa PONDERADA pelo peso de cada meta. '
      + 'Progresso de meta, e nada além disso: cargo, salário e histórico não estão aqui.',
    campos: [
      { rotulo: 'Pessoas com meta no ciclo', valor: String(e.ppr.length) },
      {
        rotulo: 'Pessoas abaixo de 70%',
        valor: String(e.ppr.filter((p) => p.ppr < 70).length),
      },
    ],
    itens: e.ppr.slice(0, MAX_PESSOAS).map((p) => ({
      pessoa: p.nome,
      ppr: `${p.ppr}%`,
      classificacao: p.classificacao,
      metas: p.metas,
      'metas ativas': p.metasAtivas,
      feedbacks: p.feedbacks,
      '1:1s': p.reunioes,
    })),
  };
}

function blocoConversas(e: EntradaContextoDesempenho): BlocoContexto {
  return {
    id: 'conversas',
    titulo: 'Feedback e 1:1',
    janela: e.ciclo.nome ? `ciclo ${e.ciclo.nome}` : 'ciclo ativo',
    campos: [
      { rotulo: 'Feedbacks no ciclo', valor: num(e.feedbacks.total) },
      { rotulo: 'Reconhecimento', valor: String(e.feedbacks.reconhecimento) },
      { rotulo: 'Desenvolvimento', valor: String(e.feedbacks.desenvolvimento) },
      { rotulo: '1:1s realizados no ciclo', valor: String(e.reunioes.noCiclo) },
      {
        rotulo: 'Pessoas sem 1:1',
        valor: String(e.reunioes.membrosSem1a1),
        nota: 'sem 1:1 registrado nos últimos 30 dias',
      },
      { rotulo: 'Itens de ação vencidos', valor: String(e.reunioes.itensVencidos) },
    ],
  };
}

export function contextoBoardDesempenho(e: EntradaContextoDesempenho): ContextoTela {
  // Ordem = importância: o corte por tamanho descarta os do fim.
  const blocos = [
    blocoDecisao(e),
    blocoMetas(e),
    blocoCiclo(e),
    blocoConversas(e),
    blocoPessoas(e),
  ].filter((b): b is BlocoContexto => b !== null);

  return {
    rotulo: 'Desempenho · Visão geral (metas, PPR e 1:1 do ciclo)',
    filtros: { ciclo: e.ciclo.nome ?? 'ativo' },
    blocos,
    avisos: e.falhas.length > 0 ? [`falha ao carregar: ${e.falhas.join(', ')}`] : undefined,
    sugestoes: SUGESTOES,
  };
}

// ── Desempenho › Decisões ───────────────────────────────────────────────────
// Tela irmã, no mesmo arquivo porque compartilha domínio, vocabulário (PPR,
// classificação) e a mesma disciplina de `null`.

export interface MembroDecisaoContexto {
  nome: string;
  ppr: number;
  classificacao: string;
  metas: number;
  metasConcluidas: number;
  feedbacksPositivos: number;
  feedbacksDesenvolvimento: number;
  /** Decisão já registrada, se houver. `null` = ainda não decidido. */
  recomendacao: string | null;
  /** Justificativa que a IA de recomendações escreveu para a linha. */
  justificativa: string | null;
}

export interface EntradaContextoDecisoes {
  ciclo: string | null;
  /** Síntese gerada por `gerar-recomendacoes-pessoas`, quando o usuário pediu. */
  sintese: string | null;
  /** `null` enquanto a consulta não respondeu — nunca lista vazia por omissão. */
  membros: MembroDecisaoContexto[] | null;
  falhas: string[];
}

const SUGESTOES_DECISOES = [
  'Quem está claramente acima da linha neste ciclo?',
  'Onde o PPR e os feedbacks contam histórias diferentes?',
  'Que decisões deste ciclo ainda estão sem registro?',
];

export function contextoBoardDecisoes(e: EntradaContextoDecisoes): ContextoTela {
  const blocos: BlocoContexto[] = [{
    id: 'decisoes',
    titulo: 'Decisões de pessoas do ciclo',
    janela: e.ciclo ? `ciclo ${e.ciclo}` : 'ciclo ativo',
    nota: 'PPR e feedbacks do ciclo, e a decisão já registrada quando existe. '
      + 'PERCENTUAL de reajuste sugerido NÃO entra aqui de propósito: é o campo '
      + 'mais sensível da tela, a conversa não depende dele, e sugestão de valor '
      + 'nominal tem que ser lida por gente na própria tela, não parafraseada.',
    campos: [
      { rotulo: 'Pessoas no ciclo', valor: e.membros === null ? null : String(e.membros.length) },
      {
        rotulo: 'Decisões já registradas',
        valor: e.membros === null
          ? null
          : String(e.membros.filter((m) => m.recomendacao !== null).length),
      },
      {
        rotulo: 'Pessoas abaixo de 70% de PPR',
        valor: e.membros === null
          ? null
          : String(e.membros.filter((m) => m.ppr < 70).length),
      },
    ],
    itens: (e.membros ?? []).slice(0, MAX_PESSOAS).map((m) => ({
      pessoa: m.nome,
      ppr: `${m.ppr}%`,
      classificacao: m.classificacao,
      metas: `${m.metasConcluidas} de ${m.metas} concluídas`,
      'feedbacks (+/dev)': `${m.feedbacksPositivos}/${m.feedbacksDesenvolvimento}`,
      'decisão registrada': m.recomendacao,
      justificativa: m.justificativa,
    })),
  }];

  // A síntese só existe depois de o usuário pedir a geração. Entra como bloco
  // próprio, e rotulada como texto de IA: ela NÃO é dado apurado da tela, e o
  // agente não pode tratá-la como se fosse.
  if (e.sintese) {
    blocos.push({
      id: 'sintese-ia',
      titulo: 'Síntese de recomendações (texto gerado por IA, não é dado apurado)',
      janela: e.ciclo ? `ciclo ${e.ciclo}` : 'ciclo ativo',
      nota: 'Gerada sob demanda por `gerar-recomendacoes-pessoas`. Cite como '
        + 'opinião de modelo, nunca como número da tela.',
      campos: [{ rotulo: 'Síntese', valor: e.sintese }],
    });
  }

  return {
    rotulo: 'Desempenho · Decisões (promoção, reajuste e acompanhamento)',
    filtros: { ciclo: e.ciclo ?? 'ativo' },
    blocos,
    avisos: e.falhas.length > 0 ? [`falha ao carregar: ${e.falhas.join(', ')}`] : undefined,
    sugestoes: SUGESTOES_DECISOES,
  };
}
