import { useMemo, useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Pencil, Trash2, RefreshCw, LayoutDashboard, Shield, Users, Building2,
  Layers, Globe, Lock, AlertTriangle,
} from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';
import { DicaIcon, IconTooltip } from '@/components/equipe/mapa/Tooltip';
import {
  useDashboardsList, useDashboardSave, useDashboardToggle, useDashboardDelete,
  type Dashboard, type DashboardFilterType, type MinRole,
} from '@/hooks/useDashboards';
import { useDashboardAccessMaps, useSetDashboardAccess } from '@/hooks/useDashboardAccess';
import { useClientesList } from '@/hooks/useClientesList';
import { useClusters } from '@/hooks/useClusters';
import { MultiSelectCombobox } from '@/components/dashboards/MultiSelectCombobox';
import { DashboardOverviewDialog } from '@/components/dashboards/DashboardOverviewDialog';
import { DASHBOARD_PAGES, DASHBOARD_PAGE_PATH } from '@/config/dashboardPages';

const FILTER_LABEL: Record<DashboardFilterType, string> = {
  cluster: 'Por cluster',
  cliente: 'Por cliente',
  nenhum: 'Sem filtro',
};
const FILTER_BADGE_CLASS: Record<DashboardFilterType, string> = {
  cluster: 'border-primary/20 bg-primary/5 text-primary',
  cliente: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  nenhum: 'border-slate-200 bg-slate-100 text-slate-500',
};
// Ordenação padrão: sem filtro -> por cluster -> por cliente.
const FILTER_RANK: Record<DashboardFilterType, number> = { nenhum: 0, cluster: 1, cliente: 2 };
//"Tipo" é derivado do filtro: nenhum = interno (sem RLS); cluster/cliente = externo.
const tipoLabel = (ft: DashboardFilterType) => (ft === 'nenhum' ? 'Interno' : 'Externo');
const tipoBadgeClass = (ft: DashboardFilterType) =>
  ft === 'nenhum' ? 'border-slate-300 bg-slate-100 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
const FILTER_HELP: Record<DashboardFilterType, string> = {
  cluster: 'Valor resolvido do cluster do usuário que abre (ou do cliente).',
  cliente: 'Valor resolvido do id_cliente do viewer. Use p/ relatórios externos (ex.: PERDCOMP).',
  nenhum: 'Dashboard sem RLS — não envia ?params=. ⚠️ Para mostrar tudo, a fonte no Data Studio NÃO pode ter parâmetro de RLS com"Modificar no URL" ativo: desative o"Modificar no URL" desse parâmetro (com ele ativo + padrão vazio, fica fail-closed e o dashboard aparece VAZIO).',
};

// Nível mínimo ("X ou superior") — hierarquia do has_role_or_higher.
const MIN_ROLE_OPTIONS: { value: MinRole; label: string }[] = [
  { value: 'team_member', label: 'Membro (equipe) ou superior' },
  { value: 'sublider', label: 'Sublíder ou superior' },
  { value: 'lider', label: 'Líder ou superior' },
  { value: 'admin', label: 'Admin' },
];
const MIN_ROLE_LABEL: Record<MinRole, string> = {
  team_member: 'Membro+', sublider: 'Sublíder+', lider: 'Líder+', admin: 'Admin',
};

// Identidade visual por variante: interno = cadeado (restrito à equipe);
// externo por cluster = globo teal; externo por cliente = prédio indigo.
const VARIANT_STYLE: Record<DashboardFilterType, { icon: typeof Globe; disc: string; iconColor: string }> = {
  nenhum: { icon: Lock, disc: 'bg-slate-100', iconColor: 'text-slate-500' },
  cluster: { icon: Globe, disc: 'bg-primary/10', iconColor: 'text-primary' },
  cliente: { icon: Building2, disc: 'bg-indigo-500/10', iconColor: 'text-indigo-600' },
};

/** Botão de ícone com tooltip (padrão do MAPA). */
const IconAction = ({ label, onClick, className, children }: {
  label: string; onClick: () => void; className?: string; children: ReactNode;
}) => (
  <IconTooltip label={label}>
    <Button variant="ghost" size="icon" className={className} onClick={onClick} aria-label={label}>
      {children}
    </Button>
  </IconTooltip>
);

