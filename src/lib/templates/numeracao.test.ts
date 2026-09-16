import { describe, it, expect } from 'vitest';
import { numerarBlocos, refsNumeracao, rotulosNumeracao, unirBlocos } from './numeracao';
import { paragrafosOrfaos } from './descarte';
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

/*
 * A NUMERAÇÃO DO ACORDO DE QUOTISTAS, que é outra do contrato social.
 *
 * O contrato escreve "CLÁUSULA PRIMEIRA:" e "Parágrafo Segundo:". O Acordo
 * escreve "CLÁUSULA PRIMEIRA – Definições das expressões utilizadas neste
 * ACORDO." e "2.1". Medido no modelo da casa: 92 dos 243 parágrafos do Acordo
 * são itens decimais, e o texto se cita por eles sete vezes.
 */
describe('numeração do Acordo de Quotistas', () => {
  it('a cláusula com título usa travessão, e sem título continua com dois-pontos', () => {
    const numerados = numerarBlocos([
      bloco('c1', 'clausula', 'Para fins deste ACORDO serão adotadas as definições abaixo.',
        { tituloDocumento: 'Definições das expressões utilizadas neste ACORDO.' }),
      bloco('c2', 'clausula', 'O capital será de R$ 100,00.'),
    ]);
    expect(numerados[0].conteudo).toBe(
      '*CLÁUSULA PRIMEIRA – Definições das expressões utilizadas neste ACORDO.*\n'
      + 'Para fins deste ACORDO serão adotadas as definições abaixo.',
    );
    // Sem título, o contrato social sai exatamente como sempre saiu.
    expect(numerados[1].conteudo).toBe('*CLÁUSULA SEGUNDA:* O capital será de R$ 100,00.');
  });

  it('o item numera por cláusula e reinicia na cláusula seguinte', () => {
    const numerados = numerarBlocos([
      bloco('c1', 'clausula', 'Das QUOTAS sujeitas a este ACORDO.'),
      bloco('i1', 'item', 'Estão sujeitas ao presente ACORDO todas as QUOTAS.'),
      bloco('i2', 'item', 'As PARTES signatárias estabelecem que…'),
      bloco('c2', 'clausula', 'Do Voto.'),
      bloco('i3', 'item', 'Os QUOTISTAS se comprometem a votar…'),
    ]);
    expect(numerados.map((b) => b.conteudo.split(' ')[0]))
      .toEqual(['*CLÁUSULA', '1.1', '1.2', '*CLÁUSULA', '2.1']);
  });

  it('o item conta pela cláusula, mesmo com outro bloco no meio', () => {
    /*
     * Diferente do parágrafo de propósito. O parágrafo reseta quando a sequência
     * consecutiva é interrompida; o item não, porque "2.7" depende da CLÁUSULA
     * corrente. Uma tabela ou um bloco livre no meio de uma cláusula do Acordo
     * não pode fazer a contagem voltar a 1.
     */
    const numerados = numerarBlocos([
      bloco('c1', 'clausula', 'Do aumento do capital.'),
      bloco('i1', 'item', 'O direito dos QUOTISTAS observará o disposto abaixo.'),
      bloco('lv', 'livre', 'Quadro de subscrição:'),
      bloco('i2', 'item', 'Os QUOTISTAS farão com que a ADMINISTRAÇÃO envie o aviso.'),
    ]);
    expect(numerados[3].conteudo.split(' ')[0]).toBe('1.2');
  });

  it('cláusula desligada renumera os itens das seguintes, e é por isso que o número não vai no texto', () => {
    /*
     * O CASO QUE MOTIVOU O TIPO NOVO.
     *
     * Desmarcar lock-up faz a cláusula dele não existir, e a seguinte sobe. Com
     * o número escrito no texto do bloco, os itens continuariam "6.1" numa
     * cláusula que virou quinta, e as sete referências cruzadas do modelo
     * ("observado o item 5.5") passariam a apontar para outro lugar, caladas.
     */
    const comLockUp = numerarBlocos([
      bloco('c1', 'clausula', 'Da preferência.'),
      bloco('c2', 'clausula', 'Do lock-up.'),
      bloco('i1', 'item', 'Nenhum QUOTISTA poderá alienar suas QUOTAS.'),
    ]);
    expect(comLockUp[2].conteudo.split(' ')[0]).toBe('2.1');

    const semLockUp = numerarBlocos([
      bloco('c1', 'clausula', 'Da preferência.'),
      bloco('i1', 'item', 'Nenhum QUOTISTA poderá alienar suas QUOTAS.'),
    ]);
    expect(semLockUp[1].conteudo.split(' ')[0]).toBe('1.1');
  });

  it('o item se cita por número, e o parágrafo por extenso', () => {
    // O Acordo escreve "observado o item 5.5"; o contrato escreve "no parágrafo
    // segundo desta cláusula". Cada documento se cita como se escreve.
    const blocos = [
      bloco('c1', 'clausula', 'Das condições.'),
      bloco('i1', 'item', 'Primeiro item.'),
      bloco('p1', 'paragrafo', 'Um parágrafo.'),
    ];
    expect(refsNumeracao(blocos)).toEqual(['Cláusula Primeira', 'item 1.1', 'parágrafo único']);
    expect(rotulosNumeracao(blocos)).toEqual(['CLÁUSULA PRIMEIRA', '1.1', 'Parágrafo Único']);
  });
});

