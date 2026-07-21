import type { PropsWithChildren } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  aliqCofins,
  calcTodosPeriodos,
  calcTodosPeriodosBalancete,
  calcTotais,
  isItemCredito,
  isItemIsencaoCredito,
  isItemOutrasSaidas,
  isItemReceita,
  isItemSuspenso,
} from '@/lib/apuracaoPisCofins';
import type { ApuracaoInput, ItemCredito } from '@/types/pisCofins';

// APIs de ponteiro usadas pelo Radix Select e ausentes no jsdom.
Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => undefined },
  releasePointerCapture: { configurable: true, value: () => undefined },
});
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.IntersectionObserver = class IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];
  readonly scrollMargin = '0px';
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
} as unknown as typeof IntersectionObserver;

const mocks = vi.hoisted(() => ({
  apuracao: vi.fn(),
  domain: vi.fn(),
  imports: vi.fn(),
  toast: vi.fn(),
  apiState: { data: null as unknown, isLoading: false, error: null as Error | null },
  importState: { hasEfd: true, hasBalancete: true, ready: true },
}));

vi.mock('@/hooks/usePisCofinsApuracao', () => ({
  usePisCofinsApuracao: (params: unknown) => {
    mocks.apuracao(params);
    return mocks.apiState;
  },
}));

vi.mock('@/hooks/useDomainApuracaoPisCofins', () => ({
  useDomainApuracaoPisCofins: (clienteId: string) => {
    mocks.domain(clienteId);
    return {
      clientesQuery: {
        data: [
          { id: 'cliente-1', nome: 'Cliente Alfa' },
          { id: 'cliente-2', nome: 'Cliente Beta' },
        ],
        isLoading: false,
      },
      contribuintesQuery: {
        data: clienteId
          ? [{ id: 'contribuinte-1', nome_razao_social: 'Empresa Alfa', cpf_cnpj: '12.345.678/0001-90' }]
          : [],
        isLoading: false,
      },
    };
  },
}));

vi.mock('@/hooks/usePisCofinsImportStatus', () => ({
  usePisCofinsImportStatus: (params: unknown) => {
    mocks.imports(params);
    return mocks.importState;
  },
}));

vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));

// O shell depende de autenticação e roteamento; o conteúdo fiscal permanece real.
vi.mock('@/components/equipe/dev/DevLayout', () => ({
  DevLayout: ({ children, title, subtitle }: PropsWithChildren<{ title: string; subtitle: string }>) => (
    <main>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </main>
  ),
}));

import ApuracaoPisCofins from '@/pages/equipe/dev/ApuracaoPisCofins';

function item(overrides: Partial<ItemCredito>): ItemCredito {
  return {
    cst_pis: '01',
    aliq_pis: 1.65,
    cod_cta: '3.01',
    descricao_conta: 'Receita normal',
    bloco_efd: 'C170',
    vlr_efd: 0,
    credito: 0,
    debito: 0,
    saldo_periodo: 0,
    saldo_atual: 0,
    ...overrides,
  };
}

