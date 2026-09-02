import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { lerWp } from '@/lib/planejamento-tributario/parser';

import esperadoBensEDividas from './__fixtures__/bens-e-dividas/esperado.json';
import esperadoCabecalho from './__fixtures__/cabecalho-do-estudo/esperado.json';
import esperadoFarol from './__fixtures__/carga-tributaria/esperado.json';
import esperadoComentarios from './__fixtures__/comentarios/esperado.json';
import esperadoDre from './__fixtures__/dre/esperado.json';
import esperadoResumo from './__fixtures__/resumo-pfxpj-x-pjxpj/esperado.json';
import esperadoTransferencia from './__fixtures__/transferencia-rural/esperado.json';

/**
 * Confere a leitura do WP contra as fixtures, que são o golden-master da PT-02.
 *
 * Cada fixture é um par: `entrada.xlsx`, um recorte de WP real anonimizado, e
 * `esperado.json`, o que a leitura deve produzir. Se o resultado divergir do
 * gabarito, o teste quebra e mostra onde. É o que substitui subir arquivo de
 * cliente no sistema para saber se a leitura funciona.
 *
 * A entrada é xlsx de verdade, e não uma tabela em texto, porque ler a planilha
 * é parte do que se está testando: string embutida, célula vazia contra célula
 * com zero, e número contra texto.
 */

const PASTA = join(__dirname, '__fixtures__');

/** Os sete anos da aba de Venda de Ativos, 2026 a 2032. */
const ANOS_DA_VENDA = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

function abre(caso: string): Uint8Array {
  return new Uint8Array(readFileSync(join(PASTA, caso, 'entrada.xlsx')));
}

/** Uma planilha válida sem nenhuma aba que o mapa conheça. */
function planilhaComAbaDesconhecida(): Uint8Array {
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet([['qualquer coisa']]), 'Planilha1');
  return new Uint8Array(XLSX.write(livro, { type: 'array', bookType: 'xlsx' }));
}

describe('lerWp na aba Resumo', () => {
  const resultado = lerWp(abre('resumo-pfxpj-x-pjxpj'));

  it('não encontra problema num arquivo bom', () => {
    expect(resultado.problemas).toEqual([]);
  });

  it('produz exatamente o gabarito, valor por valor', () => {
    expect(resultado.valores).toEqual(esperadoResumo.valores);
  });

  it('lê os três cenários do bloco de 2026', () => {
    const cenarios = [...new Set(resultado.valores.map((v) => v.cenario))];
    expect(cenarios).toEqual(['Cenário Atual', 'Cenário 01', 'Cenário 02']);
  });

  it('traz o endereço de origem em cada valor', () => {
    for (const valor of resultado.valores) {
      expect(valor.origemCelula).toMatch(/^Resumo![A-Z]+\d+$/);
    }
  });

  /*
   * Zero é dado, e sai como zero. Traço é decisão de formatação, e acontece na
   * geração do slide, não aqui: se o parser trocasse zero por nada, o validador
   * perderia a linha e a soma do bloco não fecharia.
   */
  it('mantém o zero da CBS em vez de descartar', () => {
    const cbs = resultado.valores.filter((v) => v.rotulo.startsWith('CBS'));
    expect(cbs.length).toBeGreaterThan(0);
    expect(cbs.every((v) => v.valor === 0)).toBe(true);
  });

  it('lê o percentual como fração, não como inteiro', () => {
    const reducao = resultado.valores.filter((v) => v.rotulo === 'Redução');
    expect(reducao).toHaveLength(2);
    for (const valor of reducao) {
      expect(valor.unidade).toBe('percentual');
      expect(Math.abs(Number(valor.valor))).toBeLessThan(10);
    }
  });

  it('o total de cada bloco é a soma das linhas dele', () => {
    const de = (rotulo: string, cenario: string) =>
      Number(resultado.valores.find((v) => v.rotulo === rotulo && v.cenario === cenario)?.valor);

    for (const cenario of ['Cenário Atual', 'Cenário 01', 'Cenário 02']) {
      const partes = ['IRPF', 'CBS (a partir de 2027)', 'INSS']
        .map((rotulo) =>
          Number(
            resultado.valores.find(
              (v) =>
                v.rotulo === rotulo && v.cenario === cenario && v.origemCelula.match(/1[6-9]$/),
            )?.valor,
          ),
        )
        .filter((n) => !Number.isNaN(n));

      const soma = partes.reduce((a, b) => a + b, 0);
      expect(de('Pessoa Física', cenario)).toBeCloseTo(soma, 2);
    }
  });
});

