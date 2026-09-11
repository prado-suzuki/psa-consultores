/**
 * Busca de combobox que não tropeça em acento — e a união que evita regressão.
 *
 * O `defaultFilter` do cmdk pontua por proximidade e aceita letra salteada
 * ("clpsa" acha "Cliente PSA"), mas compara os caracteres crus: quem digita
 * "sao" não acha "São Paulo", e nome de cliente com acento aqui é a regra, não
 * a exceção. Trocar um filtro pelo outro consertaria o acento e PERDERIA a
 * letra salteada nas quatro telas que já usam o `SingleSelectCombobox` — por
 * isso quem chama devolve a UNIÃO dos dois: nada que casava antes deixa de
 * casar, e o acento passa a casar também.
 *
 * O documento entra na busca em DUAS formas (pontuado e só dígitos) porque as
 * duas são jeitos legítimos de digitar o mesmo CNPJ, e ninguém lembra qual
 * está guardado no banco.
 */

/**
 * Sem acento, sem caixa, sem espaço nas pontas.
 *
 * O `NFD` separa a letra do acento e o `\p{Diacritic}` varre o acento solto.
 * A alternativa — faixa de marcas combinantes escrita à mão — ficaria com os
 * caracteres crus dentro da expressão, invisíveis no editor e grudados na
 * letra anterior em qualquer diff.
 */
export function normalizarParaBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Casa por trecho contínuo contra qualquer uma das palavras-chave. Busca vazia casa com tudo. */
export function casaSemAcento(palavrasChave: readonly string[], busca: string): boolean {
  const termo = normalizarParaBusca(busca);
  if (!termo) return true;
  return palavrasChave.some((palavra) => normalizarParaBusca(palavra).includes(termo));
}

/**
 * As duas grafias de um documento, para entrarem juntas nas palavras-chave.
 * Devolve vazio para documento ausente — palavra-chave vazia casaria com tudo.
 */
export function grafiasDeDocumento(documento: string | null | undefined): string[] {
  if (!documento) return [];
  const digitos = documento.replace(/\D/g, '');
  if (!digitos) return [];
  const formatado =
    digitos.length === 14
      ? digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
      : digitos.length === 11
        ? digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
        : documento;
  return formatado === digitos ? [digitos] : [formatado, digitos];
}

/**
 * O que a linha do cliente mostra à direita do nome.
 *
 * Cliente NÃO tem CNPJ: a coluna não existe na tabela. O que existe é o CNPJ
 * de cada contribuinte dele, e são vários. Um só, mostra; mais de um, mostra a
 * contagem — a busca acha por qualquer um dos dois jeitos de qualquer forma.
 */
export function resumoDeDocumentos(documentos: readonly string[]): string | undefined {
  const grafias = documentos.map((documento) => grafiasDeDocumento(documento)[0]).filter(Boolean);
  if (grafias.length === 0) return undefined;
  if (grafias.length === 1) return grafias[0];
  return `${grafias.length} CNPJs`;
}
