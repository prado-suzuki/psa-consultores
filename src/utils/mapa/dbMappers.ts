// Mappers DB ↔ MAPA — convertem entre o schema EN snake_case das tabelas
// reaproveitadas (projects, processes, process_stages, process_improvements,
// job_roles, process_scenarios) e os tipos do MAPA (camelCase em português).
//
// Aplicado depois da migration 20260603100000_mapa_rename_pt_to_en.sql que
// padronizou as colunas adicionadas pela integração para inglês — alinhando
// com o schema original das tabelas.
//
// Tabelas inteiramente NOVAS do MAPA (documentos_processo, sistemas_processo,
// gargalos, cascata_eventos, melhoria_*, etc.) NÃO usam estes mappers — lá o
// DB já está em PT e o mapeamento é só snake_case ↔ camelCase trivial.

import type {
  Projeto, Processo, Etapa, EtapaFicou, Responsavel, Melhoria, ProcessSnapshot,
  ProjetoStatus, FrequenciaProcesso, StatusAvaliacao, Complexidade, MelhoriaStatus,
} from '@/types';

type DbRow = Record<string, unknown>;

// ════════════════════════════════════════════════════════════════════════
//   projects ↔ Projeto
// ════════════════════════════════════════════════════════════════════════

export function projetoFromDb(r: DbRow): Projeto {
  return {
    id:             String(r.id ?? ''),
    nome:           String(r.name ?? ''),
    descricao:      String(r.description ?? ''),
    cluster:        (r.cluster_id as string | undefined) ?? undefined,
    projetosPorAno: r.projects_per_year != null ? Number(r.projects_per_year) : undefined,
    dataInicio:     (r.start_date as string | undefined) ?? undefined,
    dataFim:        (r.end_date as string | undefined)   ?? undefined,
    status:         (r.status as ProjetoStatus | undefined) ?? undefined,
    // justificativas vive em tabela auxiliar (projeto_justificativas) e é
    // hidratada por outra query — não vem direto na row de projects.
  };
}

export function projetoToDb(p: Partial<Projeto>): DbRow {
  const out: DbRow = {};
  if (p.nome !== undefined)           out.name              = p.nome;
  if (p.descricao !== undefined)      out.description       = p.descricao;
  if (p.cluster !== undefined)        out.cluster_id        = p.cluster ?? null;
  if (p.projetosPorAno !== undefined) out.projects_per_year = p.projetosPorAno ?? null;
  if (p.dataInicio !== undefined)     out.start_date        = p.dataInicio ?? null;
  if (p.dataFim !== undefined)        out.end_date          = p.dataFim ?? null;
  if (p.status !== undefined)         out.status            = p.status ?? null;
  return out;
}


// ════════════════════════════════════════════════════════════════════════
//   processes ↔ Processo
// ════════════════════════════════════════════════════════════════════════

export function processoFromDb(r: DbRow): Processo {
  return {
    id:               String(r.id ?? ''),
    nome:             String(r.name ?? ''),
    descricao:        String(r.description ?? ''),
    projetoId:        (r.project_id as string | undefined) ?? undefined,
    ordem:            r.order_index != null ? Number(r.order_index) : undefined,
    entregavel:       (r.deliverable as string | undefined) ?? undefined,
    statusAvaliacao:  (r.evaluation_status as StatusAvaliacao | undefined) ?? undefined,
    horasTreinamento: r.training_hours != null ? Number(r.training_hours) : undefined,
    mapeadoEm:        (r.mapped_at as string | undefined) ?? undefined,
    frequencia:       (r.frequency as FrequenciaProcesso | undefined) ?? undefined,
    complexidade:     (r.complexity_level as Complexidade | undefined) ?? undefined,
  };
}

export function processoToDb(p: Partial<Processo>): DbRow {
  const out: DbRow = {};
  if (p.nome !== undefined)             out.name              = p.nome;
  if (p.descricao !== undefined)        out.description       = p.descricao;
  if (p.projetoId !== undefined)        out.project_id        = p.projetoId ?? null;
  if (p.ordem !== undefined)            out.order_index       = p.ordem ?? null;
  if (p.entregavel !== undefined)       out.deliverable       = p.entregavel ?? null;
  if (p.statusAvaliacao !== undefined)  out.evaluation_status = p.statusAvaliacao ?? null;
  if (p.horasTreinamento !== undefined) out.training_hours    = p.horasTreinamento ?? null;
  if (p.mapeadoEm !== undefined)        out.mapped_at         = p.mapeadoEm ?? null;
  if (p.frequencia !== undefined)       out.frequency         = p.frequencia ?? null;
  if (p.complexidade !== undefined)     out.complexity_level  = p.complexidade ?? null;
  return out;
}