describe('lerWp na Venda de Ativos', () => {
  const resultado = lerWp(abre('transferencia-rural'));

  it('não encontra problema num arquivo bom', () => {
    expect(resultado.problemas).toEqual([]);
  });

  it('produz exatamente o gabarito, valor por valor', () => {
    expect(resultado.valores).toEqual(esperadoTransferencia.valores);
  });

  /*
   * Sete anos, e não os três do estudo: a apuração acompanha o cronograma de
   * amortização da dívida, que vai até 2032. Ler só três perderia metade do slide.
   */
  it('lê os sete anos da apuração', () => {
    expect([...new Set(resultado.valores.map((v) => v.ano))]).toEqual(ANOS_DA_VENDA);
  });

  /*
   * Esta aba não tem linha de contribuinte, porque a venda é do produtor e não se
   * reparte por pessoa. Se a leitura tentasse descobrir contribuinte aqui, viria
   * o rótulo de outra linha no lugar.
   */
  it('não inventa contribuinte', () => {
    expect(resultado.valores.every((v) => v.contribuinte === undefined)).toBe(true);
  });

  it('o cenário é o nome da aba', () => {
    expect([...new Set(resultado.valores.map((v) => v.cenario))]).toEqual([
      'Cenário 02 (Venda de Ativos)',
    ]);
  });

  /*
   * O bloco de cima não tem ano: bens, dívidas e a diferença moram numa coluna só.
   * Entram com o primeiro ano da apuração, que é quando a venda começa, para o
   * slide poder mostrar os dois lado a lado sem inventar coordenada.
   */
  it('o bloco de bens e dívidas entra no primeiro ano', () => {
    const daColunaC = resultado.valores.filter((v) => /!C(19|20|21)$/.test(v.origemCelula));

    expect(daColunaC.map((v) => v.rotulo)).toEqual([
      'Bens da atividade rural',
      'Dívidas da atividade rural',
      'Diferença',
    ]);
    expect(daColunaC.every((v) => v.ano === 2026)).toBe(true);
  });

  /*
   * No primeiro ano não há saldo de exercício anterior, e a célula está vazia no
   * modelo. Vazio tem de ser ausência de linha, nunca zero: zero seria afirmar que
   * a apuração foi feita e deu nada.
   */
  it('célula vazia no primeiro ano não vira zero', () => {
    const saldos = resultado.valores.filter(
      (v) => v.rotulo === 'Saldo de prejuízo a compensar de exercício(s) anterior(es)',
    );

    expect(saldos.map((v) => v.ano)).toEqual(ANOS_DA_VENDA.slice(1));
  });

  /*
   * A corrente aritmética, que é o teste que pega troca de linha na leitura: se a
   * leitura pegasse a linha vizinha, o número sairia plausível e as proporções não
   * fechariam. Aqui a presunção sai do resultado do exercício, e não da receita
   * como nas abas de cenário, e o imposto sai do resultado tributável.
   */
  it('a corrente de 20% e 27,5% fecha em todos os anos', () => {
    for (const ano of ANOS_DA_VENDA) {
      const de = (rotulo: string) =>
        Number(resultado.valores.find((v) => v.ano === ano && v.rotulo === rotulo)?.valor);

      expect(de('Presunção de 20%')).toBeCloseTo(de('Resultado do exercício') * 0.2, 2);
      expect(de('Total a recolher')).toBeCloseTo(de('Resultado tributável') * 0.275, 2);
    }
  });
});

