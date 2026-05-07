import {
  BarChart3,
  BookOpen,
  BookText,
  Calculator,
  FileStack,
  FileText,
  GitCompare,
  LayoutGrid,
  Map,
  Receipt,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";
import { DEV_NAV_LABELS } from "@/constants/devNavLabels";
import type { DevHubDefinition } from "@/types/devHub";

export const DEV_HUBS: Record<
  "consultaSped" | "levantamentoPisCofins" | "analiseIcms" | "perdcomp",
  DevHubDefinition
> = {
  consultaSped: {
    label: DEV_NAV_LABELS.consultaSped,
    landingPath: "/equipe/dev/consulta-sped",
    landingDescription:
      "Area para localizar arquivos do Sistema Publico de Escrituracao Digital, filtrar por contribuinte e periodo, baixar os arquivos originais e abrir a leitura detalhada de cada entrega.",
    landingIcon: Receipt,
    title: "CONSULTA SISTEMA PUBLICO DE ESCRITURACAO DIGITAL",
    subtitle: "Escolha a ferramenta de consulta, download ou analise das escrituracoes digitais.",
    heroEyebrow: "Area SPED",
    heroTitle: "Consulta Sistema Público de Escrituração Digital",
    heroDescription:
      "Use esta area para consultar arquivos do Sistema Publico de Escrituracao Digital, incluindo Escrituracao Fiscal Digital das Contribuicoes, EFD ICMS/IPI, Escrituracao Contabil Digital e Escrituracao Contabil Fiscal.",
    heroIcon: LayoutGrid,
    options: [
      {
        badge: "Fiscal",
        description:
          "Consulte arquivos da Escrituracao Fiscal Digital das Contribuicoes, revise creditos de PIS e COFINS por periodo e abra a analise detalhada dos blocos e registros.",
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
          "Leitura de ICMS e ICMS ST apurados",
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
    title: "LEVANTAMENTO PIS/COFINS",
    subtitle: "Escolha a ferramenta de parametrizacao, apuracao, auditoria ou revisao do levantamento.",
    heroEyebrow: "Area PIS/COFINS",
    heroTitle: "Levantamento PIS/COFINS",
    heroDescription:
      "Use esta area para parametrizar e revisar creditos de Programa de Integracao Social (PIS) e Contribuicao para o Financiamento da Seguridade Social (COFINS), da regra fiscal ate a revisao final dos registros.",
    heroIcon: LayoutGrid,
    options: [
      {
        badge: "Regras",
        description:
          "Mantenha a base de regras fiscais por NCM, setor, CST e base legal para definir quando a operacao permite credito das contribuicoes.",
        highlights: [
          "Cadastro de regras por NCM",
          "Filtro por setor e permissao de credito",
          "Consulta, edicao e exclusao das regras",
        ],
        icon: Map,
        path: "/equipe/dev/mapa-ncm-pis-cofins",
        title: DEV_NAV_LABELS.mapaNCMs,
      },
      {
        badge: "Apuracao",
        description:
          "Consolide debitos, creditos, isencoes, exclusoes e rateios por periodo usando Escrituracao Fiscal Digital das Contribuicoes ou balancete importado.",
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
          "Cruze balancete, Escrituracao Fiscal Digital das Contribuicoes, EFD ICMS e XMLs para localizar divergencias entre as bases fiscais e contabeis.",
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
          "Revise registros da Escrituracao Fiscal Digital das Contribuicoes cruzando EFD e XML para preparar correcoes rastreaveis antes do ajuste.",
        highlights: [
          "Analise por registro e por periodo",
          "Busca por descricao, chave e NCM",
          "Envio e exportacao das correcoes apuradas",
        ],
        icon: Wrench,
        path: "/equipe/dev/correcoes-sped",
        title: DEV_NAV_LABELS.revisaoRegistrosEfd,
      },
    ],
  },
  analiseIcms: {
    label: DEV_NAV_LABELS.analiseIcms,
    landingPath: "/equipe/dev/analise-icms",
    landingDescription:
      "Area para apurar saidas, revisar CFOP e substituicao tributaria e auditar a classificacao de produtos usada no processo de diferencial de aliquota.",
    landingIcon: Truck,
    title: "ANALISE ICMS",
    subtitle: "Escolha a ferramenta de apuracao ou auditoria das operacoes de ICMS.",
    heroEyebrow: "Area ICMS",
    heroTitle: "Analise ICMS",
    heroDescription:
      "Use esta area para apurar o Imposto sobre Circulacao de Mercadorias e Servicos (ICMS) nas saidas e validar classificacoes usadas no calculo do diferencial de aliquota (DIFAL).",
    heroIcon: LayoutGrid,
    options: [
      {
        badge: "Apuracao",
        description:
          "Analise o Imposto sobre Circulacao de Mercadorias e Servicos das saidas por periodo com visoes de apuracao, CFOP, saidas e saidas com substituicao tributaria.",
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
        badge: "Auditoria",
        description:
          "Classifique produtos por NCM, acompanhe pendencias e validacoes em sessao e sincronize as decisoes tributarias do processo de diferencial de aliquota.",
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
    title: "PERDCOMP",
    subtitle: "Escolha abaixo a ferramenta de analise ou a ferramenta operacional.",
    heroEyebrow: "Area PERDCOMP",
    heroTitle: "PERDCOMP",
    heroDescription:
      "Use esta area para acompanhar e controlar pedidos de restituicao, ressarcimento, reembolso e declaracao de compensacao.",
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
};
