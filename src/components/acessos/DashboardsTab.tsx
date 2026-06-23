import { useState } from 'react';
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

const parseParams = (t: string) => t.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

export default function DashboardsTab() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [paramsText, setParamsText] = useState('');
  const [filterType, setFilterType] = useState<DashboardFilterType>('cluster');
  const [targetPage, setTargetPage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Dashboard | null>(null);

  const { data: items = [], isLoading } = useDashboardsList();
  const { save } = useDashboardSave();
  const toggle = useDashboardToggle();
  const { remove } = useDashboardDelete();

  const handleSave = async () => {
    try {
      await save(editId, {
        name, embed_url: embedUrl, param_names: parseParams(paramsText),
        filter_type: filterType, target_page: targetPage,
      });
      setOpen(false);
    } catch {
      // erros tratados no hook
    }
  };

  const openCreate = () => {
    setEditId(null); setName(''); setEmbedUrl(''); setParamsText(''); setFilterType('cluster'); setTargetPage('');
    setOpen(true);
  };
  const openEdit = (d: Dashboard) => {
    setEditId(d.id); setName(d.name); setEmbedUrl(d.embed_url);
    setParamsText((d.param_names || []).join(', ')); setFilterType(d.filter_type);
    setTargetPage(d.target_page || ''); setOpen(true);
  };
  const executeRemove = async (d: Dashboard) => { await remove(d); setDeleteTarget(null); };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} dashboards cadastrados</p>
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
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Nenhum dashboard cadastrado</TableCell></TableRow>
            ) : items.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell><Badge variant="outline">{FILTER_LABEL[d.filter_type]}</Badge></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(d.param_names || []).length === 0
                      ? <span className="text-slate-400 text-xs">—</span>
                      : d.param_names.map((p) => <Badge key={p} variant="secondary" className="font-mono text-[11px]">{p}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="text-slate-500 text-sm">{d.target_page || '—'}</TableCell>
                <TableCell><Switch checked={d.is_active} onCheckedChange={() => toggle.mutate(d)} /></TableCell>
                <TableCell>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Dashboard' : 'Novo Dashboard'}</DialogTitle>
            <DialogDescription>Cadastro do dashboard. O acesso (quem vê) é concedido na aba Usuários.</DialogDescription>
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
              <Input value={paramsText} onChange={(e) => setParamsText(e.target.value)} placeholder="ds0.cluster_id_param, ds13.cluster_id_param" className="font-mono text-xs" />
              <p className="text-xs text-slate-500 mt-1">Separe por vírgula. Uma por fonte do relatório (multi-fonte = várias).</p>
            </div>
            <div><Label>Página (onde aparece)</Label><Input value={targetPage} onChange={(e) => setTargetPage(e.target.value)} placeholder="Ex: board/relatorios, cliente/perdcomp" /></div>
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
    </>
  );
}
