import { describe, expect, it } from 'vitest';
import {
  montarUsufruto, quotasAInstituir, redistribuirConcessoes, repartirInstituicao,
  type ConcessaoDeUsufruto, type ParticipanteDoUsufruto,
} from '@/lib/osg/usufrutoDoAto';

// Os números são do AGRO ALIANÇA, o único caso com instituição executada: guia 338021,
// instituição sobre 1.284.747 quotas (13,44% do capital), ITCD de R$ 28.169,92 pago em
// 01/06/2026. O alvo declarado no instrumento e no deck é 51% de voz e voto.
//
// Capital da Aliança Participações: 9.557.944 quotas de R$ 1,00.

const CAPITAL = 9_557_944n;

const pessoa = (
  pessoaId: string,
  nome: string,
  quotas: bigint,
): ParticipanteDoUsufruto => ({ pessoaId, nome, quotas });

const concede = (
  deId: string,
  paraIds: string[],
  quotas: bigint,
  origem: ConcessaoDeUsufruto['origem'] = 'reserva',
): ConcessaoDeUsufruto => ({ deId, paraIds, quotas, origem });

describe('quotas a conceder para alcançar o alvo', () => {
  it('é o alvo em quotas menos o que já está sob usufruto', () => {
    // O deck, Cenário I: capital 9.557.946, reserva 4.448.500. Bate EXATO com o
    // número apresentado ao cliente — 51% × 9.557.946 = 4.874.552,46 → 4.874.552.
    expect(quotasAInstituir(510_000n, 9_557_946n, 4_448_500n)).toBe(426_052n);

    // O EXECUTADO: capital 9.557.944, reserva 3.589.803. A fórmula dá 1.284.748 e o
    // instrumento instituiu 1.284.747 — UMA quota de diferença, porque eles tomaram
    // 4.874.550 como alvo (que ainda lê 51,00%) em vez do 4.874.551 do
    // arredondamento. É por isso que a quantidade é CAMPO: a conta sugere, o
    // instrumento decide.
    expect(quotasAInstituir(510_000n, CAPITAL, 3_589_803n)).toBe(1_284_748n);
  });

  it('ZERO quando a reserva já alcança o alvo', () => {
    // É o Santa Terezinha e o MMS: o casal detinha 100% da holding, doou tudo com
    // reserva, e o voto continua em 100%. Não há o que instituir.
    expect(quotasAInstituir(510_000n, CAPITAL, CAPITAL)).toBe(0n);
    expect(quotasAInstituir(1_000_000n, CAPITAL, CAPITAL)).toBe(0n);
  });

  it('sem alvo ou sem capital, não inventa número', () => {
    expect(quotasAInstituir(0n, CAPITAL, 0n)).toBe(0n);
    expect(quotasAInstituir(510_000n, 0n, 0n)).toBe(0n);
  });
});

