import { describe, expect, it } from 'vitest';
import {
  montarQuadro,
  type ParticipanteDoQuadro,
} from '@/lib/osg/quadroSimulacaoItcmd';

// Caso de referência do Agro Aliança: o casal doando em conjunto (4.448.500 quotas) e
// duas filhas, com a legítima e a disponível como o instrumento as declara.
//
//   Pessoa               Papel     Quotas       Legítima  Disponível  Recebido     Final       %
//   Avelino e Iracema  Doador   4.448.500          —           —          —           0    0,0000%
//   Cristina           Donat.   1.483.000   1.112.125   2.183.847  3.295.972  4.778.972  50,00%
//   Regina             Donat.   3.626.444   1.112.125      40.403  1.152.528  4.778.972  50,00%
//
// Os números são dos INSTRUMENTOS. Aqui eles são DECLARADOS, não calculados: a OSG não
// sabe a legítima de antemão, ela sai do que se quer doar e do que a SEFAZ aponta.

const doador = (
  pessoaId: string,
  nome: string,
  quotasAtuais: bigint,
): ParticipanteDoQuadro => ({
  pessoaId, nome, papel: 'doa', quotasAtuais, legitima: 0n, disponivel: 0n,
});

const donatario = (
  pessoaId: string,
  nome: string,
  quotasAtuais: bigint,
  legitima: bigint,
  disponivel: bigint,
): ParticipanteDoQuadro => ({
  pessoaId, nome, papel: 'recebe', quotasAtuais, legitima, disponivel,
});

const TOTAL = 9_557_944n;

