// Sincroniza o rateio (%) por cluster de um sistema na tabela `sistema_clusters`.
//
// Antes deste módulo, o SistemaFormModal mandava `clustersRateio` (que NÃO é
// coluna de sistemas_processo) direto no .update() → PostgREST devolvia
// 42703/400 e a edição do sistema falhava; o rateio nunca era persistido nem
// lido (o useSistemas fazia select('*') sem embed).
//
// Diff-based (delete removidos + insert novos + update alterados), NÃO
// delete-all. Grava toda PARTICIPAÇÃO com % > 0 (INCLUSIVE 100%) — a tabela é a
// fonte de "de quais clusters o sistema faz parte". % 0/ausente = não participa
// (não vira linha); o roiCalculator então atribui 0 custo a esse cluster.

import { supabase } from '@/integrations/supabase/client';

export interface RateioInput {
  clusterId: string;
  rateio: number;
}

export async function syncSistemaClusters(sistemaId: string, rateios: RateioInput[]): Promise<void> {
  const desejados = new Map<string, number>();
  for (const r of rateios) {
    if (!r.clusterId) continue;
    if (r.rateio == null || r.rateio <= 0) continue; // 0/ausente = não participa
    desejados.set(r.clusterId, r.rateio);
  }

  const { data, error } = await supabase
    .from('sistema_clusters' as never)
    .select('id, cluster_id, rateio')
    .eq('sistema_id', sistemaId);
  if (error) throw new Error(error.message);
  const atuais = (data ?? []) as unknown as Array<{ id: string; cluster_id: string; rateio: number | null }>;

  const remover = atuais.filter((a) => !desejados.has(a.cluster_id)).map((a) => a.id);
  if (remover.length > 0) {
    const { error: delErr } = await supabase.from('sistema_clusters' as never).delete().in('id', remover);
    if (delErr) throw new Error(delErr.message);
  }

  for (const a of atuais) {
    const rateio = desejados.get(a.cluster_id);
    if (rateio !== undefined && rateio !== (a.rateio ?? null)) {
      const { error: updErr } = await supabase
        .from('sistema_clusters' as never)
        .update({ rateio } as never)
        .eq('id', a.id);
      if (updErr) throw new Error(updErr.message);
    }
  }

  const existentes = new Set(atuais.map((a) => a.cluster_id));
  const inserir = [...desejados.entries()]
    .filter(([clusterId]) => !existentes.has(clusterId))
    .map(([cluster_id, rateio]) => ({ sistema_id: sistemaId, cluster_id, rateio }));
  if (inserir.length > 0) {
    const { error: insErr } = await supabase.from('sistema_clusters' as never).insert(inserir as never);
    if (insErr) throw new Error(insErr.message);
  }
}
