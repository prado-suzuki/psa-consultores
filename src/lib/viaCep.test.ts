import { describe, expect, it, vi } from 'vitest';
import { consultarViaCep, mesclarEnderecoDoCep } from '@/lib/viaCep';

const resposta = (body: unknown) => vi.fn().mockResolvedValue({ json: () => Promise.resolve(body) }) as unknown as typeof fetch;

describe('consultarViaCep', () => {
  it('traduz localidade em município', async () => {
    const fetchImpl = resposta({ logradouro: 'Rua A', bairro: 'Centro', localidade: 'Cascavel', uf: 'PR' });
    await expect(consultarViaCep('85801-000', fetchImpl)).resolves.toEqual({ logradouro: 'Rua A', bairro: 'Centro', municipio: 'Cascavel', uf: 'PR' });
    expect(fetchImpl).toHaveBeenCalledWith('https://viacep.com.br/ws/85801000/json/');
  });

  it('devolve null para CEP desconhecido e não consulta CEP incompleto', async () => {
    await expect(consultarViaCep('00000000', resposta({ erro: true }))).resolves.toBeNull();
    const fetchImpl = resposta({});
    await expect(consultarViaCep('8580', fetchImpl)).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('mesclarEnderecoDoCep', () => {
  const vazio = { logradouro: '', bairro: '', municipio: '', uf: '' };
  const encontrado = { logradouro: 'Rua A', bairro: 'Centro', municipio: 'Cascavel', uf: 'PR' };

  it('substitui o endereço antigo quando o CEP muda', () => {
    const antigo = { logradouro: 'Rua Velha', bairro: 'Bairro Velho', municipio: 'Toledo', uf: 'PR' };
    expect(mesclarEnderecoDoCep(antigo, antigo, encontrado)).toEqual(encontrado);
  });

  it('preserva campo editado durante a busca e não apaga com valor vazio', () => {
    const atual = { ...vazio, logradouro: 'Rua digitada' };
    const cepGeral = { ...encontrado, logradouro: '', bairro: '' };
    expect(mesclarEnderecoDoCep(atual, vazio, encontrado).logradouro).toBe('Rua digitada');
    expect(mesclarEnderecoDoCep(atual, atual, cepGeral)).toEqual({ logradouro: 'Rua digitada', bairro: '', municipio: 'Cascavel', uf: 'PR' });
  });
});
