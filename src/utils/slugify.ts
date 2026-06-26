/**
 * Converte um texto livre em slug seguro para nome de arquivo:
 * minúsculas, sem acento, espaços/pontuação → hífen. Usado nos nomes dos
 * exports do MAPA (SOP/diagrama) em vez do UUID do processo.
 */
export function slugify(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')    // remove acentos (diacríticos combinantes)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')        // não-alfanumérico → hífen
    .replace(/^-+|-+$/g, '')            // tira hífens das pontas
    .slice(0, 80);                      // limita o tamanho
}

/** Slug com fallback para o id quando o nome resulta vazio. */
export function slugFilename(name: string, fallbackId: string): string {
  return slugify(name) || fallbackId;
}
