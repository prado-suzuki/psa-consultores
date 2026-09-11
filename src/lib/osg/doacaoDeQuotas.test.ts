import { describe, expect, it } from 'vitest';
import {
  descricaoDaDoacao,
  GRAVAMES_PADRAO,
  planejarDoacaoDeQuotas,
  repartirOrigem,
  type ArgsDaDoacao,
} from './doacaoDeQuotas';

// Os números são da 3ª alteração da MMS Participações: o casal doa a totalidade
// (9.541.796 quotas) às duas filhas, em quatro pares, cada doador reservando o
// usufruto do que doou. Os doadores zeram e seguem votando 100%.

const CN = 'mms-participacoes';
const JOSE = 'jose';
const MARIA = 'maria';
const CAMILA = 'camila';
const BRUNA = 'bruna';

const nomes = new Map([
  [JOSE, 'José Eduardo'],
  [MARIA, 'Maria Auxiliadora'],
  [CAMILA, 'Camila'],
  [BRUNA, 'Bruna'],
]);

const quadroMMS = [
  { pessoaId: JOSE, denominacao: 'José Eduardo', quotas: 6_298_095 },
  { pessoaId: MARIA, denominacao: 'Maria Auxiliadora', quotas: 3_243_701 },
];

const par = (doadorId: string, donatarioId: string, quotas: number) => ({
  doadorId, donatarioId, quotas, origem: repartirOrigem(quotas),
});

const plano = (p: Partial<ArgsDaDoacao> = {}) =>
  planejarDoacaoDeQuotas({
    empresaPessoaId: CN,
    quadro: quadroMMS,
    nomes,
    pares: [
      par(JOSE, CAMILA, 3_149_047),
      par(JOSE, BRUNA, 3_149_048),
      par(MARIA, BRUNA, 1_621_850),
      par(MARIA, CAMILA, 1_621_851),
    ],
    usufruto: { reservado: true, usufrutuariosPorDoador: {}, comVoto: true },
    gravames: [...GRAVAMES_PADRAO, 'reversibilidade'],
    dataInstrumento: '2025-12-24',
    dataMovimento: '2026-01-15',
    ...p,
  });

describe('repartirOrigem: metade legítima, metade disponível, sobra na legítima', () => {
  it('reproduz a divisão da MMS 3ª', () => {
    // José → Camila: 3.149.047 → 1.574.524 legítima e 1.574.523 disponível.
    expect(repartirOrigem(3_149_047)).toEqual({ legitima: 1_574_524, disponivel: 1_574_523 });
    expect(repartirOrigem(3_149_048)).toEqual({ legitima: 1_574_524, disponivel: 1_574_524 });
    expect(repartirOrigem(1)).toEqual({ legitima: 1, disponivel: 0 });
  });
});

