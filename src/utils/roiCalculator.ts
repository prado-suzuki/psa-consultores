// Cálculo ROI determinístico — Fase 5.1
// Pure function: dado o snapshot do banco, retorna todos os KPIs do Dashboard.
// Reutilizado por: DashboardRoiPage, WizardRoi (preview), SetorEvolucaoPage, snapshots.

import type {
  Processo, Projeto, Etapa, Responsavel, Sistema, Gargalo, Melhoria,
} from '../types';
import { melhoriaIdsDoProcesso, gargalosDoProcesso } from './gargaloMelhorias';
import { execucoesAnuais } from './roiVolume';
import { processoCalculavel } from './processoCalculavel';

// Re-export para compatibilidade — execucoesAnuais foi movido para o módulo-folha
// `roiVolume` (quebra o ciclo com processoCalculavel). Importadores existentes
// (`import { execucoesAnuais } from '@/utils/roiCalculator'`) seguem funcionando.
export { execucoesAnuais } from './roiVolume';

// ---------------------------------------------------------------------------
// Guardas de razão (ROI / payback): retornam null quando a razão é indefinida
// (investimento ≈ 0) — NUNCA um 0/∞ falso. A UI renderiza null como
// "em construção". ROI negativo continua número (sinal real de cenário pior).
// ---------------------------------------------------------------------------
const EPS = 1e-9;

export function ratioRoi(economiaAnual: number, investimento: number): number | null {
  if (!(investimento > EPS)) return null;
  return (economiaAnual / investimento) * 100;
}

export function ratioPayback(economiaMensal: number, investimento: number): number | null {
  if (!(investimento > EPS)) return null;
  if (!(economiaMensal > EPS)) return null;
  return investimento / economiaMensal;
}

// ---------------------------------------------------------------------------
// Status da economia (Realizado vs Projetado) + Maturidade do processo.
// "Realizado" = melhoria de fato implementada (improvement_status 'Concluído').
// Tudo derivado de dados existentes — sem coluna nova no banco.
// ---------------------------------------------------------------------------
export type StatusEconomia = 'realizado' | 'emAndamento' | 'projetado' | 'sem-melhoria';

export interface MaturidadeProcesso {
  isMapeado: boolean;
  temDiagnostico: boolean;
  temCenarioFuturo: boolean;
  temInvestimento: boolean;
  implementado: boolean;
  /** Nº de fases preenchidas (0–5): mapeado, diagnóstico, cenário futuro, investimento, implementado. */
  nivel: 0 | 1 | 2 | 3 | 4 | 5;
  statusEconomia: StatusEconomia;
}

export interface MaturidadeEscopo {
  total: number;
  mapeados: number;
  comDiagnostico: number;
  comCenarioFuturo: number;
  comInvestimento: number;
  implementados: number;
  porStatusEconomia: Record<StatusEconomia, number>;
  /** Média do nível / 5, em %. Alimenta o banner "X% do escopo modelado". */
  completudePct: number;
}

// A economia nasce no PROCESSO (custoAnual − custoAnualFicou). O status de
// implementação vive na MELHORIA (M:N). Regra (Opção A): a economia do processo
// é "realizada" só quando há ≥1 melhoria vinculada e TODAS estão Concluído; se
// alguma está Concluído/Em progresso (mas não todas) → "emAndamento"; se há
// melhorias mas nenhuma avançou → "projetado"; sem melhoria → "sem-melhoria".
export function statusEconomiaProcesso(
  proc: Pick<Processo, 'id'>, melhorias: Melhoria[],
): StatusEconomia {
  const ids = melhoriaIdsDoProcesso(melhorias, proc.id);
  if (ids.size === 0) return 'sem-melhoria';
  const linked = melhorias.filter(m => ids.has(m.id));
  const concluida = (m: Melhoria) => m.improvement_status === 'Concluído';
  const andamento = (m: Melhoria) => m.improvement_status === 'Em progresso';
  if (linked.every(concluida)) return 'realizado';
  if (linked.some(m => concluida(m) || andamento(m))) return 'emAndamento';
  return 'projetado';
}

