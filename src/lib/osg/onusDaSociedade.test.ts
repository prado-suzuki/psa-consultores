import { describe, it, expect } from 'vitest';
import {
  planejarInstituicaoDeUsufruto,
  planejarSubrogacao,
  quotasQueFaltamParaOAlvo,
  type OnusVigente,
} from './onusDaSociedade';

const PAI = 'pai';
const MAE = 'mae';
const FILHA = 'filha';
const FILHO = 'filho';
const EMPRESA = 'empresa';
const NOMES = new Map([
  [PAI, 'João'], [MAE, 'Maria'], [FILHA, 'Ana'], [FILHO, 'Bruno'], [EMPRESA, 'Holding Ltda'],
]);

const onus = (over: Partial<OnusVigente> & Pick<OnusVigente, 'id' | 'nuProprietarioId' | 'quotas'>): OnusVigente => ({
  usufrutuarioIds: [],
  usufrutoOrigem: null,
  comVoto: true,
  gravames: [],
  ...over,
});

describe('sub-rogação: a quota gravada muda de mão e o ônus vai junto', () => {
  const gravado = onus({
    id: 'o1', nuProprietarioId: FILHA, quotas: 600,
    usufrutuarioIds: [PAI], usufrutoOrigem: 'reserva',
    gravames: ['inalienabilidade', 'impenhorabilidade'],
  });

  it('quota livre basta: o ônus não é tocado', () => {
    // A filha tem 1.000, das quais 600 gravadas. Doar 400 sai só das livres.
    const plano = planejarSubrogacao({
      movimento: { tipo: 'doacao', origemPessoaId: FILHA, destinoPessoaId: FILHO, quotas: 400 },
      onusVigentes: [gravado], saldoDoCedente: 1000, nomes: NOMES,
    });
    expect(plano).toMatchObject({
      novos: [], reduzidos: [], extintos: [], quotasOneradasQueSaem: 0, problema: null, avisos: [],
    });
  });

  it('passando das livres, o ônus encolhe e o gravame acompanha a parte que saiu', () => {
    const plano = planejarSubrogacao({
      movimento: { tipo: 'doacao', origemPessoaId: FILHA, destinoPessoaId: FILHO, quotas: 500 },
      onusVigentes: [gravado], saldoDoCedente: 1000, nomes: NOMES,
    });
    expect(plano.quotasOneradasQueSaem).toBe(100);
    expect(plano.reduzidos).toEqual([{ onusId: 'o1', quotas: 500 }]);
    expect(plano.extintos).toEqual([]);
    expect(plano.novos).toEqual([{
      deOnusId: 'o1', nuProprietarioId: FILHO, usufrutuarioIds: [PAI],
      usufrutoOrigem: 'reserva', comVoto: true, quotas: 100,
      gravames: ['inalienabilidade', 'impenhorabilidade'],
    }]);
    expect(plano.avisos.join(' ')).toContain('o gravame é da quota e acompanha Bruno');
  });

  it('consumindo o ônus inteiro, ele se extingue no cedente e renasce no adquirente', () => {
    const plano = planejarSubrogacao({
      movimento: { tipo: 'doacao', origemPessoaId: FILHA, destinoPessoaId: FILHO, quotas: 1000 },
      onusVigentes: [gravado], saldoDoCedente: 1000, nomes: NOMES,
    });
    expect(plano.extintos).toEqual(['o1']);
    expect(plano.reduzidos).toEqual([]);
    expect(plano.novos[0]).toMatchObject({ nuProprietarioId: FILHO, quotas: 600 });
  });

  it('consome os ônus na ordem em que vieram, do mais antigo para o mais novo', () => {
    const antigo = onus({ id: 'o1', nuProprietarioId: FILHA, quotas: 200, gravames: ['incomunicabilidade'] });
    const novo = onus({ id: 'o2', nuProprietarioId: FILHA, quotas: 300, gravames: ['reversibilidade'] });
    const plano = planejarSubrogacao({
      movimento: { tipo: 'doacao', origemPessoaId: FILHA, destinoPessoaId: FILHO, quotas: 300 },
      onusVigentes: [antigo, novo], saldoDoCedente: 500, nomes: NOMES,
    });
    expect(plano.extintos).toEqual(['o1']);
    expect(plano.reduzidos).toEqual([{ onusId: 'o2', quotas: 200 }]);
    expect(plano.novos.map((n) => [n.deOnusId, n.quotas])).toEqual([['o1', 200], ['o2', 100]]);
  });

  it('inalienabilidade barra a cessão ONEROSA e não a transmissão gratuita', () => {
    const args = { onusVigentes: [gravado], saldoDoCedente: 600, nomes: NOMES };
    const onerosa = planejarSubrogacao({
      ...args,
      movimento: { tipo: 'cessao', origemPessoaId: FILHA, destinoPessoaId: FILHO, quotas: 100 },
    });
    expect(onerosa.problema).toContain('inalienabilidade');
    expect(onerosa.problema).toContain('Revogue o gravame antes');

    const gratuita = planejarSubrogacao({
      ...args,
      movimento: { tipo: 'doacao', origemPessoaId: FILHA, destinoPessoaId: FILHO, quotas: 100 },
    });
    expect(gratuita.problema).toBeNull();
  });

  it('a nua propriedade indo para quem já usufrui extingue o usufruto por consolidação', () => {
    const plano = planejarSubrogacao({
      // A filha devolve ao pai, que é o usufrutuário, as quotas que recebeu dele.
      movimento: { tipo: 'doacao', origemPessoaId: FILHA, destinoPessoaId: PAI, quotas: 600 },
      onusVigentes: [gravado], saldoDoCedente: 600, nomes: NOMES,
    });
    expect(plano.novos[0]).toMatchObject({
      nuProprietarioId: PAI, usufrutuarioIds: [], usufrutoOrigem: null,
      gravames: ['inalienabilidade', 'impenhorabilidade'],
    });
    expect(plano.avisos.join(' ')).toContain('art. 1.410, VI');
  });

  it('redução cancela as quotas: o ônus some e não renasce em ninguém', () => {
    const plano = planejarSubrogacao({
      movimento: { tipo: 'reducao', origemPessoaId: FILHA, destinoPessoaId: null, quotas: 600 },
      onusVigentes: [gravado], saldoDoCedente: 600, nomes: NOMES,
    });
    expect(plano.extintos).toEqual(['o1']);
    expect(plano.novos).toEqual([]);
    expect(plano.avisos).toEqual([]);
  });

  it('cedente sem ônus nenhum não produz plano', () => {
    expect(planejarSubrogacao({
      movimento: { tipo: 'doacao', origemPessoaId: FILHO, destinoPessoaId: FILHA, quotas: 50 },
      onusVigentes: [gravado], saldoDoCedente: 50, nomes: NOMES,
    })).toMatchObject({ novos: [], extintos: [], problema: null });
  });
});

