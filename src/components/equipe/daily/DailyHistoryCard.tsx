import { Calendar, FileSpreadsheet, Filter, FolderOpen, Pencil, Search, Target, Trash2, User, X, Zap } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DailyStandup, Sprint, TeamMember } from '@/hooks/useDomainEquipeDaily';
import type { Cluster } from '@/hooks/useClusters';
import type { DailyFilters, DailyLookups } from '@/lib/equipeDaily';
import { SEM_CLUSTER } from '@/lib/clusterFilter';
import { renderMarkdown } from '@/lib/markdownRenderer';

interface DailyHistoryCardProps {
  authenticatedUserId?: string;
  standups: DailyStandup[];
  teamMembers: TeamMember[];
  sprints: Sprint[];
  clusters: Cluster[];
  clusterFilter: string;
  filters: DailyFilters;
  lookups: DailyLookups;
  loading: boolean;
  onFiltersChange: (filters: DailyFilters) => void;
  onClusterChange: (value: string) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  onExport: () => void;
  onEdit: (standup: DailyStandup) => void;
  onDelete: (standupId: string) => void;
}

export function DailyHistoryCard({
  authenticatedUserId,
  standups,
  teamMembers,
  sprints,
  clusters,
  clusterFilter,
  filters,
  lookups,
  loading,
  onFiltersChange,
  onClusterChange,
  onSearch,
  onClearFilters,
  onExport,
  onEdit,
  onDelete,
}: DailyHistoryCardProps) {
  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <CardTitle className="text-gray-900 flex items-center gap-2"><User className="h-5 w-5 text-gray-500" />Histórico de Dailys</CardTitle>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-gray-500" /><span className="text-sm text-gray-500">Filtros:</span></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">De:</span>
              <Input type="date" value={filters.startDate} onChange={(event) => onFiltersChange({ ...filters, startDate: event.target.value })} className="bg-white border-gray-300 text-gray-900 w-40" placeholder="Data Início" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Até:</span>
              <Input type="date" value={filters.endDate} onChange={(event) => onFiltersChange({ ...filters, endDate: event.target.value })} className="bg-white border-gray-300 text-gray-900 w-40" placeholder="Data Fim" />
            </div>
            <Select value={filters.person} onValueChange={(person) => onFiltersChange({ ...filters, person })}>
              <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-44"><SelectValue placeholder="Pessoa" /></SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all">Todas as pessoas</SelectItem>
                {teamMembers.map((member) => <SelectItem key={member.id} value={member.id}>{member.first_name} {member.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.sprint} onValueChange={(sprint) => onFiltersChange({ ...filters, sprint })}>
              <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-44"><SelectValue placeholder="Sprint" /></SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all">Todas as sprints</SelectItem>
                {sprints.map((sprint) => <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={clusterFilter === '' ? '__todos__' : clusterFilter} onValueChange={(value) => onClusterChange(value === '__todos__' ? '' : value)}>
              <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-44"><SelectValue placeholder="Cluster" /></SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="__todos__">Todos os clusters</SelectItem>
                <SelectItem value={SEM_CLUSTER}>— Sem cluster</SelectItem>
                {clusters.filter((cluster) => cluster.ativo).map((cluster) => <SelectItem key={cluster.id} value={cluster.id}>{cluster.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={onSearch} className="bg-primary hover:bg-primary/90"><Search className="h-4 w-4 mr-2" />Buscar</Button>
            <Button onClick={onClearFilters} variant="outline" className="border-gray-400 text-gray-600 hover:bg-gray-50"><X className="h-4 w-4 mr-2" />Limpar Filtros</Button>
            <Button onClick={onExport} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50"><FileSpreadsheet className="h-4 w-4 mr-2" />Exportar Excel</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : standups.length > 0 ? (
          <div className="space-y-4">
            {standups.map((standup) => (
              <DailyStandupCard
                key={standup.id}
                standup={standup}
                isOwn={standup.user_id === authenticatedUserId}
                lookups={lookups}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum daily encontrado para os filtros selecionados</p>
            <p className="text-sm text-gray-400">Tente alterar a data ou os filtros</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DailyStandupCard({
  standup,
  isOwn,
  lookups,
  onEdit,
  onDelete,
}: {
  standup: DailyStandup;
  isOwn: boolean;
  lookups: DailyLookups;
  onEdit: (standup: DailyStandup) => void;
  onDelete: (standupId: string) => void;
}) {
  return (
    <div className={`p-4 rounded-lg border ${isOwn ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><User className="h-4 w-4 text-gray-500" /></div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-900 font-medium">{lookups.memberName(standup.user_id)}</span>
            <span className="text-xs text-gray-500">{new Date(standup.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            {isOwn && (
              <div className="flex gap-1 ml-auto">
                <Button variant="ghost" size="sm" onClick={() => onEdit(standup)} className="h-8 w-8 p-0"><Pencil className="h-4 w-4 text-gray-500 hover:text-gray-700" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Daily?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita. O registro do daily será permanentemente removido.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(standup.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(`${standup.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
            <span>•</span><span className="flex items-center gap-1"><Target className="h-3 w-3" />{lookups.sprintName(standup.sprint_id)}</span>
            {standup.project_id && <><span>•</span><span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" />{lookups.projectName(standup.project_id)}</span></>}
            {standup.process_id && <><span>•</span><span className="flex items-center gap-1"><Zap className="h-3 w-3" />{lookups.processName(standup.process_id)}</span></>}
          </div>
        </div>
      </div>
      {standup.did_yesterday && <div className="mb-2"><p className="text-xs text-gray-500 mb-1">Ontem:</p><div className="text-sm text-gray-700">{renderMarkdown(standup.did_yesterday)}</div></div>}
      {standup.will_do_today && <div className="mb-2"><p className="text-xs text-gray-500 mb-1">Hoje:</p><div className="text-sm text-gray-700">{renderMarkdown(standup.will_do_today)}</div></div>}
      {standup.blockers && <div className="p-2 bg-yellow-50 rounded border border-yellow-200"><p className="text-xs text-yellow-700 mb-1">Bloqueio:</p><div className="text-sm text-yellow-800">{renderMarkdown(standup.blockers)}</div></div>}
    </div>
  );
}
