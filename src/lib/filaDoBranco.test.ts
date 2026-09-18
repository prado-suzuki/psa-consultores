import { describe, expect, it } from 'vitest';

import { medirCorCrua, medirEmCaixaArredondada } from '@/lib/medirCorCrua';

/**
 * Catraca da fila do `bg-white`.
 *
 * O DEFEITO QUE ISTO FECHA, e ele é diferente do das outras cinco filas. As
 * famílias (`gray`, `teal`, `red`/`emerald`, `blue`) eram cor crua que a regra
 * de ESLint via ou podia ver. O `bg-white` **nenhuma das duas catracas de
 * superfície enxergava**:
 *
 * · a `cartaoTingido` procura `bg-card`, e `bg-white` não é `bg-card`;
 * · a de cor crua (`ui/token-nao-sobrescrito`) só dispara quando alguém
 *   sobrescreve componente do `ui/` — uma `div` solta não passa por lá.
 *
 * Então uma caixa branca escrita à mão nascia, vivia e se multiplicava sem
 * nenhum mecanismo reclamar. Era o ponto cego entre duas catracas, e não a
 * falha de nenhuma delas.
 *
 * POR QUE `bg-white` É DÍVIDA, e não estilo. Ele é o branco literal do
 * Tailwind, não um token, e isso custa duas coisas de uma vez: **não acompanha
 * tema** (no escuro continua branco) e **não pega a temperatura da área** — a
 * OSG é areia (`32 28% 98.5%`), a Tax é cinza-azulado (`192 18% 99.6%`), e ele
 * é branco puro e frio no meio das duas. Nas 12 caixas de tela da OSG isso
 * aparecia na mesma string: `border-osg-200/70` e
 * `shadow-[…hsl(var(--osg-700)/…)]` ao lado de um `bg-white` que ignorava a
 * área. Metade da caixa acompanhava, a outra metade não.
 *
 * O NÚMERO DO ÍNDICE ESTAVA ERRADO, e o conserto veio antes da conversão. O
 * índice dizia "142 em 79 arquivos" — o total bruto da época, não o recorte de
 * caixa. Remedido em 17/09/2026 com o scanner da própria `cartaoTingido` (que
 * lê a EXPRESSÃO de classe, não a linha): **139 em 78** no total e **60 em 43**
 * em caixa arredondada. A dívida real era 60, menos da metade do que o índice
 * prometia.
 *
 * COMO FOI CONVERTIDA, em dois lotes, e o corte entre eles é o que importa:
 *
 * · **Lote 1 — 20 casos, sem decisão dela.** Controle, conteúdo dentro de
 *   cartão e caixa sobre painel rebaixado: lugares onde o claro já era a
 *   resposta certa. `bg-white` → `bg-card`, que na casa é pixel idêntico
 *   (`--card` da `.base-theme` é `0 0% 100%`).
 * · **Lote 2 — 27 casos, decididos olhando** a página
 *   `comparacoes-de-cor/o-branco-literal-das-27.html`, que montou cada papel
 *   nas duas áreas, branco contra tingido. Ela escolheu **claro nos quatro
 *   papéis** — cartão de conteúdo, cabeçalho de resumo, barra de filtros e
 *   lista vazia. A caixa de tabela (2) seguiu a decisão B de 16/09 sem decisão
 *   nova.
 *
 * O ACHADO QUE MUDOU O LOTE 2, e ele não estava previsto: **na OSG, `--card` e
 * `--background` são o MESMO valor**. Uma caixa que vire `bg-card` ali fica a
 * 1,000:1 contra a página — some, e quem a segura é a borda. O `bg-white`
 * literal, que era `#FFFFFF` de verdade, estava a 1,031:1. Ou seja, **a
 * conversão PERDEU separação na OSG**, e perdeu de propósito: é o mesmo custo
 * que a caixa de tabela aceitou em 16/09, pago em troca de a caixa acompanhar
 * tema e área. Tingir era a única saída que separava de fato (1,072:1), e foi
 * recusada olhando.
 *
 * A FILA NÃO ZERA, e não devia. O que sobra está agrupado pelo MOTIVO de ter
 * ficado — é o motivo, e não o número, que faz a lista servir para a próxima
 * conversão em vez de só contar.
 *
 * A asserção é de igualdade EXATA, então cai nos dois sentidos: reprova se
 * aparecer branco literal novo em caixa, e reprova também quando um grupo for
 * convertido e os números descerem — dizendo, na mensagem, o que fazer.
 */

/** `bg-white` com ou sem alfa, inclusive sob variante (`hover:`, `md:`). */
const BRANCO_LITERAL = /\b(?:[a-z-]+:)*bg-white(?:\/\d{1,3})?\b/g;

