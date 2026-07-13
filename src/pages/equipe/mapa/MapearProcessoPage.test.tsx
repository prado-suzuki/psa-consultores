// Smoke: MapearProcessoPage — o editor de etapas. Era a MAIOR lacuna de
// cobertura: essa página (onde viveram os bugs 3.3 / name→id / TO-BE) não
// tinha teste nenhum. Cobre os 2 caminhos que não podem quebrar: processo
// carregado (renderiza o editor) e processo inexistente ("não encontrado").

import { render, screen } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import { mockSupabaseCapture } from '@/test/supabaseCapture';
import MapearProcessoPage from './MapearProcessoPage';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

const PROCESSO = {
  id: 'PR1', name: 'Processo Smoke', description: 'desc', project_id: 'P1', cluster_id: 'C-OSG',
  evaluation_status: 'Não avaliado', complexity_level: 'Média', volume_executions: 10,
};

function renderPage(route: string) {
  return render(
    <TestProviders initialRoute={route}>
      <Routes>
        <Route path="/mapear/:id" element={<MapearProcessoPage />} />
      </Routes>
    </TestProviders>,
  );
}

describe('MapearProcessoPage smoke', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza o editor sem crash (processo carregado, sem etapas)', async () => {
    mockSupabaseCapture({ processes: [PROCESSO] });
    renderPage('/mapear/PR1');
    expect(await screen.findByText('Processo Smoke')).toBeInTheDocument();
    expect(screen.getByText(/sem etapas ainda/i)).toBeInTheDocument();
  });

  it('processo inexistente mostra "não encontrado" (não quebra)', async () => {
    mockSupabaseCapture({ processes: [] });
    renderPage('/mapear/NAO_EXISTE');
    expect(await screen.findByText(/processo não encontrado/i)).toBeInTheDocument();
  });
});
