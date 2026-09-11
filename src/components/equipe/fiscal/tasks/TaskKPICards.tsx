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

  // Sem cartão próprio: a barra é a primeira faixa da barra de ferramentas do
  // painel, que é quem desenha a borda e o raio. Consumidor único.
  return (
    // No celular a régua é GRADE, não trilho que rola.
    //
    // Sete status a `min-w-[120px]` pedem 840px, e a rolagem horizontal disso
    // era a primeira de TRÊS barrinhas empilhadas na tela do Kanban — e esta
    // aparece nas sete abas, não só nele. Duas colunas caem em ~170px cada num
    // aparelho de 390px, que é folgado para "Pendente Cliente" mais a contagem.
    //
    // A sétima célula ocupa a linha inteira: 7 não divide nem por 2 nem por 3, e
    // deixar a última sozinha num canto lê como célula faltando. "Concluído" é o
    // estado terminal, então a faixa cheia embaixo lê como fecho, não como sobra.
    <div className="grid grid-cols-2 gap-1 rounded-xl border bg-card p-1 shadow-sm sm:grid-cols-3 md:flex md:gap-0 md:overflow-x-auto">
      {statusList.map((status, index) => {
        const total = counts[status.key] ?? 0;
        return (
          /* `md:shrink-0 md:grow` e não `md:flex-1`: com `flex-1` a base é zero
             e o item encolhia abaixo do próprio conteúdo — o rótulo é
             `whitespace-nowrap` e vazava POR CIMA do vizinho ("Pendente Cliente"
             cobrindo o "A" de "A Fazer"), em vez de o container rolar. Agora a
             base é o conteúdo, o item cresce para preencher a barra e nunca
             encolhe abaixo dele. */
          <div
            key={status.key}
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2',
              // O separador de régua só existe quando a régua é uma linha.
              'md:min-w-[120px] md:shrink-0 md:grow md:rounded-none md:bg-transparent',
              index > 0 && 'md:border-l',
              index === statusList.length - 1 && 'col-span-2 sm:col-span-3 md:col-auto',
            )}
          >
            {/* `md:whitespace-nowrap`, e não `whitespace-nowrap`: num aparelho de
                320px a célula fica em ~138px e "Pendente Cliente" não cabe numa
                linha. Rótulo de status em duas linhas se lê; cortado com
                reticências, não — "Pendente C…" não diz qual estado é. */}
            <span className="text-xs text-muted-foreground md:whitespace-nowrap">{status.label}</span>
            {/* Zero é ausência, e ausência é silenciosa: a cor do papel de status
                só aparece quando há o que contar. Com a pílula colorida no zero,
                a barra mostrava manchas de cor que não diziam nada e o único
                número com conteúdo tinha que competir com elas. */}
            <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-sm font-bold tabular-nums', total > 0 ? status.combined : 'text-muted-foreground')}>
              {total}
            </span>
          </div>
        );
      })}
    </div>
  );
};
