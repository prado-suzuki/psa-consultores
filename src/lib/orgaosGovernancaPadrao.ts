/**
 * Os órgãos de governança que a OSG usa como padrão.
 *
 * Confirmado pela analista de governança em 01/09/2026: estes três são o padrão
 * interno, e o cliente **acrescenta os dele** por cima. O caso real citado são os
 * gerentes, que um cliente gosta de pôr nas alçadas.
 *
 * São os mesmos três que recebem cláusula de competência no contrato social,
 * medido de forma independente no modelo `VF_Contrato Social - Governança com
 * conselho.docx`: existe "Compete à Reunião de Sócios", "Compete ao Conselho de
 * Administração" e "Compete à Diretoria", e os gerentes aparecem lá apenas como
 * objeto ("aprovar a contratação dos gerentes"), nunca como órgão com
 * competência. Duas fontes independentes, a medição e a analista, deram a mesma
 * lista.
 *
 * POR QUE AQUI E NÃO NUMA TABELA DE REFERÊNCIA. São três nomes que saem dos
 * modelos de contrato e não mudam. Uma tabela traria migration, RLS e uma tela
 * para manter, sem retorno. Isto NÃO é enum de coluna: `orgao_governanca.nome` é
 * texto livre de propósito, e esta lista é só a semente do botão. Se um dia a
 * lista virar coisa viva, promove para tabela sem mexer no schema.
 *
 * Nem todo cliente tem os três: a consultoria avisou em 20/08 que alguns não têm
 * Conselho de Administração, só Diretoria. Por isso o botão SEMEIA, e o
 * consultor apaga o que não se aplica.
 */
export interface OrgaoPadrao {
  nome: string;
  /** Todos os três recebem cláusula no contrato social. */
  entraNoContrato: boolean;
}

export const ORGAOS_GOVERNANCA_PADRAO: readonly OrgaoPadrao[] = [
  { nome: 'Reunião de Sócios', entraNoContrato: true },
  { nome: 'Conselho de Administração', entraNoContrato: true },
  { nome: 'Diretor Executivo', entraNoContrato: true },
] as const;

/** Comparação de nome de órgão: sem espaço nas pontas e sem caixa. */
export function mesmaChaveDeOrgao(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('pt-BR') === b.trim().toLocaleLowerCase('pt-BR');
}

/**
 * Quais padrões ainda faltam numa lista já cadastrada.
 *
 * O botão de semear acrescenta só o que falta, e não o pacote inteiro: assim ele
 * continua útil depois da primeira vez, e clicar duas vezes não duplica. Um botão
 * que só aparecesse com a lista vazia apareceria uma vez na vida e sumiria, sem
 * jeito de trazer de volta um padrão apagado por engano.
 */
export function padroesFaltando(nomesExistentes: readonly string[]): OrgaoPadrao[] {
  return ORGAOS_GOVERNANCA_PADRAO.filter(
    (padrao) => !nomesExistentes.some((nome) => mesmaChaveDeOrgao(nome, padrao.nome)),
  );
}

/**
 * Mensagem de erro legível para o cadastro de órgão.
 *
 * Sem isto, o `toast` mostra a mensagem crua do Postgres, do tipo
 * `duplicate key value violates unique constraint "orgao_governanca_nome_uq"`.
 * É o mesmo defeito que a criação de tarefa carregava e que apareceu na
 * validação de 31/08: erro de banco chegando à tela em vocabulário de banco.
 *
 * Traduz o que a tabela pode recusar e preserva o resto, para não engolir erro
 * desconhecido num texto genérico.
 */
export function erroDeOrgaoGovernanca(erro: unknown): string {
  const mensagem = erro instanceof Error
    ? erro.message
    : typeof erro === 'string'
      ? erro
      : (erro as { message?: string })?.message ?? '';

  if (mensagem.includes('orgao_governanca_nome_uq')) {
    return 'Este cliente já tem um órgão com esse nome.';
  }
  if (mensagem.includes('orgao_governanca_nome_ck')) {
    return 'O nome do órgão não pode ficar em branco.';
  }
  if (mensagem.includes('orgao_governanca_vigencia_ck')) {
    return 'O fim da vigência não pode ser antes do início.';
  }
  if (mensagem.includes('row-level security')) {
    return 'Você não tem permissão para alterar os órgãos deste cliente.';
  }
  return mensagem || 'Não foi possível salvar o órgão. Tente novamente.';
}
