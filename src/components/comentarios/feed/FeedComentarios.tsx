import { useMemo, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';

import { FeedItemComentario } from '@/components/comentarios/feed/FeedItemComentario';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDomainFeedComentarios } from '@/hooks/useDomainFeedComentarios';
import { agruparPorDia, type AreaDeProjetos } from '@/lib/feedComentarios';

interface FeedComentariosProps {
  area: AreaDeProjetos;
}

/**
 * Feed de comentários: stream único, cronológico, de tudo que está sendo
 * conversado nos projetos e tarefas do usuário.
 *
 * Compartilhado entre Tax e OSG, no padrão do `PainelTarefas` — a única coisa
 * que difere entre as áreas é a moldura da página e a base dos links de origem.
 * O recorte de relevância não mora aqui: vem da RLS, aplicada dentro da função
 * `feed_org_comments`.
 */
export function FeedComentarios({ area }: FeedComentariosProps) {
  const { comentarios, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useDomainFeedComentarios();
  const [respondendoA, setRespondendoA] = useState<string | null>(null);

  const grupos = useMemo(() => agruparPorDia(comentarios), [comentarios]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        {[0, 1, 2].map((indice) => (
          <div key={indice} className="rounded-xl border bg-card p-4">
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center">
        <p className="font-medium">Não foi possível carregar o feed</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (comentarios.length === 0) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-dashed py-16 text-center">
        <MessageSquare className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
        <p className="font-medium">Nada no feed ainda</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Aparecem aqui os comentários dos projetos e tarefas que você acompanha — os seus, os que
          mencionam você e os das threads em que você respondeu.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {grupos.map((grupo) => (
        <section key={grupo.dia} className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {grupo.rotulo}
            </h2>
            <span aria-hidden className="h-px flex-1 bg-border" />
          </div>

          {grupo.itens.map((comentario) => (
            <FeedItemComentario
              key={comentario.id}
              comentario={comentario}
              area={area}
              respondendo={respondendoA === comentario.id}
              onResponder={() => setRespondendoA(comentario.id)}
              onFecharResposta={() => setRespondendoA(null)}
            />
          ))}
        </section>
      ))}

      {hasNextPage && (
        <div className="flex justify-center pb-2">
          <Button
            type="button"
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              'Carregar mais'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
