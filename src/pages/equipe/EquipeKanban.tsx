import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LayoutGrid, List, CalendarIcon, X, Filter, Paperclip, Upload, Trash2, Download, FileText, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  sprint_id: string | null;
  estimated_hours: number | null;
  due_date: string | null;
  start_date: string | null;
  parent_id: string | null;
  task_code: string | null;
}

interface HierarchicalDeliverable extends Deliverable {
  subtasks: Deliverable[];
  subtaskCount: number;
  completedSubtasks: number;
}

interface Sprint {
  id: string;
  name: string;
  project_id: string | null;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Process {
  id: string;
  name: string;
  project_id: string | null;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string | null;
  uploaded_at: string;
}

const columns = [
  { id: 'pending', title: 'A Fazer', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'Em Progresso', color: 'bg-yellow-500' },
  { id: 'completed', title: 'Concluído', color: 'bg-green-500' },
];

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'application/zip',
  'application/x-zip-compressed'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const EquipeKanban = () => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [loading, setLoading] = useState(true);

  // Estado para tarefas expandidas
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Modal de detalhes
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    status: '',
    start_date: '',
    due_date: '',
    estimated_hours: ''
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros
  const [filterSprint, setFilterSprint] = useState<string>('all');
  const [filterResponsible, setFilterResponsible] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();
  const [sortByDueDate, setSortByDueDate] = useState<'asc' | 'desc' | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Buscar cliente "Transversal" do catálogo (área Digital)
      const { data: digitalClients } = await supabase
        .from('catalog_clients')
        .select('id')
        .or('name.ilike.%transversal%,name.ilike.%digital%');

      const digitalClientIds = digitalClients?.map(c => c.id) || [];

      // Fetch projects (filtrados por área Digital)
      let projectsQuery = supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (digitalClientIds.length > 0) {
        projectsQuery = projectsQuery.or(`client_id.in.(${digitalClientIds.join(',')}),client_id.is.null`);
      } else {
        projectsQuery = projectsQuery.is('client_id', null);
      }

      const [sprintsRes, profilesRes, projectsRes, processesRes, deliverablesRes] = await Promise.all([
        supabase.from('sprints').select('id, name, project_id').order('name', { ascending: true }),
        supabase.from('profiles_safe').select('id, first_name, last_name'),
        projectsQuery,
        supabase.from('processes').select('id, name, project_id').order('name'),
        supabase.from('sprint_deliverables').select('id, title, description, status, assigned_to, sprint_id, estimated_hours, due_date, start_date, parent_id, task_code')
      ]);
      
      setSprints(sprintsRes.data || []);
      setProfiles(profilesRes.data || []);
      setProjects(projectsRes.data || []);
      setProcesses(processesRes.data || []);
      setDeliverables(deliverablesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskExpanded = (taskId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Aplica todos os filtros
  const filteredDeliverables = useMemo(() => {
    return deliverables.filter(d => {
      if (filterSprint !== 'all' && d.sprint_id !== filterSprint) return false;
      if (filterResponsible !== 'all' && d.assigned_to !== filterResponsible) return false;

      if (filterProject !== 'all') {
        const sprint = sprints.find(s => s.id === d.sprint_id);
        if (!sprint || sprint.project_id !== filterProject) return false;
      }

      if (filterProcess !== 'all') {
        const process = processes.find(p => p.id === filterProcess);
        if (!process) return false;
        const sprint = sprints.find(s => s.id === d.sprint_id);
        if (!sprint || sprint.project_id !== process.project_id) return false;
      }

      if (filterStartDate && d.start_date) {
        const startDate = new Date(d.start_date + 'T00:00:00');
        if (startDate < filterStartDate) return false;
      }

      if (filterEndDate && d.due_date) {
        const dueDate = new Date(d.due_date + 'T00:00:00');
        if (dueDate > filterEndDate) return false;
      }

      return true;
    });
  }, [deliverables, sprints, processes, filterSprint, filterResponsible, filterProject, filterProcess, filterStartDate, filterEndDate]);

  // Agrupa tarefas com suas subtarefas
  const hierarchicalDeliverables = useMemo(() => {
    // Filtrar apenas tarefas principais (sem parent_id)
    const parentTasks = filteredDeliverables.filter(d => !d.parent_id);
    
    // Agrupar subtarefas por parent_id
    const subtasksByParent: Record<string, Deliverable[]> = {};
    filteredDeliverables.filter(d => d.parent_id).forEach(subtask => {
      if (subtask.parent_id) {
        if (!subtasksByParent[subtask.parent_id]) {
          subtasksByParent[subtask.parent_id] = [];
        }
        subtasksByParent[subtask.parent_id].push(subtask);
      }
    });
    
    // Ordenar subtarefas por task_code
    Object.keys(subtasksByParent).forEach(parentId => {
      subtasksByParent[parentId].sort((a, b) => {
        if (a.task_code && b.task_code) {
          return a.task_code.localeCompare(b.task_code, undefined, { numeric: true });
        }
        return 0;
      });
    });
    
    return parentTasks.map(parent => ({
      ...parent,
      subtasks: subtasksByParent[parent.id] || [],
      subtaskCount: subtasksByParent[parent.id]?.length || 0,
      completedSubtasks: subtasksByParent[parent.id]?.filter(s => s.status === 'completed').length || 0
    })) as HierarchicalDeliverable[];
  }, [filteredDeliverables]);

  // Função para obter deliverables ordenados por coluna (apenas tarefas principais)
  const getColumnDeliverables = (columnId: string) => {
    let items = hierarchicalDeliverables.filter(d => d.status === columnId);
    
    if (sortByDueDate) {
      items = [...items].sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date + 'T00:00:00').getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date + 'T00:00:00').getTime() : Infinity;
        return sortByDueDate === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }
    
    return items;
  };

