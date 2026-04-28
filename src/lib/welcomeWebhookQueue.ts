import { N8N_WELCOME_WEBHOOK, PSA_LOGIN_URL, PSA_PLATFORM_NAME } from './webhooks';

/**
 * Fila serial e com throttle para o webhook N8n de boas-vindas.
 *
 * O workflow N8n não possui rate limiting interno e dispara via Gmail API,
 * que tem limite por usuário. Para evitar 429 / falhas em rajada:
 *   - despacha 1 POST por vez (concorrência 1)
 *   - espaça MIN_INTERVAL_MS entre disparos
 *   - retry com backoff exponencial em erros de rede / timeout / 429 / 5xx
 *   - falhas são reportadas mas NÃO interrompem o lote
 */

const MIN_INTERVAL_MS = 500;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const BACKOFF_MS = [1_000, 3_000, 9_000];

export interface WelcomeWebhookPayload {
  first_name: string;
  last_name: string | null;
  email: string;
  temporary_password: string;
  created_by: string;
  roles?: string[];
  areas?: string[];
}

export interface WebhookDispatchResult {
  email: string;
  ok: boolean;
  error?: string;
}

const buildBody = (p: WelcomeWebhookPayload) => ({
  event_type: 'user_created' as const,
  user_data: {
    first_name: p.first_name,
    last_name: p.last_name ?? '',
    email: p.email,
    roles: p.roles ?? ['client'],
    areas: p.areas ?? [],
  },
  credentials: {
    email: p.email,
    temporary_password: p.temporary_password,
  },
  platform: {
    login_url: PSA_LOGIN_URL,
    name: PSA_PLATFORM_NAME,
  },
  created_by: p.created_by,
  created_at: new Date().toISOString(),
});

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const isRetryable = (status: number) => status === 429 || status >= 500;

const dispatchOnce = async (payload: WelcomeWebhookPayload): Promise<WebhookDispatchResult> => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(N8N_WELCOME_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': payload.email },
        body: JSON.stringify(buildBody(payload)),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) return { email: payload.email, ok: true };

      // 4xx (não-429) → não tenta novamente
      if (!isRetryable(res.status)) {
        const text = await res.text().catch(() => '');
        return { email: payload.email, ok: false, error: `HTTP ${res.status}: ${text.slice(0, 120)}` };
      }

      // retryable
      if (attempt === MAX_RETRIES) {
        return { email: payload.email, ok: false, error: `HTTP ${res.status} após ${MAX_RETRIES + 1} tentativas` };
      }
      await sleep(BACKOFF_MS[attempt] ?? 9_000);
    } catch (err: unknown) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : 'erro desconhecido';
      if (attempt === MAX_RETRIES) {
        return { email: payload.email, ok: false, error: `Falha de rede: ${msg}` };
      }
      await sleep(BACKOFF_MS[attempt] ?? 9_000);
    }
  }
  return { email: payload.email, ok: false, error: 'unreachable' };
};

/**
 * Processa uma lista de payloads em série, com throttle e retry.
 * Retorna a lista de resultados na mesma ordem.
 */
export const dispatchWelcomeWebhooks = async (
  payloads: WelcomeWebhookPayload[],
  onProgress?: (done: number, total: number, last: WebhookDispatchResult) => void,
): Promise<WebhookDispatchResult[]> => {
  const results: WebhookDispatchResult[] = [];
  for (let i = 0; i < payloads.length; i++) {
    if (i > 0) await sleep(MIN_INTERVAL_MS);
    const r = await dispatchOnce(payloads[i]);
    results.push(r);
    onProgress?.(i + 1, payloads.length, r);
  }
  return results;
};