// ════════════════════════════════════════════════════════════════════════
//   process_stages ↔ Etapa (AS-IS) / EtapaFicou (TO-BE)
// ════════════════════════════════════════════════════════════════════════

export function etapaFromDb(r: DbRow): Etapa {
  return {
    id:                 String(r.id ?? ''),
    nome:               String(r.name ?? ''),
    descricao:          String(r.description ?? ''),
    processoId:         String(r.process_id ?? ''),
    execucao:           String(r.execution ?? ''),
    docsEntrada:        [],
    docsSaida:          [],
    executadoPor:       [],
    sistemas:           [],
    volumeMensal:       0,
    volumePorProcesso:  r.volume_per_process != null ? Number(r.volume_per_process) : undefined,
    leadTimeDias:       r.lead_time_days != null ? Number(r.lead_time_days) : undefined,
    taxaErros:          r.error_rate != null ? Number(r.error_rate) : undefined,
    taxaRetrabalho:     Number(r.rework_rate ?? 0),
    custoErro:          r.error_cost != null ? Number(r.error_cost) : undefined,
    volumeErros:        r.error_volume != null ? Number(r.error_volume) : undefined,
    ordem:              r.stage_order != null ? Number(r.stage_order) : undefined,
  };
}

export function etapaToDb(e: Partial<Etapa>, opts?: { scenario?: 'AS-IS' | 'TO-BE'; stageAsIsId?: string }): DbRow {
  const out: DbRow = {};
  if (e.id !== undefined)                 out.id                  = e.id;
  if (e.nome !== undefined)               out.name                = e.nome;
  if (e.descricao !== undefined)          out.description         = e.descricao;
  if (e.processoId !== undefined)         out.process_id          = e.processoId;
  if (e.execucao !== undefined)           out.execution           = e.execucao;
  if (e.volumePorProcesso !== undefined)  out.volume_per_process  = e.volumePorProcesso ?? null;
  if (e.leadTimeDias !== undefined)       out.lead_time_days      = e.leadTimeDias ?? null;
  if (e.taxaErros !== undefined)          out.error_rate          = e.taxaErros ?? null;
  if (e.taxaRetrabalho !== undefined)     out.rework_rate         = e.taxaRetrabalho ?? null;
  if (e.custoErro !== undefined)          out.error_cost          = e.custoErro ?? null;
  if (e.volumeErros !== undefined)        out.error_volume        = e.volumeErros ?? null;
  if (e.ordem !== undefined)              out.stage_order         = e.ordem ?? null;
  if (opts?.scenario)                     out.scenario            = opts.scenario;
  if (opts?.stageAsIsId !== undefined)    out.stage_as_is_id      = opts.stageAsIsId ?? null;
  return out;
}

export function etapaFicouToDb(f: Partial<EtapaFicou>): DbRow {
  // O TO-BE compartilha o ID do AS-IS — só os campos do "ficou" mudam.
  const out: DbRow = {};
  if (f.descricao !== undefined)         out.description         = f.descricao ?? null;
  if (f.execucao !== undefined)          out.execution           = f.execucao ?? null;
  if (f.leadTimeDias !== undefined)      out.lead_time_days      = f.leadTimeDias ?? null;
  if (f.volumePorProcesso !== undefined) out.volume_per_process  = f.volumePorProcesso ?? null;
  if (f.taxaErros !== undefined)         out.error_rate          = f.taxaErros ?? null;
  if (f.taxaRetrabalho !== undefined)    out.rework_rate         = f.taxaRetrabalho ?? null;
  if (f.custoErro !== undefined)         out.error_cost          = f.custoErro ?? null;
  if (f.volumeErros !== undefined)       out.error_volume        = f.volumeErros ?? null;
  return out;
}


// ════════════════════════════════════════════════════════════════════════
//   job_roles ↔ Responsavel
// ════════════════════════════════════════════════════════════════════════

