import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ABAS_DE_CENARIO as ABAS_AQUI,
  ABA_VENDA_DE_ATIVOS as VENDA_AQUI,
} from './slides.ts';
import {
  ANOS_NO_QUADRO,
  ROTULO_PERCENTUAL_DE_PARCERIA,
  LINHAS_DO_QUADRO_01,
  LINHAS_DO_QUADRO_02,
  PARCELAS_NO_FLUXO,
  formataValor,
  formataVariacao,
  montaDeck,
  type Revisao,
  type ValorDaRevisao,
} from './slides.ts';
import { ABAS_DE_CENARIO, ABA_VENDA_DE_ATIVOS } from '@/lib/planejamento-tributario/mapa';
import {
  ROTULO_PERCENTUAL_DE_PARCERIA as ROTULO_NO_PARSER,
  lerWp,
} from '@/lib/planejamento-tributario/parser';

/**
 * O gerador de conteúdo do capítulo 03, conferido contra os gabaritos da PT-01.
 *
 * ## O que mudou aqui em 21/09/2026
 *
 * O molde passou a ter slot fixo, então a seção `slide` das fixtures deixou de
 * ser gabarito de linha. Ela continua valendo como **gabarito de formatação**
 * (como o número sai escrito) e como **fonte de número conferível**, e é assim
 * que ela é usada abaixo: os valores vêm de lá, a disposição vem do modelo novo.
 *
 * ## O teste que mais importa é o de aritmética
 *
 * O QUADRO 01 não copia linha da planilha: ele reagrupa 80 contas em 11. A única
 * forma de saber que o reagrupamento está certo é que as partes fechem nos
 * totais e que a última linha dê o `(=) Lucro/Prejuízo do exercício` da própria
 * planilha. Se um dia alguém mexer no de-para e a soma abrir, é aqui que quebra,
 * e não na frente do cliente.
 */

const FIXTURES = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'src',
  'lib',
  'planejamento-tributario',
  '__fixtures__',
);

/*
 * A leitura de arquivo e a gravação usam os mesmos nomes de campo, então a
 * adaptação é só tirar o cabeçalho de dentro. É a mesma forma que o
 * `montaConteudo` da PT-02 manda para a RPC.
 */
function comoNoBanco(leitura: ReturnType<typeof lerWp>): Revisao {
  return {
    clienteNoWp: leitura.cabecalho.clienteNoWp,
    valores: leitura.valores,
    anoBase: leitura.cabecalho.anoBase,
    crescimentoAnual: leitura.cabecalho.crescimentoAnual,
  };
}

function leFixture(caso: string) {
  const bytes = readFileSync(join(FIXTURES, caso, 'entrada.xlsx'));
  const esperado = JSON.parse(readFileSync(join(FIXTURES, caso, 'esperado.json'), 'utf-8'));
  return { deck: montaDeck(comoNoBanco(lerWp(bytes))), esperado };
}

/** O número cru do gabarito, pelo rótulo e pelo ano. */
function doGabarito(
  esperado: { valores: ValorDaRevisao[] },
  rotulo: string,
  ano?: number,
): number {
  const achados = esperado.valores.filter(
    (v) => v.rotulo === rotulo && (ano === undefined || v.ano === ano),
  );
  return achados.reduce((t, v) => t + (typeof v.valor === 'number' ? v.valor : 0), 0);
}

/** Desfaz a formatação do slide para poder somar: `(2.447.135)` vira -2447135. */
function numero(escrito: string): number {
  if (/^[-–—]$/.test(escrito.trim())) return 0;
  const negativo = escrito.trim().startsWith('(');
  const digitos = Number(escrito.replace(/[^0-9]/g, ''));
  return negativo ? -digitos : digitos;
}

/*
 * A cópia dos nomes de aba existe porque o Deno não alcança `src/`. Este caso é
 * o que impede a cópia de envelhecer: se alguém renomear uma aba no mapa e
 * esquecer daqui, o gerador passa a filtrar por um nome que não existe mais e o
 * quadro sai vazio, sem erro nenhum.
 */
