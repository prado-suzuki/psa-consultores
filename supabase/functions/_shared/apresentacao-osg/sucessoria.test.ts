import { describe, expect, it } from 'vitest';

import { planoDoResumo, slidesDoCapitulo04 } from './paginacao.ts';
import {
  fmtPct, fmtQuotas, fmtReais, montaCapitulo, pctNoTexto,
  type AtoDoCapitulo, type EntradaDoCapitulo, type PessoaDoCapitulo,
} from './sucessoria.ts';

/* O gabarito é o deck da Agro Aliança validado com o cliente, na UPF de janeiro/2026 (R$ 254,36) e com
   9.557.946 quotas; o texto é o do deck, com os erros de digitação corrigidos. */

const pessoa = (id: string, nome: string, extra: Partial<PessoaDoCapitulo> = {}): PessoaDoCapitulo => ({
  id, nome, genero: null, fundador: false, filiacaoPaiId: null, filiacaoMaeId: null, ...extra,
});

const PESSOAS = [
  pessoa('AV', 'AVELINO NERI BOCOLLI', { genero: 'M', fundador: true }),
  pessoa('IR', 'IRACEMA KIELBA BOCOLLI', { genero: 'F', fundador: true }),
  pessoa('CR', 'CRISTINA KIELBA BOCOLLI BORDIGNON', { genero: 'F', filiacaoPaiId: 'AV', filiacaoMaeId: 'IR' }),
  pessoa('RE', 'REGINA KIELBA BOCOLLI VILA', { genero: 'F' }),
];
// A Regina é filha pelo PARENTESCO, e não pela filiação: os dois caminhos valem.
const PARENTESCOS = [{ pessoaId: 'RE', parenteId: 'AV', tipo: 'Filho(a)' }];

const reguas = (contabil: string, itr: string, mercado: string) => ({ contabil, itr, mercado });

const base: Omit<AtoDoCapitulo, 'id' | 'versao' | 'nome'> = {
  status: 'aprovada',
  competencia: '2026-01',
  upf: '254.36',
  totalDeQuotas: '9557946',
  acervo: reguas('9557946.00', '37574919.57', '64659680.42'),
  comReserva: false,
  origemId: null,
  doadores: [],
  donatarios: [],
  gias: [],
  usufruto: [],
  concessoes: [],
};

/** Cenário I do deck: doação da totalidade com reserva, e instituição da Regina. */
const cenarioI: AtoDoCapitulo = {
  ...base,
  id: 'V2', versao: 2, nome: 'Doação com complemento de usufruto',
  comReserva: true,
  doadores: [{
    pessoaId: 'AV', quotas: '4448500', quotasTransmitidas: '4448500', quotasFinal: '0',
    emissaoConjunta: true, conjugeId: 'IR', aporte: '0.00',
  }],
  donatarios: [
    { pessoaId: 'CR', quotasAtuais: '1483000', legitima: '1112125', disponivel: '2183848', quotasFinal: '4778973', aporte: '0.00' },
    { pessoaId: 'RE', quotasAtuais: '3626446', legitima: '1112125', disponivel: '40402', quotasFinal: '4778973', aporte: '0.00' },
  ],
  gias: [
    { doadorId: 'AV', donatarioId: 'CR', porBase: { 100: { base: reguas('3295973.00', '12957378.81', '22297318.63'), imposto: reguas('184826.24', '957738.70', '1704933.89') } } },
    { doadorId: 'AV', donatarioId: 'RE', porBase: { 100: { base: reguas('1152527.00', '4530901.48', '7796866.59'), imposto: reguas('41172.02', '283620.52', '544897.73') } } },
  ],
  usufruto: [
    { pessoaId: 'CR', papel: 'concede', quotas: '4778973', plena: '1483000', nuaReserva: '3295973', nuaInstituicao: '0', usufruto: '0' },
    { pessoaId: 'AV', papel: 'usufrui', quotas: '0', plena: '0', nuaReserva: '0', nuaInstituicao: '0', usufruto: '4874552' },
    { pessoaId: 'RE', papel: 'concede', quotas: '4778973', plena: '3200394', nuaReserva: '1152527', nuaInstituicao: '426052', usufruto: '0' },
  ],
  concessoes: [
    { deId: 'CR', paraId: 'AV', origem: 'reserva', quotas: '3295973', porBase: {} },
    { deId: 'CR', paraId: 'IR', origem: 'reserva', quotas: '3295973', porBase: {} },
    {
      deId: 'RE', paraId: 'AV', origem: 'instituicao', quotas: '426052',
      porBase: {
        100: { base: reguas('426052.00', '1674927.91', '2882249.70'), imposto: reguas('9411.28', '72516.07', '151728.38') },
        70: { base: reguas('298236.40', '1172449.53', '2017574.79'), imposto: reguas('4298.66', '42367.37', '93074.89') },
      },
    },
  ],
};