export function maturidadeProcesso(args: {
  proc: Processo;
  etapasDoProc: Etapa[];
  gargalos: Gargalo[];
  melhorias: Melhoria[];
  investimento: number;
}): MaturidadeProcesso {
  const { proc, etapasDoProc, gargalos, melhorias, investimento } = args;
  const isMapeado = etapasDoProc.length > 0 && execucoesAnuais(proc) > 0;
  const temGargalo = gargalosDoProcesso(gargalos, proc.id).length > 0;
  const temQualidade = etapasDoProc.some(e => (e.error_rate ?? 0) > 0 || (e.rework_rate ?? 0) > 0);
  const temDiagnostico = temGargalo || temQualidade;
  const temCenarioFuturo = etapasDoProc.some(e => e.ficou != null);
  const temInvestimento = investimento > EPS;
  const statusEconomia = statusEconomiaProcesso(proc, melhorias);
  const implementado = statusEconomia === 'realizado';
  // nivel = nº de fases preenchidas (contagem, não escada estrita) — o dado é
  // não-monotônico (investimento fica vazio mesmo em melhorias concluídas), então
  // contar gates verdadeiros é mais justo e bate com os ✓ do heatmap.
  const gates = [isMapeado, temDiagnostico, temCenarioFuturo, temInvestimento, implementado];
  const nivel = gates.filter(Boolean).length as MaturidadeProcesso['nivel'];
  return { isMapeado, temDiagnostico, temCenarioFuturo, temInvestimento, implementado, nivel, statusEconomia };
}

export function maturidadeEscopo(mats: MaturidadeProcesso[]): MaturidadeEscopo {
  const porStatusEconomia: Record<StatusEconomia, number> = {
    realizado: 0, emAndamento: 0, projetado: 0, 'sem-melhoria': 0,
  };
  let mapeados = 0, comDiagnostico = 0, comCenarioFuturo = 0, comInvestimento = 0, implementados = 0, somaNivel = 0;
  for (const m of mats) {
    if (m.isMapeado) mapeados += 1;
    if (m.temDiagnostico) comDiagnostico += 1;
    if (m.temCenarioFuturo) comCenarioFuturo += 1;
    if (m.temInvestimento) comInvestimento += 1;
    if (m.implementado) implementados += 1;
    porStatusEconomia[m.statusEconomia] += 1;
    somaNivel += m.nivel;
  }
  const total = mats.length;
  const completudePct = total ? Math.round((somaNivel / total) / 5 * 100) : 0;
  return { total, mapeados, comDiagnostico, comCenarioFuturo, comInvestimento, implementados, porStatusEconomia, completudePct };
}

interface CategoriaCusto {
  pessoas: number;
  sistemas: number;
  retrabalho: number;
  externo: number;
}

export interface RoiProcesso {
  processoId: string;
  processoNome: string;
  execucoesAnuais: number;
  horasPorExecucao: number;
  custoPorExecucao: number;
  horasAnual: number;
  custoAnual: number;
  horasAnualFicou: number;
  custoAnualFicou: number;
  taxaErroMedia: number;
  custoQualidade: number;
  taxaRetrabalhoMedia: number;
  taxaRetrabalhoFicouMedia: number;
  custosCategoria: CategoriaCusto;
  custosCategoriaFicou: CategoriaCusto;
  // Resultado financeiro (preenchido só quando temos cenário "ficou")
  economiaAnual: number;
  economiaMensal: number;
  horasLiberadas: number;
  // Investimento atribuído a este processo
  investimento: number;
  investimentoBreakdown: {
    treinamentoMelhorias: number;
    sistemas: number;
    execucaoMelhorias: number;
    externo: number;
  };
  // Partição Realizado vs Projetado (Opção A: gate pela conclusão das melhorias).
  statusEconomia: StatusEconomia;
  economiaRealizada: number;
  economiaEmAndamento: number;
  economiaProjetada: number;   // = economiaAnual − economiaRealizada
  investimentoRealizado: number;
  investimentoProjetado: number;
  // Razões: null quando indefinidas (investimento ≈ 0) → UI mostra "em construção".
  roiPercentual: number | null;
  paybackMeses: number | null;
  roiRealizado: number | null;
  roiProjetado: number | null;
  maturidade: MaturidadeProcesso;
}

