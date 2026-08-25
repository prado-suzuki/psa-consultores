import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useDomainDetalheFerramenta } from '@/hooks/useDomainDetalheFerramenta';
import { useEstruturaAreas, useEstruturaClusters } from '@/hooks/useEstruturaManager';
import { ArrowLeft, Save, Trash2, Play, Pause, Code2 } from 'lucide-react';

const DetalheFerramenta = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const { data: clusters = [] } = useEstruturaClusters();
  const { data: areas = [] } = useEstruturaAreas();

  const areaNameById = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);

  // Áreas agrupadas pelo cluster (empresa do grupo) a que pertencem — um
  // cluster pode ter várias áreas cadastradas.
  const areasByCluster = useMemo(() => {
    const clusterNameById = new Map(clusters.map((c) => [c.id, c.name]));
    const groups = new Map<string, typeof areas>();
    areas.forEach((area) => {
      const clusterName = clusterNameById.get(area.cluster_id) ?? 'Outros';
      groups.set(clusterName, [...(groups.get(clusterName) ?? []), area]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [areas, clusters]);

  const { tool, toolAccess, isLoading, updateTool, deleteTool } = useDomainDetalheFerramenta({
    id,
    onUpdateSuccess: () => {
      toast({
        title: 'Ferramenta atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
      setIsEditing(false);
    },
    onUpdateError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
    onDeleteSuccess: () => {
      toast({
        title: 'Ferramenta excluída',
        description: 'A ferramenta foi removida com sucesso.',
      });
      navigate('/equipe/dev');
    },
    onDeleteError: (error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateTool.mutate({
                    name,
                    description,
                    status,
                    selectedAreas,
                    userId: user?.id,
                  });
                }}
                className="space-y-6"
              >
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
                  <Label>Áreas que vão usar essa ferramenta</Label>
                  <div className="space-y-4">
                    {areasByCluster.map(([clusterName, clusterAreas]) => (
                      <div key={clusterName} className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          {clusterName}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {clusterAreas.map((area) => (
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
                                {area.name}
                              </Label>
                            </div>
                          ))}
                        </div>
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
                  <Label className="text-gray-500">Áreas que usam essa ferramenta</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {toolAccess && toolAccess.length > 0 ? (
                      toolAccess.map((ta) => (
                        <Badge key={ta.id} variant="outline">
                          {areaNameById.get(ta.area) || ta.area}
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
