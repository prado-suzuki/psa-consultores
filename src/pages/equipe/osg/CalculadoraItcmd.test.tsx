import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fio inteiro da tela: cadastro → controlador → motor → quadro. O que este teste
// prende é a LIGAÇÃO — que a página monta, que a legítima sai calculada, que o
// quadro só aparece com a disponível fechada e que cenário sem valor no cadastro
// aparece como `—` marcado de incompleto, nunca como R$ 0,00. A aritmética já
// tem os seus próprios testes em `src/lib/osg/itcmd/`.

const mocks = vi.hoisted(() => ({
  bens: [] as Record<string, unknown>[],
  pessoas: [] as Record<string, unknown>[],
  parentescos: [] as Record<string, unknown>[],
  socios: [] as Record<string, unknown>[],
}));

vi.mock('@/components/equipe/osg/OsgLayout', () => ({
  OsgLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/contexts/OsgWorkContext', () => ({
  useOsgWork: () => ({ clienteId: 'C1', setClienteId: () => undefined }),
}));
vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({
  useBensByCliente: () => ({ data: mocks.bens, isLoading: false, error: null }),
}));
vi.mock('@/hooks/useQuadroSocietario', () => ({
  useQuadroSocietarioByEmpresa: () => ({ data: mocks.socios, isLoading: false, error: null }),
}));
vi.mock('@/hooks/useQualificacaoDasPartes', () => ({
  usePessoasByCliente: () => ({ data: mocks.pessoas, isLoading: false, error: null }),
  useParentescosByCliente: () => ({ data: mocks.parentescos, isLoading: false, error: null }),
}));

import CalculadoraItcmd from './CalculadoraItcmd';

const imovel = (id: string, contabil: number | null) => ({
  id,
  cliente_id: 'C1',
  referencia_dp: id,
  denominacao: `Fazenda ${id}`,
  tipo_bem: 'IR',
  participa_estruturacao: true,
  vlr_itr_iptu: null,
  // Um imóvel, uma matrícula: os valores moram na matrícula desde a migração.
  valores: {
    contabil: { valor: contabil, comValor: contabil == null ? 0 : 1 },
    mercado: { valor: null, comValor: 0 },
    origem: 'matriculas' as const,
    matriculas: 1,
  },
});

const pf = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  denominacao: id,
  tipo_pessoa: 'PF',
  is_fundador: false,
  filiacao_pai_pessoa_id: null,
  filiacao_mae_pessoa_id: null,
  ...extra,
});

beforeEach(() => {
  // Só o relógio é falso: a competência padrão é a do mês da simulação
  // (SPEC §3.1) e o teste precisa dela fixa em fevereiro de 2026, cuja UPF
  // é R$ 255,20 — a competência de todos os casos homologados.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-02-10T12:00:00Z') });

  mocks.bens = [imovel('IR-01', 4_000_000), imovel('IR-02', 2_649_400)];
  mocks.pessoas = [
    { id: 'HOLDING', denominacao: 'Terezinha Participações', tipo_pessoa: 'PJ', tipo_empresa: 'CN', is_fundador: false, filiacao_pai_pessoa_id: null, filiacao_mae_pessoa_id: null },
    pf('Cristiano', { is_fundador: true }),
    pf('Fabiane', { is_fundador: true }),
    pf('Gabriel'),
    pf('Rafael'),
  ];
  mocks.socios = [
    { id: 'S1', socio_pessoa_id: 'Cristiano', socio_denominacao: 'Cristiano', socio_tipo_pessoa: 'PF', quotas: 6_086_672 },
    { id: 'S2', socio_pessoa_id: 'Fabiane', socio_denominacao: 'Fabiane', socio_tipo_pessoa: 'PF', quotas: 562_728 },
  ];
  mocks.parentescos = [
    { id: 'V1', pessoa_id: 'Gabriel', parente_pessoa_id: 'Cristiano', tipo: 'Filho(a)' },
    { id: 'V2', pessoa_id: 'Rafael', parente_pessoa_id: 'Cristiano', tipo: 'Filho(a)' },
  ];
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CalculadoraItcmd — a cadeia da tela', () => {
  it('apura o quadro depois de a disponível fechar, e marca o cenário sem valor', () => {
    render(<CalculadoraItcmd />);

    // Acervo: contábil completo, mercado e ITR sem valor em nenhum imóvel.
    expect(screen.getByText('R$ 6.649.400,00')).toBeInTheDocument();
    expect(screen.getByText(/Valor de mercado: — sem valor em nenhum dos 2 imóveis/))
      .toBeInTheDocument();
    expect(screen.getByText(/Valor de ITR: — sem valor em nenhum dos 2 imóveis/))
      .toBeInTheDocument();

    // Legítima CALCULADA (o analista não digita): teto(6.086.672/4) +
    // teto(562.728/4) = 1.521.668 + 140.682 = 1.662.350 por herdeiro.
    expect(screen.getAllByText('1.662.350').length).toBeGreaterThan(0);

    // Sem a disponível distribuída, o quadro não sai.
    expect(screen.getByText(/quadro aparece quando a parte disponível/)).toBeInTheDocument();
    expect(screen.getByText(/Faltam 3.324.700 quotas/)).toBeInTheDocument();

    for (const nome of ['Gabriel', 'Rafael']) {
      fireEvent.change(screen.getByLabelText(`Disponível para ${nome}`), {
        target: { value: '1662350' },
      });
    }

    // Agora fecha, e o quadro traz os números homologados (SPEC §8, E97/C84).
    expect(screen.getByText(/A disponível fecha/)).toBeInTheDocument();
    expect(screen.getAllByText('R$ 186.864,00')).toHaveLength(2);
    expect(screen.getByText('R$ 373.728,00')).toBeInTheDocument();
    expect(screen.getByText(/UPF de 2026-02: R\$ 255,20/)).toBeInTheDocument();

    // ITR e mercado seguem `—` no quadro, com o selo de cenário incompleto:
    // ausência de dado nunca vira R$ 0,00.
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
    expect(screen.getAllByText(/cenário incompleto, sem valor em nenhum dos 2 imóveis/))
      .toHaveLength(2);
  });
});
