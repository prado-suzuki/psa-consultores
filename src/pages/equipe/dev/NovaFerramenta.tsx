import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

const areas = [
  { id: 'digital', label: 'Digital' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'operacional', label: 'Operacional' },
  { id: 'comercial', label: 'Comercial' },
];

const NovaFerramenta = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const createTool = useMutation({
    mutationFn: async () => {
      // Create tool
      const { data: tool, error: toolError } = await supabase
        .from('tools')
        .insert({
          name,
          description,
          status: 'development',
          created_by: user?.id,
        })
        .select()
        .single();

      if (toolError) throw toolError;

      // Create area access if any selected
      if (selectedAreas.length > 0) {
        const accessEntries = selectedAreas.map(area => ({
          tool_id: tool.id,
          area,
          granted_by: user?.id,
        }));

        const { error: accessError } = await supabase
          .from('tool_area_access')
          .insert(accessEntries);

        if (accessError) throw accessError;
      }

      return tool;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      toast({
        title: 'Ferramenta criada',
        description: 'A ferramenta foi criada com sucesso.',
      });
      navigate('/equipe/dev');
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar ferramenta',
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
    createTool.mutate();
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
      title="Nova Ferramenta" 
      subtitle="Crie uma nova ferramenta automatizada"
      headerActions={
        <Button variant="outline" onClick={() => navigate('/equipe/dev')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      }
    >
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informações da Ferramenta</CardTitle>
            <CardDescription>
              Preencha os dados básicos da nova ferramenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Ferramenta *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Automação de Relatórios"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o que a ferramenta faz..."
                  rows={4}
                />
              </div>

              <div className="space-y-3">
                <Label>Áreas com Acesso</Label>
                <p className="text-sm text-gray-500">
                  Selecione as áreas do negócio que terão acesso a esta ferramenta
                </p>
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/equipe/dev')}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createTool.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {createTool.isPending ? 'Salvando...' : 'Criar Ferramenta'}
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