describe('a cópia dos nomes de aba', () => {
  it('continua igual à do mapa', () => {
    expect(VENDA_AQUI).toBe(ABA_VENDA_DE_ATIVOS.nome);
    expect(ABAS_AQUI).toEqual(ABAS_DE_CENARIO.map((a) => a.nome));
  });

  /* O rótulo do percentual de parceria também é cópia, e pelo mesmo motivo. Se
   * alguém mudar a redação no parser e esquecer daqui, o deck para de achar o
   * valor e o slide volta a sair com traço, sem erro nenhum. */
  it('o rótulo do percentual de parceria é o mesmo do parser', () => {
    expect(ROTULO_PERCENTUAL_DE_PARCERIA).toBe(ROTULO_NO_PARSER);
  });
});

describe('formataValor', () => {
  it('escreve milhar com ponto e sem centavo', () => {
    expect(formataValor(152182209.39529163)).toBe('152.182.209');
    expect(formataValor(21573.216)).toBe('21.573');
  });

  /* O deck real não usa sinal de menos: contabilidade escreve negativo entre
   * parênteses, e o gabarito da DRE confirma. */
  it('põe negativo entre parênteses', () => {
    expect(formataValor(-4781982.6920565)).toBe('(4.781.983)');
    expect(formataValor(-2447134.8370944937)).toBe('(2.447.135)');
  });

  /* Traço é o que diz "não se aplica". Zero escrito por extenso afirmaria que o
   * tributo foi apurado e deu zero, que é outra coisa. */
  it('zero e ausência viram traço', () => {
    expect(formataValor(0)).toBe('-');
    expect(formataValor(undefined)).toBe('-');
    expect(formataValor(null)).toBe('-');
  });
});

/*
 * A faixa do modelo escreve a variação com sinal nos dois lados, e com o menos
 * tipográfico `U+2212`, que é o que está no arquivo. Trocar por hífen muda o
 * desenho da faixa.
 */
describe('formataVariacao', () => {
  it('escreve o sinal dos dois lados', () => {
    expect(formataVariacao(4712221, 6235637)).toBe('−24%');
    expect(formataVariacao(9582620, 6235637)).toBe('+54%');
  });

  it('sem base não há comparação', () => {
    expect(formataVariacao(1000, 0)).toBe('-');
  });

  it('igual ao base é zero, não traço', () => {
    expect(formataVariacao(1000, 1000)).toBe('0%');
  });
});

