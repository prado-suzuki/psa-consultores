import { describe, expect, it } from 'vitest';
import { simular, type EntradaSimulacao } from '@/lib/osg/itcmd/simulacao';

// A REFERÊNCIA DESTE MOTOR SÃO GUIAS EMITIDAS PELA SEFAZ, não uma planilha.
//
// Caso real de dez/2025: um casal doando a duas filhas gerou QUATRO GIAs, uma por
// par doador × donatária, com quatro DARs pagos. As bases e os impostos abaixo são
// os que constam nesses documentos. É o teste que prende a decisão de arquitetura:
// a apuração é por par, porque é assim que a SEFAZ cobra.
//
// O acervo do ato é R$ 9.541.796,00 sobre 19.083.592 quotas — meio real por quota,
// que é o que faz as bases das arestas caírem nos centavos das guias.
const casalDuasFilhas: EntradaSimulacao = {
  competencia: '2025-12',
  // Derivada da guia da faixa de 8%: (3.149.047,50 × 8% − 173.214,80) ÷ 310.
  upf: '253.90',
  totalDeQuotas: '19083592',
  totaisDoAcervo: { contabil: '9541796.00', itr: null, mercado: null },
  doadores: [{ id: 'pai', nome: 'Pai' }, { id: 'mae', nome: 'Mãe' }],
  donatarios: [{ id: 'f1', nome: 'Filha 1' }, { id: 'f2', nome: 'Filha 2' }],
  doacoes: [
    { doadorId: 'pai', donatarioId: 'f1', quotasRecebidas: '6298095', doacaoAnterior: null },
    { doadorId: 'pai', donatarioId: 'f2', quotasRecebidas: '6298095', doacaoAnterior: null },
    { doadorId: 'mae', donatarioId: 'f1', quotasRecebidas: '3243701', doacaoAnterior: null },
    { doadorId: 'mae', donatarioId: 'f2', quotasRecebidas: '3243701', doacaoAnterior: null },
  ],
};

// Santa Terezinha, competência de fevereiro de 2026: dois doadores, dois herdeiros
// partindo de zero quotas, cada doador transmitindo metade a cada donatário.
const santaTerezinha: EntradaSimulacao = {
  competencia: '2026-02',
  // A UPF entra como DADO, digitada pelo analista. R$ 255,20 é a de fevereiro de
  // 2026, competência do caso.
  upf: '255.20',
  totalDeQuotas: '6649400',
  totaisDoAcervo: {
    contabil: '6649400.00',
    itr: '29155992.05',
    mercado: '322960281.82',
  },
  doadores: [{ id: 'pai', nome: 'Pai' }, { id: 'mae', nome: 'Mãe' }],
  donatarios: [{ id: 'gabriel', nome: 'Gabriel' }, { id: 'rafael', nome: 'Rafael' }],
  doacoes: [
    { doadorId: 'pai', donatarioId: 'gabriel', quotasRecebidas: '1662350', doacaoAnterior: null },
    { doadorId: 'pai', donatarioId: 'rafael', quotasRecebidas: '1662350', doacaoAnterior: null },
    { doadorId: 'mae', donatarioId: 'gabriel', quotasRecebidas: '1662350', doacaoAnterior: null },
    { doadorId: 'mae', donatarioId: 'rafael', quotasRecebidas: '1662350', doacaoAnterior: null },
  ],
};

