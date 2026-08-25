/**
 * Snapshots das TELAS do módulo Desempenho para o Agente PSA.
 *
 * A Visão Geral e as Decisões já vivem em `agenteContextoDesempenho.ts`. Aqui
 * ficam as outras sete: Ciclos, Metas e PPR, Relatórios, Evolução, Feedbacks,
 * 1:1s e Minha Evolução.
 *
 * Um arquivo só porque elas compartilham a mesma gramática — ciclo, pessoa,
 * meta, prazo — e separar em sete arquivos de 40 linhas espalharia a mesma
 * decisão por sete lugares.
 *
 * ── A regra que vale para as sete ──────────────────────────────────────
 *
 * Desempenho é o módulo mais sensível do sistema: os dados são sobre PESSOAS.
 * Então nenhum snapshot daqui leva texto de feedback, observação de 1:1 ou
 * comentário de líder — só CONTAGEM e ESTADO. O agente pode dizer "há 4
 * feedbacks de desenvolvimento sem devolutiva"; não pode recitar o que alguém
 * escreveu sobre outra pessoa numa conversa reservada.
 *
 * Isso não é excesso de zelo: o painel do agente é lido em reunião, com a tela
 * compartilhada.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';

// ── Blocos comuns ────────────────────────────────────────────────────────

export interface CicloResumo {
  nome: string;
  status: string;
  data_inicio: string;
  data_fim: string;
  data_analise_semestral: string | null;
}

/**
 * Do ciclo do banco para o resumo que o snapshot usa. Existe para as sete telas
 * mapearem igual — sete `map` inline divergiriam no primeiro campo novo.
 */
export function resumoDeCiclo(c: {
  nome: string; status: string; data_inicio: string; data_fim: string;
  data_analise_semestral: string | null;
}): CicloResumo {
  return {
    nome: c.nome, status: c.status, data_inicio: c.data_inicio,
    data_fim: c.data_fim, data_analise_semestral: c.data_analise_semestral,
  };
}

/** O ciclo é o eixo das sete telas: sem ele, nenhum número tem janela. */
function blocoCiclo(ciclo: CicloResumo | null, rotulo = 'Ciclo em foco'): BlocoContexto {
  return {
    id: 'ciclo',
    titulo: rotulo,
    campos: ciclo ? [
      { rotulo: 'Ciclo', valor: ciclo.nome },
      { rotulo: 'Status do ciclo', valor: ciclo.status },
      { rotulo: 'Período', valor: `${ciclo.data_inicio} a ${ciclo.data_fim}` },
      {
        rotulo: 'Análise semestral',
        valor: ciclo.data_analise_semestral,
        nota: ciclo.data_analise_semestral === null ? 'sem data marcada' : undefined,
      },
    ] : [{
      rotulo: 'Ciclo',
      valor: null,
      nota: 'nenhum ciclo selecionado ou ativo — sem ciclo, os números abaixo não têm janela',
    }],
  };
}

const contar = <T,>(itens: T[], chave: (t: T) => string) => {
  const mapa = new Map<string, number>();
  for (const i of itens) mapa.set(chave(i), (mapa.get(chave(i)) ?? 0) + 1);
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
};

const media = (valores: number[]) =>
  valores.length === 0 ? null : valores.reduce((a, b) => a + b, 0) / valores.length;

const pct = (v: number | null) =>
  v === null ? null : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;

// ── 1. Ciclos ────────────────────────────────────────────────────────────

export interface EntradaCiclos {
  ciclos: CicloResumo[];
  selecionado: CicloResumo | null;
  /** Metas do ciclo selecionado — só o que o snapshot precisa contar. */
  metasDoCiclo: { status: string; nivel: string }[];
  analisesRegistradas: number;
  carregando: boolean;
}

export function contextoDesempenhoCiclos(e: EntradaCiclos): ContextoTela {
  const porStatus = contar(e.ciclos, (c) => c.status);
  return {
    rotulo: 'Desempenho · Ciclos de avaliação',
    filtros: { ciclo: e.selecionado?.nome ?? 'nenhum selecionado' },
    blocos: [
      blocoCiclo(e.selecionado, 'Ciclo selecionado'),
      {
        id: 'ciclos',
        titulo: 'Ciclos cadastrados',
        campos: [
          { rotulo: 'Ciclos', valor: String(e.ciclos.length) },
          ...porStatus.map(([status, qtd]) => ({ rotulo: `Ciclos ${status}`, valor: String(qtd) })),
        ],
        itens: e.ciclos.slice(0, 10).map((c) => ({
          ciclo: c.nome, status: c.status, inicio: c.data_inicio, fim: c.data_fim,
        })),
      },
      {
        id: 'conteudo',
        titulo: 'O que já existe no ciclo selecionado',
        campos: [
          { rotulo: 'Metas no ciclo', valor: String(e.metasDoCiclo.length) },
          { rotulo: 'Análises semestrais registradas', valor: String(e.analisesRegistradas) },
        ],
      },
    ],
    sugestoes: [
      'Qual o ciclo ativo e quando é a análise semestral?',
      'Quantas metas já existem no ciclo selecionado?',
    ],
  };
}

