import { describe, expect, it } from 'vitest';

import {
  ABAS_DE_APOIO,
  ABAS_DE_CENARIO,
  ABA_FAROL,
  ABA_RESUMO,
  ABA_VENDA_DE_ATIVOS,
  CABECALHO_DO_ESTUDO,
  PARAMETROS,
  VALIDACOES,
  VERSAO_DO_MAPA,
} from '@/lib/planejamento-tributario/mapa';
import type { LinhaWp, UnidadeWp } from '@/lib/planejamento-tributario/tipos';

/**
 * Confere a coerência interna do mapa do WP.
 *
 * O `mapa.ts` é gerado a partir do `WP Atualizado`, então erro de leitura do
 * gerador não aparece em revisão humana: o arquivo sai plausível e errado. Este
 * teste é o que pega isso, e cada bloco abaixo prende uma decisão da PT-01 que
 * o parser vai depender e que ninguém lembraria de conferir depois.
 *
 * Não lê planilha nenhuma. As fixtures cobrem a leitura; aqui é só o mapa.
 */

const UNIDADES: UnidadeWp[] = ['moeda', 'percentual', 'texto', 'marcador'];

/** Toda lista de linhas do mapa, com o nome da aba, para varrer de uma vez. */
const TODAS_AS_LISTAS: Array<{ onde: string; linhas: readonly LinhaWp[] }> = [
  { onde: 'Resumo', linhas: ABA_RESUMO.linhas },
  { onde: 'Farol', linhas: ABA_FAROL.linhas },
  ...ABAS_DE_CENARIO.flatMap((aba) => [
    { onde: `${aba.nome} · DRE`, linhas: aba.dre },
    { onde: `${aba.nome} · apuração`, linhas: aba.apuracao },
  ]),
  { onde: 'Venda de Ativos · valores', linhas: ABA_VENDA_DE_ATIVOS.valores },
  { onde: 'Venda de Ativos · apuração', linhas: ABA_VENDA_DE_ATIVOS.apuracao },
];

describe('versão do mapa', () => {
  it('é a versão do documento em prosa, no formato maior.menor', () => {
    expect(VERSAO_DO_MAPA).toMatch(/^\d+\.\d+$/);
  });
});

describe('forma das linhas', () => {
  it.each(TODAS_AS_LISTAS)('$onde: o número de linha é único', ({ linhas }) => {
    const numeros = linhas.map((l) => l.linha);
    expect(new Set(numeros).size).toBe(numeros.length);
  });

  it.each(TODAS_AS_LISTAS)('$onde: as linhas estão em ordem crescente', ({ linhas }) => {
    const numeros = linhas.map((l) => l.linha);
    expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
  });

  it.each(TODAS_AS_LISTAS)('$onde: nenhum rótulo tem espaço sobrando', ({ linhas }) => {
    for (const linha of linhas) {
      expect(linha.rotulo).toBe(linha.rotulo.trim());
      expect(linha.rotulo).not.toMatch(/\s{2}/);
      expect(linha.rotulo.length).toBeGreaterThan(0);
    }
  });

  it.each(TODAS_AS_LISTAS)('$onde: nível e unidade são valores conhecidos', ({ linhas }) => {
    for (const linha of linhas) {
      expect([0, 1, 2]).toContain(linha.nivel);
      expect(UNIDADES).toContain(linha.unidade);
    }
  });
});

/*
 * 75 rótulos do modelo vêm com espaço sobrando, tipo `(+) Soja - Própria  ` com
 * dois espaços no fim. O gerador normaliza, e o teste acima prende isso, porque
 * um rótulo com espaço a mais no mapa faria a leitura por rótulo não achar a
 * linha, e o sintoma seria "conta vazia" em vez de erro.
 */

describe('o rótulo não serve de chave', () => {
  it('há rótulo repetido dentro da mesma aba', () => {
    const dre = ABAS_DE_CENARIO[0].dre.map((l) => l.rotulo);
    const repetidos = dre.filter((r, i) => dre.indexOf(r) !== i);
    expect(repetidos.length).toBeGreaterThan(0);
  });

  it('o mesmo rótulo aparece em endereço diferente em cada cenário', () => {
    const enderecos = ABAS_DE_CENARIO.map(
      (aba) => aba.dre.find((l) => l.rotulo === 'Receita')?.linha,
    );
    expect(enderecos.every((e) => typeof e === 'number')).toBe(true);
    expect(new Set(enderecos).size).toBe(enderecos.length);
  });
});

