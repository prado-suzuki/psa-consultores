import type { ResultadoDosDecks } from '@/hooks/useGerarApresentacao';

export interface PecaDeDeckEsperada {
  nome: string;
  tipo: 'patrimonial' | 'societaria';
}

/**
 * O recorte do resultado que a conferência LÊ — e só ele.
 *
 * Não é o `ResultadoDosDecks` inteiro de propósito. Em 21/09/2026 a geração passou
 * a persistir e cada arquivo ganhou `apresentacaoId` e `versao`; exigir o objeto
 * completo obrigaria todo teste desta função a inventar id e número de versão que
 * ela nunca olha. Ela confronta tipo e nome, e é isso que o tipo diz.
 */
type ResultadoConferivel = Pick<ResultadoDosDecks, 'erro' | 'errosPorDeck'> & {
  arquivos: readonly { tipo: PecaDeDeckEsperada['tipo']; nome: string }[];
};

/**
 * Confere cada apresentação selecionada contra o retorno da Edge Function.
 *
 * A chamada `ambas` pode devolver dois arquivos. Por isso a confirmação não
 * pode contar chamadas HTTP: ela precisa confirmar cada peça que a pessoa marcou.
 */
export function conferirDecksGerados(
  esperadas: readonly PecaDeDeckEsperada[],
  resultado: ResultadoConferivel,
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
