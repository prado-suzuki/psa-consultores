// Aba Pessoas da Auditoria: quem é, onde está, quando acessou e quando
// registrou algo pela última vez. Funções puras — não falam com Supabase.
//
// IMPORTANTE — as duas datas NÃO são a mesma coisa:
// - `ultimoAcesso` é LOGIN (`profiles.last_sign_in_at`, espelhado de
//   `auth.users` por trigger). Não é tempo de uso nem sessão: o sistema não
//   mede duração de nada. `profiles` só é legível por admin, então para os
//   demais papéis a coluna simplesmente não existe na tela.
// - `ultimoRegistro` é a última ação gravada em `audit_logs` (criar/editar/
//   excluir).
// Alguém pode ter acessado hoje e não ter registro nenhum no período — esse
// cruzamento é a razão de a aba existir.

import type { AuditLog } from '@/hooks/useDomainAuditLogs';
import type { DirecaoOrdenacao } from '@/lib/auditProdutividade';

/** Área e equipe da pessoa, já resolvidas em nome. */
export interface EstruturaPessoa {
  area: string | null;
  equipe: string | null;
}

export type EstruturaPorPessoa = Record<string, EstruturaPessoa>;

export interface MembroEquipe {
  user_id: string;
  equipe_id: string;
}

export interface EquipeEstrutura {
  id: string;
  name: string | null;
  area_id: string | null;
  gestor_id: string | null;
}

export interface AreaEstrutura {
  id: string;
  name: string | null;
}

/**
 * Área e equipe de cada pessoa a partir da estrutura organizacional.
 *
 * O gestor entra como membro da própria equipe: ele não aparece em
 * `estrutura_equipe_membros`, mas responde pela equipe — mesma regra que
 * `useTeamMembersByArea` usa, para as duas telas mostrarem a mesma lotação.
 * Quem está em mais de uma equipe/área tem os nomes juntos, separados por
 * " · ", em vez de a tela escolher um no chute.
 */
