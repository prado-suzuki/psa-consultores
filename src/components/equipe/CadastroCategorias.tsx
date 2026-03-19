import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  useProdutoSegmentoList, useProdutoSegmentoSave, useProdutoSegmentoToggle, useProdutoSegmentoDelete,
  useServicosPrestadosList, useServicosPrestadosSave, useServicosPrestadosDelete,
  useCentroCustoList, useCentroCustoSave, useCentroCustoToggle, useCentroCustoDelete,
  type ProdutoSegmento, type CentroCusto,
} from '@/hooks/useCategorias';
import { useEstruturaClusters } from '@/hooks/useEstruturaManager';
import ProdutoServicoTab from '@/components/equipe/ProdutoServicoTab';

/* ── Produto / Segmento (produto_segmento) ───────────────────── */

function ProdutoSegmentoTab() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ProdutoSegmento | null>(null);

  const { data: items = [], isLoading } = useProdutoSegmentoList();
  const { save } = useProdutoSegmentoSave();
  const toggleActive = useProdutoSegmentoToggle();
  const { remove } = useProdutoSegmentoDelete();

  const handleSave = async () => {
    try {
      await save(editId, codigo, nome);
      setOpen(false);
    } catch {
      // errors handled inside hook
    }
  };

  const executeRemove = async (item: ProdutoSegmento) => {
    await remove(item);
    setDeleteTarget(null);
  };

  const openCreate = () => { setEditId(null); setCodigo(''); setNome(''); setOpen(true); };
  const openEdit = (item: ProdutoSegmento) => { setEditId(item.id); setCodigo(item.codigo); setNome(item.nome); setOpen(true); };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} itens cadastrados</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>
      <Card className="border-slate-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400">Nenhum item</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id}>
                <TableCell><Badge variant="outline" className="font-mono">{item.codigo || '—'}</Badge></TableCell>
                <TableCell className="font-medium">{item.nome || '(sem nome)'}</TableCell>
                <TableCell>
                  <Switch checked={item.is_active} onCheckedChange={() => toggleActive.mutate(item)} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? 'Editar Produto/Segmento' : 'Novo Produto/Segmento'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Código <RequiredMark /></Label><Input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ex: ASO" maxLength={10} className="font-mono uppercase" /></div>
            <div><Label>Nome <RequiredMark /></Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Auditoria Pessoa Jurídica" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Excluir "{deleteTarget?.codigo}"?</AlertDialogDescription>
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

/* ── Serviços Prestados (servicos_prestados + cluster) ── */

function ServicosTab() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [clusterId, setClusterId] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);

  const { data: clusters = [] } = useEstruturaClusters();
  const { data: items = [], isLoading } = useServicosPrestadosList();
  const { save } = useServicosPrestadosSave();
  const { remove } = useServicosPrestadosDelete();

  const handleSave = async () => {
    try {
      await save(editId, nome, clusterId || null);
      setOpen(false);
    } catch {
      // errors handled inside hook
    }
  };

  const executeRemove = async (item: { id: string; nome: string }) => {
    await remove(item);
    setDeleteTarget(null);
  };

  const openCreate = () => { setEditId(null); setNome(''); setClusterId(''); setOpen(true); };
  const openEdit = (item: typeof items[0]) => {
    setEditId(item.id);
    setNome(item.nome);
    setClusterId(item.cluster_id || '');
    setOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} serviços cadastrados</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>
      <Card className="border-slate-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cluster</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-slate-400">Nenhum serviço</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell>
                  {item.estrutura_clusters?.name ? (
                    <Badge variant="secondary">{item.estrutura_clusters.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setDeleteTarget({ id: item.id, nome: item.nome })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome <RequiredMark /></Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Consultoria Tributária" /></div>
            <div>
              <Label>Cluster</Label>
              <Select value={clusterId || "none"} onValueChange={(v) => setClusterId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione um cluster..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clusters.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Excluir "{deleteTarget?.nome}"?</AlertDialogDescription>
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

/* ── Centros de Custo ────────────────────────────────────────── */

function CentroCustoTab() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CentroCusto | null>(null);

  const { data: items = [], isLoading } = useCentroCustoList();
  const { save } = useCentroCustoSave();
  const toggleActive = useCentroCustoToggle();
  const { remove } = useCentroCustoDelete();

  const handleSave = async () => {
    try {
      await save(editId, codigo, nome);
      setOpen(false);
    } catch {
      // errors handled inside hook
    }
  };

  const executeRemove = async (item: CentroCusto) => {
    await remove(item);
    setDeleteTarget(null);
  };

  const openCreate = () => { setEditId(null); setCodigo(''); setNome(''); setOpen(true); };
  const openEdit = (item: CentroCusto) => { setEditId(item.id); setCodigo(item.codigo); setNome(item.nome); setOpen(true); };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} centros de custo cadastrados</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>
      <Card className="border-slate-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400">Nenhum centro de custo</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id}>
                <TableCell><Badge variant="outline" className="font-mono">{item.codigo}</Badge></TableCell>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell>
                  <Switch checked={item.is_active} onCheckedChange={() => toggleActive.mutate(item)} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(item)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Código <RequiredMark /></Label><Input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ex: CC-001" maxLength={20} className="font-mono uppercase" /></div>
            <div><Label>Nome <RequiredMark /></Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Tributário SP" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Excluir "{deleteTarget?.codigo}"?</AlertDialogDescription>
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

/* ── Container com 3 sub-abas ────────────────────────────────── */

export default function CadastroCategorias() {
  return (
    <Card className="bg-white border-slate-200/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">Cadastro de Categorias</CardTitle>
        <p className="text-sm text-slate-500">Gerencie tipos de produto/segmento, serviços prestados, centros de custo e empresas.</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="servicos">
          <TabsList className="bg-slate-100 border border-slate-200 mb-4 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="produto_segmento" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Produto/Segmento
            </TabsTrigger>
            <TabsTrigger value="servicos" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Serviços Prestados
            </TabsTrigger>
            <TabsTrigger value="centros_custo" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Centros de Custo
            </TabsTrigger>
            <TabsTrigger value="produto_servico_vinculo" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Produto × Serviço
            </TabsTrigger>
          </TabsList>

          <TabsContent value="produto_segmento"><ProdutoSegmentoTab /></TabsContent>
          <TabsContent value="servicos"><ServicosTab /></TabsContent>
          <TabsContent value="centros_custo"><CentroCustoTab /></TabsContent>
          <TabsContent value="produto_servico_vinculo"><ProdutoServicoTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
