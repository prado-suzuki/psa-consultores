/**
 * Lista de páginas protegidas que devem ser gerenciadas pelo sistema de controle de acessos.
 * Quando novas páginas são adicionadas ao sistema, elas devem ser registradas aqui.
 */

export interface ProtectedPage {
  page_path: string;
  page_name: string;
  page_description: string;
  category: 'dev' | 'rotina' | 'gestao' | 'geral' | 'fiscal' | 'fixos' | 'osg' | 'projetos' | 'board' | 'tax';
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
    page_name: 'Gerenciar dados',
    page_description: 'Gerenciamento de dados',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/auditoria-fiscal',
    page_name: 'Auditoria Fiscal',
    page_description: 'Ferramenta de auditoria fiscal',
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

  // === TEX PAGES ===
  {
    page_path: '/equipe/tax/dashboard',
    page_name: 'Tax Dashboard',
    page_description: 'Painel principal da área Tax',
    category: 'tax',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/tax/projetos/cadastro',
    page_name: 'Tax Cadastro',
    page_description: 'Cadastro de projetos da área Tax',
    category: 'tax',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/tax/projetos/tarefas',
    page_name: 'Tax Tarefas',
    page_description: 'Tarefas de projetos da área Tax',
    category: 'tax',
    requires_admin: false,
    requires_team_member: true,
  },

  // === FISCAL PAGES (dentro de Projetos) ===
  {
    page_path: '/equipe/projetos/fiscal/dashboard',
    page_name: 'Fiscal Dashboard',
    page_description: 'Painel principal da área Fiscal',
    category: 'projetos',
    requires_admin: false,
    requires_team_member: true,
  },

  // === FIXOS PAGES (dentro de Projetos) ===
  {
    page_path: '/equipe/projetos/fixos/dashboard',
    page_name: 'Fixos Dashboard',
    page_description: 'Painel principal da área Fixos',
    category: 'projetos',
    requires_admin: false,
    requires_team_member: true,
  },

  // === OSG PAGES ===
  {
    page_path: '/equipe/osg/dashboard',
    page_name: 'OSG Dashboard',
    page_description: 'Painel principal da área OSG',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },

  // === PROJETOS PAGES ===
  {
    page_path: '/equipe/projetos/dashboard',
    page_name: 'Projetos Dashboard',
    page_description: 'Painel principal da área de Projetos',
    category: 'projetos',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/projetos/demandas',
    page_name: 'Demandas',
    page_description: 'Gestão de pacotes de trabalho e tarefas',
    category: 'projetos',
    requires_admin: false,
    requires_team_member: true,
  },

  // === BOARD PAGES ===
  {
    page_path: '/equipe/board/dashboard',
    page_name: 'Board Dashboard',
    page_description: 'Painel principal da área Board',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },

  // === GERAL PAGES ===
  {
    page_path: '/equipe/chamados',
    page_name: 'Chamados Equipe',
    page_description: 'Visualizar e gerenciar chamados atribuídos',
    category: 'geral',
    requires_admin: false,
    requires_team_member: true,
  },

  // === AUDITORIA PAGES ===
  {
    page_path: '/equipe/tax/auditoria',
    page_name: 'Auditoria Tax',
    page_description: 'Histórico de alterações em projetos e tarefas Tax',
    category: 'tax',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/auditoria',
    page_name: 'Auditoria OSG',
    page_description: 'Histórico de alterações em projetos e tarefas OSG',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
];
