import { useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import type { PisCofinsApuracaoResponse } from '@/types/pisCofins';

interface UsePisCofinsApuracaoParams {
  idContribuinte: string;
  dtIni: string;
  dtFim: string;
  enabled?: boolean;
}

export function usePisCofinsApuracao({ idContribuinte, dtIni, dtFim, enabled = false }: UsePisCofinsApuracaoParams) {
  const { fetchWithAuth } = useApiAuth();

  return useQuery({
    queryKey: ['pis-cofins-apuracao', idContribuinte, dtIni, dtFim],
    queryFn: async (): Promise<PisCofinsApuracaoResponse> => {
      if (!idContribuinte) throw new Error('Contribuinte é obrigatório');

      const url = new URL(getApiUrl(`/api/v1/pis_cofins/apuracao`));
      url.searchParams.set('id_contribuinte', idContribuinte);
      if (dtIni) url.searchParams.set('dt_ini', dtIni);
      if (dtFim) url.searchParams.set('dt_fim', dtFim);

      const res = await fetchWithAuth(url.toString());
      if (!res.ok) {
        let errorMessage = `Erro ${res.status}`;
        try {
          const body = await res.json();
          errorMessage = body.error_message || body.message || errorMessage;
        } catch {
          // fallback to status text
        }
        if (res.status === 400) {
          toast({ title: 'Erro de validação', description: errorMessage, variant: 'destructive' });
        }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    enabled: enabled && !!idContribuinte,
  });
}
