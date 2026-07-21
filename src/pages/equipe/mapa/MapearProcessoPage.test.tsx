import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import type { Etapa } from '@/types';
import MapearProcessoPage from './MapearProcessoPage';

const mocks = vi.hoisted(() => ({
  lists: {
    processo: null as Record<string, unknown> | null,
    loading: false,
    etapas: [] as Etapa[],
    etapasFuturo: [] as Etapa[],
    documentos: [] as Record<string, unknown>[],
    sistemas: [] as Record<string, unknown>[],
    responsaveis: [] as Record<string, unknown>[],
    gargalos: [] as Record<string, unknown>[],
    melhorias: [] as Record<string, unknown>[],
    projetos: [] as Record<string, unknown>[],
  },
  createEtapa: vi.fn(),
  updateEtapa: vi.fn(),
  deleteEtapa: vi.fn(),
  upsertEtapaToBe: vi.fn(),
  createEtapaToBe: vi.fn(),
  updateEtapaToBe: vi.fn(),
  deleteEtapaToBe: vi.fn(),
  updateGargalo: vi.fn(),
  updateMelhoria: vi.fn(),
  exportSopMd: vi.fn(),
  exportComparativoMd: vi.fn(),
  generateSOP: vi.fn(),
  generateSOPComparativo: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/hooks/useDominioListas', () => ({
  useProcessoUnico: () => ({ data: mocks.lists.processo, isLoading: mocks.lists.loading }),
  useEtapasLista: () => ({ data: mocks.lists.etapas }),
  useEtapasToBeLista: () => ({ data: mocks.lists.etapasFuturo }),
  useDocumentosLista: () => ({ data: mocks.lists.documentos }),
  useSistemasLista: () => ({ data: mocks.lists.sistemas }),
  useResponsaveisLista: () => ({ data: mocks.lists.responsaveis }),
  useGargalosLista: () => ({ data: mocks.lists.gargalos }),
  useMelhoriasLista: () => ({ data: mocks.lists.melhorias }),
  useProjetosLista: () => ({ data: mocks.lists.projetos }),
}));

vi.mock('@/hooks/useEtapas', () => ({
  useCreateEtapa: () => ({ mutateAsync: mocks.createEtapa }),
  useUpdateEtapa: () => ({ mutateAsync: mocks.updateEtapa }),
  useDeleteEtapa: () => ({ mutateAsync: mocks.deleteEtapa }),
  useUpsertEtapaToBe: () => ({ mutateAsync: mocks.upsertEtapaToBe }),
}));
vi.mock('@/hooks/useEtapaToBePorCenario', () => ({
  useCreateEtapaToBe: () => ({ mutateAsync: mocks.createEtapaToBe }),
  useUpdateEtapaToBe: () => ({ mutateAsync: mocks.updateEtapaToBe }),
  useDeleteEtapaToBe: () => ({ mutateAsync: mocks.deleteEtapaToBe }),
}));
vi.mock('@/hooks/useGargalos', () => ({ useUpdateGargalo: () => ({ mutateAsync: mocks.updateGargalo }) }));
vi.mock('@/hooks/useMelhorias', () => ({ useUpdateMelhoria: () => ({ mutateAsync: mocks.updateMelhoria }) }));
vi.mock('@/hooks/useMapaExports', () => ({
  useMapaExports: () => ({ exportSopMd: mocks.exportSopMd, exportComparativoMd: mocks.exportComparativoMd }),
}));
vi.mock('@/utils/pdf/generators', () => ({
  generateSOP: mocks.generateSOP,
  generateSOPComparativo: mocks.generateSOPComparativo,
}));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }));

interface QuickModalProps<T> {
  aberto: boolean;
  onClose: () => void;
  onCreated?: (item: T) => void;
}

