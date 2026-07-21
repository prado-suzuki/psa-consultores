import type { PropsWithChildren, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryOptions = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  enabled: boolean;
  retry: (failureCount: number, error: Error) => boolean;
};

const nfe = {
  chave_nfe: 'NFE/CHAVE 1', cUF: 35, natOp: 'Venda', mod: '55', serie: 1, nNF: '99',
  dhEmi: '2026-02-10T12:00:00Z', tpNF: 1, contItens: 2, vlrTotal: 123.45,
  tipo_mov: 'Saida', emit: { CNPJ: '12345678000199', xNome: 'Emitente NFe', IE: '1', UF: 'SP' },
  dest: { CNPJ: '98765432000100', xNome: 'Destino', IE: '2', UF: 'RJ' },
};

const actor = { CNPJ: '12345678000199', CPF: null, IE: '1', xNome: 'Transportadora', xFant: null, UF: 'SP', cMun: 1 };
const cte = {
  chave_cte: 'CTE CHAVE 1', cCT: 1, cfop: '6353', natOp: 'Transporte', mod: '57', serie: 1,
  nCT: 77, dEmi: '2026-02-11T12:00:00Z', tpEmis: 1, tpCTe: 0, modal: '01', tpServ: 0,
  cMunIni: 1, xMunIni: 'Campinas', cMunFim: 2, xMunFim: 'Santos', vTPrest: 456.78,
  vRec: 450, vCarga: 1000, proPred: 'Carga', emit: actor, dest: actor,
  tomador: { toma: 0, ...actor }, icms: { CST: '00', vBC: 1, pICMS: 12, vICMS: 1, pRedBC: null, vBCSTRet: null, vICMSSTRet: null, vTotTrib: null },
  infAdic: { xObs: null, infAdFisco: null }, docs_nfe: [], medidas: [],
};

const mocks = vi.hoisted(() => ({
  options: new Map<string, QueryOptions>(),
  fetchWithAuth: vi.fn(),
  toast: vi.fn(),
  exportProps: {} as Record<string, unknown>,
  nfeData: null as null | { items: typeof nfe[]; total: number; page: number; page_size: number; has_more: boolean },
  cteData: null as null | { items: typeof cte[]; total: number; page: number; page_size: number; has_more: boolean },
  loading: false,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: QueryOptions) => {
    const kind = String(options.queryKey[0]);
    mocks.options.set(kind, options);
    return {
      data: kind === 'nfe-docs' ? mocks.nfeData : mocks.cteData,
      isLoading: mocks.loading,
      error: null,
      refetch: vi.fn(() => options.queryFn()),
    };
  },
}));
vi.mock('@/hooks/useApiAuth', () => ({ useApiAuth: () => ({ fetchWithAuth: mocks.fetchWithAuth }) }));
vi.mock('@/hooks/useDomainConsultaXMLs', () => ({
  useDomainConsultaXMLs: () => ({
    clientesQuery: { data: [{ id: 'cliente-1', nome: 'Cliente PSA' }], isLoading: false },
    contribuintesQuery: {
      data: [{ id: 'contrib-1', nome_razao_social: 'Contribuinte Único', cpf_cnpj: '12345678000199' }],
      isLoading: false,
      error: null,
    },
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/components/equipe/dev/DevLayout', () => ({ DevLayout: ({ children }: PropsWithChildren) => <main>{children}</main> }));
vi.mock('@/components/equipe/dev/DevPageHeader', () => ({ DevPageHeader: () => <div>cabeçalho</div> }));
vi.mock('@/components/equipe/dev/ExportDialog', () => ({
  ExportDialog: (props: Record<string, unknown>) => {
    mocks.exportProps = props;
    return <button disabled={Boolean(props.disabled)}>export-dialog</button>;
  },
}));
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: PropsWithChildren) => children,
  Tooltip: ({ children }: PropsWithChildren) => children,
  TooltipTrigger: ({ children }: PropsWithChildren) => children,
  TooltipContent: ({ children }: PropsWithChildren) => <span>{children}</span>,
}));
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: PropsWithChildren) => <div>{children}</div>,
  PopoverTrigger: ({ children }: PropsWithChildren) => children,
  PopoverContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => (
    <button onClick={() => onSelect(new Date(2026, 1, 15))}>escolher-data</button>
  ),
}));
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  const ValueContext = React.createContext('');
  return {
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) => (
      <ValueContext.Provider value={value}>
        <select value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>
      </ValueContext.Provider>
    ),
    SelectTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }: PropsWithChildren) => <>{children}</>,
    SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
  };
});

