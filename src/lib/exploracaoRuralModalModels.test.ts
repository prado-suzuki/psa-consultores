import { describe, expect, it } from 'vitest';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import {
  areaCedidaPorOutrosInstrumentos,
  camposFaltandoNaQualificacao,
  draftParaCabecalho,
  draftParaImoveis,
  draftParaOrigens,
  draftParaPartes,
  emptyExploracaoRuralDraft,
  fraseDeAdministracao,
  imoveisComAreaExcedida,
  modoDeAdministracao,
  nomeComposseDe,
  novaOrigemExterna,
  novaParte,
  novoImovel,
  partesDoPapel,
  statusDaPartilha,
  statusDasFracoes,
  type ImovelDraft,
  type ParteDraft,
} from './exploracaoRuralModalModels';

const parte = (papel: ParteDraft['papel'], pessoa_id: string | null, fracao = '', ordem = 0): ParteDraft => ({
  ...novaParte(papel, ordem),
  pessoa_id,
  fracao,
});

const pessoa = (id: string, denominacao: string, extra: Partial<PessoaRow> = {}): PessoaRow =>
  ({ id, denominacao, tipo_pessoa: 'PF', ...extra }) as PessoaRow;

const matricula = (id: string, area_documento: number, area_unidade = 'ha'): MatriculaEnriched =>
  ({ id, area_documento, area_unidade }) as MatriculaEnriched;

describe('statusDasFracoes', () => {
  it('fecha em 100 exato', () => {
    const r = statusDasFracoes([
      parte('compossuidor', 'a', '70'),
      parte('compossuidor', 'b', '15'),
      parte('compossuidor', 'c', '15'),
    ]);
    expect(r.soma).toBe(100);
    expect(r.fecha).toBe(true);
    expect(r.excede).toBe(false);
    expect(r.faltam).toBe(0);
    expect(r.quantidade).toBe(3);
  });

  it('aceita 99,9999 como fechado — fração periódica não tem decimal exato', () => {
    // Três compossuidores com 1/3, gravados nas 4 casas da casa (ver fracaoUtils).
    const r = statusDasFracoes([
      parte('compossuidor', 'a', '33.3333'),
      parte('compossuidor', 'b', '33.3333'),
      parte('compossuidor', 'c', '33.3333'),
    ]);
    expect(r.soma).toBe(99.9999);
    expect(r.fecha).toBe(true);
  });

  it('quatro compossuidores de 25% fecham', () => {
    const r = statusDasFracoes(Array.from({ length: 4 }, (_, i) => parte('compossuidor', `p${i}`, '25')));
    expect(r.fecha).toBe(true);
  });

  it('seis de 1/6 ESTOURAM 100 e ainda fecham — 16,6667 × 6 = 100,0002', () => {
    // Este caso é o que derrubou a primeira versão da função: com tolerância fixa de
    // 0,0001 uma partilha de sextos, correta e escrita assim no documento, era
    // recusada. O resíduo cresce com a quantidade de frações.
    const r = statusDasFracoes(Array.from({ length: 6 }, (_, i) => parte('compossuidor', `p${i}`, '16.6667')));
    expect(r.soma).toBe(100.0002);
    expect(r.fecha).toBe(true);
    expect(r.excede).toBe(false);
  });

  it('sete de 1/7 fecham por baixo — 14,2857 × 7 = 99,9999', () => {
    const r = statusDasFracoes(Array.from({ length: 7 }, (_, i) => parte('compossuidor', `p${i}`, '14.2857')));
    expect(r.soma).toBe(99.9999);
    expect(r.fecha).toBe(true);
  });

  it('o resíduo tolerado não vira porta para erro de digitação', () => {
    // Dois compossuidores toleram 1 unidade (0,0001). 0,001 é dez vezes isso e é
    // erro, não arredondamento.
    const r = statusDasFracoes([parte('compossuidor', 'a', '50'), parte('compossuidor', 'b', '49.999')]);
    expect(r.fecha).toBe(false);
    expect(r.faltam).toBe(0.001);
  });

  it('acusa quando excede', () => {
    const r = statusDasFracoes([parte('compossuidor', 'a', '70'), parte('compossuidor', 'b', '40')]);
    expect(r.soma).toBe(110);
    expect(r.excede).toBe(true);
    expect(r.fecha).toBe(false);
    expect(r.faltam).toBe(0);
  });

  it('diz quanto falta', () => {
    const r = statusDasFracoes([parte('compossuidor', 'a', '70'), parte('compossuidor', 'b', '15')]);
    expect(r.faltam).toBe(15);
    expect(r.fecha).toBe(false);
  });

  it('ignora quem não é compossuidor', () => {
    const r = statusDasFracoes([
      parte('compossuidor', 'a', '100'),
      // Explorador não tem fração individual, e administrador nomeado muito menos.
      parte('explorador', 'b', '50'),
      parte('administrador_nomeado', 'c', '50'),
    ]);
    expect(r.soma).toBe(100);
    expect(r.quantidade).toBe(1);
  });

  it('lista vazia não fecha', () => {
    const r = statusDasFracoes([]);
    expect(r.soma).toBe(0);
    expect(r.fecha).toBe(false);
    expect(r.faltam).toBe(100);
  });
});

