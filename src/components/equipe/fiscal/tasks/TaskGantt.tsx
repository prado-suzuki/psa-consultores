import { useMemo } from 'react';
import { parseDate } from '@/lib/dateUtils';
import { OrgTask } from '@/hooks/useOrgTasks';
import { statusColors, statusList } from '@/lib/taskStatusColors';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GanttChart } from '@/components/equipe/gantt/GanttChart';
import type { GanttGrupo, GanttItem } from '@/components/equipe/gantt/tiposDeGantt';

/**
 * A aba Gantt do painel de tarefas. Esta tela não desenha nada do Gantt: ela
 * traduz `OrgTask` para o contrato do `GanttChart`, que é o mesmo componente
 * usado pelo Gantt da sprint. O que era específico daqui e continua aqui: a
 * regra de esconder a tarefa-pai que tem filha (senão o período dela cobriria
 * as filhas duas vezes) e o texto do resumo por responsável.
 */

interface TaskGanttProps {
  tasks: OrgTask[];
  onEdit: (task: OrgTask) => void;
}

const SEM_RESPONSAVEL = 'sem-responsavel';

export const TaskGantt = ({ tasks, onEdit }: TaskGanttProps) => {
  const { grupos, porId } = useMemo(() => construirGrupos(tasks), [tasks]);

  if (grupos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma tarefa com data de vencimento para exibir no Gantt.
        </CardContent>
      </Card>
    );
  }

  return (
    <GanttChart
      grupos={grupos}
      rotuloDaColuna="Responsável / Tarefa"
      onSelecionarItem={(item) => {
        const tarefa = porId.get(item.id);
        if (tarefa) onEdit(tarefa);
      }}
      legenda={<LegendaDeStatus />}
    />
  );
};

function construirGrupos(tasks: OrgTask[]): { grupos: GanttGrupo[]; porId: Map<string, OrgTask> } {
  const comFilha = new Set(tasks.filter((t) => t.parent_task_id).map((t) => t.parent_task_id));
  const visiveis = tasks.filter((t) => !comFilha.has(t.id) && t.due_date);

  const porId = new Map(visiveis.map((tarefa) => [tarefa.id, tarefa]));
  const porResponsavel = new Map<string, { nome: string; tarefas: OrgTask[]; itens: GanttItem[] }>();

  visiveis.forEach((tarefa) => {
    const chave = tarefa.assigned_to || SEM_RESPONSAVEL;
    const nome =
      tarefa.assigned_to_name || (chave === SEM_RESPONSAVEL ? 'Sem responsável' : 'Desconhecido');
    const pai = tarefa.parent_task_id ? tasks.find((t) => t.id === tarefa.parent_task_id) : null;

    const grupo = porResponsavel.get(chave) ?? { nome, tarefas: [], itens: [] };
    grupo.tarefas.push(tarefa);
    grupo.itens.push({
      id: tarefa.id,
      titulo: tarefa.title,
      inicio: parseDate(tarefa.start_date ?? tarefa.due_date!),
      fim: parseDate(tarefa.due_date!),
      papel: statusColors[tarefa.status].papel,
      concluido: tarefa.status === 'done',
      detalhe: pai ? `↑ ${pai.title}` : null,
    });
    porResponsavel.set(chave, grupo);
  });

  const grupos = [...porResponsavel.entries()]
    .map(([id, grupo]) => {
      const concluidas = grupo.tarefas.filter((t) => t.status === 'done').length;
      const total = grupo.tarefas.length;
      return {
        id,
        nome: grupo.nome,
        resumo: `${total} tarefa${total !== 1 ? 's' : ''} • ${concluidas}/${total} concluídas`,
        itens: grupo.itens.sort((a, b) => a.inicio.getTime() - b.inicio.getTime()),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return { grupos, porId };
}

function LegendaDeStatus() {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
      {statusList.map((status) => (
        <div key={status.key} className="flex items-center gap-2">
          <div className={cn('h-3 w-3 rounded-full', status.bgSolid)} />
          <span>{status.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <div className="h-3 w-8 rounded-full border border-primary/50 bg-primary/30" />
        <span>Período consolidado</span>
      </div>
    </div>
  );
}