export function resolverEstruturaPessoas(
  membros: MembroEquipe[],
  equipes: EquipeEstrutura[],
  areas: AreaEstrutura[],
): EstruturaPorPessoa {
  const equipeById = new Map(equipes.map(equipe => [equipe.id, equipe]));
  const areaById = new Map(areas.map(area => [area.id, area]));

  const equipesPorPessoa = new Map<string, Set<string>>();
  const areasPorPessoa = new Map<string, Set<string>>();

  const vincular = (userId: string, equipeId: string) => {
    const equipe = equipeById.get(equipeId);
    if (!equipe) return;

    const nomeEquipe = equipe.name?.trim();
    if (nomeEquipe) {
      let nomes = equipesPorPessoa.get(userId);
      if (!nomes) equipesPorPessoa.set(userId, nomes = new Set());
      nomes.add(nomeEquipe);
    }

    const nomeArea = equipe.area_id ? areaById.get(equipe.area_id)?.name?.trim() : undefined;
    if (nomeArea) {
      let nomes = areasPorPessoa.get(userId);
      if (!nomes) areasPorPessoa.set(userId, nomes = new Set());
      nomes.add(nomeArea);
    }
  };

  for (const membro of membros) vincular(membro.user_id, membro.equipe_id);
  for (const equipe of equipes) {
    if (equipe.gestor_id) vincular(equipe.gestor_id, equipe.id);
  }

  const juntar = (nomes: Set<string> | undefined): string | null =>
    nomes && nomes.size > 0 ? [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')).join(' · ') : null;

  const estrutura: EstruturaPorPessoa = {};
  for (const userId of new Set([...equipesPorPessoa.keys(), ...areasPorPessoa.keys()])) {
    estrutura[userId] = {
      area: juntar(areasPorPessoa.get(userId)),
      equipe: juntar(equipesPorPessoa.get(userId)),
    };
  }

  return estrutura;
}

/** Ids das áreas da estrutura que atendem a um slug de área (`tax`, `osg`). */
export function idsDasAreas(
  areas: (AreaEstrutura & { page_categories?: string[] | null })[],
  categorias: string[],
): string[] {
  return areas
    .filter(area => area.page_categories?.some(categoria => categorias.includes(categoria)))
    .map(area => area.id);
}

/** Pessoas lotadas nas equipes das áreas informadas (inclui os gestores). */
export function pessoasDasAreas(
  membros: MembroEquipe[],
  equipes: EquipeEstrutura[],
  areaIds: string[],
): string[] {
  const alvo = new Set(areaIds);
  const equipesDaArea = new Set(
    equipes.filter(equipe => equipe.area_id && alvo.has(equipe.area_id)).map(equipe => equipe.id),
  );

  const pessoas = new Set<string>();
  for (const membro of membros) {
    if (equipesDaArea.has(membro.equipe_id)) pessoas.add(membro.user_id);
  }
  for (const equipe of equipes) {
    if (equipe.gestor_id && equipesDaArea.has(equipe.id)) pessoas.add(equipe.gestor_id);
  }

  return [...pessoas];
}

export interface CargaPessoa {
  /** Tarefas atribuídas a ela que não estão concluídas. */
  abertas: number;
  /** Das abertas, quantas já passaram do prazo. */
  atrasadas: number;
}

export type CargaPorPessoa = Record<string, CargaPessoa>;

/** Colunas de `org_tasks` usadas na carga. */
export interface TarefaCarga {
  assigned_to: string | null;
  status: string;
  due_date: string | null;
}

/**
 * `done` é o enum `fiscal_task_status`; `completed` aparece em status
 * traduzidos de outras origens. Mesma lista de `auditProdutividade`.
 */
const STATUS_CONCLUIDO = new Set(['done', 'completed']);

/**
 * Tarefas abertas e atrasadas por responsável.
 *
 * `hoje` (YYYY-MM-DD) vem de fora para a função ser pura e testável. Tarefa sem
 * prazo nunca conta como atrasada — falta de prazo não é atraso.
 */
export function agregarCargaPessoas(tarefas: TarefaCarga[], hoje: string): CargaPorPessoa {
  const carga: CargaPorPessoa = {};

  for (const tarefa of tarefas) {
    if (!tarefa.assigned_to) continue;
    if (STATUS_CONCLUIDO.has(tarefa.status)) continue;

    const atual = carga[tarefa.assigned_to] ??= { abertas: 0, atrasadas: 0 };
    atual.abertas += 1;
    if (tarefa.due_date && tarefa.due_date < hoje) atual.atrasadas += 1;
  }

  return carga;
}

export type SituacaoPessoa = 'ativo' | 'parou' | 'sem_registro';

export const SITUACAO_LABELS: Record<SituacaoPessoa, string> = {
  ativo: 'Ativo',
  parou: 'Parou de registrar',
  sem_registro: 'Sem registro no período',
};

/** A partir de quantos dias sem registrar a pessoa deixa de ser "Ativo". */
export const DIAS_PARA_PAROU = 7;

export interface LinhaPessoa {
  userId: string;
  nome: string;
  area: string | null;
  equipe: string | null;
  /** Último login; null quando nunca logou ou quem está vendo não é admin. */
  ultimoAcesso: string | null;
  /** ISO da última ação no período; null quando não houve nenhuma. */
  ultimoRegistro: string | null;
  /** Dias entre hoje e o último registro; null sem registro no período. */
  diasSemRegistro: number | null;
  diasAtivos: number;
  tarefasAbertas: number;
  tarefasAtrasadas: number;
  situacao: SituacaoPessoa;
}

export interface EntradaPessoas {
  logs: AuditLog[];
  nomePorId: Record<string, string>;
  estrutura?: EstruturaPorPessoa;
  /** Só chega preenchido para admin — `profiles` não é legível pelos demais. */
  ultimoAcessoPorId?: Record<string, string | null>;
  carga?: CargaPorPessoa;
  /**
   * Pessoas que entram na lista mesmo sem nenhum log no período — é o que
   * revela quem sumiu. Vem do time lotado na área.
   */
  incluirSemRegistro?: string[];
  /** Data de referência YYYY-MM-DD; a função não lê o relógio. */
  hoje: string;
}

/** Dias inteiros entre duas datas YYYY-MM-DD, sem depender de timezone. */
function diasEntre(inicio: string, fim: string): number {
  const ms = Date.parse(`${fim}T00:00:00.000Z`) - Date.parse(`${inicio}T00:00:00.000Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function agregarPessoas({
  logs, nomePorId, estrutura = {}, ultimoAcessoPorId, carga = {}, incluirSemRegistro = [], hoje,
}: EntradaPessoas): LinhaPessoa[] {
  const dias = new Map<string, Set<string>>();
  const ultimoPorPessoa = new Map<string, string>();

  for (const log of logs) {
    let diasDaPessoa = dias.get(log.performed_by);
    if (!diasDaPessoa) dias.set(log.performed_by, diasDaPessoa = new Set());
    diasDaPessoa.add(log.performed_at.slice(0, 10));

    const ultimo = ultimoPorPessoa.get(log.performed_by);
    if (!ultimo || log.performed_at > ultimo) ultimoPorPessoa.set(log.performed_by, log.performed_at);
  }

  const userIds = new Set<string>([...ultimoPorPessoa.keys(), ...incluirSemRegistro]);

  return [...userIds]
    .map((userId): LinhaPessoa => {
      const ultimoRegistro = ultimoPorPessoa.get(userId) ?? null;
      const diasSemRegistro = ultimoRegistro
        ? diasEntre(ultimoRegistro.slice(0, 10), hoje)
        : null;

      const situacao: SituacaoPessoa = diasSemRegistro === null
        ? 'sem_registro'
        : diasSemRegistro >= DIAS_PARA_PAROU ? 'parou' : 'ativo';

      return {
        userId,
        nome: nomePorId[userId]?.trim() || 'Desconhecido',
        area: estrutura[userId]?.area ?? null,
        equipe: estrutura[userId]?.equipe ?? null,
        // `undefined` (não-admin) e "nunca logou" chegam os dois como null na
        // linha; quem decide se a coluna aparece é a tela.
        ultimoAcesso: ultimoAcessoPorId?.[userId] ?? null,
        ultimoRegistro,
        diasSemRegistro,
        diasAtivos: dias.get(userId)?.size ?? 0,
        tarefasAbertas: carga[userId]?.abertas ?? 0,
        tarefasAtrasadas: carga[userId]?.atrasadas ?? 0,
        situacao,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** `hoje`, `há 1 dia`, `há 12 dias`, `—` quando não houve registro no período. */
export function rotuloDiasSemRegistro(dias: number | null): string {
  if (dias === null) return '—';
  if (dias === 0) return 'hoje';
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

export interface ResumoPessoas {
  /** Pessoas na lista (com registro no período ou lotadas na área). */
  pessoas: number;
  /** Quantas estão há `DIAS_PARA_PAROU`+ dias sem registrar, ou sem nenhum. */
  paradas: number;
  /** Quantas nunca acessaram; null quando o acesso não é visível. */
  semAcesso: number | null;
}

export function resumirPessoas(linhas: LinhaPessoa[], acessoVisivel: boolean): ResumoPessoas {
  return {
    pessoas: linhas.length,
    paradas: linhas.filter(linha => linha.situacao !== 'ativo').length,
    semAcesso: acessoVisivel ? linhas.filter(linha => linha.ultimoAcesso === null).length : null,
  };
}

export type ColunaPessoa =
  | 'nome' | 'areaEquipe' | 'ultimoAcesso' | 'ultimoRegistro'
  | 'diasAtivos' | 'tarefasAbertas' | 'tarefasAtrasadas' | 'situacao';

/**
 * Colunas da aba, na ordem de exibição. `ultimoAcesso` entra só quando quem
 * está vendo pode ler `profiles` — hoje, admin.
 */
export function colunasPessoas(mostrarAcesso: boolean): ColunaPessoa[] {
  return [
    'nome',
    'areaEquipe',
    ...(mostrarAcesso ? ['ultimoAcesso' as const] : []),
    'ultimoRegistro',
    'diasAtivos',
    'tarefasAbertas',
    'tarefasAtrasadas',
    'situacao',
  ];
}

/**
 * A aba abre pelo último registro mais ANTIGO: a pergunta é quem parou, não
 * quem está produzindo. Quem não tem registro no período vem antes de todos —
 * ver `ordenarPessoas`.
 */
export const ORDENACAO_INICIAL_PESSOAS: { coluna: ColunaPessoa; direcao: DirecaoOrdenacao } = {
  coluna: 'ultimoRegistro',
  direcao: 'asc',
};

const COLUNAS_CRESCENTES: ColunaPessoa[] = ['nome', 'areaEquipe', 'ultimoAcesso', 'ultimoRegistro'];

/** Texto e data começam do começo/mais antigo; contagem começa do maior. */
export function direcaoInicialPessoa(coluna: ColunaPessoa): DirecaoOrdenacao {
  return COLUNAS_CRESCENTES.includes(coluna) ? 'asc' : 'desc';
}

/** Situação ordena por gravidade, não por alfabeto. */
const PESO_SITUACAO: Record<SituacaoPessoa, number> = {
  ativo: 0,
  parou: 1,
  sem_registro: 2,
};

function areaEquipeTexto(linha: LinhaPessoa): string {
  return [linha.area, linha.equipe].filter(Boolean).join(' / ');
}

function compararPessoa(a: LinhaPessoa, b: LinhaPessoa, coluna: ColunaPessoa): number {
  switch (coluna) {
    case 'nome':
      return a.nome.localeCompare(b.nome, 'pt-BR');
    case 'areaEquipe':
      return areaEquipeTexto(a).localeCompare(areaEquipeTexto(b), 'pt-BR');
    // Datas ISO comparam como string. Ausência vira '' de propósito: "nunca
    // acessou" e "nenhum registro no período" são o caso mais grave e ficam no
    // topo quando a ordem é crescente — o contrário do resto do sistema, onde
    // vazio vai para o fim, porque aqui o vazio é a informação.
    case 'ultimoAcesso':
      return (a.ultimoAcesso ?? '').localeCompare(b.ultimoAcesso ?? '');
    case 'ultimoRegistro':
      return (a.ultimoRegistro ?? '').localeCompare(b.ultimoRegistro ?? '');
    case 'situacao':
      return PESO_SITUACAO[a.situacao] - PESO_SITUACAO[b.situacao];
    default:
      return a[coluna] - b[coluna];
  }
}

export function ordenarPessoas(
  linhas: LinhaPessoa[],
  coluna: ColunaPessoa,
  direcao: DirecaoOrdenacao,
): LinhaPessoa[] {
  const fator = direcao === 'asc' ? 1 : -1;

  return [...linhas].sort((a, b) => {
    const cmp = compararPessoa(a, b, coluna);
    return cmp !== 0 ? cmp * fator : a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

function escapeCsv(valor: string): string {
  const precisa = /[;\n"]/.test(valor);
  return precisa ? `"${valor.replace(/"/g, '""')}"` : valor;
}