const FILA_DO_BRANCO = {
  /**
   * **Site público.** A landing pinta a própria paleta, e ali o branco literal
   * é escolha de marca, não superfície de produto. É a MESMA decisão que
   * encerrou a fila do `gray` em 10/09/2026, e ela vale pelo mesmo motivo: as
   * telas públicas não vestem tema de área e nunca entram no escuro.
   *
   * O `Hero` e o `LocationsSection` são caso duplo — além de públicos, o branco
   * deles é `bg-white/10` e `bg-white/5` sobre fundo ESCURO, que é o motivo do
   * grupo seguinte. Ficam aqui porque "site público" é o que explica a rota.
   */
  sitePublico: {
    'src/components/ContactSection.tsx': 1,
    'src/components/Hero.tsx': 1,
    'src/components/LocationsSection.tsx': 1,
    'src/components/MetricsBar.tsx': 1,
    'src/components/OfficesSection.tsx': 1,
    'src/components/ResultsSection.tsx': 1,
    'src/components/novidades/NovidadesShowcase.tsx': 1,
    'src/pages/Novidades.tsx': 1,
  },

  /**
   * **Véu sobre fundo escuro.** `bg-white/15` sobre uma faixa escura não é
   * superfície: é um clareador, e o branco com alfa é a leitura certa dele.
   * Trocar por `bg-card/15` daria o mesmo pixel na casa e um pixel ERRADO na
   * OSG, onde `--card` é areia — um véu de areia sobre escuro puxa a faixa para
   * o marrom.
   */
  veuSobreEscuro: {
    'src/components/dashboard/momentum/HeroBanner.tsx': 1,
    'src/components/equipe/sprint-detalhes/DeliverableDialogs.tsx': 1,
  },

  /**
   * **Conteúdo de documento, não superfície do produto.** Os dois são a moldura
   * de um `<iframe>` de PDF, e **a página do PDF é branca** — o branco ali é o
   * assunto, como nas duas caixas da `FolhaDocumento` que já moram no motivo
   * `folha-de-papel` da `cartaoTingido`.
   *
   * Vale registrar por que NÃO foram convertidos junto com o resto: o `iframe`
   * é `h-full w-full`, então o fundo só aparece enquanto o PDF carrega. Seria
   * conversão sem consequência visível, e é exatamente o tipo de mudança que
   * enche o diff sem pagar nada.
   */
  conteudoDeDocumento: {
    'src/components/equipe/osg/documentos/classificar/ClassificarLevaDialog.tsx': 1,
    'src/components/equipe/osg/documentos/classificar/DocumentoVisualizador.tsx': 1,
  },

  /**
   * **Flutua sobre conteúdo.** O tooltip do gráfico da calculadora IBS/CBS. É o
   * primeiro motivo do inventário da `cartaoTingido`, pelo mesmo argumento:
   * superfície com alfa sobre conteúdo arbitrário deixa passar o que está
   * atrás, e o tooltip precisa de opaca.
   *
   * Aqui o literal poderia virar `bg-card` sem perda — e não virou porque na
   * OSG isso o deixaria a 1,000:1 contra a página, e tooltip é justamente o
   * elemento que não pode se confundir com o fundo. É o único da fila em que a
   * conversão pioraria o que ela existe para melhorar.
   */
  flutuaSobreConteudo: {
    'src/components/equipe/dev/calculadora-ibs-cbs/AbaPorProduto.tsx': 1,
  },
} as const;

/**
 * O total FORA do recorte de caixa, medido em 17/09/2026.
 *
 * São 92 ocorrências em 57 arquivos, e elas não são dívida escondida: é texto
 * branco sobre fundo escuro, ícone, borda, e `rounded-full`/`rounded-sm`, que a
 * definição de "objeto" deixa de fora de propósito — pílula e chip não são
 * superfície. O número está aqui para a próxima medição não confundir os dois
 * recortes, que foi exatamente o erro do "142" do índice.
 */
const TOTAL_FORA_DO_RECORTE_DE_CAIXA = 92;

describe('fila do branco literal', () => {
  it('nenhuma caixa arredondada pinta `bg-white`, fora do que esta lista diz', () => {
    const medido = medirEmCaixaArredondada(BRANCO_LITERAL);
    const esperado = Object.assign({}, ...Object.values(FILA_DO_BRANCO)) as Record<string, number>;

    expect(
      medido,
      'a fila do `bg-white` mudou.\n' +
        'Se APARECEU branco literal novo em caixa: ele não é um papel, é ausência de\n' +
        'escolha — não acompanha tema nem área. O destino é `bg-card` quando a caixa\n' +
        'precisa ficar CLARA (controle, conteúdo dentro de cartão, caixa sobre painel\n' +
        'rebaixado) e `bg-superficie-cartao` quando ela é o objeto cartão.\n' +
        '⚠️ Na OSG `--card` e `--background` têm o MESMO valor, então `bg-card` ali\n' +
        'fica a 1,000:1 contra a página e quem segura a caixa é a BORDA: não use\n' +
        '`bg-card` sem borda numa tela da OSG.\n' +
        'Se você CONVERTEU um sítio: tire o arquivo daqui — e tire o grupo inteiro se\n' +
        'ele esvaziou. A entrada tem de sair, senão a lista passa a mentir.',
    ).toEqual(esperado);
  });

  it('nenhum arquivo está em dois grupos, porque aí a contagem mentiria', () => {
    // O `Object.assign` do teste acima faz o último grupo VENCER em silêncio se
    // o mesmo arquivo aparecer duas vezes — e a soma passaria a ignorar uma das
    // entradas.
    const todos = Object.values(FILA_DO_BRANCO).flatMap(grupo => Object.keys(grupo));
    expect(todos, 'arquivo repetido entre dois grupos da fila').toEqual([...new Set(todos)]);
  });

  it('o total fora do recorte de caixa não cresce sem alguém olhar', () => {
    const total = Object.values(medirCorCrua(BRANCO_LITERAL)).reduce((a, b) => a + b, 0);

    expect(
      total,
      'o `bg-white` FORA de caixa arredondada mudou de tamanho.\n' +
        'Esse recorte é texto, ícone, borda, pílula e chip — não é a mesma dívida da\n' +
        'caixa, e foi confundir os dois que fez o índice prometer 142 quando a dívida\n' +
        'real era 60. Se subiu, confira se o caso novo não é caixa disfarçada de chip;\n' +
        'se desceu, baixe o número aqui.',
    ).toBe(TOTAL_FORA_DO_RECORTE_DE_CAIXA);
  });
});
