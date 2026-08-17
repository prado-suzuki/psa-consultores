import { describe, expect, it } from 'vitest';
import { contarEstados, estadoDoDocumento, type EstadoDocumento } from './estadoDocumento';

describe('estadoDoDocumento', () => {
  it('recebido sem nada a revisar é aprovado', () => {
    expect(estadoDoDocumento(true, [{ revisao: 'aprovado' }])).toBe('aprovado');
  });

  it('recebido com arquivo do cliente ainda não olhado fica em análise', () => {
    expect(estadoDoDocumento(true, [{ revisao: 'pendente' }])).toBe('em_analise');
  });

  // Arquivo que a PSA subiu não passa por aprovação: ele não pode segurar a
  // ficha em "em análise" à espera de um veredito que nunca vem.
  it('arquivo da PSA não deixa a pendência em análise', () => {
    expect(estadoDoDocumento(true, [{ revisao: 'pendente', fonte: 'psa' }])).toBe('aprovado');
  });

  it('faltando com recusa é recusado; faltando e vazio é pendente', () => {
    expect(estadoDoDocumento(false, [{ revisao: 'recusado' }])).toBe('recusado');
    expect(estadoDoDocumento(false, [])).toBe('pendente');
  });

  // O caso ambíguo, e o motivo de a precedência sair do `recebido`: com um bom e
  // um recusado, a pendência está resolvida e não pode reaparecer em "recusado".
  it('recusado + aprovado na mesma pendência conta como aprovado', () => {
    expect(estadoDoDocumento(true, [{ revisao: 'recusado' }, { revisao: 'aprovado' }]))
      .toBe('aprovado');
  });

  it('recusado + ainda não revisado, com a pendência recebida, fica em análise', () => {
    expect(estadoDoDocumento(true, [{ revisao: 'recusado' }, { revisao: 'pendente' }]))
      .toBe('em_analise');
  });
});

describe('contarEstados', () => {
  it('devolve os quatro sempre, e ignora o que está fora dos quatro', () => {
    const estados: (EstadoDocumento | null)[] = [
      'pendente', 'pendente', 'aprovado', null, 'recusado',
    ];
    expect(contarEstados(estados)).toEqual({
      pendente: 2, em_analise: 0, recusado: 1, aprovado: 1,
    });
  });
});
