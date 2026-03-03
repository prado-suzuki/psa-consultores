import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';

/* ── Categorias (tax_categorias) ─────────────────────────────── */

function CategoriasTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['tax_categorias'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tax_categorias').select('*').order('nome');
      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error('Nome obrigatório');
      if (editId) {
        const { error } = await supabase.from('tax_categorias').update({ nome: nome.trim() }).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tax_categorias').insert({ nome: nome.trim() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax_categorias'] });
      setOpen(false);
      toast.success(editId ? 'Categoria atualizada' : 'Categoria criada');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tax_categorias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax_categorias'] });
      toast.success('Categoria excluída');
    },
    onError: (e: any) => {
      if (e.code === '23503') toast.error('Não é possível excluir: categoria em uso');
      else toast.error('Erro ao excluir');
    },
  });

  const openCreate = () => { setEditId(null); setNome(''); setOpen(true); };
  const openEdit = (item: { id: string; nome: string }) => { setEditId(item.id); setNome(item.nome); setOpen(true); };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} categorias cadastradas</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>
      <Card className="border-slate-200/60">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nome</TableHead><TableHead className="w-24">Ações</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={2} className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={2} className="text-center py-8 text-slate-400">Nenhuma categoria</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => { if (confirm(`Excluir "${item.nome}"?`)) remove.mutate(item.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Consultoria Tributária" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Produto / Segmento (produto_segmento) ───────────────────── */

interface ProdutoSegmento { id: string; codigo: string; nome: string; is_active: boolean; }

function ProdutoSegmentoTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['produto_segmento'],
    queryFn: async () => {
      const { data, error } = await supabase.from('produto_segmento').select('*').order('codigo');
      if (error) throw error;
      return data as ProdutoSegmento[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!codigo.trim() || !nome.trim()) throw new Error('Código e nome são obrigatórios');
      const payload = { codigo: codigo.trim().toUpperCase(), nome: nome.trim() };
      if (editId) {
        const { error } = await supabase.from('produto_segmento').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('produto_segmento').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produto_segmento'] });
      setOpen(false);
      toast.success(editId ? 'Item atualizado' : 'Item criado');
    },
    onError: (e: any) => {
      if (e.code === '23505') toast.error('Código já existe');
      else toast.error(e.message || 'Erro ao salvar');
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (item: ProdutoSegmento) => {
      const { error } = await supabase.from('produto_segmento').update({ is_active: !item.is_active }).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produto_segmento'] }); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('produto_segmento').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['produto_segmento'] }); toast.success('Item excluído'); },
    onError: () => toast.error('Erro ao excluir'),
  });

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
                <TableCell><Badge variant="outline" className="font-mono">{item.codigo}</Badge></TableCell>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell>
                  <Switch checked={item.is_active} onCheckedChange={() => toggleActive.mutate(item)} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => { if (confirm(`Excluir "${item.codigo}"?`)) remove.mutate(item.id); }}><Trash2 className="h-4 w-4" /></Button>
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
            <div><Label>Código</Label><Input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ex: ASO" maxLength={10} className="font-mono uppercase" /></div>
            <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Auditoria Pessoa Jurídica" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Serviços Prestados (tax_categorias — mesma tabela, interface separada) ── */

function ServicosTab() {
  return <CategoriasTab />;
}

/* ── Container com 3 sub-abas ────────────────────────────────── */

export default function CadastroCategorias() {
  return (
    <Card className="bg-white border-slate-200/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">Cadastro de Categorias</CardTitle>
        <p className="text-sm text-slate-500">Gerencie as categorias, tipos de produto/segmento e serviços prestados disponíveis no sistema.</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categorias">
          <TabsList className="bg-slate-100 border border-slate-200 mb-4">
            <TabsTrigger value="categorias" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Categorias
            </TabsTrigger>
            <TabsTrigger value="produto_segmento" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Produto/Segmento
            </TabsTrigger>
            <TabsTrigger value="servicos" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Serviços Prestados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categorias"><CategoriasTab /></TabsContent>
          <TabsContent value="produto_segmento"><ProdutoSegmentoTab /></TabsContent>
          <TabsContent value="servicos"><ServicosTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
