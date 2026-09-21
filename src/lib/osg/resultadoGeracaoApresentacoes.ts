import type { ResultadoDosDecks } from '@/hooks/useGerarApresentacao';

export interface PecaDeDeckEsperada {
  nome: string;
  tipo: 'patrimonial' | 'societaria';
}

/**
 * Confere cada apresentação selecionada contra o retorno da Edge Function.
 *
 * A chamada `ambas` pode devolver dois arquivos. Por isso a confirmação não
 * pode contar chamadas HTTP: ela precisa confirmar cada peça que a pessoa marcou.
 */
export function conferirDecksGerados(
  esperadas: readonly PecaDeDeckEsperada[],
  resultado: ResultadoDosDecks,
): { gerados: string[]; falhas: string[] } {
  const gerados: string[] = [];
  const falhas: string[] = [];

  for (const peca of esperadas) {
    const arquivo = resultado.arquivos.find((item) => item.tipo === peca.tipo);
    if (arquivo) {
      gerados.push(arquivo.nome);
    } else {
      /*
        O MOTIVO DAQUELE DECK, e não o genérico.

        A função já devolvia `erros` por peça — "Template ausente:
        TEMPLATE_SOCIETARIA.pptx" — e o cliente jogava fora, então a pessoa lia
        "o servidor não devolveu o arquivo" para uma falha que tinha nome. O
        genérico só sobra quando nem o servidor sabe dizer.
      */
      const doDeck = resultado.errosPorDeck?.find((e) => e.tipo === peca.tipo)?.message;
      falhas.push(
        `${peca.nome}: ${doDeck ?? resultado.erro ?? 'o servidor não devolveu o arquivo desta apresentação'}`,
      );
    }
  }

  return { gerados, falhas };
}
