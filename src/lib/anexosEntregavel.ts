// Regras puras dos anexos de entregável, compartilhadas pelo Kanban e pela tela
// de detalhes da sprint: reconhecer imagem, pegar o print de um Ctrl+V e dar
// nome a ele.

/**
 * Anexo é imagem, e por isso ganha miniatura em vez de ícone genérico.
 * Confia no mime quando ele vem, e cai na extensão quando o navegador não manda.
 */
export function isImagemAnexo(fileType: string | null, fileName: string) {
  if (fileType?.startsWith('image/')) return true;
  const ext = (fileName.split('.').pop() ?? '').toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
}

/** Primeira imagem de um Ctrl+V. Devolve null quando o que foi colado é texto. */
export function primeiraImagemColada(files: File[]) {
  return files.find((file) => file.type.startsWith('image/')) ?? null;
}

/**
 * Print colado chega do sistema operacional como "image.png", igual para todos.
 * Carimba a data para os anexos não ficarem indistinguíveis na lista.
 */
export function nomeDoPrintColado(file: File, agora: Date) {
  const doMime = file.type.startsWith('image/') ? file.type.slice(6) : '';
  const ext = (doMime === 'jpeg' ? 'jpg' : doMime) || (file.name.split('.').pop() ?? 'png').toLowerCase();
  const carimbo = agora.toISOString().slice(0, 19).replace('T', ' ').replace(/:/g, '-');
  return `print ${carimbo}.${ext}`;
}