describe('planejarDoacaoDeQuotas: o ato da MMS 3ª', () => {
  it('um lançamento de doação por par, na ordem das cláusulas, com a origem declarada', () => {
    const { lancamentos, problema } = plano();
    expect(problema).toBeNull();
    expect(lancamentos).toHaveLength(4);
    expect(lancamentos[0].movimento).toMatchObject({
      tipo: 'doacao',
      origemPessoaId: JOSE,
      destinoPessoaId: CAMILA,
      quotas: 3_149_047,
      quotasLegitima: 1_574_524,
      quotasDisponivel: 1_574_523,
      instrumentoData: '2025-12-24',
      dataMovimento: '2026-01-15',
      sequencia: 1,
    });
    expect(lancamentos.map((l) => l.movimento.sequencia)).toEqual([1, 2, 3, 4]);
    expect(lancamentos.map((l) => l.denominacao)).toEqual(['Camila', 'Bruna', 'Bruna', 'Camila']);
  });

  it('cada par cria o ônus: a donatária fica com a nua propriedade e o doador usufrui', () => {
    const { lancamentos } = plano();
    expect(lancamentos[0].onus).toEqual({
      nuProprietarioId: CAMILA,
      usufrutuarioIds: [JOSE],
      usufrutoOrigem: 'reserva',
      comVoto: true,
      quotas: 3_149_047,
      gravames: ['inalienabilidade', 'impenhorabilidade', 'incomunicabilidade', 'reversibilidade'],
    });
    expect(lancamentos[2].onus?.usufrutuarioIds).toEqual([MARIA]);
  });

  it('os doadores zeram e retiram-se; as filhas ingressam com 4.770.898 cada', () => {
    const p = plano();
    expect(p.retirantes).toEqual([JOSE, MARIA]);
    expect(p.ingressantes).toEqual([CAMILA, BRUNA]);
    expect(p.quadroResultante).toEqual([
      { pessoaId: CAMILA, denominacao: 'Camila', quotas: 4_770_898 },
      { pessoaId: BRUNA, denominacao: 'Bruna', quotas: 4_770_898 },
    ]);
    expect(p.avisos[0]).toContain('retiram-se do quadro societário');
    expect(p.avisos[0]).toContain('continua votando');
  });

  it('a tabela de voto é a da cláusula nona: filhas com 0% de voto, pais com 66,01% e 33,99%', () => {
    const { usufruto } = plano();
    expect(usufruto).not.toBeNull();
    const porId = new Map(usufruto!.linhas.map((l) => [l.pessoaId, l]));
    expect(porId.get(JOSE)).toMatchObject({ plena: 0n, nua: 0n, usufruto: 6_298_095n, pctVozEVoto: '66.0053' });
    expect(porId.get(MARIA)).toMatchObject({ usufruto: 3_243_701n, pctVozEVoto: '33.9947' });
    expect(porId.get(CAMILA)).toMatchObject({ plena: 0n, nua: 4_770_898n, usufruto: 0n, pctVozEVoto: '0.0000' });
    expect(porId.get(BRUNA)).toMatchObject({ nua: 4_770_898n, pctVozEVoto: '0.0000' });
    // Cada quota vota uma vez: o total fecha o capital, não o dobro.
    expect(usufruto!.totais.vozEVoto).toBe(9_541_796n);
    expect(usufruto!.totais.nua).toBe(9_541_796n);
    expect(usufruto!.totais.pctVozEVoto).toBe('100.0000');
  });

  it('o cônjuge nomeado cousufrutuário entra no bloco do doador, sem contar duas vezes', () => {
    const { lancamentos, usufruto } = plano({
      usufruto: {
        reservado: true,
        usufrutuariosPorDoador: { [JOSE]: [MARIA], [MARIA]: [JOSE] },
        comVoto: true,
      },
    });
    expect(lancamentos[0].onus?.usufrutuarioIds).toEqual([JOSE, MARIA]);
    expect(lancamentos[2].onus?.usufrutuarioIds).toEqual([MARIA, JOSE]);
    const porId = new Map(usufruto!.linhas.map((l) => [l.pessoaId, l]));
    // Os dois leem o bloco inteiro…
    expect(porId.get(JOSE)?.usufruto).toBe(9_541_796n);
    expect(porId.get(MARIA)?.usufruto).toBe(9_541_796n);
    // …e o total continua fechando em 100%, não em 200%.
    expect(usufruto!.totais.pctVozEVoto).toBe('100.0000');
  });

  it('nomeia o ato para a procedência do quadro', () => {
    expect(descricaoDaDoacao(plano(), nomes)).toBe(
      'Doação de 9.541.796 quotas de José Eduardo e Maria Auxiliadora para Camila e Bruna, com reserva de usufruto',
    );
  });
});

describe('planejarDoacaoDeQuotas: o que ele recusa', () => {
  it('dois pares do mesmo doador não passam, juntos, do saldo dele', () => {
    const p = plano({
      pares: [par(JOSE, CAMILA, 4_000_000), par(JOSE, BRUNA, 3_000_000)],
    });
    expect(p.problema).toMatch(/^Par 2: Quem cede tem 2\.298\.095 quota\(s\)/);
    expect(p.lancamentos).toEqual([]);
  });

  it('doador que não é sócio, empresa como parte, quotas fracionadas', () => {
    expect(plano({ pares: [par(CAMILA, BRUNA, 10)] }).problema).toContain('não tem quotas nesta empresa');
    expect(plano({ pares: [par(JOSE, CN, 10)] }).problema).toContain('sócia de si mesma');
    expect(plano({ pares: [{ doadorId: JOSE, donatarioId: CAMILA, quotas: 10.5, origem: null }] }).problema)
      .toContain('inteiro');
  });

  it('a origem declarada tem de somar as quotas doadas, quota a quota', () => {
    const p = plano({
      pares: [{ doadorId: JOSE, donatarioId: CAMILA, quotas: 100, origem: { legitima: 60, disponivel: 30 } }],
    });
    expect(p.problema).toBe('Par 1: legítima (60) e disponível (30) somam 90, não as 100 quotas doadas.');
  });

  it('o donatário não usufrui o que recebe: quem recebe fica com a nua propriedade', () => {
    const p = plano({
      pares: [par(JOSE, CAMILA, 100)],
      usufruto: { reservado: true, usufrutuariosPorDoador: { [JOSE]: [CAMILA] }, comVoto: true },
    });
    expect(p.problema).toContain('Camila não pode usufruir as quotas que recebe');
  });

  it('sem par nenhum não há plano', () => {
    expect(plano({ pares: [] }).problema).toBe('Informe ao menos um par doador → donatário.');
  });
});

