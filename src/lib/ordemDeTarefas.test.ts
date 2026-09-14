import { describe, expect, it } from 'vitest';

import {
  compararTarefasPorPrazo,
  compararTitulosDeTarefa,
  ordenarPorPrazo,
  ordenarPorTitulo,
} from '@/lib/ordemDeTarefas';

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

describe('compararTarefasPorPrazo', () => {
  it('põe o prazo mais próximo na frente do mais distante', () => {
    expect(
      compararTarefasPorPrazo(
        { title: 'Z', due_date: '2026-03-12' },
        { title: 'A', due_date: '2026-08-31' },
      ),
    ).toBeLessThan(0);
  });

  it('não deixa o título mandar quando as datas diferem', () => {
    // O defeito que esta ordem corrige: em ordem alfabética, a tarefa que vence
    // em agosto encabeçava a lista só por começar com "Apoio".
    const ordenado = ordenarPorPrazo([
      { title: 'Apoio na implantação', due_date: '2026-08-31' },
      { title: 'Suporte em auditorias', due_date: '2026-03-12' },
    ]);

    expect(ordenado.map(item => item.title)).toEqual([
      'Suporte em auditorias',
      'Apoio na implantação',
    ]);
  });

  it('empata pelo título, lendo número como número', () => {
    const mesmoDia = '2026-03-12';
    const ordenado = ordenarPorPrazo([
      { title: '1.10 Décima', due_date: mesmoDia },
      { title: '1.2 Segunda', due_date: mesmoDia },
      { title: '1.1 Primeira', due_date: mesmoDia },
    ]);

    expect(ordenado.map(item => item.title)).toEqual([
      '1.1 Primeira',
      '1.2 Segunda',
      '1.10 Décima',
    ]);
  });

  it('põe quem não tem prazo na frente de todas, e não no fim', () => {
    const ordenado = ordenarPorPrazo([
      { title: 'Com prazo distante', due_date: '2026-12-01' },
      { title: 'Sem prazo', due_date: null },
      { title: 'Com prazo próximo', due_date: '2026-03-12' },
    ]);

    expect(ordenado.map(item => item.title)).toEqual([
      'Sem prazo',
      'Com prazo próximo',
      'Com prazo distante',
    ]);
  });

  it('trata prazo em branco como ausência de prazo, não como data mínima', () => {
    // Formulário com o campo apagado devolve string vazia. Ela não pode vencer
    // de '2026-03-12' por comparação de texto — tem de cair na regra do sem prazo.
    const ordenado = ordenarPorPrazo([
      { title: 'Datada', due_date: '2026-03-12' },
      { title: 'Vazia', due_date: '' },
      { title: 'Nula', due_date: null },
    ]);

    // As duas sem prazo vêm antes, e entre si desempatam pelo título.
    expect(ordenado.map(item => item.title)).toEqual(['Nula', 'Vazia', 'Datada']);
  });

  it('devolve uma cópia, sem mexer no array recebido', () => {
    const original = [{ title: 'B', due_date: '2026-01-02' }, { title: 'A', due_date: '2026-01-01' }];

    const ordenado = ordenarPorPrazo(original);

    expect(ordenado.map(item => item.title)).toEqual(['A', 'B']);
    expect(original.map(item => item.title)).toEqual(['B', 'A']);
  });
});
