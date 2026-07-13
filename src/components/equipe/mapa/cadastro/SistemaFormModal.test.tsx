// Testa o SistemaFormModal já no padrão-ouro (react-hook-form + zod + update por
// DIFF): create grava cluster_id; UPDATE envia SÓ o campo que mudou (não o objeto
// inteiro); validação por schema; dedup ao vivo.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { TestProviders } from '@/test/queryWrapper';
import SistemaFormModal from './SistemaFormModal';
import type { Sistema } from '@/types';

const CLUSTER = { id: 'C-OSG', name: 'PSA OSG', is_active: true };
const SISTEMA = {
  id: 'S1', nome: 'Docbox', cluster_id: 'C-OSG', descricao: 'antiga',
  origem: 'Interno', custo_variavel_por_uso: 0, custo_licenca_mensal: 0, clustersRateio: [],
} as unknown as Sistema;

describe('SistemaFormModal (padrão-ouro)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('create: grava o cluster_id do cluster selecionado', async () => {
    const cap = mockSupabaseCapture({
      estrutura_clusters: [CLUSTER],
      // linha de retorno do insert que NÃO colide com o nome digitado (senão o dedup bloqueia)
      sistemas_processo: [{ id: 'S9', nome: 'Outro Sistema', cluster_id: 'C-PSA' }],
      sistema_clusters: [],
    });
    render(<TestProviders><SistemaFormModal aberto sistema={null} onClose={() => {}} /></TestProviders>);
    fireEvent.change(screen.getByPlaceholderText(/nome do sistema/i), { target: { value: 'Novo Sistema' } });
    fireEvent.click(screen.getByText('Selecione o cluster...').closest('button')!);
    fireEvent.mouseDown(await screen.findByText('PSA OSG'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });

    await waitFor(() => expect(cap.called('sistemas_processo', 'insert')).toBe(true));
    expect(cap.payloads('sistemas_processo', 'insert')[0]).toMatchObject({ nome: 'Novo Sistema', cluster_id: 'C-OSG' });
  });

  it('update: envia SÓ o campo alterado (diff), não o objeto inteiro', async () => {
    const cap = mockSupabaseCapture({
      estrutura_clusters: [CLUSTER],
      sistemas_processo: [SISTEMA as unknown as Record<string, unknown>],
      sistema_clusters: [],
    });
    render(<TestProviders><SistemaFormModal aberto sistema={SISTEMA} onClose={() => {}} /></TestProviders>);
    // muda só a descrição
    const desc = await screen.findByDisplayValue('antiga');
    fireEvent.change(desc, { target: { value: 'nova descrição' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });

    await waitFor(() => expect(cap.called('sistemas_processo', 'update')).toBe(true));
    const payload = cap.payloads('sistemas_processo', 'update')[0] as Record<string, unknown>;
    expect(payload).toEqual({ descricao: 'nova descrição' }); // só o que mudou
    expect(payload).not.toHaveProperty('nome');
    expect(payload).not.toHaveProperty('cluster_id');
  });

  it('validação (zod): sem nome não grava e mostra o erro', async () => {
    const cap = mockSupabaseCapture({ estrutura_clusters: [CLUSTER], sistemas_processo: [], sistema_clusters: [] });
    render(<TestProviders><SistemaFormModal aberto sistema={null} onClose={() => {}} /></TestProviders>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });
    expect(await screen.findByText(/preencha o nome do sistema/i)).toBeInTheDocument();
    expect(cap.called('sistemas_processo', 'insert')).toBe(false);
  });

  it('dedup: nome existente no mesmo cluster bloqueia (aviso + salvar desabilitado)', async () => {
    mockSupabaseCapture({
      estrutura_clusters: [CLUSTER],
      sistemas_processo: [{ id: 'D0', nome: 'Docbox', cluster_id: 'C-OSG' }],
      sistema_clusters: [],
    });
    render(<TestProviders><SistemaFormModal aberto sistema={null} onClose={() => {}} /></TestProviders>);
    fireEvent.change(screen.getByPlaceholderText(/nome do sistema/i), { target: { value: 'Docbox' } });
    fireEvent.click(screen.getByText('Selecione o cluster...').closest('button')!);
    fireEvent.mouseDown(await screen.findByText('PSA OSG'));
    expect(await screen.findByText(/já existe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDisabled();
  });
});