describe('instituição de usufruto avulsa', () => {
  const quadro = [
    { pessoaId: FILHA, denominacao: 'Ana', quotas: 600 },
    { pessoaId: FILHO, denominacao: 'Bruno', quotas: 400 },
  ];
  const base = { empresaPessoaId: EMPRESA, quadro, nomes: NOMES, comVoto: true };

  it('o par válido vira ônus de origem instituição, sem movimento no livro', () => {
    const plano = planejarInstituicaoDeUsufruto({
      ...base, onusVigentes: [],
      pares: [{ nuProprietarioId: FILHA, usufrutuarioIds: [PAI, MAE], quotas: 600 }],
    });
    expect(plano.problema).toBeNull();
    expect(plano.onus).toEqual([{
      nuProprietarioId: FILHA, usufrutuarioIds: [PAI, MAE],
      usufrutoOrigem: 'instituicao', comVoto: true, quotas: 600, gravames: [],
    }]);

    // O casal usufrutuário conta o bloco UMA vez: 600 de voto entre os dois, não
    // 600 para cada um. Somar por cabeça daria 160% do capital.
    const porNome = new Map(plano.usufruto!.linhas.map((l) => [l.nome, l]));
    expect(porNome.get('Ana')).toMatchObject({ quotas: 600n, plena: 0n, nua: 600n, vozEVoto: 0n });
    expect(porNome.get('João')).toMatchObject({ quotas: 0n, usufruto: 600n, vozEVoto: 600n });
    expect(porNome.get('Maria')).toMatchObject({ quotas: 0n, usufruto: 600n, vozEVoto: 600n });
    expect(plano.usufruto!.totais.vozEVoto).toBe(1000n);
  });

  it('dois pares do mesmo concedente não podem, juntos, passar do que ele tem', () => {
    const plano = planejarInstituicaoDeUsufruto({
      ...base, onusVigentes: [],
      pares: [
        { nuProprietarioId: FILHA, usufrutuarioIds: [PAI], quotas: 400 },
        { nuProprietarioId: FILHA, usufrutuarioIds: [MAE], quotas: 300 },
      ],
    });
    expect(plano.problema).toContain('Ana tem 200 quota(s) com usufruto livre');
    expect(plano.usufruto).toBeNull();
  });

  it('quota cujo voto já foi concedido não se concede de novo', () => {
    const plano = planejarInstituicaoDeUsufruto({
      ...base,
      onusVigentes: [onus({
        id: 'o1', nuProprietarioId: FILHA, quotas: 500,
        usufrutuarioIds: [PAI], usufrutoOrigem: 'reserva',
      })],
      pares: [{ nuProprietarioId: FILHA, usufrutuarioIds: [MAE], quotas: 200 }],
    });
    expect(plano.problema).toContain('Ana tem 100 quota(s) com usufruto livre');
  });

  it('ninguém usufrui a própria quota, e o par sem usufrutuário não existe', () => {
    expect(planejarInstituicaoDeUsufruto({
      ...base, onusVigentes: [],
      pares: [{ nuProprietarioId: FILHA, usufrutuarioIds: [FILHA], quotas: 100 }],
    }).problema).toContain('não pode usufruir a própria quota');

    expect(planejarInstituicaoDeUsufruto({
      ...base, onusVigentes: [],
      pares: [{ nuProprietarioId: FILHA, usufrutuarioIds: [], quotas: 100 }],
    }).problema).toContain('Informe quem passa a usufruir');
  });

  it('quem entrega o voto de tudo o que tem é avisado, e não impedido', () => {
    const plano = planejarInstituicaoDeUsufruto({
      ...base, onusVigentes: [],
      pares: [{ nuProprietarioId: FILHA, usufrutuarioIds: [PAI], quotas: 600 }],
    });
    expect(plano.problema).toBeNull();
    expect(plano.avisos.join(' ')).toContain('Ana fica sem voz e voto próprios');
  });

  it('sem par nenhum não há plano', () => {
    expect(planejarInstituicaoDeUsufruto({ ...base, onusVigentes: [], pares: [] }).problema)
      .toBe('Nenhuma instituição de usufruto foi descrita.');
  });
});