export function responsavelFromDb(r: DbRow): Responsavel {
  return {
    id:        String(r.id ?? ''),
    nome:      String(r.name ?? ''),
    cargo:     String(r.level ?? ''),
    custoHora: Number(r.hourly_rate ?? 0),
    tipo:      (r.type as string | undefined) ?? undefined,
    cluster:   (r.cluster_id as string | undefined) ?? undefined,
    categoria: (r.category as string | undefined) ?? undefined,
  };
}

export function responsavelToDb(r: Partial<Responsavel>): DbRow {
  const out: DbRow = {};
  if (r.nome !== undefined)      out.name        = r.nome;
  if (r.cargo !== undefined)     out.level       = r.cargo;
  if (r.custoHora !== undefined) out.hourly_rate = r.custoHora;
  if (r.tipo !== undefined)      out.type        = r.tipo ?? null;
  if (r.cluster !== undefined)   out.cluster_id  = r.cluster ?? null;
  if (r.categoria !== undefined) out.category    = r.categoria ?? null;
  return out;
}


// ════════════════════════════════════════════════════════════════════════
//   process_improvements ↔ Melhoria
//   (Melhoria do MAPA carrega muitos campos — só mapeamos os usados.)
// ════════════════════════════════════════════════════════════════════════

export function melhoriaFromDb(r: DbRow): Partial<Melhoria> & { id: string } {
  return {
    id:                String(r.id ?? ''),
    nome:              String(r.improvement_description ?? ''),
    descricao:         String(r.improvement_description ?? ''),
    cluster:           (r.cluster_id as string | undefined) ?? undefined,
    status:            (r.improvement_status as MelhoriaStatus | undefined) ?? undefined,
    horasTreinamento:  r.training_hours != null ? Number(r.training_hours) : undefined,
    custoExternoUnico: r.one_time_external_cost != null ? Number(r.one_time_external_cost) : undefined,
  };
}

export function melhoriaToDb(m: Partial<Melhoria>): DbRow {
  const out: DbRow = {};
  if (m.descricao !== undefined)         out.improvement_description = m.descricao;
  if (m.cluster !== undefined)           out.cluster_id              = m.cluster ?? null;
  if (m.status !== undefined)            out.improvement_status      = m.status ?? null;
  if (m.horasTreinamento !== undefined)  out.training_hours          = m.horasTreinamento ?? null;
  if (m.custoExternoUnico !== undefined) out.one_time_external_cost  = m.custoExternoUnico ?? null;
  return out;
}


// ════════════════════════════════════════════════════════════════════════
//   process_scenarios ↔ ProcessSnapshot
// ════════════════════════════════════════════════════════════════════════

export function snapshotFromDb(r: DbRow): ProcessSnapshot {
  return {
    id:             String(r.id ?? ''),
    processoId:     String(r.process_id ?? ''),
    snapshotEm:     String(r.snapshot_at ?? ''),
    custoAnual:     Number(r.annual_cost     ?? 0),
    horasAnual:     Number(r.annual_hours    ?? 0),
    economiaAnual:  Number(r.annual_savings  ?? 0),
    roiPercentual:  Number(r.roi_percent     ?? 0),
    paybackMeses:   Number(r.payback_months  ?? 0),
    horasLiberadas: Number(r.hours_freed     ?? 0),
    investimento:   Number(r.investment      ?? 0),
    criadoPor:      (r.created_by ?? null) as string | null,
  };
}

export function snapshotToDb(s: Partial<ProcessSnapshot>): DbRow {
  const out: DbRow = {};
  if (s.processoId !== undefined)     out.process_id      = s.processoId;
  if (s.snapshotEm !== undefined)     out.snapshot_at     = s.snapshotEm;
  if (s.custoAnual !== undefined)     out.annual_cost     = s.custoAnual;
  if (s.horasAnual !== undefined)     out.annual_hours    = s.horasAnual;
  if (s.economiaAnual !== undefined)  out.annual_savings  = s.economiaAnual;
  if (s.roiPercentual !== undefined)  out.roi_percent     = s.roiPercentual;
  if (s.paybackMeses !== undefined)   out.payback_months  = s.paybackMeses;
  if (s.horasLiberadas !== undefined) out.hours_freed     = s.horasLiberadas;
  if (s.investimento !== undefined)   out.investment      = s.investimento;
  if (s.criadoPor !== undefined)      out.created_by      = s.criadoPor ?? null;
  return out;
}
