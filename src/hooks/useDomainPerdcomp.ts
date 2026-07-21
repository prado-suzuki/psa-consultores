import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  buildLatestSituacoesMap,
  type ControleDcomp,
  type ControleDistribuicao,
  type ControlePer,
  type ControlePerSituacao,
  type ControlePerSituacaoMap,
} from '@/lib/controlePerdcomp';

type ClienteTable = Database['public']['Tables']['cliente'];
type ContribuinteTable = Database['public']['Tables']['contribuinte'];
type PerTable = Database['public']['Tables']['per'];
type PerSituacaoTable = Database['public']['Tables']['per_situacao'];
type DcompTable = Database['public']['Tables']['dcomp'];
type DistribuicaoDcompTable = Database['public']['Tables']['distribuicao_dcomp'];

export type ClientePerdcomp = Pick<ClienteTable['Row'], 'id' | 'nome'>;
export type ContribuintePerdcomp = Pick<
  ContribuinteTable['Row'],
  'id' | 'nome_razao_social' | 'cpf_cnpj'
>;
export type PerRetificacaoOption = Pick<
  PerTable['Row'],
  'nr_per' | 'exercicio' | 'tri_exercicio' | 'tp_credito'
>;
export type PerSituacaoOption = Pick<
  PerTable['Row'],
  'nr_per' | 'id_contribuinte' | 'exercicio' | 'tri_exercicio'
>;
export type PerExistente = Pick<PerTable['Row'], 'nr_per'>;
export type PerInsert = PerTable['Insert'];
export type PerUpdate = PerTable['Update'];
export type PerSituacaoRow = PerSituacaoTable['Row'];
export type PerSituacaoInsert = PerSituacaoTable['Insert'];
export type PerSituacaoUpdate = PerSituacaoTable['Update'];
export type DcompInsert = DcompTable['Insert'];
export type DistribuicaoDcompInsert = DistribuicaoDcompTable['Insert'];
export type DistribuicaoDcompAmostra = Pick<DistribuicaoDcompTable['Row'], 'id'>;
export type ClienteControlePerdcomp = Pick<ClienteTable['Row'], 'id' | 'nome'>;
export type ContribuinteControlePerdcomp = Pick<
  ContribuinteTable['Row'],
  'id' | 'nome_razao_social'
>;

export type GlobalProcessLookupResult =
  | { status: 'invalid' }
  | { status: 'not-found' }
  | { status: 'unlinked' }
  | { status: 'found'; contribuinteId: string; clienteId: string };

type DomainMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn' | 'mutationKey'
>;

export interface AtualizarPerPorNumeroInput {
  nrPer: string | undefined;
  payload: PerUpdate;
}

export interface AtualizarSituacaoPerPorIdInput {
  id: string | undefined;
  payload: PerSituacaoUpdate;
}

export const perdcompQueryKeys = {
  contribuintesCarga: ['contribuintes-for-perdcomp'] as const,
  clientesPerModal: ['clientes-dev-per-modal'] as const,
  contribuintesPorCliente: (clienteId: string) => ['contribuintes', clienteId] as const,
  persExistentes: (contribuinteId: string | undefined) =>
    ['pers-existentes', contribuinteId] as const,
  persParaSituacao: (contribuinteId: string | undefined) =>
    ['pers-for-situacao', contribuinteId] as const,
};

const PERDCOMP_MUTATION_KEYS = {
  buscarPerPorNumero: ['perdcomp', 'per', 'buscar-por-numero'],
  upsertPersEmLote: ['perdcomp', 'per', 'upsert-em-lote'],
  inserirPer: ['perdcomp', 'per', 'inserir'],
  atualizarPerPorNumero: ['perdcomp', 'per', 'atualizar-por-numero'],
  inserirSituacaoPer: ['perdcomp', 'per-situacao', 'inserir'],
  inserirSituacaoPerComRetorno: ['perdcomp', 'per-situacao', 'inserir-com-retorno'],
  inserirSituacoesPerEmLote: ['perdcomp', 'per-situacao', 'inserir-em-lote'],
  atualizarSituacaoPerPorId: ['perdcomp', 'per-situacao', 'atualizar-por-id'],
  inserirDcomps: ['perdcomp', 'dcomp', 'inserir'],
  buscarAmostraDistribuicao: ['perdcomp', 'distribuicao-dcomp', 'buscar-amostra'],
  excluirDistribuicoesPorDocumento: ['perdcomp', 'distribuicao-dcomp', 'excluir-por-documento'],
  inserirDistribuicoesEmLote: ['perdcomp', 'distribuicao-dcomp', 'inserir-em-lote'],
  buscarProcessoGlobal: ['perdcomp', 'processo', 'buscar-global'],
} as const;

