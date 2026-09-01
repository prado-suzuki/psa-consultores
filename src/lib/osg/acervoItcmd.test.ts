import { describe, expect, it } from 'vitest';
import { derivarValoresDoBem } from '@/lib/osg/valoresDoBem';
import {
  numeroParaDecimal,
  totalizarAcervo,
  type ImovelDoAcervo,
} from '@/lib/osg/acervoItcmd';

// O ITR entra como as outras duas métricas: na matrícula, em `vlr_imposto_anual`.
type Mat = {
  vlr_contabil: number | null;
  vlr_mercado: number | null;
  vlr_imposto_anual?: number | null;
};

const imovel = (
  id: string,
  matriculas: Mat[],
  itr: number | null = null,
  imovelRural: string | null = null,
): ImovelDoAcervo => ({
  id,
  referencia: id,
  denominacao: id,
  imovelRural,
  valores: derivarValoresDoBem(
    { vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: null },
    matriculas.map((m, i) => ({
      vlr_contabil: m.vlr_contabil,
      vlr_mercado: m.vlr_mercado,
      // o ITR do imóvel fica na primeira matrícula, para o total do cenário ser
      // exatamente o valor informado no caso de teste
      vlr_imposto_anual: m.vlr_imposto_anual ?? (i === 0 ? itr : null),
    })),
  ),
});

