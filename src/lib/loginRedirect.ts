/**
 * Resolve para qual tela de login o usuário deve ser enviado quando a sessão
 * é perdida (ou nunca existiu), com base na rota que ele tentava acessar.
 *
 * - Rotas da equipe (`/equipe/*`) → login da equipe (`/equipe`).
 * - Demais rotas (portal do cliente etc.) → login do cliente (`/auth`).
 *
 * Corrige o bug em que perder a sessão numa rota da equipe (ex.: Digital, OSG)
 * enviava o usuário para o login do cliente (`/auth`) em vez do login da
 * equipe (`/equipe`).
 */
export const TEAM_LOGIN_PATH = '/equipe';
export const CLIENT_LOGIN_PATH = '/auth';

export function resolveLoginPath(pathname: string): string {
  const isTeamRoute =
    pathname === TEAM_LOGIN_PATH || pathname.startsWith(`${TEAM_LOGIN_PATH}/`);

  return isTeamRoute ? TEAM_LOGIN_PATH : CLIENT_LOGIN_PATH;
}