describe('simulação — apuração por par doador × donatário', () => {
  it('reproduz as quatro GIAs reais do casal, ao centavo', () => {
    const s = simular(casalDuasFilhas);

    expect(s.gias).toHaveLength(4);
    const porPar = new Map(
      s.gias.map((g) => [`${g.doadorId}>${g.donatarioId}`, g.porCenario.contabil]),
    );

    // As duas guias do pai, faixa de 8%.
    for (const par of ['pai>f1', 'pai>f2']) {
      expect(porPar.get(par), par).toEqual({
        base: '3149047.50', imposto: '173214.80',
      });
    }
    // As duas da mãe, faixa de 6% — base menor, e é justamente isso que a
    // apuração por par preserva.
    for (const par of ['mae>f1', 'mae>f2']) {
      expect(porPar.get(par), par).toEqual({
        base: '1621850.50', imposto: '69382.03',
      });
    }

    // O total é a soma dos quatro DARs.
    expect(s.totaisPorCenario.contabil).toBe('485193.66');

    // Dentro de cada GIA o percentual dos beneficiários fecha em 100%, que é a
    // validação do próprio sistema da SEFAZ no campo "Percentual Transmitido".
    expect(s.gias.map((g) => g.percentualDaGia)).toEqual(
      ['50.0000', '50.0000', '50.0000', '50.0000'],
    );

    // O rollup por donatária: duas guias cada, e o que ela recolhe é a soma delas.
    expect(s.linhas).toHaveLength(2);
    for (const linha of s.linhas) {
      expect(linha.numeroDeGias).toBe(2);
      expect(linha.percentual).toBe('50.0000');
      expect(linha.porCenario.contabil).toEqual({
        base: '4770898.00', imposto: '242596.83',
      });
    }
  });

  it('a base combinada cobraria R$ 120.732,02 a mais no mesmo ato', () => {
    // O contraste que justifica a arquitetura. Somar as parcelas dos dois doadores
    // numa base única por donatária empurra as duas para a faixa de 8%:
    //   4.770.898,00 × 8% − 310 UPF = 302.962,84  ×2 = 605.925,68
    // contra os 485.193,66 que a SEFAZ efetivamente cobrou em quatro guias.
    const porPar = simular(casalDuasFilhas);

    const combinado = simular({
      ...casalDuasFilhas,
      doadores: [{ id: 'casal', nome: 'Casal' }],
      doacoes: [
        { doadorId: 'casal', donatarioId: 'f1', quotasRecebidas: '9541796', doacaoAnterior: null },
        { doadorId: 'casal', donatarioId: 'f2', quotasRecebidas: '9541796', doacaoAnterior: null },
      ],
    });

    expect(combinado.totaisPorCenario.contabil).toBe('605925.68');
    expect(porPar.totaisPorCenario.contabil).toBe('485193.66');

    const delta = Number(combinado.totaisPorCenario.contabil)
      - Number(porPar.totaisPorCenario.contabil);
    expect(delta).toBeCloseTo(120732.02, 2);
  });

  it('quadro de saída do Santa Terezinha nos três cenários', () => {
    const s = simular(santaTerezinha);

    expect(s.upf).toBe('255.20');
    expect(s.linhas.map((l) => l.percentual)).toEqual(['50.0000', '50.0000']);
    expect(s.gias).toHaveLength(4);

    // Cada uma das quatro guias, com metade do acervo de cada doador.
    for (const gia of s.gias) {
      expect(gia.porCenario.contabil).toEqual({
        base: '1662350.00', imposto: '71669.00',
      });
      expect(gia.porCenario.itr).toEqual({
        base: '7288998.01', imposto: '504007.84',
      });
      expect(gia.porCenario.mercado).toEqual({
        base: '80740070.46', imposto: '6380093.64',
      });
    }

    // Rollup por donatário. A base de ITR fecha em ...,02 e não ...,03: arredondar
    // por GIA e somar é a convenção declarada (§2.3), e agora a GIA é a aresta.
    for (const linha of s.linhas) {
      expect(linha.porCenario.itr).toEqual({
        base: '14577996.02', imposto: '1008015.68',
      });
    }

    expect(s.totaisPorCenario).toEqual({
      contabil: '286676.00',
      itr: '2016031.36',
      mercado: '25520374.56',
    });
    expect(s.cenariosIndisponiveis).toEqual([]);

    // Distribuir mais quotas do que existem é recusado, não escalado a >100%.
    expect(() => simular({
      ...santaTerezinha,
      donatarios: [...santaTerezinha.donatarios, { id: 'x', nome: 'X' }],
      doacoes: [
        ...santaTerezinha.doacoes,
        { doadorId: 'pai', donatarioId: 'x', quotasRecebidas: '1', doacaoAnterior: null },
      ],
    })).toThrow(/quotas/i);
  });

  it('cenário sem valor informado sai como indisponível, nunca como zero', () => {
    // Um cenário que soma parcial e se apresenta como total é a pior saída
    // possível numa ferramenta de decisão.
    const s = simular({
      ...santaTerezinha,
      totaisDoAcervo: { contabil: '6649400.00', itr: null, mercado: null },
    });
    expect(s.cenariosIndisponiveis).toEqual(['itr', 'mercado']);
    expect(s.totaisPorCenario.itr).toBeNull();
    expect(s.totaisPorCenario.mercado).toBeNull();
    expect(s.gias[0].porCenario.itr).toBeNull();
    expect(s.linhas[0].porCenario.itr).toBeNull();
    expect(s.gias[0].porCenario.contabil).toEqual({
      base: '1662350.00', imposto: '71669.00',
    });
  });

  it('a UPF é dado de entrada: competência sem série apura igual', () => {
    // O motor não consulta série nenhuma. Uma competência que não existe em lista
    // interna apura normalmente, porque o valor vem do campo — é isto que impede a
    // ferramenta de travar no mês em que a SEFAZ/MT publica uma UPF nova.
    const s = simular({ ...santaTerezinha, competencia: '2027-04', upf: '255.20' });
    expect(s.competencia).toBe('2027-04');
    expect(s.totaisPorCenario.contabil).toBe('286676.00');

    // E UPF inválida é erro, não zero: sem ela não há faixa nem dedução.
    for (const upf of ['0', '-1', '', 'abc']) {
      expect(() => simular({ ...santaTerezinha, upf }), upf).toThrow();
    }
  });

  it('doação anterior é do PAR, e acumula só na guia daquele doador', () => {
    // O donatário já recebeu R$ 831.175 do pai e recebe agora mais 2.493.525
    // quotas dele: o devido na guia do pai é f(3.324.700) − f(831.175). A guia da
    // mãe, com o mesmo donatário, não vê nada disso — doador diferente é apuração
    // separada (Lei 10.488/2016, arts. 3º e 5º).
    const s = simular({
      ...santaTerezinha,
      totaisDoAcervo: { contabil: '6649400.00', itr: null, mercado: null },
      donatarios: [{ id: 'gabriel', nome: 'Gabriel' }],
      doacoes: [
        {
          doadorId: 'pai',
          donatarioId: 'gabriel',
          quotasRecebidas: '2493525',
          doacaoAnterior: '831175.00',
        },
        {
          doadorId: 'mae',
          donatarioId: 'gabriel',
          quotasRecebidas: '2493525',
          doacaoAnterior: null,
        },
      ],
    });

    const doPai = s.gias.find((g) => g.doadorId === 'pai');
    const daMae = s.gias.find((g) => g.doadorId === 'mae');
    expect(doPai?.porCenario.contabil).toEqual({
      base: '2493525.00', imposto: '161273.00',
    });
    // Mesma base, imposto menor: a guia da mãe parte de zero.
    expect(daMae?.porCenario.contabil).toEqual({
      base: '2493525.00', imposto: '121539.50',
    });
  });

  it('recusa aresta inconsistente em vez de apurar torto', () => {
    const base = casalDuasFilhas;

    // Doador que não está na lista: sem ele não há GIA a emitir.
    expect(() => simular({
      ...base,
      doacoes: [{
        doadorId: 'fantasma', donatarioId: 'f1', quotasRecebidas: '1', doacaoAnterior: null,
      }],
    })).toThrow(/doador desconhecido/i);

    expect(() => simular({
      ...base,
      doacoes: [{
        doadorId: 'pai', donatarioId: 'fantasma', quotasRecebidas: '1', doacaoAnterior: null,
      }],
    })).toThrow(/donatário desconhecido/i);

    // Par repetido seriam duas GIAs do mesmo doador ao mesmo beneficiário no
    // mesmo ato — que é uma, com a soma das quotas.
    expect(() => simular({
      ...base,
      doacoes: [
        { doadorId: 'pai', donatarioId: 'f1', quotasRecebidas: '10', doacaoAnterior: null },
        { doadorId: 'pai', donatarioId: 'f1', quotasRecebidas: '20', doacaoAnterior: null },
      ],
    })).toThrow(/uma GIA só/i);

    // Ato sem doador nenhum.
    expect(() => simular({ ...base, doadores: [], doacoes: [] }))
      .toThrow(/sem doador/i);
  });
});

