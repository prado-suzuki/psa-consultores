import type { Page, Request } from '@playwright/test';

export interface RecordedWrite {
  method: string;
  table: string;
  body: unknown;
  url: string;
}

/**
 * Intercepta TODA escrita no Supabase (POST/PATCH/DELETE/PUT em /rest/v1/).
 * - GET/HEAD passam direto (as páginas carregam dados reais).
 * - Escritas NÃO chegam ao banco: são registradas e respondidas com um
 *   sucesso falso plausível. Nada é gravado em produção.
 *
 * Retorna o array de escrituras capturadas (para assertir o wiring dos botões).
 */
export async function installWriteGuard(page: Page): Promise<RecordedWrite[]> {
  const writes: RecordedWrite[] = [];

  await page.route('**/rest/v1/**', async (route) => {
    const req: Request = route.request();
    const method = req.method();

    if (method === 'GET' || method === 'HEAD') {
      return route.continue();
    }

    const url = new URL(req.url());
    const table = url.pathname.split('/rest/v1/')[1]?.split('?')[0] ?? '';
    let body: unknown = null;
    try {
      body = req.postDataJSON();
    } catch {
      body = req.postData();
    }
    writes.push({ method, table, body, url: req.url() });

    // resposta falsa: eco do payload com id fake, no formato que o PostgREST devolve
    let payload = '[]';
    if (method === 'POST') {
      const rows = Array.isArray(body) ? body : body ? [body] : [{}];
      payload = JSON.stringify(
        rows.map((r: Record<string, unknown>, i: number) => ({ id: `e2e-mock-${i}`, ...r }))
      );
    } else if (method === 'PATCH' || method === 'PUT') {
      const merged = body && typeof body === 'object' ? body : {};
      payload = JSON.stringify([{ id: 'e2e-mock', ...(merged as Record<string, unknown>) }]);
    }

    await route.fulfill({
      status: method === 'POST' ? 201 : 200,
      contentType: 'application/json',
      headers: { 'Content-Range': '0-0/*' },
      body: payload,
    });
  });

  return writes;
}
