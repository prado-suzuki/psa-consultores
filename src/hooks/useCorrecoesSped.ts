import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CorrecoesSpedResponse, C170Item, ItemEfd, A170Item, A170Response, A170Snapshot, D100Item, F100Item } from '@/types/correcoesSped';

interface UseCorrecoesSpedParams {
  id_contribuinte: string;
  dt_ini: string;
  dt_fin: string;
}

const SUPABASE_IN_BATCH_SIZE = 200;

async function batchedIn<T>(
  buildQuery: () => any,
  select: string,
  filters: { column: string; value: string }[],
  inColumn: string,
  inValues: string[],
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < inValues.length; i += SUPABASE_IN_BATCH_SIZE) {
    const batch = inValues.slice(i, i + SUPABASE_IN_BATCH_SIZE);
    let query = buildQuery().select(select) as any;
    for (const f of filters) {
      query = query.eq(f.column, f.value);
    }
    query = query.in(inColumn, batch);
    const { data, error } = await query;
    if (error) throw error;
    if (data) results.push(...(data as T[]));
  }
  return results;
}

function parseApiObject<T>(value: T | string | null | undefined): T | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  return value;
}

function useCorrecoesQuery<T>(
  key: string,
  endpoint: string,
  params: UseCorrecoesSpedParams,
) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<T>({
    queryKey: [key, params.id_contribuinte, params.dt_ini, params.dt_fin],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        id_contribuinte: params.id_contribuinte,
        dt_ini: params.dt_ini,
        dt_fin: params.dt_fin,
      });
      const url = getApiUrl(`${endpoint}?${searchParams}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`Erro ao consultar ${key}: ${response.status}`);
      }
      return response.json();
    },
    enabled: false,
  });
}

export function useCorrecoesSped(params: UseCorrecoesSpedParams) {
  return useCorrecoesQuery<CorrecoesSpedResponse>(
    'correcoes-sped',
    '/api/v1/pis_cofins/revisao/notas-itens',
    params,
  );
}

export function useCorrecoesC170(params: UseCorrecoesSpedParams) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<C170Item[]>({
    queryKey: ['correcoes-c170', params.id_contribuinte, params.dt_ini, params.dt_fin],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        id_contribuinte: params.id_contribuinte,
        dt_ini: params.dt_ini,
        dt_fin: params.dt_fin,
      });
      const url = getApiUrl(`/api/v1/pis_cofins/revisao/notas-itens?${searchParams}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`Erro ao consultar correcoes-c170: ${response.status}`);
      }

      const payload = (await response.json()) as CorrecoesSpedResponse;

      if (!payload?.notas) return [];

      const items: C170Item[] = payload.notas.flatMap((nota) =>
        nota.itens_efd.map((entry) => ({
          ...entry.c170,
          nfe_itens: entry.nfe_itens ?? [],
          chv_nfe: nota.chv_nfe,
          dt_doc: nota.dt_doc,
          tipo_relacao: nota.tipo_relacao,
          DESCR_ITEM_0200: entry["0200"]?.DESCR_ITEM ?? null,
          COD_NCM: entry["0200"]?.COD_NCM ?? null,
          TIPO_ITEM: entry["0200"]?.TIPO_ITEM ?? null,
          ID_CONTRIBUINTE: payload.id_contribuinte,
          _originalSnapshot: { ...entry.c170 },
        }))
      );

      if (items.length === 0) return [];

      const uuids = items.map((item) => item.uuid).filter(Boolean);
      const correcoes = await batchedIn<{ registro_original_id: string | null; snapshot: unknown }>(
        () => supabase.from('efd_correcoes'),
        'registro_original_id, snapshot',
        [{ column: 'registro_tipo', value: 'C170' }, { column: 'ativo', value: 'true' }],
        'registro_original_id',
        uuids,
      );

      const correcoesPorRegistro = new Map(
        correcoes
          .filter((c) => !!c.registro_original_id)
          .map((c) => [
            c.registro_original_id!,
            parseApiObject<ItemEfd>(c.snapshot as ItemEfd | string | null) ?? null,
          ])
      );

      return items.map((item) => {
        const snapshotCorrigido = correcoesPorRegistro.get(item.uuid);
        if (!snapshotCorrigido) return item;
        return { ...item, ...snapshotCorrigido };
      });
    },
    enabled: false,
  });
}