describe('modoDeAdministracao', () => {
  it('1 nomeado age isoladamente — achado do Termo Aditivo do [ROS-COM]', () => {
    expect(modoDeAdministracao('nomeados', [parte('administrador_nomeado', 'catia')])).toBe('isoladamente');
  });

  it('2 ou mais agem em conjunto', () => {
    expect(
      modoDeAdministracao('nomeados', [
        parte('administrador_nomeado', 'dilceu'),
        parte('administrador_nomeado', 'catia'),
      ]),
    ).toBe('em_conjunto');
  });

  it('não há modo quando a regra é maioria', () => {
    expect(modoDeAdministracao('maioria', [parte('administrador_nomeado', 'dilceu')])).toBeNull();
  });

  it('não há modo quando a linha existe mas ninguém foi escolhido', () => {
    expect(modoDeAdministracao('nomeados', [parte('administrador_nomeado', null)])).toBeNull();
  });

  it('a frase nomeia quem age', () => {
    const pessoas = [pessoa('dilceu', 'Dilceu Rossato'), pessoa('catia', 'Catia Regina Randon Rossato')];
    expect(
      fraseDeAdministracao('nomeados', [parte('administrador_nomeado', 'catia')], pessoas),
    ).toBe('Atos sensíveis: isoladamente por Catia Regina Randon Rossato.');
    expect(
      fraseDeAdministracao(
        'nomeados',
        [parte('administrador_nomeado', 'dilceu', '', 0), parte('administrador_nomeado', 'catia', '', 1)],
        pessoas,
      ),
    ).toBe('Atos sensíveis: em conjunto por Dilceu Rossato; Catia Regina Randon Rossato.');
  });
});

