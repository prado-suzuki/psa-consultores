import { useQueries, useQuery } from '@tanstack/react-query';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import type { GeorefCabecalhoRow, GeorefVerticeRow } from '@/lib/templates/mapeadores';

// Caminho de volta do georreferenciamento: lê do BigQuery (psa_osg.georef_*) via
// backend o georref mais recente de uma matrícula — cabeçalho (área/perímetro/
// sistema/certificação) + vértices ordenados. Alimenta a tabela de vértices e os
// campos georef* do contrato na tela Gerar (ver mapearVertice/mapearGeorefCabecalho).

export interface GeorefData {
  cabecalho: GeorefCabecalhoRow;
  vertices: GeorefVerticeRow[];
}

/**
 * Georref da matrícula (`matriculaId` == georef_cabecalho.id_matricula). Retorna
 * `null` quando a matrícula não tem georref (404) — não é erro; o documento só
 * não renderiza a tabela. Demais falhas propagam.
 */
export function useGeorefsByMatriculas(matriculaIds: readonly string[]) {
  const { fetchWithAuth } = useApiAuth();
  const consultas = useQueries({
    queries: matriculaIds.map((matriculaId) => ({
      queryKey: ['georef-by-matricula', matriculaId],
      queryFn: async (): Promise<GeorefData | null> => {
        const res = await fetchWithAuth(
          getApiUrl(`/api/v1/osg/documentos/georreferenciamento?matricula_id=${matriculaId}`),
          { method: 'GET' },
        );
        if (res.status === 404) return null;
        if (!res.ok) throw new Error('Falha ao buscar georreferenciamento');
        return (await res.json()) as GeorefData;
      },
    })),
  });

  return {
    porMatricula: new Map(matriculaIds.map((id, indice) => [id, consultas[indice]?.data ?? null])),
    isFetching: consultas.some((consulta) => consulta.isFetching),
  };
}

export function useGeorefByMatricula(matriculaId: string | null | undefined) {
  const { fetchWithAuth } = useApiAuth();
  return useQuery<GeorefData | null>({
    queryKey: ['georef-by-matricula', matriculaId],
    enabled: !!matriculaId,
    queryFn: async () => {
      const res = await fetchWithAuth(
        getApiUrl(`/api/v1/osg/documentos/georreferenciamento?matricula_id=${matriculaId}`),
        { method: 'GET' },
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Falha ao buscar georreferenciamento');
      return (await res.json()) as GeorefData;
    },
  });
}