export function useCorrecoesA170(params: UseCorrecoesSpedParams) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<A170Item[]>({
    queryKey: ['correcoes-a170', params.id_contribuinte, params.dt_ini, params.dt_fin],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        id_contribuinte: params.id_contribuinte,
        dt_ini: params.dt_ini,
        dt_fin: params.dt_fin,
      });
      const url = getApiUrl(`/api/v1/pis_cofins/revisao/servicos_itens?${searchParams}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`Erro ao consultar correcoes-a170: ${response.status}`);
      }

      const payload = (await response.json()) as A170Response;

      const items = Object.values(payload ?? {}).flatMap((entries) =>
        (entries ?? []).flatMap((entry) => {
          const a170 = parseApiObject<A170Snapshot>(entry.A170);
          const item0200 = parseApiObject(entry['0200']);

          if (!a170) return [];

          const originalSnapshot: A170Snapshot = {
            ...a170,
            ID_CONTRIBUINTE: entry.ID_CONTRIBUINTE ?? a170.ID_CONTRIBUINTE,
            CHV_NFSE: entry.CHV_NFSE ?? a170.CHV_NFSE ?? null,
            DT_DOC: entry.DT_DOC ?? a170.DT_DOC,
            DESCRICAO_CONTA: entry.descricao_conta ?? entry.DESCRICAO_CONTA ?? a170.DESCRICAO_CONTA,
          };

          return [{
            ...originalSnapshot,
            DESCR_ITEM_0200: item0200?.DESCR_ITEM ?? null,
            COD_NCM: item0200?.COD_NCM ?? null,
            TIPO_ITEM: item0200?.TIPO_ITEM ?? null,
            _originalSnapshot: originalSnapshot,
          }];
        })
      );

      if (items.length === 0) return [];

      const uuids = items.map((item) => item.uuid).filter(Boolean);
      const correcoes = await batchedIn<{ registro_original_id: string | null; snapshot: unknown }>(
        () => supabase.from('efd_correcoes'),
        'registro_original_id, snapshot',
        [{ column: 'registro_tipo', value: 'A170' }, { column: 'ativo', value: 'true' }],
        'registro_original_id',
        uuids,
      );

      const correcoesPorRegistro = new Map(
        correcoes
          .filter((correcao) => !!correcao.registro_original_id)
          .map((correcao) => [
            correcao.registro_original_id!,
            parseApiObject<A170Snapshot>(correcao.snapshot as A170Snapshot | string | null) ?? null,
          ])
      );

      return items.map((item) => {
        const snapshotCorrigido = correcoesPorRegistro.get(item.uuid);

        if (!snapshotCorrigido) return item;

        return {
          ...item,
          ...snapshotCorrigido,
        };
      });
    },
    enabled: false,
  });
}

export function useCorrecoesD100(params: UseCorrecoesSpedParams) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery<D100Item[]>({
    queryKey: ['correcoes-d100', params.id_contribuinte, params.dt_ini, params.dt_fin],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        id_contribuinte: params.id_contribuinte,
        dt_ini: params.dt_ini,
        dt_fin: params.dt_fin,
      });
      const url = getApiUrl(`/api/v1/pis_cofins/revisao/transp?${searchParams}`);
      const response = await fetchWithAuth(url);
      if (!response.ok) {
        throw new Error(`Erro ao consultar correcoes-d100: ${response.status}`);
      }

      const payload = (await response.json()) as import('@/types/correcoesSped').D100ResponseEntry[];

      if (!payload || payload.length === 0) return [];

      return payload.map((entry) => ({
        ...entry.D100,
        ID_CONTRIBUINTE: entry.ID_CONTRIBUINTE,
        CNPJ_EFD: entry.CNPJ_EFD,
        SIMPLES: entry.SIMPLES,
        CST_PIS: entry.D101?.CST_PIS ?? 0,
        VL_BC_PIS: entry.D101?.VL_BC_PIS ?? 0,
        ALIQ_PIS: entry.D101?.ALIQ_PIS ?? 0,
        VL_PIS: entry.D101?.VL_PIS ?? 0,
        CST_COFINS: entry.D105?.CST_COFINS ?? 0,
        VL_BC_COFINS: entry.D105?.VL_BC_COFINS ?? 0,
        ALIQ_COFINS: entry.D105?.ALIQ_COFINS ?? 0,
        VL_COFINS: entry.D105?.VL_COFINS ?? 0,
      }));
    },
    enabled: false,
  });
}

export function useCorrecoesF100(params: UseCorrecoesSpedParams) {
  return useCorrecoesQuery<F100Item[]>(
    'correcoes-f100',
    '/api/v1/pis_cofins/revisao/transp_outros',
    params,
  );
}

export function useEnviarCorrecoes() {
  const { fetchWithAuth } = useApiAuth();
  const [isSending, setIsSending] = useState(false);

  const enviar = async (registroTipo?: string) => {
    setIsSending(true);
    try {
      let query = supabase
        .from('efd_correcoes')
        .select('id, contribuinte_id, arquivo_id, empresa_cnpj, periodo, arquivo_tipo, registro_tipo, registro_original_id, tipo_operacao, snapshot, campos_alterados, motivo, usuario_id')
        .eq('ativo', true)
        .eq('sync_status', 'P');

      if (registroTipo) {
        query = query.eq('registro_tipo', registroTipo);
      }

      const { data: pendentes, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!pendentes || pendentes.length === 0) {
        toast.info('Nenhuma correção pendente para enviar.');
        return;
      }

      const batchId = crypto.randomUUID();

      const correcoes = pendentes.map((c) => ({
        contribuinte_id: c.contribuinte_id,
        arquivo_id: c.arquivo_id,
        empresa_cnpj: c.empresa_cnpj,
        periodo: c.periodo,
        arquivo_tipo: c.arquivo_tipo,
        registro_tipo: c.registro_tipo,
        registro_original_id: c.registro_original_id,
        tipo_operacao: c.tipo_operacao,
        snapshot: c.snapshot,
        campos_alterados: c.campos_alterados,
        motivo: c.motivo,
        usuario_id: c.usuario_id,
        batch_id: batchId,
      }));

      const url = getApiUrl('/api/v1/pis_cofins/correcoes');
      const response = await fetchWithAuth(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correcoes }),
      });

      const ids = pendentes.map((c) => c.id);

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `HTTP ${response.status}: ${errorText}`;

        await supabase
          .from('efd_correcoes')
          .update({ sync_status: 'E', sync_error: errorMessage })
          .in('id', ids);

        throw new Error(`Erro ao enviar correções: ${response.status}`);
      }

      const { error: updateError } = await supabase
        .from('efd_correcoes')
        .update({
          sync_status: 'S',
          sync_error: null,
          sync_sent_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (updateError) throw updateError;

      toast.success(`${pendentes.length} correção(ões) enviada(s) com sucesso.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao enviar correções.';
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  return { enviar, isSending };
}
