/**
 * Como o cartão da barra lateral escolhe o nome que mostra.
 *
 * Até aqui o cartão mostrava `email.split('@')[0]` — "bi", "joana.silva" —,
 * porque não havia hook do próprio perfil e o e-mail era o único dado à mão. O
 * nome de verdade sempre esteve em `profiles`, a duas colunas de distância.
 *
 * A ordem de preferência é a que uma pessoa esperaria, e cada degrau existe por
 * um caso real: perfil recém-criado só tem `first_name` (o trigger
 * `handle_new_user` grava o sobrenome vazio quando o convite não o traz), e a
 * sessão de reautenticação pode renderizar o cartão antes de a query do perfil
 * responder. Nenhum desses estados pode deixar o cartão vazio.
 */

export interface PerfilDoNome {
  first_name?: string | null;
  last_name?: string | null;
}

/** O que aparece quando não há nem perfil nem e-mail. */
export const NOME_SEM_DONO = 'Usuário';

/**
 * Nome de exibição do usuário, na ordem: nome do perfil → parte do e-mail antes
 * do `@` → `Usuário`.
 *
 * Espaço em branco não conta como nome. `first_name` com string vazia é o que
 * um convite sem nome deixa gravado, e tratá-lo como preenchido punha o cartão
 * em branco — pior do que o pedaço do e-mail que ele mostrava antes.
 */
export function nomeDeExibicao(
  perfil: PerfilDoNome | null | undefined,
  email: string | null | undefined,
): string {
  const doPerfil = [perfil?.first_name, perfil?.last_name]
    .map((parte) => parte?.trim() ?? '')
    .filter(Boolean)
    .join(' ');

  if (doPerfil) return doPerfil;

  const doEmail = email?.split('@')[0]?.trim();

  return doEmail || NOME_SEM_DONO;
}
