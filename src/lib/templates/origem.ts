// Proveniência dos valores do contexto: de qual registro do cadastro um objeto
// de campos veio ({ tipo: 'pessoa', id }). Viaja como propriedade Symbol no
// próprio objeto — invisível para os placeholders (nunca colide com um campo) e
// fora de Object.keys/entries, mas COPIADA por spread ({ ...campos }), que é
// como derivarCampos e a edição manual da tela Gerar propagam os campos.
//
// CUIDADO: structuredClone e JSON.parse(JSON.stringify(...)) DESCARTAM chaves
// Symbol — uma cópia por esses caminhos perde a origem em silêncio (o valor
// deixa de ser clicável na prévia). Se um dia o contexto passar por
// serialização, a origem precisa migrar para uma chave reservada comum.

export const ORIGEM: unique symbol = Symbol('origem');

export interface OrigemValor {
  /** Tipo da entidade de origem ('pessoa', 'sociedade'…). O engine não interpreta — quem decide o que é clicável é a UI. */
  tipo: string;
  /** Id do registro no cadastro. */
  id: string;
}

/** Anexa a origem ao objeto de campos (mutação proposital: o objeto segue sendo o mesmo Campos). */
export function comOrigem<T extends object>(campos: T, origem: OrigemValor): T {
  (campos as Record<typeof ORIGEM, OrigemValor>)[ORIGEM] = origem;
  return campos;
}

/** Lê a origem de qualquer valor do contexto; undefined se não for objeto ou não tiver. */
export function origemDe(valor: unknown): OrigemValor | undefined {
  if (valor === null || typeof valor !== 'object') return undefined;
  return (valor as Record<typeof ORIGEM, OrigemValor | undefined>)[ORIGEM];
}
