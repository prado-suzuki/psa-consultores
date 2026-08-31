import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Pencil, Copy, BookOpen, Shield, Users, Building2, Link2, LayoutDashboard, MonitorOff,
} from 'lucide-react';
import { useClusters } from '@/hooks/useClusters';
import { useClientesList } from '@/hooks/useClientesList';
import { useDashboardAccessMaps } from '@/hooks/useDashboardAccess';
import { usePreviewDashboardEmbedUrl } from '@/hooks/usePreviewDashboardEmbedUrl';
import { DASHBOARD_PAGE_PATH } from '@/config/dashboardPages';
import type { Dashboard, DashboardFilterType, MinRole } from '@/hooks/useDashboards';
import { DicaIcon } from '@/components/equipe/mapa/Tooltip';
import { SingleSelectCombobox } from './SingleSelectCombobox';
import { DashboardIframe } from './DashboardIframe';

const FILTER_LABEL: Record<DashboardFilterType, string> = {
  cluster: 'Por cluster', cliente: 'Por cliente', nenhum: 'Sem filtro',
};
const FILTER_BADGE_CLASS: Record<DashboardFilterType, string> = {
  cluster: 'border-primary/15 bg-accent/5 text-teal-700',
  cliente: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  nenhum: 'border-border bg-muted text-muted-foreground',
};
const MIN_ROLE_LABEL: Record<MinRole, string> = {
  team_member: 'Membro ou superior', sublider: 'Sublíder ou superior',
  lider: 'Líder ou superior', admin: 'Admin',
};
const tipoLabel = (ft: DashboardFilterType) => (ft === 'nenhum' ? 'Interno' : 'Externo');
const tipoBadgeClass = (ft: DashboardFilterType) =>
  ft === 'nenhum' ? 'border-border bg-muted text-muted-foreground' : 'border-emerald-200 bg-emerald-50 text-emerald-700';