describe('o QUADRO 01, contra o gabarito da DRE', () => {
  it('tem as 11 linhas e três colunas, sempre', () => {
    const { deck } = leFixture('dre');
    expect(deck.quadro01).toHaveLength(LINHAS_DO_QUADRO_01);
    for (const linha of deck.quadro01) expect(linha).toHaveLength(ANOS_NO_QUADRO);
  });

  it('a receita bruta é a `Receita` da planilha', () => {
    const { deck, esperado } = leFixture('dre');
    expect(deck.quadro01[0][0]).toBe(formataValor(doGabarito(esperado, 'Receita')));
  });

  /*
   * **Esta é a prova que valida o de-para inteiro.** A linha 11 do quadro é
   * calculada por um caminho que a planilha não tem: receita menos custeio, mais
   * financeiro, menos investimento. Se ela dá o `(=) Lucro/Prejuízo do
   * exercício` que a própria planilha escreve, o reagrupamento das 80 contas nas
   * 11 linhas está certo.
   */
  it('o resultado final dá o lucro que a planilha escreve', () => {
    const { deck, esperado } = leFixture('dre');
    const lucro = doGabarito(esperado, '(=) Lucro/Prejuízo do exercício');
    expect(deck.quadro01[10][0]).toBe(formataValor(lucro));
  });

  it('as partes fecham nos totais', () => {
    const { deck } = leFixture('dre');
    const L = (n: number) => numero(deck.quadro01[n - 1][0]);
    /* Um real de folga, porque cada célula já foi arredondada para o slide. */
    expect(Math.abs(L(2) + L(3) - L(1))).toBeLessThanOrEqual(1);
    expect(Math.abs(L(5) + L(6) - L(4))).toBeLessThanOrEqual(1);
    expect(Math.abs(L(1) + L(4) - L(7))).toBeLessThanOrEqual(1);
    expect(Math.abs(L(7) + L(8) - L(9))).toBeLessThanOrEqual(1);
    expect(Math.abs(L(9) + L(10) - L(11))).toBeLessThanOrEqual(1);
  });

  it('não reclama de aritmética num WP que fecha', () => {
    const { deck } = leFixture('dre');
    const queixas = deck.problemas.filter((p) => p.onde === 'Premissas, o QUADRO 01');
    expect(queixas, JSON.stringify(queixas)).toHaveLength(0);
  });

  /*
   * O investimento sai de `(-) Custos` e reaparece na linha 10, então a linha de
   * insumos tem de estar MENOR que os custos da planilha, na exata medida do
   * capex. Sem isso o slide contaria o investimento duas vezes.
   */
  it('o investimento sai do custeio e reaparece na própria linha', () => {
    const { deck, esperado } = leFixture('dre');
    const custos = doGabarito(esperado, '(-) Custos');
    const capex = doGabarito(esperado, '(-) Máquinas/Equip. (aquisições)');
    const tributos = doGabarito(esperado, '(-) Tributos e contribuições');

    expect(numero(deck.quadro01[4][0])).toBe(-Math.round(custos - capex - tributos));
    expect(numero(deck.quadro01[9][0])).toBe(-Math.round(capex));
  });

  /*
   * **Este caso existe por causa de um bug de verdade.** A primeira versão da
   * normalização de rótulo descartava o parêntese final, e aí
   * `(-) Máquinas/Equip. (aquisições)` colidia com `(-) Máquinas/Equip.
   * (serviços)`: o investimento saía somando os dois. As duas contas existem no
   * gabarito com valores diferentes, então basta cobrar que só a de aquisições
   * conte.
   */
  it('não confunde aquisição de máquina com serviço de máquina', () => {
    const { deck, esperado } = leFixture('dre');
    const aquisicoes = doGabarito(esperado, '(-) Máquinas/Equip. (aquisições)');
    const servicos = doGabarito(esperado, '(-) Máquinas/Equip. (serviços)');
    expect(servicos).toBeGreaterThan(0);
    expect(numero(deck.quadro01[9][0])).toBe(-Math.round(aquisicoes));
    expect(numero(deck.quadro01[9][0])).not.toBe(-Math.round(aquisicoes + servicos));
  });
});

/*
 * As duas convenções de sinal existem em WP de verdade, e o gerador descobre
 * qual é em vez de adivinhar pelo prefixo do rótulo. Este caso monta as duas com
 * os mesmos números e cobra o mesmo resultado.
 */
