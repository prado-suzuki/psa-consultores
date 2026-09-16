import { TELAS_DO_DEV } from '@/config/telasDoDigitalDev';

/**
 * Os rótulos do menu e dos cards do Digital Dev.
 *
 * NÃO É MAIS UMA FONTE, é uma vista: cada rótulo é o `titulo` da tela no
 * registro `telasDoDigitalDev`, que também alimenta o H1 da página. Antes eram
 * duas listas independentes, e elas divergiram — o menu dizia "Apuração
 * Tributária" e a página dizia "Apuração PIS/COFINS", o card dizia "EFD ICMS/IPI"
 * e a página dizia "Consulta EFD ICMS".
 *
 * O nome do export foi mantido porque quatro arquivos já o consomem, e trocar o
 * nome não acrescentaria nada: o que precisava mudar era a origem do valor.
 */
export const DEV_NAV_LABELS = {
  // Top-level
  inicio: TELAS_DO_DEV.inicio.titulo,
  novaFerramenta: TELAS_DO_DEV.novaFerramenta.titulo,
  consultaXmls: TELAS_DO_DEV.consultaXmls.titulo,

  // Consulta SPED group
  consultaSped: TELAS_DO_DEV.consultaSped.titulo,
  efdContribuicoes: TELAS_DO_DEV.efdContribuicoes.titulo,
  efdIcms: TELAS_DO_DEV.efdIcms.titulo,
  ecd: TELAS_DO_DEV.ecd.titulo,
  ecf: TELAS_DO_DEV.ecf.titulo,

  // Levantamento PIS/COFINS group
  levantamentoPisCofins: TELAS_DO_DEV.levantamentoPisCofins.titulo,
  mapaNCMs: TELAS_DO_DEV.mapaNCMs.titulo,
  apuracaoTributaria: TELAS_DO_DEV.apuracaoPisCofins.titulo,
  analiseCruzada: TELAS_DO_DEV.analiseCruzada.titulo,
  revisaoRegistrosEfd: TELAS_DO_DEV.correcoesEfdContribuicoes.titulo,

  // Análise ICMS group
  analiseIcms: TELAS_DO_DEV.analiseIcms.titulo,
  icmsSaidas: TELAS_DO_DEV.icmsSaidas.titulo,
  difalInteligente: TELAS_DO_DEV.difalInteligente.titulo,

  // After SPED
  perdcomp: TELAS_DO_DEV.perdcomp.titulo,
  dashboardPerdcomp: TELAS_DO_DEV.dashboardPerdcomp.titulo,
  calculadoraIbsCbs: TELAS_DO_DEV.calculadoraIbsCbs.titulo,
  controlePerdcomp: TELAS_DO_DEV.controlePerdcomp.titulo,
  controleBalancetes: TELAS_DO_DEV.controleBalancetes.titulo,
  procedimentos: TELAS_DO_DEV.procedimentos.titulo,
  gerenciarDados: TELAS_DO_DEV.gerenciarDados.titulo,
  carregarDados: TELAS_DO_DEV.carregarDados.titulo,
  dashboardsGerenciarDados: TELAS_DO_DEV.dashboardsGerenciarDados.titulo,

  // Planejamento Tributário group
  planejamentoTributario: TELAS_DO_DEV.planejamentoTributario.titulo,
  papelDeTrabalho: TELAS_DO_DEV.papelDeTrabalho.titulo,
  geradorDeSlides: TELAS_DO_DEV.geradorDeSlides.titulo,
} as const;