describe('quadro da simulação', () => {
  it('reproduz o quadro de referência, linha a linha', () => {
    const { linhas, totais, problemas } = montarQuadro({
      totalDeQuotas: TOTAL,
      participantes: [
        doador('casal', 'Avelino e Iracema', 4_448_500n),
        donatario('cristina', 'Cristina', 1_483_000n, 1_112_125n, 2_183_847n),
        donatario('regina', 'Regina', 3_626_444n, 1_112_125n, 40_403n),
      ],
    });

    // O doador sai do quadro: doa a totalidade e termina em zero.
    expect(linhas[0]).toMatchObject({
      pctAtual: '46.5424', transmitido: 4_448_500n, participacaoFinal: 0n,
      pctFinal: '0.0000',
    });

    // As duas filhas fecham em 50% exatos, com legítimas iguais e disponíveis
    // desiguais — é a disponível que iguala a participação final.
    expect(linhas[1]).toMatchObject({
      recebido: 3_295_972n, participacaoFinal: 4_778_972n, pctFinal: '50.0000',
    });
    expect(linhas[2]).toMatchObject({
      recebido: 1_152_528n, participacaoFinal: 4_778_972n, pctFinal: '50.0000',
    });

    expect(totais).toMatchObject({
      transmitido: 4_448_500n,
      recebido: 4_448_500n,
      legitima: 2_224_250n,
      disponivel: 2_224_250n,
      participacaoFinal: 9_557_944n,
      sobra: 0n,
      pctFinal: '100.0000',
    });
    expect(problemas).toEqual([]);
  });

  it('CAMPOS LIVRES: legítima sem teto, e para qualquer donatário', () => {
    // Irmã para irmã, avô para netos: não há herdeiro necessário a inferir para
    // liberar a coluna. Quem declara é o analista, e nada aqui o contradiz.
    const { linhas, problemas } = montarQuadro({
      totalDeQuotas: TOTAL,
      participantes: [
        doador('regina', 'Regina', 3_626_444n),
        // Uma irmã recebendo tudo como legítima, o que nenhuma regra de teto
        // permitiria antes.
        donatario('cristina', 'Cristina', 1_483_000n, 3_626_444n, 0n),
      ],
    });

    expect(linhas[1].legitima).toBe(3_626_444n);
    expect(linhas[1].recebido).toBe(3_626_444n);
    expect(problemas).toEqual([]);
  });

  it('DOAÇÃO PARCIAL: o que não se distribui fica com o doador, e sai como sobra', () => {
    const { linhas, totais, problemas } = montarQuadro({
      totalDeQuotas: TOTAL,
      participantes: [
        doador('casal', 'Avelino e Iracema', 4_448_500n),
        donatario('regina', 'Regina', 3_626_444n, 1_000_000n, 0n),
      ],
    });

    // Sobra 3.448.500 oferecidas e não distribuídas: AVISO, não trava.
    expect(totais.sobra).toBe(3_448_500n);
    expect(problemas).toEqual([]);

    // O QUE SAIU DELE é o que a donatária levou, e não o que ele ofereceu: quota
    // oferecida e não distribuída não saiu do lugar, e ele TERMINA COM ELA.
    expect(linhas[0].transmitido).toBe(1_000_000n);
    expect(linhas[0].participacaoFinal).toBe(3_448_500n);
    // Daí a conferência que fecha sempre: nada se cria nem se perde no ato.
    expect(totais.participacaoFinal).toBe(totais.quotasAtuais);
  });

  it('trava: ninguém recebe o que não foi doado', () => {
    // A única trava aritmética que sobrou: legítima + disponível não passa do que os
    // doadores têm. Ela absorveu a antiga "ninguém doa mais do que tem", que era a
    // mesma impossibilidade dita pelo outro lado.
    const { problemas, totais } = montarQuadro({
      totalDeQuotas: TOTAL,
      participantes: [
        doador('casal', 'Casal', 4_448_500n),
        donatario('regina', 'Regina', 0n, 4_000_000n, 1_000_000n),
      ],
    });
    expect(problemas.map((x) => x.codigo)).toEqual(['distribuido-passa-do-doado']);
    expect(problemas[0].mensagem).toMatch(/5\.000\.000 quotas e os doadores têm 4\.448\.500/);
    // O que ele tem é o limite do que sai dele: a linha não fica negativa.
    expect(totais.sobra).toBe(-551_500n);
  });

  it('trava: a mesma pessoa não entra duas vezes', () => {
    const { problemas } = montarQuadro({
      totalDeQuotas: TOTAL,
      participantes: [
        doador('casal', 'Casal', 4_448_500n),
        donatario('regina', 'Regina', 0n, 2_224_250n, 0n),
        donatario('regina', 'Regina', 0n, 2_224_250n, 0n),
      ],
    });
    expect(problemas.map((x) => x.codigo)).toContain('pessoa-repetida');
  });

  it('linha ainda sem pessoa escolhida não conta como repetida', () => {
    const { problemas } = montarQuadro({
      totalDeQuotas: TOTAL,
      participantes: [
        doador('casal', 'Casal', 4_448_500n),
        donatario('regina', 'Regina', 0n, 4_448_500n, 0n),
        donatario('', '', 0n, 0n, 0n),
        donatario('', '', 0n, 0n, 0n),
      ],
    });
    expect(problemas.map((x) => x.codigo)).not.toContain('pessoa-repetida');
  });

  it('o TOTAL em percentual fecha 100% quando o doado é o distribuído', () => {
    // Com TODO o capital na lista e o doado igual ao distribuído, o total fecha: nada
    // se cria nem se perde dentro do ato.
    const fecha = montarQuadro({
      totalDeQuotas: TOTAL,
      participantes: [
        doador('casal', 'Avelino e Iracema', 4_448_500n),
        donatario('cristina', 'Cristina', 1_483_000n, 1_112_125n, 2_183_847n),
        donatario('regina', 'Regina', 3_626_444n, 1_112_125n, 40_403n),
      ],
    });
    expect(fecha.totais.pctAtual).toBe('100.0000');
    expect(fecha.totais.pctFinal).toBe('100.0000');

    // Sobrando quota oferecida e não distribuída, o total SEGUE em 100%: a sobra fica
    // com quem doa, e não evapora do quadro. Quem diz que ainda falta destinar algo é
    // a sobra, não o percentual.
    const sobra = montarQuadro({
      totalDeQuotas: TOTAL,
      participantes: [
        doador('casal', 'Avelino e Iracema', 4_448_500n),
        donatario('cristina', 'Cristina', 1_483_000n, 1_000_000n, 0n),
        donatario('regina', 'Regina', 3_626_444n, 0n, 0n),
      ],
    });
    expect(sobra.totais.sobra).toBe(3_448_500n);
    expect(sobra.totais.pctFinal).toBe('100.0000');
    expect(sobra.linhas[0].participacaoFinal).toBe(3_448_500n);
    expect(sobra.problemas).toEqual([]);

    // O que TIRA o total de 100% é outra coisa: sócio de fora do ato. O quadro mostra
    // a fatia do capital que este ato movimenta, e menor que 100% é o normal.
    const parcial = montarQuadro({
      totalDeQuotas: TOTAL,
      participantes: [
        doador('casal', 'Avelino e Iracema', 4_448_500n),
        donatario('cristina', 'Cristina', 1_483_000n, 4_448_500n, 0n),
      ],
    });
    // 5.931.500 de 9.557.944 — o resto do capital não entrou no ato.
    expect(parcial.totais.pctFinal).toBe('62.0583');
    expect(parcial.problemas).toEqual([]);
  });
});