describe('planejarDoacaoDeQuotas: as variantes do acervo', () => {
  it('sem reserva e sem gravame é doação simples: lançamento sem ônus, e o aviso diz isso', () => {
    const p = plano({
      pares: [par(JOSE, CAMILA, 100)],
      usufruto: { reservado: false, usufrutuariosPorDoador: {}, comVoto: true },
      gravames: [],
    });
    expect(p.problema).toBeNull();
    expect(p.lancamentos[0].onus).toBeNull();
    expect(p.usufruto).toBeNull();
    expect(p.avisos).toContain('Sem reserva de usufruto e sem gravame: é uma doação simples, e nenhum ônus fica sobre as quotas.');
  });

  it('só gravame, sem usufruto: é a cessão gratuita de 2021, com o ônus sub-rogado', () => {
    const p = plano({
      pares: [par(JOSE, CAMILA, 100)],
      usufruto: { reservado: false, usufrutuariosPorDoador: {}, comVoto: true },
      gravames: ['impenhorabilidade'],
    });
    expect(p.lancamentos[0].onus).toEqual({
      nuProprietarioId: CAMILA,
      usufrutuarioIds: [],
      usufrutoOrigem: null,
      comVoto: false,
      quotas: 100,
      gravames: ['impenhorabilidade'],
    });
    expect(p.usufruto).toBeNull();
  });

  it('usufruto sem extensão ao voto mantém o voto com as nu-proprietárias', () => {
    const p = plano({
      usufruto: { reservado: true, usufrutuariosPorDoador: {}, comVoto: false },
    });
    const porId = new Map(p.usufruto!.linhas.map((l) => [l.pessoaId, l]));

    expect(p.lancamentos.every((l) => l.onus?.comVoto === false)).toBe(true);
    expect(p.avisos).toContain('Usufruto sem o voto: os usufrutuários recebem os frutos, mas quem vota é o donatário.');
    expect(p.avisos.some((a) => a.includes('continua votando'))).toBe(false);
    expect(porId.get(JOSE)).toMatchObject({ usufruto: 0n, vozEVoto: 0n });
    expect(porId.get(MARIA)).toMatchObject({ usufruto: 0n, vozEVoto: 0n });
    expect(porId.get(CAMILA)).toMatchObject({ nua: 4_770_898n, vozEVoto: 4_770_898n });
    expect(porId.get(BRUNA)).toMatchObject({ nua: 4_770_898n, vozEVoto: 4_770_898n });
    expect(p.usufruto!.totais).toMatchObject({
      nua: 9_541_796n,
      usufruto: 0n,
      vozEVoto: 9_541_796n,
      pctVozEVoto: '100.0000',
    });
  });

  it('origem não declarada vira aviso, não erro', () => {
    const p = plano({ pares: [{ doadorId: JOSE, donatarioId: CAMILA, quotas: 100, origem: null }] });
    expect(p.problema).toBeNull();
    expect(p.lancamentos[0].movimento.quotasLegitima).toBeNull();
    expect(p.avisos.some((a) => a.startsWith('Origem não declarada'))).toBe(true);
  });

  it('doação parcial: o doador continua no quadro e não é retirante', () => {
    const p = plano({ pares: [par(JOSE, CAMILA, 1_000_000)] });
    expect(p.retirantes).toEqual([]);
    expect(p.quadroResultante.map((s) => [s.pessoaId, s.quotas])).toEqual([
      [JOSE, 5_298_095], [MARIA, 3_243_701], [CAMILA, 1_000_000],
    ]);
    const jose = p.usufruto!.linhas.find((l) => l.pessoaId === JOSE)!;
    // José vota a plena que ficou com ele MAIS o usufruto do que doou.
    expect(jose.plena).toBe(5_298_095n);
    expect(jose.usufruto).toBe(1_000_000n);
    expect(jose.vozEVoto).toBe(6_298_095n);
  });
});
