import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { syncPerdcompToDW } from '@/lib/syncPerdcomp';
import type {
  PerdcompDetailDcomp,
  PerdcompDetailDistribuicao,
  PerdcompDetailPer,
  PerdcompDetailSituacao,
} from '@/lib/perdcompDetail';

type PerSituacaoRow = Database['public']['Tables']['per_situacao']['Row'];
type PerSituacaoInsert = Database['public']['Tables']['per_situacao']['Insert'];
type PerdcompSyncPayload = Parameters<typeof syncPerdcompToDW>[0];
type DetailMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn' | 'mutationKey'
>;

export interface RegisterPerReimbursementInput {
  nrPer: string | undefined;
  valor: number;
  valorOriginal: number;
  dataPagamento: string;
}

export interface RegisterPerReimbursementResult {
  valor: number;
  sitData: PerSituacaoRow;
}

export interface ClearPerReimbursementInput {
  nrPer: string | undefined;
  userId: string | null;
}

async function insertPerSituation(payload: PerSituacaoInsert): Promise<PerSituacaoRow> {
  const { data, error } = await supabase.from('per_situacao').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export function useSyncPerdcompDetail() {
  return (payload: PerdcompSyncPayload) => {
    syncPerdcompToDW(payload);
  };
}

export function usePerDetail(nrPer: string | undefined, open: boolean) {
  return useQuery<PerdcompDetailPer | null>({
    queryKey: ['per-detail', nrPer],
    queryFn: async () => {
      if (!nrPer) return null;
      const { data, error } = await supabase
        .from('per')
        .select('*, contribuinte(nome_razao_social)')
        .eq('nr_per', nrPer)
        .maybeSingle();
      if (error) throw error;
      // The generated relationship metadata omits per.id_contribuinte -> contribuinte.id.
      return data as unknown as PerdcompDetailPer | null;
    },
    enabled: open && !!nrPer,
  });
}

export function usePerDcompsDetail(nrPer: string | undefined, open: boolean) {
  return useQuery<PerdcompDetailDcomp[]>({
    queryKey: ['per-dcomps', nrPer],
    queryFn: async () => {
      if (!nrPer) return [];
      const { data, error } = await supabase
        .from('dcomp')
        .select('*')
        .eq('nr_per_orig', nrPer)
        .order('dt_envio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!nrPer,
  });
}

export function usePerSituacoesDetail(nrPer: string | undefined, open: boolean) {
  return useQuery<PerdcompDetailSituacao[]>({
    queryKey: ['per-situacoes', nrPer],
    queryFn: async () => {
      if (!nrPer) return [];
      const { data, error } = await supabase
        .from('per_situacao')
        .select('*')
        .eq('nr_proc_per', nrPer)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!nrPer,
  });
}

export function usePerDistribuicoesDetail(
  nrPer: string | undefined,
  documentNumbers: string[],
  open: boolean,
) {
  return useQuery<PerdcompDetailDistribuicao[]>({
    queryKey: ['per-distribuicoes', nrPer, documentNumbers.join(',')],
    queryFn: async () => {
      if (documentNumbers.length === 0) return [];
      const { data, error } = await supabase
        .from('distribuicao_dcomp')
        .select('nr_documento, tributo, valor_tributo, valor_original, competencia')
        .in('nr_documento', documentNumbers);
      if (error) throw error;
      return data || [];
    },
    enabled: open && documentNumbers.length > 0,
  });
}

export function useInsertPerSituationDetail(
  options?: DetailMutationOptions<PerSituacaoRow, PerSituacaoInsert>,
): UseMutationResult<PerSituacaoRow, Error, PerSituacaoInsert> {
  return useMutation({
    mutationFn: insertPerSituation,
    ...options,
  });
}

export function useRegisterPerReimbursement(
  options?: DetailMutationOptions<RegisterPerReimbursementResult, RegisterPerReimbursementInput>,
): UseMutationResult<RegisterPerReimbursementResult, Error, RegisterPerReimbursementInput> {
  return useMutation({
    mutationFn: async ({ nrPer, valor, valorOriginal, dataPagamento }) => {
      const { error } = await supabase
        .from('per')
        .update({
          vlr_ressarcido: valor,
          vlr_ressarcido_original: Math.round(valorOriginal * 100) / 100,
        })
        .eq('nr_per', nrPer);
      if (error) throw error;

      const sitData = await insertPerSituation({
        nr_proc_per: nrPer,
        situacao: 'PER deferido',
        dt_pagamento: dataPagamento,
      });
      return { valor, sitData };
    },
    ...options,
  });
}

export function useClearPerReimbursement(
  options?: DetailMutationOptions<void, ClearPerReimbursementInput>,
): UseMutationResult<void, Error, ClearPerReimbursementInput> {
  return useMutation({
    mutationFn: async ({ nrPer, userId }) => {
      if (!nrPer) throw new Error('PER inválido');
      const { error } = await supabase
        .from('per')
        .update({
          vlr_ressarcido: null,
          vlr_ressarcido_original: null,
          atualizado_em: new Date().toISOString(),
          atualizado_por: userId,
        })
        .eq('nr_per', nrPer);
      if (error) throw error;
    },
    ...options,
  });
}
