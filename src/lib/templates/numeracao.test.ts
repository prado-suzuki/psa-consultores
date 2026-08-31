import { describe, it, expect } from 'vitest';
import { numerarBlocos, refsNumeracao, rotulosNumeracao, unirBlocos } from './numeracao';
import { gerarDocumento } from './index';
import type { Bloco, Template } from './types';

const bloco = (id: string, tipo: Bloco['tipo'], conteudo: string, extra: Partial<Bloco> = {}): Bloco => ({
  id,
  tipo,
  conteudo,
  obrigatorio: true,
  ...extra,
});

describe('numerarBlocos', () => {
  it('numera capítulos em romano e cláusulas em ordinal feminino contínuo', () => {
    const numerados = numerarBlocos([
      bloco('c1', 'capitulo', 'Denominação'),
      bloco('cl1', 'clausula', 'A sociedade girará sob o nome X.'),
      bloco('cl2', 'clausula', 'A sede será em Y.'),
      bloco('c2', 'capitulo', 'Objeto Social'),
      bloco('cl3', 'clausula', 'O objeto será Z.'),
    ]);
    expect(numerados[0].conteudo).toBe('*CAPÍTULO I*\nDenominação');
    expect(numerados[1].conteudo).toBe('*CLÁUSULA PRIMEIRA:* A sociedade girará sob o nome X.');
    expect(numerados[2].conteudo).toBe('*CLÁUSULA SEGUNDA:* A sede será em Y.');
    expect(numerados[3].conteudo).toBe('*CAPÍTULO II*\nObjeto Social');
    // contínua: não reseta ao trocar de capítulo
    expect(numerados[4].conteudo).toBe('*CLÁUSULA TERCEIRA:* O objeto será Z.');
  });

  it('parágrafo solitário vira Parágrafo Único', () => {
    const numerados = numerarBlocos([
      bloco('cl', 'clausula', 'Caput.'),
      bloco('p1', 'paragrafo', 'Texto do parágrafo.'),
    ]);
    expect(numerados[1].conteudo).toBe('*Parágrafo Único:* Texto do parágrafo.');
  });

  it('parágrafos consecutivos ganham ordinais masculinos resetando por cláusula', () => {
    const numerados = numerarBlocos([
      bloco('cl1', 'clausula', 'Capital.'),
      bloco('p1', 'paragrafo', 'Responsabilidade.'),
      bloco('p2', 'paragrafo', 'Integralização.'),
      bloco('cl2', 'clausula', 'Administração.'),
      bloco('p3', 'paragrafo', 'Vedação.'),
    ]);
    expect(numerados[1].conteudo).toBe('*Parágrafo Primeiro:* Responsabilidade.');
    expect(numerados[2].conteudo).toBe('*Parágrafo Segundo:* Integralização.');
    expect(numerados[4].conteudo).toBe('*Parágrafo Único:* Vedação.');
  });

  it('blocos livres (ou sem tipo) passam intactos', () => {
    const numerados = numerarBlocos([
      bloco('a', 'livre', 'Preâmbulo.'),
      bloco('b', undefined, 'Bloco legado.'),
    ]);
    expect(numerados[0].conteudo).toBe('Preâmbulo.');
    expect(numerados[1].conteudo).toBe('Bloco legado.');
  });

  it('reinicia a série de cláusulas a partir do bloco marcado', () => {
    const blocos = [
      bloco('res1', 'clausula', 'Primeira resolução.'),
      bloco('res2', 'clausula', 'Segunda resolução.'),
      bloco('cabecalho', 'livre', 'CONSOLIDAÇÃO', { reiniciaNumeracao: true }),
      bloco('cl1', 'clausula', 'Denominação.'),
      bloco('cl2', 'clausula', 'Sede.'),
    ];

    expect(numerarBlocos(blocos).map((b) => b.conteudo)).toEqual([
      '*CLÁUSULA PRIMEIRA:* Primeira resolução.',
      '*CLÁUSULA SEGUNDA:* Segunda resolução.',
      'CONSOLIDAÇÃO',
      '*CLÁUSULA PRIMEIRA:* Denominação.',
      '*CLÁUSULA SEGUNDA:* Sede.',
    ]);
    expect(rotulosNumeracao(blocos)).toEqual([
      'CLÁUSULA PRIMEIRA',
      'CLÁUSULA SEGUNDA',
      null,
      'CLÁUSULA PRIMEIRA',
      'CLÁUSULA SEGUNDA',
    ]);
  });

  it('reinicia capítulos junto com as cláusulas', () => {
    const numerados = numerarBlocos([
      bloco('cap-res', 'capitulo', 'Alterações'),
      bloco('res', 'clausula', 'Resolução.'),
      bloco('cabecalho', 'livre', 'CONSOLIDAÇÃO', { reiniciaNumeracao: true }),
      bloco('cap-consolidado', 'capitulo', 'Denominação'),
      bloco('cl-consolidado', 'clausula', 'A sociedade gira sob o nome X.'),
    ]);

    expect(numerados[2].conteudo).toBe('CONSOLIDAÇÃO');
    expect(numerados[3].conteudo).toBe('*CAPÍTULO I*\nDenominação');
    expect(numerados[4].conteudo).toBe('*CLÁUSULA PRIMEIRA:* A sociedade gira sob o nome X.');
  });

  it('mantém o comportamento contínuo quando nenhum bloco tem a marca', () => {
    const numerados = numerarBlocos([
      bloco('cap1', 'capitulo', 'Primeiro capítulo'),
      bloco('cl1', 'clausula', 'Primeira cláusula.'),
      bloco('livre', 'livre', 'Interlúdio.'),
      bloco('cap2', 'capitulo', 'Segundo capítulo'),
      bloco('cl2', 'clausula', 'Segunda cláusula.'),
    ]);

    expect(numerados[3].conteudo).toBe('*CAPÍTULO II*\nSegundo capítulo');
    expect(numerados[4].conteudo).toBe('*CLÁUSULA SEGUNDA:* Segunda cláusula.');
  });
});