describe('imoveisComAreaExcedida', () => {
  const comMatricula = (over: Partial<ImovelDraft>): ImovelDraft => ({
    ...novoImovel(0),
    matricula_id: 'm1',
    ...over,
  });

  it('não acusa quando a cedida é menor — 234 ha de 295,86 ha do [BV-COM]', () => {
    const r = imoveisComAreaExcedida(
      [comMatricula({ area_explorada: '234', area_unidade: 'ha' })],
      [matricula('m1', 295.86, 'ha')],
    );
    expect(r).toEqual([]);
  });

  it('acusa quando a cedida passa da área da matrícula', () => {
    const r = imoveisComAreaExcedida(
      [comMatricula({ area_explorada: '300', area_unidade: 'ha' })],
      [matricula('m1', 295.86, 'ha')],
    );
    expect(r).toHaveLength(1);
    expect(r[0].cedidaNaUnidadeDaMatricula).toBe(300);
    expect(r[0].areaDaMatricula).toBe(295.86);
  });

  it('CONVERTE antes de comparar: 234 ha não cabem numa matrícula de 100 ha, mesmo ela estando em m²', () => {
    // Sem conversão, 234 < 1.000.000 e o defeito passaria calado.
    const r = imoveisComAreaExcedida(
      [comMatricula({ area_explorada: '234', area_unidade: 'ha' })],
      [matricula('m1', 1_000_000, 'm2')],
    );
    expect(r).toHaveLength(1);
    // 234 ha = 2.340.000 m², contra 1.000.000 m² da matrícula.
    expect(r[0].cedidaNaUnidadeDaMatricula).toBe(2_340_000);
    expect(r[0].unidadeDaMatricula).toBe('m2');
  });

  it('não acusa na conversão que de fato cabe', () => {
    const r = imoveisComAreaExcedida(
      [comMatricula({ area_explorada: '5', area_unidade: 'ha' })],
      [matricula('m1', 1_000_000, 'm2')],
    );
    expect(r).toEqual([]);
  });

  it('cala quando falta dado — imóvel sem matrícula, sem área, ou matrícula sem área', () => {
    expect(imoveisComAreaExcedida([comMatricula({ matricula_id: null, area_explorada: '9999' })], [])).toEqual([]);
    expect(imoveisComAreaExcedida([comMatricula({ area_explorada: '' })], [matricula('m1', 10)])).toEqual([]);
    expect(
      imoveisComAreaExcedida([comMatricula({ area_explorada: '9999' })], [{ id: 'm1', area_documento: null, area_unidade: 'ha' } as MatriculaEnriched]),
    ).toEqual([]);
  });
});

describe('statusDaPartilha', () => {
  it('30/70 fecha', () => {
    const r = statusDaPartilha('30', '70');
    expect(r.preenchida).toBe(true);
    expect(r.soma).toBe(100);
    expect(r.fecha).toBe(true);
  });

  it('10/90 fecha', () => {
    expect(statusDaPartilha('10', '90').fecha).toBe(true);
  });

  it('30/30 não fecha e diz quanto falta — era o buraco que deixava gravar', () => {
    const r = statusDaPartilha('30', '30');
    expect(r.fecha).toBe(false);
    expect(r.excede).toBe(false);
    expect(r.faltam).toBe(40);
  });

  it('acusa quando passa de 100', () => {
    const r = statusDaPartilha('60', '70');
    expect(r.excede).toBe(true);
    expect(r.soma).toBe(130);
  });

  it('com um lado só, não há partilha a conferir', () => {
    expect(statusDaPartilha('30', '').preenchida).toBe(false);
    expect(statusDaPartilha('', '70').preenchida).toBe(false);
    expect(statusDaPartilha('', '').preenchida).toBe(false);
  });

  it('tolera o arredondamento de 4 casas — 33,3333 + 66,6667', () => {
    expect(statusDaPartilha('33.3333', '66.6667').fecha).toBe(true);
  });
});