export default function DashboardsTab() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [paramNames, setParamNames] = useState<string[]>(['']);
  const [filterType, setFilterType] = useState<DashboardFilterType>('cluster');
  const [targetPage, setTargetPage] = useState('');
  const [sopUrl, setSopUrl] = useState('');
  const [grupo, setGrupo] = useState('');
  // Acesso: cluster/nenhum -> min_role + (todos os clusters | clusters); cliente -> clientes.
  const [minRole, setMinRole] = useState<MinRole>('team_member');
  const [todosClusters, setTodosClusters] = useState(false);
  const [allowedClusterIds, setAllowedClusterIds] = useState<string[]>([]);
  const [allowedClienteIds, setAllowedClienteIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Dashboard | null>(null);
  const [overviewTarget, setOverviewTarget] = useState<Dashboard | null>(null);

  const { data: items = [], isLoading } = useDashboardsList();
  const { data: clientes = [] } = useClientesList();
  const { data: clusters = [] } = useClusters();
  const { clustersByDashboard, clientesByDashboard } = useDashboardAccessMaps();
  const { save } = useDashboardSave();
  const setAccess = useSetDashboardAccess();
  const toggle = useDashboardToggle();
  const { remove } = useDashboardDelete();

  const clustersAtivos = useMemo(() => clusters.filter((c) => c.ativo), [clusters]);
  const clusterName = useMemo(() => new Map(clusters.map((c) => [c.id, c.nome])), [clusters]);
  const clienteName = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);

  // Grupos já usados — sugestões p/ o campo"Grupo" do cadastro.
  const existingGroups = useMemo(
    () => Array.from(new Set(items.map((d) => (d.grupo || '').trim()).filter(Boolean))).sort(),
    [items],
  );

  // Famílias: relatórios com o mesmo `grupo` viram um card; sem grupo = card solo.
  // Ordenadas por tipo de filtro (sem filtro -> cluster -> cliente) e nome.
  const families = useMemo(() => {
    const sortMembers = (a: Dashboard, b: Dashboard) =>
      FILTER_RANK[a.filter_type] - FILTER_RANK[b.filter_type] || a.name.localeCompare(b.name);
    const byGroup = new Map<string, Dashboard[]>();
    const solo: Dashboard[] = [];
    for (const d of items) {
      const g = (d.grupo || '').trim();
      if (g) { (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(d); }
      else solo.push(d);
    }
    type Family = { key: string; name: string | null; members: Dashboard[] };
    const list: Family[] = [];
    for (const [gname, members] of byGroup) {
      list.push({ key: `g:${gname}`, name: gname, members: members.sort(sortMembers) });
    }
    for (const d of solo) list.push({ key: `s:${d.id}`, name: null, members: [d] });
    const rank = (f: Family) => Math.min(...f.members.map((m) => FILTER_RANK[m.filter_type]));
    return list.sort(
      (a, b) => rank(a) - rank(b) ||
        (a.name ?? a.members[0].name).localeCompare(b.name ?? b.members[0].name),
    );
  }, [items]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const id = await save(editId, {
        name, embed_url: embedUrl, param_names: paramNames.map((s) => s.trim()).filter(Boolean),
        filter_type: filterType, target_page: targetPage, sop_url: sopUrl, grupo,
        min_role: minRole, all_clusters: todosClusters,
        allowed_cluster_ids: allowedClusterIds, allowed_cliente_ids: allowedClienteIds,
      });
      // as listas de acesso vão para as tabelas de junção
      await setAccess.mutateAsync({
        dashboardId: id, filterType,
        clusterIds: todosClusters ? [] : allowedClusterIds,
        clienteIds: allowedClienteIds,
      });
      setOpen(false);
    } catch {
      // erros tratados nos hooks
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditId(null); setName(''); setEmbedUrl(''); setParamNames(['']);
    setFilterType('cluster'); setTargetPage('board_relatorios'); setSopUrl(''); setGrupo('');
    setMinRole('team_member'); setTodosClusters(false); setAllowedClusterIds([]); setAllowedClienteIds([]);
    setOpen(true);
  };
  const openEdit = (d: Dashboard) => {
    setEditId(d.id); setName(d.name); setEmbedUrl(d.embed_url);
    setParamNames((d.param_names || []).length ? d.param_names : ['']); setFilterType(d.filter_type);
    setTargetPage(d.target_page || ''); setSopUrl(d.sop_url || ''); setGrupo(d.grupo || '');
    setMinRole(d.min_role ?? 'team_member'); setTodosClusters(d.all_clusters);
    setAllowedClusterIds(clustersByDashboard.get(d.id) ?? []);
    setAllowedClienteIds(clientesByDashboard.get(d.id) ?? []);
    setOpen(true);
  };
  const executeRemove = async (d: Dashboard) => { await remove(d); setDeleteTarget(null); };

  // Tipo (UI) derivado do filtro. Interno = sem filtro (nenhum); Externo = cluster/cliente.
  const tipo: 'interno' | 'externo' = filterType === 'nenhum' ? 'interno' : 'externo';
  const handleTipo = (t: 'interno' | 'externo') => {
    if (t === 'interno') { setFilterType('nenhum'); setParamNames(['']); }
    else if (filterType === 'nenhum') { setFilterType('cluster'); }
  };

  // ── Resumo de acesso (pills) de um relatório ─────────────────────────────
  const renderAccess = (d: Dashboard) => {
    if (d.filter_type === 'cliente') {
      const ids = clientesByDashboard.get(d.id) ?? [];
      if (ids.length === 0) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
            <AlertTriangle className="h-3 w-3" /> Sem clientes liberados
          </span>
        );
      }
      const names = ids.map((id) => clienteName.get(id) ?? id);
      return (
        <IconTooltip label={names.join(' · ')}>
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
            <Building2 className="h-3 w-3" /> {ids.length} cliente{ids.length > 1 ? 's' : ''}
          </span>
        </IconTooltip>
      );
    }
    const ids = clustersByDashboard.get(d.id) ?? [];
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          <Shield className="h-3 w-3" />{MIN_ROLE_LABEL[d.min_role ?? 'team_member']}
        </span>
        {d.all_clusters ? (
          <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">Todos os clusters</span>
        ) : ids.length === 0 ? (
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-400">Só Admin</span>
        ) : (
          <>
            <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] text-primary max-w-[130px] truncate">
              {clusterName.get(ids[0]) ?? '—'}
            </span>
            {ids.length > 1 && (
              <IconTooltip label={ids.slice(1).map((id) => clusterName.get(id) ?? id).join(' · ')}>
                <span className="rounded-full border border-primary/20 bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary">+{ids.length - 1}</span>
              </IconTooltip>
            )}
          </>
        )}
      </span>
    );
  };

  // ── Linha de um relatório dentro do card da família ──────────────────────
  const renderReport = (d: Dashboard) => {
    const style = VARIANT_STYLE[d.filter_type];
    const Icon = style.icon;
    // dentro da família o nome costuma repetir o grupo — a identidade é a variante
    const title = d.grupo && d.name.trim() === d.grupo.trim() ? tipoLabel(d.filter_type) : d.name;
    const showTipoBadge = title !== tipoLabel(d.filter_type);
    return (
      <div
        key={d.id}
        role="button"
        tabIndex={0}
        onClick={() => setOverviewTarget(d)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOverviewTarget(d); } }}
        className="group grid cursor-pointer grid-cols-1 items-center gap-2 px-4 py-3 transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-none sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:gap-3"
      >
        {/* identidade */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-9 w-9 rounded-lg ${style.disc} flex items-center justify-center shrink-0`}>
            <Icon className={`h-[18px] w-[18px] ${style.iconColor}`} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-slate-800 truncate">{title}</span>
              {showTipoBadge && (
                <Badge variant="outline" className={`${tipoBadgeClass(d.filter_type)} text-[10px] px-1.5 py-0`}>{tipoLabel(d.filter_type)}</Badge>
              )}
            </div>
            <span className="text-[11px] text-slate-400">{FILTER_LABEL[d.filter_type]}</span>
          </div>
        </div>

        {/* página */}
        <div className="min-w-0">
          {d.target_page ? (
            <span className="inline-block max-w-full truncate rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500">
              {DASHBOARD_PAGE_PATH[d.target_page] ?? d.target_page}
            </span>
          ) : <span className="text-xs text-slate-300">—</span>}
        </div>

        {/* acesso */}
        <div className="min-w-0">{renderAccess(d)}</div>

        {/* controles */}
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
            <IconAction label="Editar dashboard e acessos" className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/5" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></IconAction>
            <IconAction label="Excluir dashboard" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(d)}><Trash2 className="h-4 w-4" /></IconAction>
          </div>
          <IconTooltip label={d.is_active ? 'Ativo — clique para desativar' : 'Inativo — clique para ativar'}>
            <span className="inline-flex"><Switch checked={d.is_active} onCheckedChange={() => toggle.mutate(d)} aria-label="Ativar/desativar dashboard" /></span>
          </IconTooltip>
        </div>
      </div>
    );
  };

  const familiasCount = families.filter((f) => f.name).length;

  return (
    <>
      <div className="flex items-end justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Dashboards</h3>
            <p className="text-sm text-slate-500">
              {items.length} relatório{items.length === 1 ? '' : 's'}
              {familiasCount > 0 && <> em {familiasCount} famíli{familiasCount === 1 ? 'a' : 'as'}</>}
              {' '}· clique num relatório para ver detalhes e preview
            </p>
          </div>
        </div>
        <IconTooltip label="Cadastrar um novo dashboard do Looker">
          <Button size="sm" onClick={openCreate} className="shadow-sm">
            <Plus className="h-4 w-4 mr-1" />Adicionar
          </Button>
        </IconTooltip>
      </div>

      {isLoading ? (
        <Card className="flex items-center justify-center border-slate-200/70 py-16 shadow-sm">
          <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
        </Card>
      ) : items.length === 0 ? (
        <Card className="border-slate-200/70 py-14 shadow-sm">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <LayoutDashboard className="h-8 w-8" />
            <p className="text-sm">Nenhum dashboard cadastrado ainda.</p>
            <Button size="sm" variant="outline" onClick={openCreate} className="mt-1"><Plus className="h-4 w-4 mr-1" />Adicionar o primeiro</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {families.map((f) => (
            <Card key={f.key} className="overflow-hidden border-slate-200/70 shadow-sm">
              {f.name && (
                <div className="flex items-center gap-2 border-b border-slate-200/70 bg-slate-50/80 px-4 py-2.5">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-slate-800">{f.name}</span>
                  <span className="text-xs text-slate-400">· {f.members.length} relatório{f.members.length > 1 ? 's' : ''}</span>
                </div>
              )}
              <div className="divide-y divide-slate-100">
                {f.members.map(renderReport)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal de cadastro/edição ──────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[94vw] max-w-[920px] max-h-[92vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 text-left">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>{editId ? 'Editar Dashboard' : 'Novo Dashboard'}</DialogTitle>
                <DialogDescription>Cadastro do dashboard e quem pode vê-lo.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome <RequiredMark /></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Controle de uso e envio de documentos" />
            </div>
            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-1">Grupo (família) <DicaIcon text="Junta os relatórios da mesma família (ex.: PERDCOMP) num card só na lista. Deixe vazio se for avulso." /></Label>
              <Input value={grupo} onChange={(e) => setGrupo(e.target.value)} list="dashboard-grupos" placeholder="Ex: PERDCOMP (opcional)" />
              <datalist id="dashboard-grupos">
                {existingGroups.map((g) => <option key={g} value={g} />)}
              </datalist>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="inline-flex items-center gap-1">URL do embed <RequiredMark /> <DicaIcon text="URL /embed/reporting/.../page/... do relatório no Looker Studio." /></Label>
              <Input value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="https://datastudio.google.com/embed/reporting/.../page/..." className="font-mono text-xs" />
            </div>

            <div className={`space-y-1.5 ${tipo === 'interno' ? 'sm:col-span-2' : ''}`}>
              <Label className="inline-flex items-center gap-1">Tipo <DicaIcon text="Externo: filtrado por cluster/cliente (board / área do cliente). Interno: visão da equipe, sem filtro (sem RLS)." /></Label>
              <Select value={tipo} onValueChange={(v) => handleTipo(v as 'interno' | 'externo')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="externo">Externo (com filtro)</SelectItem>
                  <SelectItem value="interno">Interno (sem filtro)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {tipo === 'externo' ? 'Filtra os dados por cluster ou cliente do usuário.' : FILTER_HELP.nenhum}
              </p>
            </div>

            {tipo === 'externo' && (
              <div className="space-y-1.5">
                <Label className="inline-flex items-center gap-1">Filtrar por <DicaIcon text="cluster: pelo cluster do usuário que abre. cliente: por id_cliente (ex.: PERDCOMP)." /></Label>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as DashboardFilterType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cluster">Por cluster</SelectItem>
                    <SelectItem value="cliente">Por cliente</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">{FILTER_HELP[filterType]}</p>
              </div>
            )}

            {tipo === 'externo' && (
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="inline-flex items-center gap-1">Chaves de parâmetro (dsN) <DicaIcon text="A chave dsN.param de cada fonte do relatório (Gerenciar variáveis no Looker). Uma por fonte." /></Label>
                <div className="space-y-2">
                  {paramNames.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={p}
                        onChange={(e) => setParamNames((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                        placeholder="ds0.cluster_id_param"
                        className="font-mono text-xs"
                      />
                      <IconAction label="Remover esta chave" className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-600"
                        onClick={() => setParamNames((prev) => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i)))}>
                        <Trash2 className="h-4 w-4" />
                      </IconAction>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setParamNames((prev) => [...prev, ''])}>
                  <Plus className="h-4 w-4 mr-1" />Adicionar chave
                </Button>
                <p className="text-xs text-slate-500">Uma chave por fonte do relatório (multi-fonte = várias).</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-1">Página (onde aparece) <DicaIcon text="Em qual tela do app este dashboard é listado. Mostramos o caminho (rota) da página." /></Label>
              <Select value={targetPage} onValueChange={setTargetPage}>
                <SelectTrigger><SelectValue placeholder="Selecione a página" /></SelectTrigger>
                <SelectContent>
                  {DASHBOARD_PAGES.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      <span className="font-mono text-xs">{p.path}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-1">Manual / SOP (URL) <DicaIcon text="Link do manual do dashboard. Vira um botão 'Manual' ao lado do seletor de relatório. Opcional." /></Label>
              <Input value={sopUrl} onChange={(e) => setSopUrl(e.target.value)} placeholder="https://… (opcional)" className="font-mono text-xs" />
            </div>

            {/* ── Acesso ─────────────────────────────────────────────────── */}
            <div className="sm:col-span-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-slate-800">Acesso</span>
              </div>

              {filterType === 'cliente' ? (
                <div className="space-y-1.5">
                  <Label className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Building2 className="h-3.5 w-3.5" /> Clientes com acesso
                    <DicaIcon text="Lista específica de clientes que podem ver este dashboard externo. Cada um enxerga só o próprio id_cliente." />
                  </Label>
                  <MultiSelectCombobox
                    options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                    selected={allowedClienteIds}
                    onChange={setAllowedClienteIds}
                    placeholder="Adicionar clientes…"
                    searchPlaceholder="Buscar cliente…"
                    emptyText="Nenhum cliente."
                    addLabel="adicionar cliente"
                  />
                  <p className="text-xs text-slate-500">Só os clientes listados terão acesso. Vazio = ninguém.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Shield className="h-3.5 w-3.5" /> Nível mínimo (papel)
                      <DicaIcon text="Nível mínimo na hierarquia interna. 'X ou superior' — quem tiver o papel escolhido ou acima consegue ver." />
                    </Label>
                    <Select value={minRole} onValueChange={(v) => setMinRole(v as MinRole)}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MIN_ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" /> Clusters com acesso
                      <DicaIcon text="Quais clusters podem abrir. Vazio (e 'Todos os clusters' desligado) = só Admin. Use p/ relatórios exclusivos (ex.: PERDCOMP = cluster TAX)." />
                    </Label>
                    {todosClusters ? (
                      <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                        Todos os clusters ativos — lista específica desativada.
                      </div>
                    ) : (
                      <MultiSelectCombobox
                        options={clustersAtivos.map((c) => ({ value: c.id, label: c.nome }))}
                        selected={allowedClusterIds}
                        onChange={setAllowedClusterIds}
                        placeholder="Adicionar clusters…"
                        searchPlaceholder="Buscar cluster…"
                        emptyText="Nenhum cluster."
                        addLabel="adicionar cluster"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                    <Label className="inline-flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                      <Users className="h-3.5 w-3.5" /> Todos os clusters
                      <DicaIcon text="Ligado = qualquer cluster; quem estiver no nível mínimo abre e vê o próprio cluster, sem precisar listar. Desligado = só os clusters marcados acima (ou só Admin, se nenhum)." />
                    </Label>
                    <Switch checked={todosClusters} onCheckedChange={setTodosClusters} aria-label="Todos os clusters" />
                  </div>

                  <p className="text-xs text-slate-500">
                    Abre quem tem <strong>{MIN_ROLE_LABEL[minRole]}</strong>{' '}
                    {todosClusters
                      ? <>(<strong>todos os clusters</strong>)</>
                      : allowedClusterIds.length > 0
                        ? <><em>e</em> pertence a um dos clusters marcados</>
                        : <>(<strong>só Admin</strong> — nenhum cluster marcado)</>}. Cada usuário vê o próprio cluster; <strong>Admin vê todos consolidado</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-slate-200 bg-slate-50/60 px-6 py-3.5">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmação de exclusão ──────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Excluir o dashboard"{deleteTarget?.name}"? Os acessos concedidos também deixam de valer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && executeRemove(deleteTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Detalhe + preview num modal só ───────────────────────────────── */}
      <DashboardOverviewDialog
        dashboard={overviewTarget}
        onOpenChange={(o) => { if (!o) setOverviewTarget(null); }}
        onEdit={(d) => { setOverviewTarget(null); openEdit(d); }}
      />
    </>
  );
}
