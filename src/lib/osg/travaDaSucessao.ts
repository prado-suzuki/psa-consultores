// Uma peça registrada é substituída por UMA alteração contratual, e não por
// várias em paralelo. `substitui_documento_id` é a cadeia da sucessão: duas
// linhagens apontando para o mesmo antecessor são dois documentos descrevendo a
// mesma mudança, e a numeração do instrumento ("PRIMEIRA ALTERAÇÃO…", que sai
// de `useOrdemNaSucessao`) passa a responder a mesma coisa para as duas.
//
// A peça que responde se já existe sucessor é `useDocumentoSucessor`, escrita
// desde então com o comentário "para não oferecer 'Gerar alteração contratual'
// duas vezes sobre a mesma peça" e nunca ligada a lugar nenhum. Esta função é só
// a frase e a decisão; o fato continua vindo dela.

/** O que se sabe do sucessor de uma peça, quando ele existe. */
export interface SucessorDaPeca {
  status: string | null;
}

export interface TravaDaSucessao {
  /** A peça ainda não foi sucedida: uma alteração pode nascer dela. */
  liberado: boolean;
  /** Frase pronta para a tela e para o erro da mutation. Null quando liberado. */
  motivo: string | null;
}

/**
 * Avalia a trava para a peça de onde a alteração nasceria.
 *
 * `sucessor` é null quando nenhum documento aponta para ela em
 * `substitui_documento_id`. A frase muda com o estado do que já existe, porque o
 * caminho de saída também muda: sucessor em rascunho se CONTINUA, sucessor
 * registrado empurra a próxima alteração para depois dele.
 */
export function avaliarTravaDaSucessao(sucessor: SucessorDaPeca | null): TravaDaSucessao {
  if (!sucessor) return { liberado: true, motivo: null };

  if (sucessor.status === 'registrado') {
    return {
      liberado: false,
      motivo:
        'Esta peça já foi substituída por uma alteração contratual registrada. ' +
        'A próxima alteração nasce daquela, e não desta.',
    };
  }

  return {
    liberado: false,
    motivo:
      'Esta peça já tem uma alteração contratual gerada a partir dela, ainda em aberto. ' +
      'Continue naquela: gerar outra faria duas peças descrevendo a mesma mudança.',
  };
}
