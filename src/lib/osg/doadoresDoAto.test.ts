import { describe, expect, it } from 'vitest';
import {
  derivarDoadoresFiscais, formaDoCadastro, idDoCasal,
  type BlocoDoado, type FormaDoDoador, type PessoaParaForma,
} from '@/lib/osg/doadoresDoAto';

// UMA GIA POR DOADOR, com os beneficiários dentro dela. As duas formas de doação
// de casal estão presas aqui, porque cada uma reproduz um ato real diferente e a
// diferença entre elas é de faixa de alíquota.

const bloco = (quotas: bigint, forma: FormaDoDoador): BlocoDoado => ({
  titularId: 'avelino',
  titularNome: 'Avelino',
  quotasDoadas: quotas,
  forma,
});

const IRACEMA = { conjugeId: 'iracema', conjugeNome: 'Iracema' };

describe('doadores do ato — quantas GIAs o ato gera', () => {
  it('casal em conjunto é UM doador, com o bloco indiviso', () => {
    // O instrumento do Agro Aliança: "os DOADORES são proprietários de 4.448.500
    // quotas". Patrimônio indiviso, uma guia, os dois assinando.
    const doadores = derivarDoadoresFiscais([
      bloco(4_448_500n, { tipo: 'casal-conjunto', ...IRACEMA }),
    ]);

    expect(doadores).toHaveLength(1);
    expect(doadores[0]).toMatchObject({
      doadorId: idDoCasal('avelino', 'iracema'),
      nome: 'Avelino e Iracema',
      quotasDoadas: 4_448_500n,
      ehCasalConjunto: true,
    });
    // Os dois assinam como doadores, e é isso que a guia declara.
    expect(doadores[0].pessoaIds.sort()).toEqual(['avelino', 'iracema']);
  });

  it('o id do casal não depende de quem foi declarado primeiro', () => {
    // Senão trocar o titular geraria outro doador, e a simulação mudaria de número
    // sem nada de fato mudar.
    expect(idDoCasal('a', 'b')).toBe(idDoCasal('b', 'a'));

    const daqui = derivarDoadoresFiscais([
      bloco(100n, { tipo: 'casal-conjunto', ...IRACEMA }),
    ]);
    const dali = derivarDoadoresFiscais([{
      titularId: 'iracema', titularNome: 'Iracema', quotasDoadas: 100n,
      forma: { tipo: 'casal-conjunto', conjugeId: 'avelino', conjugeNome: 'Avelino' },
    }]);
    expect(daqui[0].doadorId).toBe(dali[0].doadorId);
  });

  it('individual e casal separado dão o titular sozinho', () => {
    // O caso de dez/2025: cada cônjuge doou o que estava registrado no nome dele, e
    // por isso as bases saíram desiguais. Quem não tem quota no quadro não tem o que
    // doar por si — a forma separada só muda algo quando os dois têm quotas.
    for (const forma of [
      { tipo: 'individual' } as const,
      { tipo: 'casal-separado', ...IRACEMA } as const,
    ]) {
      const doadores = derivarDoadoresFiscais([bloco(4_448_500n, forma)]);
      expect(doadores, forma.tipo).toHaveLength(1);
      expect(doadores[0].doadorId).toBe('avelino');
      expect(doadores[0].ehCasalConjunto).toBe(false);
      expect(doadores[0].pessoaIds).toEqual(['avelino']);
    }
  });

  it('os dois cônjuges sócios, separados, dão DUAS guias', () => {
    const doadores = derivarDoadoresFiscais([
      {
        titularId: 'jose', titularNome: 'José', quotasDoadas: 12_596_190n,
        forma: { tipo: 'casal-separado', conjugeId: 'maria', conjugeNome: 'Maria' },
      },
      {
        titularId: 'maria', titularNome: 'Maria', quotasDoadas: 6_487_402n,
        forma: { tipo: 'casal-separado', conjugeId: 'jose', conjugeNome: 'José' },
      },
    ]);

    expect(doadores).toHaveLength(2);
    // Blocos DESIGUAIS, como nas quatro guias reais.
    expect(doadores.map((d) => d.quotasDoadas)).toEqual([12_596_190n, 6_487_402n]);
  });

  it('os dois cônjuges sócios, em conjunto, dão UMA guia com a soma', () => {
    const doadores = derivarDoadoresFiscais([
      {
        titularId: 'jose', titularNome: 'José', quotasDoadas: 12_596_190n,
        forma: { tipo: 'casal-conjunto', conjugeId: 'maria', conjugeNome: 'Maria' },
      },
      {
        titularId: 'maria', titularNome: 'Maria', quotasDoadas: 6_487_402n,
        forma: { tipo: 'casal-conjunto', conjugeId: 'jose', conjugeNome: 'José' },
      },
    ]);

    // Um doador só: o casal. As duas linhas colapsam porque o id é o mesmo.
    expect(doadores).toHaveLength(1);
    expect(doadores[0].quotasDoadas).toBe(19_083_592n);
    expect(doadores[0].ehCasalConjunto).toBe(true);
  });

  it('forma não informada interrompe, em vez de escolher uma', () => {
    // A escolha vale R$ 52.554,43 no Agro Aliança. Não é default escondido.
    expect(() => derivarDoadoresFiscais([bloco(100n, { tipo: 'nao-informado' })]))
      .toThrow(/Forma da doação não informada/i);
  });

  it('cônjuge de si mesmo é erro, e bloco negativo também', () => {
    expect(() => derivarDoadoresFiscais([{
      titularId: 'x', titularNome: 'X', quotasDoadas: 100n,
      forma: { tipo: 'casal-conjunto', conjugeId: 'x', conjugeNome: 'X' },
    }])).toThrow(/cônjuge de si mesmo/i);

    expect(() => derivarDoadoresFiscais([bloco(-1n, { tipo: 'individual' })]))
      .toThrow(/negativas/i);
  });

  it('doador sem quota não emite guia', () => {
    expect(derivarDoadoresFiscais([bloco(0n, { tipo: 'individual' })])).toEqual([]);
  });
});

