import { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyWorkPackages, useAllFiscalWorkPackages, type MyWorkPackage } from '@/hooks/useMyWorkPackages';
import { useUpdateWorkPackage, useCreateWorkPackage } from '@/hooks/useWorkPackages';
import { DemandaAlertCards } from './DemandaAlertCards';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { WorkPackageSheet } from '@/components/equipe/fiscal/WorkPackageSheet';
import { WorkPackageForm } from '@/components/projetos/WorkPackageForm';
import { StatusBadge, TypeBadge, PriorityIndicator } from '@/components/projetos/StatusBadge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronDown, ChevronRight, Plus, User, Users, Building } from 'lucide-react';
import { format, isToday, isBefore, startOfDay, endOfWeek, isWithinInterval, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate, getTodayBrazil, isPastBrazil, isTodayBrazil } from '@/lib/dateUtils';
import type { WorkPackage } from '@/types/workPackage';

type FilterType = 'minhas' | 'criadas' | 'area';

interface GroupedDemandas {
  atrasadas: MyWorkPackage[];
  alta_prioridade: MyWorkPackage[];
  para_hoje: MyWorkPackage[];
  esta_semana: MyWorkPackage[];
  proximas: MyWorkPackage[];
}

export function MinhasDemandas() {
  const { user } = useAuth();
  const userId = user?.id;

  const [filter, setFilter] = useState<FilterType>('minhas');
  const [openGroups, setOpenGroups] = useState<string[]>(['atrasadas', 'alta_prioridade', 'para_hoje']);
  const [selectedWorkPackageId, setSelectedWorkPackageId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorkPackage, setEditingWorkPackage] = useState<WorkPackage | null>(null);

  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: myWorkPackages = [], isLoading: isLoadingMy } = useMyWorkPackages();
  const { data: allFiscalWorkPackages = [], isLoading: isLoadingAll } = useAllFiscalWorkPackages();

  const updateMutation = useUpdateWorkPackage();
  const createMutation = useCreateWorkPackage();

  // Filter work packages based on selected filter
  const filteredWorkPackages = useMemo(() => {
    if (!userId) return [];

    let packages: MyWorkPackage[] = [];

    switch (filter) {
      case 'minhas':
        packages = myWorkPackages.filter(wp => wp.assigned_to === userId);
        break;
      case 'criadas':
        packages = myWorkPackages.filter(wp => wp.created_by === userId);
        break;
      case 'area':
        packages = allFiscalWorkPackages;
        break;
      default:
        packages = myWorkPackages;
    }

    return packages;
  }, [filter, myWorkPackages, allFiscalWorkPackages, userId]);

  // Group work packages by category
  const groupedDemandas = useMemo<GroupedDemandas>(() => {
    const today = getTodayBrazil();
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });

    const groups: GroupedDemandas = {
      atrasadas: [],
      alta_prioridade: [],
      para_hoje: [],
      esta_semana: [],
      proximas: [],
    };

    filteredWorkPackages.forEach(wp => {
      const dueDate = wp.due_date ? parseDate(wp.due_date) : null;
      const isOverdue = dueDate && isPastBrazil(dueDate) && wp.status !== 'concluido';
      const isDueToday = dueDate && isTodayBrazil(dueDate);
      const isHighPriority = wp.priority === 'alta';
      const isThisWeek = dueDate && isWithinInterval(dueDate, { start: weekStart, end: weekEnd });

      if (isOverdue) {
        groups.atrasadas.push(wp);
      } else if (isHighPriority && !isDueToday) {
        groups.alta_prioridade.push(wp);
      } else if (isDueToday) {
        groups.para_hoje.push(wp);
      } else if (isThisWeek) {
        groups.esta_semana.push(wp);
      } else {
        groups.proximas.push(wp);
      }
    });

    return groups;
  }, [filteredWorkPackages]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  };

  const scrollToGroup = (groupId: string) => {
    if (!openGroups.includes(groupId)) {
      setOpenGroups(prev => [...prev, groupId]);
    }
    setTimeout(() => {
      groupRefs.current[groupId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleOpenWorkPackage = (wp: MyWorkPackage) => {
    setSelectedWorkPackageId(wp.id);
    setIsSheetOpen(true);
  };

  const handleEditWorkPackage = (id: string) => {
    const wp = filteredWorkPackages.find(w => w.id === id);
    if (wp) {
      setEditingWorkPackage(wp as unknown as WorkPackage);
      setIsSheetOpen(false);
      setIsFormOpen(true);
    }
  };

  const handleCreateNew = () => {
    setEditingWorkPackage(null);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: Partial<WorkPackage>) => {
    if (editingWorkPackage) {
      updateMutation.mutate(
        { id: editingWorkPackage.id, data, oldData: editingWorkPackage },
        {
          onSuccess: () => {
            setIsFormOpen(false);
            setEditingWorkPackage(null);
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setIsFormOpen(false);
        },
      });
    }
  };

  const canEdit = (wp: MyWorkPackage) => {
    return wp.created_by === userId || wp.responsible === userId;
  };

  const isLoading = isLoadingMy || isLoadingAll;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-12" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Cards */}
      <DemandaAlertCards
        atrasadasCount={groupedDemandas.atrasadas.length}
        hojeCount={groupedDemandas.para_hoje.length}
        altaPrioridadeCount={groupedDemandas.alta_prioridade.length}
        onClickAtrasadas={() => scrollToGroup('atrasadas')}
        onClickHoje={() => scrollToGroup('para_hoje')}
        onClickAltaPrioridade={() => scrollToGroup('alta_prioridade')}
      />

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minhas">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Atribuidas a mim
                </div>
              </SelectItem>
              <SelectItem value="criadas">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Criadas por mim
                </div>
              </SelectItem>
              <SelectItem value="area">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Toda a area
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCreateNew} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Demanda
        </Button>
      </div>

      {/* Grouped Lists */}
      <div className="space-y-4">
        <DemandaGroup
          ref={(el) => (groupRefs.current['atrasadas'] = el)}
          title="Atrasadas"
          items={groupedDemandas.atrasadas}
          isOpen={openGroups.includes('atrasadas')}
          onToggle={() => toggleGroup('atrasadas')}
          onItemClick={handleOpenWorkPackage}
          canEdit={canEdit}
          badgeColor="bg-red-100 text-red-700"
        />

        <DemandaGroup
          ref={(el) => (groupRefs.current['alta_prioridade'] = el)}
          title="Alta Prioridade"
          items={groupedDemandas.alta_prioridade}
          isOpen={openGroups.includes('alta_prioridade')}
          onToggle={() => toggleGroup('alta_prioridade')}
          onItemClick={handleOpenWorkPackage}
          canEdit={canEdit}
          badgeColor="bg-orange-100 text-orange-700"
        />

        <DemandaGroup
          ref={(el) => (groupRefs.current['para_hoje'] = el)}
          title="Para Hoje"
          items={groupedDemandas.para_hoje}
          isOpen={openGroups.includes('para_hoje')}
          onToggle={() => toggleGroup('para_hoje')}
          onItemClick={handleOpenWorkPackage}
          canEdit={canEdit}
          badgeColor="bg-amber-100 text-amber-700"
        />

        <DemandaGroup
          ref={(el) => (groupRefs.current['esta_semana'] = el)}
          title="Esta Semana"
          items={groupedDemandas.esta_semana}
          isOpen={openGroups.includes('esta_semana')}
          onToggle={() => toggleGroup('esta_semana')}
          onItemClick={handleOpenWorkPackage}
          canEdit={canEdit}
          badgeColor="bg-blue-100 text-blue-700"
        />

        <DemandaGroup
          ref={(el) => (groupRefs.current['proximas'] = el)}
          title="Proximas"
          items={groupedDemandas.proximas}
          isOpen={openGroups.includes('proximas')}
          onToggle={() => toggleGroup('proximas')}
          onItemClick={handleOpenWorkPackage}
          canEdit={canEdit}
          badgeColor="bg-slate-100 text-slate-700"
        />
      </div>

      {filteredWorkPackages.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg font-medium">Nenhuma demanda encontrada</p>
          <p className="text-sm mt-1">Ajuste os filtros ou crie uma nova demanda</p>
        </div>
      )}

      {/* Work Package Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-lg">
          <WorkPackageSheet
            workPackageId={selectedWorkPackageId ?? undefined}
            onClose={() => setIsSheetOpen(false)}
            onEdit={handleEditWorkPackage}
          />
        </SheetContent>
      </Sheet>

      {/* Work Package Form */}
      <WorkPackageForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        initialData={editingWorkPackage}
        isLoading={updateMutation.isPending || createMutation.isPending}
      />
    </div>
  );
}

