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
type PerUpdate = Database['public']['Tables']['per']['Update'];
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

/**
 * UPDATE em `per` que não mente.
 *
 * RLS recusando um UPDATE não devolve erro — devolve ZERO linhas, e a operação
 * é reportada como bem-sucedida. Sem o `.select()`, "ressarcimento registrado"
 * e "ressarcimento excluído" apareciam mesmo com o banco intacto. No registro
 * de ressarcimento isso era pior que cosmético: a situação "PER deferido" era
 * inserida logo em seguida, deixando o PER deferido e sem valor.
 */
async function updatePer(nrPer: string, patch: PerUpdate, acao: string): Promise<void> {
  const { data, error } = await supabase
    .from('per')
    .update(patch)
    .eq('nr_per', nrPer)
    .select('nr_per');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      `Não foi possível ${acao}: a alteração foi recusada pelo banco, ou este PER não está ` +
        `mais disponível para você. Atualize a página e tente novamente.`,
    );
  }
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
      // Sem esta guarda o filtro virava `nr_per=eq.undefined`, que não casa com
      // nada: o update não alterava linha alguma e ninguém ficava sabendo.
      if (!nrPer) throw new Error('PER inválido');
      await updatePer(
        nrPer,
        {
          vlr_ressarcido: valor,
          vlr_ressarcido_original: Math.round(valorOriginal * 100) / 100,
        },
        'registrar o ressarcimento',
      );

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
      await updatePer(
        nrPer,
        {
          vlr_ressarcido: null,
          vlr_ressarcido_original: null,
          atualizado_em: new Date().toISOString(),
          atualizado_por: userId,
        },
        'excluir o ressarcimento',
      );
    },
    ...options,
  });
}
