import { describe, it, expect } from 'vitest';
import { comOrigem, origemDe } from './origem';

describe('comOrigem / origemDe', () => {
  it('anexa e lê a origem do objeto', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    expect(origemDe(campos)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('devolve undefined para valores sem origem (objeto, primitivo, null)', () => {
    expect(origemDe({ nome: 'Ana' })).toBeUndefined();
    expect(origemDe('Ana')).toBeUndefined();
    expect(origemDe(null)).toBeUndefined();
    expect(origemDe(undefined)).toBeUndefined();
  });

  it('sobrevive a spread — o caminho de derivarCampos e da edição manual', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    const copia = { ...campos, nome: 'Ana Maria' };
    expect(origemDe(copia)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('fica fora de Object.keys/entries — nunca vira placeholder', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    expect(Object.keys(campos)).toEqual(['nome']);
    expect(Object.entries(campos)).toEqual([['nome', 'Ana']]);
  });

  it('DOCUMENTAL: structuredClone descarta a origem (chave Symbol) — não copiar o contexto por aí', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    expect(origemDe(structuredClone(campos))).toBeUndefined();
  });
});
