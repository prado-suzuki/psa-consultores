import { describe, expect, it } from 'vitest';

import { horasApontadas, precisaApontarHoras, temHorasApontadas } from '@/lib/orgTaskHours';

describe('horasApontadas', () => {
  it('aceita número e string, com ponto ou vírgula', () => {
    expect(horasApontadas(3)).toBe(3);
    expect(horasApontadas('3.5')).toBe(3.5);
    expect(horasApontadas('3,5')).toBe(3.5);
  });

  it('trata vazio, nulo, zero e lixo como não apontado', () => {
    expect(horasApontadas('')).toBeNull();
    expect(horasApontadas(null)).toBeNull();
    expect(horasApontadas(undefined)).toBeNull();
    // Zero é o valor que o formulário grava quando o campo fica vazio.
    expect(horasApontadas(0)).toBeNull();
    expect(horasApontadas(-2)).toBeNull();
    expect(horasApontadas('abc')).toBeNull();
  });
});

describe('temHorasApontadas', () => {
  it('só é verdadeiro para hora positiva', () => {
    expect(temHorasApontadas(0.5)).toBe(true);
    expect(temHorasApontadas(0)).toBe(false);
    expect(temHorasApontadas(null)).toBe(false);
  });
});

describe('precisaApontarHoras', () => {
  it('pede hora para tarefa em aberto sem apontamento', () => {
    expect(precisaApontarHoras({ status: 'in_progress', actual_hours: null })).toBe(true);
    expect(precisaApontarHoras({ status: 'todo', actual_hours: 0 })).toBe(true);
  });

  it('não pede quando a hora já está lá — o atalho conclui direto', () => {
    expect(precisaApontarHoras({ status: 'in_progress', actual_hours: 4 })).toBe(false);
  });

  it('não pede para tarefa já concluída', () => {
    // Mudar o status de uma tarefa concluída não é concluir de novo; as 190
    // concluídas sem hora do histórico seguem editáveis.
    expect(precisaApontarHoras({ status: 'done', actual_hours: null })).toBe(false);
  });
});
