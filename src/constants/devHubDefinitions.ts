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
  Receipt,
  Sprout,
  Sparkles,
  Truck,
  Upload,
  Wrench,
} from 'lucide-react';
import { DEV_NAV_LABELS } from '@/constants/devNavLabels';
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
    landingPath: '/equipe/dev/consulta-sped',
    landingDescription:
      'Área para localizar arquivos do Sistema Público de Escrituração Digital, filtrar por contribuinte e período, baixar os arquivos originais e abrir a leitura detalhada de cada entrega.',
    landingIcon: Receipt,
    landingSopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/',
    title: 'CONSULTA DOS ARQUIVOS SPEDs DO CLIENTE',
    subtitle: 'Ferramentas para consulta, download e análise dos SPEDs fiscais.',
    heroEyebrow: '',
    heroTitle: 'CONSULTA DOS ARQUIVOS SPEDs DO CLIENTE',
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
        path: '/equipe/dev/consulta-efd',
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
        path: '/equipe/dev/consulta-efd-icms',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-icms/',
        title: `${DEV_NAV_LABELS.efdIcms}/IPI`,
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
        path: '/equipe/dev/consulta-ecd',
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
        path: '/equipe/dev/consulta-ecf',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECF/',
        title: DEV_NAV_LABELS.ecf,
      },
    ],
  },
  levantamentoPisCofins: {
    label: DEV_NAV_LABELS.levantamentoPisCofins,
    landingPath: '/equipe/dev/levantamento-pis-cofins',
    landingDescription:
      'Área do levantamento de crédito para parametrizar regras fiscais, apurar contribuições, reconciliar bases e revisar registros antes de consolidar o trabalho.',
    landingIcon: Calculator,
    landingSopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/',
    title:
      'LEVANTAMENTO PIS/COFINS — PROGRAMA DE INTEGRAÇÃO SOCIAL E CONTRIBUIÇÃO PARA O FINANCIAMENTO DA SEGURIDADE SOCIAL',
    subtitle:
      'Escolha a ferramenta de cadastro de regras, apuração, análise cruzada e revisão de registros.',
    heroEyebrow: '',
    heroTitle: 'Levantamento PIS/COFINS',
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
        path: '/equipe/dev/mapa-ncm-pis-cofins',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/mapa-ncm/',
        title: 'Mapa de Nomenclatura Comum do Mercosul (NCMs)',
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
        path: '/equipe/dev/apuracao-pis-cofins',
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
        path: '/equipe/dev/cruzamento-dados',
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
        path: '/equipe/dev/correcoes-sped',
        sopUrl:
          'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/correcoes-sped/',
        title:
          'Revisão de Registros da Escrituração Fiscal Digital das Contribuições (EFD Contribuições)',
      },
    ],
  },
  analiseIcms: {
    label: DEV_NAV_LABELS.analiseIcms,
    landingPath: '/equipe/dev/analise-icms',
    landingDescription:
      'Área para apurar saídas, revisar CFOP e substituição tributária e auditar a classificação de produtos usada no processo de diferencial de alíquota.',
    landingIcon: Truck,
    landingSopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/',
    title: 'ANÁLISE DO IMPOSTO SOBRE CIRCULAÇÃO DE MERCADORIAS E SERVIÇOS (ICMS)',
    subtitle:
      'Ferramentas para análise do ICMS das saídas e para análise do diferencial de alíquota (DIFAL).',
    heroEyebrow: '',
    heroTitle: 'Análise ICMS',
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
        path: '/equipe/dev/apuracao-difal/icms-saidas',
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
        path: '/equipe/dev/processo-difal',
        sopUrl:
          'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/difal-inteligente/',
        title: DEV_NAV_LABELS.difalInteligente,
      },
    ],
  },
  perdcomp: {
    label: DEV_NAV_LABELS.perdcomp,
    landingPath: '/equipe/dev/perdcomp',
    landingDescription:
      'Área com entradas separadas para a leitura analítica do painel e para a gestão operacional dos pedidos de restituição, ressarcimento, reembolso e declaração de compensação.',
    landingIcon: BarChart3,
    landingSopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/',
    title:
      'PEDIDO ELETRÔNICO DE RESTITUIÇÃO, RESSARCIMENTO OU REEMBOLSO E DECLARAÇÃO DE COMPENSAÇÃO (PERDCOMP)',
    subtitle: 'Ferramentas para análise e controle do PERDCOMP.',
    heroEyebrow: '',
    heroTitle: 'PERDCOMP',
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
        path: '/equipe/dev/perdcomp/dashboard',
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
        path: '/equipe/dev/controle-perdcomp',
        sopUrl:
          'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/controle-perdcomp',
        title: DEV_NAV_LABELS.controlePerdcomp,
      },
    ],
  },
  gerenciarDados: {
    label: DEV_NAV_LABELS.gerenciarDados,
    landingPath: '/equipe/dev/gerenciar-dados',
    landingDescription:
      'Área para importar, limpar e gerenciar dados das tabelas de cliente e contribuinte e para acompanhar dashboards ligados a essas rotinas.',
    landingIcon: Database,
    title: 'GERENCIAR DADOS',
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
        path: '/equipe/dev/carregar-dados',
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
        path: '/equipe/dev/gerenciar-dados/dashboards',
        title: DEV_NAV_LABELS.dashboardsGerenciarDados,
      },
    ],
  },
  planejamentoTributario: {
    label: DEV_NAV_LABELS.planejamentoTributario,
    landingPath: '/equipe/dev/planejamento-tributario',
    landingDescription:
      'Área do estudo de Planejamento Tributário rural: importar o papel de trabalho preenchido, conferir o que o sistema leu dele e acompanhar as revisões de cada estudo.',
    landingIcon: Sprout,
    title: 'PLANEJAMENTO TRIBUTÁRIO',
    subtitle: 'Ferramentas do estudo de Planejamento Tributário rural.',
    heroEyebrow: '',
    heroTitle: 'Planejamento Tributário',
    heroDescription:
      'Use esta área para trabalhar o estudo que compara como o produtor rural explora a fazenda: como pessoa física, em parceria com a pessoa jurídica dele, ou tudo dentro da pessoa jurídica. O estudo nasce numa planilha, o papel de trabalho, e é dela que saem os números da apresentação entregue ao cliente.',
    heroIcon: LayoutGrid,
    options: [
      {
        badge: 'Fiscal',
        description:
          'Escolha o papel de trabalho preenchido e confira o que o sistema entendeu dele antes de gravar: o cabeçalho do estudo, quanto entrou de cada bloco, os anos e cenários encontrados, e o que a leitura reclamou.',
        highlights: [
          'Leitura no navegador: o arquivo não sai daqui antes da confirmação',
          'Impedimento e aviso separados, com o endereço da célula de cada um',
          'Régua da leitura gravada em cada revisão',
        ],
        icon: FileSpreadsheet,
        path: '/equipe/dev/planejamento-tributario/papel-de-trabalho',
        title: DEV_NAV_LABELS.papelDeTrabalho,
      },
    ],
  },
};
