import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Trash2, Play, Pause, Code2 } from 'lucide-react';

const areas = [
  { id: 'digital', label: 'Digital' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'operacional', label: 'Operacional' },
  { id: 'comercial', label: 'Comercial' },
];

const DetalheFerramenta = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tool, isLoading } = useQuery({
    queryKey: ['tool', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: toolAccess } = useQuery({
    queryKey: ['tool-access', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tool_area_access')
        .select('*')
        .eq('tool_id', id);
      
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Initialize form when data loads
  useState(() => {
    if (tool) {
      setName(tool.name);
      setDescription(tool.description || '');
      setStatus(tool.status || 'development');
    }
    if (toolAccess) {
      setSelectedAreas(toolAccess.map(ta => ta.area));
    }
  });

  const updateTool = useMutation({
    mutationFn: async () => {
      const { error: toolError } = await supabase
        .from('tools')
        .update({
          name,
          description,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (toolError) throw toolError;

      // Update area access - delete existing and insert new
      await supabase
        .from('tool_area_access')
        .delete()
        .eq('tool_id', id);

      if (selectedAreas.length > 0) {
        const accessEntries = selectedAreas.map(area => ({
          tool_id: id,
          area,
          granted_by: user?.id,
        }));

        const { error: accessError } = await supabase
          .from('tool_area_access')
          .insert(accessEntries);

        if (accessError) throw accessError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['tool', id] });
      queryClient.invalidateQueries({ queryKey: ['tool-access', id] });
      toast({
        title: 'Ferramenta atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteTool = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tools')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      toast({
        title: 'Ferramenta excluída',
        description: 'A ferramenta foi removida com sucesso.',
      });
      navigate('/equipe/dev');
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEdit = () => {
    setName(tool?.name || '');
    setDescription(tool?.description || '');
    setStatus(tool?.status || 'development');
    setSelectedAreas(toolAccess?.map(ta => ta.area) || []);
    setIsEditing(true);
  };

  const toggleArea = (areaId: string) => {
    setSelectedAreas(prev => 
      prev.includes(areaId) 
        ? prev.filter(a => a !== areaId)
        : [...prev, areaId]
    );
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'active': return <Play className="h-4 w-4" />;
      case 'deprecated': return <Pause className="h-4 w-4" />;
      default: return <Code2 className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <DevLayout title="Carregando..." subtitle="">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DevLayout>
    );
  }

  if (!tool) {
    return (
      <DevLayout title="Ferramenta não encontrada" subtitle="">
        <div className="text-center py-12">
          <p className="text-gray-500">Esta ferramenta não existe ou foi removida.</p>
          <Button className="mt-4" onClick={() => navigate('/equipe/dev')}>
            Voltar ao dashboard
          </Button>
        </div>
      </DevLayout>
    );
  }

  return (
    <DevLayout 
      title={tool.name} 
      subtitle="Detalhes da ferramenta"
      headerActions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/equipe/dev')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          {isAdmin && !isEditing && (
            <>
              <Button variant="outline" onClick={handleEdit}>
                Editar
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir esta ferramenta?')) {
                    deleteTool.mutate();
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {isEditing ? 'Editar ferramenta' : 'Informações'}
              {!isEditing && (
                <Badge variant={tool.status === 'active' ? 'default' : 'secondary'}>
                  {getStatusIcon(tool.status || 'development')}
                  <span className="ml-1">
                    {tool.status === 'active' ? 'Ativo' : 
                     tool.status === 'deprecated' ? 'Descontinuado' : 'Em Desenvolvimento'}
                  </span>
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isEditing ? 'Atualize as informações da ferramenta' : 'Dados da ferramenta'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={(e) => { e.preventDefault(); updateTool.mutate(); }} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Em Desenvolvimento</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="deprecated">Descontinuado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Áreas com Acesso</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {areas.map((area) => (
                      <div
                        key={area.id}
                        className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleArea(area.id)}
                      >
                        <Checkbox
                          id={area.id}
                          checked={selectedAreas.includes(area.id)}
                          onCheckedChange={() => toggleArea(area.id)}
                        />
                        <Label htmlFor={area.id} className="cursor-pointer flex-1">
                          {area.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateTool.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {updateTool.isPending ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <Label className="text-gray-500">Descrição</Label>
                  <p className="mt-1">{tool.description || 'Sem descrição'}</p>
                </div>

                <div>
                  <Label className="text-gray-500">Áreas com Acesso</Label>
                  <div className="flex gap-2 mt-2">
                    {toolAccess && toolAccess.length > 0 ? (
                      toolAccess.map((ta) => (
                        <Badge key={ta.id} variant="outline">
                          {areas.find(a => a.id === ta.area)?.label || ta.area}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm">Nenhuma área configurada</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label className="text-gray-500">Criado em</Label>
                    <p className="mt-1">{new Date(tool.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Atualizado em</Label>
                    <p className="mt-1">{new Date(tool.updated_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DevLayout>
  );
};

export default DetalheFerramenta;