/**
 * Unico ponto do front que sabe DE ONDE vem o dado do dashboard "Controle de
 * uso e envio". Hoje: fixtures gravados de producao. Depois: Cloud Run.
 *
 * Componentes e hooks falam so com estas duas funcoes, entao a troca nao
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
} from './types';
import {
  analyticsArquivosSchema,
  analyticsUsoApiSchema,
  parseAnalyticsResponse,
} from './schemas';

export const USANDO_FIXTURES =
  import.meta.env.DEV &&
  import.meta.env.MODE !== 'test' &&
  import.meta.env.VITE_ANALYTICS_USO_FIXTURES === '1';

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
  return parseAnalyticsResponse(analyticsUsoApiSchema, segmento);
}

async function carregarSegmentoUsuario(usuario: string): Promise<SegmentoUsuarioFixture> {
  const segmentos = (await import('./__fixtures__/por-usuario.json'))
    .default as SegmentosUsuarioFixture;
  const segmento = segmentos[usuario];
  if (!segmento) {
    throw new Error(`Pessoa sem segmento no fixture: ${usuario}. Regenere os fixtures.`);
  }
  return {
    usoApi: parseAnalyticsResponse(analyticsUsoApiSchema, segmento.usoApi),
    arquivos: parseAnalyticsResponse(analyticsArquivosSchema, segmento.arquivos),
  };
}

/** Mensagem segura para a tela; detalhes técnicos permanecem no servidor. */
async function parseError(response: Response, base: string): Promise<Error> {
  void response.body?.cancel().catch(() => undefined);
  const requestId = response.headers.get('x-request-id');
  const mensagem =
    response.status === 401 || response.status === 403
      ? 'Sua sessão não permite consultar estes dados.'
      : response.status === 429
        ? 'Muitas atualizações em sequência. Aguarde alguns instantes e tente novamente.'
        : response.status >= 500
          ? 'A fonte de dados está temporariamente indisponível.'
          : 'Não foi possível carregar os dados com os filtros selecionados.';
  const err = new Error(`${base}: ${mensagem}${requestId ? ` Código ${requestId}.` : ''}`);
  const retryAfter = response.headers.get('retry-after');
  const segundos = retryAfter ? Number(retryAfter) : Number.NaN;
  const dataRetry = retryAfter && !Number.isFinite(segundos) ? Date.parse(retryAfter) : Number.NaN;
  const retryAfterMs = Number.isFinite(segundos)
    ? segundos * 1_000
    : Number.isFinite(dataRetry)
      ? Math.max(0, dataRetry - Date.now())
      : undefined;
  const tipado = err as Error & { status?: number; requestId?: string; retryAfterMs?: number };
  tipado.status = response.status;
  tipado.requestId = requestId ?? undefined;
  tipado.retryAfterMs = Number.isFinite(retryAfterMs) ? retryAfterMs : undefined;
  return err;
}

type Fetcher = (
  url: string,
  init?: RequestInit,
  timeoutMs?: number,
  maxRetries?: number,
) => Promise<Response>;

export async function fetchUsoApi(
  fetchWithAuth: Fetcher,
  filtros: AnalyticsUsoFiltros,
  signal?: AbortSignal,
): Promise<AnalyticsUsoApiResponse> {
  if (USANDO_FIXTURES) {
    // Fixture nao combina dois recortes; pessoa tem precedencia sobre ferramenta.
    if (filtros.usuario) return (await carregarSegmentoUsuario(filtros.usuario)).usoApi;
    if (filtros.ferramenta) return carregarSegmentoFerramenta(filtros.ferramenta);
    return parseAnalyticsResponse(
      analyticsUsoApiSchema,
      (await import('./__fixtures__/uso-api.json')).default,
    );
  }
  const response = await fetchWithAuth(
    getApiUrl(`${BASE}/api-consumo?${toSearchParams(filtros)}`),
    { signal },
    30_000,
    1,
  );
  if (!response.ok) throw await parseError(response, 'Uso da API');
  return parseAnalyticsResponse(analyticsUsoApiSchema, await response.json());
}

export async function fetchArquivos(
  fetchWithAuth: Fetcher,
  filtros: AnalyticsUsoFiltros,
  signal?: AbortSignal,
): Promise<AnalyticsArquivosResponse> {
  if (USANDO_FIXTURES) {
    if (filtros.usuario) return (await carregarSegmentoUsuario(filtros.usuario)).arquivos;
    return parseAnalyticsResponse(
      analyticsArquivosSchema,
      (await import('./__fixtures__/arquivos.json')).default,
    );
  }
  const response = await fetchWithAuth(
    getApiUrl(`${BASE}/arquivos?${toSearchParams(filtros)}`),
    { signal },
    30_000,
    1,
  );
  if (!response.ok) throw await parseError(response, 'Envio de arquivos');
  return parseAnalyticsResponse(analyticsArquivosSchema, await response.json());
}