/** Cenário II do deck: primeiro a doação entre as irmãs (sem reserva). */
const doacaoEntreIrmas: AtoDoCapitulo = {
  ...base,
  id: 'V3', versao: 3, nome: 'Doação entre as irmãs',
  doadores: [{
    pessoaId: 'RE', quotas: '3626446', quotasTransmitidas: '1071723', quotasFinal: '2554723',
    emissaoConjunta: false, conjugeId: null, aporte: '0.00',
  }],
  donatarios: [
    { pessoaId: 'CR', quotasAtuais: '1483000', legitima: '535862', disponivel: '535861', quotasFinal: '2554723', aporte: '0.00' },
  ],
  gias: [
    { doadorId: 'RE', donatarioId: 'CR', porBase: { 100: { base: reguas('1071723.00', '4213238.67', '7250226.02'), imposto: reguas('36323.78', '258207.49', '501166.48') } } },
  ],
};

const segundoAto: AtoDoCapitulo = {
  ...cenarioI,
  id: 'V4', versao: 4, nome: 'Equalização prévia entre herdeiras e doação', origemId: 'V3',
};

/** Cenário III do deck: aporte do Avelino e doação integral, só com reserva. */
const cenarioIII: AtoDoCapitulo = {
  ...cenarioI,
  id: 'V6', versao: 6, nome: 'Aumento de capital e doação integral',
  totalDeQuotas: '10427946',
  acervo: reguas('10427946.00', '38444919.57', '65529680.42'),
  // O deck imprime o total da doação, não guia a guia: as duas guias repartem esse total. A da Cristina
  // é a da lei: 3.730.973,00 de base dá 219.626,24.
  gias: [
    { doadorId: 'AV', donatarioId: 'CR', porBase: { 100: { base: reguas('3730973.00', '13754993.30', '23427990.42'), imposto: reguas('219626.24', '1106540.56', '1985500.00') } } },
    { doadorId: 'AV', donatarioId: 'RE', porBase: { 100: { base: reguas('1587527.00', '5852398.95', '9968155.79'), imposto: reguas('32472.02', '304382.05', '530532.29') } } },
  ],
  doadores: [{
    pessoaId: 'AV', quotas: '5318500', quotasTransmitidas: '5318500', quotasFinal: '0',
    emissaoConjunta: true, conjugeId: 'IR', aporte: '870000.00',
  }],
  concessoes: cenarioI.concessoes.filter((c) => c.origem === 'reserva'),
};

const entrada = (cenarios: AtoDoCapitulo[][], pessoas = PESSOAS): EntradaDoCapitulo =>
  ({ cenarios, pessoas, parentescos: PARENTESCOS });

describe('formato', () => {
  it('quotas, reais e percentuais no formato do deck', () => {
    expect(fmtQuotas(9557946n)).toBe('9.557.946');
    expect(fmtReais(4448500_0000n)).toBe('R$ 4.448.500,00');
    expect(fmtPct(4448500n, 9557946n)).toBe('46,54%');
    expect(pctNoTexto(4874552n, 9557946n)).toBe('51%');
    expect(fmtPct(1n, 0n)).toBe('0,00%');
  });
});

