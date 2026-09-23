import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { arquivosDeCodigo, PASTAS_DE_TELA } from '@/lib/medirCorCrua';

/**
 * Catraca da caixa de tabela: **cartão que envolve `<Table>` é BRANCO.**
 *
 * ESTA CATRACA OLHA PARA O OUTRO LADO, e é de propósito. A `cartaoTingido`
 * pergunta "esta caixa branca está autorizada?"; esta pergunta "este cartão de
 * tabela está branco?". As duas convivem porque cobrem regras opostas sobre o
 * mesmo componente, e o recorte que separa uma da outra é uma coisa só: ter
 * `<Table>` dentro.
 *
 * POR QUE ELA PRECISA EXISTIR. A decisão dela em 16/09/2026 foi "tabela branca".
 * Sem catraca, a próxima tela com tabela nasce TINGIDA — não por descuido, mas
 * porque `<Card>` sem variante continua sendo o que parece certo escrever, e o
 * resultado não dá erro de build, de tipo nem de lint. Foi exatamente assim que a
 * assimetria que originou esta frente se formou: em 16/09 havia 45 cartões de
 * tabela tingidos por HERANÇA, nenhum deles escolhido, contra 1 branco escolhido
 * olhando.
 *
 * O QUE DECIDIU, medido em `docs/geral/comparacoes-de-cor/a-caixa-da-tabela.html`:
 * **o hover de linha tem teto.** A zebra que a tabela perde sobre o cartão
 * tingido se recupera subindo o alfa de 25% para 38%; o hover não, porque é feito
 * de `--muted` e a superfície do cartão já é 35% de `--muted`. Mesmo a 100%, sem
 * transparência, ele para em 1,154:1 contra os 1,175:1 que tem sobre o branco —
 * fim de escala, não calibração. E o hover é o único dos dois que serve para
 * AGIR: saber em qual linha se vai clicar.
 *
 * O QUE ELA NÃO COBRE, de propósito:
 *
 * · **Tabela fora de `<Card>`.** Caixa escrita à mão com `<Table>` dentro é
 *   assunto da `cartaoTingido`, que já cobra `bg-card` à mão em caixa
 *   arredondada. Duplicar aqui daria duas mensagens para o mesmo defeito.
 * · **`<Card>` sem tabela.** Continua tingido, e quem guarda isso é a asserção da
 *   alavanca na `cartaoTingido`.
 * · **Tabela que nasce dentro de um componente filho.** O casamento é textual,
 *   dentro do mesmo arquivo: um `<Card>` que renderiza `<MinhaTabela />` não é
 *   visto. É limite conhecido, e o preço de não ter AST aqui — a alternativa
 *   seria uma varredura de tipos que nenhuma das outras catracas do repo faz.
 */

const RAIZ = resolve(__dirname, '../..');

/**
 * O componente que DEFINE a variante fica de fora.
 *
 * O JSDoc dele cita `<Card>` e `<Table>` em prosa para explicar a regra, e foi
 * exatamente isso que fez a passada de 16/09 injetar `variant="tabela"` dentro de
 * um comentário. A guarda de comentário abaixo já resolveria; a exclusão é o
 * cinto a mais, porque este arquivo é o único do repositório em que a prosa
 * descreve a própria sintaxe que a catraca procura.
 */
const DEFINE_A_VARIANTE = 'src/components/ui/card.tsx';

/** Linha de comentário: JSDoc (`*`), de linha (`//`) ou abertura de bloco. */
const ehComentario = (linha: string) => /^\s*(\*|\/\/|\/\*)/.test(linha);

export interface CartaoDeTabela {
  arquivo: string;
  /** 1-indexada, para o erro apontar onde. */
  linha: number;
  temVariante: boolean;
}

/**
 * Todo `<Card>` do repositório que envolve uma `<Table>`.
 *
 * O casamento é por PROFUNDIDADE: acha o `</Card>` que fecha aquele `<Card>`,
 * contando os aninhados, e pergunta se há `<Table>` no meio. Contar `<Table>` por
 * arquivo daria outro número — foi o erro da primeira medição desta frente, que
 * anunciou 53 caixas quando eram 45, porque havia tabela fora de cartão nos
 * mesmos arquivos.
 */