const fiscalFixture: ApuracaoInput = {
  periodos: [
    {
      dt_ini: '2026-01-01',
      itens_credito: [
        item({ cst_pis: '01', cod_cta: '3.01', descricao_conta: 'Receita normal', vlr_efd: 10_000 }),
        item({ cst_pis: '02', aliq_pis: 1.2375, cod_cta: '3.02', descricao_conta: 'Receita reduzida', vlr_efd: 2_000 }),
        item({ cst_pis: '04', aliq_pis: 0, cod_cta: '3.04', descricao_conta: 'Receita isenta', vlr_efd: 1_000 }),
        item({ cst_pis: '50', cod_cta: '4.01', descricao_conta: 'Compra normal', vlr_efd: 3_000 }),
        item({ cst_pis: '51', aliq_pis: 0, cod_cta: '4.02', descricao_conta: 'Crédito CST 51', vlr_efd: 1_000 }),
        item({ cst_pis: '60', aliq_pis: 1.2375, cod_cta: '4.03', descricao_conta: 'Compra presumida', vlr_efd: 2_000 }),
        item({ cst_pis: '70', aliq_pis: 0, cod_cta: '4.70', descricao_conta: 'Sem crédito', vlr_efd: 500 }),
        item({ cst_pis: '49', aliq_pis: 0, cod_cta: '3.49', descricao_conta: 'Outra saída', vlr_efd: 250 }),
      ],
      rateio_receitas: {
        rec_bru_cum: 0,
        rec_bru_ncum_trib_mi: 5_000,
        rec_bru_ncum_nt_mi: 3_000,
        rec_bru_ncum_exp: 2_000,
        rec_bru_total: 10_000,
      },
    },
    {
      dt_ini: '2026-02-01',
      itens_credito: [
        item({ cst_pis: '50', cod_cta: '4.01', descricao_conta: 'Compra normal', vlr_efd: 10_000 }),
      ],
      rateio_receitas: {
        rec_bru_cum: 0,
        rec_bru_ncum_trib_mi: 0,
        rec_bru_ncum_nt_mi: 0,
        rec_bru_ncum_exp: 0,
        rec_bru_total: 0,
      },
    },
    {
      dt_ini: '2026-03-01',
      itens_credito: [
        item({ cst_pis: '01', cod_cta: '3.01', descricao_conta: 'Receita normal', vlr_efd: 5_000 }),
      ],
      rateio_receitas: null,
    },
  ],
};

const pradoFixture: ApuracaoInput = {
  periodos: [
    {
      dt_ini: '2026-01-01',
      itens_credito: [
        item({ cst_pis: '01', vlr_efd: 10_000, saldo_periodo: 90_000, saldo_atual: 80_000 }),
        item({
          cst_pis: '50',
          cod_cta: '4.01',
          descricao_conta: 'Compra Prado',
          vlr_efd: 1,
          saldo_periodo: 1_000,
          saldo_atual: 2_500,
        }),
      ],
      rateio_receitas: null,
    },
  ],
};

async function selectClientAndSearch(user: ReturnType<typeof userEvent.setup>) {
  const selects = screen.getAllByRole('combobox');
  await user.click(selects[0]);
  await user.click(await screen.findByRole('option', { name: 'Cliente Alfa' }));
  await user.click(screen.getAllByRole('combobox')[1]);
  await user.click(await screen.findByRole('option', { name: /Empresa Alfa/ }));
  await user.click(screen.getByRole('button', { name: /consultar/i }));
}

function sectionByHeading(name: string): HTMLElement {
  const section = screen.getByRole('heading', { name }).closest('section');
  if (!section) throw new Error(`Seção não encontrada: ${name}`);
  return section;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.apiState.data = fiscalFixture;
  mocks.apiState.isLoading = false;
  mocks.apiState.error = null;
  mocks.importState.hasEfd = true;
  mocks.importState.hasBalancete = true;
  mocks.importState.ready = true;
});

