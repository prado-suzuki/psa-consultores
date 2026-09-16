import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clientes: vi.fn(),
  contribuintes: vi.fn(),
  pers: vi.fn(),
  situacoes: vi.fn(),
  dcomps: vi.fn(),
  distribuicoes: vi.fn(),
  distintas: vi.fn(),
  global: vi.fn(),
  selic: vi.fn(),
}));

vi.mock('@/hooks/useDomainPerdcomp', () => ({
  useClientesControlePerdcomp: mocks.clientes,
  useContribuintesControlePerdcomp: mocks.contribuintes,
  usePersControlePerdcomp: mocks.pers,
  useSituacoesControlePerdcomp: mocks.situacoes,
  useDcompsControlePerdcomp: mocks.dcomps,
  useDistribuicoesControlePerdcomp: mocks.distribuicoes,
  useSituacoesDistintasControlePerdcomp: mocks.distintas,
  useBuscarProcessoGlobalPerdcomp: mocks.global,
}));
vi.mock('@/hooks/useSelicDataPerPer', () => ({ useSelicDataPerPer: mocks.selic }));
vi.mock('@/components/equipe/dev/DevLayout', async () => {
  // A fábrica é içada acima dos imports, então o resolvedor entra por import
  // dinâmico. O cabeçalho vem do registro (`tela`), como na tela real — resolver
  // aqui pela mesma função evita o teste medir o mock em vez do nome da tela.
  const { resolverCabecalhoDoDev } = await import('@/config/telasDoDigitalDev');
  return {
    DevLayout: ({ children, ...cabecalho }: { children: ReactNode }) => (
      <main>
        <h1>{resolverCabecalhoDoDev(cabecalho as never).title}</h1>
        {children}
      </main>
    ),
  };
});
vi.mock('@/components/equipe/dev/DevPageHeader', () => ({ DevPageHeader: () => <p>cabeçalho</p> }));
vi.mock('@/components/equipe/dev/perdcomp/controle/ControlePerdcompFilters', () => ({
  ControlePerdcompFilters: () => <section>filtros</section>,
}));
vi.mock('@/components/equipe/dev/perdcomp/controle/ControlePerdcompResults', () => ({
  ControlePerdcompResults: ({ searched }: { searched: boolean }) => (
    <section>resultados:{String(searched)}</section>
  ),
}));
vi.mock('@/components/equipe/dev/perdcomp/PerFormModal', () => ({ PerFormModal: () => null }));
vi.mock('@/components/equipe/dev/perdcomp/SoftDeleteModal', () => ({
  SoftDeleteModal: () => null,
}));
vi.mock('@/components/equipe/dev/perdcomp/PerDetailModal', () => ({ PerDetailModal: () => null }));

import ControlePerdcomp from '@/pages/equipe/dev/ControlePerdcomp';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.clientes.mockReturnValue({ data: [] });
  mocks.contribuintes.mockReturnValue({ data: [] });
  mocks.pers.mockReturnValue({ data: [], isLoading: false, isError: false });
  mocks.situacoes.mockReturnValue({ data: {} });
  mocks.dcomps.mockReturnValue({ data: [], isLoading: false });
  mocks.distribuicoes.mockReturnValue({ data: [] });
  mocks.distintas.mockReturnValue({ data: [] });
  mocks.global.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  mocks.selic.mockReturnValue({ data: {}, isLoading: false, error: null });
});

describe('ControlePerdcomp', () => {
  it('renderiza a composição inicial estável com hooks e modais isolados', () => {
    render(<ControlePerdcomp />);

    expect(screen.getByRole('heading', { name: 'Controle PERDCOMP' })).toBeInTheDocument();
    expect(screen.getByText('filtros')).toBeInTheDocument();
    expect(screen.getByText('resultados:false')).toBeInTheDocument();
    expect(mocks.contribuintes).toHaveBeenCalledWith('');
    expect(mocks.pers).toHaveBeenCalledWith('', false);
    expect(mocks.situacoes).toHaveBeenCalledWith('', false);
    expect(mocks.dcomps).toHaveBeenCalledWith('', false);
    expect(mocks.distribuicoes).toHaveBeenCalledWith('', [], false);
    expect(mocks.selic).toHaveBeenCalledWith([]);
  });
});
