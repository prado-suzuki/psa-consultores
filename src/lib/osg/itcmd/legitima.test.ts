import { describe, expect, it } from 'vitest';
import { calcularLegitima, tetoDoAto } from '@/lib/osg/itcmd/legitima';

const doador = (id: string, quotas: bigint) => ({ doadorId: id, quotas });

describe('legítima e parte disponível', () => {
  it('referência: reproduz os 1.831.720 do caso Santa Terezinha', () => {
    // SPEC §6.2 — teto(4.290.321/2/2) + teto(3.036.555/2/2).
    const r = calcularLegitima(
      [doador('cristiano', 4_290_321n), doador('fabiane', 3_036_555n)],
      2,
    );
    expect(r.legitimaPorHerdeiro).toBe(1_831_720n);
    expect(r.porDoador.map((d) => d.legitimaPorHerdeiro)).toEqual([1_072_581n, 759_139n]);
    expect(r.legitimaTotal).toBe(3_663_440n);
    expect(r.patrimonioDoado).toBe(7_326_876n);
    expect(r.disponivelTotal).toBe(3_663_436n);
  });

  it('a ordem das operações importa: somar os patrimônios antes de dividir daria 1.831.719', () => {
    // O teto é aplicado POR DOADOR e POR HERDEIRO. Consolidar antes perde o
    // arredondamento de cada doador e deixa de reproduzir o publicado.
    const porDoador = calcularLegitima(
      [doador('cristiano', 4_290_321n), doador('fabiane', 3_036_555n)],
      2,
    );
    const somadoAntes = calcularLegitima([doador('consolidado', 7_326_876n)], 2);
    expect(somadoAntes.legitimaPorHerdeiro).toBe(1_831_719n);
    expect(porDoador.legitimaPorHerdeiro).not.toBe(somadoAntes.legitimaPorHerdeiro);
    expect(porDoador.legitimaPorHerdeiro - somadoAntes.legitimaPorHerdeiro).toBe(1n);
  });

  it('invariante: total ímpar de quotas fecha com a disponível absorvendo o resto', () => {
    // Arredondar a legítima para cima é a direção segura — ela não pode ser
    // menor que a metade — e a diferença sai da disponível (SPEC §6.1).
    const casos: Array<[bigint[], number]> = [
      [[7n], 2],
      [[3n], 3],
      [[4_290_321n, 3_036_555n], 3],
      [[6_086_672n, 562_728n], 2],
    ];
    for (const [quotas, n] of casos) {
      const r = calcularLegitima(quotas.map((q, i) => doador(`d${i}`, q)), n);
      const rotulo = `${quotas.join('+')} entre ${n}`;
      // Nada se perde nem se cria: legítima + disponível = patrimônio doado.
      expect(r.legitimaTotal + r.disponivelTotal, rotulo).toBe(r.patrimonioDoado);
      // A legítima nunca fica abaixo da metade.
      expect(r.legitimaTotal * 2n >= r.patrimonioDoado, rotulo).toBe(true);
      expect(r.disponivelTotal >= 0n, rotulo).toBe(true);
    }
    // O caso ímpar mínimo, explícito: teto(7/2/2) = 2 por herdeiro, 4 de
    // legítima e 3 de disponível.
    const impar = calcularLegitima([doador('unico', 7n)], 2);
    expect([impar.legitimaPorHerdeiro, impar.legitimaTotal, impar.disponivelTotal])
      .toEqual([2n, 4n, 3n]);
    // Degenerado (1 quota entre 5 herdeiros): o teto por herdeiro ultrapassa o
    // patrimônio e a disponível fica NEGATIVA. Não se trunca em zero — o número
    // sai como é e quem distribui vê que não há disponível a distribuir.
    expect(calcularLegitima([doador('unico', 1n)], 5).disponivelTotal).toBe(-4n);
  });

  it('o divisor é quantos herdeiros EXISTEM, não quantos recebem', () => {
    // Caso real do Agro Aliança: Avelino doa 4.448.500 e tem duas filhas.
    const d = calcularLegitima([doador('avelino', 4_448_500n)], 2);
    expect(d.legitimaPorHerdeiro).toBe(1_112_125n);
    expect(d.numeroDeHerdeiros).toBe(2);
    expect(d.disponivelTotal).toBe(2_224_250n);

    // As duas recebem: dá para doar tudo, e é o que a GIA-ITCD 337978 fez.
    expect(tetoDoAto(d, 2)).toBe(4_448_500n);

    // Só uma recebe: a legítima da outra NÃO vira disponível. O teto cai para a
    // legítima de uma mais a disponível inteira, e as 1.112.125 da que ficou de
    // fora permanecem com o doador.
    expect(tetoDoAto(d, 1)).toBe(3_336_375n);
    expect(d.patrimonioDoado - tetoDoAto(d, 1)).toBe(d.legitimaPorHerdeiro);

    // É ISTO que o divisor errado quebrava: dividir pelos SELECIONADOS daria
    // legítima de 2.224.250 para a única marcada e liberaria o acervo inteiro.
    const seDivididoPelosSelecionados = calcularLegitima([doador('avelino', 4_448_500n)], 1);
    expect(seDivididoPelosSelecionados.legitimaPorHerdeiro).toBe(2_224_250n);
    expect(tetoDoAto(seDivididoPelosSelecionados, 1)).toBe(4_448_500n);
    expect(tetoDoAto(seDivididoPelosSelecionados, 1)).not.toBe(tetoDoAto(d, 1));

    // Nenhum herdeiro recebe: só a disponível é doável.
    expect(tetoDoAto(d, 0)).toBe(2_224_250n);

    // Mais donatários do que herdeiros é incoerência, não um teto maior.
    expect(() => tetoDoAto(d, 3)).toThrow(/herdeiros necessários/i);

    // Disponível negativa (degenerado) não vira crédito no teto.
    const degenerado = calcularLegitima([doador('unico', 1n)], 5);
    expect(degenerado.disponivelTotal).toBe(-4n);
    expect(tetoDoAto(degenerado, 5)).toBe(5n);
  });
});
