export interface CnpjData {
  razao_social: string;
  nome_fantasia: string;
  cnae_fiscal: number | null;
  cnae_fiscal_descricao: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
}

export interface CepData {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export function useExternalConsults() {
  async function consultarCnpj(cnpj: string): Promise<CnpjData> {
    const digits = cnpj.replace(/\D/g, "");
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (!res.ok) throw new Error("CNPJ não encontrado");
    return res.json();
  }

  async function consultarCep(cep: string): Promise<CepData> {
    const digits = cep.replace(/\D/g, "");
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
    if (data.erro) throw new Error("CEP não encontrado");
    return data;
  }

  return { consultarCnpj, consultarCep };
}