describe('areaCedidaPorOutrosInstrumentos', () => {
  const inst = (
    id: string,
    tipo: string,
    encerramento: string | null,
    imoveis: { matricula_id: string; area_explorada: number; area_unidade?: string }[],
  ) => ({
    id,
    tipo_exploracao: tipo,
    data_encerramento: encerramento,
    imoveis: imoveis.map((i) => ({ ...i, area_unidade: i.area_unidade ?? 'ha' })),
  });

  const HOJE = '2026-09-01';

  it('soma a área que outra parceria ativa já toma da mesma matrícula', () => {
    const mapa = areaCedidaPorOutrosInstrumentos(
      [inst('a', 'parceria', null, [{ matricula_id: 'm1', area_explorada: 200 }])],
      'parceria',
      null,
      HOJE,
    );
    expect(mapa.get('m1')).toBe(2_000_000); // 200 ha em m²
  });

  it('IGNORA o instrumento em edição — senão a própria área contaria duas vezes', () => {
    const mapa = areaCedidaPorOutrosInstrumentos(
      [inst('a', 'parceria', null, [{ matricula_id: 'm1', area_explorada: 200 }])],
      'parceria',
      'a',
      HOJE,
    );
    expect(mapa.get('m1')).toBeUndefined();
  });

  it('IGNORA instrumento encerrado — a OSG falou em "duas parcerias ativas"', () => {
    const mapa = areaCedidaPorOutrosInstrumentos(
      [inst('a', 'parceria', '2025-12-31', [{ matricula_id: 'm1', area_explorada: 200 }])],
      'parceria',
      null,
      HOJE,
    );
    expect(mapa.get('m1')).toBeUndefined();
  });

  it('conta o que encerra hoje ou no futuro', () => {
    const mapa = areaCedidaPorOutrosInstrumentos(
      [
        inst('a', 'parceria', HOJE, [{ matricula_id: 'm1', area_explorada: 100 }]),
        inst('b', 'parceria', '2030-01-01', [{ matricula_id: 'm1', area_explorada: 50 }]),
      ],
      'parceria',
      null,
      HOJE,
    );
    expect(mapa.get('m1')).toBe(1_500_000); // 150 ha
  });

  it('IGNORA outro tipo — composse organiza área que já veio de parceria, contar as duas duplicaria a mesma terra', () => {
    const mapa = areaCedidaPorOutrosInstrumentos(
      [inst('a', 'composse', null, [{ matricula_id: 'm1', area_explorada: 200 }])],
      'parceria',
      null,
      HOJE,
    );
    expect(mapa.get('m1')).toBeUndefined();
  });

  it('normaliza a unidade antes de somar', () => {
    const mapa = areaCedidaPorOutrosInstrumentos(
      [
        inst('a', 'parceria', null, [{ matricula_id: 'm1', area_explorada: 1 }]),
        inst('b', 'parceria', null, [{ matricula_id: 'm1', area_explorada: 10000, area_unidade: 'm2' }]),
      ],
      'parceria',
      null,
      HOJE,
    );
    // 1 ha + 10.000 m² = 2 ha.
    expect(mapa.get('m1')).toBe(20_000);
  });
});

describe('imoveisComAreaExcedida — soma entre instrumentos', () => {
  const item = (over: Partial<ImovelDraft>): ImovelDraft => ({
    ...novoImovel(0),
    matricula_id: 'm1',
    ...over,
  });

  it('o caso da reunião: 500 ha, um explora 200 e o outro 250 — cabe', () => {
    const r = imoveisComAreaExcedida(
      [item({ area_explorada: '250' })],
      [matricula('m1', 500)],
      new Map([['m1', 2_000_000]]), // 200 ha já cedidos por outra parceria ativa
    );
    expect(r).toEqual([]);
  });

  it('passa de 100% quando somado, mesmo cabendo sozinho', () => {
    const r = imoveisComAreaExcedida(
      [item({ area_explorada: '400' })],
      [matricula('m1', 500)],
      new Map([['m1', 2_000_000]]), // 200 + 400 = 600 numa fazenda de 500
    );
    expect(r).toHaveLength(1);
    expect(r[0].causa).toBe('somado');
    expect(r[0].cedidaPorOutros).toBe(200);
    expect(r[0].areaDaMatricula).toBe(500);
  });

  it('distingue "sozinho já passa" de "só passa somado"', () => {
    const sozinho = imoveisComAreaExcedida(
      [item({ area_explorada: '600' })],
      [matricula('m1', 500)],
      new Map([['m1', 2_000_000]]),
    );
    expect(sozinho[0].causa).toBe('sozinho');
  });

  it('sem outros instrumentos, o comportamento antigo continua', () => {
    expect(imoveisComAreaExcedida([item({ area_explorada: '499' })], [matricula('m1', 500)])).toEqual([]);
    expect(imoveisComAreaExcedida([item({ area_explorada: '501' })], [matricula('m1', 500)])).toHaveLength(1);
  });
});

