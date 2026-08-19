/**
 * Resolvedor de tema por rota: qual classe de tema o `<html>` deve carregar.
 *
 * O PROBLEMA QUE ISTO RESOLVE. Os temas existiam no CSS, mas quem os aplicava
 * era cada layout, por conta própria (`EquipeLayout`, `FiscalLayout`,
 * `OsgLayout`). Três consequências, todas medidas antes desta mudança:
 *
 * 1. Layout que não aplicava tema deixava a tela no `:root` puro — era o caso
 *    de `DevLayout` e `BoardLayout`, quase metade das rotas de `/equipe`.
 * 2. O layout nasce DENTRO dos gates de acesso. `LiderRoute` devolve `null`
 *    enquanto o papel do usuário carrega, então nesse intervalo não existe
 *    layout, não existe classe, e a tela pinta com a paleta da base. Foi assim
 *    que `/equipe/tax/gerencial/chamados` apareceu com o anel de foco lime.
 * 3. Não havia um lugar só para responder "de que área é esta rota?".
 *
 * Por isso o resolvedor mora ACIMA dos gates (ver `AreaThemeProvider`, montado
 * em volta de `<Routes>`) e a decisão de cor vira DADO: `MAPA_DE_ROTAS` diz a
 * que área cada rota pertence, e `TEMA_DA_AREA` diz que classe cada área usa.
 * Dar cor própria ao Digital, ou mover o Board para outra área, passa a ser uma
 * linha em uma destas duas tabelas.
 *
 * POR QUE NÃO REUSA O `AreaKey` DE `@/config/areaCategories`. Aquele tipo é a
 * taxonomia de PERMISSÃO: lá `digital` engloba as categorias `rotina` e `dev`, e
 * `board` é área própria. Aqui a divisão é outra — `rotina` tem tema e `dev` não,
 * e o Board cai na base. São dois recortes legitimamente diferentes do mesmo
 * negócio, e amarrá-los faria uma mudança de permissão repintar telas.
 */

/** Classe do contrato completo. Aplicada em TODA rota, sempre. */
export const CLASSE_BASE = 'base-theme';

/** Áreas do ponto de vista do TEMA (ver nota acima sobre `AreaKey`). */
export type AreaDeTema = 'tax' | 'osg' | 'rotina' | 'digital' | 'base';

/**
 * Classe de tema de cada área, ou `null` para "só a base".
 *
 * `digital` aponta para `null` porque a área ainda não tem paleta própria — e
 * é aqui que ela ganha uma, quando ganhar, sem tocar no mapa de rotas.
 */
export const TEMA_DA_AREA: Record<AreaDeTema, string | null> = {
  tax: 'tax-theme',
  osg: 'osg-theme',
  rotina: 'rotina-theme',
  digital: null,
  base: null,
};

interface RegraDeRota {
  /** Prefixo casado por SEGMENTO — `/equipe/tax` não pega `/equipe/taxonomia`. */
  prefixo: string;
  area: AreaDeTema;
}

/**
 * Mapa explícito de rota → área.
 *
 * É explícito, e não `pathname.split('/')[2]`, porque o segundo segmento MENTE
 * em três casos reais desta base — os três estão cobertos por teste próprio em
 * `areaTheme.test.ts`:
 *
 * · `rotina` não aparece em URL nenhuma. As telas da área são `/equipe/kanban`,
 *   `/equipe/daily`, `/equipe/sprints`… — o que as une é renderizarem o
 *   `EquipeLayout`, não um pedaço do caminho.
 * · `/equipe/acessos` é do Digital, mas o caminho diz "acessos".
 * · `/equipe/chamados` é da Rotina — `chamadoStatusColors` mora no mesmo arquivo
 *   e no mesmo formato que `taskStatusColors` e `projetoStatusColors`, ou seja, o
 *   sistema já trata chamado como a mesma família de tarefa e projeto.
 *
 * Rota fora deste mapa cai na base. Isso é deliberado: nenhuma tela roda sem
 * classe de tema, e uma rota nova nasce com o contrato completo em vez de
 * herdar meia paleta.
 */
