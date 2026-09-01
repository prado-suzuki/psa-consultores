import { useState } from 'react';
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
import { useDomainAuditLogs, useDomainAuditLookupMaps } from '@/hooks/useDomainAuditLogs';
import type { AuditArea } from '@/lib/auditAreas';
import { formatChangedFields, LookupMaps } from './auditFieldFormatter';
import { ACTION_LABELS, ENTITY_LABELS } from './auditLabels';


interface AuditLogTableProps {
  /** Área do módulo, ou 'todas' no consolidado do Board. */
  area: AuditArea;
}

export const AuditLogTable = ({ area }: AuditLogTableProps) => {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const lookups: LookupMaps = useDomainAuditLookupMaps();

  const { data: logs = [], isLoading } = useDomainAuditLogs(area, entityFilter, actionFilter);

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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                          <TableRow className={isExpandable ? 'cursor-pointer hover:bg-muted' : ''}>
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
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={6} className="p-4">
                                <div className="text-xs space-y-1">
                                  {/* Details (e.g. reassignment reason) */}
                                  {hasDetails && (
                                    <p className="text-muted-foreground italic mb-2">{log.details}</p>
                                  )}

                                  {/* Changed fields */}
                                  {formattedChanges.length > 0 && (
                                    <>
                                      <p className="font-semibold text-foreground mb-2">Campos alterados:</p>
                                      {formattedChanges.map((change, idx) => (
                                        <div key={idx} className="flex gap-2 items-baseline">
                                          <span className="font-medium text-muted-foreground min-w-[140px]">
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
