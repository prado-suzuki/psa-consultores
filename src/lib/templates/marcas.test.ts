import { describe, it, expect } from 'vitest';
import { extrairRunsLinha, removerMarcas, runsPosicionados } from './marcas';

const run = (texto: string, m: Partial<{ negrito: boolean; italico: boolean; sublinhado: boolean }> = {}) => ({
  texto,
  negrito: false,
  italico: false,
  sublinhado: false,
  ...m,
});

describe('marcas inline (*negrito*, _itálico_, ~sublinhado~)', () => {
  it('linha sem marcas devolve um único run', () => {
    expect(extrairRunsLinha('texto comum')).toEqual([run('texto comum')]);
  });

  it('resolve negrito, itálico e sublinhado', () => {
    expect(extrairRunsLinha('a *b* c _d_ e ~f~ g')).toEqual([
      run('a '),
      run('b', { negrito: true }),
      run(' c '),
      run('d', { italico: true }),
      run(' e '),
      run('f', { sublinhado: true }),
      run(' g'),
    ]);
  });

  it('sobrepõe estilos por toggle ("*a _b_ c*")', () => {
    expect(extrairRunsLinha('*a _b_ c*')).toEqual([
      run('a ', { negrito: true }),
      run('b', { negrito: true, italico: true }),
      run(' c', { negrito: true }),
    ]);
  });

  it('delimitador sem par fica literal e não vaza estilo', () => {
    expect(extrairRunsLinha('só um * solto')).toEqual([run('só um * solto')]);
    expect(extrairRunsLinha('a ~b sem fechar')).toEqual([run('a ~b sem fechar')]);
  });

  it('lacunas de contrato ("______") não são marcas (adjacência)', () => {
    const lacuna = 'bairro ______________, no município de Cuiabá';
    expect(extrairRunsLinha(lacuna)).toEqual([run(lacuna)]);
    expect(removerMarcas(lacuna)).toBe(lacuna);
    // Régua de assinatura inteira também fica intacta.
    expect(removerMarcas('_______________________________________')).toBe(
      '_______________________________________',
    );
  });

  it('caracteres repetidos colados não são delimitadores ("**", "__", "~~")', () => {
    expect(extrairRunsLinha('a **b** c')).toEqual([run('a **b** c')]);
    expect(extrairRunsLinha('shift__name e data__inicio')).toEqual([run('shift__name e data__inicio')]);
  });

  it('marcas não atravessam linhas', () => {
    expect(removerMarcas('*a\nb*')).toBe('*a\nb*');
  });

  it('removerMarcas tira só os pares', () => {
    expect(removerMarcas('*a* e _b_ e ~c~ e um * solto')).toBe('a e b e c e um * solto');
  });
});

describe('runsPosicionados (intervalos na linha crua)', () => {
  it('linha sem marcas é um run só cobrindo tudo', () => {
    expect(runsPosicionados('abc')).toEqual([
      { inicio: 0, fim: 3, negrito: false, italico: false, sublinhado: false },
    ]);
  });

  it('linha vazia não tem runs', () => {
    expect(runsPosicionados('')).toEqual([]);
  });

  it('delimitadores pareados ficam FORA dos intervalos', () => {
    // "a *b* c" → 'a ' [0,2) | 'b' [3,4) negrito | ' c' [5,7)
    expect(runsPosicionados('a *b* c')).toEqual([
      { inicio: 0, fim: 2, negrito: false, italico: false, sublinhado: false },
      { inicio: 3, fim: 4, negrito: true, italico: false, sublinhado: false },
      { inicio: 5, fim: 7, negrito: false, italico: false, sublinhado: false },
    ]);
  });

  it('delimitador sem par fica literal, dentro do intervalo', () => {
    expect(runsPosicionados('a * b')).toEqual([
      { inicio: 0, fim: 5, negrito: false, italico: false, sublinhado: false },
    ]);
  });

  it('repetidos colados ("__") não são delimitadores', () => {
    expect(runsPosicionados('shift__name')).toEqual([
      { inicio: 0, fim: 11, negrito: false, italico: false, sublinhado: false },
    ]);
  });

  it('sobreposição liga os dois estilos no miolo', () => {
    // "*a _b_ c*" → 'a ' negrito | 'b' negrito+itálico | ' c' negrito
    expect(runsPosicionados('*a _b_ c*')).toEqual([
      { inicio: 1, fim: 3, negrito: true, italico: false, sublinhado: false },
      { inicio: 4, fim: 5, negrito: true, italico: true, sublinhado: false },
      { inicio: 6, fim: 8, negrito: true, italico: false, sublinhado: false },
    ]);
  });

  it('paridade: extrairRunsLinha equivale a fatiar a linha pelos intervalos', () => {
    for (const linha of ['a *b* c', '*a _b_ c*', 'sem marcas', 'a * b', '~x~*y*', '']) {
      const fatias = runsPosicionados(linha).map((r) => ({
        texto: linha.slice(r.inicio, r.fim),
        negrito: r.negrito,
        italico: r.italico,
        sublinhado: r.sublinhado,
      }));
      // extrairRunsLinha funde adjacentes de mesmo estilo; comparar pelo texto re-unido por estilo.
      const runs = extrairRunsLinha(linha);
      expect(runs.map((r) => r.texto).join('')).toBe(fatias.map((f) => f.texto).join(''));
    }
  });
});
