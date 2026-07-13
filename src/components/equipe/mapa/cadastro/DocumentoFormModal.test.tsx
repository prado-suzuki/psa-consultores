// Testa o DocumentoFormModal — mesmo tratamento do Sistema (bug 3.4/3.5 estendido
// a documentos): grava cluster_id do cluster escolhido e checa duplicidade ao vivo.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { mockSupabaseCapture } from '@/test/supabaseCapture';
import { TestProviders } from '@/test/queryWrapper';
import DocumentoFormModal from './DocumentoFormModal';
import type { Documento } from '@/types';

const CLUSTER = { id: 'C-OSG', name: 'PSA OSG', is_active: true };
const DOCUMENTO = {
  id: 'D1', nome: 'Matrícula', cluster_id: 'C-OSG', tipo: 'Cliente', formato: 'PDF',
  origem: 'Cliente', estrutura_entrada: 'desc antiga', estruturado: '', tempo_minutos: 0,
} as unknown as Documento;

describe('DocumentoFormModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('create: grava o cluster_id do cluster selecionado', async () => {
    const cap = mockSupabaseCapture({
      estrutura_clusters: [CLUSTER],
      // doc existente que NÃO colide com o nome que vou digitar (senão o dedup bloqueia)
      documentos_processo: [{ id: 'Dx', nome: 'Outro Documento', cluster_id: 'C-PSA' }],
    });
    render(<TestProviders><DocumentoFormModal aberto documento={null} onClose={() => {}} /></TestProviders>);
    fireEvent.change(screen.getByPlaceholderText(/nome do documento/i), { target: { value: 'Contrato Social' } });
    fireEvent.click(screen.getByText('Selecione o cluster...').closest('button')!);
    fireEvent.mouseDown(await screen.findByText('PSA OSG'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });

    await waitFor(() => expect(cap.called('documentos_processo', 'insert')).toBe(true));
    const p = cap.payloads('documentos_processo', 'insert')[0] as Record<string, unknown>;
    expect(p).toMatchObject({ nome: 'Contrato Social', cluster_id: 'C-OSG' });
  });

  it('dedup: nome já existente no mesmo cluster bloqueia (aviso + salvar desabilitado)', async () => {
    mockSupabaseCapture({
      estrutura_clusters: [CLUSTER],
      documentos_processo: [{ id: 'D0', nome: 'Matrícula', cluster_id: 'C-OSG' }],
    });
    render(<TestProviders><DocumentoFormModal aberto documento={null} onClose={() => {}} /></TestProviders>);
    fireEvent.change(screen.getByPlaceholderText(/nome do documento/i), { target: { value: 'Matrícula' } });
    fireEvent.click(screen.getByText('Selecione o cluster...').closest('button')!);
    fireEvent.mouseDown(await screen.findByText('PSA OSG'));

    expect(await screen.findByText(/já existe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDisabled();
  });

  it('update: envia SÓ o campo alterado (diff), não o objeto inteiro', async () => {
    const cap = mockSupabaseCapture({
      estrutura_clusters: [CLUSTER],
      documentos_processo: [DOCUMENTO as unknown as Record<string, unknown>],
    });
    render(<TestProviders><DocumentoFormModal aberto documento={DOCUMENTO} onClose={() => {}} /></TestProviders>);
    const desc = await screen.findByDisplayValue('desc antiga');
    fireEvent.change(desc, { target: { value: 'nova descrição' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^salvar$/i })); });

    await waitFor(() => expect(cap.called('documentos_processo', 'update')).toBe(true));
    const p = cap.payloads('documentos_processo', 'update')[0] as Record<string, unknown>;
    expect(p).toEqual({ estrutura_entrada: 'nova descrição' });
  });
});
