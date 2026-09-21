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
      falhas.push(
        `${peca.nome}: ${resultado.erro ?? 'o servidor não devolveu o arquivo desta apresentação'}`,
      );
    }
  }

  return { gerados, falhas };
}