describe('lerWp na DRE', () => {
  const resultado = lerWp(abre('dre'));

  it('não encontra problema num arquivo bom', () => {
    expect(resultado.problemas).toEqual([]);
  });

  it('produz exatamente o gabarito, valor por valor', () => {
    expect(resultado.valores).toEqual(esperadoDre.valores);
  });

  it('lê as contas de detalhe, e não só os totais', () => {
    const porNivel = resultado.valores.reduce<Record<number, number>>((acc, v) => {
      acc[v.nivel ?? -1] = (acc[v.nivel ?? -1] ?? 0) + 1;
      return acc;
    }, {});
    expect(porNivel[0]).toBeGreaterThan(0);
    expect(porNivel[1]).toBeGreaterThan(0);
    expect(porNivel[2]).toBeGreaterThan(0);
  });

  /*
   * Quem escolhe as contas que vão ao slide é o consultor, não o sistema: a
   * leitura pega a coluna toda e fica com o que foi preenchido. Por isso as 13
   * contas de custo aparecem aqui, mesmo o slide de origem mostrando só o total.
   */
  it('traz as contas de custo preenchidas, mesmo as que o slide não mostrou', () => {
    const custos = resultado.valores.filter((v) => v.rotulo.startsWith('(-)') && v.nivel === 1);
    expect(custos.length).toBeGreaterThanOrEqual(13);
  });

  it('a conta de resultado fecha com receita menos custos e despesas', () => {
    const de = (rotulo: string) =>
      Number(resultado.valores.find((v) => v.rotulo === rotulo)?.valor);

    const esperado =
      de('Receita') -
      de('(-) Custos') -
      de('(-) Despesas administrativas') +
      de('(+/-) Resultado financeiro');
    expect(de('(=) Lucro/Prejuízo do exercício')).toBeCloseTo(esperado, 2);
  });
});

describe('lerWp diante de arquivo que não serve', () => {
  it('avisa quando o arquivo não tem aba conhecida nenhuma', () => {
    const resultado = lerWp(planilhaComAbaDesconhecida());
    expect(resultado.valores).toEqual([]);
    expect(resultado.problemas).toHaveLength(1);
    expect(resultado.problemas[0].tipo).toBe('aba_ausente');
  });

  /*
   * O SheetJS é tolerante: conteúdo que não é xlsx pode virar uma planilha de uma
   * célula em vez de estourar. Então o que se garante aqui não é "estoura", e sim
   * que em nenhuma hipótese sai valor de dentro de arquivo que não serve. Ou
   * levanta erro, ou devolve lista vazia com problema apontado.
   */
  it('nunca produz valor a partir de arquivo que não é o WP', () => {
    let resultado: ReturnType<typeof lerWp> | undefined;
    try {
      resultado = lerWp(new TextEncoder().encode('isto não é um xlsx'));
    } catch {
      return;
    }
    expect(resultado.valores).toEqual([]);
    expect(resultado.problemas.length).toBeGreaterThan(0);
  });
});

describe('lerWp no cabe\u00e7alho do estudo', () => {
  const resultado = lerWp(abre('cabecalho-do-estudo'));

  it('n\u00e3o encontra problema num arquivo bom', () => {
    expect(resultado.problemas).toEqual([]);
  });

  it('produz exatamente o gabarito', () => {
    expect(resultado.cabecalho).toEqual(esperadoCabecalho.cabecalho);
  });

  /*
   * R\u00f3tulo e valor moram na mesma c\u00e9lula, e o corte \u00e9 no dois-pontos. Procurar o
   * valor na c\u00e9lula ao lado devolveria vazio em todo estudo.
   */
  it('corta o r\u00f3tulo que vem colado no valor', () => {
    expect(resultado.cabecalho.preparadoPor).toBe('M\u00f4nica Prado');
    expect(resultado.cabecalho.anoInicial).toBe(2026);
    expect(resultado.cabecalho.anoFinal).toBe(2028);
  });

  /*
   * O ano-base \u00e9 2025 e o primeiro ano do estudo \u00e9 2026. Confundir os dois faria a
   * proje\u00e7\u00e3o come\u00e7ar um ano antes.
   */
  it('o ano-base n\u00e3o \u00e9 o primeiro ano do estudo', () => {
    expect(resultado.cabecalho.anoBase).toBe(2025);
    expect(resultado.cabecalho.crescimentoAnual).toBe(0.05);
  });

  /*
   * `[Nome do Cliente]` \u00e9 marca\u00e7\u00e3o de gabarito, e gravar isso como nome do cliente
   * seria pior do que gravar nada.
   */
  it('texto entre colchetes n\u00e3o \u00e9 nome de cliente', () => {
    const daPlaca = lerWp(abre('carga-tributaria'));
    expect(daPlaca.cabecalho.clienteNoWp).toBeUndefined();
  });
});

