import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.from },
}));

import { useDomainDailySprintProgress } from '@/hooks/useDomainDailySprintProgress';

beforeEach(() => {
  vi.clearAllMocks();
  const result = Promise.resolve({
    data: [{ id: 't1', title: 'Entrega', task_code: 'T-1', status: 'other', parent_id: null, assigned_to: 'u1' }],
    error: null,
  });
  mocks.order.mockReturnValue(result);
  mocks.eq.mockReturnValue({ order: mocks.order });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ select: mocks.select });
});

describe('useDomainDailySprintProgress', () => {
  it('registra a query por sprint e só a habilita quando existe sprint vigente', () => {
    renderHook(() => useDomainDailySprintProgress('sprint-1'));
    expect(mocks.useQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['daily-sprint-progress', 'sprint-1'],
      enabled: true,
    }));

    renderHook(() => useDomainDailySprintProgress(''));
    expect(mocks.useQuery).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('busca entregáveis da sprint, ordena por código e normaliza status desconhecido', async () => {
    renderHook(() => useDomainDailySprintProgress('sprint-1'));
    const options = mocks.useQuery.mock.calls[0][0] as { queryFn: () => Promise<unknown> };

    await expect(options.queryFn()).resolves.toEqual([
      expect.objectContaining({ id: 't1', status: 'pending' }),
    ]);
    expect(mocks.from).toHaveBeenCalledWith('sprint_deliverables');
    expect(mocks.select).toHaveBeenCalledWith('id, title, task_code, status, parent_id, assigned_to');
    expect(mocks.eq).toHaveBeenCalledWith('sprint_id', 'sprint-1');
    expect(mocks.order).toHaveBeenCalledWith('task_code', { ascending: true });
  });
});