describe('quadro do usufruto', () => {
  it('reproduz o quadro final do Agro Aliança: 51% de voz e voto', () => {
    // Depois da doação, as filhas com 4.778.972 cada e os fundadores com zero quota.
    // Duas origens de concessão: a RESERVA do que a doação transmitiu (automática) e a
    // INSTITUIÇÃO que a Regina declarou sobre a plena dela.
    const { linhas, totais, problemas } = montarUsufruto({
      capital: CAPITAL,
      participantes: [
        pessoa('avelino', 'Avelino', 0n),
        pessoa('cristina', 'Cristina', 4_778_972n),
        pessoa('regina', 'Regina', 4_778_972n),
      ],
      concessoes: [
        concede('cristina', ['avelino'], 2_437_275n),
        concede('regina', ['avelino'], 1_152_528n),
        concede('regina', ['avelino'], 1_284_747n, 'instituicao'),
      ],
    });

    // O fundador termina com ZERO quota e o voto do bloco inteiro.
    expect(linhas[0]).toMatchObject({
      plena: 0n, nua: 0n, usufruto: 4_874_550n, pctVozEVoto: '51.0000',
    });

    // As filhas: só a plena vota, a nua não.
    expect(linhas[1]).toMatchObject({
      plena: 2_341_697n, nua: 2_437_275n, usufruto: 0n, pctVozEVoto: '24.5000',
    });
    // A Regina concedeu de duas origens, e a tela precisa distinguir: a reserva é
    // automática, a instituição é ato tributado.
    expect(linhas[2]).toMatchObject({
      plena: 2_341_697n,
      nua: 2_437_275n,
      nuaDeReserva: 1_152_528n,
      nuaDeInstituicao: 1_284_747n,
      pctVozEVoto: '24.5000',
    });
    expect(linhas[2].concedePara).toEqual(['Avelino']);

    // A CONFERÊNCIA: cada quota vota uma vez, e o total fecha o capital.
    expect(totais.plena).toBe(4_683_394n);
    expect(totais.nua).toBe(4_874_550n);
    expect(totais.vozEVoto).toBe(CAPITAL);
    expect(totais.pctVozEVoto).toBe('100.0000');
    expect(problemas).toEqual([]);
  });

  it('o casal usufrui EM CONJUNTO: o total não conta duas vezes', () => {
    // Direito conjunto, com acrescimento ao sobrevivente (art. 1.411 CC). Somar por
    // cabeça daria 151% num casal.
    const { linhas, totais } = montarUsufruto({
      capital: CAPITAL,
      participantes: [
        pessoa('avelino', 'Avelino', 0n),
        pessoa('iracema', 'Iracema', 0n),
        pessoa('regina', 'Regina', CAPITAL),
      ],
      concessoes: [concede('regina', ['avelino', 'iracema'], 4_874_550n)],
    });

    expect(linhas[0].usufruto).toBe(4_874_550n);
    expect(linhas[1].usufruto).toBe(4_874_550n);
    expect(linhas[0].pctVozEVoto).toBe('51.0000');
    expect(linhas[1].pctVozEVoto).toBe('51.0000');
    expect(linhas[2].concedePara).toEqual(['Avelino', 'Iracema']);
    // E o total continua fechando em 100%, não em 151%.
    expect(totais.vozEVoto).toBe(CAPITAL);
    expect(totais.pctVozEVoto).toBe('100.0000');
  });

  it('só a reserva, sem instituição: é o Santa Terezinha e o MMS', () => {
    // O casal detinha 100% e doou tudo com reserva sobre 100% do doado.
    const { linhas, totais, problemas } = montarUsufruto({
      capital: 9_018_768n,
      participantes: [
        pessoa('cristiano', 'Cristiano', 0n),
        pessoa('fabiane', 'Fabiane', 0n),
        pessoa('gabriel', 'Gabriel', 4_509_384n),
        pessoa('rafael', 'Rafael', 4_509_384n),
      ],
      concessoes: [
        concede('gabriel', ['cristiano', 'fabiane'], 4_509_384n),
        concede('rafael', ['cristiano', 'fabiane'], 4_509_384n),
      ],
    });

    expect(linhas[0].pctVozEVoto).toBe('100.0000');
    expect(linhas[2]).toMatchObject({ plena: 0n, nua: 4_509_384n, vozEVoto: 0n });
    expect(totais.vozEVoto).toBe(9_018_768n);
    expect(problemas).toEqual([]);
  });

  it('trava: ninguém concede o voto de quota que não tem', () => {
    const { problemas } = montarUsufruto({
      capital: CAPITAL,
      participantes: [pessoa('avelino', 'Avelino', 0n), pessoa('regina', 'Regina', 1_000_000n)],
      concessoes: [concede('regina', ['avelino'], 1_300_000n, 'instituicao')],
    });
    expect(problemas.map((p) => p.codigo)).toEqual(['concede-mais-do-que-tem']);
    expect(problemas[0].mensagem).toMatch(/1\.300\.000 quotas, mas tem 1\.000\.000/);
  });

  it('trava: concessão sem destino não existe', () => {
    const { problemas } = montarUsufruto({
      capital: CAPITAL,
      participantes: [pessoa('regina', 'Regina', 1_000_000n)],
      concessoes: [concede('regina', [], 500_000n, 'instituicao')],
    });
    expect(problemas.map((p) => p.codigo)).toEqual(['concessao-sem-destino']);
  });

  it('sem concessão nenhuma, cada um vota o que tem', () => {
    const { linhas, totais } = montarUsufruto({
      capital: 1_000n,
      participantes: [pessoa('a', 'A', 600n), pessoa('b', 'B', 400n)],
      concessoes: [],
    });
    expect(linhas.map((l) => l.pctVozEVoto)).toEqual(['60.0000', '40.0000']);
    expect(totais.vozEVoto).toBe(1_000n);
    expect(totais.nua).toBe(0n);
  });

  it('concessão de zero quota não conta como concessão', () => {
    const { linhas, problemas } = montarUsufruto({
      capital: 1_000n,
      participantes: [pessoa('a', 'A', 1_000n), pessoa('b', 'B', 0n)],
      concessoes: [concede('a', ['b'], 0n, 'instituicao')],
    });
    expect(linhas[0]).toMatchObject({ plena: 1_000n, nua: 0n, concedePara: [] });
    expect(problemas).toEqual([]);
  });
});