describe('lerWp na Carga Tribut\u00e1ria', () => {
  const resultado = lerWp(abre('carga-tributaria'));

  it('n\u00e3o encontra problema num arquivo bom', () => {
    expect(resultado.problemas).toEqual([]);
  });

  it('produz exatamente o gabarito do farol', () => {
    expect(resultado.farol).toEqual(esperadoFarol.farol);
  });

  /*
   * A c\u00e9lula traz al\u00edquota OU marcador. `3,22%\u00b9` \u00e9 texto, porque o expoente faz
   * parte do que o slide mostra, e `O` \u00e9 a letra em fonte de s\u00edmbolo que vira \u00edcone.
   * Virar zero seria afirmar que a al\u00edquota \u00e9 zero, o que \u00e9 outra coisa.
   */
  it('separa al\u00edquota de marcador pela unidade', () => {
    const porUnidade = new Set(resultado.farol.map((f) => f.unidade));
    expect(porUnidade).toEqual(new Set(['percentual', 'texto']));

    const numeros = resultado.farol.filter((f) => f.unidade === 'percentual');
    expect(numeros.every((f) => typeof f.valor === 'number')).toBe(true);

    const textos = resultado.farol.filter((f) => f.unidade === 'texto');
    expect(textos.every((f) => typeof f.valor === 'string')).toBe(true);
  });

  it('a coordenada \u00e9 regime contra pessoa, e n\u00e3o tem ano', () => {
    const coordenadas = new Set(resultado.farol.map((f) => `${f.regime}/${f.pessoa}`));
    expect(coordenadas).toEqual(new Set(['presumido/pf', 'presumido/pj', 'real/pf', 'real/pj']));
  });

  /* O bloco vem da linha de t\u00edtulo acima, que agrupa, e n\u00e3o da pr\u00f3pria linha. */
  it('o bloco \u00e9 o grupo de tributos', () => {
    expect(new Set(resultado.farol.map((f) => f.bloco))).toEqual(new Set(['IRPF/IRPJ/CSLL']));
  });

  /*
   * As notas de rodap\u00e9 s\u00e3o texto que acompanha o slide e n\u00e3o pertencem a cen\u00e1rio
   * nenhum, ent\u00e3o v\u00e3o para a tabela de coment\u00e1rio com cen\u00e1rio nulo.
   */
  it('as notas saem como coment\u00e1rio sem cen\u00e1rio', () => {
    expect(resultado.comentarios).toEqual(esperadoFarol.comentarios);
    expect(resultado.comentarios.every((c) => c.cenario === null)).toBe(true);
  });

  /* A linha de t\u00edtulo agrupa, n\u00e3o carrega valor. */
  it('a linha de t\u00edtulo n\u00e3o vira valor', () => {
    expect(resultado.farol.some((f) => f.rotulo === 'IRPF/IRPJ/CSLL')).toBe(false);
  });
});

