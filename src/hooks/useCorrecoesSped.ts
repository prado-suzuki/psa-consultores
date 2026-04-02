import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import type { CorrecoesSpedResponse, A170Item, A170Response, A170Snapshot, D100Item, F100Item } from '@/types/correcoesSped';

interface UseCorrecoesSpedParams {
  id_contribuinte: string;
  dt_ini: string;
  dt_fin: string;
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
            CHV_NFSE: entry.CHV_NFSE ?? a170.CHV_NFSE ?? null,
            DT_DOC: entry.DT_DOC ?? a170.DT_DOC,
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
      const { data: correcoes, error: correcoesError } = await supabase
        .from('efd_correcoes')
        .select('registro_original_id, snapshot')
        .eq('registro_tipo', 'A170')
        .eq('ativo', true)
        .in('registro_original_id', uuids);

      if (correcoesError) {
        throw correcoesError;
      }

      const correcoesPorRegistro = new Map(
        (correcoes ?? [])
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
  return useCorrecoesQuery<D100Item[]>(
    'correcoes-d100',
    '/api/v1/pis_cofins/revisao/transp',
    params,
  );
}

export function useCorrecoesF100(params: UseCorrecoesSpedParams) {
  return useCorrecoesQuery<F100Item[]>(
    'correcoes-f100',
    '/api/v1/pis_cofins/revisao/transp_outros',
    params,
  );
}
