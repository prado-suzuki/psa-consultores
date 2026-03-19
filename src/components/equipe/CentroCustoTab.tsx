import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  useCentroCustoList, useCentroCustoSave, useCentroCustoToggle, useCentroCustoDelete,
  type CentroCusto,
} from '@/hooks/useCategorias';

export default function CentroCustoTab() {
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