describe('acervo do ITCD — totais por cenário', () => {
  it('soma cada cenário e diz quantos imóveis contribuíram', () => {
    const acervo = totalizarAcervo([
      imovel('A', [{ vlr_contabil: 558_413.55, vlr_mercado: 900_000 }], 10_000),
      imovel('B', [{ vlr_contabil: 241_586.45, vlr_mercado: null }], null),
    ]);
    expect(acervo.contabil).toEqual({
      total: '800000.00', totalFiscal: '800000.00', comValor: 2, semValor: 0,
      ambiguos: 0, unidades: 2, unidade: 'bem', semValorNomes: [], ambiguosNomes: [],
    });
    // Mercado tem um só imóvel com valor: o total é PARCIAL, se declara assim, e NÃO
    // serve de base — `totalFiscal` nulo com `total` preenchido é exatamente esse caso.
    expect(acervo.mercado).toEqual({
      total: '900000.00', totalFiscal: null, comValor: 1, semValor: 1,
      ambiguos: 0, unidades: 2, unidade: 'imóvel', semValorNomes: ['B · B'], ambiguosNomes: [],
    });
    expect(acervo.itr).toEqual({
      total: '10000.00', totalFiscal: null, comValor: 1, semValor: 1,
      ambiguos: 0, unidades: 2, unidade: 'imóvel', semValorNomes: ['B · B'], ambiguosNomes: [],
    });
  });

  it('cenário sem nenhum valor devolve total nulo: ausência não é R$ 0,00', () => {
    // É o estado real do sandbox hoje — mercado vazio em 26 de 26 matrículas e
    // ITR vazio em qualquer campo. Zero e ausência são coisas diferentes.
    const acervo = totalizarAcervo([
      imovel('A', [{ vlr_contabil: 100, vlr_mercado: null }]),
      imovel('B', [{ vlr_contabil: null, vlr_mercado: null }]),
    ]);
    expect(acervo.mercado.total).toBeNull();
    expect(acervo.itr.total).toBeNull();
    expect(acervo.contabil.total).toBe('100.00');
    // Zero informado continua sendo um valor, e conta como preenchido.
    const comZero = totalizarAcervo([imovel('A', [{ vlr_contabil: 0, vlr_mercado: null }])]);
    expect(comZero.contabil).toEqual({
      total: '0.00', totalFiscal: '0.00', comValor: 1, semValor: 0,
      ambiguos: 0, unidades: 1, unidade: 'bem', semValorNomes: [], ambiguosNomes: [],
    });
  });

  it('o ITR soma as matrículas, igual aos outros dois cenários', () => {
    // `vlr_imposto_anual` guarda o valor DECLARADO no ITR, apesar do nome. A
    // regra é a mesma do contábil e do mercado, sem exceção.
    const acervo = totalizarAcervo([
      imovel('A', [
        { vlr_contabil: 1, vlr_mercado: null, vlr_imposto_anual: 7_162_722.78 },
        { vlr_contabil: 2, vlr_mercado: null, vlr_imposto_anual: 1_833_039.19 },
      ]),
    ]);
    expect(acervo.itr).toEqual({
      total: '8995761.97', totalFiscal: '8995761.97', comValor: 1, semValor: 0,
      ambiguos: 0, unidades: 1, unidade: 'imóvel', semValorNomes: [], ambiguosNomes: [],
    });
  });

  it('número fora da escala de 4 casas é recusado, não truncado em silêncio', () => {
    expect(numeroParaDecimal(558_413.55)).toBe('558413.55');
    expect(numeroParaDecimal(0)).toBe('0');
    expect(() => numeroParaDecimal(0.000_01)).toThrow(/escala/i);
    expect(() => numeroParaDecimal(1e21)).toThrow(/escala/i);
    expect(() => numeroParaDecimal(Number.NaN)).toThrow(/finito/i);
  });

  it('SOMA PARCIAL nao vira base: imovel com matricula sem valor fica de fora', () => {
    // O caso do parecer. Duas matriculas, uma sem valor contabil: a soma de uma
    // parcela e MENOR que o acervo real, e usa-la como base apuraria imposto a menos
    // sem nada dizer que faltou matricula. O imovel entra em `semValor`, o cenario
    // fica indisponivel, e a calculadora se recusa a gravar dizendo o que falta.
    const parcial = {
      id: 'IR-P',
      referencia: 'IR-P',
      denominacao: 'Fazenda desmembrada',
      imovelRural: null,
      valores: derivarValoresDoBem(
        { vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: null },
        [
          { vlr_contabil: 558_413.55, vlr_mercado: 900_000, vlr_imposto_anual: null },
          { vlr_contabil: null, vlr_mercado: 400_000, vlr_imposto_anual: null },
        ],
      ),
    };

    const totais = totalizarAcervo([parcial]);
    // Contabil: parcial, entao nao ha base.
    expect(totais.contabil.total).toBeNull();
    expect(totais.contabil.comValor).toBe(0);
    expect(totais.contabil.semValor).toBe(1);
    // Mercado: as duas matriculas tem valor, entao a soma vale.
    expect(totais.mercado.total).toBe('1300000.00');
    expect(totais.mercado.totalFiscal).toBe('1300000.00');
    expect(totais.mercado.comValor).toBe(1);

    // O CASO QUE O PARECER PEGOU: com OUTRO imovel completo do lado, o total deixa de
    // ser nulo — ele passa a ser a soma do que sobrou, e antes isso valia como base. O
    // imovel incompleto simplesmente desaparecia do acervo.
    const comVizinhoCompleto = totalizarAcervo([
      parcial,
      imovel('IR-OK', [{ vlr_contabil: 100, vlr_mercado: 100 }], 100),
    ]);
    expect(comVizinhoCompleto.contabil.total).toBe('100.00');
    expect(comVizinhoCompleto.contabil.semValor).toBe(1);
    // E e aqui que ele para: acervo com imovel de fora nao e base.
    expect(comVizinhoCompleto.contabil.totalFiscal).toBeNull();
  });

  it('UMA DITR COBRE VARIAS MATRICULAS: as irmas vazias nao bloqueiam', () => {
    // O caso real do Agro Aliança, e a razao de existir do agrupamento. A DITR do CIB
    // 3049863-5 declara UM valor de terra nua (13.945.347,75) para as matriculas 64.514,
    // 64.515 e 64.516 — tres bens no cadastro. O valor fica lancado num deles e os
    // irmaos ficam vazios, porque a Receita nunca reparte por matricula.
    //
    // Contando BENS, isso aparecia como "3 de 13 sem valor de ITR" e travava a gravacao
    // de um acervo cujo total estava certo. Contando IMOVEIS, o acervo esta completo.
    const grupo = '9500179097937'; // codigo do imovel no Incra, da propria DITR
    const acervo = totalizarAcervo([
      imovel('64.514', [{ vlr_contabil: 1_200_000, vlr_mercado: 41_030_108.60 }], 13_945_347.75, grupo),
      imovel('64.515', [{ vlr_contabil: 1_200_000, vlr_mercado: null }], null, grupo),
      imovel('64.516', [{ vlr_contabil: 1_200_000, vlr_mercado: null }], null, grupo),
      imovel('2.531', [{ vlr_contabil: 150_000, vlr_mercado: 945_735 }], 945_735, '9999545572346'),
    ]);

    // DOIS imoveis, nao quatro bens.
    expect(acervo.itr.unidades).toBe(2);
    expect(acervo.itr.semValor).toBe(0);
    expect(acervo.itr.ambiguos).toBe(0);
    // E o total e o valor declarado, uma vez por imovel — nao a soma dos preenchidos
    // nem tres vezes o mesmo numero.
    expect(acervo.itr.totalFiscal).toBe('14891082.75'); // 13.945.347,75 + 945.735,00
    expect(acervo.mercado.totalFiscal).toBe('41975843.60');
    // O contabil e por matricula, e continua somando os tres: a integralizacao foi
    // individual, e e isso que o capital social reflete.
    expect(acervo.contabil.totalFiscal).toBe('3750000.00');
  });

  it('DUAS declaracoes no mesmo imovel derrubam o cenario, em vez de somar', () => {
    // O erro que a regra anterior induzia: bloqueado por "3 bens sem valor", o analista
    // copia o numero do irmao para preencher. Somar os dois infla o acervo, e nada em
    // tela diria. Agora o cenario cai e o aviso nomeia o imovel.
    const grupo = '9500179097937';
    const acervo = totalizarAcervo([
      imovel('64.514', [{ vlr_contabil: 1, vlr_mercado: null }], 13_945_347.75, grupo),
      imovel('64.515', [{ vlr_contabil: 1, vlr_mercado: null }], 13_945_347.75, grupo),
    ]);
    expect(acervo.itr.ambiguos).toBe(1);
    expect(acervo.itr.semValor).toBe(0);
    expect(acervo.itr.totalFiscal).toBeNull();
    expect(acervo.itr.ambiguosNomes).toEqual(['64.514 (2 matrículas)']);
  });

  it('bem SEM codigo de imovel e imovel proprio: falha fechada', () => {
    // Esquecer de informar o codigo nao pode virar "soma um e esconde o resto". Sem
    // chave, cada bem responde por si — e ai o vazio bloqueia, que e recuperavel.
    const acervo = totalizarAcervo([
      imovel('A', [{ vlr_contabil: 100, vlr_mercado: 100 }], 100),
      imovel('B', [{ vlr_contabil: 100, vlr_mercado: 100 }], null),
    ]);
    expect(acervo.itr.unidades).toBe(2);
    expect(acervo.itr.semValor).toBe(1);
    expect(acervo.itr.totalFiscal).toBeNull();
    expect(acervo.itr.semValorNomes).toEqual(['B · B']);
  });

  it('a soma do acervo nao passa por float', () => {
    // Duas matriculas de 100,10 e 200,20 derrubavam a apuracao: a soma em `number`
    // dava 300.29999999999995 e a fronteira do motor recusava as casas extras.
    const imovel = {
      id: 'IR-F',
      referencia: 'IR-F',
      denominacao: 'Fazenda de duas matriculas',
      imovelRural: null,
      valores: derivarValoresDoBem(
        { vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: null },
        [
          { vlr_contabil: 100.10, vlr_mercado: null, vlr_imposto_anual: null },
          { vlr_contabil: 200.20, vlr_mercado: null, vlr_imposto_anual: null },
        ],
      ),
    };
    expect(() => totalizarAcervo([imovel])).not.toThrow();
    expect(totalizarAcervo([imovel]).contabil.total).toBe('300.30');
  });
});
