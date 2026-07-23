import { useState } from 'react';
import {
  useDomainNovidades,
  type Novidade,
  type NovidadeFormData,
} from '@/hooks/useDomainNovidades';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Eye, EyeOff, Newspaper, Building2, Scale, Briefcase, Trophy, Sparkles, Loader2, ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RequiredMark } from '@/components/ui/required-mark';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const categoriaConfig = {
  empresa: { label: 'Empresa', icon: Building2, color: 'bg-muted text-foreground' },
  tributario: { label: 'Sistema Tributário', icon: Scale, color: 'bg-primary/10 text-primary' },
  servicos: { label: 'Serviços', icon: Briefcase, color: 'bg-info/10 text-info' },
  cases: { label: 'Cases de Sucesso', icon: Trophy, color: 'bg-warning/10 text-warning' },
};

const emptyNovidade: NovidadeFormData = {
  categoria: 'empresa',
  titulo: '',
  descricao: '',
  itens: [] as string[],
  imagem_url: '',
  botao_texto: '',
  botao_url: '',
  ativo: true,
  conteudo_completo: '',
  imagem_lateral_url: '',
  imagem_lateral_posicao: 'direita',
  texto_original: '',
};

const GestaoNovidades = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyNovidade);
  const [itemInput, setItemInput] = useState('');
  const [isRestructuring, setIsRestructuring] = useState(false);

  const resetForm = () => {
    setFormData(emptyNovidade);
    setEditingId(null);
    setDialogOpen(false);
    setItemInput('');
  };

  const {
    novidades,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleAtivoMutation,
    restructureMutation,
  } = useDomainNovidades({ onFormSaved: resetForm });

  const handleEdit = (novidade: Novidade) => {
    setFormData({
      categoria: novidade.categoria,
      titulo: novidade.titulo,
      descricao: novidade.descricao,
      itens: novidade.itens || [],
      imagem_url: novidade.imagem_url || '',
      botao_texto: novidade.botao_texto || '',
      botao_url: novidade.botao_url || '',
      ativo: novidade.ativo,
      conteudo_completo: novidade.conteudo_completo || '',
      imagem_lateral_url: novidade.imagem_lateral_url || '',
      imagem_lateral_posicao: (novidade.imagem_lateral_posicao as 'esquerda' | 'direita') || 'direita',
      texto_original: novidade.texto_original || '',
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

  const handleRestructureWithAI = async () => {
    if (!formData.descricao.trim()) {
      toast({ title: 'Digite uma descrição primeiro', variant: 'destructive' });
      return;
    }

    setIsRestructuring(true);
    
    try {
      // Save original text if not already saved
      const textoOriginal = formData.texto_original || formData.descricao;
      
      const data = await restructureMutation.mutateAsync(formData.descricao);

      if (data?.texto_reestruturado) {
        setFormData({
          ...formData,
          descricao: data.texto_reestruturado,
          texto_original: textoOriginal,
        });
        toast({ title: 'Texto reestruturado com sucesso!' });
      } else {
        throw new Error('Resposta inválida da IA');
      }
    } catch (error: unknown) {
      console.error('Error restructuring text:', error);
      toast({ 
        title: 'Erro ao reestruturar texto', 
        description: error instanceof Error && error.message
          ? error.message
          : 'Tente novamente mais tarde',
        variant: 'destructive' 
      });
    } finally {
      setIsRestructuring(false);
    }
  };

  const restoreOriginalText = () => {
    if (formData.texto_original) {
      setFormData({
        ...formData,
        descricao: formData.texto_original,
        texto_original: '',
      });
      toast({ title: 'Texto original restaurado' });
    }
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Novidade' : 'Nova Novidade'}</DialogTitle>
              <DialogDescription>
                Preencha os campos abaixo para {editingId ? 'atualizar a' : 'criar uma nova'} novidade.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria <RequiredMark /></Label>
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
                <Label>Título <RequiredMark /></Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Título da novidade"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Descrição <RequiredMark /></Label>
                  <div className="flex gap-2">
                    {formData.texto_original && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={restoreOriginalText}
                        className="text-xs"
                      >
                        Restaurar original
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRestructureWithAI}
                      disabled={isRestructuring || !formData.descricao.trim()}
                      className="gap-1"
                    >
                      {isRestructuring ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          Reestruturar com IA
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição detalhada da novidade. Use **texto** para negrito."
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Dica: Use **palavra** para destacar em negrito. A IA pode formatar automaticamente.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Conteúdo Completo (opcional - exibido ao clicar em "Ver mais")</Label>
                <Textarea
                  value={formData.conteudo_completo}
                  onChange={(e) => setFormData({ ...formData, conteudo_completo: e.target.value })}
                  placeholder="Texto adicional que aparece quando o usuário clica em 'Ver mais'"
                  rows={4}
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
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Images section */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="h-4 w-4" />
                  Imagens
                </div>

                <div className="space-y-2">
                  <Label>Imagem Principal (opcional)</Label>
                  <Input
                    value={formData.imagem_url}
                    onChange={(e) => setFormData({ ...formData, imagem_url: e.target.value })}
                    placeholder="https://exemplo.com/imagem.jpg"
                  />
                  {formData.imagem_url && (
                    <div className="mt-2 rounded-lg overflow-hidden border w-full max-w-xs">
                      <img 
                        src={formData.imagem_url} 
                        alt="Preview" 
                        className="w-full aspect-video object-cover"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Imagem Lateral (opcional)</Label>
                    <Input
                      value={formData.imagem_lateral_url}
                      onChange={(e) => setFormData({ ...formData, imagem_lateral_url: e.target.value })}
                      placeholder="https://exemplo.com/imagem-lateral.jpg"
                    />
                    {formData.imagem_lateral_url && (
                      <div className="mt-2 rounded-lg overflow-hidden border w-32">
                        <img 
                          src={formData.imagem_lateral_url} 
                          alt="Preview lateral" 
                          className="w-full aspect-[4/3] object-cover"
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Posição da Imagem Lateral</Label>
                    <Select 
                      value={formData.imagem_lateral_posicao} 
                      onValueChange={(v) => setFormData({ ...formData, imagem_lateral_posicao: v as 'esquerda' | 'direita' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="esquerda">Esquerda</SelectItem>
                        <SelectItem value="direita">Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
              <Newspaper className="h-4 w-4 text-muted-foreground" />
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
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl text-muted-foreground">{stats.inativas}</CardTitle>
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
                      <TableCell className="text-muted-foreground">
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir novidade?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja realmente excluir esta novidade?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate(novidade.id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma novidade cadastrada ainda.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => { resetForm(); setDialogOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira novidade
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </GestaoLayout>
  );
};

export default GestaoNovidades;