export interface RoiInput {
  processos: Processo[];
  etapas: Etapa[];
  responsaveis: Responsavel[];
  sistemas: Sistema[];
  gargalos: Gargalo[];
  melhorias: Melhoria[];
  /** Necessário para resolver o cluster do processo no rateio de sistemas (Onda E). */
  projetos?: Projeto[];
}

/** Processo excluído do consolidado por dado obrigatório faltante (não-calculável).
 *  Não entra em NENHUM agregado — é listado como "em mapeamento". */
export interface ProcessoEmMapeamento {
  processoId: string;
  processoNome: string;
  camposFaltando: string[];
}

export interface RoiAgregado {
  porProcesso: RoiProcesso[];
  /** Processos NÃO-calculáveis (Como era incompleto) — fora dos somatórios. */
  emMapeamento: ProcessoEmMapeamento[];
  // KPIs globais (somatórios) — campos sintéticos da UI, não colunas de DB.
  custoAtualAno: number;
  custoFuturoAno: number;
  horasAtualAno: number;
  horasFuturoAno: number;
  economiaAnual: number;
  economiaMensal: number;
  horasLiberadas: number;
  taxaRetrabalhoAtual: number;
  taxaRetrabalhoFuturo: number;
  investimentoTotal: number;
  investimentoBreakdown: {
    treinamentoMelhorias: number;
    sistemas: number;
    execucaoMelhorias: number;
    externo: number;
  };
  custosCategoria: CategoriaCusto;
  custosCategoriaFicou: CategoriaCusto;
  economiaRealizada: number;
  economiaEmAndamento: number;
  economiaProjetada: number;
  investimentoRealizado: number;
  investimentoProjetado: number;
  roiPercentual: number | null;
  paybackMeses: number | null;
  roiRealizado: number | null;
  roiProjetado: number | null;
  maturidade: MaturidadeEscopo;
}

const zeroCategoria = (): CategoriaCusto => ({ pessoas: 0, sistemas: 0, retrabalho: 0, externo: 0 });

function custoMedioHora(responsaveis: Responsavel[]): number {
  if (!responsaveis.length) return 0;
  const total = responsaveis.reduce((s, r) => s + (r.hourly_rate || 0), 0);
  return total / responsaveis.length;
}

// Melhorias relevantes a um processo: vínculo DIRETO melhoria↔processo
// (melhoria_processos). Sem dependência de gargalo. Fonte única usada tanto
// para contar a abrangência (rateio do investimento) quanto para selecionar as
// melhorias dentro de calcProcesso. O parâmetro `gargalos` é mantido por
// assinatura/compat, mas não participa mais da seleção.
function melhoriasRelevantesIds(proc: Processo, gargalos: Gargalo[], melhorias: Melhoria[]): Set<string> {
  const derivadas = melhoriaIdsDoProcesso(melhorias, proc.id);
  return new Set(melhorias.filter(m => derivadas.has(m.id)).map(m => m.id));
}

