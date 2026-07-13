// Testa o ProcessoFormModal — o bug que o Alexandre pegou: processo criado sem
// cluster some da lista. O processo deve HERDAR o cluster_id do projeto escolhido.
// Também cobre a validação (nome/projeto obrigatórios).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { TestProviders } from '@/test/queryWrapper';
import ProcessoFormModal from './ProcessoFormModal';

const PROJ = {
  id: 'P1', name: 'Proj OSG', cluster_id: 'C-OSG',
  estrutura_clusters: { name: 'PSA OSG' },
};
const PROCESSO = {
  id: 'PR1', name: 'Processo Existente', project_id: 'P1', cluster_id: 'C-OSG',
  description: 'desc', volume_executions: 10, evaluation_status: 'Não avaliado', complexity_level: 'Média',
} as unknown as import('@/types').Processo;

function seed() {
  return mockSupabaseCapture({
    projects: [PROJ],
    projeto_justificativas: [],
    processes: [{ id: 'PR1', name: 'Novo Processo', cluster_id: 'C-OSG' }],
  });
}

describe('ProcessoFormModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('create: processo HERDA o cluster_id do projeto selecionado', async () => {
    const cap = seed();
    render(
      <TestProviders>
        <ProcessoFormModal aberto processo={null} onClose={() => {}} />
      </TestProviders>,
    );
    // preenche o nome
    fireEvent.change(screen.getByPlaceholderText(/nome do processo/i), { target: { value: 'Novo Processo' } });
    // abre o Select de projeto (acha o gatilho pelo placeholder) e escolhe o projeto OSG
    const triggerProjeto = screen.getByText('Selecione o projeto...').closest('button')!;
    fireEvent.click(triggerProjeto);
    fireEvent.mouseDown(await screen.findByText('Proj OSG'));
    // salva
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });

    await waitFor(() => expect(cap.called('processes', 'insert')).toBe(true));
    const payload = cap.payloads('processes', 'insert')[0] as Record<string, unknown>;
    expect(payload).toMatchObject({ name: 'Novo Processo', project_id: 'P1', cluster_id: 'C-OSG' });
  });

  it('validação: sem projeto não grava (bloqueia com aviso)', async () => {
    const cap = seed();
    render(
      <TestProviders>
        <ProcessoFormModal aberto processo={null} onClose={() => {}} />
      </TestProviders>,
    );
    fireEvent.change(screen.getByPlaceholderText(/nome do processo/i), { target: { value: 'Só nome' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });

    expect(await screen.findByText(/vincule o processo a um projeto/i)).toBeInTheDocument();
    expect(cap.called('processes', 'insert')).toBe(false);
  });

  it('update: envia SÓ o campo alterado (diff), não o objeto inteiro', async () => {
    const cap = seed();
    render(<TestProviders><ProcessoFormModal aberto processo={PROCESSO} onClose={() => {}} /></TestProviders>);
    const nomeInput = await screen.findByDisplayValue('Processo Existente');
    fireEvent.change(nomeInput, { target: { value: 'Renomeado' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });
    await waitFor(() => expect(cap.called('processes', 'update')).toBe(true));
    expect(cap.payloads('processes', 'update')[0]).toEqual({ name: 'Renomeado' });
  });
});
