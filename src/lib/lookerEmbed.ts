/**
 * Builds a Looker Studio embed URL with the `params` query string that the
 * report consumes (typically bound to one or more parameters on data sources).
 *
 * Looker Studio expects: `?params=<URL-encoded JSON object>`
 * Example single-source:   `?params=%7B%22ds0.cluster_id%22%3A%22abc%22%7D`
 * Example multi-source:    sets the same value on every `dsN.<param>` key, so
 * a relatório com mais de uma fonte recebe o filtro em todas as fontes.
 *
 * Returns the original URL untouched when `paramNames` está vazio ou `value`
 * está vazio, para dashboards sem RLS continuarem funcionando.
 */
export function buildLookerEmbedUrl(
  baseUrl: string,
  paramNames: string[] | undefined,
  value: string | undefined,
): string {
  if (!paramNames || paramNames.length === 0 || !value) return baseUrl;
  const payload = JSON.stringify(
    paramNames.reduce<Record<string, string>>((acc, name) => {
      acc[name] = value;
      return acc;
    }, {}),
  );
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}params=${encodeURIComponent(payload)}`;
}