// Refs (id ou nome) dos sistemas usados por um processo, no cenário atual (era)
// e projetado (ficou = etapa.ficou.sistemas ∪ sistemas das melhorias relevantes).
// Fonte única usada para contar abrangência (rateio do custo) e para somar custo.
function sistemasRefsDoProcesso(
  proc: Processo, etapas: Etapa[], gargalos: Gargalo[], melhorias: Melhoria[],
): { era: Set<string>; ficou: Set<string> } {
  const era = new Set<string>();
  const ficou = new Set<string>();
  for (const e of etapas) {
    if (e.process_id !== proc.id) continue;
    (e.sistemas || []).forEach(s => era.add(s));
    (e.ficou?.sistemas ?? e.sistemas ?? []).forEach(s => ficou.add(s));
  }
  const relevantes = melhoriasRelevantesIds(proc, gargalos, melhorias);
  for (const m of melhorias) {
    if (relevantes.has(m.id)) (m.sistemas || []).forEach(s => ficou.add(s));
  }
  return { era, ficou };
}

function calcProcesso(
  proc: Processo,
  etapas: Etapa[],
  respById: Map<string, Responsavel>,
  sistemas: Sistema[],
  gargalos: Gargalo[],
  melhorias: Melhoria[],
  custoHoraMedio: number,
  clusterDoProcesso: string,
  // Quantos processos cada melhoria atinge (global). O custo de uma melhoria é
  // ÚNICO — rateado entre os processos que ela atende, nunca multiplicado.
  abrangenciaMelhorias: Map<string, number>,
  // Idem para sistemas: quantos processos usam cada sistema (era/ficou). O custo
  // recorrente do sistema é único e rateado entre os processos que o usam.
  usoSistemaEra: Map<string, number>,
  usoSistemaFicou: Map<string, number>,
): RoiProcesso {
  const ann = execucoesAnuais(proc);
  const etapasDoProc = etapas.filter(e => e.process_id === proc.id);

  let horasPorExec = 0;
  let custoPorExec = 0;
  let horasPorExecFicou = 0;
  let custoPorExecFicou = 0;
  let custoRetrabalhoPorExec = 0;
  let custoRetrabalhoPorExecFicou = 0;
  let somaTaxaErro = 0;
  let nTaxaErro = 0;
  let somaTaxaRetrab = 0;
  let somaTaxaRetrabFicou = 0;
  let nRetrab = 0;

  // Helper de soma (horas + custo) para um array de responsáveis de etapa.
  const sumResp = (arr: typeof etapasDoProc[number]['executadoPor'] | undefined) => {
    if (!arr) return { h: 0, c: 0 };
    let h = 0, c = 0;
    for (const r of arr) {
      const horas = r.horas ?? 0;
      const rid = r.responsavelId;
      // INVARIANTE: sem fallback de média. Só processos CALCULÁVEIS chegam aqui
      // (gated por processoCalculavel), então o responsável sempre resolve e o
      // custo cadastrado é respeitado — inclusive ZERO (externo/cliente grátis).
      // O else é inalcançável (vínculo quebrado torna o processo não-calculável).
      const resp = rid ? respById.get(rid) : undefined;
      const ch = resp ? resp.hourly_rate : 0;
      h += horas;
      c += horas * ch;
    }
    return { h, c };
  };

  for (const e of etapasDoProc) {
    const f = e.ficou; // null/undefined quando não há projeção salva
    // INVARIANTE: proibido assumir 1. Volume é obrigatório (gated pelo doutor).
    // ficou cai pro era (fallback #3, adiado junto com o critério "Como ficou").
    const volEra = e.volume_per_process ?? 0;
    const volFicou = f?.volume_per_process ?? e.volume_per_process ?? 0;

    const exeEra  = sumResp(e.executadoPor);
    const exeFic  = sumResp(f?.executadoPor ?? e.executadoPor);

    horasPorExec += exeEra.h * volEra;
    custoPorExec += exeEra.c * volEra;
    horasPorExecFicou += exeFic.h * volFicou;
    custoPorExecFicou += exeFic.c * volFicou;

    const taxaErr = e.error_rate ?? 0;
    if (taxaErr > 0) { somaTaxaErro += taxaErr; nTaxaErro += 1; }
    somaTaxaRetrab += e.rework_rate ?? 0;
    somaTaxaRetrabFicou += (f?.rework_rate ?? e.rework_rate ?? 0);
    nRetrab += 1;

    // Retrabalho proporcional ao custo real de pessoas da etapa (não à média global).
    // Após a Onda D, revisores viraram executores da etapa "Revisão de X" — o custo de
    // pessoas da etapa origem é só executadoPor.
    const custoPessoasEtapa = exeEra.c * volEra;
    const custoPessoasEtapaFicou = exeFic.c * volFicou;
    custoRetrabalhoPorExec += custoPessoasEtapa * (e.rework_rate ?? 0);
    custoRetrabalhoPorExecFicou += custoPessoasEtapaFicou * (f?.rework_rate ?? e.rework_rate ?? 0);
  }

  // Sistemas atuais (era): união de etapa.sistemas. Sistemas projetados (ficou):
  // união de etapa.ficou?.sistemas (fallback para era) + sistemas das melhorias.
  // Onda E: rateio (%) deixou de ser por (etapa, sistema) e passou a ser por
  // (cluster, sistema) — definido em sistema.clustersRateio. Resolvemos pelo
  // cluster do projeto deste processo.
  const { era: sistemasIdsEra, ficou: sistemasIdsFicou } =
    sistemasRefsDoProcesso(proc, etapas, gargalos, melhorias);
  const sistemasUsados = sistemas.filter(s => sistemasIdsEra.has(s.id) || sistemasIdsEra.has(s.nome));
  const sistemasUsadosFicou = sistemas.filter(s => sistemasIdsFicou.has(s.id) || sistemasIdsFicou.has(s.nome));
  // Fração (0–1) do custo do sistema atribuída ao cluster do processo. O custo
  // segue ESTRITAMENTE o rateio do CADASTRO do sistema (não o cluster da etapa):
  //  - sistema SEM rateio definido → 100% (fallback compat p/ dado não migrado);
  //  - sistema COM rateio → usa o % do cluster deste processo; se ele NÃO
  //    participa desse cluster (sem entrada), atribui 0 — não "vaza" custo pra
  //    um cluster onde o sistema não faz parte.
  const fracCluster = (s: Sistema) => {
    if (!clusterDoProcesso) return 1;
    const rateios = s.clustersRateio || [];
    if (rateios.length === 0) return 1;
    const m = rateios.find(c => c.cluster === clusterDoProcesso);
    const pct = m && m.rateio != null ? m.rateio : 0;
    return Math.max(0, Math.min(100, pct)) / 100;
  };
  // O custo recorrente de um sistema é único: a parcela do cluster (clustersRateio)
  // é dividida entre os processos que usam o sistema, para o somatório não
  // multiplicar o custo (mesmo princípio do rateio do custo de melhoria).
  const fracEra = (s: Sistema) => fracCluster(s) / Math.max(usoSistemaEra.get(s.id) ?? 1, 1);
  const fracFicou = (s: Sistema) => fracCluster(s) / Math.max(usoSistemaFicou.get(s.id) ?? 1, 1);
  // Apenas o custo MENSAL recorrente (custo_variavel_por_uso × 12) entra aqui, rateado.
  // O custo fixo/licença/setup é registrado como investimento via melhoria
  // (custoExternoUnico), então não entra no custo recorrente para evitar dupla
  // contagem. Era e Ficou: o "antes" inclui o mensal dos sistemas já usados.
  const custoSistemasAnual = sistemasUsados.reduce((sum, s) => sum + (s.custo_variavel_por_uso || 0) * 12 * fracEra(s), 0);
  const custoSistemasAnualFicou = sistemasUsadosFicou.reduce((sum, s) => sum + (s.custo_variavel_por_uso || 0) * 12 * fracFicou(s), 0);

  // Investimento atribuído a este processo
  const custoHoraTreino = custoHoraMedio;

  // Melhorias relevantes para este processo: vínculo direto via M:N + vínculo
  // indireto via gargalos do processo (uma melhoria que resolve um gargalo do
  // processo, mesmo sem estar associada explicitamente, conta no investimento).
  const relevantesIds = melhoriasRelevantesIds(proc, gargalos, melhorias);
  const melhoriasRelevantes = melhorias.filter(m => relevantesIds.has(m.id));
  // O custo de uma melhoria é único: quando ela atende N processos (direto ou
  // via gargalo), cada processo absorve apenas 1/N. Assim o somatório por
  // processo reconstrói o custo real da melhoria — sem multiplicar.
  const rateioMelhoria = (m: Melhoria) => 1 / Math.max(abrangenciaMelhorias.get(m.id) ?? 1, 1);
  // Implantação interna (horas de quem desenvolve o sistema) é rateada na MELHORIA
  // (melhoria.executadoPor), não no sistema. Mantido como 0 para o breakdown.
  const investSistemas = 0;
  // Partição do investimento pelo status DA PRÓPRIA melhoria: o custo de uma
  // melhoria já Concluído é "realizado" (gasto afundado), independente de a
  // economia do processo já ter sido toda capturada.
  let investTreinamentoMelhorias = 0;
  let investExecucaoMelhorias = 0;
  let investExterno = 0;
  let investimentoRealizado = 0;
  let investimentoProjetado = investSistemas; // mantém investimento = realizado + projetado
  for (const m of melhoriasRelevantes) {
    const r = rateioMelhoria(m);
    const treino = (m.training_hours || 0) * custoHoraTreino * r;
    const execucao = (m.executadoPor || []).reduce((acc, rr) => {
      const ch = (rr.responsavelId && respById.get(rr.responsavelId)?.hourly_rate) || custoHoraMedio;
      return acc + (rr.horas || 0) * ch;
    }, 0) * r;
    const externo = (m.one_time_external_cost || 0) * r;
    investTreinamentoMelhorias += treino;
    investExecucaoMelhorias += execucao;
    investExterno += externo;
    const mInvest = treino + execucao + externo;
    if (m.improvement_status === 'Concluído') investimentoRealizado += mInvest;
    else investimentoProjetado += mInvest;
  }

  const horasAnual = horasPorExec * ann;
  const horasAnualFicou = horasPorExecFicou * ann;
  const custoPessoasAnual = custoPorExec * ann;
  const custoPessoasAnualFicou = custoPorExecFicou * ann;
  const custoRetrabAnual = custoRetrabalhoPorExec * ann;
  const custoRetrabAnualFicou = custoRetrabalhoPorExecFicou * ann;
  const custoExternoAnual = 0; // externo é one-shot — entra no investimento, não no custo recorrente

  const custoAnual = custoPessoasAnual + custoSistemasAnual + custoRetrabAnual + custoExternoAnual;
  const custoAnualFicou = custoPessoasAnualFicou + custoSistemasAnualFicou + custoRetrabAnualFicou;

  // ROI pode ser negativo: se o cenário futuro custar mais que o atual, a
  // economia é negativa (não zeramos). Idem para horas liberadas.
  const economiaAnual = custoAnual - custoAnualFicou;
  const economiaMensal = economiaAnual / 12;
  const horasLiberadas = horasAnual - horasAnualFicou;

  const investimento = investTreinamentoMelhorias + investExecucaoMelhorias + investExterno + investSistemas;

  // Maturidade + status da economia (Realizado vs Projetado).
  const maturidade = maturidadeProcesso({ proc, etapasDoProc, gargalos, melhorias, investimento });
  const statusEconomia = maturidade.statusEconomia;
  // Opção A: economia realizada só quando todas as melhorias do processo estão Concluído.
  const economiaRealizada = statusEconomia === 'realizado' ? economiaAnual : 0;
  const economiaEmAndamento = statusEconomia === 'emAndamento' ? economiaAnual : 0;
  const economiaProjetada = economiaAnual - economiaRealizada; // invariante de 2 vias

  const roiPercentual = ratioRoi(economiaAnual, investimento);
  const paybackMeses = ratioPayback(economiaMensal, investimento);
  const roiRealizado = ratioRoi(economiaRealizada, investimentoRealizado);
  const roiProjetado = roiPercentual;

  return {
    processoId: proc.id,
    processoNome: proc.name,
    execucoesAnuais: ann,
    horasPorExecucao: horasPorExec,
    custoPorExecucao: custoPorExec,
    horasAnual,
    custoAnual,
    horasAnualFicou,
    custoAnualFicou,
    taxaErroMedia: nTaxaErro ? somaTaxaErro / nTaxaErro : 0,
    custoQualidade: custoRetrabAnual,
    taxaRetrabalhoMedia: nRetrab ? somaTaxaRetrab / nRetrab : 0,
    taxaRetrabalhoFicouMedia: nRetrab ? somaTaxaRetrabFicou / nRetrab : 0,
    custosCategoria: {
      pessoas: custoPessoasAnual,
      sistemas: custoSistemasAnual,
      retrabalho: custoRetrabAnual,
      externo: custoExternoAnual,
    },
    custosCategoriaFicou: {
      pessoas: custoPessoasAnualFicou,
      sistemas: custoSistemasAnualFicou,
      retrabalho: custoRetrabAnualFicou,
      externo: 0,
    },
    economiaAnual,
    economiaMensal,
    horasLiberadas,
    investimento,
    investimentoBreakdown: {
      treinamentoMelhorias: investTreinamentoMelhorias,
      sistemas: investSistemas,
      execucaoMelhorias: investExecucaoMelhorias,
      externo: investExterno,
    },
    statusEconomia,
    economiaRealizada,
    economiaEmAndamento,
    economiaProjetada,
    investimentoRealizado,
    investimentoProjetado,
    roiPercentual,
    paybackMeses,
    roiRealizado,
    roiProjetado,
    maturidade,
  };
}

