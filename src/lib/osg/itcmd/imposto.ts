// A forma fechada do ITCD/MT:
//
//   k       = primeira faixa em que base <= limite(k) × UPF
//   imposto = alíquota(k) × base − dedução(k) × UPF
//
// É IDÊNTICA à soma faixa a faixa, porque a dedução de cada faixa é exatamente o
// que as faixas inferiores deixariam de cobrar (SPEC §2.2). Uma linha em vez de
// trinta células — e a continuidade nos quatro limites é o teste que prova isso.
//
// Efeito contraintuitivo que ninguém deve "consertar": d(imposto)/d(UPF) =
// −dedução(k). Acima de 10.000 UPF a derivada é −310, ou seja, **UPF maior dá
// imposto menor**, porque os limites das faixas sobem junto (SPEC §3.3). Quem
// revisar vai achar que há sinal invertido. Não há.

import { CENTAVO, type Money } from '@/lib/osg/itcmd/dinheiro';
import { faixaDaBase, type Faixa } from '@/lib/osg/itcmd/faixas';

/**
 * Aplica UMA faixa, sem escolhê-la. Existe separado porque é aqui que mora a
 * guarda de imposto negativo: com a faixa certa o resultado nunca é negativo
 * (no piso de cada faixa a fórmula dá exatamente o valor da faixa anterior), e
 * portanto negativo só aparece se a faixa foi resolvida errada. Nesse caso é
 * erro — truncar em zero esconderia o defeito (SPEC §2.3).
 */
export function aplicarFaixa(faixa: Faixa, base: Money, upf: Money): Money {
  exigirDuasCasas(base);
  // `× n / 100` é exato porque a base é múltipla de 1 centavo: n × base já é
  // múltiplo de 100 na escala 1e-4 e a divisão não deixa resto.
  const parteAliquota = (faixa.aliquotaPercentual * base) / 100n;
  const parteDeducao = faixa.deducaoUpf * upf;
  const imposto = parteAliquota - parteDeducao;
  if (imposto < 0n) {
    throw new Error(
      `Imposto negativo apurado na faixa ${faixa.ordem} (${faixa.rotulo}). `
      + 'A faixa não corresponde à base: verifique a resolução da faixa. '
      + 'Imposto negativo é erro, não zero.',
    );
  }
  return imposto;
}

/**
 * Imposto de uma base, resolvendo a faixa. Resultado **exato** em escala 1e-4,
 * sem arredondar: o arredondamento a 2 casas acontece uma única vez, por
 * donatário e por cenário, em `simulacao.ts`. Arredondar aqui e somar depois dá
 * resultado diferente (SPEC §8).
 */
export function impostoExato(base: Money, upf: Money): Money {
  exigirDuasCasas(base);
  return aplicarFaixa(faixaDaBase(base, upf), base, upf);
}

// A exatidão da escala 1e-4 depende de a base ter no máximo 2 casas: só assim
// `alíquota × base` cabe em 4 casas. Base não quantizada é erro de quem chamou.
function exigirDuasCasas(base: Money): void {
  if (base % CENTAVO !== 0n) {
    throw new Error(
      'A base do ITCD tem de ser quantizada a duas casas antes da fórmula '
      + '(SPEC §2.3): é essa condição que torna a escala 1e-4 exata.',
    );
  }
}
