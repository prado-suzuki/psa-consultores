/**
 * Logger centralizado.
 *
 * Hoje apenas envolve `console.*`, mas concentra todas as chamadas em um
 * único ponto. Trocar por Sentry / Datadog / outro provedor passa a ser
 * mudança em um arquivo só (em vez de varrer ~270 `console.*` espalhados).
 *
 * Em produção, `debug` é silencioso. Os demais níveis sempre saem no console.
 */

const isProd = import.meta.env.MODE === 'production';

export interface LogContext {
  /** Tag/escopo da mensagem (ex: 'Auth', 'Tickets', 'TaxDashboard'). */
  scope?: string;
  /** Dados estruturados auxiliares (user_id, route, etc). */
  data?: Record<string, unknown>;
}

const fmt = (level: string, message: string, ctx?: LogContext): string => {
  const scope = ctx?.scope ? `[${ctx.scope}]` : '';
  return `${level} ${scope} ${message}`.trim();
};

export const logger = {
  debug(message: string, ctx?: LogContext) {
    if (isProd) return;
    console.debug(fmt('DEBUG', message, ctx), ctx?.data ?? '');
  },
  info(message: string, ctx?: LogContext) {
    console.info(fmt('INFO', message, ctx), ctx?.data ?? '');
  },
  warn(message: string, ctx?: LogContext) {
    console.warn(fmt('WARN', message, ctx), ctx?.data ?? '');
  },
  /**
   * `error` aceita um Error opcional para preservar stack trace.
   * Esse é o ponto a substituir pelo provider de error tracking
   * (ex: `Sentry.captureException(error, { tags: ctx?.scope, extra: ctx?.data })`).
   */
  error(message: string, error?: unknown, ctx?: LogContext) {
    console.error(fmt('ERROR', message, ctx), error ?? '', ctx?.data ?? '');
  },
};