describe('a convenção de sinal', () => {
  function umAno(magnitude: boolean): ValorDaRevisao[] {
    const s = magnitude ? 1 : -1;
    const conta = (rotulo: string, valor: number, celula: string): ValorDaRevisao => ({
      bloco: 'dre',
      rotulo,
      cenario: ABAS_DE_CENARIO[0].nome,
      ano: 2026,
      valor,
      unidade: 'moeda',
      origemCelula: `${ABAS_DE_CENARIO[0].nome}!${celula}`,
    });
    return [
      conta('Receita', 1000, 'C31'),
      conta('(+) M.I. - Agrícola própria', 900, 'C34'),
      conta('(+) M.I. - Outras receitas', 100, 'C73'),
      conta('(-) Custos', s * 600, 'C76'),
      conta('(-) Máquinas/Equip. (aquisições)', s * 100, 'C83'),
      conta('(-) Tributos e contribuições', s * 50, 'C94'),
      conta('(-) Despesas administrativas', s * 200, 'C101'),
      conta('(+/-) Resultado financeiro', -50, 'C109'),
      conta('(=) Lucro/Prejuízo do exercício', 150, 'C112'),
    ];
  }

  for (const magnitude of [true, false]) {
    it(`chega no mesmo quadro com custo ${magnitude ? 'em magnitude' : 'sinalizado'}`, () => {
      const deck = montaDeck({ valores: umAno(magnitude), anoBase: 2025, crescimentoAnual: 0.05 });
      const L = (n: number) => numero(deck.quadro01[n - 1][0]);
      expect(L(1)).toBe(1000);
      expect(L(4)).toBe(-700);
      expect(L(5)).toBe(-450);
      expect(L(6)).toBe(-250);
      expect(L(7)).toBe(300);
      expect(L(10)).toBe(-100);
      expect(L(11)).toBe(150);
      expect(deck.problemas.filter((p) => p.onde === 'Premissas, o QUADRO 01')).toHaveLength(0);
    });
  }

  it('reclama quando nenhuma das duas fecha', () => {
    const valores = umAno(true).map((v) =>
      v.rotulo === '(=) Lucro/Prejuízo do exercício' ? { ...v, valor: 999999 } : v,
    );
    const deck = montaDeck({ valores });
    const queixa = deck.problemas.find((p) => p.detalhe.includes('não fecham'));
    expect(queixa, JSON.stringify(deck.problemas)).toBeDefined();
  });
});

