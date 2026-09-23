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
 * O id do `@todos`.
 *
 * NÃO é uuid de propósito: `criar_org_comment` recebe `_mentions uuid[]`, então
 * um sentinel que escapasse para o banco morreria no cast, na fronteira, em vez
 * de virar uma linha de menção apontando para gente nenhuma. Quem expande é o
 * `expandirMencaoTodos`, e quem publica no feed ainda peneira pela roda de gente
 * do destino (`mencoesPermitidas`), que descarta o sentinel de novo.
 */
export const MENCAO_TODOS_ID = 'todos';

/**
 * O candidato sintético. Ele não é gente: representa a roda do PROJETO, que é
 * a mesma lista que o `useDomainMentionCandidates` monta (membros, responsável,
 * líder e, na tarefa, executor e revisor).
 */
export const MENCAO_TODOS: MentionCandidate = { id: MENCAO_TODOS_ID, name: 'todos' };

export function ehMencaoTodos(id: string): boolean {
  return id === MENCAO_TODOS_ID;
}

/**
 * Candidatos que casam com o termo digitado, por prefixo de qualquer parte do
 * nome — "@souza" acha "Ana Souza". Termo vazio (o `@` recém-digitado) devolve
 * o começo da lista.
 *
 * O `@todos` entra por ÚLTIMO, e nunca no lugar de uma pessoa. A lista abre com
 * o primeiro item em destaque, então pôr o grupo na frente faria de "@" + Enter
 * o gesto de avisar o projeto inteiro, bem onde a mão espera escolher alguém.
 * Vindo depois, ele continua a um `↓` de distância e a duas letras de busca.
 *
 * Só aparece com DUAS pessoas ou mais: com uma, `@todos` é um apelido mais longo
 * para o nome dela.
 */
export function filtrarCandidatos(
  candidates: MentionCandidate[],
  termo: string,
  limite = 6,
): MentionCandidate[] {
  const chave = normalizar(termo);
  const comNome = candidates.filter((candidate) => candidate.name.trim().length > 0);
  const pessoas = !chave
    ? comNome
    : comNome.filter((candidate) => {
        const nome = normalizar(candidate.name);
        return nome.startsWith(chave) || nome.split(/\s+/).some((parte) => parte.startsWith(chave));
      });

  const lista = pessoas.slice(0, limite);
  const ofereceTodos = comNome.length >= 2 && (!chave || normalizar(MENCAO_TODOS.name).startsWith(chave));
  return ofereceTodos ? [...lista, MENCAO_TODOS] : lista;
}

/**
 * Troca o `@todos` pela roda de gente, no instante de gravar.
 *
 * A expansão acontece em quem PUBLICA, e não no compositor, porque só ali se
 * sabe qual é a lista final: na caixa do feed o destino é escolhido no envio, e
 * a roda carregada enquanto se escrevia pode ser a de outro projeto. Expandir
 * cedo gravaria menção a quem não está na conversa, que é o vazamento que o
 * `useDomainMentionCandidates` existe para impedir.
 *
 * Quem escreveu fica de FORA: a notificação de menção não filtra o próprio autor
 * (ver `useNotificacoesMencao`), então sem isto todo `@todos` tocaria o sino de
 * quem acabou de escrever a frase.
 *
 * O sentinel some do resultado mesmo quando não há ninguém para expandir. Ele
 * nunca pode chegar ao banco: `_mentions` é `uuid[]`.
 */
export function expandirMencaoTodos(
  mencoes: string[],
  candidatos: MentionCandidate[],
  autorId?: string | null,
): string[] {
  if (!mencoes.some(ehMencaoTodos)) return mencoes;

  const expandidas: string[] = [];
  for (const id of mencoes) {
    if (!ehMencaoTodos(id)) {
      expandidas.push(id);
      continue;
    }
    for (const candidato of candidatos) {
      if (ehMencaoTodos(candidato.id) || candidato.id === autorId) continue;
      expandidas.push(candidato.id);
    }
  }
  return [...new Set(expandidas)];
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
