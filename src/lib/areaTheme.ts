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
export type AreaDeTema = 'tax' | 'osg' | 'rotina' | 'digital' | 'sistema' | 'base';

/**
 * Classe de tema de cada área, ou `null` para "só o piso".
 *
 * `base` é o fallback e aponta para `null` DE PROPÓSITO: rota não mapeada nasce
 * com o piso, que carrega a cor da marca. É o padrão seguro — uma página
 * pública nova sai teal em vez de sair grafite sem ninguém perceber.
 *
 * `digital` e `sistema` apontam para a mesma classe porque o Digital ainda não
 * tem paleta própria e, por ora, é infraestrutura como Board e Dev. Quando
 * ganhar identidade, é esta linha que muda — nada no mapa de rotas.
 */
export const TEMA_DA_AREA: Record<AreaDeTema, string | null> = {
  tax: 'tax-theme',
  osg: 'osg-theme',
  rotina: 'rotina-theme',
  digital: 'sistema-theme',
  sistema: 'sistema-theme',
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

  // ── Digital: sem paleta própria ainda, veste a de infraestrutura ────
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

  // ── Infraestrutura: grafite ─────────────────────────────────────────
  // Telas que servem o sistema, nao uma area de negocio. Enumeradas aqui de
  // propósito: esta lista é finita e conhecida, enquanto o site público (que
  // fica no piso) é o que ganha rota nova. Enumerar o que cresce apodrece.
  // Se um dia Board ou Dev pertencerem à Rotina, é trocar a palavra na linha.
  { prefixo: '/equipe/board', area: 'sistema' },
  { prefixo: '/equipe/dev', area: 'sistema' },
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
export function resolverTemaDaRota(pathname: string, busca?: string): string[] {
  const area = chaveDeEspelho(pathname, busca) ?? areaDaRota(pathname);
  const classeDaArea = TEMA_DA_AREA[area];
  return classeDaArea ? [CLASSE_BASE, classeDaArea] : [CLASSE_BASE];
}

// ─── Espelhamento: uma tela em vários ambientes ───────────────────────────
//
// Uma tela ESPELHADA é uma tela só, montada numa rota só, que se apresenta como
// sendo do ambiente de onde foi aberta: `/equipe/chamados?area=osg` mostra os
// chamados da OSG com o tema da OSG. Não há rota nova, não há cópia.
//
// A REGRA, e ela é o motivo de o parâmetro existir: COR E CONTEÚDO ANDAM SEMPRE
// JUNTOS. Nunca teal mostrando OSG; nunca mostrando tudo estando teal. Se a cor
// diz Tax, a lista é Tax.
//
// O que torna isso estrutural, e não uma regra a lembrar: a chave do parâmetro é
// uma CATEGORIA DE PÁGINA, e a mesma categoria resolve as duas coisas —
//
//   ?area=tax  →  tema:     ESPELHO['tax']                      (aqui, síncrono)
//              →  conteúdo: useDomainClusterPorCategoria('tax') (cluster, async)
//
// As duas saem de `estrutura_areas.page_categories`. Não existe estado em que
// uma mude sem a outra, porque não são duas fontes.

/** O parâmetro que carrega o ambiente de espelhamento. */
export const PARAM_DE_ESPELHO = 'area';

/**
 * As categorias que podem espelhar, e o tema de cada uma.
 *
 * O critério NÃO é "ser uma categoria válida" — é **ser um recorte**. A chave
 * precisa nomear um conjunto de que faça sentido dizer "os chamados dele".
 *
 * Por isso `geral`, `mapa`, `board` e `gestao` estão fora: nenhuma tem cluster
 * próprio para filtrar, e sem filtro não pode haver cor.
 *
 * POR QUE `rotina` SAIU, e é a correção que vale registrar. Ela entrou aqui
 * porque é uma categoria válida com cluster resolvível (o Digital) — critério
 * errado. A Rotina não é um cluster de negócio: é o CHÃO COMUM, o lugar de onde
 * se olha. Nove das dezesseis telas dela são categoria `geral`, e ela existe
 * porque todas as áreas passam por ali. "Ver os chamados da Rotina" não quer
 * dizer nada: ela não tem chamados.
 *
 * O sintoma que expôs isso: do `/equipe/kanban`, "Ver Chamados" ia para
 * `?area=rotina`, resolvia para o cluster Digital, e o Digital tem ZERO chamados
 * — tela teal com "0 de 0" onde devia haver a lista inteira. Internamente
 * coerente (cor e conteúdo andavam juntos) e conceitualmente errado. Só apareceu
 * quando alguém clicou o caminho real.
 *
 * Do kanban o link vai SEM parâmetro: piso, lista completa, Cluster livre.
 *
 * Havia aqui uma decisão explícita aceitando que `dev` e `rotina` apontassem
 * para o mesmo cluster com temas diferentes. Ela deixou de ser necessária: sem
 * `rotina`, toda chave é um cluster de verdade e não há mais duas chaves para o
 * mesmo conteúdo. A exceção do modelo desapareceu junto com a causa dela.
 */
export const ESPELHO = {
  tax: 'tax',
  osg: 'osg',
  dev: 'digital',
} as const satisfies Record<string, AreaDeTema>;

/**
 * As chaves como TIPO, e não como string solta.
 *
 * É o que faz um erro de digitação no menu (`?area=tx`) ser erro de compilação
 * em vez de uma tela que abre teal mostrando tudo. A regra "cor e conteúdo andam
 * juntos" passa a ser cobrada também no ponto de chamada, não só no resolvedor.
 */
export type ChaveDeEspelho = keyof typeof ESPELHO;

/**
 * A URL de uma tela espelhada — um lugar só monta o parâmetro.
 *
 * Use isto nos menus, nunca a string crua: quem monta `'/equipe/chamados?area=' + x`
 * à mão escapa do tipo e do teste.
 *
 * NÃO serve para rota de DETALHE (`/equipe/chamados/:id`): detalhe não tem
 * escopo para filtrar, logo não pode ter cor de escopo — ver `ROTAS_ESPELHADAS`.
 */
export function linkEspelhado(rota: string, chave: ChaveDeEspelho): string {
  return `${rota}?${PARAM_DE_ESPELHO}=${chave}`;
}

/**
 * As rotas que aceitam espelhamento.
 *
 * Sem esta lista, `?area=osg` pintaria OSG em QUALQUER rota — inclusive
 * `/equipe/tax/dashboard`, que é da Tax e não espelha nada. O parâmetro só
 * sobrescreve onde a tela sabe filtrar por ele.
 *
 * O casamento é EXATO, e não por segmento como no `MAPA_DE_ROTAS`. A diferença
 * importa: por segmento, `/equipe/chamados/:id` — o detalhe de UM chamado —
 * herdaria o espelho e ficaria musgo mostrando um chamado que pode ser do TAX.
 * O detalhe não tem escopo para filtrar, então não pode ter cor de escopo.
 * (Na prática a navegação nem produz essa URL: `onNavigate` vai para
 * `/equipe/chamados/${id}` sem parâmetro. O casamento exato fecha a porta
 * também para quem digitar a URL à mão.)
 */
export const ROTAS_ESPELHADAS: string[] = ['/equipe/chamados'];

/**
 * A chave de espelhamento válida de uma navegação, ou `null`.
 *
 * `null` quando: a rota não espelha, não há parâmetro, ou a chave é
 * desconhecida. Chave desconhecida cai no tema próprio da rota em vez de quebrar
 * — mesma direção à prova de falha do resto: rota não mapeada nasce com a cor da
 * marca, nunca sem cor.
 */
export function chaveDeEspelho(pathname: string, busca?: string): AreaDeTema | null {
  if (!busca) return null;
  const limpo = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (!ROTAS_ESPELHADAS.includes(limpo)) return null;
  const chave = new URLSearchParams(busca).get(PARAM_DE_ESPELHO);
  if (!chave) return null;
  return (ESPELHO as Record<string, AreaDeTema>)[chave] ?? null;
}
