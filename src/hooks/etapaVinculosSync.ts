// Sincronização das junções de vínculo da etapa: etapa_documentos,
// etapa_sistemas, etapa_responsaveis e gargalo_etapas.
//
// Antes deste módulo, os vínculos editados no editor de etapas eram
// silenciosamente descartados no save (stripSyntheticFields) — as junções só
// existiam porque as migrations de importação as populavam.
//
// O sync é diff-based (delete removidos + insert novos + update alterados),
// NÃO delete-all: linhas mantidas preservam colunas que a UI não gerencia
// (rateio em etapa_sistemas, papel em etapa_responsaveis). Vínculo sem ID
// resolvido dispara erro — nunca descartar silenciosamente.
//
// Compartilhado por useEtapas (AS-IS) e useEtapaToBe (TO-BE). Vive em módulo
// próprio para evitar import circular entre os dois hooks.

import { supabase } from '@/integrations/supabase/client';
import type { DocRef, ResponsavelEtapa } from '@/types';

export interface VinculosEtapa {
  docsEntrada?: DocRef[];
  docsSaida?: DocRef[];
  executadoPor?: ResponsavelEtapa[];
  sistemas?: string[];
  gargalos?: string[];
}

type Scenario = 'AS-IS' | 'TO-BE';

async function syncEtapaDocumentos(
  etapaId: string,
  scenario: Scenario,
  sentido: 'entrada' | 'saida',
  docs: DocRef[],
): Promise<void> {
  const desejados = new Map<string, number>();
  for (const d of docs) {
    if (!d.documentoId) {
      throw new Error(`Documento "${d.nome}" sem cadastro correspondente. Recarregue a página e tente novamente.`);
    }
    desejados.set(d.documentoId, d.volume ?? 0);
  }

  const { data, error } = await supabase
    .from('etapa_documentos' as never)
    .select('id, documento_id, volume')
    .eq('etapa_id', etapaId)
    .eq('scenario', scenario)
    .eq('sentido', sentido);
  if (error) throw new Error(error.message);
  const atuais = (data ?? []) as unknown as Array<{ id: string; documento_id: string; volume: number | null }>;

  const remover = atuais.filter((a) => !desejados.has(a.documento_id)).map((a) => a.id);
  if (remover.length > 0) {
    const { error: delErr } = await supabase.from('etapa_documentos' as never).delete().in('id', remover);
    if (delErr) throw new Error(delErr.message);
  }

  for (const a of atuais) {
    const volume = desejados.get(a.documento_id);
    if (volume !== undefined && volume !== (a.volume ?? 0)) {
      const { error: updErr } = await supabase
        .from('etapa_documentos' as never)
        .update({ volume } as never)
        .eq('id', a.id);
      if (updErr) throw new Error(updErr.message);
    }
  }

  const existentes = new Set(atuais.map((a) => a.documento_id));
  const inserir = [...desejados.entries()]
    .filter(([documentoId]) => !existentes.has(documentoId))
    .map(([documento_id, volume]) => ({ etapa_id: etapaId, scenario, sentido, documento_id, volume }));
  if (inserir.length > 0) {
    const { error: insErr } = await supabase.from('etapa_documentos' as never).insert(inserir as never);
    if (insErr) throw new Error(insErr.message);
  }
}

async function syncEtapaSistemas(etapaId: string, scenario: Scenario, sistemas: string[]): Promise<void> {
  const desejados = new Set(sistemas.filter(Boolean));

  const { data, error } = await supabase
    .from('etapa_sistemas' as never)
    .select('id, sistema_id')
    .eq('etapa_id', etapaId)
    .eq('scenario', scenario);
  if (error) throw new Error(error.message);
  const atuais = (data ?? []) as unknown as Array<{ id: string; sistema_id: string }>;

  const remover = atuais.filter((a) => !desejados.has(a.sistema_id)).map((a) => a.id);
  if (remover.length > 0) {
    const { error: delErr } = await supabase.from('etapa_sistemas' as never).delete().in('id', remover);
    if (delErr) throw new Error(delErr.message);
  }

  const existentes = new Set(atuais.map((a) => a.sistema_id));
  // rateio omitido nos novos → default do banco (100).
  const inserir = [...desejados]
    .filter((sistemaId) => !existentes.has(sistemaId))
    .map((sistema_id) => ({ etapa_id: etapaId, scenario, sistema_id }));
  if (inserir.length > 0) {
    const { error: insErr } = await supabase.from('etapa_sistemas' as never).insert(inserir as never);
    if (insErr) throw new Error(insErr.message);
  }
}

