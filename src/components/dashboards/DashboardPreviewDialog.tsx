import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUsersWithRoles } from '@/hooks/useUsersWithRoles';
import { useClientesList } from '@/hooks/useClientesList';
import { usePreviewDashboardEmbedUrl, type PreviewMode } from '@/hooks/usePreviewDashboardEmbedUrl';
import type { DashboardFilterType } from '@/hooks/useDashboards';
import { MultiSelectCombobox } from './MultiSelectCombobox';
import { SingleSelectCombobox } from './SingleSelectCombobox';
import { DashboardIframe } from './DashboardIframe';

export interface PreviewTarget {
  dashboardId: string;
  dashboardName: string;
  filterType: DashboardFilterType;
  /** Pré-seleção (ex.: vindo da aba Usuários: mode='user' + o usuário). */
  initialMode?: PreviewMode;
  initialUserId?: string | null;
}

interface DashboardPreviewDialogProps {
  target: PreviewTarget | null;
  onOpenChange: (open: boolean) => void;
}

const defaultModeFor = (ft: DashboardFilterType): PreviewMode =>
  ft === 'cliente' ? 'cliente' : ft === 'cluster' ? 'cluster' : 'nenhum';

export function DashboardPreviewDialog({ target, onOpenChange }: DashboardPreviewDialogProps) {
  const open = !!target;
  const filterType = target?.filterType ?? 'nenhum';

  const [mode, setMode] = useState<PreviewMode>('nenhum');
  const [userId, setUserId] = useState<string | null>(null);
  const [clusterIds, setClusterIds] = useState<string[]>([]);
  const [clienteId, setClienteId] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setMode(target.initialMode ?? defaultModeFor(target.filterType));
    setUserId(target.initialUserId ?? null);
    setClusterIds([]);
    setClienteId(null);
  }, [target?.dashboardId, target?.initialMode, target?.initialUserId]);

  const { data: users = [] } = useUsersWithRoles();
  const { data: clientes = [] } = useClientesList();
  const { data: clusters = [] } = useQuery({
    queryKey: ['estrutura-clusters-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_clusters').select('id, name').eq('is_active', true).order('name');
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
  });

  const preview = usePreviewDashboardEmbedUrl({
    dashboardId: target?.dashboardId ?? null,
    filterType, mode, clusterIds, userId, clienteId,
  });

  const audienceOptions: { value: PreviewMode; label: string }[] =
    filterType === 'cluster'
      ? [{ value: 'user', label: 'Por usuário' }, { value: 'cluster', label: 'Por cluster' }]
      : filterType === 'cliente'
        ? [{ value: 'user', label: 'Por usuário' }, { value: 'cliente', label: 'Por cliente' }]
        : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] w-[92vw] h-[90vh] flex flex-col gap-3 p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base">Preview — {target?.dashboardName}</DialogTitle>
        </DialogHeader>

        {filterType !== 'nenhum' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {audienceOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setMode(o.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                    mode === o.value
                      ? 'bg-teal-500/10 text-teal-700 border-teal-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {mode === 'user' && (
              <SingleSelectCombobox
                options={users.map((u) => ({
                  value: u.id,
                  label: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
                }))}
                value={userId}
                onChange={setUserId}
                placeholder="Selecionar usuário…"
                searchPlaceholder="Buscar usuário…"
                emptyText="Nenhum usuário."
              />
            )}
            {mode === 'cluster' && (
              <MultiSelectCombobox
                options={clusters.map((c) => ({ value: c.id, label: c.name }))}
                selected={clusterIds}
                onChange={setClusterIds}
                placeholder="Selecionar clusters…"
                searchPlaceholder="Buscar cluster…"
                emptyText="Nenhum cluster."
              />
            )}
            {mode === 'cliente' && (
              <SingleSelectCombobox
                options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                value={clienteId}
                onChange={setClienteId}
                placeholder="Selecionar cliente…"
                searchPlaceholder="Buscar cliente…"
                emptyText="Nenhum cliente."
              />
            )}

            {preview.data?.ok && preview.data.value && (
              <Badge variant="secondary" className="font-mono text-[11px]">
                valor injetado: {preview.data.value}
              </Badge>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-slate-50">
          <DashboardIframe
            embed={preview.data}
            isLoading={preview.isLoading}
            title={target?.dashboardName ?? 'Dashboard'}
            width="100%"
            height={900}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
