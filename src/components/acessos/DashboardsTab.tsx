import { Fragment, useMemo, useState, type ReactNode } from 'react';
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
import { Plus, Pencil, Trash2, RefreshCw, LayoutDashboard, Shield, Users, Building2, ChevronRight, Layers } from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';
import { DicaIcon, IconTooltip } from '@/components/equipe/mapa/Tooltip';
import {
  useDashboardsList, useDashboardSave, useDashboardToggle, useDashboardDelete,
  type Dashboard, type DashboardFilterType, type MinRole,
} from '@/hooks/useDashboards';
import { useDashboardAccessMaps, useSetDashboardAccess } from '@/hooks/useDashboardAccess';
import { useClientesList } from '@/hooks/useClientesList';
import { MultiSelectCombobox } from '@/components/dashboards/MultiSelectCombobox';
import { DashboardDetailDialog } from '@/components/dashboards/DashboardDetailDialog';
import { DashboardPreviewDialog, type PreviewTarget } from '@/components/dashboards/DashboardPreviewDialog';
import { DASHBOARD_PAGES, DASHBOARD_PAGE_PATH } from '@/config/dashboardPages';

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
// Ordenação padrão: sem filtro -> por cluster -> por cliente.
const FILTER_RANK: Record<DashboardFilterType, number> = { nenhum: 0, cluster: 1, cliente: 2 };
// "Tipo" é derivado do filtro: nenhum = interno (sem RLS); cluster/cliente = externo.
const tipoLabel = (ft: DashboardFilterType) => (ft === 'nenhum' ? 'Interno' : 'Externo');
const tipoBadgeClass = (ft: DashboardFilterType) =>
  ft === 'nenhum' ? 'border-slate-300 bg-slate-100 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
