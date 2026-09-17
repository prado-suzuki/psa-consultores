import type { BeneficiarioDoProtocolo, SecaoDaGrade } from '@/lib/protocoloRemuneracao';

/**
 * A planilha do protocolo escrita DENTRO do modelo da casa (GOV-F).
 *
 * **Por que não bastava montar a planilha.** A primeira versão usava o `xlsx`
 * para escrever um arquivo do zero, e ele saía cru: a biblioteca community do
 * SheetJS escreve valor, largura e mesclagem, mas NÃO escreve estilo de célula.
 * Medido nos dois arquivos: o gerado tinha 1 fonte, 1 borda e 1 estilo de
 * célula; o `00_MODELO_da_casa.xlsx` tem 6 fontes, 6 preenchimentos, 2 bordas e
 * 18 estilos.
 *
 * **A saída é não reescrever o arquivo, e sim trocar os dados dentro dele.** O
 * `.xlsx` é um zip: `styles.xml`, `theme`, fontes, cores e bordas ficam
 * INTOCADOS, e só o `sheetData` e as mesclagens são refeitos. Assim a fidelidade
 * não é aproximada, é por construção, e nada precisa ser redesenhado à mão.
 *
 * Este arquivo é a parte pura: recebe o XML da planilha do modelo e devolve o
 * XML novo. Quem abre e refecha o zip é a tela, com o `jszip` que o projeto já
 * tem.
 *
 * **OS ÍNDICES DE ESTILO SÃO DO MODELO**, lidos do XML dele e não escolhidos por
 * mim. Cada posição da grade usa o mesmo `s=` que o modelo usa naquela posição,
 * que é o que faz o arquivo abrir igual.
 *
 * **AS LINHAS 1 E 2 NASCEM OCULTAS**, e isso não é engano: tanto o modelo quanto
 * o Potrich entregue as escondem (`hidden="1"`). São linhas de apoio, e o que se
 * vê começa na linha do cabeçalho das colunas.
 */

/* Os índices de estilo do modelo, por posição. Ver o cabeçalho. */
const S_TITULO = 14;
const S_APOIO_CRITERIOS = 17;
const S_APOIO_VAO = 6;
const S_APOIO_FAIXA = 16;
const S_CABECALHO_VAO = 12;
const S_CABECALHO_NOME = 8;
const S_TEMA = 15;
const S_VAO_ESTREITO = 3;
const S_ITEM = 4;
const S_VAO_LARGO = 10;
const S_VALOR = 9;

/* Atributos de `<row>` do modelo, incluindo altura e ocultação. */
const ROW_TITULO = 'ht="24.95" hidden="1" customHeight="1"';
const ROW_APOIO = 's="7" customFormat="1" ht="27" hidden="1" customHeight="1"';
const ROW_CABECALHO = 's="7" customFormat="1" ht="33.95"';
const ROW_ITEM = 's="2" customFormat="1" ht="30"';
const ROW_VAO = 'ht="3.95" customHeight="1"';

const COL_TEMA = 2;
const COL_ITEM = 4;
const COL_PRIMEIRO_VALOR = 7;

const colunaDoValor = (i: number) => COL_PRIMEIRO_VALOR + i * 2;

/**
 * O nome do arquivo.
 *
 * Leva o cliente e a versão porque o protocolo é versionado e as versões
 * circulam juntas: no acervo, o Toqueto tem a V1 e a VF lado a lado na mesma
 * pasta. Sem a versão no nome, a segunda baixada vira "(1)" e ninguém sabe qual
 * é qual.
 *
 * Tudo o que não é letra, número ou hífen vira hífen: o nome do cliente no
 * cadastro tem ponto, colchete e barra, e barra em nome de arquivo é caminho.
 */
export function nomeDoArquivo(cliente: string, versao: number): string {
  const limpo = cliente
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `Protocolo-de-Remuneracao-${limpo || 'cliente'}-v${versao}.xlsx`;
}

