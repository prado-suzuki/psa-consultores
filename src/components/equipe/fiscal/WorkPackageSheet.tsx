import { useState } from 'react';
import { parseDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar,
  Clock,
  User,
  Building,
  Link as LinkIcon,
  Plus,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusBadge, TypeBadge, PriorityIndicator } from '@/components/projetos/StatusBadge';
import { ActivityTimeline } from '@/components/projetos/ActivityTimeline';
import { 
  useWorkPackage, 
  useWorkPackageActivities, 
  useUpdateWorkPackage,
  useAddWorkPackageComment 
} from '@/hooks/useWorkPackages';
import { 
  STATUS_CONFIG, 
  STAGE_CONFIG,
  type WorkPackageStatus 
} from '@/types/workPackage';

interface WorkPackageSheetProps {
  workPackageId: string | undefined;
  onClose: () => void;
  onEdit?: (id: string) => void;
}

export function WorkPackageSheet({ workPackageId, onClose, onEdit }: WorkPackageSheetProps) {
  const [activeTab, setActiveTab] = useState('atividade');
  
  const { data: workPackage, isLoading } = useWorkPackage(workPackageId);
  const { data: activities = [], isLoading: isLoadingActivities } = useWorkPackageActivities(workPackageId);
  const updateMutation = useUpdateWorkPackage();
  const addCommentMutation = useAddWorkPackageComment();

  const handleStatusChange = (status: WorkPackageStatus) => {
    if (!workPackage) return;
    updateMutation.mutate({
      id: workPackage.id,
      data: { status },
      oldData: workPackage,
    });
  };

  const handleAddComment = (comment: string) => {
    if (!workPackageId) return;
    addCommentMutation.mutate({ workPackageId, comment });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!workPackage) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Pacote de trabalho nao encontrado
      </div>
    );
  }

  const formattedDate = format(new Date(workPackage.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR });

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-1 pb-4">
        {/* Parent link */}
        {workPackage.parent && (
          <button className="text-sm text-violet-600 hover:underline flex items-center gap-1 mb-2">
            <LinkIcon className="h-3 w-3" />
            #{workPackage.parent.code} {workPackage.parent.title.slice(0, 30)}...
          </button>
        )}
        
        {/* Title with type badge */}
        <div className="flex items-start gap-2">
          <TypeBadge type={workPackage.type} />
          <SheetTitle className="text-left flex-1">
            #{workPackage.code} {workPackage.title}
          </SheetTitle>
        </div>
        
        {/* Status selector */}
        <div className="flex items-center gap-3 mt-3">
          <Select
            value={workPackage.status}
            onValueChange={(value) => handleStatusChange(value as WorkPackageStatus)}
          >
            <SelectTrigger className="w-[220px]">
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
          
          {onEdit && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(workPackage.id)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
        
        <SheetDescription className="text-left">
          Ultima atualizacao em {formattedDate}
        </SheetDescription>
      </SheetHeader>

      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-4 pb-4">
          {/* Pessoas */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Pessoas
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Atribuido para
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
                  Responsavel
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
                <span className="text-sm text-slate-600">% de conclusao</span>
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
              {workPackage.project && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Projeto</span>
                  <span className="text-sm font-medium text-slate-900">
                    {workPackage.project.name}
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
                  Inicio
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {workPackage.start_date
                    ? format(parseDate(workPackage.start_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Conclusao
                </span>
                <span className="text-sm font-medium text-slate-900">
                  {workPackage.due_date
                    ? format(parseDate(workPackage.due_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full justify-start bg-transparent h-auto p-0 border-b rounded-none">
            <TabsTrigger
              value="atividade"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-4 py-2"
            >
              Atividade
            </TabsTrigger>
            <TabsTrigger
              value="arquivos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-4 py-2"
            >
              Arquivos
            </TabsTrigger>
            <TabsTrigger
              value="relacoes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent px-4 py-2"
            >
              Relacoes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="atividade" className="mt-4">
            <ActivityTimeline
              activities={activities}
              isLoading={isLoadingActivities}
              onAddComment={handleAddComment}
              isAddingComment={addCommentMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="arquivos" className="mt-4">
            <div className="text-center text-slate-400 py-8">
              <p>Nenhum arquivo anexado</p>
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Anexar arquivo
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="relacoes" className="mt-4">
            <div className="text-center text-slate-400 py-8">
              <p>Nenhuma relacao definida</p>
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Adicionar relacao
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}
