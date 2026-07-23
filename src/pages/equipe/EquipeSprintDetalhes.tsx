import { ArrowLeft, Pencil } from 'lucide-react';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { Textarea } from '@/components/ui/textarea';
import { AgendaTab } from '@/components/equipe/sprint-detalhes/AgendaTab';
import { DeliverableDialogs } from '@/components/equipe/sprint-detalhes/DeliverableDialogs';
import { DeliverablesTab } from '@/components/equipe/sprint-detalhes/DeliverablesTab';
import { GanttTab } from '@/components/equipe/sprint-detalhes/GanttTab';
import { ImportDialog } from '@/components/equipe/sprint-detalhes/ImportDialog';
import { MetricsTab } from '@/components/equipe/sprint-detalhes/MetricsTab';
import { RisksTab } from '@/components/equipe/sprint-detalhes/RisksTab';
import { SprintHeaderFilters } from '@/components/equipe/sprint-detalhes/SprintHeaderFilters';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

export default function EquipeSprintDetalhes() {
  const controller = useEquipeSprintDetalhesController();

  if (controller.isLoading) {
    return (
      <EquipeLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </EquipeLayout>
    );
  }
  if (!controller.sprint) {
    return (
      <EquipeLayout title="Sprint não encontrada">
        <Button onClick={() => controller.navigate('/equipe/sprints')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Sprints
        </Button>
      </EquipeLayout>
    );
  }

  return (
    <EquipeLayout title={controller.sprint.name}>
      <div className="space-y-6">
        <SprintHeaderFilters controller={controller} />

        <div className="rounded-lg border border-border bg-white p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-foreground">Descrição da sprint</span>
            {!controller.editingGoal && (
              <Button variant="ghost" size="sm" onClick={controller.startEditGoal}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
            )}
          </div>
          {controller.editingGoal ? (
            <div className="space-y-2">
              <Textarea
                value={controller.goalDraft}
                onChange={(event) => controller.setGoalDraft(event.target.value)}
                rows={4}
                placeholder="Descreva o objetivo da sprint..."
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={controller.cancelEditGoal}
                  disabled={controller.savingGoal}
                >
                  Cancelar
                </Button>
                <Button size="sm" onClick={controller.saveGoal} disabled={controller.savingGoal}>
                  {controller.savingGoal ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {controller.sprint.goal || 'Sem descrição. Clique em "Editar" para adicionar.'}
            </p>
          )}
        </div>

        <Tabs defaultValue="deliverables" className="space-y-4">
          <TabsList>
            <TabsTrigger value="deliverables">Entregáveis</TabsTrigger>
            <TabsTrigger value="gantt">Gantt</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="risks" className="relative">
              Riscos
              {(controller.sprintRisks.overdue.length > 0 ||
                controller.sprintRisks.metricsAtRisk.length > 0) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
          </TabsList>
          <DeliverablesTab controller={controller} />
          <GanttTab controller={controller} />
          <AgendaTab controller={controller} />
          <MetricsTab controller={controller} />
          <RisksTab controller={controller} />
        </Tabs>
      </div>
      <DeliverableDialogs controller={controller} />
      <ImportDialog controller={controller} />
    </EquipeLayout>
  );
}
