/**
 * Regras de encerramento de chamado.
 *
 * Desenho decidido em 07/08/2026, depois de 3 chamados ficarem com pergunta de
 * cliente sem tratativa (um deles por 85 dias):
 *
 * - o analista marca `resolvido`; ele NÃO fecha o chamado à mão
 * - o sistema fecha (`fechado`) após 3 dias corridos sem nenhuma mensagem nova
 * - resposta do cliente dentro da janela devolve o chamado para `em_andamento`
 *   (trigger no banco), o que o traz de volta para a fila e para o sino
 * - em `fechado` o cliente não escreve mais: abre chamado novo
 *
 * Consequência para o código: `fechado` é o ÚNICO estado terminal. `resolvido`
 * deixou de ser fim de conversa e passou a ser intermediário, com relógio
 * rodando. Quem tratar os dois como equivalentes volta a esconder resposta de
 * cliente.
 */

/** Espelha o intervalo usado em `fechar_chamados_resolvidos_sem_resposta()` no banco. */
export const DIAS_ATE_FECHAMENTO_AUTOMATICO = 3;

/**
 * Encerrado de fato: não aceita mais mensagem de cliente.
 * Deliberadamente NÃO inclui `resolvido` — ver doc do módulo.
 */
export function isChamadoEncerrado(status: string | null | undefined): boolean {
  return status === 'fechado';
}

/** O cliente pode escrever (mensagem ou anexo) neste chamado? */
export function clientePodeResponder(status: string | null | undefined): boolean {
  return !isChamadoEncerrado(status);
}

/**
 * A equipe pode escolher este status no seletor?
 * `fechado` é decisão do sistema, não do analista.
 */
export function equipePodeSelecionarStatus(status: string): boolean {
  return status !== 'fechado';
}

/** Respondido e aguardando o cliente, com o relógio do fechamento rodando. */
export function isJanelaDeAceite(status: string | null | undefined): boolean {
  return status === 'resolvido';
}

// ── Textos ────────────────────────────────────────────────────
// Cliente: registro formal, sem termo interno. Não afirma "fechado
// automaticamente" porque os 340 chamados encerrados antes desta mudança foram
// fechados à mão — a frase seria falsa para eles.

export const AVISO_CHAMADO_ENCERRADO_CLIENTE = {
  titulo: 'Este chamado está encerrado',
  descricao:
    'Não é possível enviar novas mensagens ou anexos neste chamado. '
    + 'Para tratar deste ou de qualquer outro assunto, abra um novo chamado.',
  acao: 'Abrir novo chamado',
} as const;

/**
 * Tooltip da opção "Fechado" no seletor da equipe. Aqui a menção aos 3 dias é
 * correta: descreve a regra vigente, não o histórico de um chamado específico.
 */
export const TOOLTIP_FECHADO_INDISPONIVEL =
  `O encerramento é automático: o sistema fecha o chamado após ${DIAS_ATE_FECHAMENTO_AUTOMATICO} `
  + 'dias corridos sem resposta do cliente. Ao responder, marque "Resolvido" — '
  + 'se o cliente voltar a escrever, o chamado retorna para "Em andamento".';
