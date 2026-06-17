import type { Document, Paragraph, Table, TextRun } from 'docx';
import type { Bloco } from './types';
import { extrairRunsLinha, removerMarcas } from './marcas';
import { segmentar, type Alinhamento, type Segmento } from './tabela';

// Adapter de saída .docx: converte os blocos gerados pelo engine (numerados e
// renderizados) num documento Word formatado por tipo estrutural. A formatação
// replica o modelo de referência da casa ("VF_Sugestão de Contrato Social —
// Barralcool", A4): Arial Narrow 12pt justificado, capítulos centralizados em
// negrito sublinhado, rótulos de cláusula/parágrafo em negrito e rodapé
// "Página X de Y" em Arial 9pt à direita.
//
// O pacote `docx` (~350 KB) é carregado sob demanda (import dinâmico): só entra no
// bundle quando o usuário realmente baixa um documento.

type DocxModule = typeof import('docx');

// --- Constantes do modelo de referência (twips; half-points para fontes) ----
const FONTE = 'Arial Narrow';
const FONTE_RODAPE = 'Arial';
const PT12 = 24;
const PT18 = 36;
const PT9 = 18;
const ESPACO_DEPOIS = 120; // 6pt entre parágrafos
const RECUO_ALINEA = 720; // 1,27 cm
const A4 = { width: 11906, height: 16838 };
const MARGENS = { top: 1418, bottom: 1276, left: 1701, right: 1133, header: 708, footer: 468 };

/** Rótulo de cláusula/parágrafo gerado pela numeração automática. */
const ROTULO = /^(CLÁUSULA[^:]*?:|Parágrafo[^:]*?:)\s?/;
/** Alínea: "a) …" possivelmente indentada ("    a) …"). */
const ALINEA = /^\s+[a-z]\)\s/i;
/** Linha de assinatura: "____________". */
const REGUA_ASSINATURA = /^_{5,}$/;

function ehCaixaAlta(linha: string): boolean {
  return /[A-ZÀ-Ý]/.test(linha) && linha === linha.toUpperCase();
}

/** Estilos estruturais do parágrafo, mesclados sobre as marcas inline de cada run. */
interface EstiloBase {
  bold?: boolean;
  underline?: boolean;
  size?: number;
}

/**
 * Converte as marcas inline (*…*, _…_, ~…~) de um trecho em TextRuns,
 * compondo com o estilo estrutural do parágrafo (negrito de rótulo/título soma
 * com as marcas; nunca as desliga).
 */
function runsInline(docx: DocxModule, texto: string, base: EstiloBase = {}): TextRun[] {
  const { TextRun, UnderlineType } = docx;
  return extrairRunsLinha(texto).map(
    (r) =>
      new TextRun({
        text: r.texto,
        bold: base.bold || r.negrito || undefined,
        italics: r.italico || undefined,
        underline: base.underline || r.sublinhado ? { type: UnderlineType.SINGLE } : undefined,
        size: base.size,
      }),
  );
}

/** Linha justificada com o rótulo ("CLÁUSULA X:" / "Parágrafo X:") em negrito. */
function linhaComRotulo(docx: DocxModule, linha: string): Paragraph {
  const { AlignmentType, Paragraph, TextRun } = docx;
  const m = linha.match(ROTULO);
  const children = m
    ? [new TextRun({ text: m[0], bold: true }), ...runsInline(docx, linha.slice(m[0].length))]
    : runsInline(docx, linha.replace(/^\s+/, ''));
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: ESPACO_DEPOIS },
    indent: ALINEA.test(removerMarcas(linha)) ? { left: RECUO_ALINEA } : undefined,
    children,
  });
}

const ALINHAMENTO_CELULA = {
  left: 'LEFT',
  center: 'CENTER',
  right: 'RIGHT',
} as const satisfies Record<Alinhamento, keyof typeof import('docx').AlignmentType>;

/** Converte um segmento de tabela (corrida de linhas-pipe) num Table do Word. */
function tabelaParaDocx(docx: DocxModule, seg: Extract<Segmento, { tipo: 'tabela' }>): Table {
  const { AlignmentType, BorderStyle, Paragraph, Table, TableCell, TableRow, WidthType } = docx;
  const borda = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const colunas = Math.max(seg.cabecalho.length, ...seg.corpo.map((l) => l.length));

  const celula = (texto: string, coluna: number, cabecalho: boolean) =>
    new TableCell({
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: AlignmentType[ALINHAMENTO_CELULA[seg.alinhamentos[coluna] ?? 'left']],
          children: runsInline(docx, texto, cabecalho ? { bold: true } : {}),
        }),
      ],
    });

  // Normaliza cada linha ao nº de colunas (células faltantes viram vazias).
  const completar = (cels: string[]) => Array.from({ length: colunas }, (_, c) => cels[c] ?? '');

  const linhaCabecalho = new TableRow({
    tableHeader: true,
    children: completar(seg.cabecalho).map((c, i) => celula(c, i, true)),
  });
  const linhasCorpo = seg.corpo.map(
    (cels) => new TableRow({ children: completar(cels).map((c, i) => celula(c, i, false)) }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: borda, bottom: borda, left: borda, right: borda, insideHorizontal: borda, insideVertical: borda },
    rows: [linhaCabecalho, ...linhasCorpo],
  });
}

