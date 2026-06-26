import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, RefreshCw, Eye, LayoutDashboard, Users } from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';
import { DicaIcon, IconTooltip } from '@/components/equipe/mapa/Tooltip';
import {
  useDashboardsList, useDashboardSave, useDashboardToggle, useDashboardDelete,
  type Dashboard, type DashboardFilterType,
} from '@/hooks/useDashboards';
import {
  useAllDashboardAccess, useSetDashboardUsers, type UserOverride,
} from '@/hooks/useUserDashboardAccess';
import { useUsersWithRoles } from '@/hooks/useUsersWithRoles';
import { useUsersWithoutCluster } from '@/hooks/useUsersWithoutCluster';
import { MultiSelectCombobox } from '@/components/dashboards/MultiSelectCombobox';
import { ClusterAccessSelect } from '@/components/dashboards/ClusterAccessSelect';
import { DashboardDetailDialog } from '@/components/dashboards/DashboardDetailDialog';
import { DashboardPreviewDialog, type PreviewTarget } from '@/components/dashboards/DashboardPreviewDialog';
import { DASHBOARD_PAGES, DASHBOARD_PAGE_LABEL } from '@/config/dashboardPages';

const FILTER_LABEL: Record<DashboardFilterType, string> = {
  cluster: 'Por cluster',
  cliente: 'Por cliente',
  nenhum: 'Sem filtro',
};
const FILTER_BADGE_CLASS: Record<DashboardFilterType, string> = {
  cluster: 'border-teal-200 bg-teal-50 text-teal-700',
  cliente: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  nenhum: 'border-slate-200 bg-slate-100 text-slate-500',
};
// "Tipo" é derivado do filtro: nenhum = interno (sem RLS); cluster/cliente = externo.
const tipoLabel = (ft: DashboardFilterType) => (ft === 'nenhum' ? 'Interno' : 'Externo');
const tipoBadgeClass = (ft: DashboardFilterType) =>
  ft === 'nenhum' ? 'border-slate-300 bg-slate-100 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
const FILTER_HELP: Record<DashboardFilterType, string> = {
  cluster: 'Valor resolvido do cluster do viewer (equipe/gestor) ou do cliente.',
  cliente: 'Valor resolvido do id_cliente do viewer. Use p/ relatórios externos (ex.: PERDCOMP).',
  nenhum: 'Dashboard sem RLS — não envia ?params=. ⚠️ Para mostrar tudo, a fonte no Data Studio NÃO pode ter parâmetro de RLS com "Modificar no URL" ativo: desative o "Modificar no URL" desse parâmetro (com ele ativo + padrão vazio, fica fail-closed e o dashboard aparece VAZIO).',
};