describe('Cenário I — a doação da totalidade, com reserva e instituição', () => {
  const cap = montaCapitulo(entrada([[cenarioI]]));
  const [c] = cap.cenarios;

  it('a frase da doação e a da reserva', () => {
    const t = c.simulacao[0].tokens;
    expect(t.SIM_DOACAO).toBe(
      'Doação de 100% das quotas dos fundadores (Sr. Avelino e Sra. Iracema) para as filhas '
      + 'Cristina e Regina, com a consequente saída do fundador do quadro societário;',
    );
    expect(t.SIM_RESERVA).toMatch(/^A doação será realizada com reserva de usufruto vitalício/);
    expect(t.SIM_APORTE).toBe('');
    expect(t.SIM_TAB_TIT).toBe('Doação da totalidade das quotas dos fundadores com usufruto');
    expect(c.simulacao[0].semAporte).toBe(true);
  });

  it('a tabela: o doador primeiro, com o casal no nome, e a linha TOTAL', () => {
    const { linhas, tokens } = c.simulacao[0];
    expect(linhas[0]).toEqual({
      SIM_NOME: 'Avelino e Iracema', SIM_QT: '4.448.500', SIM_PCT: '46,54%',
      SIM_LEG: '-', SIM_DISP: '-', SIM_REC: '-', SIM_FINAL: '0', SIM_PCTF: '0,00%',
    });
    expect(linhas[1]).toMatchObject({
      SIM_NOME: 'Cristina', SIM_QT: '1.483.000', SIM_PCT: '15,52%', SIM_LEG: '1.112.125',
      SIM_DISP: '2.183.848', SIM_REC: '3.295.973', SIM_FINAL: '4.778.973', SIM_PCTF: '50,00%',
    });
    expect(tokens).toMatchObject({
      SIM_T_QT: '9.557.946', SIM_T_PCT: '100,00%', SIM_T_LEG: '2.224.250',
      SIM_T_DISP: '2.224.250', SIM_T_REC: '4.448.500', SIM_T_FINAL: '9.557.946',
    });
  });

  it('o resumo dos tributos: primeiro cenário, uma página, cartões das guias gravadas', () => {
    expect(c.resumo).toHaveLength(1);
    const [pagina] = c.resumo;
    expect(pagina.plano.comIntro).toBe(true);
    expect(pagina.plano.comNotas).toBe(true);
    expect(pagina.base100).toBe(true);
    expect(pagina.atos[0].rotulo).toBe('');
    expect(pagina.atos[0].cartoes.CT).toEqual({
      base: 'R$ 4.448.500,00',
      guias: [
        { rotulo: 'Donatária Cristina', base: 'R$ 3.295.973,00', itcd: 'R$ 184.826,24' },
        { rotulo: 'Donatária Regina', base: 'R$ 1.152.527,00', itcd: 'R$ 41.172,02' },
      ],
      itcd: 'R$ 225.998,26',
    });
    expect(pagina.atos[0].cartoes.MC.itcd).toBe('R$ 2.249.831,62');
  });

  it('o usufruto: a abertura com UMA instituinte e o quadro final', () => {
    const u = c.usufruto!;
    expect(u.tokens.US_TIT).toBe('Instituição de usufruto');
    expect(u.tokens.US_INTRO).toBe(
      'Com relação ao usufruto aos fundadores, para que atinja o percentual de 51%, será instituído '
      + 'usufruto sobre 426.052 (quatrocentas e vinte e seis mil e cinquenta e duas) quotas '
      + 'pertencentes à propriedade plena da Sra. Regina. Ao final da operação, a composição '
      + 'societária ficará estruturada da seguinte forma:',
    );
    // Quem usufrui primeiro; o casal no nome, como na doação.
    expect(u.linhas[0]).toEqual({
      US_NOME: 'Avelino e Iracema', US_QT: '0', US_PCT: '0,00%', US_PLENA: '-', US_NUA: '-',
      US_USUF: '4.874.552', US_VOTO: '51,00%',
    });
    expect(u.linhas[2]).toMatchObject({ US_NOME: 'Regina', US_PLENA: '3.200.394', US_NUA: '1.578.579', US_VOTO: '33,48%' });
    expect(u.tokens.US_T_VOTO).toBe('100,00%');
  });

  it('a tributação da instituição: as duas bases, faixa a faixa, como o deck', () => {
    const [t] = c.instituicoes;
    expect(t.TI_INTRO).toBe(
      'Abaixo, detalhamos a projeção de custos tributários (ITCD) incidentes sobre a parcela de '
      + '426.052 (quatrocentas e vinte e seis mil e cinquenta e duas) quotas. Esta etapa de '
      + 'instituição de usufruto visa complementar a reserva dos fundadores, elevando o atual '
      + 'percentual de 46,54% para 51% do capital social.',
    );
    expect(t).toMatchObject({
      TI_DE: 'Regina', TI_PARA: 'Avelino', TI_UPF_MES: 'Janeiro', TI_UPF_ANO: '2026',
      TI_UPF: 'R$ 254,36', TI_PCT: '70,00%', TI_F1_TETO: 'R$ 127.180,00', TI_F4_TETO: 'R$ 2.543.600,00',
      TI_CT_I_BASE: 'R$ 426.052,00', TI_CT_I_F1: '-', TI_CT_I_F2: 'R$ 2.543,60', TI_CT_I_F3: 'R$ 6.867,68',
      TI_CT_I_TOT: 'R$ 9.411,28',
      TI_CT_R_BASE: 'R$ 298.236,40', TI_CT_R_F3: 'R$ 1.755,06', TI_CT_R_TOT: 'R$ 4.298,66',
      TI_IT_I_F4: 'R$ 39.449,27', TI_IT_R_F4: 'R$ 9.300,57',
      TI_MC_I_F5: 'R$ 27.091,98', TI_MC_R_F4: 'R$ 60.008,09', TI_MC_R_F5: '-', TI_MC_R_TOT: 'R$ 93.074,89',
    });
    expect(cap.problemas).toEqual([]);
  });

  it('a tributação atual: a tabela da lei em reais, na UPF do cenário', () => {
    expect(cap.tributacaoAtual).toEqual({
      TA_UPF_MES: 'Jan', TA_UPF_ANO: '2026', TA_UPF: 'R$ 254,36',
      TA_F1_TETO: 'R$ 127.180,00', TA_F2_PISO: 'R$ 127.180,01', TA_F2_TETO: 'R$ 254.360,00',
      TA_F3_PISO: 'R$ 254.360,01', TA_F3_TETO: 'R$ 1.017.440,00', TA_F4_PISO: 'R$ 1.017.440,01',
      TA_F4_TETO: 'R$ 2.543.600,00', TA_F5_PISO: 'R$ 2.543.600,01',
    });
  });
});

