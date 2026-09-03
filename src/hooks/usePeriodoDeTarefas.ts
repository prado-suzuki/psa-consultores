import { useMemo, useState } from 'react';
import { ESCOPO_TUDO, mesDoValor, passoDeMes, tarefasNoPeriodo } from '@/lib/periodoDeTarefas';
import { getTodayBrazil } from '@/lib/dateUtils';
import type { OrgTask } from '@/hooks/useOrgTasks';

/** `tudo` é o projeto inteiro; `mes`, o recorte de um mês. */
export type EscopoDeTarefas = 'tudo' | 'mes';

export interface PeriodoDeTarefas {
  /** O mês âncora. Existe mesmo em `tudo`: é onde as setas e o Calendário caem. */
  mes: Date;
  escopo: EscopoDeTarefas;
  /** As tarefas do escopo: todas, ou as do mês. */
  tarefas: OrgTask[];
  /**
   * Sempre o recorte do mês, para quem não sabe desenhar "tudo" — a grade do
   * Calendário tem 42 células e um mês, e receber o projeto inteiro só faria
   * ela descartar em silêncio o que não cabe.
   */
  tarefasDoMes: OrgTask[];
  onPasso: (direcao: 1 | -1) => void;
  onHoje: () => void;
  /** `ESCOPO_TUDO` ou um mês em `yyyy-MM` — os valores de `opcoesDeEscopo`. */
  onEscopo: (valor: string) => void;
}

/**
 * O recorte de tempo das abas do painel, num lugar só.
 *
 * Vive aqui e não dentro de cada aba porque o recorte é COMPARTILHADO: quem
 * estava vendo setembro na Lista e abre o Calendário continua em setembro.
 * Antes o Calendário guardava o mês dele e as outras abas não tinham mês nenhum.
 *
 * **`tudo` é o padrão.** O mês nasceu como recorte único e virou trava: a
 * Tabela e o Kanban de um projeto escondiam a entrega do mês seguinte, que é
 * exatamente o que se abre um projeto para ver. O mês continua a um clique, no
 * seletor do título ou na seta.
 *
 * `hoje` entra no recorte do mês porque tarefa sem prazo fica parada em hoje:
 * ela só aparece enquanto o mês corrente está à vista.
 */
export function usePeriodoDeTarefas(tasks: OrgTask[]): PeriodoDeTarefas {
  const [escopo, setEscopo] = useState<EscopoDeTarefas>('tudo');
  const [mes, setMes] = useState(() => new Date());
  const hoje = getTodayBrazil();
  /* `getTodayBrazil` devolve um Date novo a cada render, e o que o recorte usa
     dele é o DIA. `diaDeHoje` é esse dia como número, e é ele que entra na
     dependência: com o Date, o memo recalcularia em todo render. */
  const diaDeHoje = hoje.getTime();
  const tarefasDoMes = useMemo(
    () => tarefasNoPeriodo(tasks, mes, hoje),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `diaDeHoje` representa `hoje`; ver o comentário acima.
    [tasks, mes, diaDeHoje],
  );

  return {
    mes,
    escopo,
    tarefas: escopo === 'tudo' ? tasks : tarefasDoMes,
    tarefasDoMes,
    /* A seta ANDA o mês e entra no recorte no mesmo gesto — é o caminho de quem
       está em `tudo` e quer olhar mês a mês. Ela não para no mês corrente antes
       de andar: o Calendário usa esta mesma função e já está desenhando um mês,
       então "a primeira seta não move nada" leria como barra quebrada. Para
       cair no mês corrente existe o `Hoje`, ao lado. */
    onPasso: direcao => {
      setEscopo('mes');
      setMes(atual => passoDeMes(atual, direcao));
    },
    onHoje: () => {
      setEscopo('mes');
      setMes(new Date());
    },
    onEscopo: valor => {
      if (valor === ESCOPO_TUDO) {
        setEscopo('tudo');
        return;
      }
      const escolhido = mesDoValor(valor);
      if (!escolhido) return;
      setEscopo('mes');
      setMes(escolhido);
    },
  };
}