// ── 2. Metas e PPR ───────────────────────────────────────────────────────

export interface EntradaMetas {
  ciclo: CicloResumo | null;
  metas: {
    nivel: string; dimensao: string; status: string;
    progresso_atual: number; peso: number; prazo: string | null;
    responsavel_id: string | null;
  }[];
  /** Regras de PPR cadastradas no ciclo. */
  regrasPpr: number;
  filtrosAtivos: Record<string, string | null>;
  hoje: string;
  carregando: boolean;
}

export function contextoDesempenhoMetas(e: EntradaMetas): ContextoTela {
  const semResponsavel = e.metas.filter((m) => m.responsavel_id === null).length;
  const vencidas = e.metas.filter(
    (m) => m.prazo !== null && m.prazo < e.hoje && m.status !== 'concluida',
  ).length;
  const semPrazo = e.metas.filter((m) => m.prazo === null).length;
  const progressoMedio = media(e.metas.map((m) => m.progresso_atual));

  return {
    rotulo: 'Desempenho · Metas e PPR',
    filtros: {
      ciclo: e.ciclo?.nome ?? 'nenhum',
      ...Object.fromEntries(
        Object.entries(e.filtrosAtivos).map(([k, v]) => [k, v ?? 'todos']),
      ),
    },
    blocos: [
      {
        id: 'metas',
        titulo: 'Metas do ciclo',
        janela: e.ciclo?.nome,
        nota: 'Progresso é o campo `progresso_atual` de cada meta, como a tela mostra.',
        campos: [
          { rotulo: 'Metas no recorte', valor: String(e.metas.length) },
          { rotulo: 'Progresso médio', valor: pct(progressoMedio), nota: progressoMedio === null ? 'sem meta no recorte' : undefined },
          { rotulo: 'Metas sem responsável', valor: String(semResponsavel) },
          {
            rotulo: 'Metas com prazo vencido e não concluídas',
            valor: String(vencidas),
            nota: `prazo anterior a ${e.hoje}`,
          },
          {
            rotulo: 'Metas sem prazo',
            valor: String(semPrazo),
            nota: 'não é "no prazo" — é meta que ninguém consegue cobrar',
          },
          { rotulo: 'Regras de PPR no ciclo', valor: String(e.regrasPpr) },
        ],
      },
      {
        id: 'distribuicao',
        titulo: 'Como as metas se distribuem',
        campos: [
          ...contar(e.metas, (m) => m.nivel).map(([n, q]) => ({ rotulo: `Nível ${n}`, valor: String(q) })),
          ...contar(e.metas, (m) => m.dimensao).map(([d, q]) => ({ rotulo: `Dimensão ${d}`, valor: String(q) })),
          ...contar(e.metas, (m) => m.status).map(([s, q]) => ({ rotulo: `Status ${s}`, valor: String(q) })),
        ],
      },
      blocoCiclo(e.ciclo),
    ],
    sugestoes: [
      'Quantas metas estão com prazo vencido?',
      'Há meta sem responsável neste ciclo?',
      'Qual o progresso médio das metas individuais?',
    ],
  };
}

// ── 3. Relatórios ────────────────────────────────────────────────────────

export interface EntradaRelatoriosDesempenho {
  ciclo: CicloResumo | null;
  /** Relatórios já gerados no recorte. */
  relatorios: { tipo: string; status: string; gerado_em: string | null }[];
  membroSelecionado: string | null;
  pessoasElegiveis: number;
  carregando: boolean;
}

export function contextoDesempenhoRelatorios(e: EntradaRelatoriosDesempenho): ContextoTela {
  const porStatus = contar(e.relatorios, (r) => r.status);
  const porTipo = contar(e.relatorios, (r) => r.tipo);
  const ultimo = e.relatorios
    .map((r) => r.gerado_em)
    .filter((d): d is string => d !== null)
    .sort()
    .at(-1) ?? null;

  return {
    rotulo: 'Desempenho · Relatórios',
    filtros: {
      ciclo: e.ciclo?.nome ?? 'todos',
      pessoa: e.membroSelecionado ?? 'todas',
    },
    blocos: [
      {
        id: 'relatorios',
        titulo: 'Relatórios gerados',
        janela: e.ciclo?.nome,
        campos: [
          { rotulo: 'Relatórios no recorte', valor: String(e.relatorios.length) },
          { rotulo: 'Pessoas elegíveis', valor: String(e.pessoasElegiveis) },
          {
            rotulo: 'Último relatório gerado em',
            valor: ultimo,
            nota: ultimo === null ? 'nenhum gerado no recorte' : undefined,
          },
          ...porStatus.map(([s, q]) => ({ rotulo: `Status ${s}`, valor: String(q) })),
        ],
        itens: porTipo.map(([tipo, qtd]) => ({ tipo, relatorios: qtd })),
      },
      blocoCiclo(e.ciclo),
    ],
    sugestoes: [
      'Quantos relatórios já foram gerados neste ciclo?',
      'Quantas pessoas ainda não têm relatório?',
    ],
  };
}

