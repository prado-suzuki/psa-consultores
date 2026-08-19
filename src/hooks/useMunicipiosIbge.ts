import { useQuery } from '@tanstack/react-query';
import { parseMunicipiosIbge, siglaDaUf, urlMunicipiosIbge } from '@/lib/municipiosIbge';

/** Fica um dia em memória depois que ninguém mais usa. */
const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Corta a espera em vez de deixar o campo carregando para sempre. */
const TIMEOUT_MS = 8000;

/**
 * A lista de municípios de uma UF, direto do IBGE.
 *
 * `staleTime` infinito de propósito: não nasce município no Brasil desde 2013,
 * então revalidar seria gastar rede para receber a mesma resposta. Uma consulta
 * por UF por sessão.
 *
 * Aceita a UF como está gravada, inclusive por extenso ("MATO GROSSO"), e
 * traduz para sigla antes de consultar. Sem UF reconhecida não consulta nada.
 *
 * `retry: 1` porque é servidor de terceiro: uma segunda chance cobre oscilação,
 * e insistir mais só atrasaria o aviso de que a lista não veio.
 */
export function useMunicipiosIbge(ufGravada: string | null | undefined) {
  const sigla = siglaDaUf(ufGravada);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['municipios-ibge', sigla],
    enabled: !!sigla,
    staleTime: Infinity,
    gcTime: UM_DIA_MS,
    retry: 1,
    queryFn: async () => {
      const res = await fetch(urlMunicipiosIbge(sigla!), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);
      return parseMunicipiosIbge(await res.json());
    },
  });

  return {
    /** Sigla resolvida, ou `undefined` quando a UF está vazia ou irreconhecível. */
    sigla,
    municipios: data ?? [],
    isLoading: !!sigla && isLoading,
    isError,
    refetch,
  };
}
