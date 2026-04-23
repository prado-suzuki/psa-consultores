/**
 * Lista de páginas protegidas que devem ser gerenciadas pelo sistema de controle de acessos.
 * Quando novas páginas são adicionadas ao sistema, elas devem ser registradas aqui.
 *
 * IMPORTANTE: Toda nova página/rota protegida DEVE ser registrada neste array.
 * Sem isso, ela NÃO aparecerá no controle de permissões mesmo após clicar em "Atualizar".
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
  // =============================================
  // === GERAL PAGES (acessíveis a todo membro) ===
  // =============================================
  {
    page_path: '/equipe/dashboard',
    page_name: 'Dashboard Equipe',
    page_description: 'Painel principal da equipe',
    category: 'geral',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/relatorios',
    page_name: 'Relatórios',
    page_description: 'Relatórios gerais da equipe',
    category: 'rotina',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/kanban',
    page_name: 'Kanban',
    page_description: 'Quadro Kanban de tarefas',
    category: 'geral',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/sprints',
    page_name: 'Sprints',
    page_description: 'Gerenciamento de sprints',
    category: 'geral',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/daily',
    page_name: 'Daily',
    page_description: 'Registro de daily standups',
    category: 'geral',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/rotinas',
    page_name: 'Rotinas',
    page_description: 'Gerenciamento de rotinas recorrentes',
    category: 'rotina',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/tarefas',
    page_name: 'Tarefas',
    page_description: 'Listagem e gestão de tarefas',
    category: 'rotina',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/tarefas/nova',
    page_name: 'Nova Tarefa',
    page_description: 'Criação de nova tarefa',
    category: 'rotina',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/processos',
    page_name: 'Processos',
    page_description: 'Gestão de processos internos',
    category: 'geral',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/projetos',
    page_name: 'Projetos',
    page_description: 'Gerenciamento de projetos',
    category: 'rotina',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/biblioteca',
    page_name: 'Biblioteca',
    page_description: 'Biblioteca de documentos e recursos',
    category: 'geral',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/backlog',
    page_name: 'Backlog',
    page_description: 'Backlog de tarefas e demandas',
    category: 'geral',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/chamados',
    page_name: 'Chamados Equipe',
    page_description: 'Visualizar e gerenciar chamados atribuídos',
    category: 'geral',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/acessos',
    page_name: 'Controle de Acessos (Equipe)',
    page_description: 'Gerenciar permissões de páginas e usuários',
    category: 'gestao',
    requires_admin: true,
    requires_team_member: true,
  },

  // =============================================
  // === DEV PAGES ===
  // =============================================
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
    page_path: '/equipe/dev/consulta-ecd',
    page_name: 'Consulta ECD',
    page_description: 'Consulta de arquivos ECD',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/consulta-ecf',
    page_name: 'Consulta ECF',
    page_description: 'Consulta de arquivos ECF',
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
    page_path: '/equipe/dev/processo-difal',
    page_name: 'Processo DIFAL',
    page_description: 'Ferramenta de auditoria DIFAL',
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
    page_path: '/equipe/dev/controle-balancetes',
    page_name: 'Controle Balancetes',
    page_description: 'Gerenciamento de balancetes',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/gestao-clientes',
    page_name: 'Gestão Clientes',
    page_description: 'Gerenciamento de clientes Dev',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/calculadora-ibs-cbs',
    page_name: 'Calculadora IBS/CBS',
    page_description: 'Calculadora de IBS e CBS',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/apuracao-pis-cofins',
    page_name: 'Apuração PIS/COFINS',
    page_description: 'Motor de apuração PIS e COFINS',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/mapa-ncm-pis-cofins',
    page_name: 'Mapa NCM PIS/COFINS',
    page_description: 'Gerenciamento de regras fiscais NCM para PIS/COFINS',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/cruzamento-dados',
    page_name: 'Análise Cruzada',
    page_description: 'Cruzamento de dados EFD, Balancete e XMLs',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/correcoes-sped',
    page_name: 'Correções no SPED',
    page_description: 'Revisão de notas e itens EFD vs XML para correções',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/procedimentos',
    page_name: 'Procedimentos',
    page_description: 'Biblioteca de procedimentos técnicos gerados por IA',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/apuracao-difal/icms-saidas',
    page_name: 'ICMS das Saídas',
    page_description: 'Classificação fiscal de produtos em saídas interestaduais (Beta)',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },

  // =============================================
  // === TAX PAGES ===
  // =============================================
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
    page_name: 'Tax Entregas',
    page_description: 'Entregas de projetos da área Tax',
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
  {
    page_path: '/equipe/tax/projetos/clientes',
    page_name: 'Tax Clientes',
    page_description: 'Cadastros de clientes da área Tax',
    category: 'tax',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/tax/auditoria',
    page_name: 'Auditoria Tax',
    page_description: 'Histórico de alterações em projetos e tarefas Tax',
    category: 'tax',
    requires_admin: false,
    requires_team_member: true,
  },

  // =============================================
  // === OSG PAGES ===
  // =============================================
  {
    page_path: '/equipe/osg/dashboard',
    page_name: 'OSG Dashboard',
    page_description: 'Painel principal da área OSG',
    category: 'osg',
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

  // =============================================
  // === BOARD PAGES ===
  // =============================================
  {
    page_path: '/equipe/board/dashboard',
    page_name: 'Board Dashboard',
    page_description: 'Painel principal da área Board',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/performance',
    page_name: 'Performance',
    page_description: 'Painel executivo consolidado de performance',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/desempenho',
    page_name: 'Desempenho - Visão Geral',
    page_description: 'Painel geral de desempenho e performance',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/desempenho/ciclos',
    page_name: 'Desempenho - Ciclos',
    page_description: 'Gestão de ciclos de avaliação',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/desempenho/metas',
    page_name: 'Desempenho - Metas',
    page_description: 'Gestão de metas hierárquicas',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/desempenho/feedbacks',
    page_name: 'Desempenho - Feedbacks',
    page_description: 'Registro e visualização de feedbacks',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/desempenho/1a1',
    page_name: 'Desempenho - 1:1s',
    page_description: 'Registro de reuniões 1:1',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/desempenho/evolucao',
    page_name: 'Desempenho - Evolução',
    page_description: 'Análise de evolução individual',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/desempenho/decisoes',
    page_name: 'Desempenho - Decisões',
    page_description: 'Recomendações de IA para promoção e reajuste',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/desempenho/relatorios',
    page_name: 'Desempenho - Relatórios',
    page_description: 'Geração de relatórios individuais com IA',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/desempenho/minha-evolucao',
    page_name: 'Minha Evolução',
    page_description: 'Visão individual de metas, feedbacks e PPR',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },

  // =============================================
  // === GESTÃO PAGES ===
  // =============================================
  {
    page_path: '/gestao',
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