  const hasActiveFilters = filterSprint !== 'all' || filterResponsible !== 'all' || filterProject !== 'all' || filterProcess !== 'all' || filterStartDate || filterEndDate;

  const clearFilters = () => {
    setFilterSprint('all');
    setFilterResponsible('all');
    setFilterProject('all');
    setFilterProcess('all');
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
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

  const toggleSubtaskComplete = async (subtask: Deliverable, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';
    await updateDeliverableStatus(subtask.id, newStatus);
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

  // Abrir modal de detalhes
  const openDeliverableDetail = async (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
    setEditForm({
      title: deliverable.title,
      description: deliverable.description || '',
      assigned_to: deliverable.assigned_to || '',
      status: deliverable.status,
      start_date: deliverable.start_date || '',
      due_date: deliverable.due_date || '',
      estimated_hours: deliverable.estimated_hours?.toString() || ''
    });

    // Buscar anexos
    const { data: attachmentsData } = await supabase
      .from('deliverable_attachments')
      .select('*')
      .eq('deliverable_id', deliverable.id)
      .order('uploaded_at', { ascending: false });
    
    setAttachments(attachmentsData || []);
  };

  // Salvar alterações
  const saveDeliverable = async () => {
    if (!selectedDeliverable) return;

    try {
      const updateData: Record<string, unknown> = {
        title: editForm.title,
        description: editForm.description || null,
        assigned_to: editForm.assigned_to || null,
        status: editForm.status,
        start_date: editForm.start_date || null,
        due_date: editForm.due_date || null,
        estimated_hours: editForm.estimated_hours ? parseFloat(editForm.estimated_hours) : null
      };

      if (editForm.status === 'completed' && selectedDeliverable.status !== 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (editForm.status !== 'completed') {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('sprint_deliverables')
        .update(updateData)
        .eq('id', selectedDeliverable.id);

      if (error) throw error;

      setDeliverables(deliverables.map(d => 
        d.id === selectedDeliverable.id 
          ? { ...d, ...updateData } as Deliverable
          : d
      ));

      toast.success('Entregável atualizado');
      setSelectedDeliverable(null);
    } catch (error) {
      console.error('Error saving deliverable:', error);
      toast.error('Erro ao salvar');
    }
  };

  // Upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !selectedDeliverable) return;

    const file = files[0];

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use PDF, Word, Excel, imagens ou ZIP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }

    setUploadingFile(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedDeliverable.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('deliverable-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('deliverable_attachments')
        .insert({
          deliverable_id: selectedDeliverable.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: userData.user.id
        });

      if (dbError) throw dbError;

      // Recarregar anexos
      const { data: attachmentsData } = await supabase
        .from('deliverable_attachments')
        .select('*')
        .eq('deliverable_id', selectedDeliverable.id)
        .order('uploaded_at', { ascending: false });

      setAttachments(attachmentsData || []);
      toast.success('Arquivo anexado');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Download de arquivo
  const downloadFile = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('deliverable-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  // Deletar arquivo
  const deleteFile = async (attachment: Attachment) => {
    try {
      await supabase.storage
        .from('deliverable-attachments')
        .remove([attachment.file_path]);

      await supabase
        .from('deliverable_attachments')
        .delete()
        .eq('id', attachment.id);

      setAttachments(attachments.filter(a => a.id !== attachment.id));
      toast.success('Arquivo removido');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Erro ao remover arquivo');
    }
  };

  // Excluir entregável
  const deleteDeliverable = async () => {
    if (!selectedDeliverable) return;

    try {
      setDeleting(true);

      // Primeiro, excluir anexos do storage e da tabela
      const { data: attachmentsToDelete } = await supabase
        .from('deliverable_attachments')
        .select('file_path')
        .eq('deliverable_id', selectedDeliverable.id);

      if (attachmentsToDelete && attachmentsToDelete.length > 0) {
        await supabase.storage
          .from('deliverable-attachments')
          .remove(attachmentsToDelete.map(a => a.file_path));

        await supabase
          .from('deliverable_attachments')
          .delete()
          .eq('deliverable_id', selectedDeliverable.id);
      }

      // Excluir o entregável
      const { error } = await supabase
        .from('sprint_deliverables')
        .delete()
        .eq('id', selectedDeliverable.id);

      if (error) throw error;

      setDeliverables(deliverables.filter(d => d.id !== selectedDeliverable.id));
      setSelectedDeliverable(null);
      setDeleteDialogOpen(false);
      toast.success('Entregável excluído');
    } catch (error) {
      console.error('Error deleting deliverable:', error);
      toast.error('Erro ao excluir entregável');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Obter subtarefas para o modal de detalhes
  const getSubtasksForDeliverable = (deliverableId: string) => {
    return deliverables
      .filter(d => d.parent_id === deliverableId)
      .sort((a, b) => {
        if (a.task_code && b.task_code) {
          return a.task_code.localeCompare(b.task_code, undefined, { numeric: true });
        }
        return 0;
      });
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
        </div>
      }
    >
      {/* Barra de Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-gray-500 hover:text-gray-700 h-7"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterSprint} onValueChange={setFilterSprint}>
            <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-900 h-9">
              <SelectValue placeholder="Sprint" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">Todas Sprints</SelectItem>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterResponsible} onValueChange={setFilterResponsible}>
            <SelectTrigger className="w-44 bg-white border-gray-300 text-gray-900 h-9">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">Todos Responsáveis</SelectItem>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.first_name} {profile.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-44 bg-white border-gray-300 text-gray-900 h-9">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">Todos Projetos</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterProcess} onValueChange={setFilterProcess}>
            <SelectTrigger className="w-44 bg-white border-gray-300 text-gray-900 h-9">
              <SelectValue placeholder="Processo" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">Todos Processos</SelectItem>
              {processes.map((process) => (
                <SelectItem key={process.id} value={process.id}>{process.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 px-3 border-gray-300 bg-white",
                  filterStartDate && "text-gray-900"
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                {filterStartDate ? format(filterStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Data Início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                selected={filterStartDate}
                onSelect={setFilterStartDate}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 px-3 border-gray-300 bg-white",
                  filterEndDate && "text-gray-900"
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                {filterEndDate ? format(filterEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Data Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                selected={filterEndDate}
                onSelect={setFilterEndDate}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          {hierarchicalDeliverables.length} tarefas principais ({filteredDeliverables.length} total incluindo subtarefas)
        </div>
      </div>

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
                <Badge variant="outline" className="border-gray-300 text-gray-600">
                  {getColumnDeliverables(column.id).length}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "ml-auto h-7 w-7 p-0",
                    sortByDueDate && "text-primary"
                  )}
                  onClick={() => {
                    setSortByDueDate(current => 
                      current === null ? 'asc' : current === 'asc' ? 'desc' : null
                    );
                  }}
                  title={
                    sortByDueDate === 'asc' ? 'Ordenado: mais antigo primeiro' :
                    sortByDueDate === 'desc' ? 'Ordenado: mais recente primeiro' :
                    'Ordenar por data de vencimento'
                  }
                >
                  {sortByDueDate === 'asc' ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : sortByDueDate === 'desc' ? (
                    <ArrowDown className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                  )}
                </Button>
              </div>
              
              <div 
                className="space-y-3 min-h-[calc(100vh-420px)]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const deliverableId = e.dataTransfer.getData('deliverableId');
                  updateDeliverableStatus(deliverableId, column.id as 'pending' | 'in_progress' | 'completed');
                }}
              >
                {getColumnDeliverables(column.id).map((deliverable) => (
                  <div key={deliverable.id}>
                    <Card 
                      className="bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('deliverableId', deliverable.id)}
                      onClick={() => openDeliverableDetail(deliverable)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          {deliverable.subtaskCount > 0 && (
                            <button
                              onClick={(e) => toggleTaskExpanded(deliverable.id, e)}
                              className="mt-0.5 p-0.5 hover:bg-gray-100 rounded"
                            >
                              {expandedTasks.has(deliverable.id) ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-gray-900 text-sm font-medium mb-2 line-clamp-2">
                              {deliverable.task_code && (
                                <span className="text-gray-500 font-normal mr-1">{deliverable.task_code}</span>
                              )}
                              {deliverable.title}
                            </h4>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{getProfileName(deliverable.assigned_to)}</span>
                              <span>{formatDueDate(deliverable.due_date)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              {deliverable.estimated_hours && (
                                <span className="text-xs text-gray-400">
                                  {deliverable.estimated_hours}h estimadas
                                </span>
                              )}
                              {deliverable.subtaskCount > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {deliverable.completedSubtasks}/{deliverable.subtaskCount} subtarefas
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Subtarefas expandidas */}
                    {expandedTasks.has(deliverable.id) && deliverable.subtasks.length > 0 && (
                      <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
                        {deliverable.subtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-md bg-white border border-gray-100 text-sm cursor-pointer hover:bg-gray-50",
                              subtask.status === 'completed' && "opacity-60"
                            )}
                            onClick={() => openDeliverableDetail(subtask)}
                          >
                            <Checkbox
                              checked={subtask.status === 'completed'}
                              onCheckedChange={() => {}}
                              onClick={(e) => toggleSubtaskComplete(subtask, e)}
                              className="flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className={cn(
                                "text-gray-700",
                                subtask.status === 'completed' && "line-through"
                              )}>
                                {subtask.task_code && (
                                  <span className="text-gray-400 mr-1">{subtask.task_code}</span>
                                )}
                                {subtask.title}
                              </span>
                            </div>
                            {subtask.estimated_hours && (
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {subtask.estimated_hours}h
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                <TableHead className="text-gray-700 w-8"></TableHead>
                <TableHead className="text-gray-700">Título</TableHead>
                <TableHead className="text-gray-700">Status</TableHead>
                <TableHead className="text-gray-700">Responsável</TableHead>
                <TableHead className="text-gray-700">Data Limite</TableHead>
                <TableHead className="text-gray-700 text-right">Horas Est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hierarchicalDeliverables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Nenhum entregável encontrado
                  </TableCell>
                </TableRow>
              ) : (
                hierarchicalDeliverables.map((deliverable) => (
                  <>
                    <TableRow 
                      key={deliverable.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => openDeliverableDetail(deliverable)}
                    >
                      <TableCell className="w-8">
                        {deliverable.subtaskCount > 0 && (
                          <button
                            onClick={(e) => toggleTaskExpanded(deliverable.id, e)}
                            className="p-0.5 hover:bg-gray-100 rounded"
                          >
                            {expandedTasks.has(deliverable.id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-900 font-medium">
                        <div className="flex items-center gap-2">
                          {deliverable.task_code && (
                            <span className="text-gray-500 font-normal">{deliverable.task_code}</span>
                          )}
                          {deliverable.title}
                          {deliverable.subtaskCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {deliverable.completedSubtasks}/{deliverable.subtaskCount}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
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
                      <TableCell className="text-gray-600 text-right">
                        {deliverable.estimated_hours || '-'}
                      </TableCell>
                    </TableRow>
                    
                    {/* Subtarefas na tabela */}
                    {expandedTasks.has(deliverable.id) && deliverable.subtasks.map((subtask) => (
                      <TableRow 
                        key={subtask.id}
                        className={cn(
                          "cursor-pointer hover:bg-gray-50 bg-gray-50/50",
                          subtask.status === 'completed' && "opacity-60"
                        )}
                        onClick={() => openDeliverableDetail(subtask)}
                      >
                        <TableCell className="w-8 pl-8">
                          <Checkbox
                            checked={subtask.status === 'completed'}
                            onCheckedChange={() => {}}
                            onClick={(e) => toggleSubtaskComplete(subtask, e)}
                          />
                        </TableCell>
                        <TableCell className={cn(
                          "text-gray-700 pl-8",
                          subtask.status === 'completed' && "line-through"
                        )}>
                          <div className="flex items-center gap-2">
                            {subtask.task_code && (
                              <span className="text-gray-400">{subtask.task_code}</span>
                            )}
                            {subtask.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(getStatusBadgeColor(subtask.status), "text-xs")}>
                            {getStatusLabel(subtask.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {getProfileName(subtask.assigned_to)}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {formatDueDate(subtask.due_date)}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm text-right">
                          {subtask.estimated_hours || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedDeliverable} onOpenChange={(open) => !open && setSelectedDeliverable(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {selectedDeliverable?.parent_id ? 'Detalhes da Subtarefa' : 'Detalhes do Entregável'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Código da tarefa */}
            {selectedDeliverable?.task_code && (
              <div className="text-sm text-gray-500">
                Código: <span className="font-mono">{selectedDeliverable.task_code}</span>
              </div>
            )}

            {/* Título */}
            <div className="space-y-2">
              <Label className="text-gray-700">Título</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="bg-white border-gray-300 text-gray-900"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label className="text-gray-700">Descrição</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="bg-white border-gray-300 text-gray-900 min-h-[100px]"
                placeholder="Descreva os detalhes do entregável..."
              />
            </div>

            {/* Row: Responsável e Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Responsável</Label>
                <Select 
                  value={editForm.assigned_to || 'unassigned'} 
                  onValueChange={(value) => setEditForm({ ...editForm, assigned_to: value === 'unassigned' ? '' : value })}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.first_name} {profile.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Status</Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="pending">A Fazer</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row: Datas */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Data Início</Label>
                <Input
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Data Limite</Label>
                <Input
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Horas Estimadas</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editForm.estimated_hours}
                  onChange={(e) => setEditForm({ ...editForm, estimated_hours: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Subtarefas (apenas para tarefas principais) */}
            {selectedDeliverable && !selectedDeliverable.parent_id && (
              (() => {
                const subtasks = getSubtasksForDeliverable(selectedDeliverable.id);
                if (subtasks.length === 0) return null;
                
                return (
                  <div className="space-y-3 border-t border-gray-200 pt-4">
                    <Label className="text-gray-700 flex items-center gap-2">
                      Subtarefas ({subtasks.filter(s => s.status === 'completed').length}/{subtasks.length})
                    </Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-md bg-gray-50 border border-gray-100",
                            subtask.status === 'completed' && "opacity-60"
                          )}
                        >
                          <Checkbox
                            checked={subtask.status === 'completed'}
                            onCheckedChange={async () => {
                              const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';
                              await updateDeliverableStatus(subtask.id, newStatus);
                            }}
                          />
                          <div className="flex-1">
                            <span className={cn(
                              "text-sm text-gray-700",
                              subtask.status === 'completed' && "line-through"
                            )}>
                              {subtask.task_code && (
                                <span className="text-gray-400 mr-1">{subtask.task_code}</span>
                              )}
                              {subtask.title}
                            </span>
                          </div>
                          {subtask.estimated_hours && (
                            <span className="text-xs text-gray-400">{subtask.estimated_hours}h</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Anexos */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-gray-700 flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Anexos
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="border-gray-300"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingFile ? 'Enviando...' : 'Anexar arquivo'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                />
              </div>

              {attachments.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nenhum anexo</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 truncate">{attachment.file_name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(attachment.file_size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(attachment)}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFile(attachment)}
                          className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-gray-900">Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-600">
                    Tem certeza que deseja excluir este entregável? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white border-gray-300 text-gray-700">Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={deleteDeliverable}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedDeliverable(null)} className="border-gray-300">
                Cancelar
              </Button>
              <Button onClick={saveDeliverable} className="bg-primary hover:bg-primary/90">
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EquipeLayout>
  );
};

export default EquipeKanban;