import ConsultaXMLs from '@/pages/equipe/dev/ConsultaXMLs';

function fillRequired(type: 'nfe' | 'cte') {
  const selects = screen.getAllByRole('combobox');
  fireEvent.change(selects[0], { target: { value: 'cliente-1' } });
  fireEvent.change(selects[2], { target: { value: type } });
  const dates = screen.getAllByRole('button', { name: 'escolher-data' });
  fireEvent.click(dates[0]);
  fireEvent.click(dates[1]);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.options.clear();
  mocks.nfeData = null;
  mocks.cteData = null;
  mocks.loading = false;
  mocks.exportProps = {};
  mocks.fetchWithAuth.mockResolvedValue({
    ok: true,
    json: async () => ({ items: [], total: 0 }),
    text: async () => '<xml/>',
    blob: async () => new Blob(['zip']),
    headers: new Headers(),
  });
  Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
  Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});

describe('ConsultaXMLs', () => {
  it('congela query keys, enabled, retry e estado vazio inicial', () => {
    render(<ConsultaXMLs />);

    expect(screen.getByText('Pronto para buscar')).toBeInTheDocument();
    expect(mocks.options.get('nfe-docs')).toMatchObject({
      queryKey: ['nfe-docs', '', '', '', 1, '', '', '', ''], enabled: false,
    });
    expect(mocks.options.get('cte-docs')).toMatchObject({
      queryKey: ['cte-docs', '', '', '', 1, '', '', '', ''], enabled: false,
    });
    const retry = mocks.options.get('nfe-docs')!.retry;
    expect(retry(0, new Error('Sessão expirada'))).toBe(false);
    expect(retry(1, new Error('falha'))).toBe(true);
    expect(retry(2, new Error('falha'))).toBe(false);
  });

  it('mantém filtros comuns vivos na key, mas só submete a chave ao buscar, e monta a consulta NFe', async () => {
    render(<ConsultaXMLs />);
    fillRequired('nfe');
    await waitFor(() => expect(screen.getAllByRole('combobox')[1]).toHaveValue('contrib-1'));
    fireEvent.change(screen.getByPlaceholderText('Digite a chave de acesso (44 dígitos)'), { target: { value: 'CHAVE-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(mocks.options.get('nfe-docs')?.queryKey.at(-1)).toBe('CHAVE-1'));

    fireEvent.change(screen.getByPlaceholderText('Digite a chave de acesso (44 dígitos)'), { target: { value: 'CHAVE-2' } });
    expect(mocks.options.get('nfe-docs')?.queryKey.at(-1)).toBe('CHAVE-1');
    expect(mocks.options.get('nfe-docs')?.enabled).toBe(true);

    fireEvent.change(screen.getAllByPlaceholderText('Digite o CPF ou CNPJ')[0], { target: { value: '99.888' } });
    expect(mocks.options.get('nfe-docs')?.queryKey[6]).toBe('99.888');
    expect(mocks.options.get('nfe-docs')?.enabled).toBe(false);
  });

  it('consulta NFe com parâmetros sanitizados, pagina a tabela e preserva props/downloads', async () => {
    mocks.nfeData = { items: [nfe], total: 21, page: 1, page_size: 10, has_more: true };
    render(<ConsultaXMLs />);
    fillRequired('nfe');
    await waitFor(() => expect(screen.getAllByRole('combobox')[1]).toHaveValue('contrib-1'));
    fireEvent.change(screen.getAllByPlaceholderText('Digite o CPF ou CNPJ')[0], { target: { value: '12.345/0001' } });
    fireEvent.change(screen.getByPlaceholderText('Digite a chave de acesso (44 dígitos)'), { target: { value: '44.55' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(mocks.options.get('nfe-docs')?.enabled).toBe(true));
    expect(mocks.options.get('nfe-docs')?.queryKey).toEqual([
      'nfe-docs', 'contrib-1', '2026-02-15', '2026-02-15', 1, '', '12.345/0001', '', '44.55',
    ]);
    await mocks.options.get('nfe-docs')!.queryFn();
    expect(mocks.fetchWithAuth).toHaveBeenLastCalledWith(
      'http://localhost:8000/api/v1/query/contribuintes/contrib-1/nfes?data_inicio=2026-02-15&data_fim=2026-02-15&page=1&page_size=10&emitente=123450001&chave=4455',
      { method: 'GET' },
    );
    expect(screen.getByText('Emitente NFe')).toBeInTheDocument();
    expect(screen.getByText('21 nota(s) encontrada(s)')).toBeInTheDocument();
    expect(screen.getByText(/Página/)).toHaveTextContent('Página 1 de 3');
    expect(mocks.exportProps).toMatchObject({ tipoDocumento: 'nfe', totalRecords: 21, contribuinteId: 'contrib-1', emitente: '12.345/0001', disabled: false });

    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }));
    expect(mocks.options.get('nfe-docs')?.queryKey[4]).toBe(2);

    const row = screen.getByText('Emitente NFe').closest('tr')!;
    fireEvent.click(within(row).getByRole('button'));
    await waitFor(() => expect(mocks.fetchWithAuth).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/query/download/nfe/xml/NFE%2FCHAVE%201',
      { method: 'GET', headers: { Accept: 'application/xml' } },
    ));
  });

  it('usa endpoint/tabela CTe e baixa o lote com filtros vivos e filename do header', async () => {
    mocks.cteData = { items: [cte], total: 1, page: 1, page_size: 10, has_more: false };
    mocks.fetchWithAuth.mockResolvedValue({
      ok: true, json: async () => ({ items: [], total: 0 }), text: async () => '<xml/>', blob: async () => new Blob(['zip']),
      headers: new Headers({ 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="ctes-lote.zip"', 'X-Files-Found': '1', 'X-Files-Missing': '2' }),
    });
    render(<ConsultaXMLs />);
    fillRequired('cte');
    await waitFor(() => expect(screen.getAllByRole('combobox')[1]).toHaveValue('contrib-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(mocks.options.get('cte-docs')?.enabled).toBe(true));
    await mocks.options.get('cte-docs')!.queryFn();
    expect(mocks.fetchWithAuth).toHaveBeenLastCalledWith(
      'http://localhost:8000/api/v1/query/contribuintes/contrib-1/ctes?data_inicio=2026-02-15&data_fim=2026-02-15&page=1&page_size=10',
      { method: 'GET' },
    );
    expect(screen.getByText('Transportadora')).toBeInTheDocument();
    expect(screen.getByText('Campinas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Baixar XMLs' }));
    await waitFor(() => expect(mocks.fetchWithAuth).toHaveBeenLastCalledWith(
      'http://localhost:8000/api/v1/query/download/contribuintes/contrib-1/cte/xml?data_inicio=2026-02-15&data_fim=2026-02-15',
      { method: 'GET', headers: { Accept: 'application/xml, application/zip' } },
    ));
    expect(mocks.toast).toHaveBeenLastCalledWith({ title: 'Download concluído', description: '1 arquivo(s) encontrado(s). 2 não localizado(s)' });
  });

  it('mantém no loading as mesmas colunas responsivas das tabelas NFe e CTe', async () => {
    const first = render(<ConsultaXMLs />);
    fillRequired('nfe');
    await waitFor(() => expect(screen.getAllByRole('combobox')[1]).toHaveValue('contrib-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(mocks.options.get('nfe-docs')?.enabled).toBe(true));
    mocks.loading = true;
    fireEvent.change(screen.getByPlaceholderText('Digite a chave de acesso (44 dígitos)'), { target: { value: 'rerender' } });
    const nfeCells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(nfeCells).toHaveLength(9);
    expect(nfeCells[3]).toHaveClass('hidden', 'lg:table-cell');
    first.unmount();

    mocks.loading = false;
    render(<ConsultaXMLs />);
    fillRequired('cte');
    await waitFor(() => expect(screen.getAllByRole('combobox')[1]).toHaveValue('contrib-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(mocks.options.get('cte-docs')?.enabled).toBe(true));
    mocks.loading = true;
    fireEvent.change(screen.getByPlaceholderText('Digite a chave de acesso (44 dígitos)'), { target: { value: 'rerender' } });
    const cteCells = within(screen.getAllByRole('row')[1]).getAllByRole('cell');
    expect(cteCells).toHaveLength(10);
    expect(cteCells[2]).toHaveClass('hidden', 'xl:table-cell');
    expect(cteCells[3]).toHaveClass('hidden', 'xl:table-cell');
    expect(cteCells[4]).toHaveClass('hidden', 'lg:table-cell');
  });
});
