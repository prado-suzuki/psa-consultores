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

export type RecusaCategoria = 'permissao' | 'falha' | 'zero_linhas';

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
  if (categoria === 'permissao') {
    return [
      `Você não tem permissão para ${fragmento(op, 'permissao')}.`,
      `É necessário ter o papel de ${ROLE_LABEL[papel ?? PAPEL_PADRAO]} ou superior para realizar esta ação.`,
    ].join('\n');
  }
  const fecho = categoria === 'zero_linhas' ? FECHO_ZERO_LINHAS : fechoDaFalha(op, false);
  return [`Não foi possível ${fragmento(op, 'falha')}.`, fecho].join('\n');
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

/**
 * Em qual categoria a recusa cai.
 *
 * "Permissão" só quando o sistema SABE: o precheck respondeu que a policy
 * barra, ou o banco devolveu o código de privilégio insuficiente. Nada de
 * procurar palavra em inglês na mensagem — era isso que rebaixava toda frase
 * escrita em português (B2) e prometia cargo para quem já tinha o cargo.
 *
 * `grant_missing` fica de fora de propósito: o precheck usa esse motivo também
 * quando a própria chamada falhou (rede, função ausente), e aí não há
 * confirmação de que o motivo foi permissão.
 */
export function categoriaDaRecusa(
  error: unknown,
  opcoes?: { zeroLinhas?: boolean },
): RecusaCategoria {
  if (error instanceof RlsPrecheckError) {
    const motivo = error.resultado.reason;
    if (motivo === 'rls_blocked') return 'permissao';
    // Linha que não existe mais é o mesmo caso de "os dados podem ter sido
    // modificados" — quem removeu foi outra pessoa, ou outra aba.
    if (motivo === 'row_not_found') return 'zero_linhas';
    return 'falha';
  }
  if (codigoDoErro(error) === '42501') return 'permissao';
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
  readonly detalheTecnico: string | null;

  constructor(
    operacao: CadastroOperacao,
    categoria: RecusaCategoria,
    papel: RlsRequiredRole | null,
    detalheTecnico: string | null,
  ) {
    super(mensagemDeRecusa(operacao, categoria, papel));
    this.name = 'RecusaDeOperacao';
    this.operacao = operacao;
    this.categoria = categoria;
    this.papel = papel;
    this.detalheTecnico = detalheTecnico;
  }
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
  const detalhe = [extractErrorMessage(error), codigo].filter(Boolean).join(' · ') || null;
  return new RecusaDeOperacao(operacao, categoria, papelDaRecusa(error), detalhe);
}

/**
 * A mensagem final do "Salvar cliente" quando uma etapa falhou.
 *
 * As 24 operações são etapas de um salvamento só, então não há aviso
 * intermediário: a frase de cada item serve para NOMEAR a etapa que falhou.
 */
export function mensagemDoSalvamentoRecusado(recusa: RecusaDeOperacao): string {
  const abertura = 'Não foi possível salvar o cliente.';
  if (recusa.categoria === 'permissao') {
    return [abertura, mensagemDeRecusa(recusa.operacao, 'permissao', recusa.papel)].join('\n');
  }
  const fecho =
    recusa.categoria === 'zero_linhas'
      ? FECHO_ZERO_LINHAS
      : fechoDaFalha(recusa.operacao, true);
  return [abertura, `Ocorreu um problema ao ${fragmento(recusa.operacao, 'falha')}. ${fecho}`].join('\n');
}
