import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { useEFDOverview } from '@/hooks/useEFDData';

interface Params {
  idContribuinte: string;
  dtIni: string;   // "YYYY-MM-DD" — pode ser vazio
  dtFim: string;   // "YYYY-MM-DD" — pode ser vazio
  enabled?: boolean;
}

interface ImportStatus {
  hasEfd: boolean;
  hasBalancete: boolean;
  isChecking: boolean;
  ready: boolean;
}

/**
 * Verifica se o contribuinte tem EFD Contribuições e/ou Balancete importados
 * cobrindo o período `[dtIni, dtFim]`.
 *
 * Usado para personalizar a mensagem de "sem dados" da Apuração PIS/COFINS:
 * a apuração falha se qualquer um dos dois documentos estiver ausente,
 * então este hook diz EXATAMENTE qual está faltando.
 *
 * - EFD: API não suporta filtro por intervalo, então a checagem de overlap
 *   `[DT_INI..DT_FIN]` ∩ `[dtIni..dtFim]` é feita no cliente.
 * - Balancete: a API já filtra server-side por `dt_ini`/`dt_fim`.
 */
export function usePisCofinsImportStatus({
  idContribuinte,
  dtIni,
  dtFim,
  enabled = false,
}: Params): ImportStatus {
  const { fetchWithAuth } = useApiAuth();
  const active = enabled && !!idContribuinte;

  const efdQuery = useEFDOverview({
    idContribuinte,
    tipo: 'contribuicoes',
    enabled: active,
  });

  const balanceteQuery = useQuery<unknown[]>({
    queryKey: ['piscofins-balancete-status', idContribuinte, dtIni, dtFim],
    queryFn: async () => {
      const params = new URLSearchParams({ id_contribuinte: idContribuinte });
      if (dtIni) params.append('dt_ini', dtIni);
      if (dtFim) params.append('dt_fim', dtFim);
      const res = await fetchWithAuth(getApiUrl(`/api/v1/contabil/balancetes?${params}`));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data)
        ? data
        : Array.isArray((data as { balancetes?: unknown })?.balancetes)
          ? (data as { balancetes: unknown[] }).balancetes
          : [];
    },
    enabled: active,
    staleTime: 5 * 60 * 1000,
  });

  const hasEfd = useMemo(() => {
    const arquivos = efdQuery.data?.arquivos ?? [];
    if (arquivos.length === 0) return false;
    if (!dtIni || !dtFim) return true;
    return arquivos.some((a) => a.DT_FIN >= dtIni && a.DT_INI <= dtFim);
  }, [efdQuery.data, dtIni, dtFim]);

  const hasBalancete = (balanceteQuery.data?.length ?? 0) > 0;

  // Só consideramos a checagem "pronta" quando ambas as queries terminaram com
  // sucesso. Em caso de erro nelas, deixamos `ready=false` para que a UI caia
  // no texto genérico em vez de afirmar incorretamente que um documento falta.
  return {
    hasEfd,
    hasBalancete,
    isChecking: efdQuery.isFetching || balanceteQuery.isFetching,
    ready:
      active &&
      !efdQuery.isLoading &&
      !balanceteQuery.isLoading &&
      !efdQuery.isError &&
      !balanceteQuery.isError,
  };
}
