import { describe, expect, it } from 'vitest';

import { familiaCrua, medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca da fila do `gray`.
 *
 * O `gray` era a MAIOR família de cor crua do produto — 580 ocorrências em 61
 * arquivos, medidas em 10/09/2026 — e não estava em lista de retomada nenhuma.
 * O motivo de ter passado despercebido está escrito em
 * `docs/geral/cor-o-que-falta.md`, §5, e vale repetir aqui porque é o que faz
 * esta catraca existir: o nome `gray` ESTÁ no `tailwind.config.ts`, e isso dá a
 * impressão de que a regra `escala/cor-de-estoque` cobre. Ela cobre só o TOM que
 * a escala do projeto não define. `bg-gray-500` sempre foi classe válida e
 * nenhuma regra teve o que dizer.
 *
 * O QUE O `gray` É: a família de cinza que vem de fábrica com o Tailwind. Quem
 * escreve `text-gray-500` pinta um cinza frio FIXO, igual na Tax, na OSG e na
 * casa, enquanto tudo em volta muda com a área.
 *
 * A CONVERSÃO, em duas passadas, sobre as telas internas (479 de 580):
 *
 * - texto primário (`gray-900/800/700`): a classe SOME e o elemento herda o
 *   `foreground` da área. Não foi invenção — medido, dos 509 `<Label>` do
 *   produto 400 JÁ não tinham cor nenhuma. Tirar alinhou os 66 `gray-700` com os
 *   443 que já liam assim;
 * - texto secundário (`gray-600/500/400`): virou `muted-foreground`. Aqui a
 *   classe não pode sumir, senão herda o `foreground` e fica preto;
 * - `bg-gray-50` virou `bg-muted`; o selecionado dos seletores de mês, que era
 *   `bg-gray-900` — preto FIXO —, virou `bg-primary`, a cor da área;
 * - e quatro mapas com uma entrada de "nenhum/desconhecido" em cinza cru
 *   receberam `--status-neutro`, aplicando uma decisão de 20/08/2026 que estava
 *   registrada em `comparacoes-de-cor/cinza-de-desligado.html` e nunca tinha
 *   chegado ao código.
 *
 * A FILA NÃO ZERA, e não devia. Sobra o que está abaixo, agrupado pelo MOTIVO de
 * ter ficado — e é o motivo, não o número, que faz esta lista servir. Quem for
 * converter o próximo grupo não precisa reclassificar do zero.
 *
 * A asserção é de igualdade EXATA, então a lista é catraca nos dois sentidos:
 * cinza NOVO em arquivo fora da lista derruba; cinza novo em arquivo DA lista
 * derruba, porque a contagem muda; e converter um sítio derruba igual, pedindo
 * que a contagem caia ou que o arquivo saia. A fila só diminui, e nunca de
 * fininho.
 */
type MotivoDeFicar =
  /** O site público. Ele pinta a PRÓPRIA paleta, com seções escuras de propósito
      — o `Footer` é `bg-gray-900`, o `LocationsSection` é `bg-gray-600` —, e ali
      o `gray-400` é claro sobre escuro, ou seja está CERTO.

      A decisão de deixá-lo fora é dela, tomada em 10/09/2026 com o argumento na
      mesa: converter a landing para token faria ela seguir a cor das áreas
      internas, e isso não é dívida técnica, é identidade. Landing é outro
      produto, com outra régua.

      ⚠️ Não converta um arquivo daqui "de passagem" ao mexer em outro. Se a
      decisão mudar, ela muda para o grupo inteiro e de uma vez. */
  | 'site-publico'
  /** Componente que NINGUÉM importa. Conferido em 10/09/2026, um a um:
      `LocationsSection`, `TestimonialsSection`, `TimelineSection` e
      `SectionTransition` têm zero importadores.

      Converter cor de código morto é trabalho que não chega em tela nenhuma. O
      que estes quatro pedem é a pergunta anterior — apagar ou ligar —, e essa é
      de produto. Ficam aqui para não serem confundidos com dívida de cor. */
  | 'orfao'
  /** Bloco de código (`<pre>`), escuro de propósito: realce de sintaxe precisa de
      contraste, e o `index.css` já diz isso na seção do bloco de código. Este
      cinza não é resíduo, é escolha — e é o único do recorte INTERNO que fica. */
  | 'bloco-de-codigo';

const FILA_DO_GRAY: Record<MotivoDeFicar, Record<string, number>> = {
  'site-publico': {
    'src/components/AboutSection.tsx': 4,
    'src/components/ContactSection.tsx': 4,
    'src/components/Footer.tsx': 6,
    'src/components/Header.tsx': 14,
    'src/components/Hero.tsx': 1,
    'src/components/MetricsBar.tsx': 2,
    'src/components/OfficesSection.tsx': 10,
    'src/components/ResultsSection.tsx': 5,
    'src/components/Services.tsx': 3,
    'src/components/novidades/NovidadesShowcase.tsx': 1,
    'src/components/services/PilarCard.tsx': 9,
    // O `Auth` é o maior sozinho, e é a porta de entrada — a mesma tela da
    // decisão "porta de entrada" que segue aberta em `comparacoes-de-cor`. Mexer
    // no cinza dele antes daquela decisão é remendar o que vai ser redesenhado.
    'src/pages/Auth.tsx': 38,
    'src/pages/Index.tsx': 2,
    'src/pages/Missao.tsx': 10,
    'src/pages/NovidadeDetalhe.tsx': 7,
    'src/pages/Novidades.tsx': 13,
  },
  orfao: {
    'src/components/LocationsSection.tsx': 7,
    'src/components/SectionTransition.tsx': 4,
    'src/components/TestimonialsSection.tsx': 3,
    'src/components/TimelineSection.tsx': 4,
  },
  'bloco-de-codigo': {
    'src/components/equipe/TarefaRichTextView.tsx': 2,
  },
};

describe('fila do gray', () => {
  it('o cinza de fábrica só existe onde esta lista diz, e na contagem que ela diz', () => {
    const medido = medirCorCrua(familiaCrua('gray'));
    const esperado = Object.assign({}, ...Object.values(FILA_DO_GRAY)) as Record<string, number>;

    expect(
      medido,
      'a fila do `gray` mudou. Se APARECEU cinza novo: ele é de fábrica do Tailwind\n' +
        'e não segue o tema — texto primário some (herda `foreground`), secundário vira\n' +
        '`muted-foreground`, fundo claro vira `bg-muted`, e entrada de "nenhum" em mapa\n' +
        'vira `--status-neutro`.\n' +
        'Se você CONVERTEU um sítio: baixe a contagem do arquivo aqui, ou tire o\n' +
        'arquivo se zerou.',
    ).toEqual(esperado);
  });

  it('o recorte interno só tem o bloco de código', () => {
    // O par da asserção acima, e ele guarda o que de fato foi conquistado: as
    // telas internas — as que vestem tema de área — estão limpas. Sem esta
    // linha, alguém poderia mover um arquivo interno para a fila do site público
    // e o primeiro teste continuaria verde.
    const interno = Object.keys(medirCorCrua(familiaCrua('gray'))).filter(caminho =>
      /\/(equipe|cliente|administracao|gestao|acessos|ui|chamados|dashboard|tour|layout|sprint)\//.test(
        caminho,
      ),
    );
    expect(interno, 'tela interna voltou a ter cinza de fábrica').toEqual([
      'src/components/equipe/TarefaRichTextView.tsx',
    ]);
  });
});
