// Extração de texto de documento para leitura por IA.
//
// Antes, `processar-procedimento` fazia `await fileData.text()` para PDF e DOCX.
// PDF é stream comprimido e DOCX é um zip: o que chegava no modelo era binário
// interpretado como texto. O resultado não era um erro — era uma extração
// inventada com cara de verdade, ou um "Content too short".
//
// Aqui cada formato tem o seu extrator, e `garantirTextoUtil` recusa o que
// sobrou de binário ANTES de gastar uma chamada de modelo. Falhar limpo é
// melhor que catalogar lixo.

import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";

/** Entidades XML/HTML que aparecem em texto de documento. */
function decodificarEntidades(texto: string): string {
  return texto
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

/**
 * DOCX é um zip OOXML: o corpo do texto vive em `word/document.xml`.
 * `</w:p>` fecha parágrafo (vira quebra de linha) e `<w:tab/>` vira espaço —
 * sem isso as palavras de células e listas colam umas nas outras.
 */
export function extrairTextoDocx(bytes: Uint8Array): string {
  const partes = unzipSync(bytes);
  const documento = partes["word/document.xml"];
  if (!documento) {
    throw new Error("DOCX inválido: não encontrei word/document.xml no arquivo.");
  }

  const xml = strFromU8(documento);
  const texto = xml
    .replace(/<w:tab\b[^>]*\/>/g, " ")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:br\b[^>]*\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  return decodificarEntidades(texto).trim();
}

/**
 * PDF via pdf.js (empacotado pelo `unpdf` para runtime serverless).
 *
 * Não vale a pena escrever isto à mão: extrair os operadores `Tj`/`TJ` dos
 * streams na mão funciona no PDF simples e devolve letras embaralhadas em
 * qualquer PDF com fonte subsetada — que é justamente o lixo silencioso que
 * este arquivo existe para evitar.
 */
export async function extrairTextoPdf(bytes: Uint8Array): Promise<string> {
  let extractText: typeof import("npm:unpdf@1.8.1").extractText;
  try {
    ({ extractText } = await import("npm:unpdf@1.8.1"));
  } catch (err) {
    // Import dinâmico: se o runtime não conseguir baixar o pacote, o erro
    // precisa dizer isso — e não virar "documento ilegível".
    throw new Error(
      `Leitor de PDF indisponível no servidor (${err instanceof Error ? err.message : String(err)}). ` +
      `Tente novamente ou envie o procedimento por link.`
    );
  }

  const { text } = await extractText(bytes, { mergePages: true });
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** HTML de página pública: tira script/style e colapsa o resto. */
export function extrairTextoHtml(html: string): string {
  const texto = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  return decodificarEntidades(texto).trim();
}

const MARCAS_DE_LOGIN = [
  "sign in", "signin", "log in", "login", "fazer login", "faça login",
  "entrar com", "você precisa de acesso", "you need access", "request access",
  "solicitar acesso", "permission required", "permissão", "não tem acesso",
  "log in to confluence", "sign in - google accounts", "escolha uma conta",
];

const HOSTS_DE_LOGIN = ["accounts.google.com", "login.microsoftonline.com", "id.atlassian.com"];

/**
 * O leitor busca a URL sem estar logado em nada. Documento privado do
 * Drive/Notion/Confluence responde 200 com a TELA DE LOGIN — e era ela que a
 * IA acabava catalogando como se fosse o procedimento.
 */
export function pareceMuroDeLogin(urlFinal: string, texto: string): boolean {
  const host = (() => { try { return new URL(urlFinal).host; } catch { return ""; } })();
  if (HOSTS_DE_LOGIN.some((h) => host.includes(h))) return true;

  // Só suspeita quando sobrou POUCO texto: um procedimento de verdade que
  // mencione "login" no meio de 8 mil caracteres não é um muro de login.
  if (texto.length > 1500) return false;

  const minusculo = texto.toLowerCase();
  return MARCAS_DE_LOGIN.some((marca) => minusculo.includes(marca));
}

/**
 * Recusa o que não é texto legível antes de mandar para o modelo.
 *
 * `minimo` é bem maior que os 20 caracteres de antes: com 20, meio cabeçalho de
 * PDF passava como "conteúdo".
 */
export function garantirTextoUtil(texto: string, origem: string, minimo = 200): string {
  const limpo = texto.trim();

  if (limpo.length < minimo) {
    throw new Error(
      `Consegui abrir ${origem}, mas o texto extraído é curto demais (${limpo.length} caracteres). ` +
      `Se for um PDF escaneado, ele não tem texto — só imagem.`
    );
  }

  const letras = (limpo.match(/\p{L}/gu) ?? []).length;
  if (letras / limpo.length < 0.5) {
    throw new Error(
      `O conteúdo de ${origem} não parece texto legível (${Math.round((letras / limpo.length) * 100)}% de letras). ` +
      `Provavelmente é um arquivo protegido, escaneado ou corrompido.`
    );
  }

  return limpo;
}
