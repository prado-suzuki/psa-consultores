import { describe, it, expect } from 'vitest';
import { matriculasForaDoLivro, proporAportesIniciais, proporAumentoDeCapital } from './aporteInicial';
import { capitalDeQuotas } from '@/lib/templates/capital';
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

describe('proporAumentoDeCapital — a segunda rodada, depois da constituição', () => {
  it('sem bem no livro e sem moeda, é bit a bit a proposta da constituição', () => {
    const matriculas = [
      matPR('m1', 250000, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')], 'bem-1'),
      matPR('m2', 138027.21, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')], 'bem-2'),
      matPR('m3', 558413.55, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-3'),
    ];
    const constituicao = proporAportesIniciais(matriculas);
    const aumento = proporAumentoDeCapital({
      matriculas,
      bensNoLivro: new Set(),
      moedaPorPessoaId: {},
    });

    expect(aumento.totalQuotas).toBe(constituicao.totalQuotas);
    expect(aumento.lancamentos).toEqual(
      constituicao.aportes.map((a) => ({
        pessoaId: a.pessoaId,
        denominacao: a.denominacao,
        quotas: a.quotas,
        pagamento: { tipo: 'bem', bemId: a.bemId },
      })),
    );
  });

  it('o bem que já tem movimento no livro sai antes do rateio', () => {
    const matriculas = [
      matPR('m1', 872674, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-antigo'),
      matPR('m2', 300000, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-novo'),
    ];
    const { lancamentos, totalQuotas } = proporAumentoDeCapital({
      matriculas,
      bensNoLivro: new Set(['bem-antigo']),
      moedaPorPessoaId: {},
    });
    // O capital de abertura não entra de novo: o aumento é só o delta.
    expect(lancamentos).toEqual([
      { pessoaId: 'j', denominacao: 'José Eduardo', quotas: 300000, pagamento: { tipo: 'bem', bemId: 'bem-novo' } },
    ]);
    expect(totalQuotas).toBe(300000);
  });

  it('a parcela em moeda vem DEPOIS dos imóveis do mesmo sócio, e não no fim da lista', () => {
    const { lancamentos } = proporAumentoDeCapital({
      matriculas: [
        matPR('m1', 90000, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-1'),
        matPR('m2', 40000, [{ pessoaId: 'm', denominacao: 'Maria Auxiliadora' }], 'bem-2'),
      ],
      bensNoLivro: new Set(),
      moedaPorPessoaId: { j: 10000, m: 5000 },
    });
    // É esta ordem que as alíneas do instrumento imprimem.
    expect(lancamentos.map((l) => [l.pessoaId, l.pagamento.tipo])).toEqual([
      ['j', 'bem'], ['j', 'moeda'],
      ['m', 'bem'], ['m', 'moeda'],
    ]);
  });

  it('sócio que só reforça em dinheiro entra depois de quem integraliza imóvel', () => {
    const { lancamentos, totalQuotas } = proporAumentoDeCapital({
      matriculas: [matPR('m1', 90000, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-1')],
      bensNoLivro: new Set(),
      moedaPorPessoaId: { s: 20000 },
      denominacaoPorPessoaId: { s: 'Sônia Regina' },
    });
    expect(lancamentos).toEqual([
      { pessoaId: 'j', denominacao: 'José Eduardo', quotas: 90000, pagamento: { tipo: 'bem', bemId: 'bem-1' } },
      { pessoaId: 's', denominacao: 'Sônia Regina', quotas: 20000, pagamento: { tipo: 'moeda' } },
    ]);
    expect(totalQuotas).toBe(110000);
  });

  it('a parcela em moeda com centavos fecha pela regra da casa', () => {
    const { lancamentos, totalQuotas } = proporAumentoDeCapital({
      matriculas: [],
      bensNoLivro: new Set(),
      moedaPorPessoaId: { j: 95209.23 },
      denominacaoPorPessoaId: { j: 'José Eduardo' },
    });
    // 95.209 quotas e R$ 95.209,00: o centavo não fica pendurado no total.
    expect(lancamentos).toEqual([
      { pessoaId: 'j', denominacao: 'José Eduardo', quotas: 95209, pagamento: { tipo: 'moeda' } },
    ]);
    expect(totalQuotas).toBe(95209);
    expect(capitalDeQuotas(totalQuotas)).toBe(95209);
  });

  it('moeda ausente, zero ou abaixo de uma quota não vira lançamento vazio', () => {
    const { lancamentos } = proporAumentoDeCapital({
      matriculas: [matPR('m1', 1000, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-1')],
      bensNoLivro: new Set(),
      moedaPorPessoaId: { j: 0, m: 0.4, x: -100 },
      denominacaoPorPessoaId: { m: 'Maria', x: 'Xavier' },
    });
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0].pagamento).toEqual({ tipo: 'bem', bemId: 'bem-1' });
  });

  it('Σ quotas dos lançamentos é o total, com imóveis e moeda misturados', () => {
    const { lancamentos, totalQuotas } = proporAumentoDeCapital({
      matriculas: [
        matPR('m1', 33333.33, [meio('j', 'José'), meio('m', 'Maria')], 'bem-1'),
        matPR('m2', 104693.88, [meio('j', 'José'), meio('m', 'Maria')], 'bem-2'),
      ],
      bensNoLivro: new Set(),
      moedaPorPessoaId: { j: 95209.23, m: 1500.5 },
    });
    expect(lancamentos.reduce((s, l) => s + l.quotas, 0)).toBe(totalQuotas);
    expect(lancamentos.every((l) => l.quotas > 0)).toBe(true);
  });

  it('titular legado bloqueia o aumento inteiro, igual à constituição', () => {
    const { lancamentos, titularesLegados } = proporAumentoDeCapital({
      matriculas: [
        matPR('m1', 100000, [
          { pessoaId: 'j', denominacao: 'José Eduardo', fracao: 50 },
          { pessoaId: null, denominacao: 'Espólio de Antônio', fracao: 50 },
        ], 'bem-1'),
      ],
      bensNoLivro: new Set(),
      moedaPorPessoaId: { j: 10000 },
    });
    expect(lancamentos).toEqual([]);
    expect(titularesLegados).toEqual(['Espólio de Antônio']);
  });

  it('todos os bens já no livro: nada a propor, e o card não deve aparecer', () => {
    const matriculas = [
      matPR('m1', 872674, [{ pessoaId: 'j', denominacao: 'José Eduardo' }], 'bem-1'),
    ];
    expect(matriculasForaDoLivro(matriculas, new Set(['bem-1']))).toEqual([]);
    expect(
      proporAumentoDeCapital({ matriculas, bensNoLivro: new Set(['bem-1']), moedaPorPessoaId: {} }),
    ).toEqual({ lancamentos: [], titularesLegados: [], totalQuotas: 0 });
  });
});