vi.mock('@/components/equipe/mapa/cadastro/ProcessoFormModal', () => ({
  default: ({ aberto }: { aberto: boolean }) => aberto ? <div role="dialog">Formulário do processo</div> : null,
}));
vi.mock('@/components/equipe/mapa/cadastro/DocumentoFormModal', () => ({
  default: ({ aberto, onClose, onCreated }: QuickModalProps<{ id: string; nome: string }>) => aberto ? (
    <div role="dialog"><span>Cadastro rápido documento</span><button onClick={() => { onCreated?.({ id: 'DOC-NOVO', nome: 'Documento novo' }); onClose(); }}>Criar documento rápido</button></div>
  ) : null,
}));
vi.mock('@/components/equipe/mapa/cadastro/SistemaFormModal', () => ({
  default: ({ aberto, onClose, onCreated }: QuickModalProps<{ id: string; nome: string }>) => aberto ? (
    <div role="dialog"><span>Cadastro rápido sistema</span><button onClick={() => { onCreated?.({ id: 'SIS-NOVO', nome: 'Sistema novo' }); onClose(); }}>Criar sistema rápido</button></div>
  ) : null,
}));
vi.mock('@/components/equipe/mapa/cadastro/ResponsavelFormModal', () => ({
  default: ({ aberto, onClose, onCreated }: QuickModalProps<{ id: string; name: string }>) => aberto ? (
    <div role="dialog"><span>Cadastro rápido responsável</span><button onClick={() => { onCreated?.({ id: 'RESP-NOVO', name: 'Responsável novo' }); onClose(); }}>Criar responsável rápido</button></div>
  ) : null,
}));
vi.mock('@/components/equipe/mapa/cadastro/GargaloFormModal', () => ({
  default: ({ aberto, onClose, onCreated }: QuickModalProps<{ id: string; processos: string[] }>) => aberto ? (
    <div role="dialog"><span>Cadastro rápido gargalo</span><button onClick={() => { onCreated?.({ id: 'GAR-NOVO', processos: ['OUTRO'] }); onClose(); }}>Criar gargalo rápido</button></div>
  ) : null,
}));
vi.mock('@/components/equipe/mapa/cadastro/MelhoriaFormModal', () => ({
  default: ({ aberto, onClose, onCreated }: QuickModalProps<{ id: string; processos: string[] }>) => aberto ? (
    <div role="dialog"><span>Cadastro rápido melhoria</span><button onClick={() => { onCreated?.({ id: 'MEL-NOVA', processos: ['OUTRO'] }); onClose(); }}>Criar melhoria rápida</button></div>
  ) : null,
}));
vi.mock('@/components/equipe/mapa/DiagramViewer', () => ({
  default: ({ isOpen, title, filename }: { isOpen: boolean; title: string; filename: string }) =>
    isOpen ? <div role="dialog"><span>{title}</span><span>{filename}</span></div> : null,
}));

const PROCESSO = {
  id: 'PR1', name: 'Processo de Compras', description: 'Fluxo principal', project_id: 'P1', cluster_id: 'C1',
  evaluation_status: 'Validado', complexity_level: 'Média', volume_executions: 10,
};

const ETAPA_1: Etapa = {
  id: 'E1', process_id: 'PR1', name: 'Receber pedido', description: 'Recebe a solicitação', execution: 'manual',
  stage_order: 1, docsEntrada: [{ nome: 'Pedido', documentoId: 'D1', volume: 2 }], docsSaida: [],
  executadoPor: [{ nome: 'Analista', responsavelId: 'R1', horas: 3 }], sistemas: ['ERP'],
  volume_per_process: 4, error_rate: 0.05, rework_rate: 0.1, volumeMensal: 0,
};
const ETAPA_2: Etapa = {
  ...ETAPA_1, id: 'E2', name: 'Aprovar pedido', description: 'Aprova', stage_order: 2,
  docsEntrada: [], executadoPor: [], sistemas: [], error_rate: 0, rework_rate: 0,
};

function renderPage(route = '/mapear/PR1') {
  return render(
    <TestProviders initialRoute={route}>
      <Routes>
        <Route path="/mapear/:id" element={<MapearProcessoPage />} />
        <Route path="/equipe/digital/mapa/processos" element={<div>Listagem de processos</div>} />
      </Routes>
    </TestProviders>,
  );
}

