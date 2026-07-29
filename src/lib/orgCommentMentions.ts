/**
 * Lista de menção dos comentários de tarefa/projeto.
 *
 * Aqui mora só o que a lista precisa: o filtro por nome, a ordenação e as
 * iniciais do avatar. A escrita da menção passou a ser um nó do documento
 * (`MencaoUsuario`), e o formato gravado vive em `orgCommentRichText`.
 *
 * Sem React e sem Supabase.
 */

export interface MentionCandidate {
  id: string;
  name: string;
}

function normalizar(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Candidatos que casam com o termo digitado, por prefixo de qualquer parte do
 * nome — "@souza" acha "Ana Souza". Termo vazio (o `@` recém-digitado) devolve
 * o começo da lista.
 */
export function filtrarCandidatos(
  candidates: MentionCandidate[],
  termo: string,
  limite = 6,
): MentionCandidate[] {
  const chave = normalizar(termo);
  const comNome = candidates.filter((candidate) => candidate.name.trim().length > 0);
  if (!chave) return comNome.slice(0, limite);

  return comNome
    .filter((candidate) => {
      const nome = normalizar(candidate.name);
      return nome.startsWith(chave) || nome.split(/\s+/).some((parte) => parte.startsWith(chave));
    })
    .slice(0, limite);
}

/** Ordena por nome como a lista é lida: alfabética em pt-BR. */
export function ordenarCandidatos(candidates: MentionCandidate[]): MentionCandidate[] {
  return [...candidates].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** Iniciais do avatar: até duas letras do nome. */
export function iniciaisDoNome(name: string | null): string {
  return (name || 'Usuário')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