describe('doadores do ato — o que o cadastro resolve', () => {
  const NOMES = new Map([['c', 'Cônjuge']]);
  const pessoa = (campos: Partial<PessoaParaForma>): PessoaParaForma => ({
    id: 't',
    denominacao: 'Titular',
    estado_civil: null,
    regime_bens: null,
    conjuge_id: null,
    ...campos,
  });

  it('solteiro, viúvo e divorciado são individuais, sem pergunta', () => {
    for (const civil of ['Solteiro(a)', 'Viúvo(a)', 'Divorciado(a)']) {
      expect(formaDoCadastro(pessoa({ estado_civil: civil }), NOMES), civil)
        .toEqual({ estado: 'resolvida', forma: { tipo: 'individual' } });
    }
  });

  it('separação total é individual: o cônjuge não tem parte no que se doa', () => {
    expect(formaDoCadastro(pessoa({
      estado_civil: 'Casado(a)', regime_bens: 'Separação Total', conjuge_id: 'c',
    }), NOMES)).toEqual({ estado: 'resolvida', forma: { tipo: 'individual' } });
  });

  it('UNIVERSAL vira uma GIA para o casal; PARCIAL, uma para cada', () => {
    // Regra do manual, págs. 9 e 16, confirmada pela sênior da OSG. Vem pronta — nada
    // a digitar — e trocável, porque o caso concreto pode ter sido lavrado de outro
    // jeito: o instrumento do Agro Aliança é parcial e saiu em uma DARE só.
    const universal = formaDoCadastro(pessoa({
      estado_civil: 'Casado(a)', regime_bens: 'Comunhão Universal', conjuge_id: 'c',
    }), NOMES);
    expect(universal.estado).toBe('escolha');
    expect(universal.estado === 'escolha' && universal.forma).toEqual({
      tipo: 'casal-conjunto', conjugeId: 'c', conjugeNome: 'Cônjuge',
    });

    const parcial = formaDoCadastro(pessoa({
      estado_civil: 'Casado(a)', regime_bens: 'Comunhão Parcial', conjuge_id: 'c',
    }), NOMES);
    expect(parcial.estado).toBe('escolha');
    expect(parcial.estado === 'escolha' && parcial.forma).toEqual({
      tipo: 'casal-separado', conjugeId: 'c', conjugeNome: 'Cônjuge',
    });
  });

  it('comunhão SEM cônjuge vinculado pede o vínculo', () => {
    const p = formaDoCadastro(pessoa({
      estado_civil: 'Casado(a)', regime_bens: 'Comunhão Universal',
    }), NOMES);
    expect(p.estado).toBe('pede-conjuge');

    // Vínculo apontando para quem não existe conta como não vinculado.
    expect(formaDoCadastro(pessoa({
      estado_civil: 'Casado(a)', regime_bens: 'Comunhão Parcial', conjuge_id: 'sumiu',
    }), NOMES).estado).toBe('pede-conjuge');
  });

  it('regime desconhecido pede o regime em vez de escolher o parecido', () => {
    const p = formaDoCadastro(pessoa({
      estado_civil: 'Casado(a)', regime_bens: 'Participação Final nos Aquestos',
    }), NOMES);
    expect(p.estado).toBe('pede-regime');
    expect(p.estado === 'pede-regime' && p.motivo).toMatch(/Aquestos/);

    expect(formaDoCadastro(pessoa({}), NOMES).estado).toBe('pede-regime');
  });

  it('a grafia do rótulo não decide: acento e caixa são normalizados', () => {
    for (const rotulo of ['comunhao parcial', 'COMUNHÃO PARCIAL', ' Comunhão Parcial ']) {
      expect(formaDoCadastro(pessoa({
        estado_civil: 'Casado(a)', regime_bens: rotulo, conjuge_id: 'c',
      }), NOMES).estado, rotulo).toBe('escolha');
    }
  });
});