// ── 4. Evolução ──────────────────────────────────────────────────────────

export interface EntradaEvolucao {
  ciclo: CicloResumo | null;
  membroSelecionado: string | null;
  /**
   * Só `progresso_atual`: esta tela lê `DesempenhoEvolucaoMeta`, que não traz
   * `status`. Pedir um campo que a consulta não tem obrigaria a página a
   * inventar um valor para satisfazer o tipo.
   */
  metas: { progresso_atual: number }[];
  feedbacksRecebidos: number;
  reunioes1a1: number;
  ultimaReuniao: string | null;
  carregando: boolean;
}

export function contextoDesempenhoEvolucao(e: EntradaEvolucao): ContextoTela {
  const progressoMedio = media(e.metas.map((m) => m.progresso_atual));
  return {
    rotulo: 'Desempenho · Evolução da pessoa',
    filtros: {
      ciclo: e.ciclo?.nome ?? 'todos',
      pessoa: e.membroSelecionado ?? 'nenhuma selecionada',
    },
    blocos: [
      {
        id: 'evolucao',
        titulo: 'Evolução no recorte',
        nota: 'Contagens e progresso. O TEXTO de feedback e de 1:1 não entra aqui — '
          + 'é conversa reservada, e este painel é lido com a tela compartilhada.',
        campos: [
          { rotulo: 'Metas da pessoa', valor: String(e.metas.length) },
          { rotulo: 'Progresso médio', valor: pct(progressoMedio), nota: progressoMedio === null ? 'sem meta no recorte' : undefined },
          { rotulo: 'Feedbacks recebidos', valor: String(e.feedbacksRecebidos) },
          { rotulo: '1:1s registradas', valor: String(e.reunioes1a1) },
          {
            rotulo: 'Última 1:1',
            valor: e.ultimaReuniao,
            nota: e.ultimaReuniao === null ? 'nenhuma registrada' : undefined,
          },
        ],
      },
      blocoCiclo(e.ciclo),
    ],
    sugestoes: [
      'Há quanto tempo esta pessoa não tem uma 1:1?',
      'Qual o progresso médio das metas dela?',
    ],
  };
}

// ── 5. Feedbacks ─────────────────────────────────────────────────────────

export interface EntradaFeedbacks {
  ciclo: CicloResumo | null;
  feedbacks: {
    tipo: string; anonimo: boolean; visivel_para_avaliado: boolean;
    para_usuario_id: string | null; created_at: string;
  }[];
  carregando: boolean;
}

export function contextoDesempenhoFeedbacks(e: EntradaFeedbacks): ContextoTela {
  const pessoasComFeedback = new Set(
    e.feedbacks.map((f) => f.para_usuario_id).filter((id): id is string => id !== null),
  ).size;
  const invisiveis = e.feedbacks.filter((f) => !f.visivel_para_avaliado).length;

  return {
    rotulo: 'Desempenho · Feedbacks',
    filtros: { ciclo: e.ciclo?.nome ?? 'todos' },
    blocos: [
      {
        id: 'feedbacks',
        titulo: 'Feedbacks no recorte',
        nota: 'Só CONTAGEM. O texto do feedback não entra no snapshot: é registro '
          + 'sobre uma pessoa, escrito para ela, não para uma tela de conversa.',
        campos: [
          { rotulo: 'Feedbacks', valor: String(e.feedbacks.length) },
          { rotulo: 'Pessoas que receberam algum', valor: String(pessoasComFeedback) },
          { rotulo: 'Anônimos', valor: String(e.feedbacks.filter((f) => f.anonimo).length) },
          {
            rotulo: 'Ainda não visíveis para o avaliado',
            valor: String(invisiveis),
            nota: 'escrito, mas a pessoa ainda não pode ler',
          },
          ...contar(e.feedbacks, (f) => f.tipo).map(([t, q]) => ({
            rotulo: `Do tipo ${t}`, valor: String(q),
          })),
        ],
      },
      blocoCiclo(e.ciclo),
    ],
    sugestoes: [
      'Quantas pessoas ainda não receberam nenhum feedback?',
      'Há feedback escrito que a pessoa ainda não pode ler?',
    ],
  };
}

