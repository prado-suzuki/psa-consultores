import { describe, expect, it } from 'vitest';

import { avaliarFlags, type FlagDeclarativa } from '@/lib/templates/flags';
import { comporBlocos } from '@/lib/templates/composition';
import type { Bloco, Template } from '@/lib/templates/types';

import { fonteDeGovernanca, type EstadoDaGovernancaNaPeca } from './governancaNoContrato';

/** O estado neutro: alteração contratual sem governança em lugar nenhum. */
const PECA: EstadoDaGovernancaNaPeca = {
  temPecaBase: true,
  governancaDaBase: null,
  eventoConfirmado: false,
  orgaosNoContrato: 0,
};

const UM_ORGAO = [{ orgao: { nome: 'Conselho de Administração' } }];

describe('fonteDeGovernanca — qual regramento da Administração entra no contrato', () => {
  it('sem base e sem evento: administração simples', () => {
    // A alteração de sede num cliente que nunca teve órgão. É o caso mais comum
    // do acervo, e o que estava saindo sem administração nenhuma.
    expect(fonteDeGovernanca(PECA)).toEqual({ noContrato: '', instalada: '', alterada: '' });
  });

  it('MATRIZ PREENCHIDA NÃO É PEDIDO DE MUDANÇA: sem evento, segue a simples', () => {
    /*
     * O caso que derrubou o desenho anterior desta fonte. Alguém preenche a
     * Matriz de Alçadas hoje; amanhã se faz uma alteração de sede. Lendo o
     * cadastro, a flag acenderia, a administração simples sairia do documento, e
     * o capítulo de governança entraria com a lista vazia (sem evento, o estado
     * proposto não publica a lista viva) para ser descartado logo em seguida:
     * contrato sem administração nenhuma, por causa de um cadastro que ninguém
     * pediu para levar ao contrato.
     */
    expect(fonteDeGovernanca({ ...PECA, orgaosNoContrato: 4 }))
      .toEqual({ noContrato: '', instalada: '', alterada: '' });
  });

  it('evento confirmado numa peça sem governança registrada: instalação', () => {
    expect(fonteDeGovernanca({ ...PECA, orgaosNoContrato: 4, eventoConfirmado: true }))
      .toEqual({ noContrato: 'sim', instalada: 'sim', alterada: '' });
  });

  it('a base já publicava os órgãos: governança, e a redação é a de alteração', () => {
    // Sem evento nenhum: a alteração alheia (cessão, sede) republica o capítulo
    // que o contrato registrado tem. Tirá-lo seria revogar a governança em
    // silêncio, numa peça que fala de outra coisa.
    expect(fonteDeGovernanca({ ...PECA, governancaDaBase: UM_ORGAO }))
      .toEqual({ noContrato: 'sim', instalada: '', alterada: 'sim' });
  });

  it('base com governança E evento: continua alteração, não instalação', () => {
    expect(fonteDeGovernanca({ ...PECA, governancaDaBase: UM_ORGAO, eventoConfirmado: true }))
      .toEqual({ noContrato: 'sim', instalada: '', alterada: 'sim' });
  });

  it('base com a lista VAZIA vale o mesmo que base sem a lista', () => {
    // `[]` é a peça que conhecia a governança e não tinha órgão; `null` é a peça
    // anterior à frente. As duas dizem a mesma coisa ao contrato: não há capítulo
    // de órgãos para republicar.
    expect(fonteDeGovernanca({ ...PECA, governancaDaBase: [] }))
      .toEqual({ noContrato: '', instalada: '', alterada: '' });
  });

  it('na constituição quem decide é o cadastro, porque não há base', () => {
    const constituicao = { ...PECA, temPecaBase: false };
    expect(fonteDeGovernanca({ ...constituicao, orgaosNoContrato: 3 }))
      .toEqual({ noContrato: 'sim', instalada: 'sim', alterada: '' });
    expect(fonteDeGovernanca(constituicao))
      .toEqual({ noContrato: '', instalada: '', alterada: '' });
  });
});

/* --- Do catálogo ao documento, que é onde o defeito aparecia --------------- */