describe('quantas quotas faltam para o alvo de voz e voto', () => {
  it('os números do Agro Aliança: 51% de 9.557.945 menos 4.448.500 já sob usufruto', () => {
    expect(quotasQueFaltamParaOAlvo({
      usufrutuarioId: PAI,
      pctAlvoEscalado: 510_000n,
      capital: 9_557_945n,
      quotasProprias: 0n,
      onusVigentes: [onus({
        id: 'o1', nuProprietarioId: FILHA, quotas: 4_448_500, usufrutuarioIds: [PAI],
        usufrutoOrigem: 'reserva',
      })],
    })).toBe(426_052n);
  });

  it('a reserva que já alcança o alvo não pede instituição nenhuma', () => {
    // Santa Terezinha e MMS: o casal detinha 100%, e a reserva devolve 100% do voto.
    expect(quotasQueFaltamParaOAlvo({
      usufrutuarioId: PAI, pctAlvoEscalado: 510_000n, capital: 1_000n, quotasProprias: 0n,
      onusVigentes: [onus({
        id: 'o1', nuProprietarioId: FILHA, quotas: 1_000, usufrutuarioIds: [PAI],
        usufrutoOrigem: 'reserva',
      })],
    })).toBe(0n);
  });

  it('usufruto sem voto não conta para o alvo, que é de VOZ E VOTO', () => {
    expect(quotasQueFaltamParaOAlvo({
      usufrutuarioId: PAI, pctAlvoEscalado: 510_000n, capital: 1_000n, quotasProprias: 0n,
      onusVigentes: [onus({
        id: 'o1', nuProprietarioId: FILHA, quotas: 1_000, usufrutuarioIds: [PAI],
        usufrutoOrigem: 'reserva', comVoto: false,
      })],
    })).toBe(510n);
  });
});
