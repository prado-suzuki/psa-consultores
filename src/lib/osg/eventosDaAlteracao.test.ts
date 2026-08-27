import { describe, it, expect } from 'vitest';
import {
  administradoresNaoSocios,
  derivarEventosDaAlteracao,
  ficaUnipessoal,
  type MudancaDeCadastro,
} from './eventosDaAlteracao';
import type { MovimentoDoLedger } from './projecaoQuadro';

const PR = 'empresa-proprietaria';
const ANA = 'pessoa-ana';
const BRUNO = 'pessoa-bruno';
const HOLDING = 'pessoa-holding';

let relogio = 0;
const carimbo = () => new Date(Date.UTC(2026, 0, 1, 0, 0, 0, relogio++)).toISOString();

const mov = (p: Partial<MovimentoDoLedger> & { id: string }): MovimentoDoLedger => ({
  empresaPessoaId: PR,
  tipo: 'aporte',
  origemPessoaId: null,
  destinoPessoaId: ANA,
  quotas: 100,
  valor: 100,
  createdAt: carimbo(),
  dataMovimento: null,
  atoId: null,
  sequencia: null,
  documentoGeradoId: null,
  pagamento: { tipo: 'moeda' },
  ...p,
});

/** A constituição: já formalizada pelo contrato social registrado. */
const constituicao = [
  mov({ id: 'c1', destinoPessoaId: ANA, quotas: 436337, valor: 436337, documentoGeradoId: 'doc-social' }),
  mov({ id: 'c2', destinoPessoaId: BRUNO, quotas: 436337, valor: 436337, documentoGeradoId: 'doc-social' }),
];

/** CPF/CNPJ do quadro vivo: a chave do diff, porque o snapshot não guarda ids. */
const CPFS: Record<string, string> = {
  [ANA]: '111.111.111-11',
  [BRUNO]: '222.222.222-22',
  [HOLDING]: '33.333.333/0001-33',
};

/**
 * O baseline que o contrato social registrado publicou: capital de R$ 872.674,00 e
 * os dois fundadores no quadro. É o que o snapshot da peça diz, e não o que a
 * projeção dos movimentos formalizados adivinha.
 */
const baselineDoContratoSocial = {
  capitalAnterior: 872674,
  cpfCnpjDosSocios: ['11111111111', '22222222222'],
};

const nomes = (movs: MovimentoDoLedger[], mudancas: MudancaDeCadastro[] = []) =>
  derivarEventosDaAlteracao({ movimentos: movs, empresaPessoaId: PR, mudancas }).map((e) => e.flagNome);