describe('base reduzida do usufruto', () => {
  /**
   * A INSTITUICAO DE USUFRUTO do Agro Alianca, conferida contra a GIA 338021 emitida
   * em 21/05/2026 e paga em 01/06/2026.
   *
   * A direcao INVERTE: a instituinte (a filha Regina) e o doador declarante, e o
   * usufrutuario (o pai Avelino) e o beneficiario.
   */
  const instituicao = {
    competencia: '2026-05',
    upf: '260.10',
    totalDeQuotas: '9557944',
    // Quota de R$ 1,00: o acervo contabil e o proprio capital.
    totaisDoAcervo: { contabil: '9557944.00', itr: null, mercado: null },
    doadores: [{ id: 'regina', nome: 'Regina' }],
    donatarios: [{ id: 'avelino', nome: 'Avelino' }],
    doacoes: [{
      doadorId: 'regina',
      donatarioId: 'avelino',
      quotasRecebidas: '1284747',
      doacaoAnterior: null,
    }],
  };

  it('70% reproduz a GIA 338021 ao centavo', () => {
    const s = simular({ ...instituicao, pctDaBase: '70.00' });

    // O demonstrativo da SEFAZ: base tributavel 899.322,90 sobre bens de
    // 1.284.747,00, com UPF de 260,10 e "Percentual de Reducao de Base: 70,00".
    expect(s.gias[0].porCenario.contabil?.base).toBe('899322.90');
    expect(s.gias[0].porCenario.contabil?.imposto).toBe('28169.92');
    expect(s.totaisPorCenario.contabil).toBe('28169.92');
  });

  it('a base integral e o padrao, e custa mais', () => {
    // Sem o campo, nada muda - e o comportamento de toda simulacao ja gravada.
    const integral = simular(instituicao);
    expect(integral.gias[0].porCenario.contabil?.base).toBe('1284747.00');
    // 1.284.747 esta na faixa de 4.000 a 10.000 UPF: 6% com deducao de 110 UPF.
    expect(integral.gias[0].porCenario.contabil?.imposto).toBe('48473.82');

    expect(simular({ ...instituicao, pctDaBase: '100.00' }).totaisPorCenario.contabil)
      .toBe('48473.82');
  });

  it('percentual fora de (0, 100] nao e percentual de base', () => {
    expect(() => simular({ ...instituicao, pctDaBase: '0' })).toThrow(/base de c/i);
    expect(() => simular({ ...instituicao, pctDaBase: '120' })).toThrow(/base de c/i);
  });
});