export function useClientesControlePerdcomp() {
  return useQuery<ClienteControlePerdcomp[]>({
    queryKey: ['clientes-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContribuintesControlePerdcomp(clienteId: string) {
  return useQuery<ContribuinteControlePerdcomp[]>({
    queryKey: ['contribuintes', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social')
        .eq('cliente_id', clienteId)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clienteId,
  });
}

export function usePersControlePerdcomp(contribuinteId: string, searched: boolean) {
  return useQuery<ControlePer[]>({
    queryKey: ['perdcomp-per', contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return [];
      const { data, error } = await supabase
        .from('per_with_contribuinte')
        .select('*')
        .eq('id_contribuinte', contribuinteId)
        .order('exercicio', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ControlePer[];
    },
    enabled: searched && !!contribuinteId,
  });
}

export function useSituacoesControlePerdcomp(contribuinteId: string, searched: boolean) {
  return useQuery<ControlePerSituacaoMap>({
    queryKey: ['per-situacoes', contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return {};
      const { data: pers, error: perError } = await supabase
        .from('per')
        .select('nr_per')
        .eq('id_contribuinte', contribuinteId);
      if (perError) throw perError;
      const perNumbers = (pers ?? []).map((per) => per.nr_per);
      if (perNumbers.length === 0) return {};
      const { data, error } = await supabase
        .from('per_situacao')
        .select('nr_proc_per, situacao, criado_em, dt_pagamento')
        .in('nr_proc_per', perNumbers)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return buildLatestSituacoesMap((data ?? []) as ControlePerSituacao[]);
    },
    enabled: searched && !!contribuinteId,
  });
}

export function useDcompsControlePerdcomp(contribuinteId: string, searched: boolean) {
  return useQuery<ControleDcomp[]>({
    queryKey: ['perdcomp-dcomp', contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return [];
      const { data: pers, error: perError } = await supabase
        .from('per')
        .select('nr_per')
        .eq('id_contribuinte', contribuinteId);
      if (perError) throw perError;
      const perNumbers = (pers ?? []).map((per) => per.nr_per);
      if (perNumbers.length === 0) return [];
      const { data, error } = await supabase
        .from('dcomp')
        .select('*')
        .in('nr_per_orig', perNumbers)
        .order('dt_envio', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: searched && !!contribuinteId,
  });
}

export function useDistribuicoesControlePerdcomp(
  contribuinteId: string,
  documentNumbers: string[],
  searched: boolean,
) {
  return useQuery<ControleDistribuicao[]>({
    queryKey: ['perdcomp-distribuicoes', contribuinteId, documentNumbers.join(',')],
    queryFn: async () => {
      if (documentNumbers.length === 0) return [];
      const { data, error } = await supabase
        .from('distribuicao_dcomp')
        .select('nr_documento, valor_tributo, valor_original')
        .in('nr_documento', documentNumbers);
      if (error) throw error;
      return data ?? [];
    },
    enabled: searched && documentNumbers.length > 0,
  });
}

export function useSituacoesDistintasControlePerdcomp() {
  return useQuery<string[]>({
    queryKey: ['per-situacoes-distintas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('per_situacao')
        .select('situacao')
        .not('situacao', 'is', null);
      return Array.from(new Set((data ?? []).map((row) => row.situacao)));
    },
  });
}

export function useBuscarProcessoGlobalPerdcomp(): UseMutationResult<
  GlobalProcessLookupResult,
  Error,
  string
> {
  return useMutation<GlobalProcessLookupResult, Error, string>({
    mutationKey: PERDCOMP_MUTATION_KEYS.buscarProcessoGlobal,
    mutationFn: async (processNumber) => {
      const digits = processNumber.replace(/\D/g, '');
      if (!digits) return { status: 'invalid' };
      const { data: matchedPers } = await supabase
        .from('per')
        .select('id_contribuinte')
        .like('nr_per', `%${digits}%`)
        .limit(1);
      let contribuinteId = matchedPers?.[0]?.id_contribuinte ?? null;
      if (!contribuinteId) {
        const { data: matchedDcomps } = await supabase
          .from('dcomp')
          .select('nr_per_orig')
          .like('nr_documento', `%${digits}%`)
          .limit(1);
        if (matchedDcomps?.[0]?.nr_per_orig) {
          const { data: per } = await supabase
            .from('per')
            .select('id_contribuinte')
            .eq('nr_per', matchedDcomps[0].nr_per_orig)
            .maybeSingle();
          contribuinteId = per?.id_contribuinte ?? null;
        }
      }
      if (!contribuinteId) return { status: 'not-found' };
      const { data: contribuinte } = await supabase
        .from('contribuinte')
        .select('cliente_id')
        .eq('id', contribuinteId)
        .maybeSingle();
      if (!contribuinte?.cliente_id) return { status: 'unlinked' };
      return { status: 'found', contribuinteId, clienteId: contribuinte.cliente_id };
    },
  });
}

export function useContribuintesCargaPerdcomp() {
  return useQuery<ContribuintePerdcomp[]>({
    queryKey: perdcompQueryKeys.contribuintesCarga,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClientesPerModal() {
  return useQuery<ClientePerdcomp[]>({
    queryKey: perdcompQueryKeys.clientesPerModal,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContribuintesPerModal(clienteId: string) {
  return useQuery<ContribuintePerdcomp[]>({
    queryKey: perdcompQueryKeys.contribuintesPorCliente(clienteId),
    queryFn: async () => {
      if (!clienteId) return [];

      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', clienteId)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clienteId,
  });
}

export function usePersExistentesPerModal(contribuinteId: string | undefined, isEditing: boolean) {
  return useQuery<PerRetificacaoOption[]>({
    queryKey: perdcompQueryKeys.persExistentes(contribuinteId),
    queryFn: async () => {
      if (!contribuinteId) return [];

      const { data, error } = await supabase
        .from('per')
        .select('nr_per, exercicio, tri_exercicio, tp_credito')
        .eq('id_contribuinte', contribuinteId)
        .order('exercicio', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contribuinteId && !isEditing,
  });
}

export function usePersParaSituacao(contribuinteId?: string) {
  return useQuery<PerSituacaoOption[]>({
    queryKey: perdcompQueryKeys.persParaSituacao(contribuinteId),
    queryFn: async () => {
      let query = supabase
        .from('per')
        .select('nr_per, id_contribuinte, exercicio, tri_exercicio')
        .order('exercicio', { ascending: false });

      if (contribuinteId) {
        query = query.eq('id_contribuinte', contribuinteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBuscarPerPorNumero(): UseMutationResult<PerExistente | null, Error, string> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.buscarPerPorNumero,
    mutationFn: async (nrPer) => {
      // O consumidor atual trata somente a existência; o erro desta consulta era ignorado.
      const { data } = await supabase
        .from('per')
        .select('nr_per')
        .eq('nr_per', nrPer)
        .maybeSingle();

      return data;
    },
  });
}

export function useUpsertPersEmLote(): UseMutationResult<void, Error, PerInsert[]> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.upsertPersEmLote,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('per').upsert(payload, { onConflict: 'nr_per' });
      if (error) throw error;
    },
  });
}

export function useInserirPer(): UseMutationResult<void, Error, PerInsert[]> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.inserirPer,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('per').insert(payload);
      if (error) throw error;
    },
  });
}

export function useAtualizarPerPorNumero(): UseMutationResult<
  void,
  Error,
  AtualizarPerPorNumeroInput
> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.atualizarPerPorNumero,
    mutationFn: async ({ nrPer, payload }) => {
      const { error } = await supabase.from('per').update(payload).eq('nr_per', nrPer);
      if (error) throw error;
    },
  });
}

export function useInserirSituacaoPer(): UseMutationResult<void, Error, PerSituacaoInsert> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.inserirSituacaoPer,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('per_situacao').insert(payload);
      if (error) throw error;
    },
  });
}

export function useInserirSituacaoPerComRetorno(): UseMutationResult<
  PerSituacaoRow,
  Error,
  PerSituacaoInsert
> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.inserirSituacaoPerComRetorno,
    mutationFn: async (payload) => {
      const { data, error } = await supabase.from('per_situacao').insert(payload).select().single();

      if (error) throw error;
      return data;
    },
  });
}

export function useInserirSituacoesPerEmLote(): UseMutationResult<
  void,
  Error,
  PerSituacaoInsert[]
> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.inserirSituacoesPerEmLote,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('per_situacao').insert(payload);
      if (error) throw error;
    },
  });
}