describe('Cenário II — a cadeia: doação entre as irmãs, depois a dos fundadores', () => {
  const cap = montaCapitulo(entrada([[cenarioI], [doacaoEntreIrmas, segundoAto]]));
  const c = cap.cenarios[1];

  it('o primeiro ato é doação PARCIAL, e a frase diz quantas quotas e de quem', () => {
    expect(c.simulacao[0].tokens.SIM_DOACAO).toBe(
      'Doação de 1.071.723 (um milhão, setenta e uma mil, setecentas e vinte e três) quotas, '
      + 'de titularidade plena da Sra. Regina, para a Sra. Cristina.',
    );
    expect(c.simulacao[0].tokens.SIM_RESERVA).toBe('');
    expect(c.simulacao[0].tokens.SIM_TAB_TIT).toBe('Doação de quotas de Regina para Cristina');
  });

  it('uma página de simulação por ato; os dois atos cabem num resumo, com rótulo', () => {
    expect(c.simulacao).toHaveLength(2);
    expect(c.resumo).toHaveLength(1);
    expect(c.resumo[0].atos.map((a) => a.rotulo)).toEqual([
      'Doação de Regina para Cristina:',
      'Doação dos fundadores (Avelino e Iracema) para as filhas Cristina e Regina:',
    ]);
    // Fora do primeiro cenário: introdução curta e sem o painel ATENÇÃO.
    expect(c.resumo[0].plano.comNotas).toBe(false);
    expect(c.resumo[0].primeiroCenario).toBe(false);
  });

  it('o usufruto e a instituição são do ÚLTIMO ato', () => {
    expect(c.usufruto?.tokens.US_TAB_TIT).toBe('Doação da totalidade das quotas dos fundadores com usufruto');
    expect(c.instituicoes).toHaveLength(1);
  });
});

