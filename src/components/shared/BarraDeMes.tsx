import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BarraDePeriodo } from '@/components/shared/BarraDePeriodo';
import {
  ESCOPO_TUDO,
  atalhosDeEscopo,
  mesesDoAno,
  rotuloDoRecorte,
  tituloDoMes,
  valorDoMes,
  valorDoRecorte,
} from '@/lib/periodoDeTarefas';
import { getTodayBrazil } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
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
 * O título é o controle: clicar nele abre os atalhos de prazo e a grade de meses.
 *
 * Duas coisas num menu só, e nessa ordem, porque são duas perguntas diferentes:
 * "o que preciso olhar agora" (tudo, atrasadas, este mês, próximos 30 dias, sem
 * prazo) e "quero março de 2027". A lista única de treze meses que existia aqui
 * respondia mal as duas — rolagem para achar o mês, e nenhum atalho.
 *
 * A grade separa mês de ano: o ano navega no cabeçalho e os doze meses cabem
 * sem rolar. É o desenho do seletor de competência, e o que o Board da diretoria
 * já fazia com dois seletores.
 *
 * Vira menu em vez de `Select` porque a linha da Tabela e da Lista já tem
 * `combobox` (status, responsável) e a barra fica acima deles — um seletor a
 * mais ali muda o que "o primeiro combobox da tela" significa.
 */
function SeletorDeEscopo({ periodo }: { periodo: PeriodoDeTarefas }) {
  const hoje = getTodayBrazil();
  const [aberto, setAberto] = useState(false);
  /* O ano da grade é de navegação, não de estado: ele começa no ano do recorte
     a cada abertura, senão o menu reabriria onde a pessoa parou de folhear e
     não onde a tela está. */
  const [anoVisivel, setAnoVisivel] = useState(() => periodo.mes.getFullYear());
  const valor = valorDoRecorte(periodo);
  const mesDeHoje = valorDoMes(hoje);
  const escolher = (escolhido: string) => {
    periodo.onEscopo(escolhido);
    setAberto(false);
  };

  return (
    <span className="flex items-center gap-1">
      <DropdownMenu
        open={aberto}
        onOpenChange={proximo => {
          setAberto(proximo);
          if (proximo) setAnoVisivel(periodo.mes.getFullYear());
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-base font-semibold">
            {rotuloDoRecorte(periodo)}
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuRadioGroup value={valor} onValueChange={escolher}>
            {atalhosDeEscopo(hoje).map(opcao => (
              <DropdownMenuRadioItem key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <div className="px-1 pb-1">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Ano anterior"
                onClick={() => setAnoVisivel(ano => ano - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold tabular-nums">{anoVisivel}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Próximo ano"
                onClick={() => setAnoVisivel(ano => ano + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-1 grid grid-cols-4 gap-1">
              {mesesDoAno(anoVisivel).map(opcao => (
                <Button
                  key={opcao.valor}
                  variant={opcao.valor === valor ? 'default' : 'ghost'}
                  size="sm"
                  /* O mês de hoje fica marcado mesmo sem estar escolhido: é o
                     ponto de referência de quem está folheando o ano. */
                  className={cn(
                    'h-8 px-0 text-xs capitalize',
                    opcao.valor !== valor && opcao.valor === mesDeHoje && 'ring-1 ring-inset ring-primary/40',
                  )}
                  onClick={() => escolher(opcao.valor)}
                >
                  {opcao.rotulo}
                </Button>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* A saída do recorte, à vista. "Não aparece nada" tem uma causa comum —
          o recorte em que a tela está não tem tarefa — e quem cai nela não devia
          ter de descobrir que o título abre menu para sair de lá. */}
      {periodo.escopo !== 'tudo' && (
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
