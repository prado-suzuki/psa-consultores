// Proveniência dos valores do contexto: de qual registro do cadastro um objeto
// de campos veio ({ tipo: 'pessoa', id }).
//
// A origem viaja em DUAS CHAVES RESERVADAS DE STRING dentro do próprio objeto,
// gravadas num lugar só (`comOrigem`) e lidas num lugar só (`origemDe`).
//
// POR QUE DUAS CHAVES DE STRING, E NÃO UM OBJETO ANINHADO NUMA CHAVE SÓ
// --------------------------------------------------------------------
// `Campos` é `Record<string, string>`. Um `{ tipo, id }` aninhado quebraria o
// tipo e vazaria para dezenas de laços `Object.entries(campos)` que assumem
// valor string (`comporEstadoProposto`, `aplicarEnderecosDeSocios`,
// `normalizarSelecaoLegada`, o `assinatura()` da alteração contratual). Duas
// chaves de string preservam o tipo, e o custo é o par não poder ser lido nem
// escrito pela metade — daí as duas funções serem as únicas que os tocam.
//
// O prefixo `__motor` é o mesmo de `__motorCamposSintetizados` (sintetizado.ts),
// pela mesma razão e com a mesma disciplina: é marca do MOTOR, não campo do
// cadastro, nunca colide com id declarado no vocabulário, e quem procurar por
// `__motor` encontra a família inteira de uma vez.
//
// POR QUE NÃO É MAIS UM SYMBOL
// ----------------------------
// Era. Symbol nunca colide com campo e some de `Object.keys`, mas
// `JSON.stringify` o DESCARTA — e `snapshot_dados` é jsonb. O resultado medido
// era um snapshot quase sem a identidade das entidades que o documento cita, com
// remendos por cima (um `set('id', row.id)` avulso em dois mapeadores, um
// casamento por CPF, um `copiarOrigemProfunda` por índice). O próprio comentário
// desta função já prescrevia a saída: "se um dia o contexto passar por
// serialização, a origem precisa migrar para uma chave reservada comum".
//
// Duas propriedades do Symbol continuam valendo aqui: a origem é COPIADA por
// spread (`{ ...campos }`), que é como `derivarCampos` e a edição manual da tela
// Gerar propagam os campos; e agora ela também sobrevive a `structuredClone`, a
// `JSON.parse(JSON.stringify(...))` e ao round-trip do jsonb.

/** Chave reservada com o TIPO da entidade de origem. Escrita só por `comOrigem`. */
export const CHAVE_ORIGEM_TIPO = '__motorOrigemTipo';
/** Chave reservada com o ID do registro de origem. Escrita só por `comOrigem`. */
export const CHAVE_ORIGEM_ID = '__motorOrigemId';

/**
 * Onde os snapshots ANTERIORES a esta migração gravavam a identidade: um campo
 * `id` avulso, publicado à mão por `mapearPessoa` e `mapearSociedade` (e por
 * mais ninguém — daí a frente). Continua sendo lido, nunca escrito: é o único
 * fio de identidade que a peça já registrada tem, e reescrevê-la seria alterar o
 * que o documento diz que disse.
 */
const CHAVE_ID_LEGADA = 'id';

export interface OrigemValor {
  /** Tipo da entidade de origem ('pessoa', 'sociedade'…). O engine não interpreta — quem decide o que é clicável é a UI. */
  tipo: string;
  /** Id do registro no cadastro. */
  id: string;
}

/** Anexa a origem ao objeto de campos (mutação proposital: o objeto segue sendo o mesmo Campos). */
export function comOrigem<T extends object>(campos: T, origem: OrigemValor): T {
  const alvo = campos as Record<string, unknown>;
  alvo[CHAVE_ORIGEM_TIPO] = origem.tipo;
  alvo[CHAVE_ORIGEM_ID] = origem.id;
  return campos;
}

