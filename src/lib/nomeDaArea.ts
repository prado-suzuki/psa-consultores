/**
 * O nome de cada área, como o usuário o lê na tela.
 *
 * POR QUE ISTO EXISTE. O nome era escrito à mão dentro de cada layout — "Tax" no
 * `FiscalSidebar`, "Digital Rotina" no `EquipeLayout`, "Digital Dev" em DOIS
 * pontos do `DevLayout` (a barra e o cartão do usuário), e assim por diante. Sete
 * áreas, nove pontos de escrita. Enquanto o nome aparecia num lugar só por área
 * isso passava; em 10/09/2026 ele passou a aparecer em dois — a barra lateral e o
 * sobretítulo do cabeçalho —, e duplicar a decisão é como ela diverge.
 *
 * É o terceiro caso do mesmo dia, e o padrão já tem forma: decisão repetida por
 * arquivo diverge e não avisa. Antes foram o fundo de página (cinco dos oito
 * layouts pintando com a superfície rebaixada) e o título (seis cópias idênticas
 * mais uma que já tinha divergido sozinha).
 *
 * POR QUE NÃO REUSA `AREA_CATEGORIES_MAP` DE `@/config/areaCategories`. Aquele
 * mapa é a taxonomia de PERMISSÃO, e lá o `digital` engloba a Rotina e o Dev num
 * item só — que aqui são duas áreas com nomes diferentes na tela. É o mesmo
 * argumento que o `areaTheme.ts` já faz para não amarrar permissão a tema:
 * mudança de permissão não deve reescrever o cabeçalho de ninguém.
 *
 * POR QUE NÃO REUSA `AreaDeTema` DE `@/lib/areaTheme`. Porque aquele recorte
 * responde "de que área é esta ROTA?", para resolver cor, e ele não conhece a
 * Gestão, a Administração nem os Fixos — que têm layout e nome, mas não têm
 * paleta própria. São perguntas diferentes sobre o mesmo negócio.
 *
 * A OSG TEM TRÊS NOMES e isso é de propósito: ela se apresenta como "OSG Work"
 * nas ferramentas e "OSG Projects" no acompanhamento. Quem escolhe entre eles
 * continua sendo o `OsgLayout`, que já tem os predicados de rota para o menu —
 * este arquivo guarda os NOMES, não a decisão de qual rota é qual.
 */
export interface NomeDeArea {
  /** O nome curto, que vira título da barra lateral e sobretítulo do cabeçalho. */
  nome: string;
  /** A linha de apoio embaixo do nome, só na barra lateral. */
  subtitulo: string;
}

export const AREAS = {
  tax: { nome: 'Tax', subtitulo: 'Gestão de Projetos' },
  rotina: { nome: 'Digital Rotina', subtitulo: 'Gestão de Projetos' },
  dev: { nome: 'Digital Dev', subtitulo: 'Ambiente de desenvolvimento' },
  gestao: { nome: 'Gestão', subtitulo: 'Painel de Controle' },
  admin: { nome: 'Administração', subtitulo: 'Gestão Geral' },
  fixos: { nome: 'Fixos', subtitulo: 'Área Fixos' },
  // O Controle de Acessos ganhou barra propria em 10/09/2026: ate ali era a
  // unica tela de dentro do sistema sem barra nenhuma, e por isso a unica sem
  // o cartao do usuario. O menu dela sao as sete secoes que eram abas.
  acessos: { nome: 'Acessos', subtitulo: 'Controle de acessos' },

  // ── OSG: três apresentações da mesma área ──────────────────────────────
  osg: { nome: 'OSG', subtitulo: 'Área OSG' },
  osgWork: { nome: 'OSG Work', subtitulo: 'Ferramentas OSG' },
  osgProjects: { nome: 'OSG Projects', subtitulo: 'Projetos OSG' },
} as const satisfies Record<string, NomeDeArea>;

/** As chaves como tipo: nome de área errado vira erro de compilação. */
export type ChaveDeArea = keyof typeof AREAS;
