import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useDomainNovaFerramenta } from '@/hooks/useDomainNovaFerramenta';
import { useEstruturaAreas, useEstruturaClusters } from '@/hooks/useEstruturaManager';
import { ArrowLeft, Save, Lightbulb } from 'lucide-react';

const NovaFerramenta = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const { data: clusters = [] } = useEstruturaClusters();
  const { data: areas = [], isLoading: isLoadingAreas } = useEstruturaAreas();

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

  const createTool = useDomainNovaFerramenta({
    onSuccess: () => {
      toast({
        title: 'Solicitação enviada',
        description: 'A ideia foi registrada e entra no backlog do Digital Dev.',
      });
      navigate('/equipe/dev');
    },
    onError: (error) => {
      toast({
        title: 'Erro ao enviar solicitação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe o nome da ferramenta.',
        variant: 'destructive',
      });
      return;
    }
    createTool.mutate({ name, description, selectedAreas, userId: user?.id });
  };

  const toggleArea = (areaId: string) => {
    setSelectedAreas(prev => 
      prev.includes(areaId) 
        ? prev.filter(a => a !== areaId)
        : [...prev, areaId]
    );
  };

  return (
    <DevLayout
      title="Solicitar nova ferramenta"
      subtitle="Registre uma ideia para entrar no backlog do Digital Dev"
      headerActions={
        <Button variant="outline" onClick={() => navigate('/equipe/dev')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      }
    >
      <div className="max-w-2xl space-y-4">
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Como funciona</AlertTitle>
          <AlertDescription>
            Você descreve a necessidade e ela entra no catálogo com status "Em desenvolvimento".
            O time Digital Dev avalia e desenvolve a ferramenta; quando estiver pronta, as áreas
            selecionadas abaixo ganham acesso automaticamente.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Informações da ferramenta</CardTitle>
            <CardDescription>
              Preencha os dados básicos da solicitação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da ferramenta *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Automação de Relatórios"
                  required
                />
                <p className="text-sm text-gray-500">
                  Um nome curto que identifique a ferramenta no catálogo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Automatiza o cruzamento entre XML e SPED para conferência de créditos..."
                  rows={4}
                />
                <p className="text-sm text-gray-500">
                  Explique o problema que essa ferramenta resolve e o resultado esperado — isso ajuda o time a priorizar
                </p>
              </div>

              <div className="space-y-3">
                <Label>Áreas que vão usar essa ferramenta</Label>
                <p className="text-sm text-gray-500">
                  Assim que a ferramenta estiver pronta, essas áreas ganham acesso automaticamente
                </p>
                {isLoadingAreas ? (
                  <p className="text-sm text-gray-400">Carregando áreas...</p>
                ) : areasByCluster.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma área cadastrada no momento.</p>
                ) : (
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
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/equipe/dev')}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createTool.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {createTool.isPending ? 'Enviando...' : 'Enviar solicitação'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DevLayout>
  );
};

export default NovaFerramenta;