describe('Cenário III — o aporte, e só a reserva', () => {
  const cap = montaCapitulo(entrada([[cenarioI], [cenarioIII]]));
  const c = cap.cenarios[1];

  it('a frase do aporte, com o equivalente em reais', () => {
    expect(c.simulacao[0].tokens.SIM_APORTE).toBe(
      'Realizar um aumento de capital social por meio de moeda corrente nacional, no montante de '
      + 'R$ 870.000,00 (oitocentos e setenta mil reais) pelo sócio Avelino, ficando este com 51% das '
      + 'quotas da sociedade, correspondente a R$ 5.318.500,00 (cinco milhões, trezentos e dezoito '
      + 'mil e quinhentos reais).',
    );
    expect(c.simulacao[0].semAporte).toBe(false);
  });

  it('sem instituição: o usufruto se chama "Simulação", e não há página de tributação', () => {
    expect(c.usufruto?.tokens.US_TIT).toBe('Simulação');
    expect(c.usufruto?.tokens.US_INTRO).toBe('Com relação ao usufruto aos fundadores, o quadro ficará da seguinte forma:');
    expect(c.instituicoes).toEqual([]);
  });
});

describe('o resumo dos cenários', () => {
  it('o custo de cada um, a variação sobre o I e o selo quando é o mais barato nas três réguas', () => {
    const cap = montaCapitulo(entrada([[cenarioI], [doacaoEntreIrmas, segundoAto], [cenarioIII]]));
    const r = cap.resumoDosCenarios;
    // I: doação + instituição. II: as duas doações + a instituição do último ato.
    expect(r.RC1_CT).toBe('R$ 230.296,92');
    expect(r.RC2_CT).toBe('R$ 266.620,70');
    expect(r.RC1_CT_VAR).toBe('base');
    expect(r.RC2_CT_VAR).toBe('+15,8%');
    expect(r.RC1_SELO).toBe('mais econômico');
    expect(r.RC2_SELO).toBe('');
    // O cenário é o nome da simulação: nenhum numeral fixo vai ao molde.
    expect(Object.keys(r).filter((k) => k.endsWith('_NUM'))).toEqual([]);
    expect(r.RC3_NOME).toBe('Aumento de capital e doação integral');
  });

  it('um cenário só não leva selo', () => {
    expect(montaCapitulo(entrada([[cenarioI]])).resumoDosCenarios.RC1_SELO).toBe('');
  });
});

