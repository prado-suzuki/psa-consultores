import { describe, it, expect } from 'vitest';
import {
  mapearMatricula,
  mapearQuadroSocietario,
  type MatriculaParaMapear,
  type SocioParaMapear,
  type TitularParaMapear,
} from './mapeadores';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

type Campos = Record<string, string>;

/** Matrícula mínima: só os titulares importam para estes testes. */
function matriculaCom(titulares: TitularParaMapear[]): MatriculaParaMapear {
  return {
    numero: '2.628', livro: null, folha: null,
    municipio_imovel: null, uf_imovel: null,
    area_documento: null, area_unidade: null, vlr_contabil: null,
    confrontacoes_texto: null, descricao_psa_completa: null,
    bem: null, cartorio: null, titulares,
  };
}

function socio(denominacao: string, quotas: number, vlr_total: number): SocioParaMapear {
  return {
    pessoa: { denominacao, tipo_pessoa: 'PF', genero: 'M' } as unknown as PessoaRow,
    quotas,
    vlr_total,
    representante: null,
  };
}

describe('mapearQuadroSocietario — percentual calculado e total', () => {
  it('injeta socio.percentual (quotas ÷ total) e agrega a linha total', () => {
    const { itens, total } = mapearQuadroSocietario([
      socio('Sócio A', 75, 75),
      socio('Sócio B', 25, 25),
    ]);

    expect((itens[0].socio as Campos).percentual).toBe('75,000%');
    expect((itens[1].socio as Campos).percentual).toBe('25,000%');
    // Campos por sócio continuam disponíveis sob o escopo "socio".
    expect((itens[0].socio as Campos).quotas).toBe('75');
    expect((itens[0].socio as Campos).vlrTotal).toBe('75,00');

    expect(total.quotas).toBe('100');
    expect(total.vlrTotal).toBe('100,00');
    expect(total.percentual).toBe('100,000%');
  });

  it('sem quotas: total fica vazio (não força 0%) e não quebra', () => {
    const { itens, total } = mapearQuadroSocietario([socio('Sócio sem quota', 0, 0)]);
    expect(total).toEqual({});
    expect((itens[0].socio as Campos).percentual).toBeUndefined();
  });
});

describe('mapearMatricula — titularidade (forma inteira × fracionada)', () => {
  it('titular único: forma inteira, sem fração nem remanescente', () => {
    const c = mapearMatricula(matriculaCom([{ denominacao: 'José Eduardo', pessoaId: 'a' }]));
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.percentual).toBeUndefined();
    expect(c.remanescente).toBeUndefined();
    expect(c.fracionado).toBe('');
  });

  it('composse sem integralizador: "A e B" (forma inteira)', () => {
    const c = mapearMatricula(
      matriculaCom([
        { denominacao: 'José Eduardo', pessoaId: 'a' },
        { denominacao: 'Maria Auxiliadora', pessoaId: 'b' },
      ]),
    );
    expect(c.proprietario).toBe('José Eduardo e Maria Auxiliadora');
    expect(c.fracionado).toBe('');
  });

  it('integralizador com fração: lidera a frase, demais viram remanescente', () => {
    const c = mapearMatricula(
      matriculaCom([
        { denominacao: 'Maria Auxiliadora', pessoaId: 'b', fracao: 50 },
        { denominacao: 'José Eduardo', pessoaId: 'a', integralizador: true, fracao: 50 },
      ]),
    );
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.percentual).toBe('50,000%');
    expect(c.percentualExtenso).toBe('cinquenta inteiros por cento');
    expect(c.remanescente).toBe('Maria Auxiliadora');
    expect(c.fracionado).toBe('sim');
  });

  it('integralizador sem outros titulares: não fraciona (não há remanescente)', () => {
    const c = mapearMatricula(
      matriculaCom([{ denominacao: 'José Eduardo', pessoaId: 'a', integralizador: true, fracao: 50 }]),
    );
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.percentual).toBeUndefined();
    expect(c.fracionado).toBe('');
  });

  it('deduplica as duas linhas (posse de fato + de direito) da mesma pessoa', () => {
    const c = mapearMatricula(
      matriculaCom([
        { denominacao: 'José Eduardo', pessoaId: 'a', integralizador: true, fracao: 50 },
        { denominacao: 'José Eduardo', pessoaId: 'a', fracao: 50 },
        { denominacao: 'Maria Auxiliadora', pessoaId: 'b', fracao: 50 },
      ]),
    );
    // José aparece uma vez (líder); Maria é o remanescente — sem duplicar.
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.remanescente).toBe('Maria Auxiliadora');
  });
});
