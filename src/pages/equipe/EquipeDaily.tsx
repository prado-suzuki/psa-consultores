import { DailyEditDialog } from '@/components/equipe/daily/DailyEditDialog';
import { DailyFormCard } from '@/components/equipe/daily/DailyFormCard';
import { DailyHistoryCard } from '@/components/equipe/daily/DailyHistoryCard';
import { DailyQuickStatusDialog } from '@/components/equipe/daily/DailyQuickStatusDialog';
import { DailySprintProgressCard } from '@/components/equipe/daily/DailySprintProgressCard';
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
        {daily.activeSprint && (
          <DailySprintProgressCard
            sprintName={daily.activeSprint.name}
            progress={daily.activeSprintProgress}
            loading={daily.activeSprintProgressLoading}
          />
        )}
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
          onOpenQuickUpdate={() => daily.setQuickUpdateOpen(true)}
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
          page={daily.page}
          hasNextPage={daily.hasNextPage}
          onFiltersChange={daily.handleFiltersChange}
          onClusterChange={daily.setFilterCluster}
          onSearch={daily.handleSearch}
          onClearFilters={daily.handleClearFilters}
          onPageChange={daily.handlePageChange}
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
        tasks={daily.editingStandup?.sprint_id === daily.form.sprint_id ? daily.sprintTasks : []}
        sprintId={daily.editingStandup?.sprint_id}
      />
      <DailyQuickStatusDialog
        open={daily.quickUpdateOpen}
        sprintName={daily.sprints.find((sprint) => sprint.id === daily.form.sprint_id)?.name}
        tasks={daily.quickUpdateTasks}
        loading={daily.quickUpdateLoading}
        updating={daily.quickUpdateSubmitting}
        onOpenChange={daily.setQuickUpdateOpen}
        onUpdate={daily.handleQuickTaskUpdate}
      />
    </EquipeLayout>
  );
};

export default EquipeDaily;
