import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { RequiredMark } from '@/components/ui/required-mark';
import {
  useProdutoServicoList, useProdutoServicoSave, useProdutoServicoDelete,
  useProdutoSegmentoList, useServicosPrestadosList,
  type ProdutoServico,
} from '@/hooks/useCategorias';

export default function ProdutoServicoTab() {
  const [open, setOpen] = useState(false);
  const [produtoId, setProdutoId] = useState('');
  const [servicoId, setServicoId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ProdutoServico | null>(null);

  const { data: items = [], isLoading } = useProdutoServicoList();
  const { save } = useProdutoServicoSave();
  const { remove } = useProdutoServicoDelete();
  const { data: produtos = [] } = useProdutoSegmentoList();
  const { data: servicos = [] } = useServicosPrestadosList();

  const produtosAtivos = produtos.filter(p => p.is_active);

  const handleSave = async () => {
    const prod = produtos.find(p => p.id === produtoId);
    const serv = servicos.find(s => s.id === servicoId);
    const entityName = `${prod?.codigo || '?'} → ${serv?.nome || '?'}`;
    try {
      await save(produtoId, servicoId, entityName);
      setOpen(false);
    } catch {
      // errors handled inside hook
    }
  };

  const executeRemove = async (item: ProdutoServico) => {
    await remove(item);
    setDeleteTarget(null);
  };

  const openCreate = () => { setProdutoId(''); setServicoId(''); setOpen(true); };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{items.length} vínculos cadastrados</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>
      <Card className="border-slate-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum vínculo</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.produto_segmento?.codigo || '—'}</TableCell>
                <TableCell>{item.servicos_prestados?.nome || '—'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => setDeleteTarget(item)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Vínculo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Produto <RequiredMark /></Label>
              <Select value={produtoId} onValueChange={setProdutoId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {produtosAtivos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Serviço <RequiredMark /></Label>
              <Select value={servicoId} onValueChange={setServicoId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {servicos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir vínculo "{deleteTarget?.produto_segmento?.codigo} → {deleteTarget?.servicos_prestados?.nome}"?
            </AlertDialogDescription>
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