describe('fórmulas fiscais atuais', () => {
  it('congela as faixas de CST, inclusive CST 51 zerado e demais saídas', () => {
    expect(['01', '10'].map((cst) => isItemReceita(item({ cst_pis: cst })))).toEqual([true, true]);
    expect(['00', '11'].map((cst) => isItemReceita(item({ cst_pis: cst })))).toEqual([false, false]);
    expect(['04', '09'].map((cst) => isItemSuspenso(item({ cst_pis: cst })))).toEqual([true, true]);
    expect(isItemCredito(item({ cst_pis: '51', aliq_pis: 0 }))).toBe(true);
    expect(isItemCredito(item({ cst_pis: '50', aliq_pis: 0 }))).toBe(false);
    expect(isItemIsencaoCredito(item({ cst_pis: '50', aliq_pis: 0 }))).toBe(true);
    expect(isItemIsencaoCredito(item({ cst_pis: '70', aliq_pis: 0 }))).toBe(true);
    expect(isItemOutrasSaidas(item({ cst_pis: '49' }))).toBe(true);
    expect(isItemOutrasSaidas(item({ cst_pis: '99' }))).toBe(true);
  });

  it('caracteriza alíquotas cheia/reduzida, bases, débitos e créditos por item', () => {
    const janeiro = calcTodosPeriodos(fiscalFixture)[0];

    expect(aliqCofins(1.65)).toBe(7.6);
    expect(aliqCofins(1.2375)).toBe(5.7);
    expect(aliqCofins(9.99)).toBe(0);
    expect(janeiro.baseDebito).toEqual({ baseNormal: 12_000, baseDiferenciada: 0, baseTotal: 12_000 });
    expect(janeiro.baseCredito).toEqual({ baseNormal: 4_000, basePresumido: 2_000, baseTotal: 6_000 });
    expect(janeiro.resultado.pisContribuicaoBruta).toBeCloseTo(198);
    expect(janeiro.resultado.cofinsContribuicaoBruta).toBeCloseTo(912);
    expect(janeiro.resultado.pisContribuicaoBrutaAliquotaReduzida).toBeCloseTo(24.75);
    expect(janeiro.resultado.cofinsContribuicaoBrutaAliquotaReduzida).toBeCloseTo(114);
    expect(janeiro.resultado.pisCreditoMes).toBeCloseTo(74.25);
    expect(janeiro.resultado.cofinsCreditoMes).toBeCloseTo(342);
    expect(janeiro.resultado.pisDue).toBeCloseTo(123.75);
    expect(janeiro.resultado.cofinsDue).toBeCloseTo(570);
  });

  it('preserva carryforward sequencial, rateio proporcional e totais acumulados', () => {
    const resultados = calcTodosPeriodos(fiscalFixture);
    const [, fevereiro, marco] = resultados;

    expect(fevereiro.resultado.pisSaldoAcumulado).toBeCloseTo(165);
    expect(fevereiro.resultado.cofinsSaldoAcumulado).toBeCloseTo(760);
    expect(marco.resultado.pisCreditoAnterior).toBeCloseTo(165);
    expect(marco.resultado.cofinsCreditoAnterior).toBeCloseTo(760);
    expect(marco.resultado.pisDue).toBe(0);
    expect(marco.resultado.cofinsDue).toBe(0);
    expect(marco.resultado.pisSaldoAcumulado).toBeCloseTo(82.5);
    expect(marco.resultado.cofinsSaldoAcumulado).toBeCloseTo(380);

    expect(resultados[0].rateio).toMatchObject({ percTributado: 0.5, percNaoTrib: 0.3, percExportacao: 0.2 });
    expect(resultados[0].rateio?.pis101).toBeCloseTo(37.125);
    expect(resultados[0].rateio?.cofins301).toBeCloseTo(68.4);
    expect(resultados[1].rateio).toEqual({
      percTributado: 0,
      percNaoTrib: 0,
      percExportacao: 0,
      pis101: 0,
      pis201: 0,
      pis301: 0,
      cofins101: 0,
      cofins201: 0,
      cofins301: 0,
    });
    expect(calcTotais(resultados)).toMatchObject({ receitaBruta: 17_000, baseCredito: 16_000 });
  });

  it('congela Prado aberto/fechado: crédito usa saldo periódico/atual e débito continua no EFD', () => {
    const aberto = calcTodosPeriodosBalancete(pradoFixture, false)[0];
    const fechado = calcTodosPeriodosBalancete(pradoFixture, true)[0];

    expect(aberto.baseCredito.baseTotal).toBe(1_000);
    expect(fechado.baseCredito.baseTotal).toBe(2_500);
    expect(aberto.resultado.pisCreditoMes).toBeCloseTo(16.5);
    expect(fechado.resultado.pisCreditoMes).toBeCloseTo(41.25);
    expect(aberto.resultado.cofinsCreditoMes).toBeCloseTo(76);
    expect(fechado.resultado.cofinsCreditoMes).toBeCloseTo(190);
    expect(aberto.baseDebito.baseTotal).toBe(10_000);
    expect(fechado.baseDebito.baseTotal).toBe(10_000);
  });
});