describe('lerWp nos coment\u00e1rios', () => {
  const resultado = lerWp(abre('comentarios'));

  it('n\u00e3o encontra problema num arquivo bom', () => {
    expect(resultado.problemas).toEqual([]);
  });

  it('produz exatamente o gabarito', () => {
    expect(resultado.comentarios).toEqual(esperadoComentarios.comentarios);
  });

  /*
   * Uma linha de texto por registro, e n\u00e3o um texto concatenado: no slide cada uma
   * \u00e9 um marcador de lista, e a ordem reinicia a cada tributo.
   */
  it('a ordem reinicia em cada tributo', () => {
    const porTributo = new Map<string, number[]>();
    for (const c of resultado.comentarios) {
      porTributo.set(c.tributo, [...(porTributo.get(c.tributo) ?? []), c.ordem]);
    }

    expect(porTributo.get('IRPF')).toEqual([1, 2]);
    expect(porTributo.get('PIS/Cofins')).toEqual([1]);
  });

  /*
   * O percentual de parceria agr\u00edcola ocupa um marcador mas \u00e9 premissa, com valor
   * na coluna C, e serve outro slide. Se entrasse, o slide ganharia uma caixa de
   * texto vazia com um n\u00famero perdido dentro.
   */
  it('o percentual de parceria n\u00e3o \u00e9 coment\u00e1rio', () => {
    const tributos = resultado.comentarios.map((c) => c.tributo);
    expect(tributos).not.toContain('Percentual de parceria agr\u00edcola');
    expect(new Set(tributos)).toEqual(new Set(['IRPF', 'PIS/Cofins']));
  });

  /* No modelo os cinco marcadores existem sempre; o estudo preenche os que usa. */
  it('marcador sem r\u00f3tulo n\u00e3o gera registro', () => {
    expect(resultado.comentarios).toHaveLength(3);
  });

  it('o dois-pontos do r\u00f3tulo n\u00e3o vai para o banco', () => {
    expect(resultado.comentarios.every((c) => !c.tributo.endsWith(':'))).toBe(true);
  });
});

describe('lerWp nos bens e nas d\u00edvidas', () => {
  const resultado = lerWp(abre('bens-e-dividas'));

  it('n\u00e3o encontra problema num arquivo bom', () => {
    expect(resultado.problemas).toEqual([]);
  });

  it('produz exatamente o gabarito dos bens', () => {
    expect(resultado.bens).toEqual(esperadoBensEDividas.bens);
  });

  it('produz exatamente o gabarito das d\u00edvidas', () => {
    expect(resultado.dividas).toEqual(esperadoBensEDividas.dividas);
  });

  /*
   * O total \u00e9 conta da planilha e n\u00e3o \u00e9 registro: grav\u00e1-lo dobraria a soma no
   * cart\u00e3o de premissas. As duas abas trazem a linha, uma escrita `TOTAL` e a
   * outra `Total`.
   */
  it('para de ler na linha de total', () => {
    expect(resultado.bens).toHaveLength(3);
    expect(resultado.dividas).toHaveLength(3);
    expect(resultado.bens.some((b) => b.contribuinte === 'TOTAL')).toBe(false);
  });

  /*
   * A data vem como n\u00famero de s\u00e9rie do Excel. A conta \u00e9 dias desde 30/12/1899,
   * porque o Excel conta um 29/02/1900 que nunca existiu: usar 01/01/1900 erra
   * dois dias.
   */
  it('converte a data de vencimento', () => {
    expect(resultado.dividas[0].vencimentoFinal).toBe('2028-07-01');
    expect(
      resultado.dividas.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.vencimentoFinal ?? '')),
    ).toBe(true);
  });

  /*
   * As colunas de ano s\u00e3o reconhecidas pelo r\u00f3tulo de quatro d\u00edgitos, e n\u00e3o por
   * lista fixa: o cronograma da d\u00edvida n\u00e3o \u00e9 a data-base do estudo, e um cliente
   * novo pode ir at\u00e9 outro ano.
   */
  it('a amortiza\u00e7\u00e3o por ano cobre os sete anos', () => {
    for (const divida of resultado.dividas) {
      expect(Object.keys(divida.porAno)).toEqual(ANOS_DA_VENDA.map(String));
    }
  });

  /* A coluna de valor \u00e9 a de situa\u00e7\u00e3o na data-base, cujo r\u00f3tulo traz o ano. */
  it('acha o valor do bem pela coluna de situa\u00e7\u00e3o', () => {
    expect(resultado.bens.every((b) => typeof b.valor === 'number')).toBe(true);
  });
});
