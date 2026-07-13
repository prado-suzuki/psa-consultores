// Testa o coração do "Salvar todas só grava o que mudou" (bug 3.3 / TO-BE):
// etapa intocada → false (não re-grava); qualquer mudança real → true.

import { describe, it, expect } from 'vitest';
import { etapaMudou } from './etapaMudou';
import type { Etapa } from '@/types';

const base = (): Etapa => ({
  id: 'E1', process_id: 'P1', name: 'Etapa A', description: 'd', execution: 'manual',
  stage_order: 1, volume_per_process: 10, error_rate: 0.1, rework_rate: 0.2,
  docsEntrada: [{ documentoId: 'D1', nome: 'Doc', volume: 1 }],
  docsSaida: [],
  executadoPor: [{ responsavelId: 'R1', nome: 'F', horas: 2 }],
  sistemas: ['S1'],
} as unknown as Etapa);

describe('etapaMudou', () => {
  it('sem original → mudou (etapa nova)', () => {
    expect(etapaMudou(undefined, base())).toBe(true);
  });
  it('idêntico → NÃO mudou (não re-grava a etapa intocada)', () => {
    expect(etapaMudou(base(), base())).toBe(false);
  });
  it('mudou o nome → mudou', () => {
    expect(etapaMudou(base(), { ...base(), name: 'Outro' })).toBe(true);
  });
  it('mudou horas de um executor → mudou', () => {
    const b = base(); b.executadoPor = [{ responsavelId: 'R1', nome: 'F', horas: 3 }];
    expect(etapaMudou(base(), b)).toBe(true);
  });
  it('mudou a lista de sistemas → mudou', () => {
    const b = base(); b.sistemas = ['S1', 'S2'];
    expect(etapaMudou(base(), b)).toBe(true);
  });
  it('campo não-editável no modal (error_cost) NÃO conta como mudança', () => {
    const a = { ...base(), error_cost: 5 } as Etapa;
    const b = { ...base(), error_cost: 999 } as Etapa;
    expect(etapaMudou(a, b)).toBe(false);
  });
});
