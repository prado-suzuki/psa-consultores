import { describe, expect, it } from 'vitest';
import {
  buildCreateRoutinePayload,
  buildDemandItemPayload,
  buildRoutinePayload,
  groupDemandItems,
  patchDemandStatus,
  toggledDemandStatus,
  validateSubdemandDate,
  type EquipeDemanda,
  type EquipeDemandaDraft,
  type EquipeDemandItem,
} from '@/lib/equipeDemandas';

const parentDraft: EquipeDemandaDraft = {
  title: 'Fechamento',
  description: 'Conferir impostos',
  is_recurring: false,
  frequency: 'weekly',
  start_date: '2026-07-01',
  due_date: '2026-07-31',
  assigned_to: 'member-1',
  estimated_hours: '2.5',
};

const parent: EquipeDemanda = {
  id: 'demand-1',
  title: 'Fechamento',
  description: null,
  is_recurring: false,
  frequency: null,
  start_date: '2026-07-01',
  due_date: '2026-07-31',
  status: 'pending',
  assigned_to: null,
  estimated_hours: null,
};

describe('payloads de demandas', () => {
  it('monta exatamente o payload não recorrente e converte horas', () => {
    expect(buildRoutinePayload(parentDraft)).toEqual({
      title: 'Fechamento',
      description: 'Conferir impostos',
      is_recurring: false,
      frequency: null,
      start_date: '2026-07-01',
      due_date: '2026-07-31',
      assigned_to: 'member-1',
      estimated_hours: 2.5,
    });
  });

  it('mantém frequência recorrente, anula datas e anula campos opcionais vazios', () => {
    expect(
      buildRoutinePayload({
        ...parentDraft,
        description: '',
        is_recurring: true,
        frequency: 'monthly',
        assigned_to: '',
        estimated_hours: '',
      }),
    ).toEqual({
      title: 'Fechamento',
      description: null,
      is_recurring: true,
      frequency: 'monthly',
      start_date: null,
      due_date: null,
      assigned_to: null,
      estimated_hours: null,
    });
  });

  it.each([
    ['usuário definido', 'user-1'],
    ['usuário indefinido', undefined],
  ])('adiciona status pending e created_by para %s', (_case, userId) => {
    expect(buildCreateRoutinePayload(parentDraft, userId)).toEqual({
      ...buildRoutinePayload(parentDraft),
      status: 'pending',
      created_by: userId,
    });
  });

  it('monta exatamente o payload filho, incluindo status, vínculo e horas', () => {
    expect(
      buildDemandItemPayload('demand-1', {
        title: 'Transmitir obrigação',
        description: 'Enviar recibo',
        due_date: '2026-07-20',
        assigned_to: 'member-2',
        estimated_hours: '0.75',
      }),
    ).toEqual({
      demand_id: 'demand-1',
      title: 'Transmitir obrigação',
      description: 'Enviar recibo',
      due_date: '2026-07-20',
      assigned_to: 'member-2',
      estimated_hours: 0.75,
      status: 'pending',
    });
  });

  it('anula os opcionais vazios do payload filho', () => {
    expect(
      buildDemandItemPayload('demand-1', {
        title: 'Filha',
        description: '',
        due_date: '2026-07-20',
        assigned_to: '',
        estimated_hours: '',
      }),
    ).toEqual({
      demand_id: 'demand-1',
      title: 'Filha',
      description: null,
      due_date: '2026-07-20',
      assigned_to: null,
      estimated_hours: null,
      status: 'pending',
    });
  });
});

describe('regras locais de demandas', () => {
  it.each([
    ['igual ao início', '2026-07-01'],
    ['igual ao término', '2026-07-31'],
    ['entre os limites', '2026-07-15'],
  ])('aceita data %s', (_case, date) => {
    expect(validateSubdemandDate(date, parent)).toBeNull();
  });

  it('rejeita datas fora dos limites do pai', () => {
    expect(validateSubdemandDate('2026-08-01', parent)).toBe('after-parent-due-date');
    expect(validateSubdemandDate('2026-06-30', parent)).toBe('before-parent-start-date');
  });

  it('ignora limites para pai recorrente ou sem término', () => {
    expect(validateSubdemandDate('2099-01-01', { ...parent, is_recurring: true })).toBeNull();
    expect(validateSubdemandDate('1900-01-01', { ...parent, due_date: null })).toBeNull();
  });

  it('alterna pending para done e qualquer outro status para pending', () => {
    expect(toggledDemandStatus('pending')).toBe('done');
    expect(toggledDemandStatus('done')).toBe('pending');
    expect(toggledDemandStatus('blocked')).toBe('pending');
  });

  it('agrupa filhos por pai preservando ordem e inclui grupos independentes', () => {
    const items = [
      { id: 'i1', demand_id: 'd1', title: 'A' },
      { id: 'i2', demand_id: 'd2', title: 'B' },
      { id: 'i3', demand_id: 'd1', title: 'C' },
    ] as EquipeDemandItem[];
    expect(groupDemandItems(items)).toEqual({ d1: [items[0], items[2]], d2: [items[1]] });
    expect(groupDemandItems([])).toEqual({});
  });

  it('atualiza somente a demanda alvo sem mutar as entradas', () => {
    const other = { ...parent, id: 'demand-2' };
    const result = patchDemandStatus([parent, other], 'demand-1', 'done');
    expect(result).toEqual([{ ...parent, status: 'done' }, other]);
    expect(parent.status).toBe('pending');
    expect(result[1]).toBe(other);
  });
});
