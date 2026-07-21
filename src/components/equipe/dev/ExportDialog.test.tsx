import type { PropsWithChildren, ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CTE_COLUMNS, NFE_COLUMNS } from '@/constants/exportConfig';

const mocks = vi.hoisted(() => ({
  fetchWithAuth: vi.fn(),
  toast: vi.fn(),
  jsonToSheet: vi.fn(() => ({} as Record<string, unknown>)),
  bookNew: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
  appendSheet: vi.fn(),
  writeFile: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  setDefault: vi.fn(),
  profiles: [] as Array<{ id: string; name: string; columns: string[]; is_default: boolean }>,
  defaultProfile: null as null | { id: string; name: string; columns: string[]; is_default: boolean },
}));

vi.mock('xlsx', () => ({
  utils: { json_to_sheet: mocks.jsonToSheet, book_new: mocks.bookNew, book_append_sheet: mocks.appendSheet },
  writeFile: mocks.writeFile,
}));
vi.mock('@/hooks/useApiAuth', () => ({ useApiAuth: () => ({ fetchWithAuth: mocks.fetchWithAuth }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/hooks/useExportProfiles', () => ({
  useExportProfiles: () => ({
    profiles: mocks.profiles,
    isLoading: false,
    defaultProfile: mocks.defaultProfile,
    createProfile: { mutateAsync: mocks.create, isPending: false },
    updateProfile: { mutateAsync: mocks.update, isPending: false },
    deleteProfile: { mutateAsync: mocks.remove, isPending: false },
    setDefaultProfile: { mutateAsync: mocks.setDefault, isPending: false },
  }),
}));

vi.mock('@/components/ui/dialog', async () => {
  const React = await import('react');
  const DialogContext = React.createContext<{ open: boolean; setOpen: (open: boolean) => void }>({ open: false, setOpen: () => undefined });
  return {
    Dialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) => (
      <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>{children}</DialogContext.Provider>
    ),
    DialogTrigger: ({ children }: PropsWithChildren) => {
      const context = React.useContext(DialogContext);
      return <span onClick={() => context.setOpen(true)}>{children}</span>;
    },
    DialogContent: ({ children }: PropsWithChildren) => {
      const context = React.useContext(DialogContext);
      return context.open ? <main>{children}</main> : null;
    },
    DialogHeader: ({ children }: PropsWithChildren) => <header>{children}</header>,
    DialogTitle: ({ children }: PropsWithChildren) => <h2>{children}</h2>,
    DialogDescription: ({ children }: PropsWithChildren) => <p>{children}</p>,
    DialogFooter: ({ children }: PropsWithChildren) => <footer>{children}</footer>,
  };
});
vi.mock('@/components/ui/tabs', async () => {
  const React = await import('react');
  const TabsContext = React.createContext<{ value: string; change: (value: string) => void }>({ value: '', change: () => undefined });
  return {
    Tabs: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) => (
      <TabsContext.Provider value={{ value, change: onValueChange }}>{children}</TabsContext.Provider>
    ),
    TabsList: ({ children }: PropsWithChildren) => <div>{children}</div>,
    TabsTrigger: ({ value, children }: { value: string; children: ReactNode }) => {
      const context = React.useContext(TabsContext);
      return <button onClick={() => context.change(value)}>{children}</button>;
    },
    TabsContent: ({ value, children }: { value: string; children: ReactNode }) => {
      const context = React.useContext(TabsContext);
      return context.value === value ? <section>{children}</section> : null;
    },
  };
});
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: ReactNode }) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: PropsWithChildren) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange, onClick }: { id?: string; checked?: boolean; onCheckedChange?: (value: boolean) => void; onClick?: (event: React.MouseEvent) => void }) => (
    <input id={id} type="checkbox" checked={Boolean(checked)} onClick={onClick} onChange={(event) => onCheckedChange?.(event.target.checked)} />
  ),
}));
vi.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children }: PropsWithChildren) => <div>{children}</div>,
  AccordionItem: ({ children }: PropsWithChildren) => <div>{children}</div>,
  AccordionTrigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
  AccordionContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <aside>{children}</aside> : null,
  AlertDialogContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: PropsWithChildren) => <header>{children}</header>,
  AlertDialogTitle: ({ children }: PropsWithChildren) => <h3>{children}</h3>,
  AlertDialogDescription: ({ children }: PropsWithChildren) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: PropsWithChildren) => <footer>{children}</footer>,
  AlertDialogCancel: ({ children }: PropsWithChildren) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
}));

import { ExportDialog } from '@/components/equipe/dev/ExportDialog';

const nfe = {
  chave_nfe: 'NFE-1', cUF: 35, natOp: 'Venda', mod: '55', serie: 1, nNF: '10', dhEmi: '2026-02-10',
  tpNF: 1, contItens: 1, vlrTotal: 10, tipo_mov: 'Saida',
  emit: { CNPJ: '12345678000199', xNome: 'Emitente', IE: '1', UF: 'SP' },
  dest: { CNPJ: '', xNome: 'Destino', IE: '', UF: 'RJ' },
};

