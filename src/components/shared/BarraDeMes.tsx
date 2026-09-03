import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BarraDePeriodo } from '@/components/shared/BarraDePeriodo';
import {
  ESCOPO_TUDO,
  ROTULO_TUDO,
  opcoesDeEscopo,
  rotuloDoMes,
  tituloDoMes,
  valorDoMes,
} from '@/lib/periodoDeTarefas';
import { getTodayBrazil } from '@/lib/dateUtils';
import type { PeriodoDeTarefas } from '@/hooks/usePeriodoDeTarefas';

/**
 * A `BarraDePeriodo` na escala de mês, que é a das abas do painel de tarefas.
 *
 * Existe para o formato do título e os rótulos das setas ficarem num lugar só —
 * Lista, Tabela, Kanban e Calendário renderiam os mesmos cinco atributos, e a
 * terceira cópia é onde um deles começa a divergir. Não é wrapper passa-tudo:
 * ele é o que sabe que aqui o período é um mês, ou tudo.
 *
 * `travadaNoMes` é para o Calendário: a grade dele é de um mês, então não há o
 * que oferecer no lugar — o título volta a ser texto e as setas seguem andando.
 */
export function BarraDeMes({
  periodo,
  travadaNoMes = false,
}: {
  periodo: PeriodoDeTarefas;
  travadaNoMes?: boolean;
}) {
  return (
    <BarraDePeriodo
      titulo={travadaNoMes ? tituloDoMes(periodo.mes) : <SeletorDeEscopo periodo={periodo} />}
      onHoje={periodo.onHoje}
      onPasso={periodo.onPasso}
      rotuloAnterior="Mês anterior"
      rotuloProximo="Próximo mês"
    />
  );
}

/**
 * O título é o controle: clicar nele escolhe entre `Tudo` e um mês.
 *
 * Vira botão em vez de `Select` porque a linha da Tabela e da Lista já tem
 * `combobox` (status, responsável) e a barra fica acima deles — um seletor a
 * mais ali muda o que "o primeiro combobox da tela" significa. Menu é o que a
 * própria Lista usa para as ações de linha.
 */
function SeletorDeEscopo({ periodo }: { periodo: PeriodoDeTarefas }) {
  const opcoes = useMemo(() => opcoesDeEscopo(getTodayBrazil(), periodo.mes), [periodo.mes]);
  const valor = periodo.escopo === 'tudo' ? ESCOPO_TUDO : valorDoMes(periodo.mes);
  // O título é por extenso ("Setembro de 2026") e o item do menu é curto
  // ("set/2026"): a lista é de treze, o título é um só e fica ao lado do do
  // Gantt e do Calendário, que são por extenso.
  const rotulo = periodo.escopo === 'tudo' ? ROTULO_TUDO : rotuloDoMes(periodo.mes);

  return (
    <span className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-base font-semibold">
            {rotulo}
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
          <DropdownMenuRadioGroup value={valor} onValueChange={periodo.onEscopo}>
            {opcoes.map(opcao => (
              <DropdownMenuRadioItem key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* A saída do mês, à vista. "Não aparece nada" tem uma causa comum — o
          mês em que a tela está não tem tarefa — e quem cai nela não devia ter
          de descobrir que o título abre menu para sair de lá. */}
      {periodo.escopo === 'mes' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs font-medium text-muted-foreground"
          onClick={() => periodo.onEscopo(ESCOPO_TUDO)}
        >
          Ver tudo
        </Button>
      )}
    </span>
  );
}
