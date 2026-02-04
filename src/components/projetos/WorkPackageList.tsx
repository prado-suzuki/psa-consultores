import { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Plus,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge, TypeBadge, PriorityIndicator } from './StatusBadge';
import type { WorkPackage } from '@/types/workPackage';

interface WorkPackageListProps {
  workPackages: WorkPackage[];
  isLoading: boolean;
  selectedId?: string;
  onSelect: (wp: WorkPackage) => void;
  onCreateNew: () => void;
}

export function WorkPackageList({ 
  workPackages, 
  isLoading, 
  selectedId, 
  onSelect,
  onCreateNew 
}: WorkPackageListProps) {
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Build hierarchical structure
  const hierarchicalData = useMemo(() => {
    // Filter by search
    const filtered = search
      ? workPackages.filter(
          (wp) =>
            wp.title.toLowerCase().includes(search.toLowerCase()) ||
            wp.code.toString().includes(search)
        )
      : workPackages;

    // Group by parent
    const byParent = new Map<string | null, WorkPackage[]>();
    filtered.forEach((wp) => {
      const parentKey = wp.parent_id || null;
      if (!byParent.has(parentKey)) {
        byParent.set(parentKey, []);
      }
      byParent.get(parentKey)!.push(wp);
    });

    // Sort each group
    byParent.forEach((items) => {
      items.sort((a, b) => {
        const aVal = a[sortField as keyof WorkPackage];
        const bVal = b[sortField as keyof WorkPackage];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    });

    // Build flat list with indentation info
    const result: { wp: WorkPackage; depth: number; hasChildren: boolean }[] = [];
    
    const addChildren = (parentId: string | null, depth: number) => {
      const children = byParent.get(parentId) || [];
      children.forEach((wp) => {
        const wpChildren = byParent.get(wp.id) || [];
        result.push({ 
          wp, 
          depth, 
          hasChildren: wpChildren.length > 0 
        });
        if (expandedRows.has(wp.id)) {
          addChildren(wp.id, depth + 1);
        }
      });
    };

    addChildren(null, 0);
    return result;
  }, [workPackages, search, sortField, sortDir, expandedRows]);

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-slate-900"
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por título ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar
        </Button>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="w-[80px]">
                <SortableHeader field="code">ID</SortableHeader>
              </TableHead>
              <TableHead className="min-w-[300px]">
                <SortableHeader field="title">Assunto</SortableHeader>
              </TableHead>
              <TableHead className="w-[100px]">Tipo</TableHead>
              <TableHead className="w-[140px]">
                <SortableHeader field="status">Status</SortableHeader>
              </TableHead>
              <TableHead className="w-[80px]">Prioridade</TableHead>
              <TableHead className="w-[150px]">Atribuído</TableHead>
              <TableHead className="w-[150px]">Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hierarchicalData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                  Nenhum pacote de trabalho encontrado
                </TableCell>
              </TableRow>
            ) : (
              hierarchicalData.map(({ wp, depth, hasChildren }) => (
                <TableRow
                  key={wp.id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedId === wp.id
                      ? 'bg-violet-50 hover:bg-violet-100'
                      : 'hover:bg-slate-50'
                  )}
                  onClick={() => onSelect(wp)}
                >
                  <TableCell className="font-mono text-slate-500">
                    #{wp.code}
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${depth * 24}px` }}
                    >
                      {hasChildren && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(wp.id);
                          }}
                          className="p-0.5 hover:bg-slate-200 rounded"
                        >
                          {expandedRows.has(wp.id) ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      )}
                      {!hasChildren && depth > 0 && (
                        <span className="w-5" />
                      )}
                      <span className="font-medium text-slate-900 truncate">
                        {wp.title}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={wp.type} size="sm" />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={wp.status} size="sm" />
                  </TableCell>
                  <TableCell>
                    <PriorityIndicator priority={wp.priority} />
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {wp.assigned_to_profile
                      ? `${wp.assigned_to_profile.first_name} ${wp.assigned_to_profile.last_name}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {wp.responsible_profile
                      ? `${wp.responsible_profile.first_name} ${wp.responsible_profile.last_name}`
                      : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
