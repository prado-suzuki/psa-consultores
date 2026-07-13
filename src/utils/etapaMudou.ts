// Compara uma etapa contra seu estado original (mesmo id) para decidir se há
// algo a gravar. Evita re-salvar (e reconciliar destrutivamente as junções) de
// etapas que o usuário não tocou — a causa do "horas zeradas em cascata" (AS-IS e TO-BE).
// Extraído de MapearProcessoPage para ser testável isoladamente.

import type { Etapa, DocRef, ResponsavelEtapa } from '@/types';

export function etapaMudou(a: Etapa | undefined, b: Etapa): boolean {
  if (!a) return true;
  const campos: (keyof Etapa)[] = ['name', 'description', 'execution', 'stage_order',
    'volume_per_process', 'error_rate', 'rework_rate'];
  if (campos.some(k => (a[k] ?? null) !== (b[k] ?? null))) return true;
  const docsKey = (xs?: DocRef[]) => JSON.stringify((xs || []).map(x => [x.documentoId ?? x.nome, x.volume ?? 0]).sort());
  const respKey = (xs?: ResponsavelEtapa[]) => JSON.stringify((xs || []).map(x => [x.responsavelId ?? x.nome, x.horas ?? 0]).sort());
  if (docsKey(a.docsEntrada) !== docsKey(b.docsEntrada)) return true;
  if (docsKey(a.docsSaida) !== docsKey(b.docsSaida)) return true;
  if (respKey(a.executadoPor) !== respKey(b.executadoPor)) return true;
  if (JSON.stringify([...(a.sistemas || [])].sort()) !== JSON.stringify([...(b.sistemas || [])].sort())) return true;
  return false;
}
