/**
 * Divide um nome completo em first_name / last_name.
 * Compatível com a edge function `upsert-representante-user`.
 */
export const splitName = (
  full: string | null | undefined,
): { first_name: string; last_name: string | null } => {
  const trimmed = (full ?? '').trim();
  if (!trimmed) return { first_name: '', last_name: null };
  const idx = trimmed.indexOf(' ');
  if (idx === -1) return { first_name: trimmed, last_name: null };
  const first = trimmed.substring(0, idx);
  const rest = trimmed.substring(idx + 1).trim();
  return { first_name: first, last_name: rest || null };
};
