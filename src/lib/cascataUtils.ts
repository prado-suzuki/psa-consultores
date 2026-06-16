import type { Documento } from '@/types';
import { canon } from '@/utils/cascataEngine';

type DocComCanonico = Documento & { canonicoId?: string | null; canonico_id?: string | null };

/** Retorna o ID canônico com prefixo "doc:" — usado pela BFS de invalidação documental. */
export function resolveCanonicoId(docId: string, docsById: Map<string, Documento>): string {
  const d = docsById.get(docId) as DocComCanonico | undefined;
  if (!d) return `doc:${docId}`;
  const canonicoId = d.canonicoId ?? d.canonico_id;
  if (canonicoId && docsById.has(canonicoId)) return `doc:${canonicoId}`;
  return `doc:${docId}`;
}

/** Retorna o nome canônico normalizado — usado pelo grafo cross-process (cascataEngine). */
export function resolveCanonicoNome(docId: string, docsById: Map<string, Documento>): string {
  const d = docsById.get(docId) as DocComCanonico | undefined;
  if (!d) return '';
  const canonicoId = d.canonicoId ?? d.canonico_id;
  if (canonicoId && docsById.has(canonicoId)) return canon(docsById.get(canonicoId)!.nome);
  return canon(d.nome);
}
