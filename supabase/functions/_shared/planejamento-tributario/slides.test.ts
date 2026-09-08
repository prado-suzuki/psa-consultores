import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ABAS_DE_CENARIO as ABAS_AQUI,
  ABA_VENDA_DE_ATIVOS as VENDA_AQUI,
} from './slides.ts';
import {
  CABEM_NA_CAIXA,
  formataValor,
  linhaSemValor,
  montaDeck,
  type Revisao,
} from './slides.ts';
import { ABAS_DE_CENARIO, ABA_VENDA_DE_ATIVOS } from '@/lib/planejamento-tributario/mapa';
import { lerWp } from '@/lib/planejamento-tributario/parser';

/**
 * O gerador de conteúdo dos slides, conferido contra os gabaritos da PT-01.
 *
 * ## O que a seção `slide` das fixtures prova, e o que não prova
 *
 * Ela é **gabarito de formatação** nas três: como o número sai escrito no deck
 * real. Isso vale sempre e é o que estes testes prendem com mais força.
 *
 * Ela é **exemplo de curadoria** só na DRE. Na Transferência e no Resumo o
 * gabarito traz a tabela inteira, e dá para comparar linha por linha. Na DRE ele
 * traz 9 de 29 contas, porque **quem escolhe o que aparece é o consultor**, não o
 * sistema, decisão da Mônica e do Bernardo em 31/08/2026. Comparar a DRE linha a
 * linha seria prender no teste uma regra que ninguém tomou.
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
    farol: leitura.farol,
    comentarios: leitura.comentarios,
  };
}

function leFixture(caso: string) {
  const bytes = readFileSync(join(FIXTURES, caso, 'entrada.xlsx'));
  const esperado = JSON.parse(readFileSync(join(FIXTURES, caso, 'esperado.json'), 'utf-8'));
  return { deck: montaDeck(comoNoBanco(lerWp(bytes))), esperado };
}

/*
 * A cópia dos nomes de aba existe porque o Deno não alcança `src/`. Este caso é
 * o que impede a cópia de envelhecer: se alguém renomear uma aba no mapa e
 * esquecer daqui, o gerador passa a filtrar por um nome que não existe mais e a
 * tabela sai vazia, sem erro nenhum.
 */