/** Converte um bloco em parágrafos (e tabelas) Word conforme o tipo estrutural. */
function paragrafosDoBloco(docx: DocxModule, bloco: Bloco, primeiroBloco: boolean): (Paragraph | Table)[] {
  const { AlignmentType, Paragraph, TextRun } = docx;
  const saida: (Paragraph | Table)[] = [];
  let linhaAnteriorEraRegua = false;

  for (const seg of segmentar(bloco.conteudo.split('\n'))) {
    if (seg.tipo === 'tabela') {
      saida.push(tabelaParaDocx(docx, seg));
      linhaAnteriorEraRegua = false;
      continue;
    }
    const linha = seg.texto.replace(/\s+$/, '');
    if (linha.trim() === '') {
      saida.push(new Paragraph({}));
      linhaAnteriorEraRegua = false;
      continue;
    }

    // capitulo: linhas centralizadas; o negrito do "*CAPÍTULO {romano}*" vem da
    // marca inserida pela numeração — o título só fica em negrito se o autor marcar.
    if (bloco.tipo === 'capitulo') {
      saida.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: ESPACO_DEPOIS },
          children: runsInline(docx, linha.trim()),
        }),
      );
      continue;
    }

    // clausula/paragrafo: rótulo em negrito, corpo justificado, alíneas recuadas.
    if (bloco.tipo === 'clausula' || bloco.tipo === 'paragrafo') {
      saida.push(linhaComRotulo(docx, linha));
      continue;
    }

    // livre: heurísticas do modelo de referência (sobre o texto SEM marcas).
    const texto = linha.trim();
    const limpo = removerMarcas(texto);
    if (REGUA_ASSINATURA.test(limpo)) {
      saida.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: limpo })],
        }),
      );
      linhaAnteriorEraRegua = true;
      continue;
    }
    if (linhaAnteriorEraRegua) {
      // Nome do signatário logo abaixo da régua.
      saida.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: ESPACO_DEPOIS },
          children: runsInline(docx, texto, { bold: true }),
        }),
      );
      linhaAnteriorEraRegua = false;
      continue;
    }
    if (ehCaixaAlta(limpo)) {
      // Título do instrumento (e razão social) — 18pt sublinhado na abertura do documento.
      saida.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: ESPACO_DEPOIS },
          children: runsInline(docx, texto, {
            bold: true,
            size: primeiroBloco ? PT18 : PT12,
            underline: primeiroBloco,
          }),
        }),
      );
      continue;
    }
    saida.push(linhaComRotulo(docx, linha));
  }
  return saida;
}

/** Monta o Document a partir dos blocos gerados pelo engine. */
function blocosParaDocx(docx: DocxModule, blocos: Bloco[]): Document {
  const { AlignmentType, Footer, PageNumber, Paragraph, TextRun } = docx;
  const paragrafos = blocos.flatMap((bloco, i) => paragrafosDoBloco(docx, bloco, i === 0));

  return new docx.Document({
    styles: {
      default: {
        document: { run: { font: FONTE, size: PT12 } },
      },
    },
    sections: [
      {
        properties: { page: { size: A4, margin: MARGENS } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES],
                    font: FONTE_RODAPE,
                    size: PT9,
                  }),
                ],
              }),
            ],
          }),
        },
        children: paragrafos,
      },
    ],
  });
}

function nomeArquivo(nome: string): string {
  const base = (nome || 'documento')
    .normalize('NFD') // separa acentos para removê-los abaixo
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_') || 'documento';
  return `${base}.docx`;
}

/** Gera e dispara o download do .docx no navegador. */
export async function baixarDocx(nome: string, blocos: Bloco[]): Promise<void> {
  const docx = await import('docx');
  const doc = blocosParaDocx(docx, blocos);
  const blob = await docx.Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo(nome);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Exposto para testes: serializa o Document em XML sem disparar download. */
export async function montarDocx(blocos: Bloco[]): Promise<Document> {
  const docx = await import('docx');
  return blocosParaDocx(docx, blocos);
}
