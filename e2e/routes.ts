/**
 * Rotas tocadas pela refatoração da camada de dados (branch
 * feature/refatoracao-camada-dados). Apenas GET/render — sem rotas com :id
 * (não temos ids válidos determinísticos) e sem fluxos de mutation.
 */
export interface RouteCase {
  path: string;
  /** rótulo p/ o nome do teste */
  label: string;
}

export const ROUTES: RouteCase[] = [
  // Público
  { path: '/', label: 'Landing (ContactSection)' },
  { path: '/novidades', label: 'Novidades (público)' },

  // Equipe — god-components refatorados
  { path: '/equipe/dashboard', label: 'Equipe Dashboard' },
  { path: '/equipe/dashboards/analise-inteligente', label: 'Análise Inteligente' },
  { path: '/equipe/kanban', label: 'Kanban' },
  { path: '/equipe/processos', label: 'Processos' },
  { path: '/equipe/projetos', label: 'Projetos' },

  // Equipe — cauda longa
  { path: '/equipe/relatorios', label: 'Relatórios' },
  { path: '/equipe/sprints', label: 'Sprints' },
  { path: '/equipe/daily', label: 'Daily' },
  { path: '/equipe/rotinas', label: 'Rotinas' },
  { path: '/equipe/tarefas', label: 'Tarefas' },
  { path: '/equipe/tarefas/nova', label: 'Nova Tarefa' },
  { path: '/equipe/biblioteca', label: 'Biblioteca' },
  { path: '/equipe/backlog', label: 'Backlog' },
  { path: '/equipe/acessos', label: 'Controle de Acessos' },

  // Dev
  { path: '/equipe/dev/nova-ferramenta', label: 'Dev: Nova Ferramenta' },
  { path: '/equipe/dev/consulta-xmls', label: 'Dev: Consulta XMLs' },
  { path: '/equipe/dev/consulta-efd', label: 'Dev: Consulta EFD' },
  { path: '/equipe/dev/consulta-efd-icms', label: 'Dev: Consulta EFD ICMS' },
  { path: '/equipe/dev/consulta-ecd', label: 'Dev: Consulta ECD' },
  { path: '/equipe/dev/consulta-ecf', label: 'Dev: Consulta ECF' },
  { path: '/equipe/dev/carregar-dados', label: 'Dev: Gerenciar/Carregar Dados' },
  { path: '/equipe/dev/apuracao-pis-cofins', label: 'Dev: Apuração PIS/COFINS' },
  { path: '/equipe/dev/processo-difal', label: 'Dev: Processo DIFAL' },
  { path: '/equipe/dev/controle-perdcomp', label: 'Dev: Controle PERDCOMP' },
  { path: '/equipe/dev/controle-balancetes', label: 'Dev: Controle Balancetes' },
  { path: '/equipe/dev/apuracao-difal/icms-saidas', label: 'Dev: ICMS Saídas' },
  { path: '/equipe/dev/correcoes-sped', label: 'Dev: Correções SPED' },

  // Tax
  { path: '/equipe/tax/projetos/cadastro', label: 'Tax: Projetos Cadastro' },
  { path: '/equipe/tax/projetos/feed', label: 'Tax: Feed de comentários' },

  // OSG
  { path: '/equipe/osg/projetos/feed', label: 'OSG: Feed de comentários' },

  // Gestão
  { path: '/gestao', label: 'Gestão Novidades' },
  { path: '/gestao/contatos', label: 'Gestão Contatos' },

  // Board / Desempenho
  { path: '/equipe/board/dashboard', label: 'Board Dashboard' },
  { path: '/equipe/board/clientes', label: 'Board Clientes (mapa + lista)' },
  { path: '/equipe/board/performance', label: 'Board Performance' },
  // As oito telas da aba "Desempenho" sairam do menu e tiveram as rotas
  // desativadas em App.tsx — varrer por elas so testaria o NotFound.
  { path: '/equipe/board/desempenho/minha-evolucao', label: 'Minha Evolução' },
];
