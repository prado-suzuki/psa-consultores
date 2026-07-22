import { DailyEditDialog } from '@/components/equipe/daily/DailyEditDialog';
import { DailyFormCard } from '@/components/equipe/daily/DailyFormCard';
import { DailyHistoryCard } from '@/components/equipe/daily/DailyHistoryCard';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { useEquipeDailyController } from '@/hooks/useEquipeDailyController';

const EquipeDaily = () => {
  const daily = useEquipeDailyController();
  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <EquipeLayout title="Daily Standup" subtitle={todayFormatted}>
      <div className="space-y-6">
        <DailyFormCard
          authenticatedUserId={daily.userId}
          selectedUserId={daily.selectedUserId}
          onSelectedUserIdChange={daily.setSelectedUserId}
          teamMembers={daily.teamMembers}
          sprints={daily.sprints}
          projects={daily.projects}
          processes={daily.filteredProcesses}
          sprintTasks={daily.sprintTasks}
          form={daily.form}
          onFormChange={daily.setForm}
          registered={daily.registered}
          submitting={daily.submitting}
          copyingYesterday={daily.copyingYesterday}
          onSubmit={daily.handleSubmit}
          onCopyFromYesterday={daily.handleCopyFromYesterday}
        />
        <DailyHistoryCard
          authenticatedUserId={daily.userId}
          standups={daily.standups}
          teamMembers={daily.teamMembers}
          sprints={daily.sprints}
          clusters={daily.clusters}
          clusterFilter={daily.filterCluster}
          filters={daily.filters}
          lookups={daily.lookups}
          loading={daily.loading}
          onFiltersChange={daily.handleFiltersChange}
          onClusterChange={daily.setFilterCluster}
          onSearch={daily.fetchStandups}
          onClearFilters={daily.handleClearFilters}
          onExport={daily.handleExportExcel}
          onEdit={daily.handleEdit}
          onDelete={daily.handleDelete}
        />
      </div>
      <DailyEditDialog
        open={daily.editingStandup !== null}
        form={daily.editForm}
        submitting={daily.editSubmitting}
        onFormChange={daily.setEditForm}
        onClose={daily.closeEdit}
        onSubmit={daily.handleEditSubmit}
      />
    </EquipeLayout>
  );
};

export default EquipeDaily;