/**
 * A única divergência de rótulo entre as abas de cenário do modelo, achada por
 * este teste em 31/08/2026.
 *
 * A conta de comissões, dentro de Despesas administrativas, se chama
 * `(-) Comissões` na aba do cenário atual e `(-) Comerciais (comissões)` nas duas
 * de cenário avaliado. Duas de três usam a segunda forma, então parece renomeação
 * que não foi propagada. Não atrapalha a leitura, que é por endereço, mas
 * atrapalharia qualquer comparação entre abas.
 *
 * Está declarada aqui em vez de escondida para que uma segunda divergência, essa
 * sim inesperada, quebre o teste.
 */
const DIVERGENCIAS_CONHECIDAS = [
  { posicao: 71, noAtual: '(-) Comissões', nosAvaliados: '(-) Comerciais (comissões)' },
];

describe('as três abas de cenário compartilham o plano de contas', () => {
  it('a lista de rótulos da DRE é a mesma nas três, tirando a divergência conhecida', () => {
    const [primeira, ...resto] = ABAS_DE_CENARIO;
    const referencia = primeira.dre.map((l) => l.rotulo);
    const posicoesConhecidas = new Set(DIVERGENCIAS_CONHECIDAS.map((d) => d.posicao));

    for (const aba of resto) {
      const rotulos = aba.dre.map((l) => l.rotulo);
      expect(rotulos).toHaveLength(referencia.length);
      for (let i = 0; i < referencia.length; i += 1) {
        if (posicoesConhecidas.has(i)) continue;
        expect(rotulos[i], `posição ${i} de ${aba.nome}`).toBe(referencia[i]);
      }
    }
  });

  it('a divergência conhecida continua sendo exatamente aquela', () => {
    const [primeira, ...resto] = ABAS_DE_CENARIO;
    for (const { posicao, noAtual, nosAvaliados } of DIVERGENCIAS_CONHECIDAS) {
      expect(primeira.dre[posicao].rotulo).toBe(noAtual);
      for (const aba of resto) {
        expect(aba.dre[posicao].rotulo).toBe(nosAvaliados);
      }
    }
  });

  it('a DRE tem as 80 e poucas contas fixas do modelo', () => {
    for (const aba of ABAS_DE_CENARIO) {
      expect(aba.dre.length).toBeGreaterThanOrEqual(80);
    }
  });

  it('as sete contas de "outros" são as únicas editáveis', () => {
    for (const aba of ABAS_DE_CENARIO) {
      const editaveis = aba.dre.filter((l) => l.editavel);
      expect(editaveis).toHaveLength(7);
      for (const linha of editaveis) {
        expect(linha.rotulo).toContain('Outros: especificar');
      }
    }
  });
});

describe('apuração do IRPF', () => {
  it('existe nos cenários com pessoa física e não no PJxPJ', () => {
    const comApuracao = ABAS_DE_CENARIO.filter((a) => a.apuracao.length > 0);
    const semApuracao = ABAS_DE_CENARIO.filter((a) => a.apuracao.length === 0);

    expect(comApuracao.map((a) => a.nome)).toEqual(['Cenário Atual (PF)', 'Cenário 01 (PFxPJ)']);
    expect(semApuracao.map((a) => a.nome)).toEqual(['Cenário 02 (PJxPJ)']);
  });

  it('tem os oito rótulos, na ordem da planilha', () => {
    for (const aba of ABAS_DE_CENARIO.filter((a) => a.apuracao.length > 0)) {
      expect(aba.apuracao.map((l) => l.rotulo)).toEqual([
        'Saldo de prejuízo a compensar de exercício(s) anterior(es)',
        'Resultado do exercício',
        'Compensação de prejuízo',
        'Lucro/Prejuízo fiscal do exercício',
        'Presunção de 20%',
        'Resultado tributável',
        'Total a recolher',
        'Saldo de prejuízo a compensar',
      ]);
    }
  });
});

/*
 * A ordem acima não é decoração. No slide, o limite de 20% aparece ANTES da
 * compensação de prejuízo, invertido em relação à planilha. Quem gerar o slide
 * lendo nesta ordem produz uma tabela errada, e a fixture `transferencia-rural`
 * é o que pega o caso.
 */

describe('aba Resumo', () => {
  it('cada grupo tem exatamente um total e ao menos uma linha de tributo', () => {
    const grupos = ['pessoa_fisica', 'pj_lucro_presumido', 'pj_lucro_real'];
    for (const grupo of grupos) {
      const doGrupo = ABA_RESUMO.linhas.filter((l) => l.grupo === grupo);
      expect(doGrupo.filter((l) => l.eTotal)).toHaveLength(1);
      expect(doGrupo.filter((l) => !l.eTotal).length).toBeGreaterThan(0);
    }
  });

  it('tem um bloco de três colunas de cenário por ano', () => {
    expect(ABA_RESUMO.colunasPorAno).toHaveLength(3);
    for (const bloco of ABA_RESUMO.colunasPorAno) {
      expect(bloco).toHaveLength(3);
    }
  });

  it('a linha de variação é percentual, não moeda', () => {
    const reducao = ABA_RESUMO.linhas.find((l) => l.rotulo === 'Redução');
    expect(reducao?.unidade).toBe('percentual');
  });
});

