import type { Document, Paragraph } from 'docx';

// Adapter de saída .docx: converte o texto gerado pelo engine (string com quebras
// de linha) num documento Word. É o "plug de saída" previsto na arquitetura — o
// engine continua produzindo texto; aqui só damos forma a ele.
//
// O pacote `docx` (~350 KB) é carregado sob demanda (import dinâmico): só entra no
// bundle quando o usuário realmente baixa um documento.

type DocxModule = typeof import('docx');

const HEADING = /^(INSTRUMENTO|CAPÍTULO)\b/i;
const CLAUSULA = /^(CLÁUSULA[^:]*?|Parágrafo[^:]*?):/;

/** Heurística leve: linha toda em maiúsculas e curta também é título (subtítulos de capítulo etc.). */
function ehTitulo(linha: string): boolean {
  if (HEADING.test(linha)) return true;
  return linha.length <= 60 && /[A-ZÀ-Ý]/.test(linha) && linha === linha.toUpperCase();
}

function linhaParaParagrafo(docx: DocxModule, linhaBruta: string): Paragraph {
  const { AlignmentType, Paragraph, TextRun } = docx;
  const linha = linhaBruta.replace(/\s+$/, '');
  if (linha.trim() === '') return new Paragraph({});

  if (ehTitulo(linha.trim())) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: linha.trim(), bold: true })],
    });
  }

  // "CLÁUSULA ...:" / "Parágrafo ...:" — rótulo em negrito, resto normal.
  const m = linha.match(CLAUSULA);
  if (m) {
    const rotulo = m[0];
    const resto = linha.slice(rotulo.length);
    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 120 },
      children: [new TextRun({ text: rotulo, bold: true }), new TextRun({ text: resto })],
    });
  }

  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120 },
    children: [new TextRun({ text: linha })],
  });
}

/** Monta o Document do pacote `docx` a partir do texto gerado. */
function textoParaDocx(docx: DocxModule, texto: string): Document {
  const paragrafos = texto.split('\n').map((l) => linhaParaParagrafo(docx, l));
  return new docx.Document({ sections: [{ properties: {}, children: paragrafos }] });
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
export async function baixarDocx(nome: string, texto: string): Promise<void> {
  const docx = await import('docx');
  const doc = textoParaDocx(docx, texto);
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
