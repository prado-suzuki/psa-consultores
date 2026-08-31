import { useMemo } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GanttChart } from '@/components/equipe/gantt/GanttChart';
import type { GanttGrupo, GanttPapel } from '@/components/equipe/gantt/tiposDeGantt';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

/**
 * A aba Gantt da sprint. Mesmo componente da aba Gantt do painel de tarefas —
 * esta tela só traduz entregável para o contrato dele. Antes era uma segunda
 * implementação, que já tinha divergido: pintava com verde/amarelo/cinza de
 * estoque, fora da paleta por papel, e ficava de fora de qualquer melhoria
 * feita na outra.
 */

/** Os três status de entregável, nos papéis de status do sistema. */
const PAPEL_POR_STATUS: Record<string, GanttPapel> = {
  pending: 'fila',
  in_progress: 'andamento',
  completed: 'feito',
};

const LEGENDA: ReadonlyArray<{ papel: GanttPapel; rotulo: string; ponto: string }> = [
  { papel: 'fila', rotulo: 'Pendente', ponto: 'bg-status-fila' },
  { papel: 'andamento', rotulo: 'Em Progresso', ponto: 'bg-status-andamento' },
  { papel: 'feito', rotulo: 'Concluído', ponto: 'bg-status-feito' },
];

export function GanttTab({ controller: c }: { controller: EquipeSprintDetalhesController }) {
  const grupos = useMemo<GanttGrupo[]>(
    () =>
      c.ganttByPerson.map((person) => ({
        id: person.personId,
        nome: person.personName,
        // Pluralização preservada de propósito: `entregávelis` é o texto que a
        // tela publica hoje, e o teste de caracterização o trava.
        resumo: `${person.count} entregável${person.count !== 1 ? 'is' : ''} • ${person.totalHours}h • ${person.completedCount}/${person.count} concluídos`,
        itens: person.deliverables.map((item) => ({
          id: item.id,
          titulo: item.title,
          inicio: item.startDate,
          fim: item.endDate,
          papel: PAPEL_POR_STATUS[item.status] ?? 'neutro',
          concluido: item.status === 'completed',
        })),
      })),
    [c.ganttByPerson],
  );

  const porId = useMemo(
    () => new Map(c.ganttByPerson.flatMap((person) => person.deliverables).map((item) => [item.id, item])),
    [c.ganttByPerson],
  );

  return (
    <TabsContent value="gantt" className="space-y-4">
      <GanttChart
        grupos={grupos}
        rotuloDaColuna="Responsável / Entregável"
        onSelecionarItem={(item) => {
          const entregavel = porId.get(item.id);
          if (entregavel) c.openEditModal(entregavel);
        }}
        legenda={
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {LEGENDA.map((status) => (
              <div key={status.papel} className="flex items-center gap-2">
                <div className={cn('h-3 w-3 rounded-full', status.ponto)} />
                <span>{status.rotulo}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded-full border border-primary/50 bg-primary/30" />
              <span>Período consolidado</span>
            </div>
          </div>
        }
        vazio={
          <Card className="border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum entregável encontrado
            </CardContent>
          </Card>
        }
      />
    </TabsContent>
  );
}
