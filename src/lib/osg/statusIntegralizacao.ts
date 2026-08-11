// Status de integralização do bem: a lista canônica de valores e — o que
// realmente importa — QUAIS deles levam o bem para o documento gerado.
//
// Antes, o conceito morava em dois lugares que não se falavam: o array literal
// de status no formulário do bem e o filtro `.eq('status_integralizacao',
// 'Aprovado')` da query de geração. Bem gravado como "Aprovado para 2ª
// Instancia" (ou "Integralizado") sumia do contrato sem que a tela dissesse por
// quê.
//
// REGRA DE MANUTENÇÃO: para incluir ou tirar um status do documento, mexa
// APENAS em STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO. Nenhuma query precisa ser
// editada — quem pergunta "esse bem entra no documento?" pergunta aqui, e a
// tela deriva daqui o aviso que mostra ao consultor.
//
// PENDENTE DE DECISÃO DO TIME: se 'Integralizado' entra no conjunto (bem já
// integralizado em ato anterior, que uma alteração contratual ainda precisa
// descrever) ou se o vocabulário do status precisa mudar. Entrar = descomentar
// UMA linha abaixo; nada mais no código muda.

export const STATUS_INTEGRALIZACAO = [
  'Pendente',
  'Em análise',
  'Aprovado',
  'Aprovado para 2ª Instancia',
  'Integralizado',
  'Recusado',
  'Não se aplica',
] as const;

export type StatusIntegralizacao = (typeof STATUS_INTEGRALIZACAO)[number];

/** Os status que fazem o bem entrar no documento gerado. Fonte única. */
export const STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO: readonly StatusIntegralizacao[] = [
  'Aprovado',
  'Aprovado para 2ª Instancia',
  // 'Integralizado', // ← pendente de decisão do time (ver cabeçalho)
];

/** "Esse bem entra no documento?" — o predicado nomeado, usado por query e tela. */
export function statusLevaBemAoDocumento(status: string | null | undefined): boolean {
  return !!status && (STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO as readonly string[]).includes(status);
}

/**
 * Frase que a tela mostra no próprio campo de status, para o consultor saber
 * antes de gerar (e não quando o contrato sai vazio) o que o status decide.
 */
export const AVISO_STATUS_ELEGIVEIS = `Levam o bem para o documento gerado: ${
  STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO.join(' · ')
}.`;
