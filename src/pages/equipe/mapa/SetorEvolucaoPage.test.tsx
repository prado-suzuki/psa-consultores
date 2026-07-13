// Smoke: SetorEvolucaoPage — dashboard de evolução do setor. Segunda página
// que não tinha teste nenhum. Renderiza com o portfólio VAZIO (sem processos
// nem snapshots): os KPIs são calculados ao vivo e não podem quebrar (NaN/÷0).

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestProviders } from '@/test/queryWrapper';
import { mockSupabaseCapture } from '@/test/supabaseCapture';
import SetorEvolucaoPage from './SetorEvolucaoPage';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

describe('SetorEvolucaoPage smoke', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza sem crash com portfólio vazio', async () => {
    mockSupabaseCapture({});
    render(
      <TestProviders>
        <SetorEvolucaoPage />
      </TestProviders>,
    );
    expect(await screen.findByText('Evolução do Setor')).toBeInTheDocument();
  });
});