async function openEditor(mode: 'era' | 'ficou' = 'era') {
  const user = userEvent.setup();
  if (mode === 'ficou') {
    const tab = screen.getByRole('tab', { name: 'Como ficou' });
    await user.click(tab);
    await waitFor(() => expect(tab).toHaveAttribute('aria-selected', 'true'));
    await screen.findByText('O cenário projetado depois das melhorias.');
  }
  const subtitle = screen.getByText(mode === 'ficou'
    ? 'O cenário projetado depois das melhorias.'
    : 'O retrato atual do processo, etapa por etapa.');
  const content = subtitle.closest('.mapear-tab-content');
  if (!(content instanceof HTMLElement)) throw new Error('Conteúdo da tab não renderizado');
  await user.click(within(content).getByRole('button', { name: 'Editar etapas' }));
  await screen.findByRole('heading', { name: mode === 'ficou' ? 'Editar Etapas — Como Ficou' : 'Editar Etapas — Como Era' });
  return user;
}

describe('MapearProcessoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.lists.processo = { ...PROCESSO };
    mocks.lists.loading = false;
    mocks.lists.etapas = [];
    mocks.lists.etapasFuturo = [];
    mocks.lists.documentos = [{ id: 'D1', nome: 'Pedido' }];
    mocks.lists.sistemas = [{ id: 'S1', nome: 'ERP', cluster_id: 'C1' }];
    mocks.lists.responsaveis = [{ id: 'R1', name: 'Analista' }];
    mocks.lists.gargalos = [];
    mocks.lists.melhorias = [];
    mocks.lists.projetos = [{ id: 'P1', cluster_id: 'C1' }];
    mocks.createEtapa.mockResolvedValue({});
    mocks.updateEtapa.mockResolvedValue({});
    mocks.deleteEtapa.mockResolvedValue(undefined);
    mocks.upsertEtapaToBe.mockResolvedValue({});
    mocks.createEtapaToBe.mockResolvedValue({});
    mocks.updateEtapaToBe.mockResolvedValue(undefined);
    mocks.deleteEtapaToBe.mockResolvedValue(undefined);
    mocks.updateGargalo.mockResolvedValue({});
    mocks.updateMelhoria.mockResolvedValue({});
    mocks.generateSOP.mockResolvedValue(undefined);
    mocks.generateSOPComparativo.mockResolvedValue(undefined);
  });

  it('mostra loading e o estado de processo inexistente com navegação de retorno', async () => {
    mocks.lists.loading = true;
    const view = renderPage();
    expect(view.container.querySelector('.spinner')).toBeInTheDocument();

    view.unmount();
    mocks.lists.loading = false;
    mocks.lists.processo = null;
    renderPage('/mapear/INEXISTENTE');
    expect(screen.getByRole('heading', { name: 'Processo não encontrado' })).toBeInTheDocument();
    expect(screen.getByText('O processo solicitado não existe ou foi removido.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Voltar aos processos' }));
    expect(screen.getByText('Listagem de processos')).toBeInTheDocument();
  });

  it('preserva cabeçalho, estados vazios, tabs e navegação pública', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Processo de Compras' })).toBeInTheDocument();
    expect(screen.getByText('Fluxo principal')).toBeInTheDocument();
    expect(screen.getByText('Validado')).toBeInTheDocument();
    expect(screen.getByText('Sem etapas ainda')).toBeInTheDocument();
    expect(screen.getByText('Comece a mapear')).toBeInTheDocument();
    expect(screen.getByText(/Adicione a primeira e descreva/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Como ficou' }));
    expect(await screen.findByText('Nada para projetar ainda')).toBeInTheDocument();
    expect(screen.getByText(/Mapeie o 'Como era' primeiro/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Processos' }));
    expect(screen.getByText('Listagem de processos')).toBeInTheDocument();
  });

  it('mantém Gargalos e Melhorias antes das tabs e as tabs imediatamente antes do painel de cenários', () => {
    const view = renderPage();
    const gargalosMelhorias = view.container.querySelector('.mapear-gm-processo');
    const tablist = screen.getByRole('tablist');
    const painelCenarios = view.container.querySelector('.mapear-painel');

    expect(gargalosMelhorias).toBeInstanceOf(HTMLElement);
    expect(painelCenarios).toBeInstanceOf(HTMLElement);
    expect(gargalosMelhorias?.nextElementSibling).toBe(tablist);
    expect(tablist.nextElementSibling).toBe(painelCenarios);
  });

  it('renderiza cards AS-IS e o fallback TO-BE com textos e métricas públicas', async () => {
    mocks.lists.etapas = [{ ...ETAPA_1 }];
    renderPage();
    expect(screen.getByText('1 etapa mapeada')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Receber pedido' })).toBeInTheDocument();
    expect(screen.getByText('Recebe a solicitação')).toBeInTheDocument();
    expect(screen.getByText('Pedido')).toBeInTheDocument();
    expect(screen.getByText('Analista')).toBeInTheDocument();
    expect(screen.getByText('Erros').parentElement).toHaveTextContent(/^Erros5(?:[,.]0+)?%$/);

    await userEvent.click(screen.getByRole('tab', { name: 'Como ficou' }));
    expect(await screen.findByText('O cenário projetado depois das melhorias.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Receber pedido' })).toBeInTheDocument();
    expect(screen.getByText('Retrabalho').parentElement).toHaveTextContent(/^Retrabalho10(?:[,.]0+)?%$/);
  });

  it('abre edição de processo e o modal vazio orienta AS-IS sem permitir iniciar TO-BE', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Editar processo' }));
    expect(screen.getByText('Formulário do processo')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mapear primeira etapa' }));
    expect(screen.getByRole('heading', { name: 'Editar Etapas — Como Era' })).toBeInTheDocument();
    expect(screen.getByText('Nenhuma etapa ainda')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar primeira etapa' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sair do modal' }));

    await userEvent.click(screen.getByRole('tab', { name: 'Como ficou' }));
    expect(await screen.findByText('Nada para projetar ainda')).toBeInTheDocument();
    const toBeContent = screen.getByText('O cenário projetado depois das melhorias.').closest('.mapear-tab-content');
    if (!(toBeContent instanceof HTMLElement)) throw new Error('Conteúdo TO-BE não renderizado');
    await userEvent.click(within(toBeContent).getAllByRole('button', { name: 'Editar etapas' })[0]);
    expect(await screen.findByText(/Mapeie o "Como era" primeiro para depois projetar/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar primeira etapa' })).not.toBeInTheDocument();
  });

  it('não executa mutation ao abrir e salvar AS-IS ou TO-BE sem alteração', async () => {
    mocks.lists.etapas = [{ ...ETAPA_1 }];
    renderPage();
    let user = await openEditor('era');
    await user.click(screen.getByRole('button', { name: 'Salvar todas' }));
    expect(mocks.updateEtapa).not.toHaveBeenCalled();
    expect(mocks.createEtapa).not.toHaveBeenCalled();

    user = await openEditor('ficou');
    await user.click(screen.getByRole('button', { name: 'Salvar todas' }));
    expect(mocks.upsertEtapaToBe).not.toHaveBeenCalled();
  });

  it('mantém drag-and-drop apenas no AS-IS e persiste a nova ordem sequencialmente', async () => {
    mocks.lists.etapas = [{ ...ETAPA_1 }, { ...ETAPA_2 }];
    renderPage();
    const user = await openEditor('era');
    const sidebar = screen.getByRole('complementary', { name: 'Lista de etapas do processo' });
    const itens = within(sidebar).getAllByRole('button');
    expect(itens[0]).toHaveAttribute('draggable', 'true');
    fireEvent.dragStart(itens[1]);
    fireEvent.dragOver(itens[0]);
    fireEvent.drop(itens[0]);
    expect(within(sidebar).getAllByRole('button')[0]).toHaveTextContent('Aprovar pedido');
    await user.click(screen.getByRole('button', { name: 'Salvar todas' }));

    expect(mocks.updateEtapa).toHaveBeenCalledTimes(2);
    expect(mocks.updateEtapa.mock.calls[0][0]).toMatchObject({ id: 'E2', patch: { stage_order: 1 } });
    expect(mocks.updateEtapa.mock.calls[1][0]).toMatchObject({ id: 'E1', patch: { stage_order: 2 } });

    await openEditor('ficou');
    const toBeItens = within(screen.getByRole('complementary', { name: 'Lista de etapas do processo' })).getAllByRole('button');
    expect(toBeItens[0]).toHaveAttribute('draggable', 'false');
    expect(screen.queryByRole('button', { name: 'Adicionar etapa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir esta etapa' })).not.toBeInTheDocument();
  });

  it('congela ordem, interrupção e sucesso parcial quando a segunda mutation falha', async () => {
    mocks.lists.etapas = [{ ...ETAPA_1 }, { ...ETAPA_2 }];
    mocks.updateEtapa.mockResolvedValueOnce({ id: 'E1' }).mockRejectedValueOnce(new Error('banco indisponível'));
    renderPage();
    const user = await openEditor();
    const nome = screen.getByDisplayValue('Receber pedido');
    await user.clear(nome);
    await user.type(nome, 'Receber alterado');
    const sidebar = screen.getByRole('complementary', { name: 'Lista de etapas do processo' });
    await user.click(within(sidebar).getByText('Aprovar pedido'));
    const nome2 = screen.getByDisplayValue('Aprovar pedido');
    await user.clear(nome2);
    await user.type(nome2, 'Aprovar alterado');
    await user.click(screen.getByRole('button', { name: 'Salvar todas' }));

    await waitFor(() => expect(mocks.updateEtapa).toHaveBeenCalledTimes(2));
    expect(mocks.updateEtapa.mock.calls.map(call => call[0].id)).toEqual(['E1', 'E2']);
    expect(mocks.toastError).toHaveBeenCalledWith('Erro ao salvar etapas', {
      description: 'Etapa 2 ("Aprovar alterado"): banco indisponível',
    });
    expect(screen.getByRole('heading', { name: 'Editar Etapas — Como Era' })).toBeInTheDocument();
  });

  it('cria e remove etapas na ordem: upserts primeiro e deletes existentes depois', async () => {
    mocks.lists.etapas = [{ ...ETAPA_1 }, { ...ETAPA_2 }];
    const operations: string[] = [];
    mocks.updateEtapa.mockImplementation(async ({ id }: { id: string }) => { operations.push(`update:${id}`); });
    mocks.createEtapa.mockImplementation(async () => { operations.push('create'); });
    mocks.deleteEtapa.mockImplementation(async ({ id }: { id: string }) => { operations.push(`delete:${id}`); });
    renderPage();
    const user = await openEditor();
    const sidebar = screen.getByRole('complementary', { name: 'Lista de etapas do processo' });
    await user.click(within(sidebar).getByText('Aprovar pedido'));
    await user.click(screen.getByRole('button', { name: 'Excluir esta etapa' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar etapa' }));
    const novoNome = screen.getAllByDisplayValue('')[0];
    await user.type(novoNome, 'Conferir pedido');
    await user.click(screen.getByRole('button', { name: 'Salvar todas' }));

    await waitFor(() => expect(mocks.deleteEtapa).toHaveBeenCalledTimes(1));
    expect(operations).toEqual(['create', 'delete:E2']);
    expect(mocks.createEtapa.mock.calls[0][0]).toMatchObject({ process_id: 'PR1', name: 'Conferir pedido', stage_order: 2 });
    expect(mocks.createEtapa.mock.calls[0][0]).not.toHaveProperty('id');
  });

  it('preserva update, create e delete sequenciais nas etapas TO-BE independentes', async () => {
    mocks.lists.etapas = [{ ...ETAPA_1 }];
    mocks.lists.etapasFuturo = [
      { ...ETAPA_1, id: 'T1', name: 'Receber no futuro' },
      { ...ETAPA_2, id: 'T2', name: 'Aprovar no futuro' },
    ];
    const operations: string[] = [];
    mocks.updateEtapaToBe.mockImplementation(async ({ etapa }: { etapa: Etapa }) => { operations.push(`update:${etapa.id}`); });
    mocks.createEtapaToBe.mockImplementation(async () => { operations.push('create'); });
    mocks.deleteEtapaToBe.mockImplementation(async ({ id }: { id: string }) => { operations.push(`delete:${id}`); });
    renderPage();
    const user = await openEditor('ficou');

    const nome = screen.getByDisplayValue('Receber no futuro');
    await user.clear(nome);
    await user.type(nome, 'Receber otimizado');
    const sidebar = screen.getByRole('complementary', { name: 'Lista de etapas do processo' });
    await user.click(within(sidebar).getByText('Aprovar no futuro'));
    await user.click(screen.getByRole('button', { name: 'Excluir esta etapa' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar etapa' }));
    await user.type(screen.getAllByDisplayValue('')[0], 'Conferir no futuro');
    await user.click(screen.getByRole('button', { name: 'Salvar todas' }));

    await waitFor(() => expect(mocks.deleteEtapaToBe).toHaveBeenCalledTimes(1));
    expect(operations).toEqual(['update:T1', 'create', 'delete:T2']);
    expect(mocks.createEtapaToBe).toHaveBeenCalledWith(expect.objectContaining({
      process_id: 'PR1',
      etapa: expect.objectContaining({ name: 'Conferir no futuro', stage_order: 2 }),
    }));
    expect(mocks.upsertEtapaToBe).not.toHaveBeenCalled();
  });

  it('valida nome obrigatório, foca a etapa inválida e não inicia persistência', async () => {
    mocks.lists.etapas = [{ ...ETAPA_1 }];
    renderPage();
    const user = await openEditor();
    await user.click(screen.getByRole('button', { name: 'Adicionar etapa' }));
    await user.click(screen.getByRole('button', { name: 'Salvar todas' }));
    expect(mocks.toastError).toHaveBeenCalledWith('A etapa 2 está sem nome', {
      description: 'Toda etapa precisa de um nome antes de salvar.',
    });
    expect(mocks.createEtapa).not.toHaveBeenCalled();
    expect(screen.getByText('Nova etapa').closest('li')).toHaveClass('active');
  });

  it('salva draft somente após edição, na chave por processo/cenário, recupera e limpa ao salvar', async () => {
    mocks.lists.etapas = [{ ...ETAPA_1 }];
    renderPage();
    const user = await openEditor();
    expect(localStorage.getItem('mapa.etapasDraft.PR1.era')).toBeNull();
    const nome = screen.getByDisplayValue('Receber pedido');
    await user.clear(nome);
    await user.type(nome, 'Pedido em rascunho');
    await waitFor(() => expect(localStorage.getItem('mapa.etapasDraft.PR1.era')).toContain('Pedido em rascunho'));

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Sair sem salvar?');
    await user.click(screen.getByRole('button', { name: 'Sair sem salvar' }));
    await openEditor();
    expect(screen.getByText('Rascunho recuperado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar rascunho' }));
    expect(screen.getByDisplayValue('Pedido em rascunho')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar todas' }));
    await waitFor(() => expect(localStorage.getItem('mapa.etapasDraft.PR1.era')).toBeNull());

    const toBeUser = await openEditor('ficou');
    const descricao = screen.getByDisplayValue('Recebe a solicitação');
    await toBeUser.type(descricao, ' projetada');
    await waitFor(() => expect(localStorage.getItem('mapa.etapasDraft.PR1.ficou')).toContain('projetada'));
  });

  it('descarta draft explicitamente sem alterar o estado carregado do banco', async () => {
    mocks.lists.etapas = [{ ...ETAPA_1 }];
    localStorage.setItem('mapa.etapasDraft.PR1.era', JSON.stringify({
      mode: 'era', list: [{ ...ETAPA_1, name: 'Nome antigo do draft' }], removed: [], activeIndex: 0, ts: 1,
    }));
    renderPage();
    const user = await openEditor();
    expect(screen.getByDisplayValue('Receber pedido')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(localStorage.getItem('mapa.etapasDraft.PR1.era')).toBeNull();
    expect(screen.queryByText('Rascunho recuperado')).not.toBeInTheDocument();
  });

  it('expõe exportações PDF/Markdown e diagramas conforme os cenários disponíveis', async () => {
    mocks.lists.etapas = [{ ...ETAPA_1 }];
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'SOP (antes)' }));
    await user.click(screen.getByRole('button', { name: 'SOP (como ficou)' }));
    await user.click(screen.getByRole('button', { name: 'SOP (comparativo)' }));
    await user.click(screen.getByRole('button', { name: 'SOP MD (antes)' }));
    await user.click(screen.getByRole('button', { name: 'SOP MD (como ficou)' }));
    await user.click(screen.getByRole('button', { name: 'SOP MD (comparativo)' }));
    expect(mocks.generateSOP.mock.calls.map(call => call[7])).toEqual(['era', 'ficou']);
    expect(mocks.generateSOPComparativo).toHaveBeenCalledTimes(1);
    expect(mocks.exportSopMd.mock.calls).toEqual([['PR1', 'era'], ['PR1', 'ficou']]);
    expect(mocks.exportComparativoMd).toHaveBeenCalledWith('PR1');
    expect(screen.queryByRole('button', { name: 'Diagrama (como ficou)' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Diagrama (antes)' }));
    expect(screen.getByText('Diagrama · Como Era: Processo de Compras')).toBeInTheDocument();

    mocks.lists.etapas = [{ ...ETAPA_1, ficou: { ...ETAPA_1, description: 'Projetado' } }];
    renderPage();
    await user.click(screen.getAllByRole('button', { name: 'Diagrama (como ficou)' })[0]);
    expect(screen.getByText('Diagrama · Como Ficou: Processo de Compras')).toBeInTheDocument();
  });

  it('integra cadastros rápidos do formulário e já inclui os novos vínculos no payload', async () => {
    mocks.lists.etapas = [{ ...ETAPA_1 }];
    mocks.lists.documentos.push({ id: 'DOC-NOVO', nome: 'Documento novo' });
    mocks.lists.sistemas.push({ id: 'SIS-NOVO', nome: 'Sistema novo', cluster_id: 'C1' });
    mocks.lists.responsaveis.push({ id: 'RESP-NOVO', name: 'Responsável novo' });
    renderPage();
    const user = await openEditor();

    const novoDoc = screen.getAllByRole('button', { name: /Cadastrar novo documento/ })[0];
    await user.click(novoDoc);
    await user.click(screen.getByRole('button', { name: 'Criar documento rápido' }));
    await user.click(screen.getByRole('button', { name: /Cadastrar novo sistema/ }));
    await user.click(screen.getByRole('button', { name: 'Criar sistema rápido' }));
    await user.click(screen.getByRole('button', { name: /Cadastrar novo responsável/ }));
    await user.click(screen.getByRole('button', { name: 'Criar responsável rápido' }));
    await user.click(screen.getByRole('button', { name: 'Salvar todas' }));

    await waitFor(() => expect(mocks.updateEtapa).toHaveBeenCalledTimes(1));
    const patch = mocks.updateEtapa.mock.calls[0][0].patch as Etapa;
    expect(patch.docsEntrada).toEqual(expect.arrayContaining([{ nome: 'Documento novo', documentoId: 'DOC-NOVO', volume: 0 }]));
    expect(patch.sistemas).toContain('SIS-NOVO');
    expect(patch.executadoPor).toEqual(expect.arrayContaining([{ nome: 'Responsável novo', responsavelId: 'RESP-NOVO', horas: 0 }]));
  });

  it('vincula cadastros rápidos de gargalo e melhoria ao processo atual', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '+ Adicionar gargalo' }));
    await user.click(screen.getByRole('button', { name: 'Cadastrar novo gargalo' }));
    await user.click(screen.getByRole('button', { name: 'Criar gargalo rápido' }));
    expect(mocks.updateGargalo).toHaveBeenCalledWith({
      id: 'GAR-NOVO', old: { id: 'GAR-NOVO', processos: ['OUTRO'] }, patch: { processos: ['OUTRO', 'PR1'] },
    });

    await user.click(screen.getByRole('button', { name: '+ Adicionar melhoria' }));
    await user.click(screen.getByRole('button', { name: 'Cadastrar nova melhoria' }));
    await user.click(screen.getByRole('button', { name: 'Criar melhoria rápida' }));
    expect(mocks.updateMelhoria).toHaveBeenCalledWith({
      id: 'MEL-NOVA', old: { id: 'MEL-NOVA', processos: ['OUTRO'] }, patch: { processos: ['OUTRO', 'PR1'] },
    });
  });
});
