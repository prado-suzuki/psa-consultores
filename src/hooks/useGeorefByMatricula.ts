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

type FetchComAuth = ReturnType<typeof useApiAuth>['fetchWithAuth'];

/**
 * A busca em si, uma só para os dois hooks. 404 vira `null` (matrícula sem
 * georref não é erro; o documento apenas não renderiza a tabela); demais falhas
 * propagam.
 */
async function buscarGeoref(fetchWithAuth: FetchComAuth, matriculaId: string): Promise<GeorefData | null> {
  const res = await fetchWithAuth(
    getApiUrl(`/api/v1/osg/documentos/georreferenciamento?matricula_id=${matriculaId}`),
    { method: 'GET' },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Falha ao buscar georreferenciamento');
  return (await res.json()) as GeorefData;
}

/** Georref da matrícula (`matriculaId` == georef_cabecalho.id_matricula). */
export function useGeorefByMatricula(matriculaId: string | null | undefined) {
  const { fetchWithAuth } = useApiAuth();
  return useQuery<GeorefData | null>({
    queryKey: ['georef-by-matricula', matriculaId],
    enabled: !!matriculaId,
    queryFn: () => buscarGeoref(fetchWithAuth, matriculaId!),
  });
}

/**
 * O georref de VÁRIAS matrículas (uma consulta por matrícula, no mesmo cache de
 * `useGeorefByMatricula`), indexado por id.
 *
 * O resultado sai por `combine` de propósito, e o índice é um objeto simples e
 * não um `Map`: a identidade precisa ser ESTÁVEL entre renders. `useQueries`
 * devolve um array novo a cada render, e um índice novo aqui invalidaria em
 * cascata `imoveisSelecionados` → `itensPorLista` → o memo do documento, fazendo
 * a tela Gerar recompor o documento INTEIRO a cada render, mesmo sem nada
 * selecionado. O `combine` do react-query aplica `replaceEqualDeep` no valor
 * devolvido, o que só preserva a identidade para estruturas simples — Map não é
 * uma delas.
 */
export function useGeorefsByMatriculas(matriculaIds: readonly string[]) {
  const { fetchWithAuth } = useApiAuth();
  return useQueries({
    queries: matriculaIds.map((matriculaId) => ({
      queryKey: ['georef-by-matricula', matriculaId],
      queryFn: () => buscarGeoref(fetchWithAuth, matriculaId),
    })),
    combine: (consultas) => ({
      porMatricula: Object.fromEntries(
        matriculaIds.map((id, indice) => [id, consultas[indice]?.data ?? null]),
      ) as Record<string, GeorefData | null>,
      isFetching: consultas.some((consulta) => consulta.isFetching),
    }),
  });
}
