/**
 * Unico ponto do front que sabe DE ONDE vem o dado do dashboard "Controle de
 * uso e envio". Hoje: fixtures gravados de producao. Depois: Cloud Run.
 *
 * Componentes e hooks falam so com estas tres funcoes, entao a troca nao
 * encosta em nenhum grafico — some a env var e o `fetchWithAuth` assume.
 *
 * Enquanto `VITE_ANALYTICS_USO_FIXTURES=1`, o periodo continua congelado, mas
 * o filtro por pessoa usa payloads segmentados gerados pela mesma SQL de
 * producao. Assim o cross-filter local recalcula os blocos, sem fingir uma
 * filtragem sobre agregados incompletos.
 */
import { getApiUrl } from '@/config/api';
import type {
  AnalyticsArquivosResponse,
  AnalyticsUsoApiResponse,
  AnalyticsUsoFiltros,
  AnalyticsUsoFiltrosResponse,
} from './types';

export const USANDO_FIXTURES = import.meta.env.VITE_ANALYTICS_USO_FIXTURES === '1';

const BASE = '/api/v1/analytics/uso';

export function toSearchParams(filtros: AnalyticsUsoFiltros): string {
  const sp = new URLSearchParams({ inicio: filtros.inicio, fim: filtros.fim });
  if (filtros.usuario) sp.set('usuario', filtros.usuario);
  if (filtros.ferramenta) sp.set('ferramenta', filtros.ferramenta);
  if (filtros.clusterId) sp.set('cluster_id', filtros.clusterId);
  return sp.toString();
}

interface SegmentoUsuarioFixture {
  usoApi: AnalyticsUsoApiResponse;
  arquivos: AnalyticsArquivosResponse;
}

type SegmentosUsuarioFixture = Record<string, SegmentoUsuarioFixture>;

async function carregarSegmentoFerramenta(ferramenta: string): Promise<AnalyticsUsoApiResponse> {
  const segmentos = (await import('./__fixtures__/por-ferramenta.json'))
    .default as unknown as Record<string, AnalyticsUsoApiResponse>;
  const segmento = segmentos[ferramenta];
  if (!segmento) {
    throw new Error(`Ferramenta sem segmento no fixture: ${ferramenta}. Regenere os fixtures.`);
  }
  return segmento;
}

async function carregarSegmentoUsuario(usuario: string): Promise<SegmentoUsuarioFixture> {
  const segmentos = (await import('./__fixtures__/por-usuario.json'))
    .default as SegmentosUsuarioFixture;
  const segmento = segmentos[usuario];
  if (!segmento) {
    throw new Error(`Pessoa sem segmento no fixture: ${usuario}. Regenere os fixtures.`);
  }
  return segmento;
}

/** Mesmo tratamento de erro dos hooks de API existentes (useCalculadoraIbsCbs). */
async function parseError(response: Response, base: string): Promise<Error> {
  const body = await response.text();
  let detail = body;
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.detail?.error_message ?? parsed?.detail ?? parsed?.message ?? body;
    if (typeof detail !== 'string') detail = JSON.stringify(detail);
  } catch {
    // mantém corpo bruto se não for JSON
  }
  const err = new Error(`${base} ${response.status} - ${detail}`);
  (err as Error & { status?: number }).status = response.status;
  return err;
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export async function fetchFiltros(fetchWithAuth: Fetcher): Promise<AnalyticsUsoFiltrosResponse> {
  if (USANDO_FIXTURES) {
    return (await import('./__fixtures__/filtros.json')).default as AnalyticsUsoFiltrosResponse;
  }
  const response = await fetchWithAuth(getApiUrl(`${BASE}/filtros`));
  if (!response.ok) throw await parseError(response, 'Filtros');
  return response.json();
}

export async function fetchUsoApi(
  fetchWithAuth: Fetcher,
  filtros: AnalyticsUsoFiltros,
): Promise<AnalyticsUsoApiResponse> {
  if (USANDO_FIXTURES) {
    // Fixture nao combina dois recortes; pessoa tem precedencia sobre ferramenta.
    if (filtros.usuario) return (await carregarSegmentoUsuario(filtros.usuario)).usoApi;
    if (filtros.ferramenta) return carregarSegmentoFerramenta(filtros.ferramenta);
    return (await import('./__fixtures__/uso-api.json')).default as AnalyticsUsoApiResponse;
  }
  const response = await fetchWithAuth(getApiUrl(`${BASE}/api-consumo?${toSearchParams(filtros)}`));
  if (!response.ok) throw await parseError(response, 'Uso da API');
  return response.json();
}

export async function fetchArquivos(
  fetchWithAuth: Fetcher,
  filtros: AnalyticsUsoFiltros,
): Promise<AnalyticsArquivosResponse> {
  if (USANDO_FIXTURES) {
    if (filtros.usuario) return (await carregarSegmentoUsuario(filtros.usuario)).arquivos;
    return (await import('./__fixtures__/arquivos.json')).default as AnalyticsArquivosResponse;
  }
  const response = await fetchWithAuth(getApiUrl(`${BASE}/arquivos?${toSearchParams(filtros)}`));
  if (!response.ok) throw await parseError(response, 'Envio de arquivos');
  return response.json();
}
