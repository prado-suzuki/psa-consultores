import { describe, expect, it } from 'vitest';

import { compararTitulosDeTarefa, ordenarPorTitulo } from '@/lib/ordemDeTarefas';

describe('compararTitulosDeTarefa', () => {
  it('lê número como número, e não como texto', () => {
    // O defeito relatado: em texto puro "10" vem antes de "2".
    expect(compararTitulosDeTarefa('4.2 Segunda', '4.10 Décima')).toBeLessThan(0);
    expect(compararTitulosDeTarefa('10. Encerramento', '2. Cadastros')).toBeGreaterThan(0);
  });

  it('vale também com o número no meio do título', () => {
    // Caso real: as filhas de "3.01.Cisão (parcial)" saíam com a 10ª na frente.
    expect(
      compararTitulosDeTarefa('Elaborar 1ª Alteração', 'Elaborar 10ª Alteração'),
    ).toBeLessThan(0);
  });

  it('dispensa o zero à esquerda que hoje se digita para enganar a ordenação', () => {
    const comZero = ['2.01.Diagnóstico', '2.02.Qualificação', '2.10.Constituição'];
    const semZero = ['2.1.Diagnóstico', '2.2.Qualificação', '2.10.Constituição'];

    expect([...comZero].sort(compararTitulosDeTarefa)).toEqual(comZero);
    expect([...semZero].sort(compararTitulosDeTarefa)).toEqual(semZero);
  });

  it('ordena acento e caixa pelo pt-BR', () => {
    expect(['Órfã', 'Apuração', 'Zebra'].sort(compararTitulosDeTarefa)).toEqual([
      'Apuração',
      'Órfã',
      'Zebra',
    ]);
  });
});

describe('ordenarPorTitulo', () => {
  it('devolve uma cópia, sem mexer no array recebido', () => {
    const original = [{ title: 'B' }, { title: 'A' }];

    const ordenado = ordenarPorTitulo(original);

    expect(ordenado.map(item => item.title)).toEqual(['A', 'B']);
    expect(original.map(item => item.title)).toEqual(['B', 'A']);
  });
});