describe('o que o cadastro ou a simulação não têm', () => {
  it('sem gênero, o texto sai neutro e o capítulo diz de quem falta', () => {
    const semGenero = PESSOAS.map((p) => ({ ...p, genero: null }));
    const cap = montaCapitulo(entrada([[cenarioI]], semGenero));
    expect(cap.cenarios[0].simulacao[0].tokens.SIM_DOACAO).toBe(
      'Doação de 100% das quotas dos fundadores (Avelino e Iracema) para Cristina e Regina, '
      + 'com a consequente saída do fundador do quadro societário;',
    );
    expect(cap.cenarios[0].resumo[0].atos[0].cartoes.CT.guias[0].rotulo).toBe('Cristina');
    expect(cap.problemas).toEqual([expect.objectContaining({
      onde: 'Qualificação das Partes',
      detalhe: expect.stringContaining('Avelino, Cristina, Iracema e Regina'),
    })]);
  });

  it('instituição gravada só em 70% (antes de 24/09/2026): a coluna de 100% sai com "—", e avisa', () => {
    const soEm70: AtoDoCapitulo = {
      ...cenarioI,
      concessoes: cenarioI.concessoes.map((c) => ({ ...c, porBase: c.porBase[70] ? { 70: c.porBase[70] } : {} })),
    };
    const cap = montaCapitulo(entrada([[soEm70]]));
    const [t] = cap.cenarios[0].instituicoes;
    expect(t.TI_CT_I_BASE).toBe('—');
    expect(t.TI_CT_I_TOT).toBe('—');
    expect(t.TI_CT_R_TOT).toBe('R$ 4.298,66');
    expect(cap.problemas.some((p) => p.detalhe.includes('foi gravada só em 70%'))).toBe(true);
    // O total do deck soma a instituição em 70%, e ela existe: o Resumo dos cenários não avisa.
    expect(cap.problemas.some((p) => p.onde === 'Resumo dos cenários')).toBe(false);
  });

  it('doação com reserva gravada só em 70%: o resumo sai em 70%, sem a nota de 100%, e avisa', () => {
    const doacaoEm70: AtoDoCapitulo = {
      ...cenarioI,
      gias: cenarioI.gias.map((g) => ({ ...g, porBase: { 70: g.porBase[100]! } })),
    };
    const cap = montaCapitulo(entrada([[doacaoEm70]]));
    expect(cap.cenarios[0].resumo[0].base100).toBe(false);
    expect(cap.problemas.some((p) => p.onde === 'Resumo dos tributos – "Doação com complemento de usufruto"'
      && p.detalhe.includes('foi gravada só em 70%'))).toBe(true);
  });

  it('a instituição sem a base de 70%: o total usa a de 100%, e avisa', () => {
    const instEm100: AtoDoCapitulo = {
      ...cenarioI,
      concessoes: cenarioI.concessoes.map((c) => ({ ...c, porBase: c.porBase[100] ? { 100: c.porBase[100] } : {} })),
    };
    const cap = montaCapitulo(entrada([[instEm100]]));
    // 225.998,26 de doação + 9.411,28 da instituição em 100%.
    expect(cap.resumoDosCenarios.RC1_CT).toBe('R$ 235.409,54');
    expect(cap.problemas.some((p) => p.onde === 'Resumo dos cenários')).toBe(true);
  });

  it('UPFs diferentes entre os cenários não gera: pede uma simulação nova na mesma UPF', () => {
    const agosto = { ...cenarioIII, competencia: '2026-08', upf: '263.78' };
    expect(() => montaCapitulo(entrada([[cenarioI], [agosto]])))
      .toThrow(/UPFs diferentes: .*"Aumento de capital e doação integral" \(R\$ 263,78, 2026-08\).*Gere uma nova simulação/);
  });

  it('mesma UPF em meses diferentes: a tabela sai com o mês do I, e não há o que avisar', () => {
    const setembro = { ...cenarioIII, competencia: '2026-09' };
    const cap = montaCapitulo(entrada([[cenarioI], [setembro]]));
    expect(cap.tributacaoAtual.TA_UPF).toBe('R$ 254,36');
    expect(cap.problemas.some((p) => p.onde === 'Tributação atual')).toBe(false);
  });

  it('mais de três cenários, ou nenhum, não monta', () => {
    expect(() => montaCapitulo(entrada([]))).toThrow(/ao menos uma/);
    expect(() => montaCapitulo(entrada([[cenarioI], [cenarioI], [cenarioI], [cenarioI]]))).toThrow(/até 3/);
  });
});

describe('paginação', () => {
  it('dois atos pequenos cabem num resumo; o primeiro cenário tem menos espaço', () => {
    expect(planoDoResumo([1, 2], false)).toHaveLength(1);
    expect(planoDoResumo([3], true)).toHaveLength(1);
    // Com quatro guias, o cartão não cabe acima do painel ATENÇÃO: desce.
    const quatro = planoDoResumo([4], true);
    expect(quatro).toHaveLength(2);
    expect(quatro[0].atos).toEqual([]);
    expect(quatro[1].atos[0].yCartoes).toBe(1.55);
  });

  it('os três cenários da Agro Aliança: 19 slides', () => {
    // 5 fixos + I (1 simulação, 1 resumo, usufruto, 1 instituição) + II (2 + 1 + 1 + 1)
    // + III (1 + 1 + usufruto) + 2 do fim.
    expect(slidesDoCapitulo04([[cenarioI], [doacaoEntreIrmas, segundoAto], [cenarioIII]])).toBe(19);
    expect(slidesDoCapitulo04([])).toBe(0);
  });
});
