import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Só o que é de PÁGINA: o estado vazio, o botão que abre o modal e a lista que
// começa vazia esperando o analista adicionar quem doa e quem recebe.
//
// O fio cadastro → motor → quadro é testado em `useCalculadoraItcmdController.test`,
// e os três quadros de saída em `CenariosEmColunas.test` — dirigir os `Select` do
// Radix por aqui prenderia interno de biblioteca, não regra.

const mocks = vi.hoisted(() => ({
  bens: [] as Record<string, unknown>[],
  pessoas: [] as Record<string, unknown>[],
  parentescos: [] as Record<string, unknown>[],
  socios: [] as Record<string, unknown>[],
  quadroDasEmpresas: [] as Record<string, unknown>[],
  historico: [] as Record<string, unknown>[],
  gravarSpy: vi.fn(),
  statusSpy: vi.fn(),
}));

vi.mock('@/hooks/useSimulacoesItcmd', () => ({
  // A persistência é do banco, e o banco não entra em teste de unidade: o que se
  // prende aqui é a apuração. `gravarSpy` deixa ver QUE gravou e COM QUê.
  useSimulacoesItcmd: () => ({ data: mocks.historico, isLoading: false, error: null }),
  useGravarSimulacaoItcmd: () => ({
    mutate: mocks.gravarSpy, isPending: false, error: null,
  }),
  useAlterarStatusSimulacaoItcmd: () => ({
    mutate: mocks.statusSpy, isPending: false, error: null,
  }),
  useRenomearSimulacaoItcmd: () => ({
    mutate: vi.fn(), isPending: false, error: null,
  }),
  rotuloDaSimulacao: (s: { nome: string | null; versao: number }) =>
    (s.nome?.trim() ? s.nome.trim() : `Versão ${s.versao}`),
  STATUS_DA_SIMULACAO: ['rascunho', 'gerada', 'aprovada', 'substituida'],
  ROTULO_DO_STATUS: {
    rascunho: 'Rascunho', gerada: 'Gerada',
    aprovada: 'Aprovada', substituida: 'Substituída',
  },
}));