/** Rótulo de seção do painel lateral. */
const SectionLabel = ({ icon: Icon, children }: { icon: typeof Shield; children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
    <Icon className="h-3.5 w-3.5" /> {children}
  </p>
);

/**
 * Visão completa do dashboard num modal só: painel de detalhes (exibição,
 * acesso, fonte) + PREVIEW ao vivo, com o alvo escolhível por tipo de filtro.
 * Substitui o antigo par detalhe → preview (menos cliques, mais contexto).
 */
interface DashboardOverviewDialogProps {
  dashboard: Dashboard | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (d: Dashboard) => void;
}

export function DashboardOverviewDialog({ dashboard, onOpenChange, onEdit }: DashboardOverviewDialogProps) {
  const filterType = dashboard?.filter_type ?? 'nenhum';
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: clusters = [] } = useClusters();
  const { data: clientes = [] } = useClientesList();
  const { clustersByDashboard, clientesByDashboard } = useDashboardAccessMaps();

  const clusterName = useMemo(() => new Map(clusters.map((c) => [c.id, c.nome])), [clusters]);
  const clienteName = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);

  // opções do "visualizar como" — igual ao preview antigo (todos os clusters ativos / todos os clientes)
  const options = useMemo(() => {
    if (filterType === 'cluster') return clusters.filter((c) => c.ativo).map((c) => ({ value: c.id, label: c.nome }));
    if (filterType === 'cliente') return clientes.map((c) => ({ value: c.id, label: c.nome }));
    return [];
  }, [filterType, clusters, clientes]);

  useEffect(() => { setSelectedId(null); }, [dashboard?.id]);
  useEffect(() => {
    if (!selectedId && options.length) setSelectedId(options[0].value);
  }, [options, selectedId]);

  const preview = usePreviewDashboardEmbedUrl({
    // inativo não tem preview (RPC é fail-closed p/ is_active=false) — nem consulta
    dashboardId: dashboard?.is_active ? dashboard.id : null,
    filterType,
    mode: filterType === 'cluster' ? 'cluster' : filterType === 'cliente' ? 'cliente' : 'nenhum',
    clusterIds: filterType === 'cluster' && selectedId ? [selectedId] : [],
    clienteId: filterType === 'cliente' ? selectedId : null,
  });

  const isCliente = filterType === 'cliente';
  const clienteIds = (dashboard && clientesByDashboard.get(dashboard.id)) || [];
  const clusterIds = (dashboard && clustersByDashboard.get(dashboard.id)) || [];
  const entidade = filterType === 'cluster' ? 'cluster' : 'cliente';
  const needsTarget = filterType !== 'nenhum' && !selectedId;

  const copyUrl = async () => {
    if (!dashboard) return;
    try {
      await navigator.clipboard.writeText(dashboard.embed_url);
      toast.success('URL do embed copiada');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <Dialog open={!!dashboard} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[96vw] w-[96vw] h-[93vh] p-0 gap-0 flex flex-col overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* ── Cabeçalho ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 pr-12 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
              <LayoutDashboard className="h-5 w-5 text-teal-600" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base truncate">{dashboard?.name}</DialogTitle>
              <DialogDescription className="sr-only">Detalhes e preview do dashboard.</DialogDescription>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                {dashboard && (
                  <>
                    <Badge variant="outline" className={`${tipoBadgeClass(dashboard.filter_type)} text-[11px]`}>{tipoLabel(dashboard.filter_type)}</Badge>
                    <Badge variant="outline" className={`${FILTER_BADGE_CLASS[dashboard.filter_type]} text-[11px]`}>{FILTER_LABEL[dashboard.filter_type]}</Badge>
                    {dashboard.grupo && <span className="text-xs text-muted-foreground truncate">· {dashboard.grupo}</span>}
                    {!dashboard.is_active && <Badge className="bg-status-neutro-soft text-status-neutro text-[11px]">Inativo</Badge>}
                  </>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => dashboard && onEdit(dashboard)} className="shrink-0">
            <Pencil className="h-3.5 w-3.5 mr-1" />Editar
          </Button>
        </div>

        {/* ── Corpo: painel de detalhes + preview ───────────────────── */}
        <div className="flex flex-1 min-h-0">
          <aside className="hidden md:flex w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-muted/60 p-4">
            {dashboard && (
              <>
                {/* Exibição */}
                <div className="space-y-2">
                  <SectionLabel icon={LayoutDashboard}>Exibição</SectionLabel>
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Página no app</p>
                    {dashboard.target_page ? (
                      <span className="inline-block rounded bg-card border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground break-all">
                        {DASHBOARD_PAGE_PATH[dashboard.target_page] ?? dashboard.target_page}
                      </span>
                    ) : <p className="text-xs text-muted-foreground">—</p>}
                  </div>
                  {dashboard.sop_url && (
                    <Button asChild variant="outline" size="sm" className="w-full justify-start">
                      <a href={dashboard.sop_url} target="_blank" rel="noreferrer">
                        <BookOpen className="h-3.5 w-3.5 mr-1.5" />Manual / SOP
                      </a>
                    </Button>
                  )}
                </div>

                {/* Acesso */}
                <div className="space-y-2">
                  <SectionLabel icon={Shield}>Acesso</SectionLabel>
                  {isCliente ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" /> Clientes liberados ({clienteIds.length})
                      </p>
                      {clienteIds.length === 0 ? (
                        <p className="text-xs text-amber-600">Nenhum cliente liberado — ninguém vê este dashboard.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {clienteIds.map((id) => (
                            <Badge key={id} variant="outline" className="text-[11px] border-indigo-200 bg-indigo-50 text-indigo-700">
                              {clienteName.get(id) ?? id}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Nível mínimo</p>
                        <Badge variant="outline" className="text-[11px]">{MIN_ROLE_LABEL[dashboard.min_role ?? 'team_member']}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> Clusters
                        </p>
                        {dashboard.all_clusters ? (
                          <Badge variant="outline" className="text-[11px] border-primary/15 bg-accent/5 text-teal-700">Todos os clusters</Badge>
                        ) : clusterIds.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Só Admin (nenhum cluster marcado).</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {clusterIds.map((id) => (
                              <Badge key={id} variant="outline" className="text-[11px] border-primary/15 bg-accent/5 text-teal-700">
                                {clusterName.get(id) ?? id}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Cada usuário vê o próprio cluster · Admin vê todos consolidado.</p>
                    </div>
                  )}
                </div>

                {/* Fonte */}
                <div className="space-y-2">
                  <SectionLabel icon={Link2}>Fonte (Looker)</SectionLabel>
                  <div className="rounded-md border border-border bg-card p-2">
                    <div className="flex items-start gap-1">
                      <p className="flex-1 font-mono text-[11px] leading-relaxed break-all text-muted-foreground">{dashboard.embed_url}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-teal-600" onClick={copyUrl} aria-label="Copiar URL">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {(dashboard.param_names || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dashboard.param_names.map((p) => (
                        <span key={p} className="rounded bg-card border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>

          {/* Preview */}
          <div className="flex-1 min-w-0 flex flex-col p-3 gap-2.5">
            {filterType !== 'nenhum' ? (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                  Visualizar como {entidade}
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
              <p className="text-xs text-muted-foreground shrink-0">Sem filtro — todos com acesso veem o mesmo conteúdo.</p>
            )}

            <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-border bg-card">
              {!dashboard?.is_active ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <MonitorOff className="h-8 w-8" />
                  <p className="text-sm">Dashboard inativo — reative para visualizar.</p>
                </div>
              ) : needsTarget ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-muted-foreground">Selecione um {entidade} acima para visualizar.</p>
                </div>
              ) : (
                <DashboardIframe
                  embed={preview.data}
                  isLoading={preview.isLoading}
                  title={dashboard?.name ?? 'Dashboard'}
                  fill
                  showLoading
                />
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
