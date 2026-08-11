import { describe, it, expect } from 'vitest';
import { capitalDeQuotas, quotasDeValor, VALOR_NOMINAL_QUOTA } from './capital';
import {
  calcularCapitalSociedade,
  calcularParticipacoesPR,
  mapearQuadroSocietario,
  mapearSociedade,
  type MatriculaIntegralizacao,
  type SocioParaMapear,
} from './mapeadores';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

// Teste de PROPRIEDADE do B6: para qualquer conjunto de valores de entrada, as
// duas identidades do capital valem. O cenário NÃO é o do caso que originou o
// bug (a MMS, holding com uma matrícula de R$ 558.413,55): são milhares de
// combinações sorteadas — com centavos, com um sócio e com muitos —, porque o
// que o bug tinha era falta de invariante, não um número errado.

/** PRNG determinístico (mulberry32): a falha de um caso é reproduzível pela semente. */
function aleatorio(semente: number): () => number {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pessoa = (nome: string, id = nome.toLowerCase()) =>
  ({ id, denominacao: nome, tipo_pessoa: 'PF', genero: 'M' }) as unknown as PessoaRow;

const empresaPR = { tipo_empresa: 'PR' } as unknown as PessoaRow;
const empresaCN = { tipo_empresa: 'CN' } as unknown as PessoaRow;

function matricula(id: string, vlr: number, titulares: MatriculaIntegralizacao['titulares']): MatriculaIntegralizacao {
  return {
    id, numero: id, livro: null, folha: null,
    municipio_imovel: null, uf_imovel: null,
    area_documento: null, area_unidade: null, vlr_contabil: vlr,
    confrontacoes_texto: null, descricao_psa_completa: null,
    bem: null, cartorio: null, titulares,
  };
}

describe('capital.ts — conversão entre valor e quotas', () => {
  it('quotas e capital são inversos ao valor nominal, sem resíduo de ponto flutuante', () => {
    expect(quotasDeValor(558413.55)).toBe(558414);
    expect(capitalDeQuotas(558414)).toBe(558414);
    expect(capitalDeQuotas(quotasDeValor(0.4))).toBe(0);
    expect(capitalDeQuotas(3)).toBe(3 * VALOR_NOMINAL_QUOTA);
  });
});

describe('B6 · propriedade: Σ quotas × valor nominal === capital', () => {
  it('empresa PR (quotas derivadas das integralizações), 1 a 6 titulares, com centavos', () => {
    const rnd = aleatorio(20260811);
    for (let caso = 0; caso < 500; caso++) {
      const nTitulares = 1 + Math.floor(rnd() * 6);
      const nMatriculas = 1 + Math.floor(rnd() * 4);
      const titulares = Array.from({ length: nTitulares }, (_, i) => ({
        pessoaId: `p${i}`,
        denominacao: `Titular ${i}`,
      }));

      const matriculas = Array.from({ length: nMatriculas }, (_, j) => {
        // Valor com centavos "quebrados" de propósito: é o centavo que não cabe
        // na quota indivisível que produzia a cláusula contraditória.
        const valor = Math.round(rnd() * 90_000_000) / 100;
        // Frações que fecham 100% em parte dos casos e ficam ausentes no resto
        // (composse sem fração declarada divide igualmente).
        const comFracao = rnd() < 0.5;
        const fracao = 100 / nTitulares;
        return matricula(`m${j}`, valor, titulares.map((t) => ({ ...t, fracao: comFracao ? fracao : null })));
      });

      const participacoes = calcularParticipacoesPR(matriculas);
      const capital = calcularCapitalSociedade(empresaPR, [], matriculas);

      expect(capital.capitalValor).not.toBeNull();
      // 1) o capital é exatamente o valor das quotas emitidas
      expect(capital.capitalValor).toBe(capitalDeQuotas(capital.totalQuotas!));
      // 2) as quotas dos sócios somam o total de quotas da sociedade
      expect(participacoes.reduce((s, p) => s + p.quotas, 0)).toBe(capital.totalQuotas);
      // 3) e a tabela de sócios soma o capital (o resíduo tem destino: as quotas)
      expect(participacoes.reduce((s, p) => s + p.valor, 0)).toBe(capital.capitalValor);
      expect(participacoes.reduce((s, p) => s + p.percentual, 0)).toBeCloseTo(100, 6);
    }
  });

  it('quadro societário digitado (CN), 1 a 8 sócios: o capital é o valor das quotas', () => {
    const rnd = aleatorio(11082026);
    for (let caso = 0; caso < 500; caso++) {
      const nSocios = 1 + Math.floor(rnd() * 8);
      const socios: SocioParaMapear[] = Array.from({ length: nSocios }, (_, i) => ({
        pessoa: pessoa(`Sócio ${i}`, `s${i}`),
        quotas: 1 + Math.floor(rnd() * 900_000),
        // Valor digitado com centavos que NÃO fecham com as quotas: é o caso do
        // cadastro real, e é ele que o ajuste do valor integralizado resolve.
        vlr_total: Math.round(rnd() * 90_000_000) / 100,
        representante: null,
      }));

      const capital = calcularCapitalSociedade(empresaCN, socios, []);
      const { itens, total } = mapearQuadroSocietario(socios);

      expect(capital.capitalValor).toBe(capitalDeQuotas(capital.totalQuotas!));
      expect(socios.reduce((s, x) => s + x.quotas!, 0)).toBe(capital.totalQuotas);

      // A cláusula de capital e a tabela dizem o mesmo número.
      const sociedade = mapearSociedade(
        { id: 'e1', denominacao: 'Sociedade Teste Ltda', tipo_pessoa: 'PJ' } as unknown as PessoaRow,
        capital,
      );
      expect(total.vlrTotal).toBe(sociedade.capitalValor);
      expect(total.quotas).toBe(sociedade.totalQuotas);
      expect(sociedade.quotaValorNominal).toBe('1,00');
      expect(sociedade.quotaValorNominalExtenso).toBe('um real');

      // E cada linha da tabela também: valor do sócio = quotas dele × nominal.
      itens.forEach((item, i) => {
        const campos = item.socio as Record<string, string>;
        expect(campos.vlrTotal).toBe(
          capitalDeQuotas(socios[i].quotas!).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        );
      });
    }
  });
});
