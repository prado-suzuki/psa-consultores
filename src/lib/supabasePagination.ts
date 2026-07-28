/**
 * Leitura paginada para tabelas grandes.
 *
 * O PostgREST corta a resposta no limite de linhas do projeto (padrão 1000 no Supabase) e não
 * avisa: a tela recebe uma fatia e trata como se fosse o total — contadores erram, somas de horas
 * ficam menores e, em dados hierárquicos, a mãe chega sem as filhas (ou a filha sem a mãe). Pior,
 * sem `ORDER BY` estável a fatia muda de uma consulta para outra, então cada página é sempre
 * ordenada por uma coluna única no chamador.
 */

export const SUPABASE_PAGE_SIZE = 500;
const SUPABASE_MAX_PAGES = 40;

export interface SupabasePage<T> {
  data: T[] | null;
  error: unknown;
  count?: number | null;
}

export interface PaginatedRows<T> {
  rows: T[];
  /** Erro da primeira página que falhou — as linhas já lidas vêm junto, cabe ao chamador decidir. */
  error: unknown;
  /** Bateu no teto de páginas: o resultado está incompleto. */
  truncated: boolean;
}

/**
 * Lê todas as páginas de uma consulta. `fetchPage` recebe o intervalo e devolve a query já
 * montada — ex.: `(from, to) => supabase.from('x').select('*', { count: 'exact' })
 * .order('id', { ascending: true }).range(from, to)`.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<SupabasePage<T>>,
  options: { pageSize?: number; maxPages?: number } = {},
): Promise<PaginatedRows<T>> {
  const pageSize = options.pageSize ?? SUPABASE_PAGE_SIZE;
  const maxPages = options.maxPages ?? SUPABASE_MAX_PAGES;
  const rows: T[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const { data, error, count } = await fetchPage(from, from + pageSize - 1);
    if (error) return { rows, error, truncated: false };
    const batch = data ?? [];
    rows.push(...batch);
    // Página incompleta é o único sinal confiável de fim. O total serve só de atalho: quando o
    // PostgREST não devolve `count`, compará-lo com o acumulado pararia já na 1ª página e
    // truncaria tudo em `pageSize` — exatamente o bug que a paginação existe para evitar.
    if (batch.length < pageSize) return { rows, error: null, truncated: false };
    if (typeof count === 'number' && rows.length >= count) {
      return { rows, error: null, truncated: false };
    }
  }
  return { rows, error: null, truncated: true };
}
