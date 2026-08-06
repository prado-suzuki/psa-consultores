import { Fragment, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  type ProdutoSegmento,
} from '@/hooks/useCategorias';
import { useEstruturaClusters } from '@/hooks/useEstruturaManager';

/** Chave usada para o grupo dos produtos sem cluster vinculado. */
const SEM_CLUSTER = '__sem_cluster__';
const TODOS = '__todos__';

export default function ProdutoSegmentoTab() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [clusterId, setClusterId] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<ProdutoSegmento | null>(null);
  const [filtroCluster, setFiltroCluster] = useState<string>(TODOS);

  const { data: clusters = [] } = useEstruturaClusters();
  const { data: items = [], isLoading } = useProdutoSegmentoList();
  const { save } = useProdutoSegmentoSave();
  const toggleActive = useProdutoSegmentoToggle();
  const { remove } = useProdutoSegmentoDelete();

  // Clusters inativos são legado da fusão com empresas_faturamento: ficam no fim, marcados.
  const clustersAtivos = useMemo(() => clusters.filter(c => c.is_active), [clusters]);
  const clustersInativos = useMemo(() => clusters.filter(c => !c.is_active), [clusters]);
  const clusterInativoPorId = useMemo(
    () => new Set(clustersInativos.map(c => c.id)),
    [clustersInativos],
  );

  // Produtos agrupados por cluster: ativos primeiro, depois inativos, "Sem cluster" por último.
  const grupos = useMemo(() => {
    const porCluster = new Map<string, { key: string; nome: string; inativo: boolean; items: ProdutoSegmento[] }>();
    for (const item of items) {
      const key = item.cluster_id || SEM_CLUSTER;
      if (!porCluster.has(key)) {
        porCluster.set(key, {
          key,
          nome: item.estrutura_clusters?.name || 'Sem cluster',
          inativo: key !== SEM_CLUSTER && clusterInativoPorId.has(key),
          items: [],
        });
      }
      porCluster.get(key)!.items.push(item);
    }
    const ordem = (g: { key: string; inativo: boolean }) => (g.key === SEM_CLUSTER ? 2 : g.inativo ? 1 : 0);
    return [...porCluster.values()].sort((a, b) =>
      ordem(a) - ordem(b) || a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }, [items, clusterInativoPorId]);

  // Se o cluster filtrado deixou de existir (ex.: último produto excluído), volta para "Todos".
  const filtroAtivo = grupos.some(g => g.key === filtroCluster) ? filtroCluster : TODOS;
  const gruposVisiveis = filtroAtivo === TODOS ? grupos : grupos.filter(g => g.key === filtroAtivo);
  const totalVisivel = gruposVisiveis.reduce((soma, g) => soma + g.items.length, 0);

  const handleSave = async () => {
    try {
      await save(editId, codigo, nome, clusterId || null);
      setOpen(false);
    } catch {
      // errors handled inside hook
    }
  };

  const executeRemove = async (item: ProdutoSegmento) => {
    await remove(item);
    setDeleteTarget(null);
  };

  // Ao criar com um cluster selecionado na barra, já vem preenchido.
  const openCreate = () => {
    setEditId(null);
    setCodigo('');
    setNome('');
    setClusterId(filtroAtivo === TODOS || filtroAtivo === SEM_CLUSTER ? '' : filtroAtivo);
    setOpen(true);
  };
  const openEdit = (item: ProdutoSegmento) => { setEditId(item.id); setCodigo(item.codigo); setNome(item.nome); setClusterId(item.cluster_id || ''); setOpen(true); };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">
          {filtroAtivo === TODOS
            ? `${items.length} itens cadastrados`
            : `${totalVisivel} de ${items.length} itens cadastrados`}
        </p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>

      {/* Navegação por cluster */}
      {grupos.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          {[
            { key: TODOS, nome: 'Todos', inativo: false, total: items.length },
            ...grupos.map(g => ({ key: g.key, nome: g.nome, inativo: g.inativo, total: g.items.length })),
          ].map(chip => {
            const ativo = filtroAtivo === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFiltroCluster(chip.key)}
                aria-pressed={ativo}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                  ativo
                    ? 'border-teal-200 bg-teal-500/10 text-teal-700'
                    : chip.inativo
                      ? 'border-slate-200 border-dashed bg-white text-slate-400 hover:bg-slate-50'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {chip.nome}
                {chip.inativo && <span className="text-xs">(inativo)</span>}
                <span className={ativo ? 'text-teal-600/70' : 'text-slate-400'}>{chip.total}</span>
              </button>
            );
          })}
        </div>
      )}

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
            ) : totalVisivel === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400">Nenhum item</TableCell></TableRow>
            ) : gruposVisiveis.map(grupo => (
              <Fragment key={grupo.key}>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="bg-slate-50 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {grupo.nome}
                    {grupo.inativo && (
                      <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">(cluster inativo)</span>
                    )}
                    <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">{grupo.items.length}</span>
                  </TableCell>
                </TableRow>
                {grupo.items.map(item => (
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
              </Fragment>
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
            <div>
              <Label>Cluster</Label>
              <Select value={clusterId || "none"} onValueChange={(v) => setClusterId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione um cluster..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clustersAtivos.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                  {clustersInativos.length > 0 && (
                    <SelectGroup>
                      <SelectSeparator />
                      <SelectLabel className="text-slate-400">Inativos</SelectLabel>
                      {clustersInativos.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-slate-500">{c.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  )}
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