// ── 6. 1:1s ──────────────────────────────────────────────────────────────

export interface EntradaReunioes {
  ciclo: CicloResumo | null;
  reunioes: { data_reuniao: string; membro_id: string | null; sentimento: number | null }[];
  itensAbertos: { prazo: string | null; status: string }[];
  hoje: string;
  carregando: boolean;
}

export function contextoDesempenhoReunioes(e: EntradaReunioes): ContextoTela {
  const pessoas = new Set(
    e.reunioes.map((r) => r.membro_id).filter((id): id is string => id !== null),
  ).size;
  const ultima = e.reunioes.map((r) => r.data_reuniao).sort().at(-1) ?? null;
  const sentimentos = e.reunioes
    .map((r) => r.sentimento)
    .filter((s): s is number => s !== null);
  const itensVencidos = e.itensAbertos.filter(
    (i) => i.prazo !== null && i.prazo < e.hoje,
  ).length;

  return {
    rotulo: 'Desempenho · 1:1s',
    filtros: { ciclo: e.ciclo?.nome ?? 'todos', referência: e.hoje },
    blocos: [
      {
        id: 'reunioes',
        titulo: '1:1s registradas',
        nota: 'Só contagem e datas. Temas discutidos e observações do líder NÃO entram: '
          + 'é o registro mais reservado do sistema.',
        campos: [
          { rotulo: '1:1s registradas', valor: String(e.reunioes.length) },
          { rotulo: 'Pessoas com pelo menos uma', valor: String(pessoas) },
          {
            rotulo: 'Última 1:1',
            valor: ultima,
            nota: ultima === null ? 'nenhuma registrada' : undefined,
          },
          {
            rotulo: 'Sentimento médio',
            valor: sentimentos.length === 0
              ? null
              : (media(sentimentos) ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
            nota: sentimentos.length === 0
              ? 'nenhuma 1:1 com sentimento preenchido'
              : `média de ${sentimentos.length} registro(s)`,
          },
        ],
      },
      {
        id: 'itens',
        titulo: 'Itens de ação em aberto',
        campos: [
          { rotulo: 'Itens em aberto', valor: String(e.itensAbertos.length) },
          {
            rotulo: 'Com prazo vencido',
            valor: String(itensVencidos),
            nota: `prazo anterior a ${e.hoje}`,
          },
          {
            rotulo: 'Sem prazo',
            valor: String(e.itensAbertos.filter((i) => i.prazo === null).length),
          },
        ],
      },
      blocoCiclo(e.ciclo),
    ],
    sugestoes: [
      'Quantos itens de ação de 1:1 estão vencidos?',
      'Quando foi a última 1:1 registrada?',
    ],
  };
}

// ── 7. Minha Evolução ────────────────────────────────────────────────────

export interface EntradaMinhaEvolucao {
  ciclo: CicloResumo | null;
  metas: { status: string; progresso_atual: number; prazo: string | null; dimensao: string }[];
  comentariosDoLider: number;
  meusPontosDeVista: number;
  hoje: string;
  carregando: boolean;
}

export function contextoMinhaEvolucao(e: EntradaMinhaEvolucao): ContextoTela {
  const progressoMedio = media(e.metas.map((m) => m.progresso_atual));
  const vencidas = e.metas.filter(
    (m) => m.prazo !== null && m.prazo < e.hoje && m.status !== 'concluida',
  ).length;

  return {
    rotulo: 'Minha evolução',
    filtros: { ciclo: e.ciclo?.nome ?? 'nenhum', referência: e.hoje },
    blocos: [
      {
        id: 'minhas_metas',
        titulo: 'As suas metas no ciclo',
        janela: e.ciclo?.nome,
        campos: [
          { rotulo: 'Metas', valor: String(e.metas.length) },
          { rotulo: 'Progresso médio', valor: pct(progressoMedio), nota: progressoMedio === null ? 'sem meta no ciclo' : undefined },
          { rotulo: 'Com prazo vencido', valor: String(vencidas), nota: `prazo anterior a ${e.hoje}` },
          ...contar(e.metas, (m) => m.dimensao).map(([d, q]) => ({
            rotulo: `Dimensão ${d}`, valor: String(q),
          })),
        ],
      },
      {
        id: 'conversas',
        titulo: 'Registros de conversa',
        nota: 'Só a CONTAGEM. O texto do comentário do líder não entra no snapshot.',
        campos: [
          { rotulo: 'Comentários do líder para você', valor: String(e.comentariosDoLider) },
          { rotulo: 'Pontos de vista que você registrou', valor: String(e.meusPontosDeVista) },
        ],
      },
      blocoCiclo(e.ciclo),
    ],
    sugestoes: [
      'Quantas das minhas metas estão vencidas?',
      'Qual o meu progresso médio no ciclo?',
    ],
  };
}