describe('aba Farol', () => {
  it('tem os quatro blocos de tributo como títulos sem valor', () => {
    const titulos = ABA_FAROL.linhas.filter((l) => l.eTitulo).map((l) => l.rotulo);
    expect(titulos).toEqual([
      'IRPF/IRPJ/CSLL',
      'PIS/Cofins - Vigente até 31/12/2026',
      'IBS e CBS - Vigente a partir de 2027',
      'FUNRURAL',
    ]);
  });

  it('cruza regime com tipo de pessoa em quatro colunas', () => {
    expect(ABA_FAROL.colunas.map((c) => `${c.regime}/${c.pessoa}`)).toEqual([
      'presumido/pf',
      'presumido/pj',
      'real/pf',
      'real/pj',
    ]);
  });
});

describe('abas de apoio', () => {
  it('as três existem e têm cabeçalho na linha 7', () => {
    expect(ABAS_DE_APOIO.map((a) => a.nome)).toEqual([
      'Imóveis Explorados',
      'Bens da Atv. Rural',
      'Dívidas da Atv. Rural',
    ]);
    for (const aba of ABAS_DE_APOIO) {
      expect(aba.cabecalho).toBe(7);
      expect(aba.colunas.length).toBeGreaterThan(0);
    }
  });

  it('as dívidas trazem uma coluna por ano de vencimento, além do saldo', () => {
    const dividas = ABAS_DE_APOIO.find((a) => a.nome === 'Dívidas da Atv. Rural');
    const anos = dividas?.colunas.filter((c) => /^\d{4}$/.test(c.rotulo)) ?? [];
    expect(anos.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validações declaradas', () => {
  it('só apontam para rótulos que existem no mapa', () => {
    const rotulos = new Set(TODAS_AS_LISTAS.flatMap((l) => l.linhas.map((x) => x.rotulo)));
    const grupos = new Set(
      TODAS_AS_LISTAS.flatMap((l) => l.linhas.map((x) => x.grupo)).filter(Boolean),
    );

    for (const validacao of VALIDACOES) {
      if (validacao.tipo === 'soma_do_grupo') {
        expect(grupos).toContain(validacao.grupo);
      }
      if (validacao.tipo === 'soma_de_rotulos') {
        expect(rotulos).toContain(validacao.total);
        for (const parte of validacao.partes) expect(rotulos).toContain(parte);
      }
      if (validacao.tipo === 'proporcao') {
        expect(rotulos).toContain(validacao.de);
        expect(rotulos).toContain(validacao.sobre);
      }
      if (validacao.tipo === 'zero_antes_de') {
        expect(rotulos).toContain(validacao.rotulo);
      }
    }
  });

  it('a presunção é 20% e o imposto é 27,5%', () => {
    const proporcoes = VALIDACOES.filter((v) => v.tipo === 'proporcao');
    expect(proporcoes.map((v) => v.fator)).toEqual([0.2, 0.2, 0.2, 0.275, 0.275, 0.275]);
  });

  /*
   * São três presunções porque a base muda de aba para aba, e é o tipo de detalhe
   * que passa despercebido: nas abas de cenário ela sai da `Receita`, na Venda de
   * Ativos sai do `Resultado do exercício`. Toda presunção declara o cenário, para
   * que uma aba nova não herde a base da vizinha por omissão.
   */
  /*
   * Presunção de 20% é regime de pessoa física, e o bloco onde ela mora se chama
   * `IRPF`. No `Cenário 01 (PFxPJ)` cada ano tem duas colunas, e sem excluir a da
   * pessoa jurídica a regra acusava conta que nunca deveria fechar ali.
   *
   * A exclusão vale para as regras dos cenários e não para a da Venda de Ativos,
   * que não tem linha de contribuinte: não há o que excluir.
   */
  it('nenhuma regra de IRPF confere a coluna da pessoa jurídica', () => {
    const dosCenarios = VALIDACOES.filter(
      (v) => v.tipo === 'proporcao' && v.cenario !== 'Cenário 02 (Venda de Ativos)',
    );

    expect(dosCenarios).toHaveLength(4);
    for (const regra of dosCenarios) {
      expect(regra.tipo === 'proporcao' && regra.excetoContribuinte).toBe('Pessoa Jurídica');
    }
  });

  it('toda presunção declara em que cenário vale', () => {
    const presuncoes = VALIDACOES.filter(
      (v) => v.tipo === 'proporcao' && v.de === 'Presunção de 20%',
    );

    expect(presuncoes).toHaveLength(3);
    for (const regra of presuncoes) {
      expect(regra.tipo === 'proporcao' && regra.cenario).toBeTruthy();
    }
    expect(presuncoes.map((v) => v.tipo === 'proporcao' && v.sobre)).toEqual([
      'Receita',
      'Receita',
      'Resultado do exercício',
    ]);
  });
});

/*
 * A aba de Venda de Ativos entrou só na versão 1.4. Ela ficou de fora porque o
 * gerador do mapa descarta aba de cenário com "Venda" no nome, e o buraco não
 * aparecia em lugar nenhum: o slide de Transferência simplesmente sairia vazio.
 */
describe('aba de Venda de Ativos', () => {
  it('a apuração corre sete anos, não os três do estudo', () => {
    expect(ABA_VENDA_DE_ATIVOS.colunas).toEqual(['C', 'D', 'E', 'F', 'G', 'H', 'I']);
  });

  it('o bloco de cima mora numa coluna só, e fecha em Diferença', () => {
    expect(ABA_VENDA_DE_ATIVOS.colunaDoValor).toBe('C');
    expect(ABA_VENDA_DE_ATIVOS.valores.map((l) => l.rotulo)).toEqual([
      'Bens da atividade rural',
      'Dívidas da atividade rural',
      'Diferença',
    ]);
    expect(ABA_VENDA_DE_ATIVOS.valores.at(-1)?.eTotal).toBe(true);
  });

  it('os cabeçalhos vêm antes das linhas que descrevem', () => {
    const primeiroValor = Math.min(...ABA_VENDA_DE_ATIVOS.valores.map((l) => l.linha));
    const primeiraApuracao = Math.min(...ABA_VENDA_DE_ATIVOS.apuracao.map((l) => l.linha));

    expect(ABA_VENDA_DE_ATIVOS.cabecalhoValores).toBeLessThan(primeiroValor);
    expect(ABA_VENDA_DE_ATIVOS.anos).toBeLessThan(primeiraApuracao);
  });

  /*
   * A apuração daqui é a mesma corrente das abas de cenário, com os mesmos
   * rótulos. É o que permite validar as duas com a mesma regra, mudando só a base
   * da presunção.
   */
  it('repete a corrente de rótulos das abas de cenário', () => {
    const daVenda = ABA_VENDA_DE_ATIVOS.apuracao.map((l) => l.rotulo);
    const doCenario = ABAS_DE_CENARIO.find((a) => a.nome === 'Cenário Atual (PF)')?.apuracao.map(
      (l) => l.rotulo,
    );

    expect(daVenda).toEqual(doCenario);
  });
});

/*
 * Cabeçalho e parâmetros não viram slide. Estão no mapa porque identificam a
 * revisão importada e porque o crescimento anual é premissa do estudo, e nenhum
 * dos dois tem outra origem no arquivo.
 */
describe('cabeçalho e parâmetros', () => {
  it('todo endereço é uma célula, coluna e linha', () => {
    const celulas = [
      CABECALHO_DO_ESTUDO.cliente,
      CABECALHO_DO_ESTUDO.dataBase,
      CABECALHO_DO_ESTUDO.preparadoPor,
      CABECALHO_DO_ESTUDO.revisadoPor,
      PARAMETROS.crescimentoAnual,
      PARAMETROS.anoBase,
    ];

    for (const celula of celulas) {
      expect(celula).toMatch(/^[A-Z]+\d+$/);
    }
  });

  it('saem de abas que o mapa conhece', () => {
    expect(CABECALHO_DO_ESTUDO.aba).toBe(ABA_RESUMO.nome);
    expect(PARAMETROS.aba).toBe('DRE Projetada');
  });

  /*
   * A `DRE Projetada` é a única aba do modelo que o mapa cita sem mapear linha por
   * linha, e é de propósito: as abas de cenário puxam a receita de lá por fórmula
   * e já chegam com o número calculado, então ler as duas seria ler duas vezes.
   */
  it('a DRE Projetada não é lida como aba', () => {
    const nomes = [ABA_RESUMO.nome, ABA_FAROL.nome, ABA_VENDA_DE_ATIVOS.nome]
      .concat(ABAS_DE_CENARIO.map((a) => a.nome))
      .concat(ABAS_DE_APOIO.map((a) => a.nome));

    expect(nomes).not.toContain(PARAMETROS.aba);
  });
});