const FILTER_HELP: Record<DashboardFilterType, string> = {
  cluster: 'Valor resolvido do cluster do usuário que abre (ou do cliente).',
  cliente: 'Valor resolvido do id_cliente do viewer. Use p/ relatórios externos (ex.: PERDCOMP).',
  nenhum: 'Dashboard sem RLS — não envia ?params=. ⚠️ Para mostrar tudo, a fonte no Data Studio NÃO pode ter parâmetro de RLS com "Modificar no URL" ativo: desative o "Modificar no URL" desse parâmetro (com ele ativo + padrão vazio, fica fail-closed e o dashboard aparece VAZIO).',
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
  const [deleteTarget, setDeleteTarget] = useState<Dashboard | null>(null);
  const [detailTarget, setDetailTarget] = useState<Dashboard | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading } = useDashboardsList();
  const { data: clientes = [] } = useClientesList();
  const { clustersByDashboard, clientesByDashboard } = useDashboardAccessMaps();
  const { save } = useDashboardSave();
  const setAccess = useSetDashboardAccess();
  const toggle = useDashboardToggle();
  const { remove } = useDashboardDelete();

  const { data: allClusters = [] } = useQuery({
    queryKey: ['estrutura-clusters-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estrutura_clusters').select('id, name').eq('is_active', true).order('name');
      if (error) throw error;
      return (data || []) as { id: string; name: string }[];
    },
  });

  const clusterName = useMemo(() => new Map(allClusters.map((c) => [c.id, c.name])), [allClusters]);
  const clienteName = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);

  // Grupos já usados — sugestões p/ o campo "Grupo" do cadastro.
  const existingGroups = useMemo(
    () => Array.from(new Set(items.map((d) => (d.grupo || '').trim()).filter(Boolean))).sort(),
    [items],
  );

  // Blocos de exibição: famílias (mesmo `grupo`) viram acordeão; avulsos = linha solta.
  // Ordenados por tipo de filtro (sem filtro -> cluster -> cliente).
  const blocks = useMemo(() => {
    const sortMembers = (a: Dashboard, b: Dashboard) =>
      FILTER_RANK[a.filter_type] - FILTER_RANK[b.filter_type] || a.name.localeCompare(b.name);
    const byGroup = new Map<string, Dashboard[]>();
    const solo: Dashboard[] = [];
    for (const d of items) {
      const g = (d.grupo || '').trim();
      if (g) { (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(d); }
      else solo.push(d);
    }
    type Block = { key: string; name: string | null; members: Dashboard[]; grouped: boolean };
    const list: Block[] = [];
    for (const [name, members] of byGroup) {
      const sorted = members.sort(sortMembers);
      // grupo com 1 relatório não vira acordeão — mostra como linha solta.
      list.push({ key: `g:${name}`, name, members: sorted, grouped: sorted.length > 1 });
    }
    for (const d of solo) list.push({ key: `s:${d.id}`, name: null, members: [d], grouped: false });
    const rank = (b: Block) => Math.min(...b.members.map((m) => FILTER_RANK[m.filter_type]));
    return list.sort(
      (a, b) => rank(a) - rank(b) ||
        (a.name ?? a.members[0].name).localeCompare(b.name ?? b.members[0].name),
    );
  }, [items]);

  const toggleGroup = (key: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const handleSave = async () => {
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

  // Coluna "Acesso": mostra o portão (clientes específicos, ou nível + clusters/todos).
  const renderAccessCell = (d: Dashboard) => {
    if (d.filter_type === 'cliente') {
      const ids = clientesByDashboard.get(d.id) ?? [];
      if (ids.length === 0) {
        return <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Users className="h-3.5 w-3.5" /> ninguém</span>;
      }
      const names = ids.map((id) => clienteName.get(id)).filter(Boolean) as string[];
      const extra = ids.length - Math.min(names.length, 2);
      return (
        <div className="flex flex-wrap items-center gap-1">
          {names.slice(0, 2).map((n) => (
            <span key={n} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700 max-w-[110px] truncate">{n}</span>
          ))}
          {extra > 0 && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">+{extra}</span>}
        </div>
      );
    }
    // cluster / nenhum -> nível + (todos os clusters | clusters | só admin)
    const ids = clustersByDashboard.get(d.id) ?? [];
    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
          <Shield className="h-3 w-3" />{MIN_ROLE_LABEL[d.min_role ?? 'team_member']}
        </span>
        {d.all_clusters
          ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">Todos os clusters</span>
          : ids.length === 0
            ? <span className="text-xs text-slate-400">só Admin</span>
            : (
              <>
                {ids.slice(0, 2).map((id) => (
                  <span key={id} className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] text-teal-700 max-w-[110px] truncate">{clusterName.get(id) ?? '—'}</span>
                ))}
                {ids.length > 2 && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-700">+{ids.length - 2}</span>}
              </>
            )}
      </div>
    );
  };

  // Uma linha de dashboard (usada solta ou como membro de um grupo).
  const renderRow = (d: Dashboard, indent = false) => (
    <TableRow key={d.id} className="group cursor-pointer border-slate-100 transition-colors hover:bg-teal-50/40" onClick={() => setDetailTarget(d)}>
      <TableCell className={`py-3 font-medium text-slate-800 ${indent ? 'pl-10' : ''}`}>{d.name}</TableCell>
      <TableCell className="py-3"><Badge variant="outline" className={tipoBadgeClass(d.filter_type)}>{tipoLabel(d.filter_type)}</Badge></TableCell>
      <TableCell className="py-3"><Badge variant="outline" className={FILTER_BADGE_CLASS[d.filter_type]}>{FILTER_LABEL[d.filter_type]}</Badge></TableCell>
      <TableCell className="py-3">
        <div className="flex flex-wrap gap-1">
          {(d.param_names || []).length === 0
            ? <span className="text-slate-300 text-xs">—</span>
            : d.param_names.map((p) => <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{p}</span>)}
        </div>
      </TableCell>
      <TableCell className="py-3">
        {d.target_page
          ? <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{DASHBOARD_PAGE_PATH[d.target_page] ?? d.target_page}</span>
          : <span className="text-slate-300 text-xs">—</span>}
      </TableCell>
      <TableCell className="py-3">{renderAccessCell(d)}</TableCell>
      <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
        <IconTooltip label={d.is_active ? 'Ativo — clique para desativar' : 'Inativo — clique para ativar'}>
          <span className="inline-flex"><Switch checked={d.is_active} onCheckedChange={() => toggle.mutate(d)} aria-label="Ativar/desativar dashboard" /></span>
        </IconTooltip>
      </TableCell>
      <TableCell className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
          <IconAction label="Editar dashboard e acessos" className="h-8 w-8 text-slate-500 hover:text-teal-600 hover:bg-teal-50" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></IconAction>
          <IconAction label="Excluir dashboard" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(d)}><Trash2 className="h-4 w-4" /></IconAction>
        </div>
      </TableCell>
    </TableRow>
  );

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
              <TableHead className="w-52 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Página</TableHead>
              <TableHead className="w-52 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><span className="inline-flex items-center gap-1">Acesso <DicaIcon text="Quem pode ver: por cliente (lista) ou por cluster + nível mínimo. Edite no lápis." /></span></TableHead>
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
            ) : blocks.map((block) => {
              if (!block.grouped) return renderRow(block.members[0]);
              const isOpen = expandedGroups.has(block.key);
              const tipos = Array.from(new Set(block.members.map((m) => m.filter_type)))
                .sort((a, b) => FILTER_RANK[a] - FILTER_RANK[b]);
              return (
                <Fragment key={block.key}>
                  <TableRow className="cursor-pointer bg-slate-50/70 hover:bg-slate-100/70 border-slate-200/70" onClick={() => toggleGroup(block.key)}>
                    <TableCell className="py-3 font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-2">
                        <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        <Layers className="h-4 w-4 text-teal-600" />
                        {block.name}
                      </span>
                    </TableCell>
                    <TableCell colSpan={7} className="py-3">
                      <div className="flex flex-wrap items-center gap-2 text-slate-500">
                        <span className="text-xs">{block.members.length} relatórios</span>
                        <span className="flex flex-wrap gap-1">
                          {tipos.map((ft) => (
                            <Badge key={ft} variant="outline" className={tipoBadgeClass(ft)}>{tipoLabel(ft)}</Badge>
                          ))}
                        </span>
                        <span className="text-[11px] text-slate-400">{isOpen ? 'clique para recolher' : 'clique para expandir'}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isOpen && block.members.map((m) => renderRow(m, true))}
                </Fragment>
              );
            })}
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
              <Label className="inline-flex items-center gap-1">Grupo (família do relatório) <DicaIcon text="Junta os relatórios da mesma família (ex.: PERDCOMP, Controle de uso) numa linha expansível na tela de Acessos. Deixe vazio se for avulso." /></Label>
              <Input value={grupo} onChange={(e) => setGrupo(e.target.value)} list="dashboard-grupos" placeholder="Ex: PERDCOMP (opcional)" />
              <datalist id="dashboard-grupos">
                {existingGroups.map((g) => <option key={g} value={g} />)}
              </datalist>
            </div>
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
                  <Label className="inline-flex items-center gap-1">Filtrar por <DicaIcon text="cluster: pelo cluster do usuário que abre. cliente: por id_cliente (ex.: PERDCOMP)." /></Label>
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
              <p className="text-xs text-slate-500 mt-1">Define em qual tela o dashboard é listado.</p>
            </div>
            <div>
              <Label className="inline-flex items-center gap-1">Manual / SOP (URL) <DicaIcon text="Link do manual do dashboard. Vira um botão 'Manual' ao lado do seletor de relatório. Opcional." /></Label>
              <Input value={sopUrl} onChange={(e) => setSopUrl(e.target.value)} placeholder="https://… (opcional)" className="font-mono text-xs" />
            </div>

            {/* ── Acesso ────────────────────────────────────────────────── */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-medium text-slate-800">Acesso</span>
              </div>

              {filterType === 'cliente' ? (
                <>
                  <Label className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Building2 className="h-3.5 w-3.5" /> Clientes com acesso
                    <DicaIcon text="Lista específica de clientes que podem ver este dashboard externo. Cada um enxerga só o próprio id_cliente." />
                  </Label>
                  <div className="mt-1">
                    <MultiSelectCombobox
                      options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
                      selected={allowedClienteIds}
                      onChange={setAllowedClienteIds}
                      placeholder="Adicionar clientes…"
                      searchPlaceholder="Buscar cliente…"
                      emptyText="Nenhum cliente."
                      addLabel="adicionar cliente"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Só os clientes listados terão acesso. Vazio = ninguém.</p>
                </>
              ) : (
                <>
                  <Label className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Shield className="h-3.5 w-3.5" /> Nível mínimo (papel)
                    <DicaIcon text="Nível mínimo na hierarquia interna. 'X ou superior' — quem tiver o papel escolhido ou acima consegue ver." />
                  </Label>
                  <Select value={minRole} onValueChange={(v) => setMinRole(v as MinRole)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MIN_ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Label className="inline-flex items-center gap-1 text-xs text-slate-500 mt-3">
                    <Users className="h-3.5 w-3.5" /> Clusters com acesso
                    <DicaIcon text="Quais clusters podem abrir. Vazio (e 'Todos os clusters' desligado) = só Admin. Use p/ relatórios exclusivos (ex.: PERDCOMP = cluster PSA Consultores)." />
                  </Label>
                  {todosClusters ? (
                    <div className="mt-1 rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-500">
                      Todos os clusters ativos — lista específica desativada.
                    </div>
                  ) : (
                    <div className="mt-1">
                      <MultiSelectCombobox
                        options={allClusters.map((c) => ({ value: c.id, label: c.name }))}
                        selected={allowedClusterIds}
                        onChange={setAllowedClusterIds}
                        placeholder="Adicionar clusters…"
                        searchPlaceholder="Buscar cluster…"
                        emptyText="Nenhum cluster."
                        addLabel="adicionar cluster"
                      />
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2">
                    <Label className="inline-flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                      <Users className="h-3.5 w-3.5" /> Todos os clusters
                      <DicaIcon text="Ligado = qualquer cluster; quem estiver no nível mínimo abre e vê o próprio cluster, sem precisar listar. Desligado = só os clusters marcados acima (ou só Admin, se nenhum)." />
                    </Label>
                    <Switch checked={todosClusters} onCheckedChange={setTodosClusters} aria-label="Todos os clusters" />
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Abre quem tem <strong>{MIN_ROLE_LABEL[minRole]}</strong>{' '}
                    {todosClusters
                      ? <>(<strong>todos os clusters</strong>)</>
                      : allowedClusterIds.length > 0
                        ? <><em>e</em> pertence a um dos clusters marcados</>
                        : <>(<strong>só Admin</strong> — nenhum cluster marcado)</>}. Cada usuário vê o próprio cluster; <strong>Admin vê todos consolidado</strong>.
                  </p>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
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
        onEdit={(d) => {
          setDetailTarget(null);
          openEdit(d);
        }}
      />

      <DashboardPreviewDialog
        target={previewTarget}
        onOpenChange={(o) => { if (!o) setPreviewTarget(null); }}
        onEdit={() => {
          const d = items.find((x) => x.id === previewTarget?.dashboardId);
          setPreviewTarget(null);
          if (d) openEdit(d);
        }}
      />
    </>
  );
}