export function cartoesDeTabela(): CartaoDeTabela[] {
  const achados: CartaoDeTabela[] = [];
  for (const pasta of PASTAS_DE_TELA) {
    for (const caminho of arquivosDeCodigo(resolve(RAIZ, pasta))) {
      const arquivo = relative(RAIZ, caminho).split(sep).join('/');
      if (arquivo === DEFINE_A_VARIANTE || !arquivo.endsWith('.tsx')) continue;
      const texto = readFileSync(caminho, 'utf8');
      if (!texto.includes('<Table')) continue;
      const linhas = texto.split('\n');
      const linhaDe = (pos: number) => texto.slice(0, pos).split('\n').length - 1;

      const abre = /<Card(?![A-Za-z])/g;
      let m: RegExpExecArray | null;
      while ((m = abre.exec(texto))) {
        if (ehComentario(linhas[linhaDe(m.index)])) continue;
        let profundidade = 0;
        let fim = texto.length;
        const tag = /<Card(?![A-Za-z])|<\/Card>/g;
        tag.lastIndex = m.index;
        let t: RegExpExecArray | null;
        while ((t = tag.exec(texto))) {
          if (ehComentario(linhas[linhaDe(t.index)])) continue;
          if (t[0].startsWith('</')) {
            profundidade--;
            if (profundidade === 0) {
              fim = t.index;
              break;
            }
          } else profundidade++;
        }
        const corpo = texto.slice(m.index, fim);
        if (!/<Table(?![A-Za-z])/.test(corpo)) continue;
        const aberturaDaTag = texto.slice(m.index, texto.indexOf('>', m.index) + 1);
        achados.push({
          arquivo,
          linha: linhaDe(m.index) + 1,
          temVariante: /variant\s*=\s*"tabela"/.test(aberturaDaTag),
        });
      }
    }
  }
  return achados;
}

describe('caixa de tabela: cartão que envolve `<Table>` é branco', () => {
  it('todo cartão de tabela declara `variant="tabela"`', () => {
    const semVariante = cartoesDeTabela()
      .filter(c => !c.temVariante)
      .map(c => `${c.arquivo}:${c.linha}`);
    expect(
      semVariante,
      'Cartão que envolve uma `<Table>` sem `variant="tabela"`.\n'
        + 'Decisão dela em 16/09/2026: a caixa de tabela é BRANCA, e isso é a REGRA,\n'
        + 'não uma exceção. Acrescente `variant="tabela"` no `<Card>` apontado.\n'
        + 'O porquê está em docs/geral/comparacoes-de-cor/a-caixa-da-tabela.html:\n'
        + 'o hover de linha tem TETO sobre o cartão tingido (1,154:1 contra 1,175:1\n'
        + 'sobre o branco, mesmo com o alfa no máximo), e o hover é o único dos dois\n'
        + 'que serve para AGIR — saber em qual linha se vai clicar.\n'
        + 'Se esta caixa PRECISA ser tingida, a decisão mudou: mexa na tarefa 11 da\n'
        + 'sprint 13 antes de mexer aqui.',
    ).toEqual([]);
  });

  it('a variante existe no componente, e pinta o branco', () => {
    // A outra metade: a catraca acima cobra os consumidores e não olha o
    // componente. Apagar a variante do `<Card>` faria todos os 45 voltarem a ser
    // tingidos de uma vez, e a asserção de cima continuaria verde — o atributo
    // seguiria escrito, sem efeito nenhum.
    const card = readFileSync(resolve(RAIZ, DEFINE_A_VARIANTE), 'utf8');
    expect(card, 'a variante `tabela` sumiu do `<Card>`').toMatch(
      /variant === "tabela" && "bg-card"/,
    );
    // E ela tem de entrar DEPOIS da string base: `cn` deixa a última vencer, e
    // invertendo a ordem a tinta voltaria a ganhar, calada.
    const base = card.indexOf('bg-superficie-cartao text-card-foreground');
    const variante = card.indexOf('variant === "tabela" && "bg-card"');
    expect(
      variante,
      'a variante passou a vir ANTES da string base: `cn` faria a tinta vencer',
    ).toBeGreaterThan(base);
  });

  it('a medição não é a contagem de `<Table>` por arquivo', () => {
    // Trava do erro que esta frente cometeu ao se abrir: contar `<Table>` nos
    // arquivos que também têm `<Card>` deu 53 caixas, quando são 45 — a diferença
    // é tabela que não está dentro de cartão nenhum. Se a medição voltar a ser por
    // arquivo, este número desencosta e o teste diz onde olhar.
    const todos = cartoesDeTabela();
    expect(todos.length, 'nenhum cartão de tabela encontrado: a varredura quebrou')
      .toBeGreaterThan(40);
    expect(
      new Set(todos.map(c => c.arquivo)).size,
      'mais arquivos do que cartões: a varredura passou a contar por arquivo',
    ).toBeLessThanOrEqual(todos.length);
  });
});
