/**
 * Mapeamento único e canônico de áreas internas → categorias de páginas.
 *
 * Fonte única da verdade para:
 * - Form de criação/edição de usuário em EquipeControleAcessos
 * - Verificação de acesso por área no login (EquipeAuth)
 * - Inferência de áreas já liberadas ao editar usuário
 *
 * IMPORTANTE: As strings em `categories` devem existir em protectedPages.ts
 * (campo `category`) e em page_permissions.category. Categorias "fantasma"
 * (sem páginas associadas) tornam a inferência `every()` sempre false.
 */
export type AreaKey =
  | 'digital' | 'tax' | 'osg' | 'auditoria' | 'juridico'
  | 'board' | 'controle_site' | 'adm_fin';

export interface AreaDefinition {
  label: string;
  /** Categorias de `page_permissions.category` que compõem esta área. */
  categories: string[];
}

export const AREA_CATEGORIES_MAP: Record<AreaKey, AreaDefinition> = {
  // O nome oficial do cluster tem espaco e `&`, e nenhum dos dois sobrevive a
  // URL. Por isso a CHAVE e o CAMINHO sao escritos aqui, a mao, e nunca
  // derivados do nome (ver `docs/geral/inventario-telas-por-cluster.md`).
  adm_fin: { label: 'Adm & Fin', categories: ['adm_fin'] },
  // A `dev` saiu em 22/09/2026: as 30 paginas do Digital Dev viraram Tax Work e
  // foram para a categoria `tax`. Manter `dev` aqui a tornaria categoria
  // FANTASMA, e o aviso no topo deste arquivo diz o que isso quebra: a
  // inferencia `every()` de "esta pessoa ja tem a area Digital" nunca mais
  // fecharia, porque nao existe pagina nenhuma para satisfazer.
  digital: { label: 'Digital', categories: ['rotina'] },
  // UMA categoria, cobrindo as DUAS portas da area (TAX Projects e TAX Work),
  // no mesmo desenho da OSG — decisao do Bernardo em 22/09/2026.
  //
  // Houve uma versao com `tax_work` separada, justificada por um argumento que
  // nao se sustentou: conceder a area em lote resolve pela LISTA de categorias,
  // e a area listava as duas, entao o botao ja entregava as 42 paginas nos dois
  // desenhos. A separacao so mudava o agrupamento da arvore de permissoes.
  tax: { label: 'Tax', categories: ['tax'] },
  osg: { label: 'OSG', categories: ['osg'] },
  // Uma categoria por area, no desenho da OSG e da Tax.
  auditoria: { label: 'Auditoria', categories: ['auditoria'] },
  juridico: { label: 'Jurídico', categories: ['juridico'] },
  board: { label: 'Board', categories: ['board'] },
  controle_site: { label: 'Marketing', categories: ['gestao'] },
};

/** Todas as categorias "de área" (usado para saber o que pode ser revogado). */
export const ALL_AREA_CATEGORIES: string[] = Object.values(AREA_CATEGORIES_MAP).flatMap(
  (a) => a.categories
);

/** Rotas de destino ao selecionar uma área no login. */
export const AREA_ROUTES: Record<AreaKey, string> = {
  adm_fin: '/equipe/adm-fin',
  digital: '/equipe/digital',
  tax: '/equipe/tax',
  osg: '/equipe/osg',
  auditoria: '/equipe/auditoria',
  juridico: '/equipe/juridico',
  controle_site: '/gestao',
  board: '/equipe/board/dashboard',
};

/** Lista ordenada para o select de área no login. */
export const AREAS_LIST: Array<{ id: AreaKey; label: string }> = [
  { id: 'adm_fin', label: 'Adm & Fin' },
  { id: 'auditoria', label: 'Auditoria' },
  { id: 'board', label: 'Board' },
  { id: 'digital', label: 'Digital' },
  { id: 'juridico', label: 'Jurídico' },
  { id: 'controle_site', label: 'Marketing' },
  { id: 'osg', label: 'OSG' },
  { id: 'tax', label: 'Tax' },
];
