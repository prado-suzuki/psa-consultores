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

/**
 * Religa, em profundidade, a origem de `destino` à de `fonte` — duas estruturas
 * de MESMA FORMA. Como a origem some no JSON (ver acima), um snapshot reidratado
 * do jsonb chega sem ela; aqui copiamos a origem dos dados VIVOS (que a têm) para
 * o snapshot (que guarda o texto congelado), casando objeto a objeto e item a
 * item por índice. Onde as formas divergirem (cadastro mudou desde a validação),
 * copia o que casa e ignora o resto — nunca quebra. Mutação proposital e
 * idempotente; o WeakSet barra ciclos (o `refItem` das integralizações).
 */
export function copiarOrigemProfunda(destino: unknown, fonte: unknown, vistos = new WeakSet<object>()): void {
  if (destino === null || typeof destino !== 'object') return;
  if (fonte === null || typeof fonte !== 'object') return;
  if (vistos.has(destino)) return;
  vistos.add(destino);

  if (Array.isArray(destino) && Array.isArray(fonte)) {
    const n = Math.min(destino.length, fonte.length);
    for (let i = 0; i < n; i++) copiarOrigemProfunda(destino[i], fonte[i], vistos);
    return;
  }
  if (Array.isArray(destino) || Array.isArray(fonte)) return;

  const origem = origemDe(fonte);
  if (origem) comOrigem(destino, origem);

  const fonteObj = fonte as Record<string, unknown>;
  for (const [chave, valor] of Object.entries(destino as Record<string, unknown>)) {
    if (chave in fonteObj) copiarOrigemProfunda(valor, fonteObj[chave], vistos);
  }
}
