import { useMemo, useState } from 'react';
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
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  useDashboardsList, useDashboardSave, useDashboardToggle, useDashboardDelete,
  type Dashboard, type DashboardFilterType,
} from '@/hooks/useDashboards';
import { useAllDashboardAccess, useSetDashboardUsers } from '@/hooks/useUserDashboardAccess';
import { useUsersWithRoles } from '@/hooks/useUsersWithRoles';
import { MultiSelectCombobox } from '@/components/dashboards/MultiSelectCombobox';
import { DashboardDetailDialog } from '@/components/dashboards/DashboardDetailDialog';
import { DashboardPreviewDialog, type PreviewTarget } from '@/components/dashboards/DashboardPreviewDialog';
import { DASHBOARD_PAGES, DASHBOARD_PAGE_LABEL } from '@/config/dashboardPages';

const FILTER_LABEL: Record<DashboardFilterType, string> = {
  cluster: 'Por cluster',
  cliente: 'Por cliente',
  nenhum: 'Sem filtro',
};
const FILTER_HELP: Record<DashboardFilterType, string> = {
  cluster: 'Valor resolvido do cluster do viewer (equipe/gestor) ou do cliente.',
  cliente: 'Valor resolvido do id_cliente do viewer. Use p/ relatórios externos (ex.: PERDCOMP).',
  nenhum: 'Dashboard sem RLS — sem ?params= (interno/público).',
};

const userLabel = (u: { first_name?: string | null; last_name?: string | null; email: string }) =>
  `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email;

export default function DashboardsTab() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [paramNames, setParamNames] = useState<string[]>(['']);
  const [filterType, setFilterType] = useState<DashboardFilterType>('cluster');
  const [targetPage, setTargetPage] = useState('');
  const [accessUserIds, setAccessUserIds] = useState<string[]>([]);
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

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const accessByDashboard = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of allAccess) {
      if (!m.has(a.dashboard_id)) m.set(a.dashboard_id, []);
      m.get(a.dashboard_id)!.push(a.user_id);
    }
    return m;
  }, [allAccess]);

  const handleSave = async () => {
    try {
      const id = await save(editId, {
        name, embed_url: embedUrl, param_names: paramNames.map((s) => s.trim()).filter(Boolean),
        filter_type: filterType, target_page: targetPage,
      });
      await setUsers.mutateAsync({ dashboardId: id, userIds: accessUserIds });
      setOpen(false);
    } catch {
      // erros tratados nos hooks
    }
  };

  const openCreate = () => {
    setEditId(null); setName(''); setEmbedUrl(''); setParamNames(['']);
    setFilterType('cluster'); setTargetPage('board_relatorios'); setAccessUserIds([]);
    setOpen(true);
  };
  const openEdit = (d: Dashboard) => {
    setEditId(d.id); setName(d.name); setEmbedUrl(d.embed_url);
    setParamNames((d.param_names || []).length ? d.param_names : ['']); setFilterType(d.filter_type);
    setTargetPage(d.target_page || '');
    setAccessUserIds(accessByDashboard.get(d.id) ?? []);
    setOpen(true);
  };
  const executeRemove = async (d: Dashboard) => { await remove(d); setDeleteTarget(null); };

  const renderAccessCell = (d: Dashboard) => {
    const ids = accessByDashboard.get(d.id) ?? [];
    if (ids.length === 0) return <span className="text-slate-400 text-xs">—</span>;
    const names = ids.map((id) => { const u = usersById.get(id); return u ? userLabel(u) : null; }).filter(Boolean) as string[];
    const shown = names.slice(0, 2).join(', ');
    const extra = names.length - 2;
    return (
      <span className="text-xs text-slate-600">
        {shown}{extra > 0 && <span className="text-slate-400"> +{extra}</span>}
      </span>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} dashboards cadastrados · clique numa linha para detalhes</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>
      <Card className="border-slate-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-32">Filtro</TableHead>
              <TableHead>Parâmetros (dsN)</TableHead>
              <TableHead className="w-40">Página</TableHead>
              <TableHead className="w-44">Acesso</TableHead>
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Nenhum dashboard cadastrado</TableCell></TableRow>
            ) : items.map((d) => (
              <TableRow key={d.id} className="cursor-pointer" onClick={() => setDetailTarget(d)}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell><Badge variant="outline">{FILTER_LABEL[d.filter_type]}</Badge></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(d.param_names || []).length === 0
                      ? <span className="text-slate-400 text-xs">—</span>
                      : d.param_names.map((p) => <Badge key={p} variant="secondary" className="font-mono text-[11px]">{p}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="text-slate-500 text-sm">{d.target_page ? (DASHBOARD_PAGE_LABEL[d.target_page] ?? d.target_page) : '—'}</TableCell>
                <TableCell>{renderAccessCell(d)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}><Switch checked={d.is_active} onCheckedChange={() => toggle.mutate(d)} /></TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(d)}><Trash2 className="h-4 w-4" /></Button>
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
            <DialogTitle>{editId ? 'Editar Dashboard' : 'Novo Dashboard'}</DialogTitle>
            <DialogDescription>Cadastro do dashboard e quem pode vê-lo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome <RequiredMark /></Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Controle de uso e envio de documentos" /></div>
            <div><Label>URL do embed <RequiredMark /></Label><Input value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder="https://datastudio.google.com/embed/reporting/.../page/..." className="font-mono text-xs" /></div>
            <div>
              <Label>Tipo de filtro</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as DashboardFilterType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cluster">Por cluster</SelectItem>
                  <SelectItem value="cliente">Por cliente</SelectItem>
                  <SelectItem value="nenhum">Sem filtro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">{FILTER_HELP[filterType]}</p>
            </div>
            <div>
              <Label>Chaves de parâmetro (dsN)</Label>
              <div className="space-y-2 mt-1">
                {paramNames.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={p}
                      onChange={(e) => setParamNames((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                      placeholder="ds0.cluster_id_param"
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-600"
                      onClick={() => setParamNames((prev) => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i)))}
                      aria-label="Remover chave"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setParamNames((prev) => [...prev, ''])}>
                <Plus className="h-4 w-4 mr-1" />Adicionar chave
              </Button>
              <p className="text-xs text-slate-500 mt-1">Uma chave por fonte do relatório (multi-fonte = várias). Só p/ dashboards com filtro.</p>
            </div>
            <div>
              <Label>Página (onde aparece)</Label>
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
              <Label>Usuários com acesso</Label>
              <div className="mt-1">
                <MultiSelectCombobox
                  options={users.map((u) => ({ value: u.id, label: userLabel(u) }))}
                  selected={accessUserIds}
                  onChange={setAccessUserIds}
                  placeholder="Selecionar usuários…"
                  searchPlaceholder="Buscar usuário…"
                  emptyText="Nenhum usuário."
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Concede acesso a este dashboard. O override de cluster do sócio é ajustado na aba Usuários.</p>
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