// Demanda Group Component
interface DemandaGroupProps {
  title: string;
  items: MyWorkPackage[];
  isOpen: boolean;
  onToggle: () => void;
  onItemClick: (wp: MyWorkPackage) => void;
  canEdit: (wp: MyWorkPackage) => boolean;
  badgeColor: string;
}

const DemandaGroup = React.forwardRef<HTMLDivElement, DemandaGroupProps>(
  ({ title, items, isOpen, onToggle, onItemClick, canEdit, badgeColor }, ref) => {
    if (items.length === 0) return null;

    return (
      <div ref={ref}>
        <Collapsible open={isOpen} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
                <span className="font-medium text-slate-900">{title}</span>
                <Badge variant="secondary" className={badgeColor}>
                  {items.length}
                </Badge>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {items.map(wp => (
                <DemandaRow
                  key={wp.id}
                  workPackage={wp}
                  onClick={() => onItemClick(wp)}
                  showEditIndicator={canEdit(wp)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }
);
DemandaGroup.displayName = 'DemandaGroup';

// Individual Demanda Row
interface DemandaRowProps {
  workPackage: MyWorkPackage;
  onClick: () => void;
  showEditIndicator: boolean;
}

function DemandaRow({ workPackage, onClick, showEditIndicator }: DemandaRowProps) {
  const dueDate = workPackage.due_date ? parseDate(workPackage.due_date) : null;
  const isOverdue = dueDate && isPastBrazil(dueDate);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 transition-colors text-left"
    >
      <span className="text-sm font-mono text-slate-400">#{workPackage.code}</span>
      
      <TypeBadge type={workPackage.type} />
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate">{workPackage.title}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {workPackage.project?.name && (
            <span>{workPackage.project.name}</span>
          )}
          {workPackage.client?.name && (
            <>
              <span>•</span>
              <span>{workPackage.client.name}</span>
            </>
          )}
        </div>
      </div>

      <StatusBadge status={workPackage.status} />

      <PriorityIndicator priority={workPackage.priority} />

      <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
        {dueDate ? format(dueDate, 'dd/MM', { locale: ptBR }) : '-'}
      </span>

      {showEditIndicator && (
        <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-600">
          Pode editar
        </Badge>
      )}
    </button>
  );
}

// Add React import for forwardRef
import React from 'react';
