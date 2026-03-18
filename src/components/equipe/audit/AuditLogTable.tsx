import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatChangedFields, LookupMaps } from './auditFieldFormatter';


interface AuditLogTableProps {
  area: 'tax' | 'osg';
}

interface AuditLog {
  id: string;
  area: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action: string;
  changed_fields: Record<string, { old: unknown; new: unknown }> | null;
  performed_by: string;
  performed_at: string;
  details: string | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'Criação', color: 'bg-emerald-100 text-emerald-700' },
  updated: { label: 'Edição', color: 'bg-blue-100 text-blue-700' },
  deleted: { label: 'Exclusão', color: 'bg-red-100 text-red-700' },
};

const ENTITY_LABELS: Record<string, string> = {
  project: 'Projeto',
  task: 'Tarefa',
  subtask: 'Subtarefa',
};

// ── Lookup hooks ─────────────────────────────────────────────
function useLookupMaps(): LookupMaps {
  const buildMap = (data: { id: string; label: string }[] | null) => {
    const map: Record<string, string> = {};
    data?.forEach(d => { map[d.id] = d.label; });
    return map;
  };

  const { data: profiles = {} } = useQuery({
    queryKey: ['audit-lookup-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles' as any)
        .select('id, first_name, last_name');
      const map: Record<string, string> = {};
      (data as any[])?.forEach(p => {
        map[p.id] = `${p.first_name} ${p.last_name}`.trim();
      });
      return map;
    },
  });

  const { data: projects = {} } = useQuery({
    queryKey: ['audit-lookup-projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tax_projects')
        .select('id, name');
      return buildMap(data?.map(d => ({ id: d.id, label: d.name })) ?? null);
    },
  });

  const { data: areas = {} } = useQuery({
    queryKey: ['audit-lookup-areas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tax_areas')
        .select('id, nome');
      return buildMap(data?.map(d => ({ id: d.id, label: d.nome })) ?? null);
    },
  });

  const { data: clients = {} } = useQuery({
    queryKey: ['audit-lookup-clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select('id, nome');
      return buildMap(data?.map(d => ({ id: d.id, label: d.nome })) ?? null);
    },
  });

  const { data: contribuintes = {} } = useQuery({
    queryKey: ['audit-lookup-contribuintes', contribuinteTable],
    queryFn: async () => {
      const { data } = await supabase
        .from(contribuinteTable)
        .select('id, nome_razao_social')
        .eq('excluido', false);
      return buildMap(data?.map(d => ({ id: d.id, label: d.nome_razao_social })) ?? null);
    },
  });

  const { data: servicos = {} } = useQuery({
    queryKey: ['audit-lookup-servicos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('servicos_prestados' as any)
        .select('id, nome');
      return buildMap((data as any[])?.map(d => ({ id: d.id, label: d.nome })) ?? null);
    },
  });

  const { data: tasks = {} } = useQuery({
    queryKey: ['audit-lookup-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('fiscal_tasks')
        .select('id, title');
      return buildMap(data?.map(d => ({ id: d.id, label: d.title })) ?? null);
    },
  });

  return { profiles, projects, areas, clients, contribuintes, servicos, tasks };
}

export const AuditLogTable = ({ area }: AuditLogTableProps) => {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const lookups = useLookupMaps();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', area, entityFilter, actionFilter],
    queryFn: async () => {
      let query = (supabase.from('audit_logs' as any) as any)
        .select('*')
        .eq('area', area)
        .order('performed_at', { ascending: false })
        .limit(200);

      if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);
      if (actionFilter !== 'all') query = query.eq('action', actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const filteredLogs = logs.filter(log => {
    if (search && !log.entity_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (userFilter !== 'all' && log.performed_by !== userFilter) return false;
    return true;
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue>
              {entityFilter === 'all' ? 'Filtrar por tipo' : ENTITY_LABELS[entityFilter] || entityFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="project">Projeto</SelectItem>
            <SelectItem value="task">Tarefa</SelectItem>
            <SelectItem value="subtask">Subtarefa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue>
              {actionFilter === 'all' ? 'Filtrar por ação' : ACTION_LABELS[actionFilter]?.label || actionFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="created">Criação</SelectItem>
            <SelectItem value="updated">Edição</SelectItem>
            <SelectItem value="deleted">Exclusão</SelectItem>
          </SelectContent>
        </Select>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue>
              {userFilter === 'all' ? 'Filtrar por usuário' : lookups.profiles[userFilter] || 'Desconhecido'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(lookups.profiles).map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Entidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map(log => {
                  const hasDetails = log.details && log.details.trim().length > 0;
                  const hasChanges = log.action === 'updated' && log.changed_fields && Object.keys(log.changed_fields).length > 0;
                  const isExpandable = hasChanges || hasDetails;
                  const isExpanded = expandedRows.has(log.id);
                  const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '' };

                  const formattedChanges = hasChanges
                    ? formatChangedFields(log.changed_fields!, lookups)
                    : [];

                  return (
                    <Collapsible key={log.id} open={isExpanded} onOpenChange={() => isExpandable && toggleRow(log.id)} asChild>
                      <>
                        <CollapsibleTrigger asChild disabled={!isExpandable}>
                          <TableRow className={isExpandable ? 'cursor-pointer hover:bg-slate-50' : ''}>
                            <TableCell className="px-2">
                              {isExpandable && (
                                isExpanded
                                  ? <ChevronDown className="h-4 w-4 text-slate-400" />
                                  : <ChevronRight className="h-4 w-4 text-slate-400" />
                              )}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {format(new Date(log.performed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-sm">
                              {lookups.profiles[log.performed_by] || 'Desconhecido'}
                            </TableCell>
                            <TableCell>
                              <Badge className={actionInfo.color}>{actionInfo.label}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {ENTITY_LABELS[log.entity_type] || log.entity_type}
                            </TableCell>
                            <TableCell className="text-sm font-medium max-w-[200px] truncate">
                              {log.entity_name}
                            </TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        {isExpandable && (
                          <CollapsibleContent asChild>
                            <TableRow className="bg-slate-50/50">
                              <TableCell colSpan={6} className="p-4">
                                <div className="text-xs space-y-1">
                                  {/* Details (e.g. reassignment reason) */}
                                  {hasDetails && (
                                    <p className="text-slate-600 italic mb-2">{log.details}</p>
                                  )}

                                  {/* Changed fields */}
                                  {formattedChanges.length > 0 && (
                                    <>
                                      <p className="font-semibold text-slate-700 mb-2">Campos alterados:</p>
                                      {formattedChanges.map((change, idx) => (
                                        <div key={idx} className="flex gap-2 items-baseline">
                                          <span className="font-medium text-slate-600 min-w-[140px]">
                                            {change.label}:
                                          </span>
                                          <span className="text-red-600 line-through">
                                            {change.oldValue}
                                          </span>
                                          <span className="text-slate-400">→</span>
                                          <span className="text-emerald-600">
                                            {change.newValue}
                                          </span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        )}
                      </>
                    </Collapsible>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
