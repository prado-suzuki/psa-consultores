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
 * `board` é área própria. Aqui a divisão é outra — `rotina` e `dev` se separam (a
 * Rotina é a casa e fica no piso, o Dev veste o grafite de infraestrutura), e o
 * Board tem classe própria. São dois recortes legitimamente diferentes do mesmo
 * negócio, e amarrá-los faria uma mudança de permissão repintar telas.
 */

/** Classe do contrato completo. Aplicada em TODA rota, sempre. */
export const CLASSE_BASE = 'base-theme';

/** Áreas do ponto de vista do TEMA (ver nota acima sobre `AreaKey`). */
export type AreaDeTema = 'tax' | 'osg' | 'board' | 'rotina' | 'digital' | 'sistema' | 'base';

/**
 * Classe de tema de cada área, ou `null` para "só o piso".
 *
 * `base` é o fallback e aponta para `null` DE PROPÓSITO: rota não mapeada nasce
 * com o piso, que carrega a cor da marca. É o padrão seguro — uma página
 * pública nova sai teal em vez de sair grafite sem ninguém perceber.
 *
 * `digital` aponta para `null` desde 31/08/2026: o Digital é ÁREA DE NEGÓCIO e
 * veste a marca, como a Rotina — que é a maior parte dele. No grafite, o seletor
 * de `/equipe/digital` pintava cinza apontando para telas teal, e o
 * `/equipe/acessos` saía cinza dentro de uma área que não é cinza. É a mesma
 * divergência que tirou o Board do grafite em 21/08.
 *
 * Sobra UM dono do grafite: `sistema`, que hoje é só o `/equipe/dev`. A linha
 * que separa os dois não é tamanho nem hierarquia — é A QUEM A TELA SERVE. O Dev
 * serve o sistema; Digital, Board, Tax e OSG servem o negócio.
 *
 * `rotina` também aponta para `null`, desde 29/08/2026, e isso é o fim de um
 * desvio — não uma área que perdeu a cor. A `.rotina-theme` nasceu para declarar
 * UMA variável, o `--ring`; quando o piso ganhou identidade própria ela foi
 * CONGELADA com o contrato inteiro para parar de acompanhar a base. Medido antes
 * de apagar: cada variável que ela declarava era, uma a uma, a mesma do
 * `.base-theme` — inclusive o `--ring`, porque `var(--teal-600)` É o valor que a
 * base escreve literal. Apagar o bloco não moveu um pixel.
 *
 * O motivo de fundo é o modelo de cor por camada: a âncora da Rotina é a da
 * CASA, o teal da marca, e a casa é o que o piso já pinta. Área cuja âncora é a
 * do piso não tem delta a declarar — teria um bloco só para repetir o piso, que
 * foi exatamente o que existiu até aqui.
 */
