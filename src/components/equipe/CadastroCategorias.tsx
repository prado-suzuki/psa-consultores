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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

/* ── Centros de Custo ────────────────────────────────────────── */

interface CentroCusto { id: string; codigo: string; nome: string; is_active: boolean; }

function CentroCustoTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['centros_custo'],
    queryFn: async () => {
      const { data, error } = await supabase.from('centros_custo').select('*').order('codigo');
      if (error) throw error;
      return data as CentroCusto[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!codigo.trim() || !nome.trim()) throw new Error('Código e nome são obrigatórios');
      const payload = { codigo: codigo.trim().toUpperCase(), nome: nome.trim() };
      if (editId) {
        const { error } = await supabase.from('centros_custo').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('centros_custo').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['centros_custo'] });
      setOpen(false);
      toast.success(editId ? 'Centro de custo atualizado' : 'Centro de custo criado');
    },
    onError: (e: any) => {
      if (e.code === '23505') toast.error('Código já existe');
      else toast.error(e.message || 'Erro ao salvar');
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (item: CentroCusto) => {
      const { error } = await supabase.from('centros_custo').update({ is_active: !item.is_active }).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['centros_custo'] }); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('centros_custo').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['centros_custo'] }); toast.success('Centro de custo excluído'); },
    onError: (e: any) => {
      if (e.code === '23503') toast.error('Não é possível excluir: centro de custo em uso');
      else toast.error('Erro ao excluir');
    },
  });

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
          <DialogHeader><DialogTitle>{editId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Código</Label><Input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ex: CC-001" maxLength={20} className="font-mono uppercase" /></div>
            <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Tributário SP" /></div>
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

/* ── Empresas / Faturamento ──────────────────────────────────── */

interface EmpresaFat { id: string; nome: string; cnpj: string | null; centro_custo_id: string | null; is_active: boolean; }

function EmpresaFaturamentoTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [ccId, setCcId] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['empresas_faturamento'],
    queryFn: async () => {
      const { data, error } = await supabase.from('empresas_faturamento').select('*').order('nome');
      if (error) throw error;
      return data as EmpresaFat[];
    },
  });

  const { data: centrosCusto = [] } = useQuery({
    queryKey: ['centros_custo'],
    queryFn: async () => {
      const { data, error } = await supabase.from('centros_custo').select('*').eq('is_active', true).order('codigo');
      if (error) throw error;
      return data as CentroCusto[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error('Nome é obrigatório');
      const payload = { nome: nome.trim(), cnpj: cnpj.trim() || null, centro_custo_id: ccId || null };
      if (editId) {
        const { error } = await supabase.from('empresas_faturamento').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('empresas_faturamento').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empresas_faturamento'] });
      setOpen(false);
      toast.success(editId ? 'Empresa atualizada' : 'Empresa criada');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  });

  const toggleActive = useMutation({
    mutationFn: async (item: EmpresaFat) => {
      const { error } = await supabase.from('empresas_faturamento').update({ is_active: !item.is_active }).eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empresas_faturamento'] }); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('empresas_faturamento').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empresas_faturamento'] }); toast.success('Empresa excluída'); },
    onError: (e: any) => {
      if (e.code === '23503') toast.error('Não é possível excluir: empresa em uso');
      else toast.error('Erro ao excluir');
    },
  });

  const openCreate = () => { setEditId(null); setNome(''); setCnpj(''); setCcId(''); setOpen(true); };
  const openEdit = (item: EmpresaFat) => { setEditId(item.id); setNome(item.nome); setCnpj(item.cnpj || ''); setCcId(item.centro_custo_id || ''); setOpen(true); };

  const getCcLabel = (id: string | null) => {
    if (!id) return '—';
    const cc = centrosCusto.find(c => c.id === id);
    return cc ? `${cc.codigo} - ${cc.nome}` : '—';
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} empresas cadastradas</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
      </div>
      <Card className="border-slate-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><RefreshCw className="h-5 w-5 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Nenhuma empresa</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell className="font-mono text-sm">{item.cnpj || '—'}</TableCell>
                <TableCell className="text-sm">{getCcLabel(item.centro_custo_id)}</TableCell>
                <TableCell>
                  <Switch checked={item.is_active} onCheckedChange={() => toggleActive.mutate(item)} />
                </TableCell>
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: PSA Consultores" /></div>
            <div><Label>CNPJ</Label><Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="Ex: 00.000.000/0001-00" /></div>
            <div>
              <Label>Centro de Custo</Label>
              <Select value={ccId} onValueChange={setCcId}>
                <SelectTrigger><SelectValue placeholder="Selecione o centro de custo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {centrosCusto.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.codigo} - {cc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

/* ── Container com 5 sub-abas ────────────────────────────────── */

export default function CadastroCategorias() {
  return (
    <Card className="bg-white border-slate-200/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">Cadastro de Categorias</CardTitle>
        <p className="text-sm text-slate-500">Gerencie categorias, tipos de produto/segmento, serviços prestados, centros de custo e empresas.</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categorias">
          <TabsList className="bg-slate-100 border border-slate-200 mb-4 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="categorias" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Categorias
            </TabsTrigger>
            <TabsTrigger value="produto_segmento" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Produto/Segmento
            </TabsTrigger>
            <TabsTrigger value="servicos" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Serviços Prestados
            </TabsTrigger>
            <TabsTrigger value="centros_custo" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Centros de Custo
            </TabsTrigger>
            <TabsTrigger value="empresas" className="data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-700">
              Empresa / Faturamento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categorias"><CategoriasTab /></TabsContent>
          <TabsContent value="produto_segmento"><ProdutoSegmentoTab /></TabsContent>
          <TabsContent value="servicos"><ServicosTab /></TabsContent>
          <TabsContent value="centros_custo"><CentroCustoTab /></TabsContent>
          <TabsContent value="empresas"><EmpresaFaturamentoTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
