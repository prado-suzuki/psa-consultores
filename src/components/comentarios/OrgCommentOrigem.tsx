import { ChevronRight, FolderKanban, ListChecks } from 'lucide-react';

import type { OrgComment } from '@/hooks/useDomainOrgComments';

/**
 * De onde veio o comentário, na thread consolidada do projeto.
 *
 * Só aparece quando a origem muda: um bloco de falas da mesma tarefa é
 * anunciado uma vez e segue como conversa, no mesmo desenho do cabeçalho de
 * origem do feed (tipo › título). Sem isto, comentário de tarefa e de projeto
 * ficariam empilhados sem dizer sobre o que cada um fala.
 */
export function OrgCommentOrigem({ comentario }: { comentario: OrgComment }) {
  const ehProjeto = comentario.entity_type === 'org_project';
  const Icone = ehProjeto ? FolderKanban : ListChecks;

  return (
    <div className="flex min-w-0 items-center gap-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Icone aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="shrink-0">{ehProjeto ? 'Projeto' : 'Tarefa'}</span>
      <ChevronRight aria-hidden className="h-3 w-3 shrink-0 opacity-60" />
      <span className="truncate normal-case tracking-normal text-foreground/80">
        {comentario.entity_title ?? 'Sem título'}
      </span>
    </div>
  );
}
