// Cálculo ROI determinístico — Fase 5.1
// Pure function: dado o snapshot do banco, retorna todos os KPIs do Dashboard.
// Reutilizado por: DashboardRoiPage, WizardRoi (preview), SetorEvolucaoPage, snapshots.

import type {
  Processo, Projeto, Etapa, Responsavel, Sistema, Gargalo, Melhoria, FrequenciaProcesso,
} from '../types';
import { melhoriaIdsDoProcesso } from './gargaloMelhorias';

// Multiplicador anual derivado da frequência declarada do processo.
// 'Anual' = 1 execução/ano (volumes já são anuais).
const FATOR_ANUAL: Record<FrequenciaProcesso, number> = {
  'Diária': 252,
  'Semanal': 52,
  'Quinzenal': 26,
  'Mensal': 12,
  'Trimestral': 4,
  'Anual': 1,
};

export function execucoesAnuais(p: Pick<Processo, 'frequency'>): number {
  if (p.frequency && FATOR_ANUAL[p.frequency]) return FATOR_ANUAL[p.frequency];
  return 0;
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
  roiPercentual: number;
  paybackMeses: number;
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

export interface RoiAgregado {
  porProcesso: RoiProcesso[];
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
  roiPercentual: number;
  paybackMeses: number;
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
      // Se temos o responsável no cadastro, respeita o custo cadastrado — inclusive zero
      // (recurso externo / cliente). Só usa o custo médio como fallback se o vínculo
      // não puder ser resolvido (ex.: responsável deletado mas ainda referenciado).
      const resp = rid ? respById.get(rid) : undefined;
      const ch = resp ? resp.hourly_rate : custoHoraMedio;
      h += horas;
      c += horas * ch;
    }
    return { h, c };
  };

  for (const e of etapasDoProc) {
    const f = e.ficou; // null/undefined quando não há projeção salva
    const volEra = e.volume_per_process || 1;
    const volFicou = (f?.volume_per_process ?? e.volume_per_process) || 1;

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
  // Fração (0–1) do custo do sistema atribuída ao cluster do processo.
  // Default 1 (100%) quando o sistema não tem rateio definido para este cluster.
  const fracCluster = (s: Sistema) => {
    if (!clusterDoProcesso) return 1;
    const m = (s.clustersRateio || []).find(c => c.cluster === clusterDoProcesso);
    const pct = m && m.rateio != null ? m.rateio : 100;
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
  const investTreinamentoMelhorias = melhoriasRelevantes.reduce((s, m) => s + ((m.training_hours || 0) * custoHoraTreino) * rateioMelhoria(m), 0);
  const investExecucaoMelhorias = melhoriasRelevantes.reduce((s, m) => {
    const horasExec = (m.executadoPor || []).reduce((acc, r) => {
      const ch = (r.responsavelId && respById.get(r.responsavelId)?.hourly_rate) || custoHoraMedio;
      return acc + (r.horas || 0) * ch;
    }, 0);
    return s + horasExec * rateioMelhoria(m);
  }, 0);
  const investExterno = melhoriasRelevantes.reduce((s, m) => s + (m.one_time_external_cost || 0) * rateioMelhoria(m), 0);
  // Implantação interna (horas de quem desenvolve o sistema) é rateada na MELHORIA
  // (melhoria.executadoPor), não no sistema. Mantido como 0 para o breakdown.
  const investSistemas = 0;

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
  const roiPercentual = investimento > 0 ? (economiaAnual / investimento) * 100 : 0;
  const paybackMeses = economiaMensal > 0 ? investimento / economiaMensal : 0;

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
    roiPercentual,
    paybackMeses,
  };
}

export function calcularRoi(input: RoiInput): RoiAgregado {
  const respById = new Map(input.responsaveis.map(r => [r.id, r]));
  const custoHoraMedioVal = custoMedioHora(input.responsaveis);
  const projetoById = new Map((input.projetos || []).map(p => [p.id, p]));

  // Abrangência de cada melhoria = nº de processos que ela atende. Usado para
  // ratear o custo único da melhoria (sem multiplicar no somatório).
  const abrangenciaMelhorias = new Map<string, number>();
  for (const p of input.processos) {
    for (const id of melhoriasRelevantesIds(p, input.gargalos, input.melhorias)) {
      abrangenciaMelhorias.set(id, (abrangenciaMelhorias.get(id) ?? 0) + 1);
    }
  }

  // Idem para sistemas: nº de processos que usam cada sistema (era/ficou), para
  // ratear o custo recorrente único entre eles.
  const usoSistemaEra = new Map<string, number>();
  const usoSistemaFicou = new Map<string, number>();
  for (const p of input.processos) {
    const refs = sistemasRefsDoProcesso(p, input.etapas, input.gargalos, input.melhorias);
    for (const s of input.sistemas) {
      if (refs.era.has(s.id) || refs.era.has(s.nome)) usoSistemaEra.set(s.id, (usoSistemaEra.get(s.id) ?? 0) + 1);
      if (refs.ficou.has(s.id) || refs.ficou.has(s.nome)) usoSistemaFicou.set(s.id, (usoSistemaFicou.get(s.id) ?? 0) + 1);
    }
  }

  const porProcesso = input.processos.map(p => {
    const cluster = (p.project_id && projetoById.get(p.project_id)?.clusterName) || '';
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
  const economiaAnual = sum('economiaAnual');
  const economiaMensal = economiaAnual / 12;
  const roiPercentual = investimentoTotal > 0 ? (economiaAnual / investimentoTotal) * 100 : 0;
  const paybackMeses = economiaMensal > 0 ? investimentoTotal / economiaMensal : 0;

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
    roiPercentual,
    paybackMeses,
  };
}
