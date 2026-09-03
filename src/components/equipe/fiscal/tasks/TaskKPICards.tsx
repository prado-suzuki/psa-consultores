import { statusList } from '@/lib/taskStatusColors';
import { cn } from '@/lib/utils';

interface TaskKPICardsProps {
  tasks: { status: string }[];
}

export const TaskKPICards = ({ tasks }: TaskKPICardsProps) => {

  const counts = statusList.reduce((acc, s) => {
    acc[s.key] = tasks.filter(t => t.status === s.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex overflow-x-auto rounded-xl border bg-card p-1 shadow-sm">
      {statusList.map((status, index) => {
        const total = counts[status.key] ?? 0;
        return (
          /* `grow shrink-0` e não `flex-1`: com `flex-1` a base é zero e o item
             encolhia abaixo do próprio conteúdo — o rótulo é `whitespace-nowrap`
             e vazava POR CIMA do vizinho ("Pendente Cliente" cobrindo o "A" de
             "A Fazer"), em vez de o container rolar. Agora a base é o conteúdo,
             o item cresce para preencher a barra e nunca encolhe abaixo dele. */
          <div
            key={status.key}
            className={cn('flex min-w-[120px] shrink-0 grow items-center justify-between gap-3 px-3 py-2', index > 0 && 'border-l')}
          >
            <span className="whitespace-nowrap text-xs text-muted-foreground">{status.label}</span>
            {/* Zero é ausência, e ausência é silenciosa: a cor do papel de status
                só aparece quando há o que contar. Com a pílula colorida no zero,
                a barra mostrava cinco manchas de cor que não diziam nada e o
                único número com conteúdo tinha que competir com elas. */}
            <span className={cn('rounded-md px-2 py-0.5 text-sm font-bold tabular-nums', total > 0 ? status.combined : 'text-muted-foreground')}>
              {total}
            </span>
          </div>
        );
      })}
    </div>
  );
};
