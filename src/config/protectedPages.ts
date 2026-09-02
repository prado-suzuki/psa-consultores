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
  /**
   * As OITO categorias que existem de verdade. O tipo declarava mais tres —
   * `fiscal`, `fixos` e `projetos` — sem nenhuma pagina em nenhuma delas
   * (conferido em 20/08/2026 por `select category, count(*) from
   * page_permissions group by category`). Tipo que declara valor inexistente
   * mente do mesmo jeito que comentario desatualizado: quem le acredita que ha
   * onde encaixar, e o `every()` de inferencia de area nunca fecha.
   *
   * ATENCAO ao acrescentar: a categoria e a chave de acesso E, a partir da
   * resolucao por categoria, do tema. Categoria desconhecida cai no piso.
   */
  category: 'dev' | 'rotina' | 'gestao' | 'geral' | 'osg' | 'board' | 'tax' | 'mapa';
  requires_admin: boolean;
  requires_team_member: boolean;
}

export const PROTECTED_PAGES: ProtectedPage[] = [
  // ====================================================================
  // === CATEGORIA `geral` ===
  //
  // O rotulo aqui dizia "acessiveis a todo membro" e isso NUNCA foi verdade
  // no dado. Medido em 20/08/2026, por
  // `select pp.page_path, count(*) from page_permissions pp join
  //  user_page_access u on u.page_permission_id = pp.id where pp.category =
  //  'geral' group by 1`:
  //
  //   /equipe/chamados .... 27 pessoas   <- a unica realmente ampla
  //   /equipe/mapeamento ... 9 pessoas
  //   as outras sete ....... 8 pessoas cada
  //
  // E das 8 pessoas do grupo restrito, 3 sao contas semente (@exemplo.dev) e
  // uma e conta de teste. Sobram os quatro do Digital.
  //
  // O QUE ESTA CATEGORIA E, entao: telas internas do Digital, mais
  // `/equipe/chamados`, que e porta de entrada das outras areas. A intencao
  // sempre foi respeitada na concessao; era o rotulo que mentia.
  //
  // Consequencia pratica: `geral` NAO esta em `ALL_AREA_CATEGORIES`
  // (`config/areaCategories.ts`), logo nao se concede por area — cada linha
  // aqui e concedida individualmente em `user_page_access`.
  // ====================================================================
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
    page_path: '/equipe/mapeamento',
    page_name: 'Mapeamento de Processos',
    page_description: 'Visão consolidada de processos, áreas e cenários de ROI',
    category: 'geral',
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
    page_path: '/equipe/dev/consulta-sped',
    page_name: 'Consulta SPED',
    page_description: 'Area de acesso as consultas e analises do Sistema Publico de Escrituracao Digital',
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
    page_description: 'Hub de gerenciamento de dados (carga + relatorios BI)',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/carregar-dados',
    page_name: 'Carregar dados',
    page_description: 'Importacao e limpeza de dados das tabelas de cliente e contribuinte',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/gerenciar-dados/dashboards',
    page_name: 'Dashboards - Gerenciar dados',
    page_description: 'Dashboards ligados a gestao de dados',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/levantamento-pis-cofins',
    page_name: 'Area Levantamento PIS/COFINS',
    page_description: 'Area de acesso as ferramentas de parametrizacao, apuracao, auditoria e revisao do levantamento de creditos de PIS e COFINS',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/perdcomp',
    page_name: 'Area PERDCOMP',
    page_description: 'Area de acesso ao painel analitico e ao controle operacional dos pedidos de restituicao e compensacao',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/perdcomp/dashboard',
    page_name: 'Dashboard PERDCOMP',
    page_description: 'Painel analítico de créditos, compensações e situações do PERDCOMP',
    category: 'dev',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/dev/analise-icms',
    page_name: 'Area Analise ICMS',
    page_description: 'Area de acesso a apuracao de saidas e a auditoria de classificacao para diferencial de aliquota',
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
  // === MAPA PAGES (Mapeamento de Processos OSG) ===
  // =============================================
  {
    page_path: '/equipe/digital/mapa',
    page_name: 'MAPA - Projetos',
    page_description: 'Lista de projetos do OSG (6 pilares)',
    category: 'mapa',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/digital/mapa/processos',
    page_name: 'MAPA - Processos',
    page_description: 'Mapeamento de processos por projeto',
    category: 'mapa',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/digital/mapa/processos/:id/mapear',
    page_name: 'MAPA - Mapear processo',
    page_description: 'Edição de etapas, ROI baseline e remensurações',
    category: 'mapa',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/digital/mapa/cascata',
    page_name: 'MAPA - Cascata',
    page_description: 'Grafo de interdependências processo→processo',
    category: 'mapa',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/digital/mapa/documentos',
    page_name: 'MAPA - Documentos',
    page_description: 'Catálogo de documentos (entrada/saída de etapas)',
    category: 'mapa',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/digital/mapa/sistemas',
    page_name: 'MAPA - Sistemas',
    page_description: 'Sistemas/ferramentas usados nas etapas',
    category: 'mapa',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/digital/mapa/responsaveis',
    page_name: 'MAPA - Responsáveis',
    page_description: 'Pessoas, papéis (executado/revisado/aprovado) e custo-hora',
    category: 'mapa',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/digital/mapa/gargalos',
    page_name: 'MAPA - Gargalos',
    page_description: 'Gargalos identificados em processos',
    category: 'mapa',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/digital/mapa/melhorias',
    page_name: 'MAPA - Melhorias',
    page_description: 'Plano de ações T/D por gargalo',
    category: 'mapa',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/digital/mapa/dashboard-roi',
    page_name: 'MAPA - Dashboard ROI',
    page_description: 'Visão consolidada de ROI por processo',
    category: 'mapa',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/digital/mapa/setor-evolucao',
    page_name: 'MAPA - Setor / Evolução',
    page_description: 'Linha do tempo e maturidade por setor',
    category: 'mapa',
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
    page_name: 'Tax Projetos e Tarefas',
    page_description: 'Projetos e tarefas organizados por ordem de serviço',
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
    page_path: '/equipe/tax/projetos/feed',
    page_name: 'Tax Feed',
    page_description: 'Feed dos comentários dos projetos e tarefas que o usuário acompanha',
    category: 'tax',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/tax/projetos/cadastro-lote',
    page_name: 'Tax Criar Projetos em Lote',
    page_description: 'Criação de projetos em lote a partir de uma ordem de serviço',
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
    // Endereço novo: a tela virou "Logs de Uso" dentro do dropdown Gerencial.
    // O caminho continua `logs-equipe` de propósito: mudar a URL exigiria
    // migração e redirecionamento, e ela não aparece para o usuário.
    // A migração 20260807... faz UPDATE do caminho no registro que já existe, em
    // vez de deixar o sincronizador criar um vazio e órfãs as 25 permissões.
    page_path: '/equipe/tax/gerencial/logs-equipe',
    page_name: 'Logs de Uso (Tax)',
    // Restrita a líder+ na rota (LiderRoute em App.tsx): liberar a permissão
    // aqui para um team_member não faz a página abrir.
    page_description: 'Histórico, produtividade e acesso do time Tax (somente líder+)',
    category: 'tax',
    requires_admin: false,
    requires_team_member: true,
  },
  // Chamados dentro do dropdown Gerencial da Tax. Vieram de `/gestao/chamados`.
  // Duas travas: papel (LiderRoute) e permissão nominal, como a de Logs de
  // Equipe ao lado — foi a escolha do Bernardo para as telas aparecerem na
  // árvore de acessos. A migração cria estes registros JÁ com as permissões
  // de hoje copiadas, para ninguém perder a tela na virada.
  {
    page_path: '/equipe/tax/gerencial/chamados',
    page_name: 'Gestão de Chamados (Tax)',
    page_description: 'Lista e gestão dos chamados dos clientes (somente líder+)',
    category: 'tax',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/tax/gerencial/chamados/dashboard',
    page_name: 'Dashboard de Chamados (Tax)',
    page_description: 'Panorama de chamados: KPIs, prazos e rankings (somente líder+)',
    category: 'tax',
    requires_admin: false,
    requires_team_member: true,
  },

  // =============================================
  // === OSG PAGES ===
  // =============================================
  {
    // Estava FORA desta lista, e o efeito era maior que a cor: sem registro,
    // `usePageAccess` trata a rota como publica (ver o cabecalho daquele hook).
    // Era a unica tela navegavel do sistema sem categoria — alcancavel pelo menu
    // do `OsgLayout:264` e pelo `OsgAreaSelector:48`.
    page_path: '/equipe/osg/inicio',
    page_name: 'Boas-vindas OSG',
    page_description: 'Tela inicial da area OSG',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/dashboard',
    page_name: 'OSG Projects',
    page_description: 'Painel principal de projetos da área OSG',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/projetos/clientes',
    page_name: 'Clientes OSG',
    page_description: 'Cadastros de clientes e contribuintes (ferramenta compartilhada com o Tax)',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/projetos/cadastro',
    page_name: 'OSG Projetos e Tarefas',
    page_description: 'Projetos e tarefas organizados por ordem de serviço',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/projetos/cadastro-lote',
    page_name: 'OSG Criar Projetos em Lote',
    page_description: 'Criação de projetos em lote a partir de uma ordem de serviço',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/projetos/tarefas',
    page_name: 'Tarefas OSG',
    page_description: 'Gestão de tarefas e eventos da área OSG (ferramenta compartilhada com o Tax)',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/projetos/feed',
    page_name: 'Feed OSG',
    page_description:
      'Feed dos comentários dos projetos e tarefas que o usuário acompanha (ferramenta compartilhada com o Tax)',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/work',
    page_name: 'OSG Work',
    page_description: 'Ferramentas e aplicações desenvolvidas para a área OSG',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/work/onboarding',
    page_name: 'Onboarding OSG',
    page_description: 'Preparação da solicitação inicial de documentos por produto contratado',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/work/qualificacao-das-partes',
    page_name: 'Qualificação das Partes',
    page_description: 'CRUD de pessoas (PF/PJ) e vínculos de parentesco por cliente',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/work/diagnostico-patrimonial',
    page_name: 'Diagnóstico Patrimonial',
    page_description: 'Cadastro de bens, matrículas, titulares e impedimentos por cliente',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/work/controle-matriculas',
    page_name: 'Controle de Matrículas',
    page_description: 'Registro de todas as matrículas (vinculadas ou órfãs), com vínculo a bens',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/work/quadro-societario',
    page_name: 'Quadro Societário',
    page_description: 'Distribuição de quotas e participação dos sócios por empresa (PR/CN)',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/work/calculadora-itcmd',
    page_name: 'Calculadora de ITCD',
    page_description:
      'Apuração do ITCD/MT na doação de quotas, em três cenários de avaliação, por donatário',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/work/relatorios',
    page_name: 'Relatórios OSG Work',
    page_description: 'Relatórios por cliente (ex.: checklist de documentos pendentes)',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    // Ver a observação da versão Tax: caminho novo, registro preservado.
    page_path: '/equipe/osg/gerencial/logs-equipe',
    page_name: 'Logs de Uso (OSG)',
    // Restrita a líder+ na rota (LiderRoute em App.tsx): liberar a permissão
    // aqui para um team_member não faz a página abrir.
    page_description: 'Histórico, produtividade e acesso do time OSG (somente líder+)',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  // Chamados dentro do dropdown Gerencial da OSG. Ver a observação da Tax.
  {
    page_path: '/equipe/osg/gerencial/chamados',
    page_name: 'Gestão de Chamados (OSG)',
    page_description: 'Lista e gestão dos chamados dos clientes (somente líder+)',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/osg/gerencial/chamados/dashboard',
    page_name: 'Dashboard de Chamados (OSG)',
    page_description: 'Panorama de chamados: KPIs, prazos e rankings (somente líder+)',
    category: 'osg',
    requires_admin: false,
    requires_team_member: true,
  },

  // =============================================
  // === BOARD PAGES ===
  // =============================================
  {
    page_path: '/equipe/board/dashboard',
    page_name: 'Board - Estratégico',
    page_description: 'Painel principal da área Board: negócio, risco e entrega',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/relatorios',
    page_name: 'Board - Dashboards',
    page_description: 'Dashboard Looker Studio incorporado',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/uso-envio',
    page_name: 'Board - Uso e envio',
    page_description: 'Adoção, engajamento e retenção das ferramentas internas',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/dashboard-clientes-os',
    page_name: 'Board - Clientes e OS (nativo)',
    page_description: 'Reconstrução nativa (não iframe) do dashboard de Clientes e OS',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/clientes',
    page_name: 'Board - Clientes',
    page_description: 'Carteira de clientes e mapa de calor por estado',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  // Consolidados do Board: as mesmas telas da Gerencial da Tax e da OSG, sem
  // recorte de cluster. As quatro são líder+ na rota (LiderRoute em App.tsx) —
  // liberar a permissão aqui para um team_member não faz a página abrir.
  // O detalhe (`/chamados/:id`) não se cadastra: rota com parâmetro usa a
  // permissão da lista, como na Tax.
  {
    page_path: '/equipe/board/chamados',
    page_name: 'Board - Chamados',
    page_description: 'Lista consolidada dos chamados de todas as áreas (somente líder+)',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/chamados/dashboard',
    page_name: 'Board - Dashboard de Chamados',
    page_description: 'Atendimento consolidado: tempo de resposta, prazos e rankings (somente líder+)',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/capacidade',
    page_name: 'Board - Capacidade',
    page_description: 'Carga do time, workload de 14 dias, atrasos e horas por cliente — Tax + OSG (somente líder+)',
    category: 'board',
    requires_admin: false,
    requires_team_member: true,
  },
  {
    page_path: '/equipe/board/logs-equipe',
    page_name: 'Board - Logs de Equipe',
    page_description: 'Produtividade, acesso e pendências do time nas áreas somadas (somente líder+)',
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
  // A aba "Desempenho" saiu do menu e suas rotas estao desativadas (App.tsx),
  // por isso as sete sub-paginas nao sao mais declaradas aqui. Esta linha-raiz
  // FICA: o `DesempenhoAccessGate` que protege /equipe/board/performance
  // libera por ela, e sem a pagina cadastrada o `usePageAccess` trataria a
  // raiz como rota livre num banco novo. O sincronizador so insere e atualiza,
  // nunca apaga — as linhas ja gravadas em `page_permissions` continuam la.
  {
    page_path: '/equipe/board/desempenho',
    page_name: 'Desempenho - Visão Geral (rota desativada)',
    page_description: 'Permissão-raiz herdada pelo painel Operacional (/equipe/board/performance)',
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
  // `/gestao/chamados` e `/gestao/chamados/dashboard` saíram daqui: as telas
  // passaram para o dropdown Gerencial da Tax e da OSG (entradas mais abaixo).
  // Os cadastros antigos são apagados pela migração 20260807190000 — tirá-los
  // só daqui não bastaria, porque o sincronizador insere e atualiza, mas nunca
  // apaga o que sumiu deste arquivo.
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