describe('ApuracaoPisCofins', () => {
  it('expõe estado inicial, textos orientativos e valida contribuinte antes de consultar', async () => {
    const user = userEvent.setup();
    render(<ApuracaoPisCofins />);

    expect(screen.getByRole('heading', { name: 'Apuração PIS/COFINS' })).toBeInTheDocument();
    expect(screen.getByText(/consolida débitos, créditos, isenções e rateios/i)).toBeInTheDocument();
    expect(screen.getByText('Filtros de Busca')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(mocks.apuracao).toHaveBeenLastCalledWith({
      idContribuinte: '',
      dtIni: '',
      dtFim: '',
      enabled: false,
    });

    await user.click(screen.getByRole('button', { name: /consultar/i }));
    expect(mocks.toast).toHaveBeenCalledWith({ title: 'Selecione um contribuinte', variant: 'destructive' });
  });

  it('controla filtros vivos/commitados e Limpar desabilita a consulta', async () => {
    const user = userEvent.setup();
    render(<ApuracaoPisCofins />);

    await selectClientAndSearch(user);
    await waitFor(() => expect(mocks.apuracao).toHaveBeenLastCalledWith({
      idContribuinte: 'contribuinte-1',
      dtIni: '',
      dtFim: '',
      enabled: true,
    }));
    expect(mocks.domain).toHaveBeenLastCalledWith('cliente-1');

    await user.click(screen.getByRole('button', { name: /limpar/i }));
    expect(mocks.apuracao).toHaveBeenLastCalledWith({ idContribuinte: '', dtIni: '', dtFim: '', enabled: false });
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('apresenta resultado e as cinco abas com tabelas, fórmulas e textos atuais', async () => {
    const user = userEvent.setup();
    render(<ApuracaoPisCofins />);
    await selectClientAndSearch(user);

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Resumo',
      'Débitos',
      'Créditos',
      'Apuração',
      'Rateio',
    ]);
    expect(screen.getByText('Base da Apuração - EFD Contribuições')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Débitos' }));
    expect(screen.getByText('Isenções e Exclusões')).toBeInTheDocument();
    expect(screen.getByText('Outras Saídas')).toBeInTheDocument();
    expect(within(sectionByHeading('Base de Cálculo Após Isenções/Exclusões')).getByText('Base Normal').closest('tr')).toHaveTextContent('17.000,00');

    await user.click(screen.getByRole('tab', { name: 'Créditos' }));
    expect(screen.getByText('Operações não geradoras de Crédito')).toBeInTheDocument();
    const creditoTotal = within(sectionByHeading('Base de Cálculo do Crédito'))
      .getAllByText('Total')
      .find((element) => element.tagName === 'TD');
    const creditoTotalRow = creditoTotal?.closest('tr');
    expect(creditoTotalRow).toHaveTextContent('16.000,00');
    expect(creditoTotalRow).toHaveClass('font-bold', 'bg-muted/30');
    expect(Array.from(creditoTotalRow?.querySelectorAll('td') ?? [])).toSatisfy((cells: Element[]) =>
      cells.every((cell) => cell.classList.contains('font-bold') && cell.classList.contains('bg-muted/30')),
    );

    await user.click(screen.getByRole('tab', { name: 'Apuração' }));
    expect(screen.getByRole('heading', { name: 'Apuração do Débito de PIS' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Apuração do Débito de COFINS' })).toBeInTheDocument();
    expect(screen.getAllByText('Crédito Anterior (Carryforward)')).toHaveLength(2);
    const saldoRows = screen.getAllByText('Saldo Acumulado p/ Próximo Mês').map((label) => label.closest('tr'));
    expect(saldoRows).toHaveLength(2);
    saldoRows.forEach((row) => expect(row).toHaveClass('text-muted-foreground'));

    await user.click(screen.getByRole('tab', { name: 'Rateio' }));
    expect(screen.getByText('Percentual de rateio')).toBeInTheDocument();
    expect(screen.getByText('50.00%')).toBeInTheDocument();
    expect(screen.getByText('PIS - 101 (Créditos Vinculados a Receita Tributada M.I.)').closest('tr')).toHaveTextContent('37,13');
    expect(screen.getByText('COFINS - 301 (Créditos Vinculados a Receita de Exportação)').closest('tr')).toHaveTextContent('68,40');
    const rateioSection = sectionByHeading('Rateio');
    const rateioRows = Array.from(rateioSection.querySelectorAll<HTMLTableRowElement>('tr'));
    const spacers = Array.from(rateioSection.querySelectorAll<HTMLTableRowElement>('tr[data-period-spacer="true"]'));
    const rowByText = (text: string) => {
      const row = screen.getByText(text).closest<HTMLTableRowElement>('tr');
      if (!row) throw new Error(`Linha não encontrada: ${text}`);
      return row;
    };
    expect(spacers).toHaveLength(2);
    expect(rateioRows.indexOf(spacers[0])).toBeGreaterThan(rateioRows.indexOf(rowByText('Não Tributado - Exportação')));
    expect(rateioRows.indexOf(spacers[0])).toBeLessThan(rateioRows.indexOf(rowByText('PIS - 101 (Créditos Vinculados a Receita Tributada M.I.)')));
    expect(rateioRows.indexOf(spacers[1])).toBeGreaterThan(rateioRows.indexOf(rowByText('PIS - 301 (Créditos Vinculados a Receita de Exportação)')));
    expect(rateioRows.indexOf(spacers[1])).toBeLessThan(rateioRows.indexOf(rowByText('COFINS - 101 (Créditos Vinculados a Receita Tributada M.I.)')));
  });

  it('agrega por ano, expande meses e filtra a tabela Resumo por conta', async () => {
    const user = userEvent.setup();
    render(<ApuracaoPisCofins />);
    await selectClientAndSearch(user);

    expect(screen.getAllByText('2026').length).toBeGreaterThan(0);
    await user.click(screen.getAllByTitle('Expandir Ano')[0]);
    expect(screen.getAllByText('01/2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('02/2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('03/2026').length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('combobox').at(-1)!);
    await user.click(screen.getByText('3.02 - Receita reduzida'));
    expect(screen.getByText('Receita reduzida')).toBeInTheDocument();
    expect(screen.queryByText('Receita normal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remover 3.02 - receita reduzida/i })).toBeInTheDocument();
  });

  it('alterna Prado aberto/fechado, muda os valores apresentados e oculta Rateio', async () => {
    const user = userEvent.setup();
    mocks.apiState.data = pradoFixture;
    render(<ApuracaoPisCofins />);
    await selectClientAndSearch(user);

    await user.click(screen.getAllByRole('combobox')[2]);
    await user.click(await screen.findByRole('option', { name: 'Prado' }));
    expect(screen.queryByRole('tab', { name: 'Rateio' })).not.toBeInTheDocument();
    expect(screen.getByText('Período Fechado')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Créditos' }));
    const baseSection = sectionByHeading('Base de Cálculo do Crédito');
    const totalRow = within(baseSection).getAllByText('Total').find((element) => element.tagName === 'TD')?.closest('tr');
    expect(totalRow).toHaveTextContent('1.000,00');

    await user.click(screen.getByRole('switch', { name: 'Período Fechado' }));
    expect(totalRow).toHaveTextContent('2.500,00');
  });

  it('distingue erro e ausência dos dois documentos importados', async () => {
    const user = userEvent.setup();
    mocks.apiState.data = null;
    mocks.apiState.error = new Error('falha fiscal');
    const { unmount } = render(<ApuracaoPisCofins />);
    await selectClientAndSearch(user);
    expect(screen.getByText('Erro ao buscar dados')).toBeInTheDocument();
    expect(screen.getByText('falha fiscal')).toBeInTheDocument();

    unmount();
    mocks.apiState.error = null;
    mocks.apiState.data = { periodos: [] };
    mocks.importState.hasEfd = false;
    mocks.importState.hasBalancete = false;
    render(<ApuracaoPisCofins />);
    await selectClientAndSearch(user);
    expect(screen.getByText(/nem a EFD Contribuições nem o Balancete/i)).toBeInTheDocument();
    expect(mocks.imports).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
  });
});
