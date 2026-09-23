export type EnderecoDoCep = { logradouro: string; bairro: string; municipio: string; uf: string };

export const digitosDoCep = (valor: string) => valor.replace(/\D/g, '');

/** Devolve null quando o ViaCEP não conhece o CEP; falha de rede propaga. */
export async function consultarViaCep(cep: string, fetchImpl: typeof fetch = fetch): Promise<EnderecoDoCep | null> {
  const digitos = digitosDoCep(cep);
  if (digitos.length !== 8) return null;
  const res = await fetchImpl(`https://viacep.com.br/ws/${digitos}/json/`);
  const data = await res.json();
  if (!data || data.erro) return null;
  return {
    logradouro: data.logradouro ?? '',
    bairro: data.bairro ?? '',
    municipio: data.localidade ?? '',
    uf: data.uf ?? '',
  };
}

/**
 * Aplica o endereço encontrado sobre o atual. Campo que o usuário mudou enquanto a
 * busca corria (difere de `antes`) fica como está; valor vazio do ViaCEP (CEP geral
 * de município não traz logradouro nem bairro) não apaga o que havia.
 */
export function mesclarEnderecoDoCep(atual: EnderecoDoCep, antes: EnderecoDoCep, encontrado: EnderecoDoCep): EnderecoDoCep {
  const campo = (chave: keyof EnderecoDoCep) =>
    encontrado[chave] && atual[chave] === antes[chave] ? encontrado[chave] : atual[chave];
  return { logradouro: campo('logradouro'), bairro: campo('bairro'), municipio: campo('municipio'), uf: campo('uf') };
}