describe('repartir a instituição entre concedentes', () => {
  it('em partes iguais, com a soma exata', () => {
    // Cenário II do Agro Aliança: 426.052 entre duas instituintes.
    expect(repartirInstituicao(426_052n, 2)).toEqual([213_026n, 213_026n]);
    // Resto indivisível vai nos primeiros, uma quota cada.
    expect(repartirInstituicao(1_000n, 3)).toEqual([334n, 333n, 333n]);
    expect(repartirInstituicao(1_000n, 3).reduce((a, q) => a + q, 0n)).toBe(1_000n);
  });

  it('sem concedente ou sem quota, devolve zeros', () => {
    expect(repartirInstituicao(0n, 2)).toEqual([0n, 0n]);
    expect(repartirInstituicao(100n, 0)).toEqual([]);
  });
});

describe('editar uma concessao mantendo o total', () => {
  const soma = (m: Map<string, bigint>) => [...m.values()].reduce((a, q) => a + q, 0n);

  it('zerar uma passa a parte dela para a outra', () => {
    // O caso concreto: 426.051 divididos entre Cristina e Regina, e o analista quer
    // tudo da Regina - SEM derrubar os 51% do pai, que e o total contratado.
    const r = redistribuirConcessoes(
      [{ id: 'cristina', quotas: 213_026n }, { id: 'regina', quotas: 213_025n }],
      'cristina', 0n, 426_051n,
    );
    expect(r.get('cristina')).toBe(0n);
    expect(r.get('regina')).toBe(426_051n);
    expect(soma(r)).toBe(426_051n);
  });

  it('preserva a PROPORCAO das outras', () => {
    // A tinha o dobro de B. Depois de mexer na C, segue com o dobro.
    const r = redistribuirConcessoes(
      [{ id: 'a', quotas: 400n }, { id: 'b', quotas: 200n }, { id: 'c', quotas: 400n }],
      'c', 100n, 1_000n,
    );
    expect(r.get('c')).toBe(100n);
    expect(r.get('a')).toBe(600n);
    expect(r.get('b')).toBe(300n);
    expect(soma(r)).toBe(1_000n);
  });

  it('todas em zero divide igual, e o resto nao vaza', () => {
    const r = redistribuirConcessoes(
      [{ id: 'a', quotas: 0n }, { id: 'b', quotas: 0n }, { id: 'c', quotas: 0n }],
      'a', 1n, 1_000n,
    );
    expect(r.get('a')).toBe(1n);
    expect(soma(r)).toBe(1_000n);
  });

  it('concedente unico fica com o total', () => {
    // Aceitar menos derrubaria o percentual do usufrutuario sem ninguem pedir.
    for (const pedido of [0n, 50n, 999n]) {
      const r = redistribuirConcessoes([{ id: 'a', quotas: 0n }], 'a', pedido, 500n);
      expect(r.get('a'), String(pedido)).toBe(500n);
    }
  });

  it('pedir mais do que o total grava o total e zera as outras', () => {
    const r = redistribuirConcessoes(
      [{ id: 'a', quotas: 100n }, { id: 'b', quotas: 100n }],
      'a', 999_999n, 200n,
    );
    expect(r.get('a')).toBe(200n);
    expect(r.get('b')).toBe(0n);
  });
});