export function useAtualizarSituacaoPerPorId(): UseMutationResult<
  PerSituacaoRow,
  Error,
  AtualizarSituacaoPerPorIdInput
> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.atualizarSituacaoPerPorId,
    mutationFn: async ({ id, payload }) => {
      const { data, error } = await supabase
        .from('per_situacao')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useInserirDcomps(): UseMutationResult<void, Error, DcompInsert[]> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.inserirDcomps,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('dcomp').insert(payload);
      if (error) throw error;
    },
  });
}

export function useBuscarAmostraDistribuicaoDcomp(): UseMutationResult<
  DistribuicaoDcompAmostra | null,
  Error,
  string
> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.buscarAmostraDistribuicao,
    mutationFn: async (nrDocumento) => {
      // O precheck atual é best-effort e não trata erro desta leitura amostral.
      const { data } = await supabase
        .from('distribuicao_dcomp')
        .select('id')
        .eq('nr_documento', nrDocumento)
        .limit(1)
        .maybeSingle();

      return data;
    },
  });
}

export function useExcluirDistribuicoesDcompPorDocumento(): UseMutationResult<void, Error, string> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.excluirDistribuicoesPorDocumento,
    mutationFn: async (nrDocumento) => {
      const { error } = await supabase
        .from('distribuicao_dcomp')
        .delete()
        .eq('nr_documento', nrDocumento);

      if (error) throw error;
    },
  });
}

