import {
  ABAS_DE_CENARIO,
  ABA_FAROL,
  ABA_RESUMO,
  VALIDACOES,
} from '@/lib/planejamento-tributario/mapa';
import type { ProblemaWp, ValorWp } from '@/lib/planejamento-tributario/parser';
import type { LinhaWp } from '@/lib/planejamento-tributario/tipos';

/**
 * Conferência de conta sobre o que a leitura extraiu do WP.
 *
 * Separada do parser de propósito, porque as duas falham por motivos diferentes.
 * O parser falha quando **não consegue ler**: aba que não existe, rótulo fora do
 * lugar, célula com erro do Excel. O validador falha quando leu bem e **o número
 * não fecha**: a soma do bloco não bate com as linhas, a presunção não é 20% do
 * resultado. Misturar os dois esconderia o segundo atrás do primeiro.
 *
 * As regras estão em `VALIDACOES`, no mapa, em forma declarativa. Aqui só há o
 * motor que as aplica, e é por isso que acrescentar uma regra nova não mexe neste
 * arquivo.
 *
 * **Só confere o que foi lido.** Conta não preenchida não entra na soma e não
 * gera reclamação: o WP é preenchido conforme o cliente, e cobrar linha ausente
 * transformaria todo estudo normal num monte de falso alarme.
 */

/**
 * Diferença tolerada ao comparar dois valores em reais.
 *
 * Um centavo. Os números vêm de fórmula do Excel em ponto flutuante, então somar
 * quatro parcelas e comparar com o total guardado dá diferença na última casa. Um
 * centavo é folgado para isso e apertado para erro de verdade, que nesta base é
 * da ordem de milhares.
 */
const TOLERANCIA = 0.01;

/** Onde cada linha do mapa mora, para achar grupo e nível a partir do endereço. */
const LINHAS_POR_ENDERECO = new Map<string, LinhaWp>();
for (const aba of [ABA_RESUMO, ABA_FAROL]) {
  for (const linha of aba.linhas) LINHAS_POR_ENDERECO.set(`${aba.nome}!${linha.linha}`, linha);
}
for (const aba of ABAS_DE_CENARIO) {
  for (const linha of [...aba.dre, ...aba.apuracao]) {
    LINHAS_POR_ENDERECO.set(`${aba.nome}!${linha.linha}`, linha);
  }
}

/**
 * Resolve o grupo e o nível de um valor pelo endereço de origem, e não pelo
 * rótulo.
 *
 * Pelo rótulo não daria: `IRPJ/CSLL` e `INSS` aparecem nos três blocos do Resumo,
 * e `(+) Soja - Própria` aparece duas vezes na DRE, no mercado interno e no
 * externo. O endereço é único, o rótulo não.
 */
function linhaDoValor(valor: ValorWp): LinhaWp | undefined {
  const [aba, celula] = valor.origemCelula.split('!');
  const numero = celula.replace(/^[A-Z]+/, '');
  return LINHAS_POR_ENDERECO.get(`${aba}!${numero}`);
}

/** A coordenada que separa uma coluna da planilha da outra. */
function coordenada(valor: ValorWp): string {
  return `${valor.cenario}|${valor.contribuinte ?? ''}|${valor.ano}`;
}

function agrupaPorCoordenada(valores: ValorWp[]): Map<string, ValorWp[]> {
  const mapa = new Map<string, ValorWp[]>();
  for (const valor of valores) {
    const chave = coordenada(valor);
    const lista = mapa.get(chave);
    if (lista) lista.push(valor);
    else mapa.set(chave, [valor]);
  }
  return mapa;
}

function numero(valor: ValorWp | undefined): number | undefined {
  if (!valor) return undefined;
  return typeof valor.valor === 'number' ? valor.valor : undefined;
}

function diferenca(achado: number, esperado: number, onde: string, oQue: string): ProblemaWp[] {
  if (Math.abs(achado - esperado) <= TOLERANCIA) return [];
  return [
    {
      tipo: 'conta_nao_fecha',
      onde,
      detalhe: `${oQue}: achei ${achado.toFixed(2)} e esperava ${esperado.toFixed(2)}`,
    },
  ];
}

/**
 * Confere que o total de um grupo é a soma das linhas dele.
 *
 * O total tem `eTotal` no mapa e as filhas compartilham o mesmo `grupo`. Só
 * confere quando há total lido E ao menos uma filha lida: num cenário em que o
 * bloco inteiro está zerado, exigir a soma seria cobrar de um bloco que o estudo
 * não usou.
 */
