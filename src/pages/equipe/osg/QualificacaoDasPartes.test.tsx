import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pessoas: [] as Record<string, unknown>[],
  parentescos: [] as Record<string, unknown>[],
  erroPessoas: null as unknown,
  recarregar: vi.fn(),
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
  usePessoasByCliente: () => ({
    data: mocks.pessoas, isLoading: false, error: mocks.erroPessoas, refetch: mocks.recarregar,
  }),
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
  mocks.erroPessoas = null;
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

describe('QualificacaoDasPartes - falha de consulta', () => {
  /*
   * Falha e lista vazia diziam a mesma frase, e a frase afirma um fato de
   * negócio: quem lia concluía que o cliente não tem sócio nenhum.
   */
  it('consulta que falha não vira "nenhuma pessoa cadastrada" e o erro cru não aparece na tela', () => {
    const espiaoConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.erroPessoas = new Error('PGRST200: embed ambíguo');
    mocks.pessoas = [];
    render(<QualificacaoDasPartes />);

    expect(screen.getByText(/Não foi possível carregar as pessoas deste cliente/)).toBeInTheDocument();
    // A mensagem técnica existe, mas só no console: inglês de Postgres não
    // vai para a tela, que é o que o EX-01 decidiu em 24/09.
    expect(screen.queryByText(/PGRST200/)).not.toBeInTheDocument();
    expect(espiaoConsole).toHaveBeenCalledWith(
      expect.stringContaining('EstadoDeFalha'),
      expect.any(Error),
    );
    espiaoConsole.mockRestore();
    expect(screen.queryByText(/cadastrada para este cliente/)).not.toBeInTheDocument();
  });

  it('o botão de tentar de novo refaz a consulta', async () => {
    mocks.erroPessoas = new Error('falhou');
    mocks.pessoas = [];
    render(<QualificacaoDasPartes />);

    await userEvent.click(screen.getByRole('button', { name: /Tentar de novo/i }));
    expect(mocks.recarregar).toHaveBeenCalledTimes(1);
  });
});
