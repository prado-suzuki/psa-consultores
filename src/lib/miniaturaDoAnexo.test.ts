import { describe, expect, it } from 'vitest';

import { ehImagem, tamanhoDaMiniatura } from '@/lib/miniaturaDoAnexo';

describe('tamanhoDaMiniatura', () => {
  it('print largo encolhe pela largura, mantendo a proporção', () => {
    expect(tamanhoDaMiniatura(1920, 1080)).toEqual({ largura: 360, altura: 203 });
  });

  it('foto em pé encolhe pela altura', () => {
    expect(tamanhoDaMiniatura(1080, 1920)).toEqual({ largura: 135, altura: 240 });
  });

  it('imagem pequena não é ampliada', () => {
    expect(tamanhoDaMiniatura(120, 80)).toEqual({ largura: 120, altura: 80 });
  });

  it('sem medida gravada, reserva um espaço padrão', () => {
    expect(tamanhoDaMiniatura(null, null)).toEqual({ largura: 360, altura: 180 });
    expect(tamanhoDaMiniatura(0, 500)).toEqual({ largura: 360, altura: 180 });
  });
});

describe('ehImagem', () => {
  it('olha o tipo, não o nome', () => {
    expect(ehImagem('image/png')).toBe(true);
    expect(ehImagem('application/pdf')).toBe(false);
    expect(ehImagem(null)).toBe(false);
  });
});
