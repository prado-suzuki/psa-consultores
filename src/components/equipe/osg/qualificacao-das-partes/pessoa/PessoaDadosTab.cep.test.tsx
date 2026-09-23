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
