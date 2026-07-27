import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, History, RotateCcw, Send } from 'lucide-react';

import { ReviewRichTextContent } from '@/components/equipe/fiscal/tasks/ReviewRichText';
import { cn } from '@/lib/utils';
import {
  getReviewEventContent,
  reviewEventTitles,
  type ReviewEvent,
} from '@/lib/orgTaskReviewHistory';

/** Linha do tempo lateral com envios, aprovações e pedidos de ajuste. */
export function ReviewHistoryPanel({ events }: { events: ReviewEvent[] }) {
  return (
    <aside className="mt-4 overflow-hidden rounded-xl border bg-background shadow-lg xl:mt-0 xl:max-h-[90vh]">
      <div className="border-b bg-muted/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Histórico da revisão</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Envios, aprovações e pedidos de ajuste</p>
      </div>

      <div className="max-h-[calc(90vh-5rem)] overflow-y-auto p-5">
        <ol className="space-y-0">
          {events.map((event, index) => {
            const isSubmitted = event.type === 'submitted';
            const isApproved = event.type === 'approved';
            const title = reviewEventTitles[event.type];
            const Icon = isSubmitted ? Send : isApproved ? CheckCircle2 : RotateCcw;
            const content = getReviewEventContent(event.comment, event.type);

            return (
              <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
                {index < events.length - 1 && (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-border" />
                )}
                <span
                  className={cn(
                    'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                    isSubmitted &&
                      'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950',
                    isApproved &&
                      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950',
                    !isSubmitted &&
                      !isApproved &&
                      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-semibold leading-5">{title}</p>
                  {content && (
                    <div className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      <ReviewRichTextContent value={content} />
                    </div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground/80">
                    <span>{event.user_name || 'Usuário'}</span>
                    <span aria-hidden="true"> · </span>
                    <time dateTime={event.created_at}>
                      {format(new Date(event.created_at), 'dd MMM, HH:mm', {
                        locale: ptBR,
                      })}
                    </time>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
