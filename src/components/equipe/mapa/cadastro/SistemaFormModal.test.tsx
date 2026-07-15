// Testa o SistemaFormModal SEM o campo "Cluster" (a participação/cluster vem do
// rateio): create deriva cluster_id do rateio (cluster com maior %); UPDATE por
// DIFF (cluster_id só entra se mudou); validação por schema; dedup ao vivo.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { TestProviders } from '@/test/queryWrapper';
import SistemaFormModal from './SistemaFormModal';
import type { Sistema } from '@/types';

const CLUSTER = { id: 'C-OSG', name: 'PSA OSG', is_active: true };
const CLUSTER2 = { id: 'C-PSA', name: 'PSA Consultores', is_active: true };
const SISTEMA = {
  id: 'S1', nome: 'Docbox', cluster_id: 'C-OSG', descricao: 'antiga',
  origem: 'Interno', custo_variavel_por_uso: 0, custo_licenca_mensal: 0,
  clustersRateio: [{ cluster: 'PSA OSG', rateio: 100 }],
} as unknown as Sistema;

describe('SistemaFormModal (participação via rateio)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('create: cluster_id é DERIVADO do rateio (cluster com maior %)', async () => {
    const cap = mockSupabaseCapture({
      estrutura_clusters: [CLUSTER],
      sistemas_processo: [{ id: 'S9', nome: 'Outro Sistema', cluster_id: 'C-PSA' }],
      sistema_clusters: [],
    });
    render(<TestProviders><SistemaFormModal aberto sistema={null} onClose={() => {}} /></TestProviders>);
    fireEvent.change(screen.getByPlaceholderText(/nome do sistema/i), { target: { value: 'Novo Sistema' } });
    // participação: 100% no PSA OSG (via slider) → deriva cluster_id C-OSG
    fireEvent.change(await screen.findByLabelText('Rateio de PSA OSG'), { target: { value: '100' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });

    await waitFor(() => expect(cap.called('sistemas_processo', 'insert')).toBe(true));
    expect(cap.payloads('sistemas_processo', 'insert')[0]).toMatchObject({ nome: 'Novo Sistema', cluster_id: 'C-OSG' });
    expect(cap.called('sistema_clusters', 'insert')).toBe(true); // rateio persistido
  });

  it('update: envia SÓ o campo alterado (cluster_id igual → fora do diff)', async () => {
    const cap = mockSupabaseCapture({
      estrutura_clusters: [CLUSTER],
      sistemas_processo: [SISTEMA as unknown as Record<string, unknown>],
      sistema_clusters: [],
    });
    render(<TestProviders><SistemaFormModal aberto sistema={SISTEMA} onClose={() => {}} /></TestProviders>);
    const desc = await screen.findByDisplayValue('antiga');
    fireEvent.change(desc, { target: { value: 'nova descrição' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });

    await waitFor(() => expect(cap.called('sistemas_processo', 'update')).toBe(true));
    const payload = cap.payloads('sistemas_processo', 'update')[0] as Record<string, unknown>;
    expect(payload).toEqual({ descricao: 'nova descrição' }); // cluster_id não mudou → não entra
    expect(payload).not.toHaveProperty('cluster_id');
  });

  it('validação (zod): sem nome não grava e mostra o erro', async () => {
    const cap = mockSupabaseCapture({ estrutura_clusters: [CLUSTER], sistemas_processo: [], sistema_clusters: [] });
    render(<TestProviders><SistemaFormModal aberto sistema={null} onClose={() => {}} /></TestProviders>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });
    expect(await screen.findByText(/preencha o nome do sistema/i)).toBeInTheDocument();
    expect(cap.called('sistemas_processo', 'insert')).toBe(false);
  });

  it('dedup: nome existente participando do mesmo cluster bloqueia (aviso + salvar off)', async () => {
    mockSupabaseCapture({
      estrutura_clusters: [CLUSTER],
      sistemas_processo: [{ id: 'D0', nome: 'Docbox', cluster_id: 'C-OSG' }],
      sistema_clusters: [],
    });
    render(<TestProviders><SistemaFormModal aberto sistema={null} onClose={() => {}} /></TestProviders>);
    fireEvent.change(screen.getByPlaceholderText(/nome do sistema/i), { target: { value: 'Docbox' } });
    fireEvent.change(await screen.findByLabelText('Rateio de PSA OSG'), { target: { value: '100' } });
    expect(await screen.findByText(/já existe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDisabled();
  });

  it('trava: soma ≠ 100% desabilita o Salvar', async () => {
    mockSupabaseCapture({ estrutura_clusters: [CLUSTER], sistemas_processo: [], sistema_clusters: [] });
    render(<TestProviders><SistemaFormModal aberto sistema={null} onClose={() => {}} /></TestProviders>);
    fireEvent.change(screen.getByPlaceholderText(/nome do sistema/i), { target: { value: 'X' } });
    fireEvent.change(await screen.findByLabelText('Rateio de PSA OSG'), { target: { value: '50' } });
    expect(screen.getByText(/Total: 50%/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDisabled();
  });

  it('cap: a soma não passa de 100% (o slider trava no que sobra)', async () => {
    mockSupabaseCapture({ estrutura_clusters: [CLUSTER, CLUSTER2], sistemas_processo: [], sistema_clusters: [] });
    render(<TestProviders><SistemaFormModal aberto sistema={null} onClose={() => {}} /></TestProviders>);
    fireEvent.change(await screen.findByLabelText('Rateio de PSA OSG'), { target: { value: '70' } });
    // pede 50 no 2º, mas só sobram 30 → capa em 30, total fica 100
    fireEvent.change(screen.getByLabelText('Rateio de PSA Consultores'), { target: { value: '50' } });
    expect(screen.getByText(/Total: 100%/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^salvar$/i })).not.toBeDisabled();
  });
});