describe('nomeComposseDe', () => {
  const pessoas = [pessoa('p1', 'Sérgio Pitt'), pessoa('p2', 'Jozenil Caetano de Souza')];

  it('usa o 1º compossuidor da ordem, em maiúscula, com E OUTROS', () => {
    const partes = [parte('compossuidor', 'p2', '15', 1), parte('compossuidor', 'p1', '70', 0)];
    expect(nomeComposseDe(partes, pessoas)).toBe('SÉRGIO PITT E OUTROS');
  });

  it('vazio quando ninguém foi escolhido', () => {
    expect(nomeComposseDe([parte('compossuidor', null)], pessoas)).toBe('');
    expect(nomeComposseDe([], pessoas)).toBe('');
  });

  it('ignora explorador — o nome é da composse', () => {
    expect(nomeComposseDe([parte('explorador', 'p1')], pessoas)).toBe('');
  });
});

describe('camposFaltandoNaQualificacao', () => {
  const completaPF = {
    tipo_pessoa: 'PF',
    cpf_cnpj: '1',
    nacionalidade: 'brasileira',
    naturalidade_municipio: 'Cuiabá',
    data_nascimento: '1980-01-01',
    profissao: 'produtor rural',
    estado_civil: 'casado',
    regime_bens: 'comunhão parcial',
    documento_identidade_numero: '123',
    endereco_logradouro: 'Rua A',
    endereco_municipio: 'Cuiabá',
    filiacao_pai: 'Pai',
    filiacao_mae: 'Mãe',
  };

  it('pessoa completa não tem pendência', () => {
    expect(camposFaltandoNaQualificacao(pessoa('p', 'X', completaPF), { parteExploradora: true })).toEqual([]);
  });

  it('filiação só é exigida da parte exploradora — o preâmbulo do outorgante não a traz', () => {
    const semFiliacao = pessoa('p', 'X', { ...completaPF, filiacao_pai: null, filiacao_mae: null });
    expect(camposFaltandoNaQualificacao(semFiliacao, { parteExploradora: true })).toEqual([
      'filiação (pai)',
      'filiação (mãe)',
    ]);
    expect(camposFaltandoNaQualificacao(semFiliacao)).toEqual([]);
  });

  it('PJ cobra NIRE e Junta, não estado civil', () => {
    const pj = pessoa('e', 'Agro Aliança Ltda', { tipo_pessoa: 'PJ', cpf_cnpj: '1', endereco_logradouro: 'Av B', endereco_municipio: 'Sorriso' });
    expect(camposFaltandoNaQualificacao(pj)).toEqual(['UF da Junta Comercial', 'NIRE']);
  });

  it('string vazia conta como falta, não só null', () => {
    expect(camposFaltandoNaQualificacao(pessoa('p', 'X', { ...completaPF, profissao: '' }))).toContain('profissão');
  });

  it('sem pessoa, sem pendência', () => {
    expect(camposFaltandoNaQualificacao(null)).toEqual([]);
  });
});