/** `0` vira `A`, `26` vira `AA`. A grade não passa de L, mas o custo é uma linha. */
export function letraDaColuna(i: number): string {
  let n = i;
  let letra = '';
  do {
    letra = String.fromCharCode(65 + (n % 26)) + letra;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letra;
}

/**
 * O que o XML não aceita cru.
 *
 * Os textos vêm de `textarea` e são de cliente: o Potrich escreve "soja/milho" e
 * "R$ 45.000,00", mas basta uma regra dizer "menor que 5 & maior que 2" para o
 * arquivo abrir corrompido sem isto.
 */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Uma célula com texto.
 *
 * `inlineStr` em vez de `sharedStrings`: o texto vai dentro da própria célula, e
 * assim não é preciso reescrever o `sharedStrings.xml` do modelo nem manter os
 * índices dele em dia. O Excel aceita os dois.
 */
const celula = (ref: string, estilo: number, texto?: string) =>
  texto
    ? `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escapar(texto)}</t></is></c>`
    : `<c r="${ref}" s="${estilo}"/>`;

interface LinhaMontada {
  xml: string;
  /** Em que linha da planilha ela caiu, para calcular as mesclagens. */
  numero: number;
}

export interface PlanilhaXml {
  xml: string;
  /** Quantas linhas a grade ocupou, para quem quiser conferir. */
  linhas: number;
}

/**
 * Troca o `sheetData`, as mesclagens e a dimensão do XML do modelo.
 *
 * Tudo o mais do arquivo continua exatamente como está: é isso que preserva
 * fonte, cor, borda, congelamento de painel, margens e configuração de impressão.
 */
export function planilhaXmlDoProtocolo(
  modeloXml: string,
  secoes: SecaoDaGrade[],
  colunas: BeneficiarioDoProtocolo[],
  preambulo: string | null,
): PlanilhaXml {
  const ultima = colunaDoValor(Math.max(colunas.length - 1, 0));
  const letraUltima = letraDaColuna(ultima);
  const spans = `spans="3:${ultima + 1}"`;

  const linhas: LinhaMontada[] = [];
  const mesclagens: string[] = [];
  let n = 0;

  /* Linha 1: o título, oculta, como no modelo e no Potrich entregue. */
  n += 1;
  linhas.push({
    numero: n,
    xml:
      `<row r="${n}" ${spans} ${ROW_TITULO}>` +
      [COL_TEMA, ...Array.from({ length: ultima - COL_TEMA }, (_, k) => COL_TEMA + k + 1)]
        .map((c) =>
          celula(
            `${letraDaColuna(c)}${n}`,
            S_TITULO,
            c === COL_TEMA ? 'Protocolo de Remuneração' : undefined,
          ),
        )
        .join('') +
      '</row>',
  });
  mesclagens.push(`<mergeCell ref="C${n}:${letraUltima}${n}"/>`);

  /* Linha 2: a de apoio, também oculta. */
  n += 1;
  const linhaApoio = n;
  linhas.push({
    numero: n,
    xml:
      `<row r="${n}" ${spans} ${ROW_APOIO}>` +
      Array.from({ length: ultima - COL_TEMA + 1 }, (_, k) => COL_TEMA + k)
        .map((c) => {
          const estilo =
            c <= COL_ITEM ? S_APOIO_CRITERIOS : c === COL_ITEM + 1 ? S_APOIO_VAO : S_APOIO_FAIXA;
          return celula(`${letraDaColuna(c)}${n}`, estilo, c === COL_TEMA ? 'Critérios' : undefined);
        })
        .join('') +
      '</row>',
  });
  mesclagens.push(`<mergeCell ref="G${n}:${letraUltima}${n}"/>`);

  /* Linha 3: o cabeçalho visível, com o nome de cada coluna. */
  n += 1;
  const linhaCabecalho = n;
  const nomePorColuna = new Map(colunas.map((b, i) => [colunaDoValor(i), b.nome]));
  linhas.push({
    numero: n,
    xml:
      `<row r="${n}" ${spans} ${ROW_CABECALHO}>` +
      Array.from({ length: ultima - COL_TEMA + 1 }, (_, k) => COL_TEMA + k)
        .map((c) => {
          const ref = `${letraDaColuna(c)}${n}`;
          if (c <= COL_ITEM) return celula(ref, S_APOIO_CRITERIOS);
          if (c === COL_ITEM + 1) return celula(ref, S_APOIO_VAO);
          const nome = nomePorColuna.get(c);
          return nome
            ? celula(ref, S_CABECALHO_NOME, nome)
            : celula(ref, S_CABECALHO_VAO);
        })
        .join('') +
      '</row>',
  });
  /* "Critérios" encima tema e item, das duas linhas de apoio até o cabeçalho. */
  mesclagens.push(`<mergeCell ref="C${linhaApoio}:E${linhaCabecalho}"/>`);

  /*
   * O texto de abertura entra como linha própria só quando existe: o modelo não
   * tem um, e no Potrich ele é uma linha visível acima da grade.
   */
  if (preambulo?.trim()) {
    n += 1;
    linhas.push({
      numero: n,
      xml:
        `<row r="${n}" ${spans} ${ROW_CABECALHO}>` +
        Array.from({ length: ultima - COL_TEMA + 1 }, (_, k) => COL_TEMA + k)
          .map((c) =>
            celula(
              `${letraDaColuna(c)}${n}`,
              S_APOIO_CRITERIOS,
              c === COL_TEMA ? preambulo.trim() : undefined,
            ),
          )
          .join('') +
        '</row>',
    });
    mesclagens.push(`<mergeCell ref="C${n}:${letraUltima}${n}"/>`);
  }

  for (const secao of secoes) {
    if (secao.linhas.length === 0) continue;
    const primeira = n + 1;

    secao.linhas.forEach((linha, i) => {
      n += 1;
      const r = n;
      const partes = Array.from({ length: ultima - COL_TEMA + 1 }, (_, k) => COL_TEMA + k).map(
        (c) => {
          const ref = `${letraDaColuna(c)}${r}`;
          if (c === COL_TEMA) return celula(ref, S_TEMA, i === 0 ? secao.tema : undefined);
          if (c === COL_TEMA + 1 || c === COL_ITEM + 1) return celula(ref, S_VAO_ESTREITO);
          if (c === COL_ITEM) return celula(ref, S_ITEM, linha.item);
          const indice = (c - COL_PRIMEIRO_VALOR) / 2;
          if (!Number.isInteger(indice)) return celula(ref, S_VAO_LARGO);
          return celula(ref, S_VALOR, linha.celulas[indice]?.texto ?? undefined);
        },
      );
      linhas.push({ numero: r, xml: `<row r="${r}" ${spans} ${ROW_ITEM}>${partes.join('')}</row>` });

      /* O vão vai ENTRE itens: a mesclagem do tema tem de terminar num item, como
         no modelo, onde C4:C14 acaba na linha 14, que é item. */
      if (i < secao.linhas.length - 1) {
        n += 1;
        linhas.push({
          numero: n,
          xml: `<row r="${n}" ${spans} ${ROW_VAO}>${celula(`C${n}`, S_TEMA)}</row>`,
        });
      }
    });

    /* Tema de um item só não vira mesclagem: o Excel recusa faixa de uma linha. */
    if (n > primeira) mesclagens.push(`<mergeCell ref="C${primeira}:C${n}"/>`);
  }

  const sheetData = `<sheetData>${linhas.map((l) => l.xml).join('')}</sheetData>`;
  const merges = `<mergeCells count="${mesclagens.length}">${mesclagens.join('')}</mergeCells>`;

  const xml = modeloXml
    .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:${letraUltima}${n}"/>`)
    .replace(/<sheetData>[\s\S]*?<\/sheetData>/, sheetData)
    .replace(/<mergeCells count="\d+">[\s\S]*?<\/mergeCells>/, merges);

  return { xml, linhas: n };
}
