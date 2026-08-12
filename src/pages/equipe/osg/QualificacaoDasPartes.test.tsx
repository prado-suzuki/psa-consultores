import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pessoas: [] as Record<string, unknown>[],
  parentescos: [] as Record<string, unknown>[],
}));

vi.mock('@/contexts/OsgWorkContext', () => ({
  useOsgWork: () => ({ clienteId: 'C1' }),
}));
vi.mock('@/components/equipe/osg/OsgLayout', () => ({
  OsgLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/equipe/osg/qualificacao-das-partes/PessoaModal', () => ({
  PessoaModal: () => null,
}));
vi.mock('@/hooks/useQualificacaoDasPartes', () => ({
  usePessoasByCliente: () => ({ data: mocks.pessoas, isLoading: false }),
  useParentescosByCliente: () => ({ data: mocks.parentescos, isLoading: false }),
  useDeletePessoa: () => ({ mutate: vi.fn(), isPending: false }),
}));

import QualificacaoDasPartes from './QualificacaoDasPartes';

/**
 * Cenário diferente do caso do teste e2e (um casal, com no máximo um vínculo):
 * uma pessoa com pai, mãe e tio, ao lado de uma fundadora que também tem
 * vínculo e de alguém sem vínculo nenhum.
 */
const helena = { id: 'PF-HELENA', cliente_id: 'C1', tipo_pessoa: 'PF', denominacao: 'Helena Filha', is_fundador: false };
const marta = { id: 'PF-MAE', cliente_id: 'C1', tipo_pessoa: 'PF', denominacao: 'Marta Mãe', is_fundador: true };
const solteira = { id: 'PF-SO', cliente_id: 'C1', tipo_pessoa: 'PF', denominacao: 'Sem Vinculo', is_fundador: false };

const vinculo = (id: string, pessoaId: string, parente: string, tipo: string) => ({
  id, pessoa_id: pessoaId, parente_pessoa_id: `${id}-p`, parente_denominacao: parente, tipo, natureza: 'Consanguíneo',
});

function linhaDe(nome: string) {
  return screen.getByText(nome).closest('tr') as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pessoas = [helena, marta, solteira];
  mocks.parentescos = [
    vinculo('V-PAI', 'PF-HELENA', 'Joaquim Pai', 'Pai/Mãe'),
    vinculo('V-MAE', 'PF-HELENA', 'Marta Mãe', 'Pai/Mãe'),
    vinculo('V-TIO', 'PF-HELENA', 'Tobias Tio', 'Tio(a)'),
    vinculo('V-IRMA', 'PF-MAE', 'Irene Irmã', 'Irmão(ã)'),
  ];
});

describe('QualificacaoDasPartes - coluna Filiação', () => {
  it('mostra todos os vínculos da pessoa, não só o último', () => {
    render(<QualificacaoDasPartes />);
    const linha = linhaDe('Helena Filha');
    for (const texto of ['Pai/Mãe: Joaquim Pai', 'Pai/Mãe: Marta Mãe', 'Tio(a): Tobias Tio']) {
      expect(within(linha).getByText(texto)).toBeInTheDocument();
    }
  });

  it('mostra o traço para quem não tem vínculo nenhum', () => {
    render(<QualificacaoDasPartes />);
    // Na tabela de PF as colunas são: denominação, CPF, filiação, município/UF, ações.
    const filiacao = within(linhaDe('Sem Vinculo')).getAllByRole('cell')[2];
    expect(filiacao).toHaveTextContent('—');
  });

  it('fundadora continua marcada como tal e ainda assim mostra os vínculos dela', () => {
    render(<QualificacaoDasPartes />);
    const linha = linhaDe('Marta Mãe');
    expect(within(linha).getByText('Fundador')).toBeInTheDocument();
    expect(within(linha).getByText('Irmão(ã): Irene Irmã')).toBeInTheDocument();
  });
});
