import { describe, expect, it, vi } from 'vitest';
import { consultarCnpj } from '@/lib/brasilApiCnpj';
import { aplicarCnpjNoRascunho, emptyPessoaDraft } from '@/lib/pessoaModalModel';

const resposta = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue({ ok: status < 400, status, json: () => Promise.resolve(body) }) as unknown as typeof fetch;

const receita = {
  razao_social: 'AGRO PRADO LTDA', nome_fantasia: '', cep: '06020902', logradouro: 'AVENIDA DOS AUTONOMISTAS',
  numero: '1400', complemento: 'SALA  3 ', bairro: 'VILA YARA', municipio: 'OSASCO', uf: 'SP',
  data_inicio_atividade: '2011-09-01', descricao_situacao_cadastral: 'ATIVA',
};

describe('consultarCnpj', () => {
  it('normaliza a resposta da Receita para os campos da PJ', async () => {
    const fetchImpl = resposta(receita);
    await expect(consultarCnpj('14.380.200/0001-21', fetchImpl)).resolves.toEqual({
      razao_social: 'AGRO PRADO LTDA', nome_fantasia: '', cep: '06020902', logradouro: 'AVENIDA DOS AUTONOMISTAS',
      numero: '1400', complemento: 'SALA 3', bairro: 'VILA YARA', municipio: 'OSASCO', uf: 'SP',
      data_constituicao: '2011-09-01', status_constituicao: 'Ativa',
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://brasilapi.com.br/api/cnpj/v1/14380200000121');
  });

  it('devolve null para CNPJ desconhecido, não consulta incompleto e propaga falha do serviço', async () => {
    await expect(consultarCnpj('14380200000121', resposta({}, 404))).resolves.toBeNull();
    const fetchImpl = resposta({});
    await expect(consultarCnpj('1438020', fetchImpl)).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(consultarCnpj('14380200000121', resposta({}, 500))).rejects.toThrow();
  });

  it('situação fora da lista da tela fica em branco', async () => {
    const dados = await consultarCnpj('14380200000121', resposta({ ...receita, descricao_situacao_cadastral: 'NULA' }));
    expect(dados?.status_constituicao).toBe('');
  });
});

describe('aplicarCnpjNoRascunho', () => {
  const encontrado = {
    razao_social: 'AGRO PRADO LTDA', nome_fantasia: 'PRADO', cep: '06020902', logradouro: 'AV A', numero: '10',
    complemento: '', bairro: 'CENTRO', municipio: 'OSASCO', uf: 'SP', data_constituicao: '2011-09-01', status_constituicao: 'Ativa',
  };
  const base = { ...emptyPessoaDraft(), tipo_pessoa: 'PJ' as const, cpf_cnpj: '14.380.200/0001-21', endereco_complemento: 'Sala 3' };

  it('preenche razão social, endereço e dados da PJ, sem apagar com valor vazio', () => {
    expect(aplicarCnpjNoRascunho(base, base.cpf_cnpj, base, encontrado)).toMatchObject({
      denominacao: 'AGRO PRADO LTDA', nome_fantasia: 'PRADO', endereco_cep: '06020-902', endereco_logradouro: 'AV A',
      endereco_complemento: 'Sala 3', endereco_municipio: 'OSASCO', data_constituicao: '2011-09-01', status_constituicao: 'Ativa',
    });
  });

  it('preserva campo editado durante a busca e descarta resposta de CNPJ trocado', () => {
    const editado = { ...base, denominacao: 'Digitada' };
    expect(aplicarCnpjNoRascunho(editado, base.cpf_cnpj, base, encontrado).denominacao).toBe('Digitada');
    const trocado = { ...base, cpf_cnpj: '11.111.111/0001-11' };
    expect(aplicarCnpjNoRascunho(trocado, base.cpf_cnpj, base, encontrado)).toBe(trocado);
  });
});
