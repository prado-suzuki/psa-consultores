import { useState, useMemo } from 'react';
import { parseDate } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkPackages } from '@/hooks/useWorkPackages';
import { useOrgProjectsList } from '@/hooks/useOrgProjects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ListFilter, Plus, Search, ChevronRight, ChevronDown, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusBadge, TypeBadge, PriorityIndicator } from '@/components/projetos/StatusBadge';
import { WorkPackageSheet } from './WorkPackageSheet';
import type { WorkPackage, WorkPackageStatus } from '@/types/workPackage';

type FilterPreset = 'todos_abertos' | 'atrasados' | 'criado_por_mim' | 'atribuido_a_mim' | 'ultima_atividade';

const FILTER_LABELS: Record<FilterPreset, string> = {
  todos_abertos: 'Todos abertos',
  atrasados: 'Atrasados',
  criado_por_mim: 'Criado por mim',
  atribuido_a_mim: 'Atribuido a mim',
  ultima_atividade: 'Ultima atividade',
};

export function FiscalWorkPackages() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<FilterPreset>('todos_abertos');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Use centralized hook for projects dropdown
  const { data: projects = [] } = useOrgProjectsList(true);

  // Build filters based on preset
  const filters = useMemo(() => {
    const baseFilters: {
      area: ['fiscal'];
      project_id?: string;
      status?: WorkPackageStatus[];
      assigned_to?: string;
      created_by?: string;
      search?: string;
    } = {
      area: ['fiscal'],
    };

    if (selectedProject && selectedProject !== 'all') {
      baseFilters.project_id = selectedProject;
    }

    if (search) {
      baseFilters.search = search;
    }

    switch (activeFilter) {
      case 'todos_abertos':
        baseFilters.status = ['novo', 'pendente_agendamento', 'agendado', 'em_progresso', 'em_revisao'];
        break;
      case 'atrasados':
        baseFilters.status = ['novo', 'pendente_agendamento', 'agendado', 'em_progresso', 'em_revisao'];
        break;
      case 'criado_por_mim':
        if (user?.id) baseFilters.created_by = user.id;
        break;
      case 'atribuido_a_mim':
        if (user?.id) baseFilters.assigned_to = user.id;
        break;
      case 'ultima_atividade':
        break;
    }

    return baseFilters;
  }, [selectedProject, activeFilter, search, user?.id]);

  const { data: workPackages = [], isLoading } = useWorkPackages(filters);

  const processedData = useMemo(() => {
    let data = [...workPackages];
    if (activeFilter === 'atrasados') {
      const today = new Date();
      data = data.filter(wp => 
        wp.due_date && parseDate(wp.due_date) < today && wp.status !== 'concluido'
      );
    }
    if (activeFilter === 'ultima_atividade') {
      data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return data;
  }, [workPackages, activeFilter]);

  const hierarchicalData = useMemo(() => {
    const rootItems = processedData.filter(wp => !wp.parent_id);
    const childrenMap = new Map<string, WorkPackage[]>();
    processedData.forEach(wp => {
      if (wp.parent_id) {
        const children = childrenMap.get(wp.parent_id) || [];
        children.push(wp);
        childrenMap.set(wp.parent_id, children);
      }
    });
    const result: Array<{ wp: WorkPackage; depth: number; hasChildren: boolean }> = [];
    const addWithChildren = (wp: WorkPackage, depth: number) => {
      const children = childrenMap.get(wp.id) || [];
      result.push({ wp, depth, hasChildren: children.length > 0 });
      if (expandedIds.has(wp.id)) {
        children.forEach(child => addWithChildren(child, depth + 1));
      }
    };
    rootItems.forEach(wp => addWithChildren(wp, 0));
    return result;
  }, [processedData, expandedIds]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRowClick = (wp: WorkPackage) => {
    setSelectedId(wp.id);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Todos os projetos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ListFilter className="h-4 w-4" />
                {FILTER_LABELS[activeFilter]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setActiveFilter('todos_abertos')}>Todos abertos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveFilter('ultima_atividade')}>Ultima atividade</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveFilter('atrasados')}>Atrasados</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setActiveFilter('criado_por_mim')}>Criado por mim</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveFilter('atribuido_a_mim')}>Atribuido a mim</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-[200px]" />
          </div>

          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Criar
          </Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : hierarchicalData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum pacote de trabalho</p>
            <p className="text-sm mt-1">Crie um novo pacote para comecar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-[80px] font-semibold">ID</TableHead>
                <TableHead className="font-semibold">Assunto</TableHead>
                <TableHead className="w-[100px] font-semibold">Tipo</TableHead>
                <TableHead className="w-[160px] font-semibold">Status</TableHead>
                <TableHead className="w-[80px] font-semibold">Prioridade</TableHead>
                <TableHead className="w-[150px] font-semibold">Atribuido</TableHead>
                <TableHead className="w-[150px] font-semibold">Responsavel</TableHead>
                <TableHead className="w-[110px] font-semibold">Conclusao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hierarchicalData.map(({ wp, depth, hasChildren }) => (
                <TableRow key={wp.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleRowClick(wp)}>
                  <TableCell className="font-mono text-sm text-slate-500">#{wp.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
                      {hasChildren && (
                        <button onClick={(e) => { e.stopPropagation(); toggleExpand(wp.id); }} className="p-0.5 hover:bg-slate-200 rounded">
                          {expandedIds.has(wp.id) ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                        </button>
                      )}
                      {!hasChildren && depth > 0 && <span className="w-5" />}
                      <span className="font-medium text-slate-900">{wp.title}</span>
                    </div>
                  </TableCell>
                  <TableCell><TypeBadge type={wp.type} size="sm" /></TableCell>
                  <TableCell><StatusBadge status={wp.status} size="sm" /></TableCell>
                  <TableCell><PriorityIndicator priority={wp.priority} /></TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {wp.assigned_to_profile ? `${wp.assigned_to_profile.first_name} ${wp.assigned_to_profile.last_name}` : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {wp.responsible_profile ? `${wp.responsible_profile.first_name} ${wp.responsible_profile.last_name}` : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {wp.due_date ? format(parseDate(wp.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-lg">
          <WorkPackageSheet workPackageId={selectedId} onClose={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
