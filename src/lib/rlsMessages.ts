export type RlsPrecheckReason =
  | 'rls_blocked'
  | 'grant_missing'
  | 'trigger_blocked'
  | 'row_not_found';

export type RlsRequiredRole =
  | 'team_member'
  | 'sublider'
  | 'lider'
  | 'admin';

export interface RlsPrecheckResult {
  allowed: boolean;
  reason?: RlsPrecheckReason | null;
  required_role?: RlsRequiredRole | null;
  message?: string | null;
}

const ROLE_LABEL: Record<RlsRequiredRole, string> = {
  team_member: 'Membro de equipe',
  sublider: 'Sublíder',
  lider: 'Líder',
  admin: 'Admin',
};

export function rlsMessage(r: RlsPrecheckResult): string {
  if (r.reason === 'trigger_blocked' && r.message) return r.message;
  if (r.reason === 'grant_missing') return 'Operação não permitida para o seu perfil.';
  if (r.reason === 'row_not_found') return 'Registro não encontrado ou já removido.';
  if (r.reason === 'rls_blocked' && r.required_role) {
    return `Você precisa do papel "${ROLE_LABEL[r.required_role]}" ou superior para realizar essa ação.`;
  }
  return 'Você não tem permissão para realizar essa ação.';
}

/**
 * Extrai a mensagem de um erro qualquer.
 * Cobre `Error`, objetos simples do supabase-js (`{ message, code, details, hint }`)
 * e strings. Retorna null quando não há mensagem utilizável.
 */