/** As quatro linhas de `tmpl_flag` com `entidade = 'governanca'`, como estão no banco. */
const CATALOGO: FlagDeclarativa[] = [
  { nome: 'governanca_por_orgaos', entidade: 'governanca', campo: 'noContrato', valor: 'sim' },
  { nome: 'administracao_simples', entidade: 'governanca', campo: 'noContrato', valor: '' },
  { nome: 'governanca_instalada', entidade: 'governanca', campo: 'instalada', valor: 'sim' },
  { nome: 'governanca_alterada', entidade: 'governanca', campo: 'alterada', valor: 'sim' },
];

const bloco = (id: string, flags?: string[], obrigatorio = false): Bloco =>
  ({ id, conteudo: id, flagsRequeridas: flags, obrigatorio });

/** O Capítulo da Administração dos dois modelos societários, em miniatura. */
const MODELO: Template = {
  id: 'societario',
  nome: 'Contrato Social',
  blocos: [
    bloco('capitulo-administracao', undefined, true),
    bloco('clausula-simples', ['administracao_simples', 'e_alteracao']),
    bloco('paragrafo-simples-1', ['administracao_simples']),
    bloco('vedacao-substituicao', ['administracao_simples']),
    bloco('composicao-do-conselho', ['governanca_por_orgaos']),
    bloco('competencias', ['governanca_por_orgaos']),
    bloco('resolucao-instalacao', ['governanca_por_orgaos', 'governanca_instalada', 'evento_governanca']),
    bloco('resolucao-alteracao', ['governanca_por_orgaos', 'governanca_alterada', 'evento_governanca']),
  ],
};

const compor = (estado: EstadoDaGovernancaNaPeca, outras: string[] = ['e_alteracao']) =>
  comporBlocos(MODELO, [...avaliarFlags(CATALOGO, { governanca: fonteDeGovernanca(estado) }), ...outras])
    .map((b) => b.id);

describe('o Capítulo da Administração nunca sai vazio nem em dobro', () => {
  it('sem governança, o capítulo sai com o regramento simples', () => {
    expect(compor(PECA)).toEqual([
      'capitulo-administracao', 'clausula-simples', 'paragrafo-simples-1', 'vedacao-substituicao',
    ]);
  });

  it('com governança instalada nesta peça, sai o dos órgãos e a resolução da instalação', () => {
    const blocos = compor(
      { ...PECA, orgaosNoContrato: 4, eventoConfirmado: true },
      ['e_alteracao', 'evento_governanca'],
    );
    expect(blocos).toEqual([
      'capitulo-administracao', 'composicao-do-conselho', 'competencias', 'resolucao-instalacao',
    ]);
  });

  it('com governança já registrada, a resolução é a da alteração', () => {
    const blocos = compor(
      { ...PECA, governancaDaBase: UM_ORGAO, eventoConfirmado: true },
      ['e_alteracao', 'evento_governanca'],
    );
    expect(blocos).toContain('resolucao-alteracao');
    expect(blocos).not.toContain('resolucao-instalacao');
  });

  it('a peça alheia republica o capítulo de órgãos SEM resolução nenhuma', () => {
    // Sem `evento_governanca`, as duas resoluções ficam de fora: a peça fala de
    // outra coisa e só carrega o capítulo que já estava no contrato.
    expect(compor({ ...PECA, governancaDaBase: UM_ORGAO })).toEqual([
      'capitulo-administracao', 'composicao-do-conselho', 'competencias',
    ]);
  });

  it('os dois regramentos NUNCA saem juntos, em cenário nenhum', () => {
    const cenarios: EstadoDaGovernancaNaPeca[] = [
      PECA,
      { ...PECA, orgaosNoContrato: 4 },
      { ...PECA, orgaosNoContrato: 4, eventoConfirmado: true },
      { ...PECA, governancaDaBase: UM_ORGAO },
      { ...PECA, governancaDaBase: [] },
      { ...PECA, temPecaBase: false },
      { ...PECA, temPecaBase: false, orgaosNoContrato: 2 },
    ];
    for (const estado of cenarios) {
      const blocos = compor(estado, ['e_alteracao', 'evento_governanca']);
      const simples = blocos.includes('clausula-simples');
      const orgaos = blocos.includes('composicao-do-conselho');
      // Um e só um: os dois juntos dão duas administrações no mesmo capítulo, e
      // nenhum dos dois dá o "CAPÍTULO IV / Administração / CAPÍTULO V" vazio.
      expect([simples, orgaos]).toContain(true);
      expect(simples && orgaos).toBe(false);
    }
  });
});
