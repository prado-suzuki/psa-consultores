import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { lerWp } from '@/lib/planejamento-tributario/parser';

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

describe('lerWp na apuração do IRPF', () => {
  const resultado = lerWp(abre('transferencia-rural'));

  it('não encontra problema num arquivo bom', () => {
    expect(resultado.problemas).toEqual([]);
  });

  it('produz exatamente o gabarito, valor por valor', () => {
    expect(resultado.valores).toEqual(esperadoTransferencia.valores);
  });

  it('descobre os três anos e o contribuinte de cada coluna', () => {
    expect([...new Set(resultado.valores.map((v) => v.ano))]).toEqual([2026, 2027, 2028]);
    expect([...new Set(resultado.valores.map((v) => v.contribuinte))]).toEqual(['Aurora Agro']);
  });

  /*
   * A corrente que o slide de Transferência mostra: a presunção é 20% do resultado
   * do exercício, e o imposto é 27,5% da presunção. Vale a pena prender aqui,
   * porque é o teste que pega troca de linha na leitura: se a leitura pegasse a
   * linha vizinha, o número sairia plausível e as duas proporções não fechariam.
   */
  it('a corrente de 20% e 27,5% fecha em todos os anos', () => {
    for (const ano of [2026, 2027, 2028]) {
      const de = (rotulo: string) =>
        Number(resultado.valores.find((v) => v.ano === ano && v.rotulo === rotulo)?.valor);

      expect(de('Presunção de 20%')).toBeCloseTo(de('Resultado do exercício') * 0.2, 2);
      expect(de('Total a recolher')).toBeCloseTo(de('Presunção de 20%') * 0.275, 2);
    }
  });

  it('o cenário é o nome da aba, não o do cabeçalho do Resumo', () => {
    expect([...new Set(resultado.valores.map((v) => v.cenario))]).toEqual(['Cenário Atual (PF)']);
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
