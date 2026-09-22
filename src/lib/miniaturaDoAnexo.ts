/**
 * Tamanho da miniatura de imagem no comentário.
 *
 * O tamanho sai da largura e da altura gravadas no upload, e não do arquivo
 * carregado: assim o espaço fica reservado antes de a imagem chegar, e a
 * conversa não pula para baixo quando cada print termina de baixar.
 */

export const MINIATURA_LARGURA_MAXIMA = 360;
export const MINIATURA_ALTURA_MAXIMA = 240;

/** Espaço de quando a imagem não tem medida gravada (anexo anterior ao campo). */
const SEM_MEDIDA = { largura: MINIATURA_LARGURA_MAXIMA, altura: 180 };

export function tamanhoDaMiniatura(
  largura: number | null,
  altura: number | null,
): { largura: number; altura: number } {
  if (!largura || !altura || largura <= 0 || altura <= 0) return SEM_MEDIDA;
  // Nunca amplia: print pequeno fica do tamanho que tem.
  const escala = Math.min(1, MINIATURA_LARGURA_MAXIMA / largura, MINIATURA_ALTURA_MAXIMA / altura);
  return { largura: Math.round(largura * escala), altura: Math.round(altura * escala) };
}

export function ehImagem(fileType: string | null): boolean {
  return fileType?.startsWith('image/') ?? false;
}
