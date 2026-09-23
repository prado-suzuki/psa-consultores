import type { NotificacaoLog } from '@/hooks/useNotificacoesDocumento';

/**
 * Colunas que o sistema escreve sozinho e que não são variável do documento.
 * `documento_gerado_id` é o carimbo que o registro na junta põe nos movimentos.
 */
export const CAMPOS_DE_SISTEMA: ReadonlySet<string> = new Set([
  'documento_gerado_id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
]);

/**
 * Tira os carimbos de sistema do diff; o log que só tinha carimbo sai inteiro,
 * senão viraria "atualizado" sem dizer o quê e contaria no badge.
 */
export function semCarimbosDeSistema(logs: readonly NotificacaoLog[]): NotificacaoLog[] {
  const out: NotificacaoLog[] = [];
  for (const log of logs) {
    if (!log.changed_fields) {
      out.push(log);
      continue;
    }
    const campos = Object.entries(log.changed_fields).filter(([campo]) => !CAMPOS_DE_SISTEMA.has(campo));
    if (campos.length === 0 && Object.keys(log.changed_fields).length > 0) continue;
    out.push({ ...log, changed_fields: Object.fromEntries(campos) });
  }
  return out;
}
