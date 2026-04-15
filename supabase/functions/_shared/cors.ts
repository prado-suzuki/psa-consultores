/**
 * Helper centralizado de CORS para Edge Functions.
 *
 * Substitui o padrão `Access-Control-Allow-Origin: *` por uma whitelist
 * explícita de origins. Usuários internos (server-to-server, cron, fetch
 * sem origin) continuam permitidos — só bloqueia browsers de origens não
 * autorizadas.
 *
 * Padrão de uso:
 *
 *   import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";
 *
 *   serve(async (req) => {
 *     const preflight = handleCorsPreflightRequest(req);
 *     if (preflight) return preflight;
 *
 *     const cors = buildCorsHeaders(req);
 *     try {
 *       // ... lógica ...
 *       return new Response(JSON.stringify(result), {
 *         headers: { ...cors, "Content-Type": "application/json" },
 *       });
 *     } catch (err) {
 *       return new Response(JSON.stringify({ error: err.message }), {
 *         status: 500,
 *         headers: { ...cors, "Content-Type": "application/json" },
 *       });
 *     }
 *   });
 */

/**
 * Origins explicitamente autorizados.
 * - Domínios de produção do projeto.
 * - Subdomínios de preview do Lovable (lovable.app / lovable.dev).
 * - localhost para desenvolvimento.
 */
const ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/psa-consultores\.lovable\.app$/,
  /^https:\/\/psaconsultores\.com\.br$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.dev$/,
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
];

const ALLOWED_HEADERS = [
  "authorization",
  "x-client-info",
  "apikey",
  "content-type",
  "x-supabase-client-platform",
  "x-supabase-client-platform-version",
  "x-supabase-client-runtime",
  "x-supabase-client-runtime-version",
  "x-api-key",
].join(", ");

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

/**
 * Decide qual valor retornar em `Access-Control-Allow-Origin` para um request:
 * - Se Origin ausente (chamada server-to-server, curl, cron) → não inclui o
 *   header (browsers só aplicam CORS quando há Origin; ausência = sem
 *   restrição CORS aplicável).
 * - Se Origin presente e autorizado → ecoa o origin (mais restritivo que `*`,
 *   permite credenciais).
 * - Se Origin presente e NÃO autorizado → não inclui o header (browser bloqueia).
 */
function resolveAllowedOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  return ORIGIN_PATTERNS.some((pattern) => pattern.test(origin)) ? origin : null;
}

/**
 * Retorna os headers CORS a serem mesclados em todas as Response de uma
 * Edge Function. Inclui `Vary: Origin` para que caches CDN/proxy não
 * sirvam a resposta de um origin para outro.
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  const allowedOrigin = resolveAllowedOrigin(req);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    Vary: "Origin",
  };
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }
  return headers;
}

/**
 * Trata preflight OPTIONS. Retorna uma `Response` se o método é OPTIONS,
 * `null` caso contrário (a função handler deve continuar normalmente).
 */
export function handleCorsPreflightRequest(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { headers: buildCorsHeaders(req) });
}
