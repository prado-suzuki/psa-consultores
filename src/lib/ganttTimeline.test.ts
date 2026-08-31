import { describe, expect, it } from 'vitest';
import {
  ancoraInicial,
  construirEixo,
  geometriaDaBarra,
  passoDoEixo,
  posicaoDeAgora,
} from './ganttTimeline';

/**
 * O que estes testes travam, e por quê.
 *
 * O eixo virou período navegável, e o preço disso é que um item pode cair fora
 * da janela. Os testes de `geometriaDaBarra` existem para separar os três casos
 * que a tela trata de formas diferentes — dentro, cortado na borda, inteiramente
 * fora — porque só o terceiro vira seta de navegação, e confundir cortado com
 * fora esconde a barra que deveria aparecer pela metade.
 */

const dia = (iso: string) => new Date(`${iso}T00:00:00`);

describe('construirEixo', () => {
  it('no mês, estica a janela até semana cheia dos dois lados', () => {
    const eixo = construirEixo('mes', dia('2026-08-15'), dia('2026-08-15'));
    // Agosto/2026 começa num sábado e termina numa segunda: a janela abre no
    // domingo 26/07 e fecha no sábado 05/09.
    expect(eixo.inicio).toEqual(dia('2026-07-26'));
    expect(eixo.fim).toEqual(dia('2026-09-05'));
    expect(eixo.unidades).toHaveLength(42);
    expect(eixo.unidades.length % 7).toBe(0);
  });

  it('nomeia o mês da âncora, e não o da borda esticada', () => {
    expect(construirEixo('mes', dia('2026-08-15'), dia('2026-08-15')).titulo).toBe('Agosto de 2026');
  });

  it('agrupa o cabeçalho de mês em semanas de sete colunas', () => {
    const eixo = construirEixo('mes', dia('2026-08-15'), dia('2026-08-15'));
    expect(eixo.grupos).toHaveLength(6);
    expect(eixo.grupos.every((grupo) => grupo.unidades === 7)).toBe(true);
    expect(eixo.grupos[0].rotulo).toContain('26–1');
  });

  it('marca fim de semana e o dia de hoje', () => {
    const eixo = construirEixo('semana', dia('2026-08-26'), dia('2026-08-26'));
    expect(eixo.unidades).toHaveLength(7);
    expect(eixo.unidades.filter((unidade) => unidade.fimDeSemana)).toHaveLength(2);
    expect(eixo.unidades.filter((unidade) => unidade.contemHoje)).toHaveLength(1);
  });

  it('no trimestre, cada coluna é uma semana e o grupo é o mês', () => {
    const eixo = construirEixo('trimestre', dia('2026-08-15'), dia('2026-08-15'));
    expect(eixo.unidades.every((unidade) => unidade.dias === 7)).toBe(true);
    expect(eixo.grupos.map((grupo) => grupo.rotulo)).toEqual(['Junho', 'Julho', 'Agosto', 'Setembro']);
    expect(eixo.titulo).toBe('3º trimestre de 2026');
  });

  it('a largura total acompanha o número de colunas', () => {
    const eixo = construirEixo('mes', dia('2026-08-15'), dia('2026-08-15'));
    expect(eixo.largura).toBe(eixo.unidades.length * eixo.larguraDaUnidade);
    expect(eixo.pxPorDia).toBe(eixo.larguraDaUnidade);
  });

  it('no trimestre, um dia vale um sétimo da coluna', () => {
    const eixo = construirEixo('trimestre', dia('2026-08-15'), dia('2026-08-15'));
    expect(eixo.pxPorDia).toBeCloseTo(eixo.larguraDaUnidade / 7);
  });
});

describe('passoDoEixo', () => {
  it('anda uma janela da escala corrente', () => {
    expect(passoDoEixo('semana', dia('2026-08-15'), 1)).toEqual(dia('2026-08-22'));
    expect(passoDoEixo('mes', dia('2026-08-15'), -1)).toEqual(dia('2026-07-15'));
    expect(passoDoEixo('trimestre', dia('2026-08-15'), 1)).toEqual(dia('2026-11-15'));
  });
});

describe('geometriaDaBarra', () => {
  const eixo = construirEixo('mes', dia('2026-08-15'), dia('2026-08-15'));

  it('posiciona pela distância em dias desde a abertura da janela', () => {
    const geo = geometriaDaBarra(eixo, dia('2026-07-27'), dia('2026-07-29'));
    expect(geo.fora).toBeNull();
    expect(geo.esquerda).toBe(eixo.pxPorDia);
    expect(geo.largura).toBe(3 * eixo.pxPorDia);
  });

  it('desenha cortada a barra que cruza a borda, sem chamá-la de fora', () => {
    const geo = geometriaDaBarra(eixo, dia('2026-07-20'), dia('2026-07-28'));
    expect(geo.fora).toBeNull();
    expect(geo.esquerda).toBe(0);
    expect(geo.largura).toBe(3 * eixo.pxPorDia);
  });

  it('devolve o lado quando a barra está inteiramente fora', () => {
    expect(geometriaDaBarra(eixo, dia('2026-06-01'), dia('2026-06-10')).fora).toBe('antes');
    expect(geometriaDaBarra(eixo, dia('2026-10-01'), dia('2026-10-10')).fora).toBe('depois');
  });

  it('garante largura mínima para a barra de um dia continuar clicável', () => {
    const estreito = construirEixo('trimestre', dia('2026-08-15'), dia('2026-08-15'));
    const geo = geometriaDaBarra(estreito, dia('2026-08-10'), dia('2026-08-10'));
    expect(geo.largura).toBeGreaterThanOrEqual(10);
  });
});

describe('posicaoDeAgora', () => {
  const eixo = construirEixo('mes', dia('2026-08-15'), dia('2026-08-15'));

  it('cai no meio do dia ao meio-dia', () => {
    const meioDia = new Date('2026-08-01T12:00:00');
    expect(posicaoDeAgora(eixo, meioDia)).toBeCloseTo(6.5 * eixo.pxPorDia);
  });

  it('some quando hoje está fora da janela', () => {
    expect(posicaoDeAgora(eixo, new Date('2026-10-01T09:00:00'))).toBeNull();
  });
});

describe('ancoraInicial', () => {
  const hoje = dia('2026-08-15');

  it('abre em hoje quando algum item cruza a janela de hoje', () => {
    const ancora = ancoraInicial('mes', [{ inicio: dia('2026-08-20'), fim: dia('2026-08-25') }], hoje);
    expect(ancora).toEqual(hoje);
  });

  it('abre no item mais antigo quando a janela de hoje está vazia', () => {
    const ancora = ancoraInicial(
      'mes',
      [
        { inicio: dia('2026-03-02'), fim: dia('2026-03-06') },
        { inicio: dia('2026-05-02'), fim: dia('2026-05-06') },
      ],
      hoje,
    );
    expect(ancora).toEqual(dia('2026-03-02'));
  });

  it('abre em hoje quando não há item nenhum', () => {
    expect(ancoraInicial('mes', [], hoje)).toEqual(hoje);
  });
});