describe('a cópia dos nomes de aba', () => {
  it('continua igual à do mapa', () => {
    expect(VENDA_AQUI).toBe(ABA_VENDA_DE_ATIVOS.nome);
    expect(ABAS_AQUI).toEqual(ABAS_DE_CENARIO.map((a) => a.nome));
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

  /* No Resumo o percentual sai sem casa decimal, e o negativo continua entre
   * parênteses. É comparação entre cenários, não alíquota. */
  it('percentual sai inteiro, e negativo entre parênteses', () => {
    expect(formataValor(-0.24430803584715977, 'percentual')).toBe('(24%)');
    expect(formataValor(0.5367506811874834, 'percentual')).toBe('54%');
  });
});

describe('montaDeck, contra os gabaritos da PT-01', () => {
  it('a Transferência sai com as linhas e os valores do gabarito', () => {
    const { deck, esperado } = leFixture('transferencia-rural');
    const doGabarito = esperado.slide.linhas.filter(
      (l: { valores: unknown }) => l.valores && typeof l.valores === 'object',
    );

    /* Esta linha existe no slide e a PT-01 não mapeou de onde ela vem. Fica de
     * fora da comparação, e o caso seguinte prende o aviso. */
    const SEM_FONTE = 'Opção pela forma de apuração do resultado tributável';

    for (const linha of doGabarito.filter((l: { rotulo: string }) => l.rotulo !== SEM_FONTE)) {
      const nossa = deck.transferencia.linhas.find(
        (x) => x.rotulo === (linha as { rotulo: string }).rotulo,
      );
      expect(nossa, `faltou a linha "${(linha as { rotulo: string }).rotulo}"`).toBeDefined();
      for (const [ano, valor] of Object.entries(
        (linha as { valores: Record<string, string> }).valores,
      )) {
        expect(nossa!.valores[ano], `${(linha as { rotulo: string }).rotulo} em ${ano}`).toBe(
          valor,
        );
      }
    }
  });

  it('o Resumo sai com os três cenários lado a lado', () => {
    const { deck, esperado } = leFixture('resumo-pfxpj-x-pjxpj');
    const ano = deck.anos[0];
    const DE_PARA: Record<string, string> = {
      atual: `${ano}|Cenário Atual`,
      c01: `${ano}|Cenário 01`,
      c02: `${ano}|Cenário 02`,
    };

    /* O gabarito repete rótulo (IRPF aparece em PF, em Lucro Presumido e em
     * Lucro Real), então a comparação vai por posição, não por nome. */
    const nossas = deck.resumo.linhas;
    esperado.slide.linhas.forEach((linha: Record<string, string>, i: number) => {
      expect(nossas[i]?.rotulo, `linha ${i}`).toBe(linha.rotulo);
      for (const [chave, coluna] of Object.entries(DE_PARA)) {
        if (linha[chave] === undefined) continue;
        expect(nossas[i].valores[coluna], `${linha.rotulo} em ${chave}`).toBe(linha[chave]);
      }
    });
  });

  it('avisa da linha do slide que a PT-01 não mapeou', () => {
    const { deck } = leFixture('transferencia-rural');
    const aviso = deck.problemas.find((p) => p.onde.includes('Opção pela forma'));
    expect(aviso, 'o deck tem de avisar da linha sem fonte').toBeDefined();
    expect(aviso!.detalhe).toContain('nunca foi mapeada');
  });

  /* Na DRE o gabarito é uma escolha do consultor, então o que se confere é o
   * valor das contas que ele escolheu, e não a lista. */
  it('a DRE formata cada conta do gabarito com o mesmo valor', () => {
    const { deck, esperado } = leFixture('dre');
    const ano = deck.anos[0];
    const coluna = deck.dre.colunas[0];
    expect(coluna).toContain(String(ano));

    for (const linha of esperado.slide.linhas as { rotulo: string; valor: string }[]) {
      const nossa = deck.dre.linhas.find((x) => x.rotulo === linha.rotulo);
      expect(nossa, `faltou a conta "${linha.rotulo}"`).toBeDefined();
      expect(nossa!.valores[coluna], linha.rotulo).toBe(linha.valor);
    }
  });

  /* A leitura pega a coluna inteira; o slide mostra menos. Este caso guarda essa
   * diferença, que é a razão de o aviso de transbordamento existir. */
  it('a DRE traz mais contas do que o consultor levou ao slide', () => {
    const { deck, esperado } = leFixture('dre');
    expect(deck.dre.linhas.length).toBeGreaterThan(esperado.slide.linhas.length);
  });
});

describe('o que o deck avisa', () => {
  it('conta quantas linhas passaram do que cabe', () => {
    const { deck } = leFixture('dre');
    const cabem = deck.dre.linhas.length - deck.dre.transbordou;
    expect(cabem).toBe(20);
    if (deck.dre.transbordou > 0) {
      expect(deck.problemas.some((p) => p.detalhe.startsWith('Não cabe:'))).toBe(true);
    }
  });

  /* Marcador e percentual convivem na mesma linha do Farol, e o molde congela a
   * fonte de cada célula. Se o deck não disser qual é qual, o gerador escreve
   * número numa célula de símbolo e sai rabisco, sem erro nenhum. */
  it('separa o marcador do percentual no Farol', () => {
    const { deck } = leFixture('carga-tributaria');
    const marcadores = deck.farol.filter((c) => c.eMarcador);
    const percentuais = deck.farol.filter((c) => !c.eMarcador);

    expect(marcadores.length).toBeGreaterThan(0);
    expect(percentuais.length).toBeGreaterThan(0);
    for (const m of marcadores) expect(['P', 'O']).toContain(m.valor);
    for (const p of percentuais) expect(p.valor).not.toBe('P');
  });
});

/*
 * O que o Grupo Mattei mostrou em 08/09/2026, medido no pptx gerado: a DRE saiu
 * com 84 linhas, das quais 55 eram só traço, e precisava de 14 polegadas num
 * slide que tem 5. A caixa do CBS saiu com 2.070 letras e transbordou mesmo
 * depois de a fonte cair até o piso de 7pt.
 */
describe('linha sem valor', () => {
  it('traço em todas as colunas é ausência', () => {
    expect(linhaSemValor({ rotulo: 'Sorgo', nivel: 2, valores: { '2026': '-', '2027': '-' } })).toBe(
      true,
    );
  });

  /* Um valor em UM ano basta para a conta existir no estudo. */
  it('valor em um ano só mantém a linha', () => {
    expect(
      linhaSemValor({ rotulo: 'Soja', nivel: 2, valores: { '2026': '12.600.000', '2027': '-' } }),
    ).toBe(false);
  });

  /* Título de seção da Transferência não tem coluna nenhuma, e some se a regra
   * não abrir exceção para ele. */
  it('linha sem coluna nenhuma não é escondida', () => {
    expect(linhaSemValor({ rotulo: 'Ganho de capital', nivel: 0, valores: {} })).toBe(false);
  });
});

function revisaoComDre(contas: { rotulo: string; valor: number }[]): Revisao {
  return {
    clienteNoWp: 'Cliente de teste',
    valores: contas.map((c, i) => ({
      bloco: 'dre' as const,
      rotulo: c.rotulo,
      nivel: 1,
      cenario: ABAS_AQUI[0],
      ano: 2026,
      valor: c.valor,
      unidade: 'moeda' as const,
      origemCelula: `DRE!B${10 + i}`,
    })),
    farol: [],
    comentarios: [],
  };
}

describe('a DRE esconde conta zerada', () => {
  it('tira do slide a conta sem valor em ano nenhum', () => {
    const deck = montaDeck(
      revisaoComDre([
        { rotulo: 'Soja - Própria', valor: 12600000 },
        { rotulo: 'Sorgo - Própria', valor: 0 },
        { rotulo: 'Arroz - Própria', valor: 0 },
      ]),
    );

    expect(deck.dre.linhas.map((l) => l.rotulo)).toEqual(['Soja - Própria']);
    expect(deck.dre.escondidas).toBe(2);
  });

  /* Esconder calado seria o mesmo defeito de encolher calado. */
  it('diz quantas escondeu', () => {
    const deck = montaDeck(
      revisaoComDre([
        { rotulo: 'Soja - Própria', valor: 12600000 },
        { rotulo: 'Sorgo - Própria', valor: 0 },
      ]),
    );

    const aviso = deck.problemas.find((p) => p.detalhe.includes('sem valor ficaram fora'));
    expect(aviso?.detalhe).toBe('1 contas sem valor ficaram fora. Restaram 1.');
  });

  it('não esconde nada quando tudo tem valor', () => {
    const deck = montaDeck(revisaoComDre([{ rotulo: 'Soja - Própria', valor: 12600000 }]));
    expect(deck.dre.escondidas).toBe(0);
  });
});

describe('o aviso de caixa cheia', () => {
  function comComentario(letras: number): Revisao {
    return {
      valores: [],
      farol: [],
      comentarios: [
        { cenario: 'Cenário 01 (PFxPJ)', tributo: 'CBS', ordem: 1, texto: 'a'.repeat(letras) },
      ],
    };
  }

  /* Encolher a fonte foi o que produziu a DRE de 7pt e o cartão ilegível do
   * Mattei. Agora o gerador não mexe no tamanho e diz quanto precisa sair. */
  it('diz que não cabe, e só o tamanho', () => {
    const deck = montaDeck(comComentario(CABEM_NA_CAIXA + 100));
    const aviso = deck.problemas.find((p) => p.onde === 'caixa de CBS');
    expect(aviso?.detalhe).toBe(`Não cabe: 520 letras para cerca de ${CABEM_NA_CAIXA}.`);
  });

  it('não avisa quando o texto cabe', () => {
    const deck = montaDeck(comComentario(CABEM_NA_CAIXA - 20));
    expect(deck.problemas.some((p) => p.onde === 'caixa de CBS')).toBe(false);
  });
});
