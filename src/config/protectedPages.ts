/**
 * Lista de páginas protegidas que devem ser gerenciadas pelo sistema de controle de acessos.
 * Quando novas páginas são adicionadas ao sistema, elas devem ser registradas aqui.
 */

export interface ProtectedPage {
  page_path: string;
  page_name: string;
  page_description: string;
  category: 'dev' | 'rotina' | 'gestao' | 'geral';
  requires_admin: boolean;
  requires_team_member: boolean;
}

export const PROTECTED_PAGES: ProtectedPage[] = [
  // === DEV PAGES ===
  {
    page_path: '/equipe/dev',
    page_name: 'Dev Dashboard',
    page_description: 'Painel de desenvolvimento',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/nova-ferramenta',
    page_name: 'Nova Ferramenta',
    page_description: 'Criar nova ferramenta',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/ferramenta',
    page_name: 'Detalhe Ferramenta',
    page_description: 'Visualização de ferramenta específica',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/consulta-xmls',
    page_name: 'Consulta XMLs',
    page_description: 'Consultar arquivos XML',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/consulta-efd',
    page_name: 'EFD Contribuições',
    page_description: 'Consulta de arquivos EFD Contribuições',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/consulta-efd-icms',
    page_name: 'EFD ICMS/IPI',
    page_description: 'Consulta de arquivos EFD ICMS/IPI',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/gerenciar-dados',
    page_name: 'Gerenciar Dados',
    page_description: 'Gerenciamento de dados',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/difal-inteligente',
    page_name: 'DIFAL Inteligente',
    page_description: 'Ferramenta DIFAL Inteligente',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/controle-perdcomp',
    page_name: 'Controle PERDCOMP',
    page_description: 'Gerenciamento de PER, DCOMP e Situações',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/gestao-clientes',
    page_name: 'Gestão de Clientes',
    page_description: 'Consulta e filtros de clientes cadastrados',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },

  // === GESTÃO PAGES ===
  {
    page_path: '/gestao/novidades',
    page_name: 'Novidades',
    page_description: 'Gerenciar novidades do site',
    category: 'gestao',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/gestao/chamados',
    page_name: 'Chamados',
    page_description: 'Gerenciar chamados',
    category: 'gestao',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/gestao/contatos',
    page_name: 'Contatos',
    page_description: 'Gerenciar contatos do site',
    category: 'gestao',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/gestao/acessos',
    page_name: 'Controle de Acessos',
    page_description: 'Gerenciar permissões de acesso',
    category: 'gestao',
    requires_admin: true,
    requires_team_member: true,
  },
];