// A hidratação agrega TODAS as linhas da junção (qualquer papel) em
// executadoPor, então o diff é por responsavel_id: linhas mantidas preservam
// o papel original; novas entram como papel='executado'.
async function syncEtapaResponsaveis(etapaId: string, scenario: Scenario, executadoPor: ResponsavelEtapa[]): Promise<void> {
  const desejados = new Map<string, number>();
  for (const r of executadoPor) {
    if (!r.responsavelId) {
      throw new Error(`Responsável "${r.nome}" sem cadastro correspondente. Recarregue a página e tente novamente.`);
    }
    desejados.set(r.responsavelId, r.horas ?? 0);
  }

  const { data, error } = await supabase
    .from('etapa_responsaveis' as never)
    .select('id, responsavel_id, horas, papel')
    .eq('etapa_id', etapaId)
    .eq('scenario', scenario);
  if (error) throw new Error(error.message);
  const todas = (data ?? []) as unknown as Array<{ id: string; responsavel_id: string; horas: number | null; papel: string }>;
  // Reconcilia SÓ executores — linhas de aprovador (papel='aprovado') ficam intactas.
  const atuais = todas.filter((a) => a.papel !== 'aprovado');

  const remover = atuais.filter((a) => !desejados.has(a.responsavel_id)).map((a) => a.id);
  if (remover.length > 0) {
    const { error: delErr } = await supabase.from('etapa_responsaveis' as never).delete().in('id', remover);
    if (delErr) throw new Error(delErr.message);
  }

  for (const a of atuais) {
    const horas = desejados.get(a.responsavel_id);
    if (horas !== undefined && horas !== (a.horas ?? 0)) {
      const { error: updErr } = await supabase
        .from('etapa_responsaveis' as never)
        .update({ horas } as never)
        .eq('id', a.id);
      if (updErr) throw new Error(updErr.message);
    }
  }

  const existentes = new Set(atuais.map((a) => a.responsavel_id));
  const inserir = [...desejados.entries()]
    .filter(([responsavelId]) => !existentes.has(responsavelId))
    .map(([responsavel_id, horas]) => ({ etapa_id: etapaId, scenario, responsavel_id, papel: 'executado', horas }));
  if (inserir.length > 0) {
    const { error: insErr } = await supabase.from('etapa_responsaveis' as never).insert(inserir as never);
    if (insErr) throw new Error(insErr.message);
  }
}

async function syncGargaloEtapas(etapaId: string, scenario: Scenario, gargalos: string[]): Promise<void> {
  const desejados = new Set(gargalos.filter(Boolean));

  const { data, error } = await supabase
    .from('gargalo_etapas' as never)
    .select('id, gargalo_id')
    .eq('etapa_id', etapaId)
    .eq('scenario', scenario);
  if (error) throw new Error(error.message);
  const atuais = (data ?? []) as unknown as Array<{ id: string; gargalo_id: string }>;

  const remover = atuais.filter((a) => !desejados.has(a.gargalo_id)).map((a) => a.id);
  if (remover.length > 0) {
    const { error: delErr } = await supabase.from('gargalo_etapas' as never).delete().in('id', remover);
    if (delErr) throw new Error(delErr.message);
  }

  const existentes = new Set(atuais.map((a) => a.gargalo_id));
  const inserir = [...desejados]
    .filter((gargaloId) => !existentes.has(gargaloId))
    .map((gargalo_id) => ({ etapa_id: etapaId, scenario, gargalo_id }));
  if (inserir.length > 0) {
    const { error: insErr } = await supabase.from('gargalo_etapas' as never).insert(inserir as never);
    if (insErr) throw new Error(insErr.message);
  }
}

/** Sincroniza apenas os vínculos presentes (!== undefined) no objeto. */
export async function syncVinculosEtapa(etapaId: string, scenario: Scenario, v: VinculosEtapa): Promise<void> {
  if (v.docsEntrada !== undefined) await syncEtapaDocumentos(etapaId, scenario, 'entrada', v.docsEntrada);
  if (v.docsSaida !== undefined) await syncEtapaDocumentos(etapaId, scenario, 'saida', v.docsSaida);
  if (v.sistemas !== undefined) await syncEtapaSistemas(etapaId, scenario, v.sistemas);
  if (v.executadoPor !== undefined) await syncEtapaResponsaveis(etapaId, scenario, v.executadoPor);
  if (v.gargalos !== undefined) await syncGargaloEtapas(etapaId, scenario, v.gargalos);
}
