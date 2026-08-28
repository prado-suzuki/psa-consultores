/**
 * O mapa entre ROTA e ESCOPO do Agente PSA.
 *
 * `escopo` é a chave estável que casa a tela com a linha de `agente_config` no
 * banco (prompt, modelo, papel mínimo). Ela mora aqui, no front, porque quem
 * conhece as rotas do app é o app — a tabela de notificações deliberadamente
 * NÃO tem coluna de rota por isso (ver a migration `agente_notificacoes`).
 *
 * Toda tela do Board tem escopo: o ícone do agente aparece ao lado do título em
 * todos os menus e submenus, e sem linha em `agente_config` a função devolveria
 * 404 e o painel abriria sem chat.
 *
 * Publicar CONTEXTO é outra coisa, e é por tela: sem
 * `useRegistrarContextoAgente`, o painel abre, mostra os avisos e alertas
 * daquela tela e diz que ainda não recebeu números para conversar. Ter escopo
 * sem contexto é estado válido — o inverso não.
 */

export interface EscopoAgente {
  escopo: string;
  /** Rota canônica do escopo — para onde o "Ver" de uma notificação leva. */
  rota: string;
  /** Como o usuário chama a tela. Espelha `agente_config.rotulo`. */
  rotulo: string;
}

/**
 * Ordem NÃO importa: a resolução usa o prefixo mais LONGO que casa, senão uma
 * sub-rota cairia no escopo do pai.
 */
export const ESCOPOS_BOARD: EscopoAgente[] = [
  { escopo: 'board.estrategico', rota: '/equipe/board/dashboard', rotulo: 'Board · Estratégico' },
  { escopo: 'board.projetos', rota: '/equipe/board/dashboard-clientes-os', rotulo: 'Board · Projetos' },
  { escopo: 'board.clientes', rota: '/equipe/board/clientes', rotulo: 'Board · Clientes' },
  { escopo: 'board.ferramentas', rota: '/equipe/board/uso-envio', rotulo: 'Board · Ferramentas' },
  { escopo: 'board.capacidade', rota: '/equipe/board/capacidade', rotulo: 'Board · Capacidade' },
  { escopo: 'board.operacional', rota: '/equipe/board/performance', rotulo: 'Board · Operacional' },
  { escopo: 'board.logs', rota: '/equipe/board/logs-equipe', rotulo: 'Board · Logs da equipe' },
  { escopo: 'board.chamados', rota: '/equipe/board/chamados', rotulo: 'Board · Chamados' },
  { escopo: 'board.dashboards', rota: '/equipe/board/relatorios', rotulo: 'Board · Dashboards' },
  // A aba "Desempenho", seus oito submenus e a seção "Minha Área"
  // (Minha Evolução) sairam do menu e as rotas estao desativadas (App.tsx),
  // então os escopos deles sairam daqui: sem rota viva, `escopoDaRota` nunca
  // casaria, e o "Ver" de uma notificação antiga levaria ao NotFound. Com o
  // escopo fora do mapa, `rotaDoEscopo` devolve null e o cartão só marca a
  // notificação como lida, sem navegar.
];

const POR_ESCOPO = new Map(ESCOPOS_BOARD.map((e) => [e.escopo, e]));

/**
 * O escopo da rota atual, ou `null` fora do Board.
 *
 * Casa por prefixo (`/dashboard` cobre `/dashboard?filtro=x` e rotas com
 * parâmetro, como o detalhe de um chamado) e escolhe o prefixo mais LONGO.
 */
export function escopoDaRota(pathname: string): EscopoAgente | null {
  let melhor: EscopoAgente | null = null;
  for (const candidato of ESCOPOS_BOARD) {
    const casa = pathname === candidato.rota || pathname.startsWith(`${candidato.rota}/`);
    if (!casa) continue;
    if (!melhor || candidato.rota.length > melhor.rota.length) melhor = candidato;
  }
  return melhor;
}

/** A rota canônica de um escopo — o destino do "Ver" de uma notificação. */
export function rotaDoEscopo(escopo: string): string | null {
  return POR_ESCOPO.get(escopo)?.rota ?? null;
}

export function rotuloDoEscopo(escopo: string): string | null {
  return POR_ESCOPO.get(escopo)?.rotulo ?? null;
}