describe('o QUADRO 02, contra o gabarito do Resumo', () => {
  it('tem as 14 linhas, três anos e três cenários', () => {
    const { deck } = leFixture('resumo-pfxpj-x-pjxpj');
    expect(deck.quadro02).toHaveLength(LINHAS_DO_QUADRO_02);
    for (const linha of deck.quadro02) {
      expect(linha).toHaveLength(ANOS_NO_QUADRO);
      for (const doAno of linha) expect(doAno).toHaveLength(3);
    }
  });

  /* A ordem é a das colunas da planilha, e é ela que casa com os cartões que o
   * modelo desenha da esquerda para a direita. */
  it('os cenários saem na ordem da planilha', () => {
    const { deck } = leFixture('resumo-pfxpj-x-pjxpj');
    expect(deck.cenarios).toEqual(['Cenário Atual', 'Cenário 01', 'Cenário 02']);
  });

  it('o grupo da pessoa física e o IRPF vêm da aba', () => {
    const { deck, esperado } = leFixture('resumo-pfxpj-x-pjxpj');
    const ano = deck.anos[0];
    /* Linha 1 do quadro é o total do grupo, linha 2 é o IRPF da atividade. */
    expect(deck.quadro02[0][0][0]).toBe(
      formataValor(
        esperado.valores
          .filter(
            (v: ValorDaRevisao) =>
              v.rotulo === 'Pessoa Física' && v.cenario === 'Cenário Atual' && v.ano === ano,
          )
          .reduce((t: number, v: ValorDaRevisao) => t + (v.valor as number), 0),
      ),
    );
  });

  /*
   * `PIS/Cofins` e `CBS` são duas linhas da aba e um slot só do modelo. Os dois
   * regimes não convivem no mesmo exercício, então a soma é a carga de consumo
   * do ano. Este caso prende a soma: se alguém separar os dois, quebra.
   */
  it('PIS/Cofins e CBS caem na mesma linha de IBS e CBS', () => {
    const { deck, esperado } = leFixture('resumo-pfxpj-x-pjxpj');
    const ano = deck.anos[0];

    /* Escolhe pela LINHA da planilha, que é o que distingue as ocorrências: 23 e
     * 24 são do Lucro Presumido, 29 e 30 do Lucro Real. Escolher por índice na
     * lista foi o que me fez errar este caso na primeira escrita. */
    const naLinha = (linha: number, cenario: string) =>
      (esperado.valores.find(
        (v: ValorDaRevisao) =>
          v.cenario === cenario &&
          v.ano === ano &&
          new RegExp(`![A-Z]+${linha}$`).test(v.origemCelula ?? ''),
      )?.valor as number | undefined) ?? 0;

    /* Linha 8 do quadro é o IBS e CBS da PJ patrimonial, que é o Lucro Presumido. */
    expect(numero(deck.quadro02[7][0][2])).toBe(
      Math.round(naLinha(23, 'Cenário 02') + naLinha(24, 'Cenário 02')),
    );
    /* Linha 12 é o da PJ operacional, que é o Lucro Real. */
    expect(numero(deck.quadro02[11][0][2])).toBe(
      Math.round(naLinha(29, 'Cenário 02') + naLinha(30, 'Cenário 02')),
    );
    /* E os dois são números diferentes, senão o caso não provaria nada. */
    expect(numero(deck.quadro02[7][0][2])).not.toBe(numero(deck.quadro02[11][0][2]));
  });

  it('a carga total é o `Total` da aba, e a variação sai dos totais', () => {
    const { deck, esperado } = leFixture('resumo-pfxpj-x-pjxpj');
    const ano = deck.anos[0];
    const total = (cenario: string) =>
      esperado.valores.find(
        (v: ValorDaRevisao) =>
          v.rotulo === 'Total' && v.cenario === cenario && v.ano === ano,
      )?.valor as number;

    expect(deck.quadro02[13][0][0]).toBe(formataValor(total('Cenário Atual')));
    expect(deck.quadro02[13][0][2]).toBe(formataValor(total('Cenário 02')));
    expect(deck.variacao[0][0]).toBe('-');
    expect(deck.variacao[0][2]).toBe(
      formataVariacao(total('Cenário 02'), total('Cenário Atual')),
    );
  });

  it('o cartão do topo soma os exercícios do cenário', () => {
    const { deck } = leFixture('resumo-pfxpj-x-pjxpj');
    expect(deck.cartoes).toHaveLength(3);
    expect(deck.cartoes[0].variacao).toBe('-');
    expect(numero(deck.cartoes[0].soma)).toBe(numero(deck.quadro02[13][0][0]));
  });

  /*
   * Linha da aba que o modelo novo não tem vira aviso, e não desaparece calada.
   * Na Família Lunardi são ITBI, Fundos de Investimento e Custo da estrutura, e
   * as três ficam fora do `Total`, então o quadro continua fechando.
   */
  it('linha sem destino no modelo vira aviso', () => {
    const { deck, esperado } = leFixture('resumo-pfxpj-x-pjxpj');
    const extra: ValorDaRevisao = {
      bloco: 'resumo',
      rotulo: 'ITBI',
      cenario: 'Cenário Atual',
      ano: esperado.valores[0].ano,
      valor: 12345,
      unidade: 'moeda',
      origemCelula: 'Resumo!D20',
    };
    const comExtra = montaDeck({ valores: [...esperado.valores, extra] });
    const aviso = comExtra.problemas.find((p) => p.detalhe.includes('ITBI'));
    expect(aviso, JSON.stringify(comExtra.problemas)).toBeDefined();
    expect(aviso!.tipo).toBe('origem');
  });
});

