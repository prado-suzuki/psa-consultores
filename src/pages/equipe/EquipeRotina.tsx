import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { Plus, Clock, CheckCircle2, AlertCircle, Repeat } from 'lucide-react';

interface Rotina {
  id: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  status: 'pending' | 'done';
}

const EquipeRotina = () => {
  const [rotinas, setRotinas] = useState<Rotina[]>([
    { id: '1', title: 'Revisão de emails', description: 'Verificar e responder emails pendentes', frequency: 'daily', status: 'pending' },
    { id: '2', title: 'Relatório semanal', description: 'Preparar relatório de atividades da semana', frequency: 'weekly', status: 'pending' },
    { id: '3', title: 'Backup de documentos', description: 'Realizar backup dos documentos importantes', frequency: 'monthly', status: 'done' },
  ]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRotina, setNewRotina] = useState<{
    title: string;
    description: string;
    frequency: 'daily' | 'weekly' | 'monthly';
  }>({
    title: '',
    description: '',
    frequency: 'daily'
  });

  const handleCreateRotina = (e: React.FormEvent) => {
    e.preventDefault();
    const rotina: Rotina = {
      id: Date.now().toString(),
      title: newRotina.title,
      description: newRotina.description,
      frequency: newRotina.frequency,
      status: 'pending'
    };
    setRotinas([rotina, ...rotinas]);
    setNewRotina({ title: '', description: '', frequency: 'daily' });
    setIsDialogOpen(false);
  };

  const toggleStatus = (id: string) => {
    setRotinas(rotinas.map(r => 
      r.id === id ? { ...r, status: r.status === 'pending' ? 'done' : 'pending' } : r
    ));
  };

  const getFrequencyBadge = (frequency: string) => {
    const config: Record<string, { label: string; className: string }> = {
      daily: { label: 'Diária', className: 'bg-blue-100 text-blue-700' },
      weekly: { label: 'Semanal', className: 'bg-purple-100 text-purple-700' },
      monthly: { label: 'Mensal', className: 'bg-orange-100 text-orange-700' }
    };
    const { label, className } = config[frequency] || { label: frequency, className: 'bg-gray-100' };
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <EquipeLayout
      title="Rotina"
      subtitle="Demandas operacionais da equipe"
      headerActions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nova Rotina
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Criar Nova Rotina</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRotina} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-700">Título *</Label>
                <Input
                  id="title"
                  value={newRotina.title}
                  onChange={(e) => setNewRotina({ ...newRotina, title: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Ex: Revisão de emails"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700">Descrição</Label>
                <Textarea
                  id="description"
                  value={newRotina.description}
                  onChange={(e) => setNewRotina({ ...newRotina, description: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Descreva a rotina..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Frequência *</Label>
                <Select
                  value={newRotina.frequency}
                  onValueChange={(value) => 
                    setNewRotina({ ...newRotina, frequency: value as 'daily' | 'weekly' | 'monthly' })
                  }
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Criar Rotina
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-4">
        {rotinas.length > 0 ? (
          rotinas.map((rotina) => (
            <Card key={rotina.id} className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={rotina.status === 'done' ? 'text-green-600' : 'text-gray-400'}
                      onClick={() => toggleStatus(rotina.id)}
                    >
                      {rotina.status === 'done' ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <AlertCircle className="h-6 w-6" />
                      )}
                    </Button>
                    <div>
                      <h3 className={`font-medium ${rotina.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {rotina.title}
                      </h3>
                      {rotina.description && (
                        <p className="text-sm text-gray-500">{rotina.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getFrequencyBadge(rotina.frequency)}
                    <Repeat className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-white border-gray-200">
            <CardContent className="py-16 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma rotina criada</h3>
              <p className="text-gray-500 mb-4">Crie rotinas para organizar as demandas operacionais</p>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Rotina
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </EquipeLayout>
  );
};

export default EquipeRotina;