interface CampoCsv {
  header: string;
  valor: (linha: LinhaPessoa) => string | number;
}

const CAMPOS_CSV: Record<ColunaPessoa, CampoCsv[]> = {
  nome: [{ header: 'colaborador', valor: linha => escapeCsv(linha.nome) }],
  areaEquipe: [
    { header: 'area', valor: linha => escapeCsv(linha.area ?? '') },
    { header: 'equipe', valor: linha => escapeCsv(linha.equipe ?? '') },
  ],
  ultimoAcesso: [{ header: 'ultimo_acesso', valor: linha => linha.ultimoAcesso ?? '' }],
  ultimoRegistro: [
    { header: 'ultimo_registro', valor: linha => linha.ultimoRegistro ?? '' },
    { header: 'dias_sem_registro', valor: linha => linha.diasSemRegistro ?? '' },
  ],
  diasAtivos: [{ header: 'dias_ativos', valor: linha => linha.diasAtivos }],
  tarefasAbertas: [{ header: 'tarefas_abertas', valor: linha => linha.tarefasAbertas }],
  tarefasAtrasadas: [{ header: 'tarefas_atrasadas', valor: linha => linha.tarefasAtrasadas }],
  situacao: [{ header: 'situacao', valor: linha => SITUACAO_LABELS[linha.situacao] }],
};

export function buildPessoasCsv(linhas: LinhaPessoa[], colunas: ColunaPessoa[]): string {
  const sep = ';';
  const campos = colunas.flatMap(coluna => CAMPOS_CSV[coluna]);
  const saida = [campos.map(campo => campo.header).join(sep)];

  for (const linha of linhas) {
    saida.push(campos.map(campo => campo.valor(linha)).join(sep));
  }

  return saida.join('\n');
}
