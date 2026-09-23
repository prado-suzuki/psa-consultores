import {
  BarChart3,
  BookOpen,
  BookText,
  Calculator,
  Database,
  FileSpreadsheet,
  FileStack,
  FileText,
  GitCompare,
  LayoutGrid,
  Map,
  Presentation,
  Receipt,
  Sprout,
  Sparkles,
  Truck,
  Upload,
  Wrench,
} from 'lucide-react';
import { DEV_NAV_LABELS } from '@/constants/devNavLabels';
import { TELAS_DO_DEV } from '@/config/telasDoDigitalDev';
import type { DevHubDefinition } from '@/types/devHub';

export const DEV_HUBS: Record<
  | 'consultaSped'
  | 'levantamentoPisCofins'
  | 'analiseIcms'
  | 'perdcomp'
  | 'gerenciarDados'
  | 'planejamentoTributario',
  DevHubDefinition
> = {
  consultaSped: {
    label: DEV_NAV_LABELS.consultaSped,
    landingPath: '/equipe/tax/work/consulta-sped',
    landingDescription:
      'Acesse EFD Contribuições, EFD ICMS/IPI, ECD e ECF para consulta, análise e download.',
    landingIcon: Receipt,
    landingSopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/',
    title: TELAS_DO_DEV.consultaSped.titulo,
    subtitle: TELAS_DO_DEV.consultaSped.subtitulo,
    heroEyebrow: '',
    heroTitle: TELAS_DO_DEV.consultaSped.titulo,
    heroDescription:
      'Use esta área para consultar arquivos da Escrituração Fiscal Digital das Contribuições (EFD Contribuições), da Escrituração Fiscal Digital do Imposto sobre Circulação de Mercadorias e Serviços (ICMS) e do Imposto sobre Produtos Industrializados (IPI) (EFD ICMS/IPI), da Escrituração Contábil Digital (ECD) e da Escrituração Contábil Fiscal (ECF) no Sistema Público de Escrituração Digital (SPED).',
    heroIcon: LayoutGrid,
    options: [
      {
        badge: 'Fiscal',
        description:
          'Consulte arquivos da Escrituração Fiscal Digital das Contribuições, revise créditos do Programa de Integração Social (PIS) e da Contribuição para o Financiamento da Seguridade Social (COFINS) por período e abra a análise detalhada dos blocos e registros.',
        highlights: [
          'Busca por cliente, contribuinte e período',
          'Download individual ou em lote',
          'Análise de blocos e exportação em Excel',
        ],
        icon: Receipt,
        path: '/equipe/tax/work/consulta-efd',
        sopUrl:
          'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-contribuicoes/',
        title: DEV_NAV_LABELS.efdContribuicoes,
      },
      {
        badge: 'Fiscal',
        description:
          'Consulte arquivos da Escrituração Fiscal Digital do ICMS e do IPI, filtre por filial, acompanhe os valores apurados no período e exporte os arquivos selecionados.',
        highlights: [
          'Filtro adicional por filial',
          'Leitura de ICMS e de ICMS por Substituição Tributária (ICMS ST) apurados',
          'Download, seleção em lote e análise por arquivo',
        ],
        icon: FileText,
        path: '/equipe/tax/work/consulta-efd-icms',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-icms/',
        title: TELAS_DO_DEV.efdIcms.titulo,
      },
      {
        badge: 'Contábil',
        description:
          'Localize arquivos da Escrituração Contábil Digital, confira a finalidade da entrega e abra a leitura detalhada dos registros de cada arquivo.',
        highlights: [
          'Consulta por contribuinte e período',
          'Identificação da finalidade da ECD',
          'Download, exportação e análise em tela',
        ],
        icon: BookOpen,
        path: '/equipe/tax/work/consulta-ecd',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECD/',
        title: DEV_NAV_LABELS.ecd,
      },
      {
        badge: 'Fiscal',
        description:
          'Localize arquivos da Escrituração Contábil Fiscal, identifique situações especiais da entrega e abra a leitura detalhada de cada arquivo encontrado.',
        highlights: [
          'Consulta por contribuinte e período',
          'Leitura de situação especial da ECF',
          'Download, exportação e análise em tela',
        ],
        icon: BookText,
        path: '/equipe/tax/work/consulta-ecf',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECF/',
        title: DEV_NAV_LABELS.ecf,
      },
    ],
  },
  levantamentoPisCofins: {
    label: DEV_NAV_LABELS.levantamentoPisCofins,
    landingPath: '/equipe/tax/work/levantamento-pis-cofins',
    landingDescription:
      'Acesse ferramentas para regras fiscais, apuração, análise cruzada e correções da EFD Contribuições.',
    landingIcon: Calculator,
    landingSopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/',
    title: TELAS_DO_DEV.levantamentoPisCofins.titulo,
    subtitle: TELAS_DO_DEV.levantamentoPisCofins.subtitulo,
    heroEyebrow: '',
    heroTitle: TELAS_DO_DEV.levantamentoPisCofins.titulo,
    heroDescription:
      'Use esta área para cadastrar regras, revisar apurações, comparar bases e corrigir registros relacionados ao Programa de Integração Social (PIS) e à Contribuição para o Financiamento da Seguridade Social (COFINS).',
    heroIcon: LayoutGrid,
    options: [
      {
        badge: 'Regras',
        description:
          'Cadastre a base de regras fiscais por NCM, setor, Código de Situação Tributária (CST) e base legal para definir quando a operação permite crédito das contribuições.',
        highlights: [
          'Cadastro de regras por NCM',
          'Filtro por setor e permissão de crédito',
          'Consulta, edição e exclusão das regras',
        ],
        icon: Map,
        path: '/equipe/tax/work/mapa-ncm-pis-cofins',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/mapa-ncm/',
        title: TELAS_DO_DEV.mapaNCMs.titulo,
      },
      {
        badge: 'Apuração',
        description:
          'Consolide débitos, créditos, isenções, exclusões e rateios por período usando a Escrituração Fiscal Digital das Contribuições (EFD Contribuições) ou balancete importado.',
        highlights: [
          'Modo Cliente com EFD ou Padrão com Balancete',
          'Abas de resumo, débitos, créditos e apuração',
          'Leitura mensal do saldo de PIS e COFINS',
        ],
        icon: Calculator,
        path: '/equipe/tax/work/apuracao-pis-cofins',
        sopUrl:
          'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/apuracao-piscofins/',
        title: DEV_NAV_LABELS.apuracaoTributaria,
      },
      {
        badge: 'Auditoria',
        description:
          'Cruze balancete, Escrituração Fiscal Digital das Contribuições (EFD Contribuições), Escrituração Fiscal Digital do Imposto sobre Circulação de Mercadorias e Serviços (ICMS) e do Imposto sobre Produtos Industrializados (IPI) (EFD ICMS/IPI) e arquivos Extensible Markup Language (XML) para localizar divergências entre as bases fiscais e contábeis.',
        highlights: [
          'Reconciliação entre bases fiscais e contábeis',
          'Leitura por abas conforme a fonte comparada',
          'Identificação de diferenças por período e contribuinte',
        ],
        icon: GitCompare,
        path: '/equipe/tax/work/cruzamento-dados',
        sopUrl:
          'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/analise-cruzada/',
        title: DEV_NAV_LABELS.analiseCruzada,
      },
      {
        badge: 'Revisão',
        description:
          'Revise registros da Escrituração Fiscal Digital das Contribuições cruzando a EFD Contribuições com arquivos XML para preparar correções rastreáveis antes do ajuste.',
        highlights: [
          'Análise por registro e por período',
          'Busca por descrição, chave e NCM',
          'Envio e exportação das correções apuradas',
        ],
        icon: Wrench,
        path: '/equipe/tax/work/correcoes-sped',
        sopUrl:
          'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/correcoes-sped/',
        title: TELAS_DO_DEV.correcoesEfdContribuicoes.titulo,
      },
    ],
  },
  analiseIcms: {
    label: DEV_NAV_LABELS.analiseIcms,
    landingPath: '/equipe/tax/work/analise-icms',
    landingDescription:
      'Acesse ferramentas para análise de ICMS das saídas e DIFAL.',
    landingIcon: Truck,
    landingSopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/',
    title: TELAS_DO_DEV.analiseIcms.titulo,
    subtitle: TELAS_DO_DEV.analiseIcms.subtitulo,
    heroEyebrow: '',
    heroTitle: TELAS_DO_DEV.analiseIcms.titulo,
    heroDescription:
      'Use esta área para analisar as saídas de ICMS e validar classificações tributárias usadas no cálculo do DIFAL.',
    heroIcon: LayoutGrid,
    options: [
      {
        badge: 'Análise',
        description:
          'Analise as saídas por período com visões de apuração, Código Fiscal de Operações e Prestações (CFOP), saídas e saídas com substituição tributária.',
        highlights: [
          'Abas Apuração, CFOP, Saídas e Saídas ST',
          'Leitura de apuração, CFOP e saídas ST',
          'Consulta por contribuinte e período',
        ],
        icon: Truck,
        path: '/equipe/tax/work/apuracao-difal/icms-saidas',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/icms-saidas/',
        title: DEV_NAV_LABELS.icmsSaidas,
      },
      {
        badge: 'Análise',
        description:
          'Classifique produtos por Nomenclatura Comum do Mercosul (NCM), acompanhe pendências e validações em sessão e sincronize as decisões tributárias do processo de DIFAL.',
        highlights: [
          'Sessão de trabalho com pendências e validados',
          'Validação por produto, NCM, CFOP e alíquota',
          'Sincronização das decisões e exportação em Excel',
        ],
        icon: Sparkles,
        path: '/equipe/tax/work/processo-difal',
        sopUrl:
          'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/difal-inteligente/',
        title: DEV_NAV_LABELS.difalInteligente,
      },
    ],
  },
  perdcomp: {
    label: DEV_NAV_LABELS.perdcomp,
    landingPath: '/equipe/tax/work/perdcomp',
    landingDescription:
      'Acesse o dashboard e o controle operacional de PERDCOMP.',
    landingIcon: BarChart3,
    landingSopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/',
    title: TELAS_DO_DEV.perdcomp.titulo,
    subtitle: TELAS_DO_DEV.perdcomp.subtitulo,
    heroEyebrow: '',
    heroTitle: TELAS_DO_DEV.perdcomp.titulo,
    heroDescription:
      'Use esta área para analisar gráficos, indicadores e fazer o controle do Pedido Eletrônico de Restituição, Ressarcimento ou Reembolso e Declaração de Compensação (PERDCOMP).',
    heroIcon: LayoutGrid,
    options: [
      {
        badge: 'Analítico',
        description:
          'Consulte indicadores consolidados de pedidos de restituição, ressarcimento, declaração de compensação e saldos em acompanhamento.',
        highlights: [
          'Valores consolidados',
          'Filtros por período, cliente e status',
          'Leitura executiva do painel',
        ],
        icon: BarChart3,
        path: '/equipe/tax/work/perdcomp/dashboard',
        sopUrl:
          'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/dashboard-perdcomp-faturamento/',
        title: DEV_NAV_LABELS.dashboardPerdcomp,
      },
      {
        badge: 'Operacional',
        description:
          'Acesse a rotina de consulta e atualização dos pedidos para registrar compensações, situações e pagamentos.',
        highlights: [
          'Consulta por cliente e contribuinte',
          'Gestão de pedidos e declarações',
          'Atualização de situações e pagamentos',
        ],
        icon: FileStack,
        path: '/equipe/tax/work/controle-perdcomp',
        sopUrl:
          'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/controle-perdcomp',
        title: DEV_NAV_LABELS.controlePerdcomp,
      },
    ],
  },
  gerenciarDados: {
    label: DEV_NAV_LABELS.gerenciarDados,
    landingPath: '/equipe/tax/work/gerenciar-dados',
    landingDescription:
      'Área para importar, limpar e gerenciar dados das tabelas de cliente e contribuinte e para acompanhar dashboards ligados a essas rotinas.',
    landingIcon: Database,
    title: 'Gerenciar dados',
    subtitle: 'Ferramentas para carga de dados e análise por dashboards.',
    heroEyebrow: '',
    heroTitle: 'Gerenciar dados',
    heroDescription:
      'Use esta área para realizar a carga de dados das tabelas operacionais e consultar dashboards com indicadores das rotinas de gestão de dados.',
    heroIcon: LayoutGrid,
    options: [
      {
        badge: 'Operacional',
        description:
          'Importe ou limpe registros das tabelas de cliente e contribuinte por ambiente, com suporte a templates CSV e carga complementar de PER/DCOMP e chamados.',
        highlights: [
          'Importação via CSV para cliente e contribuinte',
          'Limpeza por ambiente (Desenvolvimento ou Produção)',
          'Carga complementar de PER/DCOMP e chamados',
        ],
        icon: Upload,
        path: '/equipe/tax/work/carregar-dados',
        title: DEV_NAV_LABELS.carregarDados,
      },
      {
        badge: 'Analítico',
        description:
          'Acompanhe dashboards com indicadores de uso, envio e faturamento ligados às rotinas de gestão de dados.',
        highlights: [
          'Controle de uso e envio de documentos',
          'Seleção de dashboard por filtro',
          'Suporte futuro a múltiplos dashboards',
        ],
        icon: BarChart3,
        path: '/equipe/tax/work/gerenciar-dados/dashboards',
        title: DEV_NAV_LABELS.dashboardsGerenciarDados,
      },
    ],
  },
  planejamentoTributario: {
    label: DEV_NAV_LABELS.planejamentoTributario,
    landingPath: '/equipe/tax/work/planejamento-tributario',
    landingDescription:
      'Área do Planejamento Tributário rural: importar o papel de trabalho preenchido, conferir o que o sistema leu dele, acompanhar as revisões e gerar os slides.',
    landingIcon: Sprout,
    title: 'Planejamento Tributário',
    subtitle: 'Ferramentas do Planejamento Tributário rural.',
    heroEyebrow: '',
    heroTitle: 'Planejamento Tributário',
    heroDescription:
      'Use esta área para trabalhar o planejamento que compara como o produtor rural explora a fazenda: como pessoa física, em parceria com a pessoa jurídica dele, ou tudo dentro da pessoa jurídica. O planejamento nasce numa planilha, o papel de trabalho, e é dela que saem os números da apresentação entregue ao cliente.',
    heroIcon: LayoutGrid,
    options: [
      {
        badge: 'Fiscal',
        description:
          'Escolha o papel de trabalho preenchido e confira o que o sistema entendeu dele antes de gravar: o cabeçalho do planejamento, quanto entrou de cada bloco, os anos e cenários encontrados, e o que a leitura reclamou.',
        highlights: [
          'Leitura no navegador: o arquivo não sai daqui antes da confirmação',
          'Impedimento e aviso separados, com o endereço da célula de cada um',
          'Régua da leitura gravada em cada revisão',
        ],
        icon: FileSpreadsheet,
        path: '/equipe/tax/work/planejamento-tributario/papel-de-trabalho',
        title: DEV_NAV_LABELS.papelDeTrabalho,
      },
      {
        badge: 'Fiscal',
        description:
          'Monte a seção tributária da apresentação a partir de uma revisão já importada: premissas, carga tributária, transferência da atividade rural e resumo, com tabelas editáveis no PowerPoint.',
        highlights: [
          'Os números são lidos no servidor, não na tela',
          'O que não couber no slide vira aviso, em vez de encolher a fonte',
          'Histórico por revisão, para baixar de novo sem regerar',
        ],
        icon: Presentation,
        path: '/equipe/tax/work/planejamento-tributario/gerador-de-slides',
        title: DEV_NAV_LABELS.geradorDeSlides,
      },
    ],
  },
};
