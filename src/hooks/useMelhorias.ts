// Hook de Melhoria (tabela `process_improvements`).
// Hidrata JOIN cluster + 4 junções M:N (processos, sistemas, acoes_td)
// inline na query — sem mapper externo.

import { useQuery, useMutation, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Melhoria, AcaoTd, ResponsavelHoras } from '@/types';

const TABLE = 'process_improvements';
const SELECT = '*, estrutura_clusters(name), melhoria_processos(processo_id), melhoria_sistemas(sistema_id), melhoria_acoes_td(acao_td), melhoria_responsaveis(responsavel_id, papel, horas)';

type DbRow = Record<string, unknown>;
type MelhoriaRespRow = { responsavel_id: string; papel: string; horas: number | null };

function pluck<T>(rel: unknown, key: string): T[] {
  if (!Array.isArray(rel)) return [];
  return (rel as Record<string, unknown>[]).map(r => r[key] as T).filter(v => v != null);
}

function hydrate(row: DbRow): Melhoria {
  const rel = row.estrutura_clusters as { name?: string } | null | undefined;
  const respRows = (row.melhoria_responsaveis as MelhoriaRespRow[] | null | undefined) ?? [];
  const exec: ResponsavelHoras[] = [];
  const treino: ResponsavelHoras[] = [];
  for (const r of respRows) {
    const ref: ResponsavelHoras = { responsavelId: r.responsavel_id, nome: '', horas: r.horas ?? 0 };
    if (r.papel === 'treinando') treino.push(ref);
    else exec.push(ref);
  }
  return {
    ...(row as unknown as Melhoria),
    clusterName: rel?.name,
    processos: pluck<string>(row.melhoria_processos, 'processo_id'),
    sistemas: pluck<string>(row.melhoria_sistemas, 'sistema_id'),
    acoesTd: pluck<AcaoTd>(row.melhoria_acoes_td, 'acao_td'),
    executadoPor: exec,
    treinamentoPor: treino,
  };
}

function stripSyntheticFields(patch: Partial<Melhoria>): Record<string, unknown> {
  const out = { ...patch } as Record<string, unknown>;
  // Campos derivados de JOINs/junções — não vão pra UPDATE/INSERT do row principal.
  delete out.clusterName;
  delete out.processos;
  delete out.sistemas;
  delete out.executadoPor;
  delete out.treinamentoPor;
  delete out.acoesTd;
  return out;
}

export type MelhoriaInput = Omit<Melhoria, 'id' | 'clusterName' | 'processos' | 'sistemas' | 'executadoPor' | 'acoesTd' | 'treinamentoPor'> & {
  // Campos opcionais que a UI envia pra serem persistidos em queries
  // separadas (junções) — não fazem parte do INSERT da row principal.
  processos?: string[];
  sistemas?: string[];
  executadoPor?: Melhoria['executadoPor'];
  treinamentoPor?: Melhoria['treinamentoPor'];
  acoesTd?: Melhoria['acoesTd'];
};

/** Sincroniza melhoria_processos (N:M) — grão = PROCESSO (vínculo direto da
 *  melhoria ao processo, independente de gargalo). */
async function syncProcessos(melhoriaId: string, processoIds: string[]): Promise<void> {
  const desejados = [...new Set(processoIds.filter(Boolean))];

  const { data: atuaisRows, error: selErr } = await supabase
    .from('melhoria_processos' as never)
    .select('processo_id')
    .eq('melhoria_id', melhoriaId);
  if (selErr) throw new Error(selErr.message);
  const atuais = ((atuaisRows ?? []) as Array<{ processo_id: string }>).map((r) => r.processo_id);

  const aRemover = atuais.filter((p) => !desejados.includes(p));
  const aInserir = desejados.filter((p) => !atuais.includes(p));

  if (aRemover.length > 0) {
    const { error: delErr } = await supabase
      .from('melhoria_processos' as never)
      .delete()
      .eq('melhoria_id', melhoriaId)
      .in('processo_id', aRemover);
    if (delErr) throw new Error(delErr.message);
  }
  if (aInserir.length > 0) {
    const rows = aInserir.map((processo_id) => ({ melhoria_id: melhoriaId, processo_id }));
    const { error: insErr } = await supabase.from('melhoria_processos' as never).insert(rows as never);
    if (insErr) throw new Error(insErr.message);
  }
}

/** Sync diff-based de uma junção simples melhoria↔valor (col = sistema_id | acao_td). */
async function syncJoinSimples(table: string, col: string, melhoriaId: string, valores: string[]): Promise<void> {
  const desejados = [...new Set(valores.filter(Boolean))];
  const { data, error } = await supabase.from(table as never).select(col).eq('melhoria_id', melhoriaId);
  if (error) throw new Error(error.message);
  const atuais = ((data ?? []) as Array<Record<string, string>>).map((r) => r[col]);
  const aRemover = atuais.filter((v) => !desejados.includes(v));
  const aInserir = desejados.filter((v) => !atuais.includes(v));
  if (aRemover.length > 0) {
    const { error: delErr } = await supabase.from(table as never).delete().eq('melhoria_id', melhoriaId).in(col, aRemover);
    if (delErr) throw new Error(delErr.message);
  }
  if (aInserir.length > 0) {
    const rows = aInserir.map((v) => ({ melhoria_id: melhoriaId, [col]: v }));
    const { error: insErr } = await supabase.from(table as never).insert(rows as never);
    if (insErr) throw new Error(insErr.message);
  }
}