describe('a Transferência, contra o gabarito da apuração', () => {
  it('traz bens, dívidas e seis parcelas', () => {
    const { deck, esperado } = leFixture('transferencia-rural');
    expect(deck.transferencia.bens).toBe(
      formataValor(doGabarito(esperado, 'Bens da atividade rural')),
    );
    expect(deck.transferencia.dividas).toBe(
      formataValor(doGabarito(esperado, 'Dívidas da atividade rural')),
    );
    expect(deck.transferencia.parcelas).toHaveLength(PARCELAS_NO_FLUXO);
    expect(deck.transferencia.parcelas[0].ano).toBe('2026');
  });

  /*
   * **O 7º ano do gabarito é o caso real, não um inventado.** A aba da venda tem
   * sete colunas de ano por construção e o fluxo do modelo desenha seis, então a
   * última parcela não tem onde cair. Isso já acontecia antes, num `slice(0, 6)`
   * calado; o que este caso prende é o aviso, com o valor que ficou de fora.
   */
  it('avisa quando sobra parcela fora do fluxo, com o valor', () => {
    const { deck, esperado } = leFixture('transferencia-rural');
    const aviso = deck.problemas.find((p) => p.onde === 'Transferência da atividade rural');
    expect(aviso, JSON.stringify(deck.problemas)).toBeDefined();
    expect(aviso!.tipo).toBe('formatacao');

    const anos = [
      ...new Set(
        esperado.valores
          .filter((v: ValorDaRevisao) => v.rotulo === 'Resultado do exercício')
          .map((v: ValorDaRevisao) => v.ano),
      ),
    ].sort() as number[];
    expect(anos.length).toBeGreaterThan(PARCELAS_NO_FLUXO);
    const forasoma = doGabarito(esperado, 'Resultado do exercício', anos[PARCELAS_NO_FLUXO]);
    expect(aviso!.detalhe).toContain(formataValor(forasoma));
  });
});

describe('as premissas e os cenários', () => {
  it('o ano-base e o crescimento saem do cabeçalho do WP', () => {
    const deck = montaDeck({ valores: [], anoBase: 2025, crescimentoAnual: 0.05 });
    expect(deck.anoBase).toBe('2025');
    expect(deck.crescimento).toBe('5');
  });

  it('crescimento escrito como inteiro na planilha vale o mesmo', () => {
    expect(montaDeck({ valores: [], crescimentoAnual: 5 }).crescimento).toBe('5');
  });

  it('sem a proporção da parceria, sai traço e fica o aviso', () => {
    const deck = montaDeck({ valores: [] });
    expect(deck.parceria.cenario01).toEqual(['-', '-']);
    expect(deck.problemas.some((p) => p.onde === 'Cenários avaliados')).toBe(true);
  });

  /* A proporção chega como um valor de `wp_valor`, com o rótulo do parser e a
   * unidade `percentual`. Não existe coluna própria para ela: ver o comentário do
   * `ROTULO_PERCENTUAL_DE_PARCERIA` no parser. */
  function comParceria(cenario: string, valor: number): ValorDaRevisao {
    return {
      bloco: 'dre',
      rotulo: ROTULO_PERCENTUAL_DE_PARCERIA,
      cenario,
      ano: 2026,
      valor,
      unidade: 'percentual',
      origemCelula: `${cenario}!C11`,
    };
  }

  it('com a proporção, a ponta maior vem primeiro', () => {
    const deck = montaDeck({
      valores: [
        comParceria(ABAS_DE_CENARIO[1].nome, 0.1),
        comParceria(ABAS_DE_CENARIO[2].nome, 85),
      ],
    });
    expect(deck.parceria.cenario01).toEqual(['90%', '10%']);
    expect(deck.parceria.cenario02).toEqual(['85%', '15%']);
  });

  /* Zero é o que o modelo em branco traz, e não é uma parceria de 0%. */
  it('proporção zerada conta como ausente', () => {
    const deck = montaDeck({ valores: [comParceria(ABAS_DE_CENARIO[1].nome, 0)] });
    expect(deck.parceria.cenario01).toEqual(['-', '-']);
  });

  /*
   * O ano do percentual é preenchimento de coluna NOT NULL, não exercício. Se ele
   * entrasse na lista, um estudo cujo único dado fosse o percentual passaria a
   * declarar um exercício que ele não tem.
   */
  it('o ano do percentual não conta como exercício do estudo', () => {
    const deck = montaDeck({ valores: [comParceria(ABAS_DE_CENARIO[1].nome, 0.9)] });
    expect(deck.anos).toEqual([]);
  });
});
