import {
  BarChart3,
  BookOpen,
  BookText,
  Calculator,
  Database,
  FileStack,
  FileText,
  GitCompare,
  LayoutGrid,
  Map,
  Receipt,
  Sparkles,
  Truck,
  Upload,
  Wrench,
} from "lucide-react";
import { DEV_NAV_LABELS } from "@/constants/devNavLabels";
import type { DevHubDefinition } from "@/types/devHub";

export const DEV_HUBS: Record<
  "consultaSped" | "levantamentoPisCofins" | "analiseIcms" | "perdcomp" | "gerenciarDados",
  DevHubDefinition
> = {
  consultaSped: {
    label: DEV_NAV_LABELS.consultaSped,
    landingPath: "/equipe/dev/consulta-sped",
    landingDescription:
      "Area para localizar arquivos do Sistema Publico de Escrituracao Digital, filtrar por contribuinte e periodo, baixar os arquivos originais e abrir a leitura detalhada de cada entrega.",
    landingIcon: Receipt,
    title: "CONSULTA DOS ARQUIVOS SPEDs DO CLIENTE",
    subtitle: "Ferramentas para consulta, download e analise dos SPEDs fiscais.",
    heroEyebrow: "",
    heroTitle: "CONSULTA DOS ARQUIVOS SPEDs DO CLIENTE",
    heroDescription:
      "Use esta area para consultar arquivos da Escrituracao Fiscal Digital das Contribuicoes (EFD Contribuicoes), da Escrituracao Fiscal Digital do Imposto sobre Circulacao de Mercadorias e Servicos (ICMS) e do Imposto sobre Produtos Industrializados (IPI) (EFD ICMS/IPI), da Escrituracao Contabil Digital (ECD) e da Escrituracao Contabil Fiscal (ECF) no Sistema Publico de Escrituracao Digital (SPED).",
    heroIcon: LayoutGrid,
    options: [
      {
        badge: "Fiscal",
        description:
          "Consulte arquivos da Escrituracao Fiscal Digital das Contribuicoes, revise creditos do Programa de Integracao Social (PIS) e da Contribuicao para o Financiamento da Seguridade Social (COFINS) por periodo e abra a analise detalhada dos blocos e registros.",
        highlights: [
          "Busca por cliente, contribuinte e periodo",
          "Download individual ou em lote",
          "Analise de blocos e exportacao em Excel",
        ],
        icon: Receipt,
        path: "/equipe/dev/consulta-efd",
        sopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-contribuicoes/",
        title: DEV_NAV_LABELS.efdContribuicoes,
      },
      {
        badge: "Fiscal",
        description:
          "Consulte arquivos da Escrituracao Fiscal Digital do ICMS e do IPI, filtre por filial, acompanhe os valores apurados no periodo e exporte os arquivos selecionados.",
        highlights: [
          "Filtro adicional por filial",
          "Leitura de ICMS e de ICMS por Substituicao Tributaria (ICMS ST) apurados",
          "Download, selecao em lote e analise por arquivo",
        ],
        icon: FileText,
        path: "/equipe/dev/consulta-efd-icms",
        sopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-icms/",
        title: `${DEV_NAV_LABELS.efdIcms}/IPI`,
      },
      {
        badge: "Contabil",
        description:
          "Localize arquivos da Escrituracao Contabil Digital, confira a finalidade da entrega e abra a leitura detalhada dos registros de cada arquivo.",
        highlights: [
          "Consulta por contribuinte e periodo",
          "Identificacao da finalidade da ECD",
          "Download, exportacao e analise em tela",
        ],
        icon: BookOpen,
        path: "/equipe/dev/consulta-ecd",
        sopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECD/",
        title: DEV_NAV_LABELS.ecd,
      },
      {
        badge: "Fiscal",
        description:
          "Localize arquivos da Escrituracao Contabil Fiscal, identifique situacoes especiais da entrega e abra a leitura detalhada de cada arquivo encontrado.",
        highlights: [
          "Consulta por contribuinte e periodo",
          "Leitura de situacao especial da ECF",
          "Download, exportacao e analise em tela",
        ],
        icon: BookText,
        path: "/equipe/dev/consulta-ecf",
        sopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECF/",
        title: DEV_NAV_LABELS.ecf,
      },
    ],
  },
  levantamentoPisCofins: {
    label: DEV_NAV_LABELS.levantamentoPisCofins,
    landingPath: "/equipe/dev/levantamento-pis-cofins",
    landingDescription:
      "Area do levantamento de credito para parametrizar regras fiscais, apurar contribuicoes, reconciliar bases e revisar registros antes de consolidar o trabalho.",
    landingIcon: Calculator,
    title:
      "LEVANTAMENTO PROGRAMA DE INTEGRACAO SOCIAL (PIS) E CONTRIBUICAO PARA O FINANCIAMENTO DA SEGURIDADE SOCIAL (COFINS)",
    subtitle: "Escolha a ferramenta de cadastro de regras, apuracao, analise cruzada e revisao de registros.",
    heroEyebrow: "",
    heroTitle: "Levantamento PIS/COFINS",
    heroDescription:
      "Use esta area para cadastrar regras, revisar apuracoes, comparar bases e corrigir registros relacionados ao Programa de Integracao Social (PIS) e a Contribuicao para o Financiamento da Seguridade Social (COFINS).",
    heroIcon: LayoutGrid,
    options: [
      {
        badge: "Regras",
        description:
          "Cadastre a base de regras fiscais por NCM, setor, Codigo de Situacao Tributaria (CST) e base legal para definir quando a operacao permite credito das contribuicoes.",
        highlights: [
          "Cadastro de regras por NCM",
          "Filtro por setor e permissao de credito",
          "Consulta, edicao e exclusao das regras",
        ],
        icon: Map,
        path: "/equipe/dev/mapa-ncm-pis-cofins",
        title: "Mapa de Nomenclatura Comum do Mercosul (NCMs)",
      },
      {
        badge: "Apuracao",
        description:
          "Consolide debitos, creditos, isencoes, exclusoes e rateios por periodo usando a Escrituracao Fiscal Digital das Contribuicoes (EFD Contribuicoes) ou balancete importado.",
        highlights: [
          "Modo Cliente com EFD ou Prado com Balancete",
          "Abas de resumo, debitos, creditos e apuracao",
          "Leitura mensal do saldo de PIS e COFINS",
        ],
        icon: Calculator,
        path: "/equipe/dev/apuracao-pis-cofins",
        title: DEV_NAV_LABELS.apuracaoTributaria,
      },
      {
        badge: "Auditoria",
        description:
          "Cruze balancete, Escrituracao Fiscal Digital das Contribuicoes (EFD Contribuicoes), Escrituracao Fiscal Digital do Imposto sobre Circulacao de Mercadorias e Servicos (ICMS) e do Imposto sobre Produtos Industrializados (IPI) (EFD ICMS/IPI) e arquivos Extensible Markup Language (XML) para localizar divergencias entre as bases fiscais e contabeis.",
        highlights: [
          "Reconcilacao entre bases fiscais e contabeis",
          "Leitura por abas conforme a fonte comparada",
          "Identificacao de diferencas por periodo e contribuinte",
        ],
        icon: GitCompare,
        path: "/equipe/dev/cruzamento-dados",
        title: DEV_NAV_LABELS.analiseCruzada,
      },
      {
        badge: "Revisao",
        description:
          "Revise registros da Escrituracao Fiscal Digital das Contribuicoes cruzando a EFD Contribuicoes com arquivos XML para preparar correcoes rastreaveis antes do ajuste.",
        highlights: [
          "Analise por registro e por periodo",
          "Busca por descricao, chave e NCM",
          "Envio e exportacao das correcoes apuradas",
        ],
        icon: Wrench,
        path: "/equipe/dev/correcoes-sped",
        title: "Revisao de Registros da Escrituracao Fiscal Digital das Contribuicoes (EFD Contribuicoes)",
      },
    ],
  },
  analiseIcms: {
    label: DEV_NAV_LABELS.analiseIcms,
    landingPath: "/equipe/dev/analise-icms",
    landingDescription:
      "Area para apurar saidas, revisar CFOP e substituicao tributaria e auditar a classificacao de produtos usada no processo de diferencial de aliquota.",
    landingIcon: Truck,
    title: "ANALISE DO IMPOSTO SOBRE CIRCULACAO DE MERCADORIAS E SERVICOS (ICMS)",
    subtitle: "Ferramentas para analise do ICMS das saidas e para analise do diferencial de aliquota (DIFAL).",
    heroEyebrow: "",
    heroTitle: "Analise ICMS",
    heroDescription:
      "Use esta area para analisar as saidas de ICMS e validar classificacoes tributarias usadas no calculo do DIFAL.",
    heroIcon: LayoutGrid,
    options: [
      {
        badge: "Analise",
        description:
          "Analise as saidas por periodo com visoes de apuracao, Codigo Fiscal de Operacoes e Prestacoes (CFOP), saidas e saidas com substituicao tributaria.",
        highlights: [
          "Abas Apuracao, CFOP, Saidas e Saidas ST",
          "Leitura de apuracao, CFOP e saidas ST",
          "Consulta por contribuinte e periodo",
        ],
        icon: Truck,
        path: "/equipe/dev/apuracao-difal/icms-saidas",
        title: DEV_NAV_LABELS.icmsSaidas,
      },
      {
        badge: "Analise",
        description:
          "Classifique produtos por Nomenclatura Comum do Mercosul (NCM), acompanhe pendencias e validacoes em sessao e sincronize as decisoes tributarias do processo de DIFAL.",
        highlights: [
          "Sessao de trabalho com pendencias e validados",
          "Validacao por produto, NCM, CFOP e aliquota",
          "Sincronizacao das decisoes e exportacao em Excel",
        ],
        icon: Sparkles,
        path: "/equipe/dev/processo-difal",
        sopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/difal-inteligente/",
        title: DEV_NAV_LABELS.difalInteligente,
      },
    ],
  },
  perdcomp: {
    label: DEV_NAV_LABELS.perdcomp,
    landingPath: "/equipe/dev/perdcomp",
    landingDescription:
      "Area com entradas separadas para a leitura analitica do painel e para a gestao operacional dos pedidos de restituicao, ressarcimento, reembolso e declaracao de compensacao.",
    landingIcon: BarChart3,
    title: "PEDIDO ELETRONICO DE RESTITUICAO, RESSARCIMENTO OU REEMBOLSO E DECLARACAO DE COMPENSACAO (PERDCOMP)",
    subtitle: "Ferramentas para analise e controle do PERDCOMP.",
    heroEyebrow: "",
    heroTitle: "PERDCOMP",
    heroDescription:
      "Use esta area para analisar graficos, indicadores e fazer o controle do Pedido Eletronico de Restituicao, Ressarcimento ou Reembolso e Declaracao de Compensacao (PERDCOMP).",
    heroIcon: LayoutGrid,
    options: [
      {
        badge: "Analitico",
        description:
          "Consulte indicadores consolidados de pedidos de restituicao, ressarcimento, declaracao de compensacao e saldos em acompanhamento.",
        highlights: [
          "Valores consolidados",
          "Filtros por periodo, cliente e status",
          "Leitura executiva do painel",
        ],
        icon: BarChart3,
        path: "/equipe/dev/perdcomp/dashboard",
        title: DEV_NAV_LABELS.dashboardPerdcomp,
      },
      {
        badge: "Operacional",
        description:
          "Acesse a rotina de consulta e atualizacao dos pedidos para registrar compensacoes, situacoes e pagamentos.",
        highlights: [
          "Consulta por cliente e contribuinte",
          "Gestao de pedidos e declaracoes",
          "Atualizacao de situacoes e pagamentos",
        ],
        icon: FileStack,
        path: "/equipe/dev/controle-perdcomp",
        sopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/controle-perdcomp",
        title: DEV_NAV_LABELS.controlePerdcomp,
      },
    ],
  },
  gerenciarDados: {
    label: DEV_NAV_LABELS.gerenciarDados,
    landingPath: "/equipe/dev/gerenciar-dados",
    landingDescription:
      "Area para importar, limpar e gerenciar dados das tabelas de cliente e contribuinte e para acompanhar dashboards ligados a essas rotinas.",
    landingIcon: Database,
    title: "GERENCIAR DADOS",
    subtitle: "Ferramentas para carga de dados e analise por dashboards.",
    heroEyebrow: "",
    heroTitle: "Gerenciar dados",
    heroDescription:
      "Use esta area para realizar a carga de dados das tabelas operacionais e consultar dashboards com indicadores das rotinas de gestao de dados.",
    heroIcon: LayoutGrid,
    options: [
      {
        badge: "Operacional",
        description:
          "Importe ou limpe registros das tabelas de cliente e contribuinte por ambiente, com suporte a templates CSV e carga complementar de PER/DCOMP e chamados.",
        highlights: [
          "Importacao via CSV para cliente e contribuinte",
          "Limpeza por ambiente (Desenvolvimento ou Producao)",
          "Carga complementar de PER/DCOMP e chamados",
        ],
        icon: Upload,
        path: "/equipe/dev/carregar-dados",
        title: DEV_NAV_LABELS.carregarDados,
      },
      {
        badge: "Analitico",
        description:
          "Acompanhe dashboards com indicadores de uso, envio e faturamento ligados as rotinas de gestao de dados.",
        highlights: [
          "Controle de uso e envio de documentos",
          "Selecao de dashboard por filtro",
          "Suporte futuro a multiplos dashboards",
        ],
        icon: BarChart3,
        path: "/equipe/dev/gerenciar-dados/dashboards",
        title: DEV_NAV_LABELS.dashboardsGerenciarDados,
      },
    ],
  },
};