/** Sync de melhoria_responsaveis (executores + treinandos), diff por (responsavel_id, papel). */
async function syncResponsaveis(
  melhoriaId: string,
  exec: ResponsavelHoras[],
  treino: ResponsavelHoras[],
): Promise<void> {
  const desejados = new Map<string, { responsavel_id: string; papel: string; horas: number }>();
  const add = (arr: ResponsavelHoras[], papel: string) => {
    for (const r of arr) {
      if (!r.responsavelId) continue;
      desejados.set(`${r.responsavelId}|${papel}`, { responsavel_id: r.responsavelId, papel, horas: r.horas ?? 0 });
    }
  };
  add(exec, 'executor');
  add(treino, 'treinando');

  const { data, error } = await supabase
    .from('melhoria_responsaveis' as never)
    .select('id, responsavel_id, papel, horas')
    .eq('melhoria_id', melhoriaId);
  if (error) throw new Error(error.message);
  const atuais = (data ?? []) as unknown as Array<{ id: string; responsavel_id: string; papel: string; horas: number | null }>;
  const chave = (r: { responsavel_id: string; papel: string }) => `${r.responsavel_id}|${r.papel}`;

  const remover = atuais.filter((a) => !desejados.has(chave(a))).map((a) => a.id);
  if (remover.length > 0) {
    const { error: delErr } = await supabase.from('melhoria_responsaveis' as never).delete().in('id', remover);
    if (delErr) throw new Error(delErr.message);
  }
  for (const a of atuais) {
    const d = desejados.get(chave(a));
    if (d && d.horas !== (a.horas ?? 0)) {
      const { error: updErr } = await supabase.from('melhoria_responsaveis' as never).update({ horas: d.horas } as never).eq('id', a.id);
      if (updErr) throw new Error(updErr.message);
    }
  }
  const existentes = new Set(atuais.map(chave));
  const inserir = [...desejados.values()].filter((d) => !existentes.has(`${d.responsavel_id}|${d.papel}`)).map((d) => ({ melhoria_id: melhoriaId, ...d }));
  if (inserir.length > 0) {
    const { error: insErr } = await supabase.from('melhoria_responsaveis' as never).insert(inserir as never);
    if (insErr) throw new Error(insErr.message);
  }
}

/** Sincroniza TODAS as junções da melhoria a partir do input da UI. */
async function syncVinculosMelhoria(melhoriaId: string, v: MelhoriaInput | Partial<Melhoria>): Promise<void> {
  if (v.processos !== undefined) await syncProcessos(melhoriaId, v.processos);
  if (v.sistemas !== undefined) await syncJoinSimples('melhoria_sistemas', 'sistema_id', melhoriaId, v.sistemas);
  if (v.acoesTd !== undefined) await syncJoinSimples('melhoria_acoes_td', 'acao_td', melhoriaId, v.acoesTd as unknown as string[]);
  if (v.executadoPor !== undefined || v.treinamentoPor !== undefined) {
    await syncResponsaveis(melhoriaId, v.executadoPor ?? [], v.treinamentoPor ?? []);
  }
}

export function useMelhorias(): UseQueryResult<Melhoria[]> {
  return useQuery<Melhoria[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .not('cluster_id', 'is', null) // ⚠️ MAPA-only: esconde rows do Digital Rotina
        .order('created_at');
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as DbRow[]).map(hydrate);
    },
  });
}

export function useMelhoria(id: string | undefined): UseQueryResult<Melhoria | null> {
  return useQuery<Melhoria | null>({
    queryKey: [TABLE, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? hydrate(data as DbRow) : null;
    },
  });
}

export function useCreateMelhoria(): UseMutationResult<Melhoria, Error, MelhoriaInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MelhoriaInput) => {
      const row = stripSyntheticFields(input as Partial<Melhoria>);
      // `process_id` é coluna legada NOT NULL. O vínculo real melhoria↔processo é
      // M:N (melhoria_processos); aqui só espelhamos o 1º processo vinculado para
      // satisfazer o NOT NULL SEM migration. Melhoria "solta" (sem processo) não
      // pode ser criada — orienta a criar a partir do mapeamento do processo.
      if (row.process_id == null) {
        const primeiro = input.processos?.[0];
        if (!primeiro) throw new Error('Vincule a melhoria a um processo — crie a partir do mapeamento do processo.');
        row.process_id = primeiro;
      }
      const { data, error } = await supabase
        .from(TABLE as never)
        .insert(row as never)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = data as unknown as Melhoria;
      await syncVinculosMelhoria(created.id, input);
      const { data: full } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .eq('id', created.id)
        .maybeSingle();
      return full ? hydrate(full as DbRow) : created;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useUpdateMelhoria(): UseMutationResult<
  Melhoria,
  Error,
  { id: string; patch: Partial<Melhoria>; old: Melhoria }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }) => {
      const dbPatch = stripSyntheticFields(patch);
      if (Object.keys(dbPatch).length > 0) {
        const { error } = await supabase
          .from(TABLE as never)
          .update(dbPatch as never)
          .eq('id', id);
        if (error) throw new Error(error.message);
      }
      await syncVinculosMelhoria(id, patch);
      const { data, error: selErr } = await supabase
        .from(TABLE as never)
        .select(SELECT)
        .eq('id', id)
        .maybeSingle();
      if (selErr) throw new Error(selErr.message);
      if (!data) throw new Error('Melhoria não encontrada após update.');
      return hydrate(data as DbRow);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}

export function useDeleteMelhoria(): UseMutationResult<void, Error, { id: string; old: Melhoria }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from(TABLE as never).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); },
  });
}