export function calcularRoi(input: RoiInput): RoiAgregado {
  const respById = new Map(input.responsaveis.map(r => [r.id, r]));
  const custoHoraMedioVal = custoMedioHora(input.responsaveis);
  const projetoById = new Map((input.projetos || []).map(p => [p.id, p]));

  // Critério de entrada no Dashboard ROI = doutor (dados completos, sem fallback)
  // E status do projeto ≠ 'Mapeamento'. Quem não passa fica FORA de TODOS os
  // agregados (em mapeamento) — nunca com número fabricado.
  const emMapeamento: ProcessoEmMapeamento[] = [];
  const calculaveis: Processo[] = [];
  for (const p of input.processos) {
    const vd = processoCalculavel(p, input.etapas, input.responsaveis);
    const proj = p.project_id ? projetoById.get(p.project_id) : undefined;
    const projetoEmMapeamento = proj?.status === 'Mapeamento';
    if (!vd.ok || projetoEmMapeamento) {
      const camposFaltando = projetoEmMapeamento ? [...vd.faltando, 'Projeto em mapeamento'] : vd.faltando;
      emMapeamento.push({ processoId: p.id, processoNome: p.name, camposFaltando });
      continue;
    }
    calculaveis.push(p);
  }

  // Abrangência/uso (denominador do rateio de custo ÚNICO) contam APENAS os
  // processos calculáveis — quem está "em mapeamento" não soma custo, então
  // incluí-lo no denominador subestimaria o custo compartilhado reconstruído.
  const abrangenciaMelhorias = new Map<string, number>();
  for (const p of calculaveis) {
    for (const id of melhoriasRelevantesIds(p, input.gargalos, input.melhorias)) {
      abrangenciaMelhorias.set(id, (abrangenciaMelhorias.get(id) ?? 0) + 1);
    }
  }
  const usoSistemaEra = new Map<string, number>();
  const usoSistemaFicou = new Map<string, number>();
  for (const p of calculaveis) {
    const refs = sistemasRefsDoProcesso(p, input.etapas, input.gargalos, input.melhorias);
    for (const s of input.sistemas) {
      if (refs.era.has(s.id) || refs.era.has(s.nome)) usoSistemaEra.set(s.id, (usoSistemaEra.get(s.id) ?? 0) + 1);
      if (refs.ficou.has(s.id) || refs.ficou.has(s.nome)) usoSistemaFicou.set(s.id, (usoSistemaFicou.get(s.id) ?? 0) + 1);
    }
  }

  const porProcesso: RoiProcesso[] = calculaveis.map((p) => {
    const proj = p.project_id ? projetoById.get(p.project_id) : undefined;
    const cluster = proj?.clusterName || '';
    return calcProcesso(p, input.etapas, respById, input.sistemas, input.gargalos, input.melhorias, custoHoraMedioVal, cluster, abrangenciaMelhorias, usoSistemaEra, usoSistemaFicou);
  });

  const sum = <K extends keyof RoiProcesso>(k: K, src = porProcesso): number =>
    src.reduce((s, p) => s + (Number(p[k]) || 0), 0);
  const sumCat = (key: 'custosCategoria' | 'custosCategoriaFicou') => {
    const acc = zeroCategoria();
    for (const p of porProcesso) {
      for (const k of Object.keys(acc) as (keyof CategoriaCusto)[]) {
        acc[k] += p[key][k];
      }
    }
    return acc;
  };

  const investimentoTotal = sum('investimento');
  const investimentoRealizado = sum('investimentoRealizado');
  const investimentoProjetado = sum('investimentoProjetado');
  const economiaAnual = sum('economiaAnual');
  const economiaRealizada = sum('economiaRealizada');
  const economiaEmAndamento = sum('economiaEmAndamento');
  const economiaProjetada = sum('economiaProjetada');
  const economiaMensal = economiaAnual / 12;
  const roiPercentual = ratioRoi(economiaAnual, investimentoTotal);
  const paybackMeses = ratioPayback(economiaMensal, investimentoTotal);
  const roiRealizado = ratioRoi(economiaRealizada, investimentoRealizado);
  const roiProjetado = roiPercentual;
  const maturidade = maturidadeEscopo(porProcesso.map(p => p.maturidade));

  const invBd = porProcesso.reduce((acc, p) => ({
    treinamentoMelhorias: acc.treinamentoMelhorias + p.investimentoBreakdown.treinamentoMelhorias,
    sistemas: acc.sistemas + p.investimentoBreakdown.sistemas,
    execucaoMelhorias: acc.execucaoMelhorias + p.investimentoBreakdown.execucaoMelhorias,
    externo: acc.externo + p.investimentoBreakdown.externo,
  }), { treinamentoMelhorias: 0, sistemas: 0, execucaoMelhorias: 0, externo: 0 });

  const horasAtualAno = sum('horasAnual');
  const horasFuturoAno = sum('horasAnualFicou');

  return {
    porProcesso,
    emMapeamento,
    custoAtualAno: sum('custoAnual'),
    custoFuturoAno: sum('custoAnualFicou'),
    horasAtualAno,
    horasFuturoAno,
    economiaAnual,
    economiaMensal,
    horasLiberadas: horasAtualAno - horasFuturoAno,
    taxaRetrabalhoAtual: porProcesso.length ? sum('taxaRetrabalhoMedia') / porProcesso.length : 0,
    taxaRetrabalhoFuturo: porProcesso.length ? sum('taxaRetrabalhoFicouMedia') / porProcesso.length : 0,
    investimentoTotal,
    investimentoBreakdown: invBd,
    custosCategoria: sumCat('custosCategoria'),
    custosCategoriaFicou: sumCat('custosCategoriaFicou'),
    economiaRealizada,
    economiaEmAndamento,
    economiaProjetada,
    investimentoRealizado,
    investimentoProjetado,
    roiPercentual,
    paybackMeses,
    roiRealizado,
    roiProjetado,
    maturidade,
  };
}