export function extractErrorMessage(error: unknown): string | null {
  let raw: unknown = null;

  if (typeof error === 'string') {
    raw = error;
  } else if (error instanceof Error) {
    raw = error.message;
  } else if (error && typeof error === 'object' && 'message' in error) {
    raw = (error as { message?: unknown }).message;
  }

  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const TASK_SAVE_FALLBACK = 'Não foi possível salvar a tarefa. Tente novamente.';

const TEAM_MEMBER_STATUS_ONLY_MESSAGE =
  'Esta tarefa foi criada por outra pessoa. Você pode alterar status, horas e revisor. ' +
  'Título, descrição e os demais campos só quem criou a tarefa pode mudar.';

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Mensagem a exibir ao usuário quando o save de tarefa falha.
 * Traduz o bloqueio do trigger `org_tasks_team_member_status_only` (RLS-06)
 * e preserva qualquer outra mensagem do banco.
 */
export function taskSaveErrorMessage(
  error: unknown,
  options?: { prefix?: string },
): string {
  const message = extractErrorMessage(error);
  if (!message) return TASK_SAVE_FALLBACK;

  if (normalizeForMatch(message).includes('so pode alterar status')) {
    return TEAM_MEMBER_STATUS_ONLY_MESSAGE;
  }

  return options?.prefix ? `${options.prefix}${message}` : message;
}

/**
 * Recusa vinda do precheck, com o motivo preservado.
 *
 * `assertCanPerform` lançava um `Error` só com a frase. Quem trata a falha lá
 * na frente precisa do MOTIVO para escolher a categoria da mensagem — sem ele
 * sobra adivinhar procurando palavra no texto, que é o defeito que a tarefa das
 * mensagens de recusa fecha. A `message` continua a mesma de antes, então quem
 * já tratava o erro como `Error` não muda.
 */
export class RlsPrecheckError extends Error {
  readonly resultado: RlsPrecheckResult;

  constructor(resultado: RlsPrecheckResult) {
    super(rlsMessage(resultado));
    this.name = 'RlsPrecheckError';
    this.resultado = resultado;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Cadastro de cliente — catálogo das mensagens de recusa
 *
 * Texto fechado em 02/09/2026; as tabelas A, B e C de
 * `docs/sprints/sprint-12/TAREFA_mensagens-de-recusa.md` são a fonte.
 *
 * Toda frase que a pessoa lê é montada aqui, a partir de um fragmento por
 * item/ação: é o que permite ao teste comparar célula a célula e o que impede
 * duas fontes para a mesma frase. Nome de tabela, código do Postgres, nome de
 * RPC e identificador interno não entram no texto — vão para o `console.error`.
 * ────────────────────────────────────────────────────────────────────────── */

export type CadastroItem =
  | 'cliente'
  | 'cluster'
  | 'contribuinte'
  | 'inscricao'
  | 'representante'
  | 'os'
  | 'rateio'
  | 'produto';

export type CadastroAcao = 'cadastrar' | 'atualizar' | 'excluir';

export type RecusaCategoria = 'permissao' | 'regra' | 'falha' | 'zero_linhas';

export interface CadastroOperacao {
  item: CadastroItem;
  acao: CadastroAcao;
  /** Número da OS, para as frases que o citam. Na falta, "(sem número)". */
  numeroOs?: string | null;
}

const FECHO_SUPORTE = 'Tente novamente. Se o problema continuar, entre em contato com o suporte.';
const FECHO_ATUALIZE = 'Atualize os dados e tente novamente.';
const FECHO_ZERO_LINHAS = 'Os dados podem ter sido modificados. Atualize a página e tente novamente.';
/** Dentro do salvamento do cliente a orientação é mais curta (T4 da tarefa). */
const FECHO_SUPORTE_NO_SALVAMENTO = 'Tente novamente.';

/** Papel exigido para gravar no módulo, quando o banco não disse qual. */
const PAPEL_PADRAO: RlsRequiredRole = 'sublider';

/**
 * A escrita no cadastro de cliente já é decidida só por cargo em produção?
 *
 * Enquanto for `false`, uma recusa crua de permissão (código do Postgres, sem o
 * precheck dizendo o papel) **ainda pode ser por cluster** — as tarefas 1 a 3 da
 * sprint 12 é que fecham isso. Nesse estado a frase não afirma cargo: cai em
 * Falha, porque prometer "papel de Sublíder" a quem já é sublíder é pior do que
 * não explicar. Virar `true` quando as três migrações estiverem em produção.
 */
const RECUSA_DE_ESCRITA_E_SO_POR_CARGO = false;

interface CelulaCatalogo {
  /** Fragmento `{ação} {item}` da Falha e da Zero linhas: "atualizar a OS {numero}". */
  falha: string;
  /** Fragmento da Permissão, no demonstrativo: "atualizar esta inscrição estadual". */
  permissao: string;
  /** Só as duas células que orientam a recarregar em vez de acionar o suporte. */
  fecho?: 'atualize';
  /**
   * Aviso de sucesso. Preenchido só onde alguma tela mostra — as demais
   * operações são etapas do "Salvar cliente", que avisa uma vez no fim, e
   * constante sem consumidor é detrito (D3 da tarefa).
   */
  sucesso?: string;
}

type ChaveCatalogo = `${CadastroItem}/${CadastroAcao}`;

const CATALOGO: Partial<Record<ChaveCatalogo, CelulaCatalogo>> = {
  'cliente/cadastrar': {
    falha: 'cadastrar o cliente',
    permissao: 'cadastrar este cliente',
    sucesso: 'Cliente cadastrado com sucesso.',
  },
  'cliente/atualizar': {
    falha: 'atualizar o cliente',
    permissao: 'atualizar este cliente',
    sucesso: 'Cliente atualizado com sucesso.',
  },
  'cliente/excluir': {
    falha: 'desfazer o cadastro do cliente',
    permissao: 'excluir este cliente',
    sucesso: 'Cadastro do cliente desfeito com sucesso.',
  },
  'cluster/cadastrar': {
    falha: 'vincular o cluster ao cliente',
    permissao: 'vincular este cluster ao cliente',
  },
  'cluster/excluir': {
    falha: 'remover o cluster do cliente',
    permissao: 'remover este cluster do cliente',
  },
  'contribuinte/cadastrar': {
    falha: 'cadastrar o contribuinte',
    permissao: 'cadastrar este contribuinte',
  },
  'contribuinte/atualizar': {
    falha: 'atualizar o contribuinte',
    permissao: 'atualizar este contribuinte',
  },
  'contribuinte/excluir': {
    falha: 'excluir o contribuinte',
    permissao: 'excluir este contribuinte',
  },
  'inscricao/cadastrar': {
    falha: 'cadastrar a inscrição estadual',
    permissao: 'cadastrar esta inscrição estadual',
  },
  'inscricao/atualizar': {
    falha: 'atualizar a inscrição estadual',
    permissao: 'atualizar esta inscrição estadual',
  },
  'inscricao/excluir': {
    falha: 'excluir a inscrição estadual',
    permissao: 'excluir esta inscrição estadual',
  },
  'representante/cadastrar': {
    falha: 'cadastrar o representante',
    permissao: 'cadastrar este representante',
  },
  'representante/atualizar': {
    falha: 'atualizar o representante',
    permissao: 'atualizar este representante',
  },
  'representante/excluir': {
    falha: 'excluir o representante',
    permissao: 'excluir este representante',
  },
  'os/cadastrar': {
    falha: 'cadastrar a ordem de serviço',
    permissao: 'cadastrar esta ordem de serviço',
  },
  'os/atualizar': {
    falha: 'atualizar a OS {numero}',
    permissao: 'atualizar a OS {numero}',
    fecho: 'atualize',
  },
  'os/excluir': {
    falha: 'excluir a OS {numero}',
    permissao: 'excluir a OS {numero}',
  },
  'rateio/cadastrar': {
    falha: 'cadastrar o rateio de receita',
    permissao: 'cadastrar este rateio de receita',
  },
  'rateio/atualizar': {
    falha: 'atualizar o rateio de receita da OS {numero}',
    permissao: 'atualizar este rateio de receita',
    fecho: 'atualize',
  },
  'rateio/excluir': {
    falha: 'excluir o rateio de receita',
    permissao: 'excluir este rateio de receita',
  },
  'produto/cadastrar': {
    falha: 'adicionar o produto à OS',
    permissao: 'adicionar este produto à OS',
  },
  'produto/atualizar': {
    falha: 'atualizar o produto contratado',
    permissao: 'atualizar este produto contratado',
  },
  'produto/excluir': {
    falha: 'excluir o produto contratado',
    permissao: 'excluir este produto contratado',
  },
};

/**
 * Regra de negócio que a pessoa consegue corrigir.
 *
 * Terceira categoria, decidida em 02/09/2026: quando a recusa é uma regra
 * conhecida, esconder o motivo atrás de "Não foi possível cadastrar o cliente"
 * tira dela justamente a informação necessária para agir. A frase que aparece é
 * a daqui — curada — e não a do banco, que cita nome de tabela e identificador
 * interno.
 */
export interface RegraDeNegocio {
  titulo: string;
  detalhe: string;
}

/**
 * As regras do cadastro que hoje chegam ao usuário, conferidas no schema de
 * produção em 02/09/2026.
 *
 * `constraints` casa pelo nome da constraint, que vem na frase do PostgREST —
 * é o casamento firme. `frases` casa por trecho, e serve para o que sai de um
 * `RAISE EXCEPTION` nosso: são frases das nossas próprias funções, não texto do
 * Postgres em inglês. Sem casamento, a recusa cai em Falha — degrada, não
 * mente.
 */
const REGRAS_DE_NEGOCIO: Array<{
  constraints?: string[];
  frases?: string[];
  texto: RegraDeNegocio;
}> = [
  {
    // `criar_cliente_com_clusters` na criação; `enforce_cliente_tem_cluster`
    // (gatilho DEFERRED) na edição. Mesma regra, dois caminhos.
    frases: ['selecione ao menos 1 cluster', 'precisa estar vinculado a pelo menos 1 cluster'],
    texto: {
      titulo: 'É necessário informar pelo menos um cluster.',
      detalhe: 'Selecione um cluster para o cliente e salve novamente.',
    },
  },
  {
    frases: ['nao e possivel remover o ultimo cluster'],
    texto: {
      // Feedback da ação, não enunciado da regra: o que a pessoa precisa saber
      // é a consequência de remover este vínculo.
      titulo: 'O cliente precisa permanecer vinculado a pelo menos um cluster.',
      detalhe: 'Vincule outro cluster antes de remover este.',
    },
  },
  // As duas duplicidades usam a mesma construção de propósito — "já está
  // vinculado" + "remova o item duplicado" —, para não pedir interpretação
  // diferente de uma para a outra.
  {
    constraints: ['unique_cliente_cluster'],
    texto: {
      titulo: 'Este cluster já está vinculado ao cliente.',
      detalhe: 'Remova o item duplicado e salve novamente.',
    },
  },
  {
    // B5: a única recusa só no último passo, depois de tudo gravado. A tela
    // deveria impedir antes de salvar — isso continua sendo tarefa própria.
    constraints: ['os_produtos_contratados_ordem_servico_id_produto_segmento_i_key'],
    texto: {
      titulo: 'Este produto já está vinculado à OS.',
      detalhe: 'Remova o item duplicado e salve novamente.',
    },
  },
];

/** Códigos em que vale procurar regra: check, unicidade e `RAISE EXCEPTION` nosso. */
const CODIGOS_DE_REGRA = ['23514', '23505', 'P0001'];

/**
 * Recusas de permissão em que o motivo **é** o cargo, com certeza.
 *
 * `criar_cliente_com_clusters` é SECURITY DEFINER e o único 42501 que ela
 * levanta é o teste de `has_role_or_higher(sublider)` — conferido no schema de
 * produção em 02/09/2026. Logo aqui não se está adivinhando causa: é a recusa
 * de cargo, e é justamente a que barrou o cadastro em 01/09.
 *
 * Fora desta lista, permissão só quando o precheck disser o papel.
 */
const RECUSAS_DE_CARGO_CONHECIDAS = ['sem permissao para cadastrar cliente'];

function ehRecusaDeCargoConhecida(error: unknown): boolean {
  if (codigoDoErro(error) !== '42501') return false;
  const alvo = normalizeForMatch(extractErrorMessage(error) ?? '');
  return RECUSAS_DE_CARGO_CONHECIDAS.some(frase => alvo.includes(frase));
}

/**
 * A regra de negócio por trás da recusa, quando é uma conhecida.
 *
 * Procurar trecho de texto é o que rebaixava as mensagens em português (B2), mas
 * aqui o casamento é **aditivo** e sobre frase nossa: se ele não acertar, a
 * recusa vira Falha; nunca vira uma causa inventada.
 */
export function regraDeNegocioDaRecusa(error: unknown): RegraDeNegocio | null {
  const ehGatilho = error instanceof RlsPrecheckError && error.resultado.reason === 'trigger_blocked';
  const codigo = codigoDoErro(error);
  if (!ehGatilho && !(codigo && CODIGOS_DE_REGRA.includes(codigo))) return null;

  const bruto = [extractErrorMessage(error), detalheDoErro(error)].filter(Boolean).join(' ');
  const alvo = normalizeForMatch(bruto);
  if (!alvo) return null;

  for (const regra of REGRAS_DE_NEGOCIO) {
    if ((regra.constraints ?? []).some(nome => alvo.includes(normalizeForMatch(nome)))) return regra.texto;
    if ((regra.frases ?? []).some(frase => alvo.includes(normalizeForMatch(frase)))) return regra.texto;
  }
  return null;
}

/** Operação sem célula no catálogo (cluster não se atualiza) cai no genérico. */
const FRAGMENTO_GENERICO = { falha: 'concluir a alteração', permissao: 'realizar esta ação' };

function celula(op: CadastroOperacao): CelulaCatalogo | undefined {
  return CATALOGO[`${op.item}/${op.acao}` as ChaveCatalogo];
}

function fragmento(op: CadastroOperacao, campo: 'falha' | 'permissao'): string {
  const texto = celula(op)?.[campo] ?? FRAGMENTO_GENERICO[campo];
  const numero = (op.numeroOs || '').trim() || '(sem número)';
  return texto.replace('{numero}', numero);
}

/** Fecho da categoria Falha: só duas células mandam recarregar em vez de acionar o suporte. */
function fechoDaFalha(op: CadastroOperacao, noSalvamento: boolean): string {
  if (celula(op)?.fecho === 'atualize') return FECHO_ATUALIZE;
  return noSalvamento ? FECHO_SUPORTE_NO_SALVAMENTO : FECHO_SUPORTE;
}

/**
 * A recusa em duas partes: o que aconteceu e o que fazer agora.
 *
 * Separado porque o toast tem slot próprio para a segunda parte — num texto só,
 * com `\n`, as duas frases apareceriam coladas na mesma linha.
 */
export interface TextoDeRecusa {
  /** O que aconteceu, em qual item. */
  titulo: string;
  /** O que a pessoa deve fazer agora. */
  detalhe: string;
}

export function textoDeRecusa(
  op: CadastroOperacao,
  categoria: RecusaCategoria,
  papel?: RlsRequiredRole | null,
): TextoDeRecusa {
  if (categoria === 'permissao') {
    return {
      titulo: `Você não tem permissão para ${fragmento(op, 'permissao')}.`,
      detalhe: `É necessário ter o papel de ${ROLE_LABEL[papel ?? PAPEL_PADRAO]} ou superior para realizar esta ação.`,
    };
  }
  return {
    titulo: `Não foi possível ${fragmento(op, 'falha')}.`,
    detalhe: categoria === 'zero_linhas' ? FECHO_ZERO_LINHAS : fechoDaFalha(op, false),
  };
}

/**
 * A frase que a pessoa lê quando uma operação do cadastro é recusada.
 *
 * Responde às três perguntas da tarefa, nesta ordem: o que aconteceu, em qual
 * item, o que fazer agora.
 */
export function mensagemDeRecusa(
  op: CadastroOperacao,
  categoria: RecusaCategoria,
  papel?: RlsRequiredRole | null,
): string {
  const { titulo, detalhe } = textoDeRecusa(op, categoria, papel);
  return [titulo, detalhe].join('\n');
}

/** Aviso de sucesso da operação, quando ela tem salvamento próprio. */
export function mensagemDeSucesso(op: CadastroOperacao): string | null {
  const texto = celula(op)?.sucesso;
  if (!texto) return null;
  return texto.replace('{numero}', (op.numeroOs || '').trim() || '(sem número)');
}

function codigoDoErro(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return null;
}

/** `details` e `hint` do PostgREST: é onde o nome da constraint costuma vir. */
function detalheDoErro(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const campos = ['details', 'hint'] as const;
  const partes = campos
    .map(campo => (error as Record<string, unknown>)[campo])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  return partes.length > 0 ? partes.join(' ') : null;
}

/**
 * Em qual categoria a recusa cai.
 *
 * Três coisas diferentes, nesta ordem de prioridade:
 *
 * 1. **Regra de negócio conhecida** — tem frase curada e acionável.
 * 2. **Permissão por cargo confirmada** — o precheck disse qual papel falta.
 *    Só isso conta como confirmação: enquanto a escrita puder ser barrada por
 *    cluster (ver `RECUSA_DE_ESCRITA_E_SO_POR_CARGO`), um código de permissão
 *    cru não diz que a causa é cargo, e afirmar cargo seria mentir.
 * 3. **Falha** — causa técnica ou desconhecida.
 *
 * Nada de procurar palavra em inglês na mensagem: era isso que rebaixava toda
 * frase escrita em português (B2). `grant_missing` fica de fora de propósito —
 * o precheck usa esse motivo também quando a própria chamada dele falhou (rede,
 * função ausente), e aí não se sabe se havia permissão.
 */
export function categoriaDaRecusa(
  error: unknown,
  opcoes?: { zeroLinhas?: boolean },
): RecusaCategoria {
  if (regraDeNegocioDaRecusa(error)) return 'regra';

  if (error instanceof RlsPrecheckError) {
    const { reason, required_role } = error.resultado;
    if (reason === 'rls_blocked' && required_role) return 'permissao';
    // Linha que não existe mais é o mesmo caso de "os dados podem ter sido
    // modificados" — quem removeu foi outra pessoa, ou outra aba.
    if (reason === 'row_not_found') return 'zero_linhas';
    return 'falha';
  }
  if (ehRecusaDeCargoConhecida(error)) return 'permissao';
  if (codigoDoErro(error) === '42501' && RECUSA_DE_ESCRITA_E_SO_POR_CARGO) return 'permissao';
  return opcoes?.zeroLinhas ? 'zero_linhas' : 'falha';
}

/** Papel exigido, quando o banco disse qual. */
function papelDaRecusa(error: unknown): RlsRequiredRole | null {
  if (error instanceof RlsPrecheckError) return error.resultado.required_role ?? null;
  return null;
}

/**
 * Recusa de uma operação do cadastro de cliente, já traduzida.
 *
 * `message` é o texto que pode ser mostrado como está; `detalheTecnico` guarda
 * a frase crua do banco para o `console.error`.
 */
export class RecusaDeOperacao extends Error {
  readonly operacao: CadastroOperacao;
  readonly categoria: RecusaCategoria;
  readonly papel: RlsRequiredRole | null;
  /** Preenchida só quando a categoria é `regra`. */
  readonly regra: RegraDeNegocio | null;
  readonly detalheTecnico: string | null;

  constructor(
    operacao: CadastroOperacao,
    categoria: RecusaCategoria,
    papel: RlsRequiredRole | null,
    detalheTecnico: string | null,
    regra: RegraDeNegocio | null = null,
  ) {
    super(mensagemDaRecusa({ operacao, categoria, papel, regra }));
    this.name = 'RecusaDeOperacao';
    this.operacao = operacao;
    this.categoria = categoria;
    this.papel = papel;
    this.regra = regra;
    this.detalheTecnico = detalheTecnico;
  }
}

interface RecusaClassificada {
  operacao: CadastroOperacao;
  categoria: RecusaCategoria;
  papel?: RlsRequiredRole | null;
  regra?: RegraDeNegocio | null;
}

/** O que a pessoa lê, para uma recusa já classificada. */
export function textoDaRecusa(recusa: RecusaClassificada): TextoDeRecusa {
  if (recusa.categoria === 'regra' && recusa.regra) return recusa.regra;
  return textoDeRecusa(recusa.operacao, recusa.categoria, recusa.papel);
}

/** A mesma frase em texto único — é o que vai no `Error.message`. */
function mensagemDaRecusa(recusa: RecusaClassificada): string {
  const { titulo, detalhe } = textoDaRecusa(recusa);
  return [titulo, detalhe].join('\n');
}

/**
 * Monta a recusa a partir do que o banco devolveu.
 *
 * `zeroLinhas` é para o caso sem erro nenhum: a operação devia alterar ou
 * excluir um registro e não afetou nenhum. Isso nunca é sucesso.
 */
export function recusaDeOperacao(
  operacao: CadastroOperacao,
  error?: unknown,
  opcoes?: { zeroLinhas?: boolean },
): RecusaDeOperacao {
  if (error instanceof RecusaDeOperacao) return error;
  const categoria = categoriaDaRecusa(error, opcoes);
  const codigo = codigoDoErro(error);
  const detalhe =
    [extractErrorMessage(error), detalheDoErro(error), codigo].filter(Boolean).join(' · ') || null;
  return new RecusaDeOperacao(
    operacao,
    categoria,
    papelDaRecusa(error),
    detalhe,
    regraDeNegocioDaRecusa(error),
  );
}

/**
 * A mensagem final do "Salvar cliente" quando uma etapa falhou.
 *
 * As 24 operações são etapas de um salvamento só, então não há aviso
 * intermediário: a frase de cada item serve para NOMEAR a etapa que falhou.
 */
export function textoDoSalvamentoRecusado(recusa: RecusaDeOperacao): TextoDeRecusa {
  const titulo = 'Não foi possível salvar o cliente.';
  if (recusa.categoria === 'permissao' || recusa.categoria === 'regra') {
    const dentro = textoDaRecusa(recusa);
    // As duas frases viram um parágrafo só: a primeira linha do aviso é a de
    // que o salvamento inteiro não aconteceu. No caso de regra de negócio, o
    // motivo acionável fica logo abaixo, sem passar pelo genérico.
    return { titulo, detalhe: `${dentro.titulo} ${dentro.detalhe}` };
  }
  const fecho =
    recusa.categoria === 'zero_linhas'
      ? FECHO_ZERO_LINHAS
      : fechoDaFalha(recusa.operacao, true);
  return { titulo, detalhe: `Ocorreu um problema ao ${fragmento(recusa.operacao, 'falha')}. ${fecho}` };
}

export function mensagemDoSalvamentoRecusado(recusa: RecusaDeOperacao): string {
  const { titulo, detalhe } = textoDoSalvamentoRecusado(recusa);
  return [titulo, detalhe].join('\n');
}
