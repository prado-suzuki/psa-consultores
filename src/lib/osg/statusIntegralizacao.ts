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
// DECIDIDO (D5 de docs/planos/derivacao-de-eventos-e-carimbo.md, 27/08/2026):
// 'Integralizado' fica FORA do conjunto, e a exclusão passou a ser automática —
// registrar a peça na junta carimba o ledger e vira o status dos bens daqueles
// movimentos (ver useFormalizarMovimentos). Bem que este ato consumiu sai da lista
// sozinho, sem ninguém editar cadastro, e não é descrito duas vezes na peça
// seguinte. A chave é o `bem_id` do movimento carimbado, nunca "os aprovados da
// empresa" (D6).

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
  // 'Integralizado' NÃO entra: é o estado de quem já foi levado a uma peça
  // registrada, e o flip é automático no registro (ver cabeçalho).
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
