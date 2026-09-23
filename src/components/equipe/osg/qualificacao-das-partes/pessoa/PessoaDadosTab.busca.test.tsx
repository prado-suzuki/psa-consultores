import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PessoaDadosTab } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/PessoaDadosTab';
import { emptyPessoaDraft, type PessoaDraft } from '@/lib/pessoaModalModel';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() } }));

let ultimoDraft: PessoaDraft;

function Hospedeiro({ inicial }: { inicial: PessoaDraft }) {
  const [draft, setDraft] = useState(inicial);
  ultimoDraft = draft;
  return (
    <PessoaDadosTab
      draft={draft}
      setDraft={setDraft}
      pessoaCandidates={[]}
      parenteCandidates={[]}
      parentesco={{ parenteId: '', tipo: '', natureza: '' }}
      setParentesco={vi.fn()}
    />
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockResolvedValue({ json: () => Promise.resolve({ logradouro: 'Rua Paraná', bairro: 'Centro', localidade: 'Cascavel', uf: 'PR' }) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('busca de CEP no cadastro de pessoa', () => {
  it('preenche rua, bairro, município e UF ao completar 8 dígitos, sem tocar em número e complemento', async () => {
    render(<Hospedeiro inicial={{ ...emptyPessoaDraft(), endereco_numero: '120', endereco_complemento: 'Sala 3', endereco_logradouro: 'Rua Velha' }} />);
    const cep = screen.getByPlaceholderText('00000-000');

    fireEvent.change(cep, { target: { value: '8580' } });
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(cep, { target: { value: '85801000' } });
    expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/85801000/json/');
    await waitFor(() => expect(ultimoDraft.endereco_municipio).toBe('Cascavel'));
    expect(ultimoDraft).toMatchObject({
      endereco_cep: '85801-000',
      endereco_logradouro: 'Rua Paraná',
      endereco_bairro: 'Centro',
      endereco_uf: 'PR',
      endereco_numero: '120',
      endereco_complemento: 'Sala 3',
    });
  });

  it('não consulta de novo quando o CEP completo não mudou', () => {
    render(<Hospedeiro inicial={{ ...emptyPessoaDraft(), endereco_cep: '85801-000' }} />);
    fireEvent.change(screen.getByPlaceholderText('00000-000'), { target: { value: '85801-000x' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('busca de CNPJ no cadastro de PJ', () => {
  it('preenche razão social e endereço ao completar 14 dígitos', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ razao_social: 'AGRO PRADO LTDA', cep: '06020902', logradouro: 'AVENIDA DOS AUTONOMISTAS', municipio: 'OSASCO', uf: 'SP', descricao_situacao_cadastral: 'ATIVA' }) });
    render(<Hospedeiro inicial={{ ...emptyPessoaDraft(), tipo_pessoa: 'PJ' }} />);
    const cnpj = screen.getByPlaceholderText('00.000.000/0000-00');

    fireEvent.change(cnpj, { target: { value: '1438020000012' } });
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(cnpj, { target: { value: '14380200000121' } });
    expect(fetchMock).toHaveBeenCalledWith('https://brasilapi.com.br/api/cnpj/v1/14380200000121');
    await waitFor(() => expect(ultimoDraft.denominacao).toBe('AGRO PRADO LTDA'));
    expect(ultimoDraft).toMatchObject({ cpf_cnpj: '14.380.200/0001-21', endereco_cep: '06020-902', endereco_municipio: 'OSASCO', status_constituicao: 'Ativa' });
  });

  it('CPF não consulta a Receita', () => {
    render(<Hospedeiro inicial={emptyPessoaDraft()} />);
    fireEvent.change(screen.getByPlaceholderText('000.000.000-00'), { target: { value: '12345678901' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
