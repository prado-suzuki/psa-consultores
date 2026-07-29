/**
 * Escrita de menções nos comentários de tarefa/projeto.
 *
 * São dois formatos, de propósito:
 *
 * - **texto do campo** — o que a pessoa lê enquanto escreve: `@Bernardo Kropiwiec`.
 *   Nome e nada mais; o uuid não aparece na tela em momento nenhum.
 * - **corpo gravado** — o token `@[Bernardo Kropiwiec](uuid)`, que o banco guarda
 *   e a thread exibe como pílula. O uuid ainda vai no array `_mentions` da RPC
 *   `criar_org_comment`, porque é ele que virá a notificar.
 *
 * A ponte entre os dois é a lista de menções escolhidas: `serializarMencoes`
 * (campo → corpo) na hora de publicar e `desserializarMencoes` (corpo → campo)
 * na hora de reabrir um comentário para editar. Este módulo é essa fronteira —
 * sem React e sem Supabase.
 */

export interface MentionCandidate {
  id: string;
  name: string;
}

/** Token gravado no corpo. Grupo 1 = nome exibido, grupo 2 = uuid mencionado. */
const TOKEN_DE_MENCAO = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Gatilho do autocomplete: um `@` no começo do texto ou depois de espaço/abre
 * parêntese, seguido do que já foi digitado até o cursor.
 *
 * O termo aceita espaço — quem procura "Ana S" está no meio de um nome
 * composto — mas não aceita `[`, `]`, `(` nem `)`. O limite de 24 caracteres,
 * somado ao fato de a lista só aparecer quando algum nome casa, é o que evita a
 * lista ficar aberta pela frase inteira depois de um `@` solto.
 */
const GATILHO_DE_MENCAO = /(?:^|[\s(])@([^\n@[\]()]{0,24})$/;

export interface MencaoAtiva {
  /** O que foi digitado depois do `@`, sem o `@`. */
  termo: string;
  /** Índice do `@` no texto — de onde a substituição começa. */
  inicio: number;
}

/** Um trecho do texto do campo: pedaço solto ou menção já resolvida. */
export interface SegmentoDeTexto {
  text: string;
  /** Presente só quando o trecho é um `@Nome` já escolhido na lista. */
  mention?: MentionCandidate;
}

/** Extrai os uuids mencionados no corpo gravado, sem repetir, na ordem de leitura. */
export function extrairMencoes(body: string): string[] {
  return [...new Set(Array.from(body.matchAll(TOKEN_DE_MENCAO), (match) => match[2]))];
}

/**
 * Quebra o texto do campo nos `@Nome` das menções escolhidas.
 *
 * Nomes maiores são casados primeiro, para "Ana" não roubar o começo de
 * "Ana Souza". Homônimos dentro do mesmo projeto ficam indistinguíveis pelo
 * texto — o primeiro candidato com aquele nome é quem leva a menção.
 */
export function segmentarComMencoes(text: string, mencoes: MentionCandidate[]): SegmentoDeTexto[] {
  const rotulos = [...mencoes]
    .filter((mencao) => mencao.name.trim().length > 0)
    .sort((a, b) => b.name.length - a.name.length);
  const segmentos: SegmentoDeTexto[] = [];
  let solto = '';
  let indice = 0;

  while (indice < text.length) {
    const casada =
      text[indice] === '@'
        ? rotulos.find((mencao) => text.startsWith(`@${mencao.name}`, indice))
        : undefined;

    if (!casada) {
      solto += text[indice];
      indice += 1;
      continue;
    }

    if (solto) {
      segmentos.push({ text: solto });
      solto = '';
    }
    segmentos.push({ text: `@${casada.name}`, mention: casada });
    indice += casada.name.length + 1;
  }

  if (solto) segmentos.push({ text: solto });
  return segmentos;
}

/** Texto do campo → corpo gravado, trocando cada `@Nome` pelo token com o uuid. */
export function serializarMencoes(text: string, mencoes: MentionCandidate[]): string {
  return segmentarComMencoes(text, mencoes)
    .map((segmento) =>
      segmento.mention ? `@[${segmento.mention.name}](${segmento.mention.id})` : segmento.text,
    )
    .join('');
}

/**
 * Corpo gravado → texto do campo, devolvendo também as menções que estavam ali.
 * É o caminho de volta: reabrir um comentário para editar não pode expor uuid.
 */
export function desserializarMencoes(body: string): {
  text: string;
  mencoes: MentionCandidate[];
} {
  const mencoes: MentionCandidate[] = [];
  const text = body.replace(TOKEN_DE_MENCAO, (_token, name: string, id: string) => {
    if (!mencoes.some((mencao) => mencao.id === id && mencao.name === name)) {
      mencoes.push({ id, name });
    }
    return `@${name}`;
  });
  return { text, mencoes };
}

/**
 * A menção que está sendo escrita na posição do cursor, ou `null` se não há uma.
 *
 * `mencoes` são as já escolhidas: um `@` que abre uma delas pertence àquela
 * menção, não a uma busca nova — senão a lista reabriria sozinha em cima do
 * nome que acabou de ser inserido.
 */
export function detectarMencaoAtiva(
  text: string,
  caret: number,
  mencoes: MentionCandidate[] = [],
): MencaoAtiva | null {
  const antesDoCursor = text.slice(0, Math.max(0, Math.min(caret, text.length)));
  const match = antesDoCursor.match(GATILHO_DE_MENCAO);
  if (!match) return null;
  const termo = match[1];
  const inicio = antesDoCursor.length - termo.length - 1;
  const jaResolvida = mencoes.some(
    (mencao) => mencao.name.trim().length > 0 && text.startsWith(`@${mencao.name}`, inicio),
  );
  return jaResolvida ? null : { termo, inicio };
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

/**
 * Troca o `@termo` em construção pelo `@Nome` da pessoa escolhida e devolve onde
 * o cursor deve ficar — depois do espaço que fecha a menção, pronto para seguir
 * escrevendo a frase.
 */
export function aplicarMencao(
  text: string,
  mencao: MencaoAtiva,
  candidate: MentionCandidate,
): { text: string; caret: number } {
  const fim = mencao.inicio + 1 + mencao.termo.length;
  const escrita = `@${candidate.name} `;
  return {
    text: `${text.slice(0, mencao.inicio)}${escrita}${text.slice(fim)}`,
    caret: mencao.inicio + escrita.length,
  };
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
