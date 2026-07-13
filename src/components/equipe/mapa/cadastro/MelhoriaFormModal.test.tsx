// Caracterização do MelhoriaFormModal — fixa invariantes que devem sobreviver ao
// refactor (RHF/zod/diff): descrição alterada persiste; validação bloqueia sem
// nome; e o nome do responsável é resolvido na carga (não fica em branco).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { TestProviders } from '@/test/queryWrapper';
import MelhoriaFormModal from './MelhoriaFormModal';
import type { Melhoria } from '@/types';

const M = {
  id: 'M1', improvement_description: 'antiga', improvement_status: 'Não iniciado', cluster_id: 'C-OSG',
  sistemas: ['S1'], executadoPor: [{ responsavelId: 'R1', nome: '', horas: 2 }], treinamentoPor: [],
  acoesTd: [], one_time_external_cost: 0, training_hours: 2,
} as unknown as Melhoria;

function seed() {
  return mockSupabaseCapture({
    estrutura_clusters: [{ id: 'C-OSG', name: 'PSA OSG', is_active: true }],
    job_roles: [{ id: 'R1', name: 'Estagiário' }],
    sistemas_processo: [{ id: 'S1', nome: 'CAR' }],
    process_improvements: [M as unknown as Record<string, unknown>],
    melhoria_responsaveis: [], melhoria_sistemas: [], melhoria_processos: [], melhoria_acoes_td: [],
  });
}

describe('MelhoriaFormModal (caracterização)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('update: a descrição alterada é persistida', async () => {
    const cap = seed();
    render(<TestProviders><MelhoriaFormModal aberto melhoria={M} onClose={() => {}} /></TestProviders>);
    const nomeInput = await screen.findByDisplayValue('antiga');
    fireEvent.change(nomeInput, { target: { value: 'nova descrição' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });
    await waitFor(() => expect(cap.called('process_improvements', 'update')).toBe(true));
    expect(cap.payloads('process_improvements', 'update')[0]).toMatchObject({ improvement_description: 'nova descrição' });
  });

  it('validação: sem nome mostra erro e não grava', async () => {
    const cap = seed();
    render(<TestProviders><MelhoriaFormModal aberto melhoria={null} onClose={() => {}} /></TestProviders>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });
    expect(await screen.findByText(/preencha o nome da melhoria/i)).toBeInTheDocument();
    expect(cap.called('process_improvements', 'insert')).toBe(false);
  });

  it('carga: resolve o nome do responsável (não fica em branco)', async () => {
    seed();
    render(<TestProviders><MelhoriaFormModal aberto melhoria={M} onClose={() => {}} /></TestProviders>);
    expect(await screen.findByText('Estagiário')).toBeInTheDocument();
  });

  it('update: envia só a coluna alterada (diff) e não re-sincroniza vínculo intocado', async () => {
    const cap = seed();
    render(<TestProviders><MelhoriaFormModal aberto melhoria={M} onClose={() => {}} /></TestProviders>);
    const nomeInput = await screen.findByDisplayValue('antiga');
    fireEvent.change(nomeInput, { target: { value: 'nova' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });
    await waitFor(() => expect(cap.called('process_improvements', 'update')).toBe(true));
    expect(cap.payloads('process_improvements', 'update')[0]).toEqual({ improvement_description: 'nova' });
    // vínculos não foram tocados → não re-sincroniza responsáveis
    expect(cap.called('melhoria_responsaveis', 'insert')).toBe(false);
  });
});