describe('derivarEventosDaAlteracao', () => {
  it('não deriva evento nenhum quando tudo já foi formalizado', () => {
    expect(derivarEventosDaAlteracao({ movimentos: constituicao, empresaPessoaId: PR })).toEqual([]);
  });

  it('deriva aumento de capital dos aportes pendentes, com os números na evidência', () => {
    const movs = [
      ...constituicao,
      mov({ id: 'a1', destinoPessoaId: ANA, quotas: 1681074, valor: 1681074, pagamento: { tipo: 'bem', bemId: 'b1' } }),
      mov({ id: 'a2', destinoPessoaId: BRUNO, quotas: 1681074, valor: 1681074, pagamento: { tipo: 'bem', bemId: 'b2' } }),
    ];
    const aumento = derivarEventosDaAlteracao({ movimentos: movs, empresaPessoaId: PR })
      .find((e) => e.flagNome === 'evento_aumento_capital');
    // O caso MMS: de R$ 872.674,00 para R$ 4.234.822,00.
    expect(aumento?.evidencia).toBe('aumento de capital de R$ 872.674,00 para R$ 4.234.822,00');
    expect(aumento?.movimentoIds).toEqual(['a1', 'a2']);
  });

  it('deriva a integralização dizendo COM O QUE os aportes foram pagos', () => {
    const movs = [
      ...constituicao,
      mov({ id: 'a1', pagamento: { tipo: 'bem', bemId: 'b1' } }),
      mov({ id: 'a2', pagamento: { tipo: 'quotas', empresaPessoaId: 'outra', quotas: 10, valor: 10 } }),
    ];
    const integ = derivarEventosDaAlteracao({ movimentos: movs, empresaPessoaId: PR })
      .find((e) => e.flagNome === 'evento_integralizacao');
    expect(integ?.evidencia).toBe('2 aporte(s) integralizado(s) com bens, quotas de outra sociedade');
  });

  it('deriva cessão e mudança de sócios da mesma reorganização', () => {
    const movs = [
      ...constituicao,
      mov({ id: 'x1', tipo: 'cessao', origemPessoaId: ANA, destinoPessoaId: HOLDING, quotas: 436337, valor: 436337 }),
      mov({ id: 'x2', tipo: 'cessao', origemPessoaId: BRUNO, destinoPessoaId: HOLDING, quotas: 436337, valor: 436337 }),
    ];
    const eventos = derivarEventosDaAlteracao({
      movimentos: movs,
      empresaPessoaId: PR,
      baseline: baselineDoContratoSocial,
      cpfCnpjPorPessoaId: CPFS,
    });
    expect(eventos.map((e) => e.flagNome)).toEqual(['evento_cessao_quotas', 'evento_mudanca_socios']);
    expect(eventos[0].evidencia).toBe('2 cessão(ões) somando 872.674 quotas');
    // Um ingresso (a holding) e duas retiradas (os fundadores), sem marcação.
    expect(eventos[1].evidencia).toBe('1 ingresso(s) e 2 retirada(s) no quadro societário');
  });

  it('a cessão que não muda o elenco de sócios não vira mudança de sócios', () => {
    const movs = [
      ...constituicao,
      mov({ id: 'x1', tipo: 'cessao', origemPessoaId: ANA, destinoPessoaId: BRUNO, quotas: 1000, valor: 1000 }),
    ];
    expect(nomes(movs)).toEqual(['evento_cessao_quotas']);
  });

  it('endereço e administração saem do audit_logs, não do livro', () => {
    const mudancas: MudancaDeCadastro[] = [
      { entityType: 'pessoa', entityId: PR, action: 'updated', campos: ['endereco_cep'] },
      { entityType: 'administracao', entityId: 'adm-1', action: 'created', campos: [] },
      // Ruído que não é evento nenhum: outro campo da PJ, e outra entidade.
      { entityType: 'pessoa', entityId: PR, action: 'updated', campos: ['objeto_social'] },
      { entityType: 'bem', entityId: 'bem-1', action: 'updated', campos: ['vlr_contabil'] },
    ];
    expect(
      derivarEventosDaAlteracao({
        movimentos: constituicao,
        empresaPessoaId: PR,
        pjPessoaId: PR,
        mudancas,
      }).map((e) => e.flagNome),
    ).toEqual(['evento_alteracao_endereco', 'evento_mudanca_administracao']);
  });

  it('ignora o endereço de OUTRA pessoa que não a PJ do contrato', () => {
    const mudancas: MudancaDeCadastro[] = [
      { entityType: 'pessoa', entityId: ANA, action: 'updated', campos: ['endereco_cep'] },
    ];
    expect(
      derivarEventosDaAlteracao({
        movimentos: constituicao, empresaPessoaId: PR, pjPessoaId: PR, mudancas,
      }),
    ).toEqual([]);
  });

  // --- O baseline de ESTADO (D2): o "antes" é o que a peça publicou -----------
  //
  // O defeito 3 do ensaio: validar um contrato social não carimbava nada, então os
  // movimentos de constituição nunca entravam nos formalizados e o "antes" de toda
  // primeira alteração era o conjunto vazio. Nascia "aumento de capital de
  // R$ 0,00" nas duas empresas e "2 ingresso(s)" onde ninguém ingressou.

  /** A constituição como ela está antes do carimbo: no livro, sem documento. */
  const constituicaoSemCarimbo = [
    mov({ id: 'c1', destinoPessoaId: ANA, quotas: 436337, valor: 436337 }),
    mov({ id: 'c2', destinoPessoaId: BRUNO, quotas: 436337, valor: 436337 }),
  ];

  it('o capital anterior sai do snapshot, e não da projeção dos formalizados', () => {
    const movs = [
      ...constituicaoSemCarimbo,
      mov({ id: 'a1', destinoPessoaId: ANA, quotas: 1681074, valor: 1681074, pagamento: { tipo: 'bem', bemId: 'b1' } }),
      mov({ id: 'a2', destinoPessoaId: BRUNO, quotas: 1681074, valor: 1681074, pagamento: { tipo: 'bem', bemId: 'b2' } }),
    ];
    const aumento = derivarEventosDaAlteracao({
      movimentos: movs,
      empresaPessoaId: PR,
      baseline: baselineDoContratoSocial,
      cpfCnpjPorPessoaId: CPFS,
    }).find((e) => e.flagNome === 'evento_aumento_capital');
    // Sem baseline isto dizia "de R$ 0,00 para R$ 4.234.822,00".
    expect(aumento?.evidencia).toBe('aumento de capital de R$ 872.674,00 para R$ 4.234.822,00');
  });

  it('o capital que NÃO mudou não vira aumento', () => {
    // A proprietária do ensaio: as quotas trocaram de mão, o capital ficou igual.
    // Antes, o "de R$ 0,00 para" ligava a resolução de aumento numa empresa cujo
    // capital não se moveu.
    const movs = [
      ...constituicao,
      mov({ id: 'x1', tipo: 'cessao', origemPessoaId: ANA, destinoPessoaId: HOLDING, quotas: 436337, valor: 436337 }),
    ];
    expect(
      derivarEventosDaAlteracao({
        movimentos: movs,
        empresaPessoaId: PR,
        baseline: baselineDoContratoSocial,
        cpfCnpjPorPessoaId: CPFS,
      }).map((e) => e.flagNome),
    ).toEqual(['evento_cessao_quotas', 'evento_mudanca_socios']);
  });

  it('sem baseline não inventa ingresso: o silêncio é recuperável, o evento falso não', () => {
    // Antes, os dois fundadores da constituição apareciam como "2 ingresso(s)"
    // numa empresa onde ninguém ingressou. Os aportes deles seguem pendentes (é
    // verdade: nada os carimbou), mas o quadro não se declara mudado por adivinhação.
    expect(
      derivarEventosDaAlteracao({
        movimentos: constituicaoSemCarimbo,
        empresaPessoaId: PR,
        cpfCnpjPorPessoaId: CPFS,
      }).map((e) => e.flagNome),
    ).not.toContain('evento_mudanca_socios');
  });

  it('quadro vivo com pessoa sem CPF/CNPJ não deriva mudança de sócios', () => {
    // Titular sem pessoa cadastrada: o documento vem vazio dos dois lados, e casar
    // por vazio juntaria pessoas diferentes.
    const movs = [
      ...constituicao,
      mov({ id: 'x1', tipo: 'cessao', origemPessoaId: ANA, destinoPessoaId: 'pessoa-sem-cadastro', quotas: 436337, valor: 436337 }),
    ];
    expect(
      derivarEventosDaAlteracao({
        movimentos: movs,
        empresaPessoaId: PR,
        baseline: baselineDoContratoSocial,
        cpfCnpjPorPessoaId: CPFS,
      }).map((e) => e.flagNome),
    ).toEqual(['evento_cessao_quotas']);
  });

  it('baseline sem quadro (snapshot antigo) não deriva mudança de sócios, mas ainda dá o capital', () => {
    const movs = [
      ...constituicao,
      mov({ id: 'x1', tipo: 'cessao', origemPessoaId: ANA, destinoPessoaId: HOLDING, quotas: 436337, valor: 436337 }),
      mov({ id: 'a1', destinoPessoaId: BRUNO, quotas: 1000, valor: 1000 }),
    ];
    const eventos = derivarEventosDaAlteracao({
      movimentos: movs,
      empresaPessoaId: PR,
      baseline: { capitalAnterior: 872674, cpfCnpjDosSocios: null },
      cpfCnpjPorPessoaId: CPFS,
    });
    expect(eventos.map((e) => e.flagNome)).toEqual([
      'evento_aumento_capital', 'evento_integralizacao', 'evento_cessao_quotas',
    ]);
    expect(eventos[0].evidencia).toBe('aumento de capital de R$ 872.674,00 para R$ 873.674,00');
  });

  it('ignora os movimentos das outras empresas', () => {
    const movs = [
      ...constituicao,
      mov({ id: 'outra', empresaPessoaId: 'empresa-controladora', quotas: 999, valor: 999 }),
    ];
    expect(nomes(movs)).toEqual([]);
  });
});

describe('consequências que saem de graça da projeção', () => {
  const reorganizada = [
    ...constituicao,
    mov({ id: 'x1', tipo: 'cessao', origemPessoaId: ANA, destinoPessoaId: HOLDING, quotas: 436337, valor: 436337 }),
    mov({ id: 'x2', tipo: 'cessao', origemPessoaId: BRUNO, destinoPessoaId: HOLDING, quotas: 436337, valor: 436337 }),
  ];

  it('unipessoalidade é a contagem do quadro final, e não uma marcação', () => {
    expect(ficaUnipessoal(constituicao, PR)).toBe(false);
    expect(ficaUnipessoal(reorganizada, PR)).toBe(true);
  });

  it('administrador não sócio é quem administra e não está na projeção final', () => {
    expect(administradoresNaoSocios(constituicao, PR, [ANA, BRUNO])).toEqual([]);
    expect(administradoresNaoSocios(reorganizada, PR, [ANA, BRUNO])).toEqual([ANA, BRUNO]);
  });
});
