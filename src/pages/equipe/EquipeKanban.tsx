import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  sprint_id: string | null;
  estimated_hours: number | null;
  due_date: string | null;
}

interface Sprint {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

const columns = [
  { id: 'pending', title: 'A Fazer', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'Em Progresso', color: 'bg-yellow-500' },
  { id: 'completed', title: 'Concluído', color: 'bg-green-500' },
];

const EquipeKanban = () => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedSprint]);

  const fetchData = async () => {
    try {
      const [sprintsRes, profilesRes] = await Promise.all([
        supabase.from('sprints').select('id, name').order('start_date', { ascending: false }),
        supabase.from('profiles').select('id, first_name, last_name')
      ]);
      
      setSprints(sprintsRes.data || []);
      setProfiles(profilesRes.data || []);

      let query = supabase.from('sprint_deliverables').select('*');
      
      if (selectedSprint !== 'all') {
        query = query.eq('sprint_id', selectedSprint);
      }

      const { data: deliverablesData } = await query;
      setDeliverables(deliverablesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDeliverableStatus = async (id: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const updateData: { status: string; completed_at?: string | null } = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      await supabase
        .from('sprint_deliverables')
        .update(updateData)
        .eq('id', id);
      
      setDeliverables(deliverables.map(d => 
        d.id === id ? { ...d, status: newStatus } : d
      ));
    } catch (error) {
      console.error('Error updating deliverable:', error);
    }
  };

  const getProfileName = (profileId: string | null) => {
    if (!profileId) return 'Não atribuído';
    const profile = profiles.find(p => p.id === profileId);
    return profile ? `${profile.first_name} ${profile.last_name}` : 'Desconhecido';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'A Fazer',
      in_progress: 'Em Progresso',
      completed: 'Concluído'
    };
    return labels[status] || status;
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return format(date, 'dd/MM', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <EquipeLayout 
      title="Quadro Kanban" 
      subtitle="Visualize e gerencie os entregáveis das sprints"
      fullWidth={true}
      headerActions={
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-200 rounded-lg p-1 bg-white">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Select value={selectedSprint} onValueChange={setSelectedSprint}>
            <SelectTrigger className="w-48 bg-white border-gray-300 text-gray-900">
              <SelectValue placeholder="Sprint" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">Todas as Sprints</SelectItem>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-3 gap-4 w-full">
          {columns.map((column) => (
            <div key={column.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="text-gray-900 font-semibold text-sm">{column.title}</h3>
                <Badge variant="outline" className="ml-auto border-gray-300 text-gray-600">
                  {deliverables.filter(d => d.status === column.id).length}
                </Badge>
              </div>
              
              <div 
                className="space-y-3 min-h-[calc(100vh-320px)]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const deliverableId = e.dataTransfer.getData('deliverableId');
                  updateDeliverableStatus(deliverableId, column.id as 'pending' | 'in_progress' | 'completed');
                }}
              >
                {deliverables
                  .filter(d => d.status === column.id)
                  .map((deliverable) => (
                    <Card 
                      key={deliverable.id}
                      className="bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('deliverableId', deliverable.id)}
                    >
                      <CardContent className="p-3">
                        <h4 className="text-gray-900 text-sm font-medium mb-2 line-clamp-2">{deliverable.title}</h4>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{getProfileName(deliverable.assigned_to)}</span>
                          <span>{formatDueDate(deliverable.due_date)}</span>
                        </div>
                        {deliverable.estimated_hours && (
                          <div className="mt-2 text-xs text-gray-400">
                            {deliverable.estimated_hours}h estimadas
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="bg-white border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-700">Título</TableHead>
                <TableHead className="text-gray-700">Status</TableHead>
                <TableHead className="text-gray-700">Responsável</TableHead>
                <TableHead className="text-gray-700">Data Limite</TableHead>
                <TableHead className="text-gray-700 text-right">Horas Est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliverables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    Nenhum entregável encontrado
                  </TableCell>
                </TableRow>
              ) : (
                deliverables.map((deliverable) => (
                  <TableRow key={deliverable.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="text-gray-900 font-medium">{deliverable.title}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(deliverable.status)}>
                        {getStatusLabel(deliverable.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {getProfileName(deliverable.assigned_to)}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDueDate(deliverable.due_date)}
                    </TableCell>
                    <TableCell className="text-right text-gray-600">
                      {deliverable.estimated_hours ? `${deliverable.estimated_hours}h` : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </EquipeLayout>
  );
};

export default EquipeKanban;