/** Lê a origem de qualquer valor do contexto; undefined se não for objeto ou não tiver. */
export function origemDe(valor: unknown): OrigemValor | undefined {
  if (valor === null || typeof valor !== 'object') return undefined;
  const obj = valor as Record<string, unknown>;
  const tipo = obj[CHAVE_ORIGEM_TIPO];
  const id = obj[CHAVE_ORIGEM_ID];
  if (typeof tipo !== 'string' || typeof id !== 'string') return undefined;
  if (!tipo.trim() || !id.trim()) return undefined;
  return { tipo, id };
}

/**
 * O id do registro por trás de um objeto de campos, para quem só precisa da
 * IDENTIDADE e não do tipo — a comparação da alteração contratual, o baseline da
 * peça, o casamento de administrador com sócio.
 *
 * Aceita o `id` legado justamente porque o acervo depende dele: peça registrada
 * antes desta migração não tem as chaves novas e não vai ganhá-las nunca (ver
 * `CHAVE_ID_LEGADA`). Snapshot novo responde pela chave nova; snapshot antigo,
 * pelo que tiver.
 */
export function idDoRegistro(valor: unknown): string | null {
  const origem = origemDe(valor);
  if (origem) return origem.id;
  if (valor === null || typeof valor !== 'object') return null;
  const legado = (valor as Record<string, unknown>)[CHAVE_ID_LEGADA];
  return typeof legado === 'string' && legado.trim() ? legado : null;
}

/** Percorre em profundidade, uma vez por objeto (o WeakSet barra ciclos: o `refItem` das integralizações). */
function percorrer(raiz: unknown, visitar: (obj: Record<string, unknown>) => void): void {
  const vistos = new WeakSet<object>();
  const descer = (valor: unknown) => {
    if (valor === null || typeof valor !== 'object') return;
    if (vistos.has(valor)) return;
    vistos.add(valor);
    if (Array.isArray(valor)) {
      for (const item of valor) descer(item);
      return;
    }
    const obj = valor as Record<string, unknown>;
    visitar(obj);
    for (const item of Object.values(obj)) descer(item);
  };
  descer(raiz);
}

/**
 * Religa a origem de `destino` a partir de `fonte`, CASANDO POR ID.
 *
 * Só serve ao acervo. Um snapshot gravado depois desta migração já carrega a
 * própria origem (é uma chave do jsonb), e esta função não tem o que fazer nele;
 * um snapshot ANTERIOR chega com o `id` legado nas pessoas e na sociedade, e é
 * por ele que a origem dos dados VIVOS é reconhecida e carimbada — devolvendo o
 * valor clicável na prévia sem tocar no texto congelado.
 *
 * Casava por ÍNDICE, "copiando o que casa e ignorando o resto onde as formas
 * divergirem": duas listas de tamanhos diferentes (o cadastro mudou desde a
 * validação) alinhavam sócio com sócio errado e carimbavam a origem de outra
 * pessoa. Com a identidade dentro do objeto, a forma das duas estruturas deixou
 * de importar.
 *
 * Id ambíguo na fonte (o mesmo registro publicado como dois tipos — `pessoa` e
 * `sociedade` saem da MESMA tabela) não carimba nada: sem o tipo, escolher seria
 * adivinhar. Mutação proposital e idempotente.
 */
export function copiarOrigemProfunda(destino: unknown, fonte: unknown): void {
  const porId = new Map<string, OrigemValor | null>();
  percorrer(fonte, (obj) => {
    const origem = origemDe(obj);
    if (!origem) return;
    const anterior = porId.get(origem.id);
    if (anterior === undefined) porId.set(origem.id, origem);
    else if (anterior !== null && anterior.tipo !== origem.tipo) porId.set(origem.id, null);
  });
  if (porId.size === 0) return;
  percorrer(destino, (obj) => {
    if (origemDe(obj)) return;
    const id = idDoRegistro(obj);
    const origem = id ? porId.get(id) : undefined;
    if (origem) comOrigem(obj, origem);
  });
}
