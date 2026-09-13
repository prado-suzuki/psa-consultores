import { describe, expect, it } from 'vitest';

import { PROPRIEDADES_DE_COR, familiaCrua, medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca do Dashboard ROI — a tela que vira IMAGEM e sai da casa.
 *
 * É a forma "por TELA", igual à `corCruaNaTelaDoDev`, e existe por um motivo que
 * nenhuma outra tela tem: esta é rasterizada por `html-to-image` e vira o PNG do
 * HTML e do PDF que vão para a apresentação do cliente. Cor errada aqui não
 * some quando alguém corrige a tela — ela já foi enviada por e-mail.
 *
 * **O que fechou em 11/09/2026 (decisão dela).** As barras, linhas, rótulos e
 * legendas estavam em hex fixo, e o teal delas (`#0d9488`) era o do Tailwind,
 * não o da marca: um relatório gerado a partir da OSG, que é musgo, saía com o
 * mesmo verde-água de um gerado a partir da Tax, que é petróleo. Agora tudo sai
 * de `@/lib/coresDoGrafico`, que LÊ o tema aplicado no momento do desenho.
 *
 * **Por que a leitura é do DOM e não `hsl(var(--x))` no SVG:** `html-to-image`
 * clona o nó e resolve estilo computado, mas atributo de SVG (`fill="..."`) é
 * copiado como texto — um `var()` ali chega ao clone sem o bloco de tema e
 * resolve para nada. A barra sairia certa na tela e preta no arquivo, que é o
 * pior defeito possível. O porquê inteiro está no docstring do lib.
 */
const ARQUIVOS_DA_TELA = [
  'src/components/equipe/mapa/dashboard-roi/Charts.tsx',
  'src/components/equipe/mapa/dashboard-roi/Primitives.tsx',
  'src/pages/equipe/mapa/DashboardRoiPage.tsx',
];

/**
 * O que ficou, com o motivo — e é uma coisa só.
 *
 * `gargalosPorOrigem` pinta SEIS origens (Cliente, Interno, Processo, Externo,
 * Sistema, Pessoas) e o contrato tem QUATRO `--tag-*`. É o caso da seção "as 12
 * paletas categóricas" do `cor-o-que-falta.md`, e a proposta que eu levei para
 * ela em 11/09 — cor por grupo, rótulo por categoria — **foi recusada**. Sem
 * decisão, converter aqui seria inventar a quinta e a sexta cor por conta
 * própria, que é exatamente o que o contrato proíbe.
 *
 * Fica medido e escrito em vez de virar dívida invisível. Quando a decisão das
 * categóricas sair, este bloco some e a tela fecha inteira.
 */
const FILA_A_DECIDIR: Record<string, number> = {
  'src/pages/equipe/mapa/DashboardRoiPage.tsx': 5,
};

const FAMILIAS_DO_ESTOQUE = familiaCrua(
  'slate', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
  'green', 'emerald', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple',
  'fuchsia', 'pink', 'rose',
);

const BRANCO_E_PRETO = new RegExp(
  String.raw`\b(?:[a-z-]+:)*(?:${PROPRIEDADES_DE_COR})-(?:white|black)\b`,
  'g',
);

const VALOR_NA_MAO = /rgba?\([\d,.\s]+\)|#[0-9a-fA-F]{3,8}\b/g;

function soDaTela(medido: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(medido).filter(([caminho]) => ARQUIVOS_DA_TELA.includes(caminho)),
  );
}

const DESTINOS = 'Os destinos, e todos saem de coresDoGrafico():\n'
  + '  o que melhora, a economia          -> cores.ancora (a âncora da ÁREA)\n'
  + '  a parte ainda não realizada        -> cores.ancoraFraca\n'
  + '  o "como era"                       -> cores.anterior\n'
  + '  custo, investimento                -> cores.custo\n'
  + '  marco de payback                   -> cores.marco\n'
  + '  grade, conector                    -> cores.grade\n'
  + '  rótulo dentro do desenho           -> cores.rotulo\n'
  + '  série de CATEGORIA                 -> cores.categorias[n] (--tag-*)\n'
  + '  série de ESTADO                    -> cores.estados.<papel>';

describe('cor crua no Dashboard ROI', () => {
  it('não tem classe de família do estoque do Tailwind', () => {
    expect(
      soDaTela(medirCorCrua(FAMILIAS_DO_ESTOQUE)),
      `Voltou cor crua de família ao Dashboard ROI.\n${DESTINOS}`,
    ).toEqual({});
  });

  it('não tem `white` nem `black`', () => {
    expect(
      soDaTela(medirCorCrua(BRANCO_E_PRETO)),
      'Voltou `white`/`black` ao Dashboard ROI.\n'
        + 'Esta tela é exportada: o fundo branco do PNG já é decidido no toPng\n'
        + '(`backgroundColor`), e dentro do desenho a superfície é bg-card.',
    ).toEqual({});
  });

  it('só tem valor na mão onde a decisão das categóricas ainda falta', () => {
    // Asserção contra a FILA, não contra vazio: ela cai nos DOIS sentidos. Se
    // alguém repintar a tela com hex, sobe; quando a decisão das categóricas
    // sair e as seis origens virarem token, desce — e o teste falha dizendo
    // para atualizar a fila, que é como o inventário não envelhece calado.
    expect(
      soDaTela(medirCorCrua(VALOR_NA_MAO)),
      'O hex na mão do Dashboard ROI mudou de tamanho.\n'
        + 'O que ainda pode ter: as 6 origens de `gargalosPorOrigem`, que esperam a\n'
        + `decisão das paletas categóricas.\n${DESTINOS}`,
    ).toEqual(FILA_A_DECIDIR);
  });
});
