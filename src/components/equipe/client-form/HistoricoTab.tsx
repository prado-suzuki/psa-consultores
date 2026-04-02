import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatChangedFields, type LookupMaps } from '../audit/auditFieldFormatter';
import type { DraftEntity, DraftParticipant, DraftContract } from '@/types/clientForm';

interface HistoricoTabProps {
  clienteId: string;
  entities: DraftEntity[];
  participants: DraftParticipant[];
  contracts: DraftContract[];
}

interface AuditLog {
  id: string;
  entity_type: string;
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
  cliente: 'Cliente',
  contribuinte: 'Contribuinte',
  participante: 'Participante',
  ordem_servico: 'Ordem de Serviço',
};

export default function HistoricoTab({ clienteId, entities, participants, contracts }: HistoricoTabProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Collect all related IDs
  const allIds = [
    clienteId,
    ...entities.map(e => (e as any)._dbId).filter(Boolean),
    ...participants.map(p => (p as any)._dbId).filter(Boolean),
    ...contracts.map(c => (c as any)._dbId).filter(Boolean),
  ];

  // Profiles lookup
  const { data: profiles = {} } = useQuery({
    queryKey: ['client-history-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      const map: Record<string, string> = {};
      (data as any[])?.forEach(p => { map[p.id] = `${p.first_name} ${p.last_name}`.trim(); });
      return map;
    },
  });

  const lookups: LookupMaps = { profiles, projects: {}, areas: {}, clients: {}, contribuintes: {}, servicos: {}, tasks: {} };

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['client-history-logs', clienteId, allIds.length],
    queryFn: async () => {
      const { data, error } = await (supabase.from('audit_logs' as any) as any)
        .select('*')
        .eq('area', 'dev')
        .in('entity_id', allIds)
        .order('performed_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: allIds.length > 0,
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
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
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
          </TableRow>
        ) : logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro de alteração encontrado</TableCell>
          </TableRow>
        ) : (
          logs.map(log => {
            const hasChanges = log.action === 'updated' && log.changed_fields && Object.keys(log.changed_fields).length > 0;
            const hasDetails = log.details && log.details.trim().length > 0;
            const isExpandable = hasChanges || hasDetails;
            const isExpanded = expandedRows.has(log.id);
            const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '' };
            const formattedChanges = hasChanges ? formatChangedFields(log.changed_fields!, lookups) : [];

            return (
              <Collapsible key={log.id} open={isExpanded} onOpenChange={() => isExpandable && toggleRow(log.id)} asChild>
                <>
                  <CollapsibleTrigger asChild disabled={!isExpandable}>
                    <TableRow className={isExpandable ? 'cursor-pointer hover:bg-slate-50' : ''}>
                      <TableCell className="px-2">
                        {isExpandable && (isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(log.performed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">{profiles[log.performed_by] || 'Desconhecido'}</TableCell>
                      <TableCell><Badge className={actionInfo.color}>{actionInfo.label}</Badge></TableCell>
                      <TableCell className="text-sm">{ENTITY_LABELS[log.entity_type] || log.entity_type}</TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">{log.entity_name}</TableCell>
                    </TableRow>
                  </CollapsibleTrigger>
                  {isExpandable && (
                    <CollapsibleContent asChild>
                      <TableRow className="bg-slate-50/50">
                        <TableCell colSpan={6} className="p-4">
                          <div className="text-xs space-y-1">
                            {hasDetails && <p className="text-muted-foreground italic mb-2">{log.details}</p>}
                            {formattedChanges.length > 0 && (
                              <>
                                <p className="font-semibold text-slate-700 mb-2">Campos alterados:</p>
                                {formattedChanges.map((change, idx) => (
                                  <div key={idx} className="flex gap-2 items-baseline">
                                    <span className="font-medium text-muted-foreground min-w-[140px]">{change.label}:</span>
                                    <span className="text-red-600 line-through">{change.oldValue}</span>
                                    <span className="text-muted-foreground">→</span>
                                    <span className="text-emerald-600">{change.newValue}</span>
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
  );
}