export const TEMA_DA_AREA: Record<AreaDeTema, string | null> = {
  tax: 'tax-theme',
  osg: 'osg-theme',
  board: 'board-theme',
  rotina: null,
  digital: null,
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

  // ── Digital: área de negócio, e a cor dela é a da casa ──────────────
  // Sem paleta própria — e, como a Rotina, sem precisar de uma: a âncora do
  // Digital é a da casa, que é o que o piso já pinta.
  { prefixo: '/equipe/acessos', area: 'digital' },
  { prefixo: '/equipe/digital', area: 'digital' },

  // ── Rotina: as telas do EquipeLayout, uma a uma ─────────────────────
  // A Rotina é a CASA e não tem classe própria (ver `TEMA_DA_AREA`): estas rotas
  // ficam no piso, que já é o teal da marca. Continuam nomeadas aqui porque a
  // pergunta "de que área é esta rota?" segue tendo resposta e sendo usada — o
  // espelho de `/equipe/chamados` depende dela.
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

  // ── Board: área de NEGÓCIO, veste a marca ───────────────────────────
  // Era 'sistema' (grafite) até 21/08/2026, e a troca desta palavra é o que o
  // comentário abaixo previa. O motivo não é estético: o Board HOSPEDA módulos
  // compartilhados (Capacidade monta o `AreaDashboardContent` do Tax e da OSG,
  // Clientes monta a lista), e com o grafite aqui a tela ficava com botão e
  // anel de foco grafite ao lado de cartão e gráfico teal — o design system
  // próprio do Board (bloco `--bd-*`, no index.css) é o teal institucional.
  // Dev e Acessos SERVEM o sistema; o Board é a tela da diretoria, e diretoria
  // olha a empresa. Delta em `.board-theme`; papéis de status seguem do piso.
  { prefixo: '/equipe/board', area: 'board' },

  // ── A casa, fora de /equipe ─────────────────────────────────────────
  // Esta linha NÃO muda comportamento: rota fora do mapa já cai em `base`. Ela
  // existe para separar "é a casa por decisão" de "ninguém mapeou ainda". O
  // Portal do Cliente veste o teal institucional porque essa é a identidade
  // dele, e é aqui que se lê isso — se um dia ganhar cor própria, muda esta
  // linha, e não o silêncio do fallback.
  { prefixo: '/cliente', area: 'base' },

  // ── Infraestrutura: grafite ─────────────────────────────────────────
  // Telas que servem o sistema, nao uma area de negocio. Enumeradas aqui de
  // propósito: esta lista é finita e conhecida, enquanto o site público (que
  // fica no piso) é o que ganha rota nova. Enumerar o que cresce apodrece.
  // Se um dia o Dev pertencer à Rotina, é trocar a palavra na linha.
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
 * São DUAS classes no mesmo elemento quando a área tem delta, e é assim de
 * propósito: a base declara o contrato inteiro e a área declara só o que difere.
 * É o que permite a `.sistema-theme` trocar acento e superfície sem herdar valor
 * perdido do `:root` — e o que permite a Rotina não ter classe nenhuma, porque
 * o delta dela é vazio.
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
 * O CRITÉRIO, e ele não é "ser uma categoria válida".
 *
 * O espelho recorta por `tickets.cluster_id`, e esse cluster vem do CLIENTE que
 * abriu o chamado — o cliente entra pela área dele e o chamado vai para o cluster
 * que o atende. Logo o espelho responde a UMA pergunta:
 *
 *     "chamados dos CLIENTES desta área"
 *
 * Tax e OSG têm clientes: 123 e 166 (medido em 20/08/2026). O Digital não tem —
 * os dois vínculos que existem são `[TESTE] Pantanal Sementes` e `[TESTE] Zebra
 * de Óculos`, dados de semente. Por isso `dev` e `rotina` NÃO espelham: não é
 * lacuna de dado, é recorte que não se aplica a eles.
 *
 * `geral`, `mapa`, `board` e `gestao` ficam fora pela mesma razão, sem cluster
 * próprio para recortar.
 *
 * O SINTOMA que expôs o critério errado: do `/equipe/kanban`, "Ver Chamados" ia
 * para `?area=rotina`, que resolvia para o cluster Digital, e o Digital tem ZERO
 * chamados — tela teal com "0 de 0" onde deviam estar os 354. Internamente
 * coerente (cor e conteúdo andavam juntos) e conceitualmente errado. Só apareceu
 * quando alguém clicou o caminho real. `rotina` e `dev` entraram porque eram
 * categorias válidas com cluster resolvível, não porque fossem recortes.
 *
 * Do kanban e do Dev o link vai SEM parâmetro: piso, lista completa, Cluster
 * livre.
 *
 * REGISTRADO E NÃO É PARA AGORA: haverá um canal de chamados para clientes
 * INTERNOS — dúvidas e correções da própria equipe. Esse é OUTRO recorte e OUTRA
 * tela. Não é acrescentar uma chave a esta lista.
 *
 * Havia aqui uma decisão explícita aceitando que `dev` e `rotina` apontassem para
 * o mesmo cluster com temas diferentes. Ela deixou de ser necessária: toda chave
 * que sobrou é um cluster com clientes, e não há duas chaves para o mesmo
 * conteúdo. A exceção do modelo saiu junto com a causa dela.
 *
 * ⚠️ O PADRÃO DE ROTA JÁ EXISTIA, mas SEM a regra. `ChamadosGestaoContent` vive
 * em `/equipe/tax/gerencial/chamados` e `/equipe/osg/gerencial/chamados` e pega a
 * cor certa pelo resolvedor — mas NÃO filtra por área: recebe só `basePath` (usado
 * para navegar), chama `useAllActiveAreas`/`useAllActiveClusters` e nasce com
 * `cluster: 'todos'`. Ou seja: ele é precedente do CAMINHO, e é exemplo do
 * defeito que este bloco existe para não ter — cor de área sobre lista de todas
 * as áreas. Fica registrado como dívida, não como modelo a copiar.
 */
export const ESPELHO = {
  tax: 'tax',
  osg: 'osg',
} as const satisfies Record<string, AreaDeTema>;

/**
 * Para onde o "Voltar" de uma tela espelhada leva, e com que rótulo.
 *
 * Antes do espelho a tela não tinha essa informação e o "Voltar" caía em
 * `/equipe` — o seletor de áreas. Quem viera da Tax era mandado escolher a área
 * de novo. O espelho É essa informação, então deixou de ser irremediável.
 *
 * Mapa próprio, e não `AREA_ROUTES` de `@/config/areaCategories`: aquela é a
 * taxonomia de PERMISSÃO, e o cabeçalho deste arquivo explica por que as duas não
 * se amarram — mudança de permissão não deve mexer em navegação de tela.
 */
export const VOLTA_DO_ESPELHO = {
  tax: { rota: '/equipe/tax', rotulo: 'Tax' },
  osg: { rota: '/equipe/osg', rotulo: 'OSG' },
} as const;

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