export const MAPA_DE_ROTAS: RegraDeRota[] = [
  // ── Áreas com paleta própria ────────────────────────────────────────
  { prefixo: '/equipe/tax', area: 'tax' },
  { prefixo: '/equipe/osg', area: 'osg' },

  // ── Digital: sem paleta própria ainda, cai na base ──────────────────
  { prefixo: '/equipe/acessos', area: 'digital' },
  { prefixo: '/equipe/digital', area: 'digital' },

  // ── Rotina: as telas do EquipeLayout, uma a uma ─────────────────────
  { prefixo: '/equipe/backlog', area: 'rotina' },
  { prefixo: '/equipe/biblioteca', area: 'rotina' },
  { prefixo: '/equipe/chamados', area: 'rotina' },
  { prefixo: '/equipe/daily', area: 'rotina' },
  { prefixo: '/equipe/dashboard', area: 'rotina' },
  { prefixo: '/equipe/dashboards', area: 'rotina' },
  { prefixo: '/equipe/kanban', area: 'rotina' },
  { prefixo: '/equipe/mapeamento', area: 'rotina' },
  { prefixo: '/equipe/processos', area: 'rotina' },
  { prefixo: '/equipe/projetos', area: 'rotina' },
  { prefixo: '/equipe/relatorios', area: 'rotina' },
  { prefixo: '/equipe/rotinas', area: 'rotina' },
  { prefixo: '/equipe/sprints', area: 'rotina' },
  // Redirecionam para /equipe/kanban; mapeadas para não piscar de tema no meio.
  { prefixo: '/equipe/tarefas', area: 'rotina' },

  // ── Sem área própria hoje: Board e Dev vão para a base ──────────────
  // Não é esquecimento: é a decisão de olhar o grafite da base aplicado antes
  // de decidir se elas pertencem à Rotina. Estão aqui, e não no fallback, para
  // que essa decisão seja uma troca de palavra nesta linha.
  { prefixo: '/equipe/board', area: 'base' },
  { prefixo: '/equipe/dev', area: 'base' },
];

/** Regras da mais específica para a menos — prefixo mais longo vence. */
const REGRAS_ORDENADAS = [...MAPA_DE_ROTAS].sort(
  (a, b) => b.prefixo.length - a.prefixo.length,
);

/** Todas as classes que o resolvedor pode pôr no `<html>`. Base para a limpeza. */
export const CLASSES_DE_TEMA: string[] = [
  CLASSE_BASE,
  ...new Set(Object.values(TEMA_DA_AREA).filter((c): c is string => c !== null)),
];

/** Casa por segmento: `/equipe/tax` pega `/equipe/tax` e `/equipe/tax/...`, e nada além. */
function casa(pathname: string, prefixo: string): boolean {
  return pathname === prefixo || pathname.startsWith(`${prefixo}/`);
}

/** A área de uma rota. Rota desconhecida é `base` — nunca "sem tema". */
export function areaDaRota(pathname: string): AreaDeTema {
  // Barra final é ruído de navegação, não rota diferente.
  const limpo = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return REGRAS_ORDENADAS.find((r) => casa(limpo, r.prefixo))?.area ?? 'base';
}

/**
 * As classes de tema de uma rota: sempre a base, mais a da área quando existe.
 *
 * São DUAS classes no mesmo elemento, e é assim de propósito: a base declara o
 * contrato inteiro (41 variáveis) e a área declara só o delta. É o que permite
 * a `.tax-theme` ter 26 variáveis e a `.rotina-theme` ter 1 sem nenhuma das
 * duas herdar valor perdido do `:root`.
 *
 * A ORDEM DESTA LISTA NÃO IMPORTA — o que decide o vencedor é a ordem dos
 * blocos em `src/index.css` (todas as classes têm a mesma especificidade). O
 * aviso está no topo do `.base-theme`.
 */
export function resolverTemaDaRota(pathname: string): string[] {
  const classeDaArea = TEMA_DA_AREA[areaDaRota(pathname)];
  return classeDaArea ? [CLASSE_BASE, classeDaArea] : [CLASSE_BASE];
}