describe('refsNumeracao', () => {
  it('produz a forma textual de referência da MESMA passada que numera', () => {
    const refs = refsNumeracao([
      bloco('c1', 'capitulo', 'Capital'),
      bloco('cl1', 'clausula', 'Caput.'),
      bloco('p1', 'paragrafo', 'Responsabilidade.'),
      bloco('p2', 'paragrafo', 'Integralização.'),
      bloco('cl2', 'clausula', 'Outro caput.'),
      bloco('p3', 'paragrafo', 'Sozinho.'),
      bloco('l', 'livre', 'Fecho.'),
    ]);
    expect(refs).toEqual([
      'Capítulo I',
      'Cláusula Primeira',
      'parágrafo primeiro',
      'parágrafo segundo',
      'Cláusula Segunda',
      'parágrafo único',
      null,
    ]);
  });

  it('resolve referências nas séries anterior e posterior ao reinício', () => {
    const template: Template = {
      id: 'duas-series',
      nome: 'alteração e consolidação',
      blocos: [
        bloco('res1', 'clausula', 'Primeira resolução.', { ancora: 'resolucao_sede' }),
        bloco('res2', 'clausula', 'Ver {{ refs.resolucao_sede }}.'),
        bloco('cabecalho', 'livre', 'CONSOLIDAÇÃO', { reiniciaNumeracao: true }),
        bloco('denominacao', 'clausula', 'Denominação.', { ancora: 'denominacao' }),
        bloco('sede', 'clausula', 'Ver {{ refs.denominacao }}.'),
      ],
    };

    expect(gerarDocumento(template, {})).toBe(
      '*CLÁUSULA PRIMEIRA:* Primeira resolução.\n\n' +
        '*CLÁUSULA SEGUNDA:* Ver Cláusula Primeira.\n\n' +
        'CONSOLIDAÇÃO\n\n' +
        '*CLÁUSULA PRIMEIRA:* Denominação.\n\n' +
        '*CLÁUSULA SEGUNDA:* Ver Cláusula Primeira.',
    );
  });
});

describe('unirBlocos', () => {
  it('parágrafo cola na cláusula com quebra simples; demais separam com linha em branco', () => {
    const texto = unirBlocos([
      bloco('cl', 'clausula', 'CLÁUSULA PRIMEIRA: Caput.'),
      bloco('p', 'paragrafo', 'Parágrafo Único: Detalhe.'),
      bloco('cl2', 'clausula', 'CLÁUSULA SEGUNDA: Outro caput.'),
    ]);
    expect(texto).toBe(
      'CLÁUSULA PRIMEIRA: Caput.\nParágrafo Único: Detalhe.\n\nCLÁUSULA SEGUNDA: Outro caput.',
    );
  });
});

describe('gerarDocumento com numeração', () => {
  it('a numeração reflete só os blocos que entraram (o caso "Parágrafo Único")', () => {
    const template: Template = {
      id: 't',
      nome: 'teste',
      blocos: [
        bloco('cl', 'clausula', 'O capital será de {{ capital }}.'),
        bloco('p1', 'paragrafo', 'A responsabilidade é restrita.'),
        bloco('p2', 'paragrafo', 'Bens integralizados.', { obrigatorio: false, flagsRequeridas: ['tem_imovel'] }),
      ],
    };
    const ctx = { capital: 'R$ 100,00' };

    // Com a flag: dois parágrafos numerados.
    expect(gerarDocumento(template, ctx, ['tem_imovel'])).toBe(
      '*CLÁUSULA PRIMEIRA:* O capital será de R$ 100,00.\n' +
        '*Parágrafo Primeiro:* A responsabilidade é restrita.\n' +
        '*Parágrafo Segundo:* Bens integralizados.',
    );

    // Sem a flag: o sobrevivente vira Parágrafo Único — sem renumeração manual.
    expect(gerarDocumento(template, ctx)).toBe(
      '*CLÁUSULA PRIMEIRA:* O capital será de R$ 100,00.\n*Parágrafo Único:* A responsabilidade é restrita.',
    );
  });
});
