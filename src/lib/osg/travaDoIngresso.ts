// Entrada e saída do MESMO sócio não cabem no mesmo instrumento.
//
// Se um sócio entrou no quadro da Proprietária por um ato que peça registrada
// nenhuma narra, concentrar as quotas na controladora agora produziria uma
// alteração contratual que descreve esse sócio entrando e saindo de uma vez.
// Não é uma peça incomum: é uma peça que não conta o que aconteceu, e por isso
// isto trava em vez de avisar (ver a fronteira em `blindagem-ordem-do-fluxo`).
//
// É a MESMA regra de `avaliarTravaDaSubida`, um passo adiante. Lá a pergunta é
// pelo ingresso ORIGINAL, o dos fundadores, que está narrado no constitutivo, e
// é por isso que ela exige o contrato social registrado nas duas pontas. Aqui a
// pergunta é pelos ingressos POSTERIORES, que o constitutivo não alcança. As
// duas se compõem nos pontos de chamada, nesta ordem: sem sociedade na junta não
// há o que perguntar sobre o quadro dela.
//
// Fora de `estadoDaSociedade`, pelo mesmo motivo que a irmã: a pergunta é sobre
// o LIVRO de uma empresa, e não sobre a peça da vez de uma tela de geração.

/** Uma linha do livro, no mínimo que esta trava precisa saber dela. */
export interface MovimentoParaIngresso {
  empresaPessoaId: string;
  origemPessoaId: string | null;
  destinoPessoaId: string | null;
  quotas: number;
  /** A peça que formalizou o movimento; null enquanto nenhuma o narrou. */
  documentoGeradoId: string | null;
}

export interface TravaDoIngresso {
  /** Ninguém entrou no quadro por ato ainda não registrado: pode concentrar. */
  liberado: boolean;
  /** Nomes de quem entrou por ato que peça registrada nenhuma narra. */
  entrantes: string[];
  /** Frase pronta para a tela e para o erro da mutation. Null quando liberado. */
  motivo: string | null;
}

/**
 * Avalia a trava para o quadro de UMA empresa (a Proprietária, de onde as quotas
 * saem).
 *
 * INGRESSO é um movimento pendente (`documento_gerado_id` nulo) cujo adquirente
 * não tem saldo de quotas vindo de movimentos JÁ formalizados nesta empresa: a
 * pessoa passou a existir no quadro por um ato que nenhuma peça registrada
 * conta. Sócio que só AUMENTOU a participação tem saldo formalizado positivo e
 * não entra aqui, porque o instrumento que o descreve saindo já o encontra
 * dentro do quadro.
 *
 * Vale para qualquer movimento pendente de entrada, e não só para o que veio do
 * aumento de capital: um lançamento avulso feito à mão pelo modal de movimento
 * produz exatamente o mesmo instrumento impossível.
 *
 * Pura de propósito: recebe as linhas já lidas e os nomes já resolvidos, para a
 * tela e o hook chamarem a MESMA função.
 */
export function avaliarTravaDoIngresso(
  movimentos: readonly MovimentoParaIngresso[],
  empresaPessoaId: string,
  nomePorPessoa: ReadonlyMap<string, string>,
): TravaDoIngresso {
  const daEmpresa = movimentos.filter((m) => m.empresaPessoaId === empresaPessoaId);

  // O saldo que as peças registradas conhecem. Entradas menos saídas, a mesma
  // conta do quadro (ver `quadroEm`), sobre o subconjunto formalizado.
  const saldoFormalizado = new Map<string, number>();
  const somar = (pessoaId: string, quotas: number) => {
    saldoFormalizado.set(pessoaId, (saldoFormalizado.get(pessoaId) ?? 0) + quotas);
  };
  for (const m of daEmpresa) {
    if (!m.documentoGeradoId) continue;
    if (m.destinoPessoaId) somar(m.destinoPessoaId, m.quotas);
    if (m.origemPessoaId) somar(m.origemPessoaId, -m.quotas);
  }

  const entrantesIds: string[] = [];
  for (const m of daEmpresa) {
    if (m.documentoGeradoId || !m.destinoPessoaId) continue;
    // Saldo negativo não deveria existir, e se existir é livro quebrado: tratar
    // como ingresso é o lado seguro, porque a peça também não saberia narrá-lo.
    if ((saldoFormalizado.get(m.destinoPessoaId) ?? 0) > 0) continue;
    if (!entrantesIds.includes(m.destinoPessoaId)) entrantesIds.push(m.destinoPessoaId);
  }

  if (entrantesIds.length === 0) return { liberado: true, entrantes: [], motivo: null };

  const entrantes = entrantesIds.map(
    (id) => nomePorPessoa.get(id)?.trim() || 'sócio sem nome cadastrado',
  );
  const lista =
    entrantes.length === 1
      ? entrantes[0]
      : `${entrantes.slice(0, -1).join(', ')} e ${entrantes[entrantes.length - 1]}`;

  return {
    liberado: false,
    entrantes,
    motivo:
      `Há ingresso de sócio que nenhuma peça registrada narra: ${lista}. ` +
      'Entrada e saída do mesmo sócio não cabem no mesmo instrumento. ' +
      'Registre na junta a alteração contratual desse ingresso antes de concentrar as quotas na controladora.',
  };
}