const userLabel = (u: { first_name?: string | null; last_name?: string | null; email: string }) =>
  `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email;

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
  const [accessUserIds, setAccessUserIds] = useState<string[]>([]);
  const [overridesByUser, setOverridesByUser] = useState<Record<string, UserOverride>>({});
  const [deleteTarget, setDeleteTarget] = useState<Dashboard | null>(null);
  const [detailTarget, setDetailTarget] = useState<Dashboard | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

  const { data: items = [], isLoading } = useDashboardsList();
  const { data: allAccess = [] } = useAllDashboardAccess();
  const { data: users = [] } = useUsersWithRoles();
  const { save } = useDashboardSave();
  const setUsers = useSetDashboardUsers();
  const toggle = useDashboardToggle();
  const { remove } = useDashboardDelete();

  // sócios entre os usuários selecionados (só relevante p/ filtro por cluster)
  const { data: socioSet } = useUsersWithoutCluster(filterType === 'cluster' ? accessUserIds : []);
  const { data: allClusters = [] } = useQuery({
    queryKey: ['estrutura-clusters-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_clusters').select('id, name').eq('is_active', true).order('name');
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
  });

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const accessRowsByDashboard = useMemo(() => {
    const m = new Map<string, typeof allAccess>();
    for (const a of allAccess) {
      if (!m.has(a.dashboard_id)) m.set(a.dashboard_id, []);
      m.get(a.dashboard_id)!.push(a);
    }
    return m;
  }, [allAccess]);

  const handleSave = async () => {
    try {
      const id = await save(editId, {
        name, embed_url: embedUrl, param_names: paramNames.map((s) => s.trim()).filter(Boolean),
        filter_type: filterType, target_page: targetPage, sop_url: sopUrl,
      });
      await setUsers.mutateAsync({ dashboardId: id, userIds: accessUserIds, overrides: overridesByUser });
      setOpen(false);
    } catch {
      // erros tratados nos hooks
    }
  };

  const openCreate = () => {
    setEditId(null); setName(''); setEmbedUrl(''); setParamNames(['']);
    setFilterType('cluster'); setTargetPage('board_relatorios'); setSopUrl('');
    setAccessUserIds([]); setOverridesByUser({});
    setOpen(true);
  };
  const openEdit = (d: Dashboard) => {
    setEditId(d.id); setName(d.name); setEmbedUrl(d.embed_url);
    setParamNames((d.param_names || []).length ? d.param_names : ['']); setFilterType(d.filter_type);
    setTargetPage(d.target_page || ''); setSopUrl(d.sop_url || '');
    const rows = accessRowsByDashboard.get(d.id) ?? [];
    setAccessUserIds(rows.map((r) => r.user_id));
    setOverridesByUser(Object.fromEntries(
      rows.map((r) => [r.user_id, { all: r.override_all_clusters, ids: r.override_cluster_ids }]),
    ));
    setOpen(true);
  };
  const executeRemove = async (d: Dashboard) => { await remove(d); setDeleteTarget(null); };

  const getOverride = (uid: string): UserOverride => overridesByUser[uid] ?? { all: true, ids: [] };
  const setOverride = (uid: string, o: UserOverride) =>
    setOverridesByUser((prev) => ({ ...prev, [uid]: o }));

  // Tipo (UI) derivado do filtro. Interno = sem filtro (nenhum); Externo = cluster/cliente.
  const tipo: 'interno' | 'externo' = filterType === 'nenhum' ? 'interno' : 'externo';
  const handleTipo = (t: 'interno' | 'externo') => {
    if (t === 'interno') { setFilterType('nenhum'); setParamNames(['']); }
    else if (filterType === 'nenhum') { setFilterType('cluster'); }
  };

  const renderAccessCell = (d: Dashboard) => {
    const ids = (accessRowsByDashboard.get(d.id) ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      return <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Users className="h-3.5 w-3.5" /> ninguém</span>;
    }
    const names = ids.map((id) => { const u = usersById.get(id); return u ? userLabel(u) : null; }).filter(Boolean) as string[];
    const extra = names.length - 2;
    return (
      <div className="flex flex-wrap items-center gap-1">
        {names.slice(0, 2).map((n) => (
          <span key={n} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 max-w-[110px] truncate">{n}</span>
        ))}
        {extra > 0 && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">+{extra}</span>}
      </div>
    );
  };

  const selectedSocios = accessUserIds.filter((id) => socioSet?.has(id));

  return (
    <>
      <div className="flex items-end justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Dashboards</h3>
            <p className="text-sm text-slate-500">{items.length} cadastrados · clique numa linha para detalhes e preview</p>
          </div>
        </div>
        <IconTooltip label="Cadastrar um novo dashboard do Looker">
          <Button size="sm" onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
            <Plus className="h-4 w-4 mr-1" />Adicionar
          </Button>
        </IconTooltip>
      </div>
      <Card className="overflow-hidden border-slate-200/70 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-slate-200/70">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nome</TableHead>
              <TableHead className="w-24 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><span className="inline-flex items-center gap-1">Tipo <DicaIcon text="Externo: filtrado por cluster/cliente. Interno: sem filtro (visão da equipe)." /></span></TableHead>
              <TableHead className="w-32 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><span className="inline-flex items-center gap-1">Filtro <DicaIcon text="Como o RLS é resolvido: por cluster, por cliente, ou sem filtro (interno)." /></span></TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500"><span className="inline-flex items-center gap-1">Parâmetros (dsN) <DicaIcon text="Chaves dsN.param da URL do Looker — uma por fonte do relatório." /></span></TableHead>
              <TableHead className="w-40 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Página</TableHead>
              <TableHead className="w-44 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><span className="inline-flex items-center gap-1">Acesso <DicaIcon text="Usuários que podem ver este dashboard. Edite no lápis ou na aba Usuários." /></span></TableHead>
              <TableHead className="w-20 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><span className="inline-flex items-center gap-1">Ativo <DicaIcon text="Liga/desliga o dashboard sem apagar o cadastro." /></span></TableHead>
              <TableHead className="w-24 text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <LayoutDashboard className="h-8 w-8" />
                  <p className="text-sm">Nenhum dashboard cadastrado ainda.</p>
                  <Button size="sm" variant="outline" onClick={openCreate} className="mt-1"><Plus className="h-4 w-4 mr-1" />Adicionar o primeiro</Button>
                </div>
              </TableCell></TableRow>
            ) : items.map((d) => (
              <TableRow key={d.id} className="cursor-pointer border-slate-100 transition-colors hover:bg-teal-50/40" onClick={() => setDetailTarget(d)}>
                <TableCell className="py-3 font-medium text-slate-800">{d.name}</TableCell>
                <TableCell className="py-3"><Badge variant="outline" className={tipoBadgeClass(d.filter_type)}>{tipoLabel(d.filter_type)}</Badge></TableCell>
                <TableCell className="py-3"><Badge variant="outline" className={FILTER_BADGE_CLASS[d.filter_type]}>{FILTER_LABEL[d.filter_type]}</Badge></TableCell>
                <TableCell className="py-3">
                  <div className="flex flex-wrap gap-1">
                    {(d.param_names || []).length === 0
                      ? <span className="text-slate-300 text-xs">—</span>
                      : d.param_names.map((p) => <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{p}</span>)}
                  </div>
                </TableCell>
                <TableCell className="py-3 text-slate-500 text-sm">{d.target_page ? (DASHBOARD_PAGE_LABEL[d.target_page] ?? d.target_page) : '—'}</TableCell>
                <TableCell className="py-3">{renderAccessCell(d)}</TableCell>
                <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                  <IconTooltip label={d.is_active ? 'Ativo — clique para desativar' : 'Inativo — clique para ativar'}>
                    <span className="inline-flex"><Switch checked={d.is_active} onCheckedChange={() => toggle.mutate(d)} aria-label="Ativar/desativar dashboard" /></span>
                  </IconTooltip>
                </TableCell>
                <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <IconAction label="Editar dashboard e acessos" className="h-8 w-8 text-slate-500 hover:text-teal-600 hover:bg-teal-50" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></IconAction>
                    <IconAction label="Excluir dashboard" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(d)}><Trash2 className="h-4 w-4" /></IconAction>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                <LayoutDashboard className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <DialogTitle>{editId ? 'Editar Dashboard' : 'Novo Dashboard'}</DialogTitle>
                <DialogDescription>Cadastro do dashboard e quem pode vê-lo.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome <RequiredMark /></Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Controle de uso e envio de documentos" /></div>
            <div>
              <Label className="inline-flex items-center gap-1">URL do embed <RequiredMark /> <DicaIcon text="URL /embed/reporting/.../page/... do relatório no Looker Studio." /></Label>
              <Input value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="https://datastudio.google.com/embed/reporting/.../page/..." className="font-mono text-xs" />
            </div>
            <div>
              <Label className="inline-flex items-center gap-1">Tipo <DicaIcon text="Externo: filtrado por cluster/cliente (board / área do cliente). Interno: visão da equipe, sem filtro (sem RLS)." /></Label>
              <Select value={tipo} onValueChange={(v) => handleTipo(v as 'interno' | 'externo')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="externo">Externo (com filtro)</SelectItem>
                  <SelectItem value="interno">Interno (sem filtro)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {tipo === 'externo'
                  ? 'Filtra os dados por cluster ou cliente do usuário.'
                  : 'Sem RLS — mostra tudo. Use p/ visão interna da equipe.'}
              </p>
            </div>

            {tipo === 'externo' && (
              <>
                <div>
                  <Label className="inline-flex items-center gap-1">Filtrar por <DicaIcon text="cluster: por equipe/gestor. cliente: por id_cliente (ex.: PERDCOMP)." /></Label>
                  <Select value={filterType} onValueChange={(v) => setFilterType(v as DashboardFilterType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cluster">Por cluster</SelectItem>
                      <SelectItem value="cliente">Por cliente</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">{FILTER_HELP[filterType]}</p>
                </div>
                <div>
                  <Label className="inline-flex items-center gap-1">Chaves de parâmetro (dsN) <DicaIcon text="A chave dsN.param de cada fonte do relatório (Gerenciar variáveis no Looker). Uma por fonte." /></Label>
                  <div className="space-y-2 mt-1">
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
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setParamNames((prev) => [...prev, ''])}>
                    <Plus className="h-4 w-4 mr-1" />Adicionar chave
                  </Button>
                  <p className="text-xs text-slate-500 mt-1">Uma chave por fonte do relatório (multi-fonte = várias).</p>
                </div>
              </>
            )}
            <div>
              <Label className="inline-flex items-center gap-1">Página (onde aparece) <DicaIcon text="Em qual tela do app este dashboard é listado." /></Label>
              <Select value={targetPage} onValueChange={setTargetPage}>
                <SelectTrigger><SelectValue placeholder="Selecione a página" /></SelectTrigger>
                <SelectContent>
                  {DASHBOARD_PAGES.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">Define em qual tela o dashboard é listado.</p>
            </div>
            <div>
              <Label className="inline-flex items-center gap-1">Manual / SOP (URL) <DicaIcon text="Link do manual do dashboard. Vira um botão 'Manual' ao lado do seletor de relatório. Opcional." /></Label>
              <Input value={sopUrl} onChange={(e) => setSopUrl(e.target.value)} placeholder="https://… (opcional)" className="font-mono text-xs" />
            </div>
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Users className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-medium text-slate-800">Acesso</span>
              </div>
              <Label className="inline-flex items-center gap-1 text-xs text-slate-500">Usuários com acesso <DicaIcon text="Quem pode ver este dashboard. Clique para buscar e adicionar quantos quiser." /></Label>
              <div className="mt-1">
                <MultiSelectCombobox
                  options={users.map((u) => ({ value: u.id, label: userLabel(u) }))}
                  selected={accessUserIds}
                  onChange={setAccessUserIds}
                  placeholder="Adicionar usuários…"
                  searchPlaceholder="Buscar usuário…"
                  emptyText="Nenhum usuário."
                  addLabel="adicionar usuário"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Concede acesso a este dashboard. Clique no campo para adicionar mais usuários.</p>

              {/* Override de cluster — só p/ sócios (usuários sem cluster) em dashboards por cluster */}
              {filterType === 'cluster' && selectedSocios.length > 0 && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/60 p-2.5 space-y-3">
                  <p className="text-[11px] font-medium text-amber-700 inline-flex items-center gap-1">
                    Override de cluster (sócios sem cluster)
                    <DicaIcon text="Sócios não têm cluster derivável. Defina aqui o que cada um enxerga, senão ficam sem dados (fail-closed)." />
                  </p>
                  {selectedSocios.map((uid) => {
                    const u = usersById.get(uid);
                    const ov = getOverride(uid);
                    return (
                      <div key={uid} className="space-y-1.5">
                        <span className="text-xs text-slate-700 truncate block">{u ? userLabel(u) : uid}</span>
                        <ClusterAccessSelect
                          clusters={allClusters}
                          value={ov}
                          onChange={(v) => setOverride(uid, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={setUsers.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Excluir o dashboard "{deleteTarget?.name}"? Os acessos concedidos também deixam de valer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && executeRemove(deleteTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DashboardDetailDialog
        dashboard={detailTarget}
        onOpenChange={(o) => { if (!o) setDetailTarget(null); }}
        onPreview={(d) => {
          setDetailTarget(null);
          setPreviewTarget({ dashboardId: d.id, dashboardName: d.name, filterType: d.filter_type });
        }}
      />

      <DashboardPreviewDialog
        target={previewTarget}
        onOpenChange={(o) => { if (!o) setPreviewTarget(null); }}
      />
    </>
  );
}