vi.mock('@/components/equipe/osg/OsgLayout', () => ({
  // `headerActions` também renderiza: é onde vive o botão de nova simulação.
  OsgLayout: ({ children, headerActions }: {
    children: React.ReactNode;
    headerActions?: React.ReactNode;
  }) => <div>{headerActions}{children}</div>,
}));
vi.mock('@/contexts/OsgWorkContext', () => ({
  useOsgWork: () => ({ clienteId: 'C1', setClienteId: () => undefined }),
}));
vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({
  useBensByCliente: () => ({ data: mocks.bens, isLoading: false, error: null }),
}));
// O QUADRO vem do livro de movimentos (`v_quadro_societario`), e o hook devolve
// `pessoaId`. O mock segue a forma NOVA: mockar a antiga deixava o hook de verdade
// rodar, e ele pede um `QueryClientProvider` que esta tela nao monta.
vi.mock('@/hooks/useMovimentacaoQuotas', () => ({
  useQuadroDaEmpresa: () => ({
    data: mocks.socios.map((s: Record<string, unknown>) => ({
      pessoaId: s.socio_pessoa_id,
      denominacao: s.socio_denominacao,
      tipoPessoa: s.socio_tipo_pessoa,
      cpfCnpj: null,
      quotas: s.quotas,
      vlrTotal: 0,
      ordem: null,
      movimentoIds: [],
    })),
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/hooks/useSociedadesDoacao', () => ({
  useQuadroDasEmpresas: () => ({ data: mocks.quadroDasEmpresas, isLoading: false, error: null }),
}));
vi.mock('@/hooks/useQualificacaoDasPartes', () => ({
  usePessoasByCliente: () => ({ data: mocks.pessoas, isLoading: false, error: null }),
  useParentescosByCliente: () => ({ data: mocks.parentescos, isLoading: false, error: null }),
}));

import CalculadoraItcmd from './CalculadoraItcmd';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-02-10T12:00:00Z') });
  mocks.bens = [{
    id: 'IR-01', cliente_id: 'C1', referencia_dp: 'BS 01', denominacao: 'Fazenda',
    tipo_bem: 'IR', participa_estruturacao: true,
    valores: {
      contabil: { valor: 6_649_400, comValor: 1 },
      mercado: { valor: null, comValor: 0 },
      itr: { valor: null, comValor: 0 },
      origem: 'matriculas' as const,
      matriculas: 1,
    },
  }];
  mocks.pessoas = [
    { id: 'HOLDING', denominacao: 'Terezinha Participações', tipo_pessoa: 'PJ', tipo_empresa: 'CN', is_fundador: false, filiacao_pai_pessoa_id: null, filiacao_mae_pessoa_id: null },
    // Estado civil vem do CADASTRO e resolve a meação sozinho: sem cônjuge, uma
    // GIA. É por isso que o bloco de meação aqui lê, e não pergunta.
    { id: 'Cristiano', denominacao: 'Cristiano', tipo_pessoa: 'PF', is_fundador: true, filiacao_pai_pessoa_id: null, filiacao_mae_pessoa_id: null, estado_civil: 'Solteiro(a)', regime_bens: null, conjuge_id: null },
    { id: 'Gabriel', denominacao: 'Gabriel', tipo_pessoa: 'PF', is_fundador: false, filiacao_pai_pessoa_id: null, filiacao_mae_pessoa_id: null, estado_civil: 'Solteiro(a)', regime_bens: null, conjuge_id: null },
  ];
  mocks.socios = [
    { id: 'S1', socio_pessoa_id: 'Cristiano', socio_denominacao: 'Cristiano', socio_tipo_pessoa: 'PF', quotas: 6_649_400 },
  ];
  mocks.quadroDasEmpresas = [
    { empresa_pessoa_id: 'HOLDING', socio_pessoa_id: 'Cristiano', quotas: 6_649_400 },
  ];
  mocks.parentescos = [
    { id: 'V1', pessoa_id: 'Gabriel', parente_pessoa_id: 'Cristiano', tipo: 'Filho(a)' },
  ];
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CalculadoraItcmd — a página', () => {
  it('abre no resultado vazio, sem quadro e sem número', () => {
    render(<MemoryRouter><CalculadoraItcmd /></MemoryRouter>);
    expect(screen.getByText(/Nenhuma simulação/)).toBeInTheDocument();
    expect(screen.queryByText('R$ 186.864,00')).not.toBeInTheDocument();
    // Sem simulação, também não há seletor de versão — controle vazio é ruído.
    expect(screen.queryByText('Versão')).not.toBeInTheDocument();
  });

  it('o botão abre o modal com a lista VAZIA e os campos de adicionar', () => {
    render(<MemoryRouter><CalculadoraItcmd /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Nova simulação/ }));

    // Nada entra sozinho: o sistema não puxa doador nem donatário. Quem monta o ato é
    // o analista, por UM campo — o papel vem das quotas e troca na coluna.
    expect(screen.getByText(/Nenhuma pessoa no ato ainda/)).toBeInTheDocument();
    expect(screen.getByLabelText('Adicionar participantes')).toBeInTheDocument();
    expect(screen.queryByLabelText('Adicionar doador')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Adicionar donatário')).not.toBeInTheDocument();
    // E a forma do ato não é mais um bloco acima da tabela: virou coluna.
    expect(screen.queryByText('Doador do ato')).not.toBeInTheDocument();

    // E o "Incluir de volta" não existe mais: o × tira de vez, e para trazer de volta
    // basta adicionar outra vez.
    expect(screen.queryByRole('button', { name: /Incluir de volta/ })).not.toBeInTheDocument();

    // A sociedade é uma só: entra como texto, não como lista de uma opção.
    expect(screen.getByText('Terezinha Participações')).toBeInTheDocument();

    // A UPF é campo digitável, em REAIS: vírgula, não ponto.
    expect(screen.getByLabelText(/UPF \(R\$\)/)).toHaveValue('255,20');

    // E o ESTADO fica à esquerda dela, com MT já escolhido.
    expect(screen.getByLabelText('Estado')).toHaveTextContent('MT');
  });
});
