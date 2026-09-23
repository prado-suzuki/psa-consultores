export type DadosDoCnpj = {
  razao_social: string;
  nome_fantasia: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  data_constituicao: string;
  status_constituicao: string;
};

export const digitosDoCnpj = (valor: string) => valor.replace(/\D/g, '');

// A Receita também devolve "NULA", que não existe na lista de status da tela.
const SITUACOES: Record<string, string> = { ATIVA: 'Ativa', SUSPENSA: 'Suspensa', INAPTA: 'Inapta', BAIXADA: 'Baixada' };

const texto = (valor: unknown) => (valor == null ? '' : String(valor).replace(/\s+/g, ' ').trim());

/** Devolve null quando a Receita não conhece o CNPJ; falha de rede propaga. */
export async function consultarCnpj(cnpj: string, fetchImpl: typeof fetch = fetch): Promise<DadosDoCnpj | null> {
  const digitos = digitosDoCnpj(cnpj);
  if (digitos.length !== 14) return null;
  const res = await fetchImpl(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`);
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`BrasilAPI respondeu ${res.status}`);
  const data = await res.json();
  return {
    razao_social: texto(data.razao_social),
    nome_fantasia: texto(data.nome_fantasia),
    cep: digitosDoCnpj(texto(data.cep)),
    logradouro: texto(data.logradouro),
    numero: texto(data.numero),
    complemento: texto(data.complemento),
    bairro: texto(data.bairro),
    municipio: texto(data.municipio),
    uf: texto(data.uf),
    data_constituicao: /^\d{4}-\d{2}-\d{2}$/.test(texto(data.data_inicio_atividade)) ? texto(data.data_inicio_atividade) : '',
    status_constituicao: SITUACOES[texto(data.descricao_situacao_cadastral).toUpperCase()] ?? '',
  };
}
