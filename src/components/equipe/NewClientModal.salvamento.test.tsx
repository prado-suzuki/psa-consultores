/**
 * O que este arquivo cobre: a rejeição do salvamento não pode passar calada.
 *
 * `executeSave` devolve promessa, e o pedaço dele que roda antes do `try` interno
 * — validação, verificação de nome duplicado e o diálogo que ela abre — pode
 * rejeitar. Antes, essa rejeição não tinha ninguém para pegá-la: o `finally` do
 * hook soltava a trava e o `saving`, o botão voltava ao normal e a pessoa ficava
 * achando que nada tinha acontecido, sem erro nenhum na tela.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({
  executeSave: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: boundary.toastError, warning: vi.fn(), success: vi.fn() },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, isAdmin: true, isLider: false }),
}));

vi.mock('@/hooks/useDraftPersistence', () => ({
  useDraftPersistence: () => ({ restore: () => null, clear: vi.fn() }),
}));

vi.mock('@/hooks/useSetorCliente', () => ({
  useSetoresCliente: () => ({ data: [] }),
}));

vi.mock('@/hooks/useClientFormOptions', () => ({
  useClientFormOptions: () => ({
    catalogServices: [],
    allClusters: [],
    PRODUTO_SEGMENTO_OPTIONS: [],
    CENTRO_CUSTO_OPTIONS: [],
    produtoSegmentoFullOptions: [],
    lideres: [],
  }),
}));

vi.mock('@/hooks/useClientEditData', () => ({
  useClientEditData: () => ({ loadingEdit: false, originalSnapshot: null }),
}));

vi.mock('@/hooks/useExternalConsults', () => ({
  useExternalConsults: () => ({
    handleCnpjBlur: vi.fn(),
    handleCepBlur: vi.fn(),
    cnpjLoading: false,
    cepLoading: false,
  }),
}));

vi.mock('@/hooks/useSaveClientTransaction', () => ({
  useSaveClientTransaction: () => ({ executeSave: boundary.executeSave, saving: false }),
}));

// Sem pendência de campo obrigatório o clique chega em `executeSave`, que é o
// que este arquivo mede. A trava de obrigatórios tem teste próprio.
vi.mock('@/lib/camposObrigatorios', () => ({
  frasePendencia: () => '',
  mapearPendencias: () => ({
    todas: [],
    abas: new Set(),
    camposPorItem: new Map(),
    secoesPorItem: new Map(),
  }),
  pendenciasCliente: () => [],
  pendenciasContribuinte: () => [],
  pendenciasDocumentosRepetidos: () => [],
  pendenciasOrdemServico: () => [],
  pendenciasRepresentante: () => [],
}));

vi.mock('./client-form/ClienteTab', () => ({ default: () => <div /> }));
vi.mock('./client-form/ContribuintesTab', () => ({ default: () => <div /> }));
vi.mock('./client-form/RepresentantesTab', () => ({ default: () => <div /> }));
vi.mock('./client-form/ContratosTab', () => ({ default: () => <div /> }));
vi.mock('./client-form/FaturamentoTab', () => ({ default: () => <div /> }));
vi.mock('./client-form/PropostaTab', () => ({ default: () => <div /> }));
vi.mock('./client-form/HistoricoTab', () => ({ default: () => <div /> }));

import NewClientModal from './NewClientModal';

function renderModal() {
  return render(
    <NewClientModal open onOpenChange={vi.fn()} area="tax" />,
  );
}

describe('NewClientModal · salvamento que rejeita', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('mostra a recusa na tela quando executeSave rejeita', async () => {
    boundary.executeSave.mockRejectedValue(new Error('rede caiu'));
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Salvar Cliente/ }));

    await waitFor(() => {
      expect(boundary.toastError).toHaveBeenCalledWith(
        'Não foi possível cadastrar o cliente.',
        expect.objectContaining({ description: expect.any(String) }),
      );
    });
  });

  it('não deixa a rejeição virar unhandled rejection', async () => {
    const naoTratada = vi.fn();
    window.addEventListener('unhandledrejection', naoTratada);
    boundary.executeSave.mockRejectedValue(new Error('rede caiu'));
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Salvar Cliente/ }));

    await waitFor(() => expect(boundary.toastError).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    window.removeEventListener('unhandledrejection', naoTratada);
    expect(naoTratada).not.toHaveBeenCalled();
  });

  it('não avisa nada quando o salvamento conclui', async () => {
    boundary.executeSave.mockResolvedValue(undefined);
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Salvar Cliente/ }));

    await new Promise((r) => setTimeout(r, 0));
    expect(boundary.toastError).not.toHaveBeenCalled();
  });
});