describe('draftParaCabecalho', () => {
  it('composse não leva campo de parceria, e vice-versa', () => {
    const composse = {
      ...emptyExploracaoRuralDraft('composse'),
      percentual_outorgante: '30',
      percentual_explorador: '70',
      data_encerramento: '2029-01-01',
      data_inicio_vigencia: '2026-09-16',
      prazo_indivisao_quantidade: '3',
      liquidacao_numero_parcelas: '60',
    };
    const valores = draftParaCabecalho(composse, 'cli');
    // Trocar de tipo na tela não pode deixar cláusula do outro tipo gravada.
    expect(valores.percentual_outorgante).toBeNull();
    expect(valores.percentual_explorador).toBeNull();
    expect(valores.data_encerramento).toBeNull();
    expect(valores.data_inicio_vigencia).toBeNull();
    expect(valores.prazo_indivisao_quantidade).toBe(3);
    expect(valores.liquidacao_numero_parcelas).toBe(60);

    const parceria = {
      ...emptyExploracaoRuralDraft('parceria'),
      percentual_outorgante: '30',
      prazo_indivisao_quantidade: '3',
      liquidacao_numero_parcelas: '60',
    };
    const v2 = draftParaCabecalho(parceria, 'cli');
    expect(v2.percentual_outorgante).toBe(30);
    expect(v2.prazo_indivisao_quantidade).toBeNull();
    expect(v2.liquidacao_numero_parcelas).toBeNull();
    expect(v2.regra_administracao).toBeNull();
  });

  // O capital social da outorgante: retrato da data da assinatura, e por isso campo
  // gravado. Só a parceria tem outorgante — na composse os compossuidores já são
  // donos da posse, e capital de outorgante ali seria dado sem sujeito.
  it('o capital da outorgante grava na parceria e sai nulo na composse', () => {
    const parceria = {
      ...emptyExploracaoRuralDraft('parceria'),
      outorgante_capital_social_na_assinatura: '872674.00',
    };
    const linha = draftParaCabecalho(parceria, 'cli') as unknown as {
      outorgante_capital_social_na_assinatura: number | null;
    };
    expect(linha.outorgante_capital_social_na_assinatura).toBe(872674);

    const composse = {
      ...emptyExploracaoRuralDraft('composse'),
      outorgante_capital_social_na_assinatura: '872674.00',
    };
    const daComposse = draftParaCabecalho(composse, 'cli') as unknown as {
      outorgante_capital_social_na_assinatura: number | null;
    };
    expect(daComposse.outorgante_capital_social_na_assinatura).toBeNull();
  });

  it('capital em branco vira null, e não zero — zero é capital que a empresa não tem', () => {
    const linha = draftParaCabecalho(emptyExploracaoRuralDraft('parceria'), 'cli') as unknown as {
      outorgante_capital_social_na_assinatura: number | null;
    };
    expect(linha.outorgante_capital_social_na_assinatura).toBeNull();
  });

  it('texto em branco vira null, não string vazia', () => {
    const v = draftParaCabecalho(emptyExploracaoRuralDraft('parceria'), 'cli');
    expect(v.referencia).toBeNull();
    expect(v.culturas).toBeNull();
    expect(v.data_assinatura).toBeNull();
  });

  it('número inválido não vira NaN', () => {
    const d = { ...emptyExploracaoRuralDraft('parceria'), percentual_outorgante: 'abc' };
    expect(draftParaCabecalho(d, 'cli').percentual_outorgante).toBeNull();
  });

  it('quantidade de prazo é inteira, mesmo se digitarem decimal', () => {
    const d = { ...emptyExploracaoRuralDraft('composse'), prazo_indivisao_quantidade: '3.7' };
    expect(draftParaCabecalho(d, 'cli').prazo_indivisao_quantidade).toBe(3);
  });
});

describe('draftParaPartes', () => {
  it('descarta linha sem pessoa e renumera a ordem', () => {
    const draft = {
      ...emptyExploracaoRuralDraft('composse'),
      partes: [
        parte('compossuidor', 'a', '50', 0),
        parte('compossuidor', null, '50', 1),
        parte('compossuidor', 'b', '50', 2),
      ],
    };
    const saida = draftParaPartes(draft);
    expect(saida).toHaveLength(2);
    expect(saida.map((p) => p.ordem)).toEqual([0, 1]);
  });

  it('fração sobrevive só no compossuidor', () => {
    const draft = {
      ...emptyExploracaoRuralDraft('composse'),
      partes: [parte('compossuidor', 'a', '50'), parte('explorador', 'b', '50'), parte('administrador_nomeado', 'c', '50')],
    };
    const saida = draftParaPartes(draft);
    expect(saida.find((p) => p.papel === 'compossuidor')?.fracao).toBe(50);
    expect(saida.find((p) => p.papel === 'explorador')?.fracao).toBeNull();
    expect(saida.find((p) => p.papel === 'administrador_nomeado')?.fracao).toBeNull();
  });

  it('a mesma pessoa em dois papéis são duas linhas — no [ROS-COM] o nomeado é compossuidor', () => {
    const draft = {
      ...emptyExploracaoRuralDraft('composse'),
      partes: [parte('compossuidor', 'catia', '25'), parte('administrador_nomeado', 'catia')],
    };
    const saida = draftParaPartes(draft);
    expect(saida).toHaveLength(2);
    expect(saida.every((p) => p.pessoa_id === 'catia')).toBe(true);
  });
});

