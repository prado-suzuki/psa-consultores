import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar,
  Clock,
  User,
  Building,
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusBadge, TypeBadge, PriorityIndicator } from './StatusBadge';
import { ActivityTimeline } from './ActivityTimeline';
import { 
  STATUS_CONFIG, 
  STAGE_CONFIG,
  type WorkPackage, 
  type WorkPackageActivity,
  type WorkPackageStatus 
} from '@/types/workPackage';

interface WorkPackageDetailProps {
  workPackage: WorkPackage | null;
  activities: WorkPackageActivity[];
  isLoading: boolean;
  isLoadingActivities: boolean;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onStatusChange: (status: WorkPackageStatus) => void;
  onAddComment: (comment: string) => void;
  isAddingComment: boolean;
  hasPrev: boolean;
  hasNext: boolean;
}

export function WorkPackageDetail({
  workPackage,
  activities,
  isLoading,
  isLoadingActivities,
  onClose,
  onNavigate,
  onStatusChange,
  onAddComment,
  isAddingComment,
  hasPrev,
  hasNext,
}: WorkPackageDetailProps) {
  const [activeTab, setActiveTab] = useState('atividade');

  if (isLoading) {
    return (
      <div className="w-[400px] border-l border-slate-200 bg-white flex flex-col h-full">
        <div className="p-4 border-b border-slate-200">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!workPackage) {
    return (
      <div className="w-[400px] border-l border-slate-200 bg-white flex items-center justify-center text-slate-400">
        Selecione um item para ver detalhes
      </div>
    );
  }

  const createdByName = 'Usuário'; // Would come from joined data
  const formattedDate = format(new Date(workPackage.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR });

  return (
    <div className="w-[400px] border-l border-slate-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        {/* Navigation and parent */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {workPackage.parent && (
              <button className="text-sm text-violet-600 hover:underline flex items-center gap-1">
                <LinkIcon className="h-3 w-3" />
                #{workPackage.parent.code} {workPackage.parent.title.slice(0, 20)}...
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('prev')}
              disabled={!hasPrev}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate('next')}
              disabled={!hasNext}
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Title */}
        <div className="flex items-start gap-2">
          <TypeBadge type={workPackage.type} />
          <h2 className="font-semibold text-slate-900 flex-1">{workPackage.title}</h2>
        </div>

        {/* Status selector */}
        <div className="flex items-center gap-3">
          <Select
            value={workPackage.status}
            onValueChange={(value) => onStatusChange(value as WorkPackageStatus)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue>
                <StatusBadge status={workPackage.status} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${config.bgColor}`} />
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Meta info */}
        <p className="text-xs text-slate-400">
          Criado por {createdByName}. Última atualização em {formattedDate}
        </p>
      </div>

      {/* Info sections */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Pessoas */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Pessoas
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Atribuído para
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {workPackage.assigned_to_profile
                    ? `${workPackage.assigned_to_profile.first_name} ${workPackage.assigned_to_profile.last_name}`
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Responsável
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {workPackage.responsible_profile
                    ? `${workPackage.responsible_profile.first_name} ${workPackage.responsible_profile.last_name}`
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Cliente
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {workPackage.client?.name || '-'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Detalhes */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Detalhes
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">% de conclusão</span>
                <span className="text-sm font-medium text-slate-900">
                  {workPackage.completion_percent || 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Prioridade</span>
                <PriorityIndicator priority={workPackage.priority} showLabel />
              </div>
              {workPackage.stage && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Etapa</span>
                  <span className="text-sm font-medium text-slate-900">
                    {STAGE_CONFIG[workPackage.stage]?.label || workPackage.stage}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Estimativas */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Estimativas e Progresso
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Trabalho estimado
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {workPackage.estimated_hours ? `${workPackage.estimated_hours}h` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tempo gasto
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {workPackage.spent_hours ? `${workPackage.spent_hours}h` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Restante
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {workPackage.remaining_hours ? `${workPackage.remaining_hours}h` : '-'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Datas */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Datas
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Início
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {workPackage.start_date
                    ? format(new Date(workPackage.start_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Conclusão
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {workPackage.due_date
                    ? format(new Date(workPackage.due_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
            <TabsTrigger
              value="atividade"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent px-4 py-2"
            >
              Atividade
            </TabsTrigger>
            <TabsTrigger
              value="arquivos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent px-4 py-2"
            >
              Arquivos
            </TabsTrigger>
            <TabsTrigger
              value="relacoes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent px-4 py-2"
            >
              Relações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="atividade" className="mt-0 flex-1">
            <ActivityTimeline
              activities={activities}
              isLoading={isLoadingActivities}
              onAddComment={onAddComment}
              isAddingComment={isAddingComment}
            />
          </TabsContent>

          <TabsContent value="arquivos" className="mt-0 p-4">
            <div className="text-center text-slate-400 py-8">
              <p>Nenhum arquivo anexado</p>
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Anexar arquivo
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="relacoes" className="mt-0 p-4">
            <div className="text-center text-slate-400 py-8">
              <p>Nenhuma relação definida</p>
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Adicionar relação
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}
