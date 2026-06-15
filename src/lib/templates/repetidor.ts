import type { Bloco, Contexto } from './types';

// Expansão de blocos repetidores: a ponte entre "um parágrafo por sócio que
// integraliza" e a numeração estrutural. Roda DEPOIS do filtro de flags e ANTES
// de numerarBlocos — as instâncias entram na sequência como blocos normais do
// mesmo tipo, então "Parágrafo Segundo/Terceiro…" (e o caso "Parágrafo Único")
// saem da numeração de sempre, nunca de cálculo no mapeador de dados.

/**
 * Expande cada bloco com `repeteColecao` numa instância por item da coleção do
 * contexto, com o item como `escopo` de render (placeholders do conteúdo
 * resolvem do item para fora — mesma pilha de escopos das seções {{#…}}).
 *
 * As instâncias apontam para o PRÓPRIO objeto do item, sem clone: é nele que a
 * composição carimba {{ ref }} (ver index.ts), e é ele que as seções
 * {{#colecao}} de outros blocos iteram — a referência cruzada "no parágrafo
 * segundo desta cláusula" funciona por identidade de objeto, sem tabela paralela.
 *
 * Coleção vazia ⇒ o bloco sai da composição (como uma seção sobre array vazio);
 * coleção ausente no contexto ⇒ erro (falha cedo, como um placeholder não
 * resolvido). Dois repetidores sobre a MESMA coleção disputariam o carimbo
 * {{ ref }} — sinal de que o documento precisa de coleções distintas.
 */
export function expandirRepetidores(blocos: Bloco[], contexto: Contexto): Bloco[] {
  if (!blocos.some((b) => b.repeteColecao)) return blocos;

  const out: Bloco[] = [];
  for (const bloco of blocos) {
    if (!bloco.repeteColecao) {
      out.push(bloco);
      continue;
    }
    const itens = contexto[bloco.repeteColecao];
    if (!Array.isArray(itens)) {
      throw new Error(`Coleção do bloco repetidor não resolvida: {{#${bloco.repeteColecao}}}`);
    }
    itens.forEach((item, i) => {
      out.push({
        ...bloco,
        id: `${bloco.id}#${i + 1}`,
        instanciaDe: bloco.id,
        escopo: (item ?? {}) as Contexto,
        repeteColecao: undefined,
      });
    });
  }
  return out;
}
