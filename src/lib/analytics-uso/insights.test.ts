import { describe, expect, it } from 'vitest';
import {
  insightConcentracao,
  insightLider,
  insightPiorMes,
  insightProporcao,
} from './insights';

const pastas = [
  { nome: 'Barralcool', rejeitados: 1346, duplicatas: 1 },
  { nome: 'Araguaia', rejeitados: 20, duplicatas: 1600 },
  { nome: 'Planta Brasil', rejeitados: 2, duplicatas: 0 },
];

describe('insightConcentracao', () => {
  it('aponta a entidade dominante com o rótulo pedido', () => {
    expect(
      insightConcentracao(pastas, (p) => p.rejeitados, (p) => p.nome, 'rejeições', {
        rotuloEntidade: 'A pasta da',
      }),
    ).toEqual({
      destaque: 'A pasta da Barralcool',
      texto: 'concentra 1.346 de 1.368 rejeições (98%).',
      tom: undefined,
    });
  });

  it('muda de entidade quando a métrica muda — o texto segue o dado', () => {
    const i = insightConcentracao(pastas, (p) => p.duplicatas, (p) => p.nome, 'duplicatas');
    expect(i?.destaque).toBe('Araguaia');
  });

  it('devolve null quando o volume está distribuído — sem "concentra" falso', () => {
    const plano = [
      { nome: 'A', v: 10 },
      { nome: 'B', v: 10 },
      { nome: 'C', v: 10 },
    ];
    expect(insightConcentracao(plano, (p) => p.v, (p) => p.nome, 'itens')).toBeNull();
  });

  it('devolve null quando não há volume nenhum', () => {
    expect(insightConcentracao([{ nome: 'A', v: 0 }], (p) => p.v, (p) => p.nome, 'itens')).toBeNull();
  });
});

describe('insightProporcao', () => {
  it('afirma a razão sem sugerir a causa', () => {
    const i = insightProporcao(2142, 288, 'documentos já existentes', 'documentos novos');
    expect(i?.destaque).toBe('7,4×');
    expect(i?.texto).toContain('2.142 contra 288');
    // A versao antiga cravava "alguma pasta esta sendo subida inteira".
    expect(i?.texto).not.toMatch(/pasta|checar|vale/);
  });

  it('some quando a razão se inverte', () => {
    expect(insightProporcao(10, 500, 'a', 'b')).toBeNull();
  });
});

describe('insightPiorMes', () => {
  it('formata o mês e usa o formatador recebido', () => {
    const serie = [
      { mes: '2026-04', v: 10 },
      { mes: '2026-05', v: 90 },
    ];
    expect(insightPiorMes(serie, (m) => m.v, (v) => `${v} un`, 'rejeição')).toEqual({
      destaque: '05/26',
      texto: 'foi o pior mês em rejeição: 90 un.',
    });
  });

  it('devolve null em série vazia ou toda zerada', () => {
    expect(insightPiorMes([], (m: { mes: string; v: number }) => m.v, String, 'x')).toBeNull();
    expect(insightPiorMes([{ mes: '2026-01', v: 0 }], (m) => m.v, String, 'x')).toBeNull();
  });
});

describe('insightLider', () => {
  it('monta a frase com o valor formatado em pt-BR', () => {
    expect(
      insightLider(
        [{ n: 'Mayara', v: 1111 }],
        (p) => p.v,
        (p) => p.n,
        (v) => `ingeriu ${v} documentos.`,
      ),
    ).toEqual({ destaque: 'Mayara', texto: 'ingeriu 1.111 documentos.' });
  });
});