function renderDialog(overrides: Partial<React.ComponentProps<typeof ExportDialog>> = {}) {
  const props: React.ComponentProps<typeof ExportDialog> = {
    data: [nfe], tipoDocumento: 'nfe', totalRecords: 25, start_date: '2026-01-01', end_date: '2026-01-31',
    contribuinteId: 'contrib-1', tipoMov: 'Saida', emitente: '12.345/0001-99', destinatario: '98.765/0001-00',
    ...overrides,
  };
  render(<ExportDialog {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profiles = [];
  mocks.defaultProfile = null;
  mocks.create.mockResolvedValue({ id: 'novo' });
  mocks.fetchWithAuth.mockResolvedValue({ ok: true, text: async () => 'Nome;Valor\nEmpresa;10' });
});

describe('ExportDialog', () => {
  it('abre com todas as colunas, textos do período e estados vazios de seleção/preview', () => {
    renderDialog({ data: [] });
    expect(screen.getByText('Exportar Documentos Fiscais')).toBeInTheDocument();
    expect(screen.getByText('25 registro(s) serão exportados • Período: 2026-01-01 a 2026-01-31')).toBeInTheDocument();
    expect(screen.getByText(`${NFE_COLUMNS.length} de ${NFE_COLUMNS.length} selecionadas`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByText('Nenhum dado disponível para preview.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Colunas' }));
    fireEvent.click(screen.getByRole('button', { name: /Desmarcar todos/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByText('Selecione ao menos uma coluna para visualizar o preview.')).toBeInTheDocument();
    expect(within(screen.getByText('Exportar Documentos Fiscais').closest('main')!).getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
  });

  it('filtra o perfil padrão por tipo e formata valores no preview', () => {
    mocks.defaultProfile = { id: 'padrao', name: 'Meu padrão', columns: ['chave_nfe', 'emit.CNPJ', 'campo-inválido'], is_default: true };
    mocks.profiles = [mocks.defaultProfile];
    renderDialog();

    expect(screen.getByText(`2 de ${NFE_COLUMNS.length} selecionadas`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByText('NFE-1')).toBeInTheDocument();
    expect(screen.getByText('12.345.678/0001-99')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 25 registros')).toBeInTheDocument();
  });

  it('salva perfil com nome aparado e define padrão depois da criação', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    const saveDialog = screen.getByText('Salvar Perfil').closest('main')!;
    fireEvent.change(within(saveDialog).getByLabelText('Nome do perfil'), { target: { value: '  Fiscal  ' } });
    fireEvent.click(within(saveDialog).getByLabelText('Definir como padrão'));
    fireEvent.click(within(saveDialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ name: 'Fiscal', columns: NFE_COLUMNS.map((column) => column.id) }));
    expect(mocks.setDefault).toHaveBeenCalledWith('novo');
    expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(mocks.setDefault.mock.invocationCallOrder[0]);
  });

  it('preserva endpoint, payload, parser CSV ingênuo, planilha e filename NFe', async () => {
    mocks.fetchWithAuth.mockResolvedValue({ ok: true, text: async () => 'Nome;Valor\n"ACME; LTDA";10' });
    renderDialog();
    const main = screen.getByText('Exportar Documentos Fiscais').closest('main')!;
    fireEvent.click(within(main).getByRole('button', { name: 'Exportar Excel' }));

    await waitFor(() => expect(mocks.fetchWithAuth).toHaveBeenCalledOnce());
    expect(mocks.fetchWithAuth).toHaveBeenCalledWith('http://localhost:8000/api/v1/query/export/contrib-1/nfe/csv', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data_inicio: '2026-01-01', data_fim: '2026-01-31', colunas: NFE_COLUMNS.map((column) => column.id),
        tipo_mov: 'Saida', emitente: '12345000199', destinatario: '98765000100',
      }),
    });
    expect(mocks.jsonToSheet).toHaveBeenCalledWith([{ Nome: 'ACME', Valor: 'LTDA' }]);
    expect(mocks.appendSheet).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'NF-e');
    expect(mocks.writeFile).toHaveBeenCalledWith(expect.anything(), 'nfe_export_2026-01-01_2026-01-31.xlsx');
    expect(mocks.toast).toHaveBeenCalledWith({ title: 'Exportação concluída', description: '1 registro(s) exportados para nfe_export_2026-01-01_2026-01-31.xlsx' });
  });

  it('usa colunas/endpoint/aba/filename CTe e não gera arquivo para CSV vazio', async () => {
    const first = renderDialog({ data: [], cteData: [], tipoDocumento: 'cte' });
    expect(screen.getByText(`${CTE_COLUMNS.length} de ${CTE_COLUMNS.length} selecionadas`)).toBeInTheDocument();
    const main = screen.getByText('Exportar Documentos Fiscais').closest('main')!;
    fireEvent.click(within(main).getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => expect(mocks.fetchWithAuth).toHaveBeenCalledWith('http://localhost:8000/api/v1/query/export/contrib-1/cte/csv', expect.anything()));
    expect(mocks.appendSheet).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'CT-e');
    expect(mocks.writeFile).toHaveBeenCalledWith(expect.anything(), 'cte_export_2026-01-01_2026-01-31.xlsx');
    expect(first.tipoDocumento).toBe('cte');

    cleanup();
    vi.clearAllMocks();
    mocks.fetchWithAuth.mockResolvedValue({ ok: true, text: async () => 'Nome;Valor' });
    renderDialog({ contribuinteId: 'contrib-2' });
    const secondMain = screen.getByText('Exportar Documentos Fiscais').closest('main')!;
    fireEvent.click(within(secondMain).getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ title: 'Nenhum dado', description: 'Não há registros para exportar.', variant: 'destructive' }));
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });
});
