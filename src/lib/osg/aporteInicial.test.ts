import { describe, it, expect } from 'vitest';
import { proporAportesIniciais } from './aporteInicial';
import { calcularParticipacoesPR, type MatriculaIntegralizacao } from '@/lib/templates/mapeadores';
import type { TitularParaMapear } from '@/lib/templates/mapeadores';

function matPR(
  id: string,
  vlr: number | null,
  titulares: TitularParaMapear[],
  bemId?: string | null,
): MatriculaIntegralizacao {
  return {
    id, numero: id, livro: null, folha: null,
    municipio_imovel: null, uf_imovel: null,
    area_documento: null, area_unidade: null, vlr_contabil: vlr,
    confrontacoes_texto: null, descricao_psa_completa: null,
    bem: null, cartorio: null, titulares, bemId,
  };
}

const meio = (pessoaId: string, denominacao: string): TitularParaMapear =>
  ({ pessoaId, denominacao, fracao: 50 });

describe('proporAportesIniciais — a proposta que a tela da PR grava', () => {
  it('um aporte por bem, com o bem_id preenchido', () => {
    const { aportes } = proporAportesIniciais([
      matPR('m1', 100000, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-1'),
      matPR('m2', 40000, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-2'),
    ]);
    expect(aportes).toHaveLength(2);
    expect(aportes.map((a) => a.bemId)).toEqual(['bem-1', 'bem-2']);
    expect(aportes.map((a) => a.quotas)).toEqual([100000, 40000]);
    expect(aportes.every((a) => a.pessoaId === 'j')).toBe(true);
  });

  it('duas matrículas do MESMO bem viram um aporte só: o movimento é por bem', () => {
    const { aportes } = proporAportesIniciais([
      matPR('m1', 60000, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-1'),
      matPR('m2', 40000, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-1'),
    ]);
    expect(aportes).toHaveLength(1);
    expect(aportes[0]).toMatchObject({ bemId: 'bem-1', quotas: 100000, valor: 100000 });
  });

  it('reproduz EXATAMENTE o quadro derivado: pessoas, quotas, valores e ordem', () => {
    const matriculas = [
      matPR('m1', 250000, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')], 'bem-1'),
      matPR('m2', 138027.21, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')], 'bem-2'),
      matPR('m3', 558413.55, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-3'),
    ];
    const participacoes = calcularParticipacoesPR(matriculas);
    const { aportes, totalQuotas } = proporAportesIniciais(matriculas);

    // Agrega os movimentos de volta e compara com o derivado, que é o que a
    // tela mostra hoje e o gerador imprime: é este teste que segura o critério
    // de "nenhuma diferença no texto" da troca de fonte.
    const porPessoa = new Map<string, { quotas: number; valor: number }>();
    for (const a of aportes) {
      const atual = porPessoa.get(a.pessoaId) ?? { quotas: 0, valor: 0 };
      porPessoa.set(a.pessoaId, {
        quotas: atual.quotas + a.quotas,
        valor: atual.valor + a.valor,
      });
    }

    expect([...porPessoa.keys()]).toEqual(participacoes.map((p) => p.pessoaId));
    for (const p of participacoes) {
      expect(porPessoa.get(p.pessoaId!)).toEqual({ quotas: p.quotas, valor: p.valor });
    }
    expect(aportes.reduce((s, a) => s + a.quotas, 0)).toBe(totalQuotas);
  });

  it('a ordem dos sócios é a de participação decrescente, e não a dos bens', () => {
    const { aportes } = proporAportesIniciais([
      // Maria entra primeiro no cadastro, mas com a menor participação.
      matPR('m1', 1000, [{ pessoaId: 'm', denominacao: 'Maria Auxiliadora' }], 'bem-1'),
      matPR('m2', 90000, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-2'),
    ]);
    expect(aportes.map((a) => a.pessoaId)).toEqual(['j', 'm']);
  });

  it('titular legado bloqueia a proposta inteira, e diz qual é', () => {
    const { aportes, titularesLegados } = proporAportesIniciais([
      matPR('m1', 100000, [
        { pessoaId: 'j', denominacao: 'José Eduardo', fracao: 50 },
        { pessoaId: null, denominacao: 'Espólio de Antônio', fracao: 50 },
      ], 'bem-1'),
    ]);
    // Nada parcial: quadro incompleto vira contrato errado.
    expect(aportes).toEqual([]);
    expect(titularesLegados).toEqual(['Espólio de Antônio']);
  });

  it('sem matrícula com valor, não há o que propor', () => {
    expect(proporAportesIniciais([])).toEqual({
      aportes: [], titularesLegados: [], totalQuotas: 0,
    });
    expect(proporAportesIniciais([
      matPR('m1', null, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-1'),
    ]).aportes).toEqual([]);
  });

  it('matrícula sem bem vinculado grava aporte com bem_id nulo', () => {
    const { aportes } = proporAportesIniciais([
      matPR('m1', 5000, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
    ]);
    expect(aportes).toEqual([
      { pessoaId: 'j', denominacao: 'José Eduardo', bemId: null, quotas: 5000, valor: 5000 },
    ]);
  });

  it('a quota que o arredondamento cria não some nem duplica ao abrir por bem', () => {
    // 50/50 de valor ímpar: o quadro derivado dá 69.014 e 69.013. Cada sócio tem
    // dois bens, então a abertura por bem também arredonda, e a soma tem de
    // continuar batendo linha a linha.
    const matriculas = [
      matPR('m1', 33333.33, [meio('j', 'José'), meio('m', 'Maria')], 'bem-1'),
      matPR('m2', 104693.88, [meio('j', 'José'), meio('m', 'Maria')], 'bem-2'),
    ];
    const participacoes = calcularParticipacoesPR(matriculas);
    const { aportes } = proporAportesIniciais(matriculas);

    for (const p of participacoes) {
      const soma = aportes
        .filter((a) => a.pessoaId === p.pessoaId)
        .reduce((s, a) => s + a.quotas, 0);
      expect(soma).toBe(p.quotas);
    }
    expect(aportes.every((a) => a.quotas > 0)).toBe(true);
  });
});
