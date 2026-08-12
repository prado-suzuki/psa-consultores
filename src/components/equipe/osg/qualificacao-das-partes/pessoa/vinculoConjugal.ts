import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

/**
 * Quem pode ser oferecido como cônjuge.
 *
 * O banco garante a simetria do vínculo (gatilho `trg_pessoa_conjuge_reciproco`),
 * mas quem oferece a lista é a tela: sem filtro, o consultor escolhe alguém já
 * casado com um terceiro e o gatilho desfaz aquele casamento sem que ninguém
 * tenha pedido. Filtrar aqui é o que transforma "o sistema conserta depois" em
 * "o estado inconsistente nem chega a ser oferecido".
 *
 * Continua na lista, propositalmente:
 *  - quem já está selecionado no formulário (senão o próprio valor some do select);
 *  - quem aponta de volta para a pessoa editada (é o cônjuge atual dela).
 */
export interface ContextoConjuge {
  /** Pessoa sendo editada. Vazio em cadastro novo, que ainda não tem id. */
  pessoaId?: string;
  /** Cônjuge escolhido no formulário, gravado ou não. */
  selecionadoId?: string;
}

export function conjugesDisponiveis(
  candidatos: PessoaRow[],
  { pessoaId, selecionadoId }: ContextoConjuge = {},
): PessoaRow[] {
  return candidatos.filter((candidato) => {
    if (pessoaId && candidato.id === pessoaId) return false;
    if (selecionadoId && candidato.id === selecionadoId) return true;
    if (!candidato.conjuge_id) return true;
    return Boolean(pessoaId) && candidato.conjuge_id === pessoaId;
  });
}

/** Quantos candidatos ficaram de fora por já terem cônjuge — vira aviso na tela. */
export function conjugesOcultosPorVinculo(
  candidatos: PessoaRow[],
  contexto: ContextoConjuge = {},
): number {
  const disponiveis = new Set(conjugesDisponiveis(candidatos, contexto).map((p) => p.id));
  return candidatos.filter((c) => c.id !== contexto.pessoaId && c.conjuge_id && !disponiveis.has(c.id)).length;
}