describe('draftParaImoveis', () => {
  it('parceria não grava origem — a OSG confirmou que origem é só de composse', () => {
    const origem = novaOrigemExterna();
    const imovel = {
      ...novoImovel(0),
      matricula_id: 'm1',
      origem_tipo: 'parceria' as const,
      origem_externa_local_id: origem.id,
      origem_contraparte_pessoa_id: 'p1',
    };
    // O mesmo imóvel, nos dois tipos: na composse a origem sobrevive, na parceria não.
    const naComposse = draftParaImoveis({
      ...emptyExploracaoRuralDraft('composse'),
      origens: [origem],
      imoveis: [imovel],
    })[0];
    expect(naComposse.origem_tipo).toBe('parceria');
    expect(naComposse.origemExternaLocalId).toBe(origem.id);
    expect(naComposse.origem_contraparte_pessoa_id).toBe('p1');

    const naParceria = draftParaImoveis({
      ...emptyExploracaoRuralDraft('parceria'),
      origens: [origem],
      imoveis: [imovel],
    })[0];
    expect(naParceria.origem_tipo).toBeNull();
    expect(naParceria.origemExternaLocalId).toBeNull();
    expect(naParceria.origem_exploracao_rural_id).toBeNull();
    expect(naParceria.origem_contraparte_pessoa_id).toBeNull();
    // O imóvel em si continua: só a origem dele é que não existe na parceria.
    expect(naParceria.matricula_id).toBe('m1');
  });

  it('descarta item sem matrícula e renumera a ordem', () => {
    const saida = draftParaImoveis({
      ...emptyExploracaoRuralDraft('composse'),
      imoveis: [
        { ...novoImovel(0), matricula_id: 'm1' },
        { ...novoImovel(1), matricula_id: null },
        { ...novoImovel(2), matricula_id: 'm2' },
      ],
    });
    expect(saida).toHaveLength(2);
    expect(saida.map((i) => i.ordem)).toEqual([0, 1]);
  });
});

describe('draftParaOrigens', () => {
  it('grava só origem referenciada por algum imóvel — digitada e desvinculada não vira linha órfã', () => {
    const usada = novaOrigemExterna();
    const solta = novaOrigemExterna();
    const draft = {
      ...emptyExploracaoRuralDraft('composse'),
      origens: [usada, solta],
      imoveis: [{ ...novoImovel(0), matricula_id: 'm1', origem_externa_local_id: usada.id }],
    };
    const saida = draftParaOrigens(draft);
    expect(saida).toHaveLength(1);
    expect(saida[0].localId).toBe(usada.id);
  });

  it('uma origem serve vários imóveis — os 15 imóveis / 6 origens do [BV-COM]', () => {
    const origem = novaOrigemExterna();
    const draft = {
      ...emptyExploracaoRuralDraft('composse'),
      origens: [origem],
      imoveis: [
        { ...novoImovel(0), matricula_id: 'm1', origem_externa_local_id: origem.id },
        { ...novoImovel(1), matricula_id: 'm2', origem_externa_local_id: origem.id },
        { ...novoImovel(2), matricula_id: 'm3', origem_externa_local_id: origem.id },
      ],
    };
    expect(draftParaOrigens(draft)).toHaveLength(1);
  });
});

describe('partesDoPapel', () => {
  it('devolve na ordem declarada, não na ordem do array', () => {
    const partes = [parte('compossuidor', 'b', '', 5), parte('compossuidor', 'a', '', 1)];
    expect(partesDoPapel(partes, 'compossuidor').map((p) => p.pessoa_id)).toEqual(['a', 'b']);
  });
});
