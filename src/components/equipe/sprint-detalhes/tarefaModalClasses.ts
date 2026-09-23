// Classes do casco do modal de tarefa (sprint e backlog). Ver tarefaModalVisual.tsx.
import { cn } from '@/lib/utils';

// Modal largo e de altura contida; em "tela cheia" da descrição ele assume a
// altura máxima para o campo esticar sem empurrar o rodapé para fora da tela.
export const tarefaModalContentClass = (expanded: boolean) =>
  cn(
    'flex max-h-[90vh] flex-col gap-0 overflow-hidden border-primary/30 p-0 transition-[max-width] duration-200',
    // O "X" de fechar é filho direto do content e herdaria a cor do texto: sobre
    // a faixa teal ele precisa ser claro.
    '[&>button]:text-white/70 [&>button:hover]:text-white',
    expanded ? 'h-[88vh] sm:max-w-4xl' : 'sm:max-w-[calc(100vw-2rem)] xl:max-w-7xl',
  );

// Faixa de cor no topo: o acento da área entra em bloco, não em linha fina, e é
// o que tira o modal do branco. Miolo e rodapé seguem claros para o formulário
// respirar embaixo dela.
//
// `bg-primary` e não um degrau da escala: este modal abre em QUALQUER área, e
// `teal-500` ficava teal na Tax e na OSG porque a escala mora no `:root` e
// nenhum tema a sobrescreve. Com o token, a faixa vira petróleo na Tax e musgo
// na OSG sem uma linha a mais.
//
// Sem borda embaixo, e isso é decisão de 11/09/2026, não esquecimento. A versão
// anterior era a faixa no degrau `teal-500` com a borda um degrau abaixo, no
// `teal-700`: um fio MAIS ESCURO que a faixa, logo acima do branco, que lia como
// lábio. Com um token só os dois colapsam na mesma cor, e a alternativa — fio
// claro, `primary-foreground/25` — inverte o efeito: vira um degrau na direção do
// branco, que borra a fronteira em vez de definir, e a 1px lê como serrilhado. O
// limite passou a ser o próprio encontro da faixa com o miolo, que já é 5,54:1.
export const tarefaModalHeaderClass = 'bg-primary px-6 py-4 pr-12 text-primary-foreground';
export const tarefaModalBodyClass =
  'flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto bg-muted/20 px-4 py-4 sm:px-6 sm:py-5';
export const tarefaModalFooterClass = 'border-t border-primary/20 bg-background px-6 py-4';

// Aba ativa marcada no accent: texto, ícone e um contorno fino em teal.
export const tarefaModalTabTriggerClass =
  'data-[state=active]:text-foreground data-[state=active]:ring-1 data-[state=active]:ring-accent/25';
