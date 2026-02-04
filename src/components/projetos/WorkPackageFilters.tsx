import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ListFilter, 
  Clock, 
  AlertCircle, 
  User, 
  Users,
  ChevronDown,
  ChevronRight,
  Building,
  Calculator,
  Briefcase,
  FolderKanban,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AREA_CONFIG, type WorkPackageArea, type WorkPackageStatus } from '@/types/workPackage';

interface FilterItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  filter?: {
    status?: WorkPackageStatus[];
    area?: WorkPackageArea[];
    assigned_to?: string;
    created_by?: string;
  };
}

interface WorkPackageFiltersProps {
  activeFilter: string;
  onFilterChange: (filterId: string, filter: FilterItem['filter']) => void;
  currentUserId?: string;
}

export function WorkPackageFilters({ activeFilter, onFilterChange, currentUserId }: WorkPackageFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    padrao: true,
    areas: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const defaultFilters: FilterItem[] = [
    { 
      id: 'todos_abertos', 
      label: 'Todos abertos', 
      icon: <ListFilter className="h-4 w-4" />,
      filter: { status: ['novo', 'pendente_agendamento', 'agendado', 'em_progresso', 'em_revisao'] }
    },
    { 
      id: 'ultima_atividade', 
      label: 'Última atividade', 
      icon: <Clock className="h-4 w-4" />,
      filter: {}
    },
    { 
      id: 'atrasado', 
      label: 'Atrasado', 
      icon: <AlertCircle className="h-4 w-4 text-red-500" />,
      filter: {}
    },
    { 
      id: 'criado_por_mim', 
      label: 'Criado por mim', 
      icon: <User className="h-4 w-4" />,
      filter: currentUserId ? { created_by: currentUserId } : {}
    },
    { 
      id: 'atribuido_a_mim', 
      label: 'Atribuído a mim', 
      icon: <User className="h-4 w-4" />,
      filter: currentUserId ? { assigned_to: currentUserId } : {}
    },
  ];

  const areaFilters: FilterItem[] = [
    { 
      id: 'area_fiscal', 
      label: 'Fiscal', 
      icon: <Calculator className="h-4 w-4 text-emerald-600" />,
      filter: { area: ['fiscal'] }
    },
    { 
      id: 'area_osg', 
      label: 'OSG', 
      icon: <Briefcase className="h-4 w-4 text-orange-600" />,
      filter: { area: ['osg'] }
    },
    { 
      id: 'area_fixos', 
      label: 'Fixos', 
      icon: <Building className="h-4 w-4 text-blue-600" />,
      filter: { area: ['fixos'] }
    },
    { 
      id: 'area_pontuais', 
      label: 'Pontuais', 
      icon: <FolderKanban className="h-4 w-4 text-purple-600" />,
      filter: { area: ['pontuais'] }
    },
  ];

  const renderFilterItem = (item: FilterItem) => (
    <button
      key={item.id}
      onClick={() => onFilterChange(item.id, item.filter)}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
        activeFilter === item.id
          ? 'bg-violet-100 text-violet-900 font-medium'
          : 'text-slate-600 hover:bg-slate-100'
      )}
    >
      {item.icon}
      <span className="flex-1 truncate">{item.label}</span>
      {item.count !== undefined && (
        <span className="text-xs text-slate-400">{item.count}</span>
      )}
    </button>
  );

  const renderSection = (
    id: string, 
    title: string, 
    items: FilterItem[], 
    showAddButton?: boolean
  ) => (
    <div className="space-y-1">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-700"
      >
        {expandedSections[id] ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {title}
      </button>
      {expandedSections[id] && (
        <div className="space-y-0.5">
          {items.map(renderFilterItem)}
          {showAddButton && (
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
              <Plus className="h-4 w-4" />
              <span>Criar filtro salvo</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-64 border-r border-slate-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Filtros</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {renderSection('padrao', 'Padrão', defaultFilters)}
          <Separator />
          {renderSection('areas', 'Áreas', areaFilters, true)}
        </div>
      </ScrollArea>
    </div>
  );
}