function conferSomaDoGrupo(valores: ValorWp[], grupo: string): ProblemaWp[] {
  const problemas: ProblemaWp[] = [];

  for (const [, doGrupo] of agrupaPorCoordenada(valores)) {
    const comLinha = doGrupo
      .map((valor) => ({ valor, linha: linhaDoValor(valor) }))
      .filter((par) => par.linha?.grupo === grupo);

    const total = comLinha.find((par) => par.linha?.eTotal);
    const filhas = comLinha.filter((par) => !par.linha?.eTotal);
    if (!total || filhas.length === 0) continue;

    const somaDasFilhas = filhas.reduce((acc, par) => acc + (numero(par.valor) ?? 0), 0);
    const achado = numero(total.valor);
    if (achado === undefined) continue;

    problemas.push(
      ...diferenca(
        achado,
        somaDasFilhas,
        total.valor.origemCelula,
        `o total de \`${total.valor.rotulo}\` não é a soma das ${filhas.length} linhas do bloco`,
      ),
    );
  }

  return problemas;
}

/** Confere que um rótulo é a soma de outros, tipo Total = PF + Presumido + Real. */
function confereSomaDeRotulos(
  valores: ValorWp[],
  totalRotulo: string,
  partes: readonly string[],
): ProblemaWp[] {
  const problemas: ProblemaWp[] = [];

  for (const [, doGrupo] of agrupaPorCoordenada(valores)) {
    const total = doGrupo.find((v) => v.rotulo === totalRotulo);
    const achado = numero(total);
    if (!total || achado === undefined) continue;

    const encontradas = partes
      .map((rotulo) => numero(doGrupo.find((v) => v.rotulo === rotulo)))
      .filter((n): n is number => n !== undefined);
    if (encontradas.length === 0) continue;

    problemas.push(
      ...diferenca(
        achado,
        encontradas.reduce((a, b) => a + b, 0),
        total.origemCelula,
        `\`${totalRotulo}\` não é a soma de ${partes.join(' + ')}`,
      ),
    );
  }

  return problemas;
}

/** Confere que um valor é uma fração de outro, tipo a presunção de 20%. */
function confereProporcao(
  valores: ValorWp[],
  deRotulo: string,
  sobreRotulo: string,
  fator: number,
  cenario?: string,
  excetoContribuinte?: string,
): ProblemaWp[] {
  const problemas: ProblemaWp[] = [];

  for (const [, doGrupo] of agrupaPorCoordenada(valores)) {
    if (cenario !== undefined && doGrupo[0]?.cenario !== cenario) continue;
    if (excetoContribuinte !== undefined && doGrupo[0]?.contribuinte === excetoContribuinte)
      continue;
    const de = doGrupo.find((v) => v.rotulo === deRotulo);
    const sobre = doGrupo.find((v) => v.rotulo === sobreRotulo);
    const achado = numero(de);
    const base = numero(sobre);
    if (!de || achado === undefined || base === undefined) continue;

    problemas.push(
      ...diferenca(
        achado,
        base * fator,
        de.origemCelula,
        `\`${deRotulo}\` deveria ser ${(fator * 100).toFixed(1)}% de \`${sobreRotulo}\``,
      ),
    );
  }

  return problemas;
}

/**
 * Confere que um tributo é zero antes do ano em que passa a existir.
 *
 * O caso é a CBS, criada pela reforma e vigente a partir de 2027. Valor diferente
 * de zero em 2026 é erro de preenchimento, e sem esta conferência ele chegaria ao
 * slide como imposto a pagar num ano em que o tributo não existia.
 */
function confereZeroAntesDe(valores: ValorWp[], rotulo: string, ano: number): ProblemaWp[] {
  const problemas: ProblemaWp[] = [];

  for (const valor of valores) {
    if (valor.rotulo !== rotulo || valor.ano >= ano) continue;
    const achado = numero(valor);
    if (achado === undefined) continue;

    problemas.push(
      ...diferenca(
        achado,
        0,
        valor.origemCelula,
        `\`${rotulo}\` tem valor em ${valor.ano}, antes de o tributo existir`,
      ),
    );
  }

  return problemas;
}

/**
 * Aplica as regras do mapa sobre os valores lidos e devolve o que não fecha.
 *
 * Lista vazia significa que a aritmética do WP está coerente. Não significa que o
 * estudo está certo: significa que os números que ele traz são consistentes entre
 * si.
 */
export function validar(valores: ValorWp[]): ProblemaWp[] {
  const problemas: ProblemaWp[] = [];

  for (const regra of VALIDACOES) {
    switch (regra.tipo) {
      case 'soma_do_grupo':
        problemas.push(...conferSomaDoGrupo(valores, regra.grupo));
        break;
      case 'soma_de_rotulos':
        problemas.push(...confereSomaDeRotulos(valores, regra.total, regra.partes));
        break;
      case 'proporcao':
        problemas.push(
          ...confereProporcao(
            valores,
            regra.de,
            regra.sobre,
            regra.fator,
            regra.cenario,
            regra.excetoContribuinte,
          ),
        );
        break;
      case 'zero_antes_de':
        problemas.push(...confereZeroAntesDe(valores, regra.rotulo, regra.ano));
        break;
    }
  }

  return problemas;
}