describe('os três níveis abaixo do item', () => {
  it('o subitem numera cláusula.item.ordem e reinicia a cada item', () => {
    // A Cláusula Primeira do Acordo é assim: um item de abertura e 26 subitens,
    // um por termo definido. "1.1.1 ACORDO: este ACORDO DE QUOTISTAS;"
    const numerados = numerarBlocos([
      bloco('c1', 'clausula', 'Definições.'),
      bloco('i1', 'item', 'Para fins deste ACORDO serão adotadas as definições abaixo.'),
      bloco('s1', 'subitem', 'ACORDO: este ACORDO DE QUOTISTAS;'),
      bloco('s2', 'subitem', 'QUOTAS: as QUOTAS da sociedade;'),
      bloco('i2', 'item', 'Outro item.'),
      bloco('s3', 'subitem', 'Reinicia aqui.'),
    ]);
    expect(numerados.map((b) => b.conteudo.split(' ')[0]))
      .toEqual(['*CLÁUSULA', '1.1', '1.1.1', '1.1.2', '1.2', '1.2.1']);
  });

  it('alínea sai em letra e inciso em romano, e os dois reiniciam junto', () => {
    /*
     * São DOIS tipos e não um porque o modelo usa os dois com sentidos
     * diferentes: os Considerandos e as faixas de dívida saem em letra, e as
     * hipóteses de aumento de capital saem em romano, "(I) Se aprovado em
     * REUNIÃO DE SÓCIOS…".
     */
    const numerados = numerarBlocos([
      bloco('c1', 'clausula', 'Do aumento do capital.'),
      bloco('i1', 'item', 'O aumento observará o disposto abaixo.'),
      bloco('n1', 'inciso', 'Se aprovado em REUNIÃO DE SÓCIOS pela maioria.'),
      bloco('n2', 'inciso', 'Independente de justificativa, por três quartos.'),
      bloco('i2', 'item', 'Das dívidas.'),
      bloco('a1', 'alinea', 'Dívida até R$ 100.000,00.'),
      bloco('a2', 'alinea', 'Dívida superior a R$ 100.000,00.'),
    ]);
    expect(numerados.map((b) => b.conteudo.split(' ')[0]))
      .toEqual(['*CLÁUSULA', '1.1', '(I)', '(II)', '1.2', 'a)', 'b)']);
  });

  it('a referência textual de cada nível é a do documento', () => {
    const blocos = [
      bloco('c1', 'clausula', 'Das condições.'),
      bloco('i1', 'item', 'Item.'),
      bloco('s1', 'subitem', 'Subitem.'),
      bloco('a1', 'alinea', 'Alínea.'),
      bloco('n1', 'inciso', 'Inciso.'),
    ];
    expect(refsNumeracao(blocos))
      .toEqual(['Cláusula Primeira', 'item 1.1', 'item 1.1.1', 'alínea "a"', 'inciso (II)']);
  });

  it('subitem, alínea e inciso somem se perderem a cláusula', () => {
    // Mesma regra do parágrafo órfão: sem cláusula acima, "1.1.1" seria
    // numeração de uma cláusula que não existe.
    const orfaos = paragrafosOrfaos([
      bloco('lv', 'livre', 'Preâmbulo.'),
      bloco('s1', 'subitem', 'Órfão.'),
      bloco('a1', 'alinea', 'Órfã.'),
      bloco('n1', 'inciso', 'Órfão.'),
      bloco('c1', 'clausula', 'Uma cláusula.'),
      bloco('s2', 'subitem', 'Este tem cláusula.'),
    ]);
    expect(orfaos).toEqual([false, true, true, true, false, false]);
  });
});