export function useInserirDistribuicoesDcompEmLote(): UseMutationResult<
  void,
  Error,
  DistribuicaoDcompInsert[]
> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.inserirDistribuicoesEmLote,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('distribuicao_dcomp').insert(payload);
      if (error) throw error;
    },
  });
}

export function useExcluirPerDcompDefinitivamente(
  type: 'per' | 'dcomp',
  identifier: string,
  options?: DomainMutationOptions<void, void>,
): UseMutationResult<void, Error, void> {
  return useMutation({
    mutationFn: async () => {
      if (type === 'per') {
        // Buscar DCOMPs filhos para apagar as distribuições primeiro
        const { data: dcompsFilhos, error: dcompsErr } = await supabase
          .from('dcomp')
          .select('nr_documento')
          .eq('nr_per_orig', identifier);
        if (dcompsErr) throw dcompsErr;

        const nrDocs = (dcompsFilhos || []).map((d) => d.nr_documento);
        if (nrDocs.length > 0) {
          const { error: distErr } = await supabase
            .from('distribuicao_dcomp')
            .delete()
            .in('nr_documento', nrDocs);
          if (distErr) throw distErr;
        }

        const { error: dcompErr } = await supabase
          .from('dcomp')
          .delete()
          .eq('nr_per_orig', identifier);
        if (dcompErr) throw dcompErr;

        const { error: sitErr } = await supabase
          .from('per_situacao')
          .delete()
          .eq('nr_proc_per', identifier);
        if (sitErr) throw sitErr;

        const { error: perErr } = await supabase.from('per').delete().eq('nr_per', identifier);
        if (perErr) throw perErr;
      } else {
        const { error: distErr } = await supabase
          .from('distribuicao_dcomp')
          .delete()
          .eq('nr_documento', identifier);
        if (distErr) throw distErr;

        const { error } = await supabase.from('dcomp').delete().eq('nr_documento', identifier);
        if (error) throw error;
      }
    },
    ...options,
  });
}
