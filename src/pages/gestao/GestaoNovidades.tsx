import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GestaoLayout } from '@/components/gestao/GestaoLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Eye, EyeOff, Newspaper, Building2, Scale, Briefcase, Trophy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Novidade {
  id: string;
  categoria: 'empresa' | 'tributario' | 'servicos' | 'cases';
  titulo: string;
  descricao: string;
  data_publicacao: string;
  itens: string[];
  imagem_url: string | null;
  botao_texto: string | null;
  botao_url: string | null;
  ativo: boolean;
  created_at: string;
}

const categoriaConfig = {
  empresa: { label: 'Empresa', icon: Building2, color: 'bg-slate-100 text-slate-800' },
  tributario: { label: 'Sistema Tributário', icon: Scale, color: 'bg-primary/10 text-primary' },
  servicos: { label: 'Serviços', icon: Briefcase, color: 'bg-blue-100 text-blue-800' },
  cases: { label: 'Cases de Sucesso', icon: Trophy, color: 'bg-amber-100 text-amber-800' },
};

type CategoriaType = 'empresa' | 'tributario' | 'servicos' | 'cases';

const emptyNovidade: {
  categoria: CategoriaType;
  titulo: string;
  descricao: string;
  itens: string[];
  imagem_url: string;
  botao_texto: string;
  botao_url: string;
  ativo: boolean;
} = {
  categoria: 'empresa',
  titulo: '',
  descricao: '',
  itens: [],
  imagem_url: '',
  botao_texto: '',
  botao_url: '',
  ativo: true,
};

const GestaoNovidades = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyNovidade);
  const [itemInput, setItemInput] = useState('');

  const { data: novidades, isLoading } = useQuery({
    queryKey: ['gestao-novidades'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('novidades')
        .select('*')
        .order('data_publicacao', { ascending: false });
      
      if (error) throw error;
      return data as Novidade[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('novidades').insert({
        categoria: data.categoria,
        titulo: data.titulo,
        descricao: data.descricao,
        itens: data.itens,
        imagem_url: data.imagem_url || null,
        botao_texto: data.botao_texto || null,
        botao_url: data.botao_url || null,
        ativo: data.ativo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-novidades'] });
      toast({ title: 'Novidade criada com sucesso!' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Erro ao criar novidade', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('novidades').update({
        categoria: data.categoria,
        titulo: data.titulo,
        descricao: data.descricao,
        itens: data.itens,
        imagem_url: data.imagem_url || null,
        botao_texto: data.botao_texto || null,
        botao_url: data.botao_url || null,
        ativo: data.ativo,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-novidades'] });
      toast({ title: 'Novidade atualizada com sucesso!' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar novidade', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('novidades').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-novidades'] });
      toast({ title: 'Novidade excluída com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir novidade', variant: 'destructive' });
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('novidades').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gestao-novidades'] });
      toast({ title: 'Status atualizado!' });
    },
  });

  const resetForm = () => {
    setFormData(emptyNovidade);
    setEditingId(null);
    setDialogOpen(false);
    setItemInput('');
  };

  const handleEdit = (novidade: Novidade) => {
    setFormData({
      categoria: novidade.categoria as 'empresa' | 'tributario' | 'servicos' | 'cases',
      titulo: novidade.titulo,
      descricao: novidade.descricao,
      itens: novidade.itens || [],
      imagem_url: novidade.imagem_url || '',
      botao_texto: novidade.botao_texto || '',
      botao_url: novidade.botao_url || '',
      ativo: novidade.ativo,
    });
    setEditingId(novidade.id);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addItem = () => {
    if (itemInput.trim()) {
      setFormData({ ...formData, itens: [...formData.itens, itemInput.trim()] });
      setItemInput('');
    }
  };

  const removeItem = (index: number) => {
    setFormData({ ...formData, itens: formData.itens.filter((_, i) => i !== index) });
  };

  const stats = {
    total: novidades?.length || 0,
    ativas: novidades?.filter(n => n.ativo).length || 0,
    inativas: novidades?.filter(n => !n.ativo).length || 0,
  };

  return (
    <GestaoLayout 
      title="Gestão de Novidades" 
      subtitle="Gerencie o conteúdo exibido na página de Novidades"
      headerActions={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Novidade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Novidade' : 'Nova Novidade'}</DialogTitle>
              <DialogDescription>
                Preencha os campos abaixo para {editingId ? 'atualizar a' : 'criar uma nova'} novidade.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select 
                    value={formData.categoria} 
                    onValueChange={(v) => setFormData({ ...formData, categoria: v as typeof formData.categoria })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoriaConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex items-end">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                    />
                    <Label>Publicar imediatamente</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Título da novidade"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição detalhada da novidade"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Itens/Tópicos (opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={itemInput}
                    onChange={(e) => setItemInput(e.target.value)}
                    placeholder="Adicionar item"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
                  />
                  <Button type="button" variant="outline" onClick={addItem}>
                    Adicionar
                  </Button>
                </div>
                {formData.itens.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.itens.map((item, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="ml-1 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>URL da Imagem (opcional)</Label>
                <Input
                  value={formData.imagem_url}
                  onChange={(e) => setFormData({ ...formData, imagem_url: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Texto do Botão (opcional)</Label>
                  <Input
                    value={formData.botao_texto}
                    onChange={(e) => setFormData({ ...formData, botao_texto: e.target.value })}
                    placeholder="Saiba mais"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL do Botão</Label>
                  <Input
                    value={formData.botao_url}
                    onChange={(e) => setFormData({ ...formData, botao_url: e.target.value })}
                    placeholder="https://exemplo.com"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total de Novidades</CardDescription>
              <Newspaper className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Publicadas</CardDescription>
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-3xl text-primary">{stats.ativas}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Rascunhos</CardDescription>
              <EyeOff className="h-4 w-4 text-gray-400" />
            </div>
            <CardTitle className="text-3xl text-gray-500">{stats.inativas}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Novidades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Novidades Cadastradas</CardTitle>
          <CardDescription>
            Gerencie o conteúdo exibido na página pública de novidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : novidades && novidades.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {novidades.map((novidade) => {
                  const config = categoriaConfig[novidade.categoria];
                  return (
                    <TableRow key={novidade.id}>
                      <TableCell>
                        <Switch
                          checked={novidade.ativo}
                          onCheckedChange={(checked) => 
                            toggleAtivoMutation.mutate({ id: novidade.id, ativo: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          <config.icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {novidade.titulo}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {format(new Date(novidade.data_publicacao), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(novidade)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Deseja realmente excluir esta novidade?')) {
                                deleteMutation.mutate(novidade.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma novidade cadastrada ainda.</p>
              <p className="text-sm">Clique em "Nova Novidade" para começar.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </GestaoLayout>
  );
};

export default GestaoNovidades;
