import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useClusters } from '@/hooks/useClusters';
import { useClientesList } from '@/hooks/useClientesList';
import { usePreviewDashboardEmbedUrl } from '@/hooks/usePreviewDashboardEmbedUrl';
import type { DashboardFilterType } from '@/hooks/useDashboards';
import { DicaIcon } from '@/components/equipe/mapa/Tooltip';
import { SingleSelectCombobox } from './SingleSelectCombobox';
import { DashboardIframe } from './DashboardIframe';

export interface PreviewTarget {
  dashboardId: string;
  dashboardName: string;
  filterType: DashboardFilterType;
}

interface DashboardPreviewDialogProps {
  target: PreviewTarget | null;
  onOpenChange: (open: boolean) => void;
  /** Abre a edição deste dashboard sem precisar fechar o preview antes. */
  onEdit?: () => void;
}

/**
 * Pré-visualiza o dashboard escolhendo o ALVO pelo tipo de filtro:
 *  - cluster → seletor com TODOS os clusters (ativos);
 *  - cliente → seletor com TODOS os clientes;
 *  - nenhum  → sem seletor (todos veem o mesmo).
 * O filtro é resolvido no servidor (RPC preview_dashboard_embed_url, lider+).
 */
export function DashboardPreviewDialog({ target, onOpenChange, onEdit }: DashboardPreviewDialogProps) {
  const open = !!target;
  const filterType = target?.filterType ?? 'nenhum';

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: clusters = [] } = useClusters();
  const { data: clientes = [] } = useClientesList();

  const options = useMemo(() => {
    if (filterType === 'cluster') return clusters.filter((c) => c.ativo).map((c) => ({ value: c.id, label: c.nome }));
    if (filterType === 'cliente') return clientes.map((c) => ({ value: c.id, label: c.nome }));
    return [];
  }, [filterType, clusters, clientes]);

  // reseta ao trocar de dashboard
  useEffect(() => { setSelectedId(null); }, [target?.dashboardId]);
  // auto-seleciona o primeiro item da lista (nunca abre vazio)
  useEffect(() => {
    if (!selectedId && options.length) setSelectedId(options[0].value);
  }, [options, selectedId]);

  const preview = usePreviewDashboardEmbedUrl({
    dashboardId: target?.dashboardId ?? null,
    filterType,
    mode: filterType === 'cluster' ? 'cluster' : filterType === 'cliente' ? 'cliente' : 'nenhum',
    clusterIds: filterType === 'cluster' && selectedId ? [selectedId] : [],
    clienteId: filterType === 'cliente' ? selectedId : null,
  });

  const entidade = filterType === 'cluster' ? 'cluster' : 'cliente';
  const needsTarget = filterType !== 'nenhum' && !selectedId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[92vw] w-[92vw] h-[90vh] flex flex-col gap-3 p-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle className="text-base">Preview — {target?.dashboardName}</DialogTitle>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
                <Pencil className="h-3.5 w-3.5 mr-1" />Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        {filterType !== 'nenhum' ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 inline-flex items-center gap-1">
              Pré-visualizar por {entidade}
              <DicaIcon text={`Escolha um ${entidade} — o filtro é injetado no servidor, exatamente como esse ${entidade} veria.`} />
            </span>
            <SingleSelectCombobox
              options={options}
              value={selectedId}
              onChange={setSelectedId}
              placeholder={`Selecionar ${entidade}…`}
              searchPlaceholder={`Buscar ${entidade}…`}
              emptyText={`Nenhum ${entidade}.`}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-500">Sem filtro — todos com acesso veem o mesmo conteúdo.</p>
        )}

        <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {needsTarget ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-500">Selecione um {entidade} acima para visualizar.</p>
            </div>
          ) : (
            <DashboardIframe
              embed={preview.data}
              isLoading={preview.isLoading}
              title={target?.dashboardName ?? 'Dashboard'}
              fill
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
