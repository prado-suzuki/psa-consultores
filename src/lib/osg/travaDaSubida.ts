// A subida das quotas é um ato ENTRE DUAS SOCIEDADES: os sócios cedem as quotas
// que têm na Proprietária e recebem, no mesmo ato, quotas da Controladora. Ele
// só pode acontecer depois que as duas existem perante terceiros, e o que marca
// isso é o contrato social de cada uma ter sido registrado na junta comercial.
//
// Sem esta trava, o ledger gravaria uma cessão para uma pessoa jurídica que a
// junta não conhece, e a peça que fosse descrever esse ato descreveria um fato
// que não aconteceu.
//
// A pergunta é por EMPRESA, e não por cliente: quem precisa existir são as duas
// partes deste ato, e não duas sociedades quaisquer da carteira. Isso só é
// expressável desde que `documento_gerado.papel` existe — antes dele o máximo
// que dava para perguntar era se o cliente tinha dois contratos registrados,
// sem saber de quem eles eram.

export interface EmpresaDaSubida {
  pessoaId: string;
  denominacao: string | null;
}

export interface TravaDaSubida {
  /** As duas pontas têm contrato social registrado: o ato pode ser gravado. */
  liberado: boolean;
  /** Denominações das empresas que ainda não têm constitutivo registrado. */
  faltando: string[];
  /** Frase pronta para a tela e para o erro da mutation. Null quando liberado. */
  motivo: string | null;
}

/**
 * Avalia a trava para as empresas envolvidas no ato.
 *
 * `constitutivosRegistrados` é o conjunto de `pj_pessoa_id` que já têm um
 * `documento_gerado` com `papel = 'constitutivo'` e `status = 'registrado'`.
 * Rascunho e versão selada não contam: nenhum dos dois foi à junta.
 *
 * Recebe uma ou duas empresas de propósito. No card da Proprietária só ela é
 * conhecida (a controladora é escolhida depois, dentro do modal), e a trava já
 * vale ali: se a própria Proprietária não existe na junta, não há o que subir.
 */
export function avaliarTravaDaSubida(
  empresas: EmpresaDaSubida[],
  constitutivosRegistrados: ReadonlySet<string>,
): TravaDaSubida {
  const faltando = empresas
    .filter((e) => !constitutivosRegistrados.has(e.pessoaId))
    .map((e) => e.denominacao?.trim() || 'empresa sem denominação');

  if (faltando.length === 0) {
    return { liberado: true, faltando: [], motivo: null };
  }

  const lista =
    faltando.length === 1
      ? faltando[0]
      : `${faltando.slice(0, -1).join(', ')} e ${faltando[faltando.length - 1]}`;

  return {
    liberado: false,
    faltando,
    motivo:
      'As quotas só sobem depois que as duas sociedades existem na junta. ' +
      `Falta registrar o contrato social de ${lista}.`,
  };
}
