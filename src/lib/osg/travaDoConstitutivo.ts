// Uma sociedade se constitui UMA VEZ. O contrato social é a peça que publica a
// existência dela; a partir do registro na junta, tudo o que muda a sociedade é
// alteração contratual, que nasce daquela peça e a substitui.
//
// Sem esta trava, "Validar versão" sobre uma sociedade que já tem contrato
// registrado não acha head em rascunho, cai no ramo que cria a RAIZ da linhagem
// e carimba `constitutivo` de novo: nasce um SEGUNDO contrato social da mesma
// sociedade, em silêncio. Quem barrava era o índice único
// `documento_gerado_um_constitutivo_registrado`, e só lá no registro, com a
// mensagem crua do Postgres.
//
// A pergunta é por SOCIEDADE (`pj_pessoa_id`), como o índice: quem se constitui
// uma vez é a pessoa jurídica, e não o cliente nem o modelo. Duas linhagens
// sobre a mesma PJ podem existir enquanto forem rascunho; o que não pode é a
// segunda ser carimbada constitutivo tendo a primeira ido à junta.

export interface SociedadeDoConstitutivo {
  /** `pj_pessoa_id` da sociedade do contrato; null em peça sem empresa. */
  pessoaId: string | null;
  /** Denominação, só para a frase nomear QUAL sociedade já existe. */
  denominacao: string | null;
}

export interface TravaDoConstitutivo {
  /** A sociedade ainda não tem constitutivo registrado: a peça pode nascer. */
  liberado: boolean;
  /** Frase pronta para a tela e para o erro da mutation. Null quando liberado. */
  motivo: string | null;
}

/**
 * Avalia a trava para a sociedade da peça que está nascendo.
 *
 * `constitutivosRegistrados` é o conjunto de `pj_pessoa_id` que já têm um
 * `documento_gerado` com `papel = 'constitutivo'` e `status = 'registrado'`, o
 * mesmo que `useConstitutivosRegistrados` entrega. Rascunho e versão selada não
 * contam: nenhum dos dois foi à junta, e enquanto não foram a sociedade ainda
 * está se constituindo.
 *
 * Peça sem empresa passa direto: não há sociedade a constituir, e o papel nem
 * chega a ser carimbado (ver `papelDaRaiz`).
 */
export function avaliarTravaDoConstitutivo(
  sociedade: SociedadeDoConstitutivo,
  constitutivosRegistrados: ReadonlySet<string>,
): TravaDoConstitutivo {
  if (!sociedade.pessoaId || !constitutivosRegistrados.has(sociedade.pessoaId)) {
    return { liberado: true, motivo: null };
  }

  const nome = sociedade.denominacao?.trim() || 'Esta sociedade';
  return {
    liberado: false,
    motivo:
      `${nome} já foi constituída: o contrato social dela está registrado na junta, ` +
      'e uma sociedade se constitui uma vez. Para mudar o que está registrado, ' +
      'gere uma alteração contratual a partir daquela peça.',
  };
}
