import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EquipeLayout } from "@/components/equipe/EquipeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, X, ChevronDown, ChevronRight, Users, Package, Edit2, Trash2, AlertTriangle, Clock, CalendarClock, Plus, Upload, FileSpreadsheet } from "lucide-react";
import { format, differenceInDays, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDate, isTodayBrazil, isTomorrowBrazil, isPastBrazil, getTodayBrazil } from "@/lib/dateUtils";
import { parseExcelFile, processExcelData, findProfileByName, ImportPreview, TaskGroup } from "@/lib/excelImporter";

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  project_id: string | null;
}

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  start_date: string | null;
  due_date: string;
  status: string;
  estimated_hours: number | null;
  parent_id: string | null;
  task_code: string | null;
  profile?: { first_name: string; last_name: string };
}

interface SprintEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
  participants: string[];
}

interface Metric {
  id: string;
  name: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  category: string | null;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}


export default function EquipeSprintDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [events, setEvents] = useState<SprintEvent[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterResponsible, setFilterResponsible] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all'); // 'all', 'today', 'tomorrow', 'overdue'

  // Modal de edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    start_date: '',
    due_date: '',
    estimated_hours: '',
    status: 'pending'
  });
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modal de criação
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    start_date: '',
    due_date: '',
    estimated_hours: '',
    parent_id: ''
  });
  const [creating, setCreating] = useState(false);

  // Modal de importação Excel
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [responsibleMapping, setResponsibleMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Métricas expandidas
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());

  // Tarefas expandidas (para hierarquia)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());


  useEffect(() => {
    if (id) {
      fetchSprintData();
    }
  }, [id]);

  const fetchSprintData = async () => {
    try {
      setLoading(true);
      
      const { data: sprintData, error: sprintError } = await supabase
        .from("sprints")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (sprintError) throw sprintError;
      if (!sprintData) {
        toast({ title: "Sprint não encontrada", variant: "destructive" });
        navigate("/equipe/sprints");
        return;
      }
      setSprint(sprintData);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, first_name, last_name");
      setProfiles(profilesData || []);

      const { data: deliverablesData } = await supabase
        .from("sprint_deliverables")
        .select("*")
        .eq("sprint_id", id)
        .order("due_date", { ascending: true });
      setDeliverables(deliverablesData || []);

      const { data: eventsData } = await supabase
        .from("sprint_events")
        .select("*")
        .eq("sprint_id", id)
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true });
      setEvents(eventsData || []);

      const { data: metricsData } = await supabase
        .from("sprint_metrics")
        .select("*")
        .eq("sprint_id", id);
      setMetrics(metricsData || []);

      
    } catch (error: any) {
      console.error("Error fetching sprint data:", error);
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateDeliverableStatus = async (deliverableId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from("sprint_deliverables")
        .update(updates)
        .eq("id", deliverableId);

      if (error) throw error;
      
      setDeliverables(prev => 
        prev.map(d => d.id === deliverableId ? { ...d, ...updates } : d)
      );

      toast({ title: "Status atualizado" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const openEditModal = (deliverable: Deliverable) => {
    setEditingDeliverable(deliverable);
    setEditForm({
      title: deliverable.title,
      description: deliverable.description || '',
      assigned_to: deliverable.assigned_to || '',
      start_date: deliverable.start_date || sprint?.start_date || '',
      due_date: deliverable.due_date,
      estimated_hours: deliverable.estimated_hours?.toString() || '',
      status: deliverable.status || 'pending'
    });
    setEditModalOpen(true);
  };

  const saveDeliverable = async () => {
    if (!editingDeliverable) return;
    
    try {
      setSaving(true);
      
      const updates = {
        title: editForm.title,
        description: editForm.description || null,
        assigned_to: editForm.assigned_to || null,
        start_date: editForm.start_date || null,
        due_date: editForm.due_date,
        estimated_hours: editForm.estimated_hours ? parseFloat(editForm.estimated_hours) : null,
        status: editForm.status,
        completed_at: editForm.status === 'completed' ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from("sprint_deliverables")
        .update(updates)
        .eq("id", editingDeliverable.id);

      if (error) throw error;
      
      setDeliverables(prev => 
        prev.map(d => d.id === editingDeliverable.id ? { ...d, ...updates } : d)
      );

      setEditModalOpen(false);
      setEditingDeliverable(null);
      toast({ title: "Entregável atualizado" });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteDeliverable = async () => {
    if (!editingDeliverable) return;

    try {
      setDeleting(true);

      // Primeiro, excluir anexos do storage e da tabela
      const { data: attachmentsToDelete } = await supabase
        .from('deliverable_attachments')
        .select('file_path')
        .eq('deliverable_id', editingDeliverable.id);

      if (attachmentsToDelete && attachmentsToDelete.length > 0) {
        await supabase.storage
          .from('deliverable-attachments')
          .remove(attachmentsToDelete.map(a => a.file_path));

        await supabase
          .from('deliverable_attachments')
          .delete()
          .eq('deliverable_id', editingDeliverable.id);
      }

      // Excluir o entregável
      const { error } = await supabase
        .from('sprint_deliverables')
        .delete()
        .eq('id', editingDeliverable.id);

      if (error) throw error;

      setDeliverables(prev => prev.filter(d => d.id !== editingDeliverable.id));
      setEditModalOpen(false);
      setEditingDeliverable(null);
      setDeleteDialogOpen(false);
      toast({ title: "Entregável excluído" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const updateMetric = async (metricId: string, newValue: number) => {
    try {
      const { error } = await supabase
        .from("sprint_metrics")
        .update({ current_value: newValue })
        .eq("id", metricId);

      if (error) throw error;
      
      setMetrics(prev => 
        prev.map(m => m.id === metricId ? { ...m, current_value: newValue } : m)
      );
      toast({ title: "Métrica atualizada" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  // Criar nova tarefa
  const createDeliverable = async () => {
    if (!sprint) return;

    try {
      setCreating(true);

      const newDeliverable = {
        sprint_id: sprint.id,
        title: createForm.title,
        description: createForm.description || null,
        assigned_to: createForm.assigned_to || null,
        start_date: createForm.start_date || sprint.start_date,
        due_date: createForm.due_date || sprint.end_date,
        estimated_hours: createForm.estimated_hours ? parseFloat(createForm.estimated_hours) : null,
        status: 'pending',
        parent_id: createForm.parent_id || null
      };

      const { data, error } = await supabase
        .from("sprint_deliverables")
        .insert(newDeliverable)
        .select()
        .single();

      if (error) throw error;

      setDeliverables(prev => [...prev, data]);
      setCreateModalOpen(false);
      setCreateForm({
        title: '',
        description: '',
        assigned_to: '',
        start_date: '',
        due_date: '',
        estimated_hours: '',
        parent_id: ''
      });
      toast({ title: "Tarefa criada com sucesso" });
    } catch (error: any) {
      toast({ title: "Erro ao criar tarefa", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // Processar arquivo Excel
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    try {
      const rows = await parseExcelFile(file);
      const preview = processExcelData(rows, profiles);
      setImportPreview(preview);

      // Initialize mapping for unmapped responsibles
      const initialMapping: Record<string, string> = {};
      preview.unmappedResponsibles.forEach(name => {
        initialMapping[name] = '';
      });
      setResponsibleMapping(initialMapping);
    } catch (error: any) {
      toast({ title: "Erro ao ler arquivo", description: error.message, variant: "destructive" });
      setImportFile(null);
      setImportPreview(null);
    }
  };

  // Importar dados do Excel
  const handleImport = async () => {
    if (!sprint || !importPreview) return;

    try {
      setImporting(true);

      // For each task group, create parent and subtasks
      for (const group of importPreview.taskGroups) {
        // Find responsible profile
        const responsibleName = group.responsible;
        let responsibleId: string | null = null;

        if (responsibleName) {
          if (responsibleMapping[responsibleName]) {
            responsibleId = responsibleMapping[responsibleName];
          } else {
            const profile = findProfileByName(responsibleName, profiles);
            responsibleId = profile?.id || null;
          }
        }

        // Create parent task
        const { data: parentData, error: parentError } = await supabase
          .from("sprint_deliverables")
          .insert({
            sprint_id: sprint.id,
            title: group.title,
            description: `${group.subtasks.length} subtarefas • ${group.totalHours}h total`,
            assigned_to: responsibleId,
            start_date: group.minDate || sprint.start_date,
            due_date: group.maxDate || sprint.end_date,
            estimated_hours: group.totalHours,
            status: 'pending',
            parent_id: null,
            task_code: null
          })
          .select()
          .single();

        if (parentError) throw parentError;

        // Create subtasks with parent_id
        const subtasks = group.subtasks.map(subtask => {
          let subtaskResponsibleId: string | null = null;
          if (subtask.responsible) {
            if (responsibleMapping[subtask.responsible]) {
              subtaskResponsibleId = responsibleMapping[subtask.responsible];
            } else {
              const profile = findProfileByName(subtask.responsible, profiles);
              subtaskResponsibleId = profile?.id || null;
            }
          }

          return {
            sprint_id: sprint.id,
            title: subtask.subtaskTitle || subtask.title,
            description: subtask.description || null,
            assigned_to: subtaskResponsibleId,
            start_date: subtask.dueDate || sprint.start_date,
            due_date: subtask.dueDate || sprint.end_date,
            estimated_hours: subtask.estimatedHours || null,
            status: 'pending',
            parent_id: parentData.id,
            task_code: subtask.taskCode || null
          };
        });

        if (subtasks.length > 0) {
          const { error: subtasksError } = await supabase
            .from("sprint_deliverables")
            .insert(subtasks);

          if (subtasksError) throw subtasksError;
        }
      }

      // Refresh deliverables
      await fetchSprintData();

      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
      setResponsibleMapping({});
      toast({ 
        title: "Importação concluída", 
        description: `${importPreview.totalTasks} tarefas e ${importPreview.totalSubtasks} subtarefas importadas` 
      });
    } catch (error: any) {
      toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Não atribuído";
    const profile = profiles.find(p => p.id === userId);
    return profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Desconhecido";
  };

  const getParticipantNames = (participantIds: string[]) => {
    if (!participantIds || participantIds.length === 0) return "Todos";
    return participantIds.map(id => getProfileName(id)).join(", ");
  };

  const getEventTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      daily: "bg-blue-100 text-blue-800",
      meeting: "bg-purple-100 text-purple-800",
      session: "bg-green-100 text-green-800",
      presentation: "bg-amber-100 text-amber-800",
      planning: "bg-indigo-100 text-indigo-800",
      retrospective: "bg-rose-100 text-rose-800"
    };
    const labels: Record<string, string> = {
      daily: "Daily",
      meeting: "Reunião",
      session: "Sessão",
      presentation: "Apresentação",
      planning: "Planning",
      retrospective: "Retro"
    };
    return <Badge className={styles[type] || "bg-gray-100 text-gray-800"}>{labels[type] || type}</Badge>;
  };

  const getDateBadge = (dateStr: string) => {
    const date = parseDate(dateStr);
    if (isTodayBrazil(date)) return <Badge className="bg-primary text-primary-foreground text-xs">Hoje</Badge>;
    if (isTomorrowBrazil(date)) return <Badge variant="outline" className="text-xs">Amanhã</Badge>;
    if (isPastBrazil(date)) return <Badge variant="secondary" className="text-xs">Passado</Badge>;
    return null;
  };

  const groupEventsByDate = () => {
    const grouped: Record<string, SprintEvent[]> = {};
    events.forEach(event => {
      if (!grouped[event.event_date]) {
        grouped[event.event_date] = [];
      }
      grouped[event.event_date].push(event);
    });
    return grouped;
  };

  // Unique responsible people for filter
  const uniqueResponsibles = useMemo(() => {
    const responsibleIds = [...new Set(deliverables.map(d => d.assigned_to).filter(Boolean))];
    return responsibleIds.map(id => {
      const profile = profiles.find(p => p.id === id);
      return profile ? { id: profile.id, name: `${profile.first_name} ${profile.last_name}`.trim() } : null;
    }).filter(Boolean) as { id: string; name: string }[];
  }, [deliverables, profiles]);

  // Cálculo de riscos da sprint
  const sprintRisks = useMemo(() => {
    const today = new Date();
    
    const overdue = deliverables.filter(d => {
      if (d.status === 'completed') return false;
      const dueDate = parseDate(d.due_date);
      return isPastBrazil(dueDate) && !isTodayBrazil(dueDate);
    });
    
    const dueToday = deliverables.filter(d => {
      if (d.status === 'completed') return false;
      return isTodayBrazil(parseDate(d.due_date));
    });
    
    const dueTomorrow = deliverables.filter(d => {
      if (d.status === 'completed') return false;
      return isTomorrowBrazil(parseDate(d.due_date));
    });

    // Calcular progresso da sprint
    let sprintProgress = 0;
    if (sprint) {
      const sprintStart = parseDate(sprint.start_date);
      const sprintEnd = parseDate(sprint.end_date);
      const totalDays = differenceInDays(sprintEnd, sprintStart) + 1;
      const daysPassed = Math.max(0, differenceInDays(today, sprintStart) + 1);
      sprintProgress = Math.min(100, (daysPassed / totalDays) * 100);
    }

    // Métricas em risco: < 50% do target quando sprint > 50%
    const metricsAtRisk = metrics.filter(m => {
      if (!m.target_value || m.target_value === 0) return false;
      const progress = ((m.current_value || 0) / m.target_value) * 100;
      return sprintProgress > 50 && progress < 50;
    });

    return { overdue, dueToday, dueTomorrow, metricsAtRisk, sprintProgress };
  }, [deliverables, metrics, sprint]);

  // Filtered deliverables
  const filteredDeliverables = useMemo(() => {
    return deliverables.filter(d => {
      if (filterResponsible !== 'all' && d.assigned_to !== filterResponsible) return false;
      if (filterStatus !== 'all' && d.status !== filterStatus) return false;
      
      // Filtro por data
      if (filterDate === 'today') {
        return isTodayBrazil(parseDate(d.due_date)) && d.status !== 'completed';
      }
      if (filterDate === 'tomorrow') {
        return isTomorrowBrazil(parseDate(d.due_date)) && d.status !== 'completed';
      }
      if (filterDate === 'overdue') {
        const dueDate = parseDate(d.due_date);
        return isPastBrazil(dueDate) && !isTodayBrazil(dueDate) && d.status !== 'completed';
      }
      
      return true;
    });
  }, [deliverables, filterResponsible, filterStatus, filterDate]);

  // Hierarchical task structure (parent tasks with subtasks)
  const hierarchicalTasks = useMemo(() => {
    // Get parent tasks (no parent_id)
    const parentTasks = filteredDeliverables.filter(d => !d.parent_id);
    
    // Get subtasks (has parent_id)
    const subtasks = filteredDeliverables.filter(d => d.parent_id);
    
    // Group subtasks by parent
    const subtasksByParent: Record<string, Deliverable[]> = {};
    subtasks.forEach(subtask => {
      if (subtask.parent_id) {
        if (!subtasksByParent[subtask.parent_id]) {
          subtasksByParent[subtask.parent_id] = [];
        }
        subtasksByParent[subtask.parent_id].push(subtask);
      }
    });

    // Sort subtasks by task_code
    Object.keys(subtasksByParent).forEach(parentId => {
      subtasksByParent[parentId].sort((a, b) => {
        if (a.task_code && b.task_code) {
          return a.task_code.localeCompare(b.task_code, undefined, { numeric: true });
        }
        return 0;
      });
    });

    // Build hierarchical structure
    return parentTasks.map(parent => ({
      ...parent,
      subtasks: subtasksByParent[parent.id] || [],
      subtaskCount: subtasksByParent[parent.id]?.length || 0,
      completedSubtasks: subtasksByParent[parent.id]?.filter(s => s.status === 'completed').length || 0,
      totalHours: (parent.estimated_hours || 0) + (subtasksByParent[parent.id]?.reduce((sum, s) => sum + (s.estimated_hours || 0), 0) || 0)
    }));
  }, [filteredDeliverables]);

  // Also get orphan tasks (subtasks without a visible parent due to filtering)
  const orphanSubtasks = useMemo(() => {
    const parentIds = new Set(filteredDeliverables.filter(d => !d.parent_id).map(d => d.id));
    return filteredDeliverables.filter(d => d.parent_id && !parentIds.has(d.parent_id));
  }, [filteredDeliverables]);

  // Toggle task expanded
  const toggleTaskExpanded = (taskId: string) => {
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

  // Get parent tasks for select dropdown
  const parentTaskOptions = useMemo(() => {
    return deliverables.filter(d => !d.parent_id);
  }, [deliverables]);

  const clearFilters = () => {
    setFilterResponsible('all');
    setFilterStatus('all');
    setFilterDate('all');
  };

  const hasActiveFilters = filterResponsible !== 'all' || filterStatus !== 'all' || filterDate !== 'all';

  // Gantt real - dados calculados
  const ganttChartData = useMemo(() => {
    if (!sprint) return { days: [], deliverables: [], totalDays: 0 };
    
    const sprintStart = parseDate(sprint.start_date);
    const sprintEnd = parseDate(sprint.end_date);
    const days = eachDayOfInterval({ start: sprintStart, end: sprintEnd });
    const totalDays = days.length;
    
    const chartDeliverables = filteredDeliverables.map(d => {
      const startDate = d.start_date ? parseDate(d.start_date) : sprintStart;
      const endDate = parseDate(d.due_date);
      
      const startOffset = Math.max(0, differenceInDays(startDate, sprintStart));
      const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);
      
      return {
        ...d,
        startDate,
        endDate,
        startOffset,
        duration,
        barLeft: (startOffset / totalDays) * 100,
        barWidth: (duration / totalDays) * 100
      };
    });
    
    return { days, deliverables: chartDeliverables, totalDays };
  }, [sprint, filteredDeliverables]);

  // Gantt agrupado por pessoa
  const [expandedPersons, setExpandedPersons] = useState<Set<string>>(new Set());

  const ganttByPerson = useMemo(() => {
    if (!sprint) return [];
    
    const sprintStart = parseDate(sprint.start_date);
    const sprintEnd = parseDate(sprint.end_date);
    const totalDays = ganttChartData.totalDays;
    
    const grouped: Record<string, typeof ganttChartData.deliverables> = {};
    
    ganttChartData.deliverables.forEach(d => {
      const personId = d.assigned_to || 'unassigned';
      if (!grouped[personId]) grouped[personId] = [];
      grouped[personId].push(d);
    });
    
    return Object.entries(grouped).map(([personId, items]) => {
      const totalHours = items.reduce((sum, d) => sum + (d.estimated_hours || 0), 0);
      const completedCount = items.filter(d => d.status === 'completed').length;
      
      // Calcular período consolidado da pessoa
      let minStart = sprintEnd;
      let maxEnd = sprintStart;
      items.forEach(d => {
        if (d.startDate < minStart) minStart = d.startDate;
        if (d.endDate > maxEnd) maxEnd = d.endDate;
      });
      
      const consolidatedStartOffset = Math.max(0, differenceInDays(minStart, sprintStart));
      const consolidatedDuration = Math.max(1, differenceInDays(maxEnd, minStart) + 1);
      
      return {
        personId,
        personName: getProfileName(personId),
        deliverables: items,
        totalHours,
        completedCount,
        count: items.length,
        minStart,
        maxEnd,
        consolidatedBarLeft: (consolidatedStartOffset / totalDays) * 100,
        consolidatedBarWidth: (consolidatedDuration / totalDays) * 100
      };
    }).sort((a, b) => a.personName.localeCompare(b.personName));
  }, [ganttChartData, sprint, getProfileName]);

  const togglePersonExpanded = (personId: string) => {
    setExpandedPersons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
  };

  // Função para obter entregáveis relacionados a uma métrica
  const getRelatedDeliverables = (metric: Metric) => {
    const metricKeywords = metric.name.toLowerCase().split(' ').filter(w => w.length > 3);
    const categoryKeywords = metric.category?.toLowerCase().split(' ').filter(w => w.length > 3) || [];
    const allKeywords = [...metricKeywords, ...categoryKeywords];
    
    return deliverables.filter(d => {
      const titleLower = d.title.toLowerCase();
      const descLower = d.description?.toLowerCase() || '';
      return allKeywords.some(kw => titleLower.includes(kw) || descLower.includes(kw));
    });
  };

  // Toggle métrica expandida
  const toggleMetricExpanded = (metricId: string) => {
    setExpandedMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metricId)) {
        newSet.delete(metricId);
      } else {
        newSet.add(metricId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <EquipeLayout title="Carregando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </EquipeLayout>
    );
  }

  if (!sprint) {
    return (
      <EquipeLayout title="Sprint não encontrada">
        <Button onClick={() => navigate("/equipe/sprints")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Sprints
        </Button>
      </EquipeLayout>
    );
  }

  const groupedEvents = groupEventsByDate();

  return (
    <EquipeLayout title={sprint.name}>
      <div className="space-y-6">
        {/* Header Simples */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/equipe/sprints")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Badge 
            className={
              sprint.status === 'active' ? 'bg-primary/10 text-primary border-primary/20' :
              sprint.status === 'completed' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-700'
            }
          >
            {sprint.status === 'active' ? 'Ativa' : 
             sprint.status === 'completed' ? 'Concluída' : 
             sprint.status === 'planning' ? 'Planejamento' : sprint.status}
          </Badge>
        </div>

        {/* Card de Riscos */}
        {(sprintRisks.overdue.length > 0 || sprintRisks.dueToday.length > 0 || sprintRisks.metricsAtRisk.length > 0) && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-700">Atenção!</span>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {sprintRisks.overdue.length > 0 && (
                    <span className="text-red-600">
                      {sprintRisks.overdue.length} atrasado{sprintRisks.overdue.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {sprintRisks.dueToday.length > 0 && (
                    <span className="text-amber-600">
                      {sprintRisks.dueToday.length} vencendo hoje
                    </span>
                  )}
                  {sprintRisks.dueTomorrow.length > 0 && (
                    <span className="text-yellow-600">
                      {sprintRisks.dueTomorrow.length} vencendo amanhã
                    </span>
                  )}
                  {sprintRisks.metricsAtRisk.length > 0 && (
                    <span className="text-purple-600">
                      {sprintRisks.metricsAtRisk.length} métrica{sprintRisks.metricsAtRisk.length > 1 ? 's' : ''} em risco
                    </span>
                  )}
                </div>
                <div className="flex gap-2 ml-auto">
                  {sprintRisks.overdue.length > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-300 text-red-700 hover:bg-red-100"
                      onClick={() => setFilterDate('overdue')}
                    >
                      Ver Atrasados
                    </Button>
                  )}
                  {sprintRisks.dueToday.length > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={() => setFilterDate('today')}
                    >
                      Ver Hoje
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Barra de Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filterResponsible} onValueChange={setFilterResponsible}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              {uniqueResponsibles.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtros rápidos de urgência */}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant={filterDate === 'today' ? 'default' : 'outline'}
              onClick={() => setFilterDate(filterDate === 'today' ? 'all' : 'today')}
              className={filterDate === 'today' ? '' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}
            >
              <Clock className="h-3 w-3 mr-1" />
              Hoje ({sprintRisks.dueToday.length})
            </Button>
            <Button 
              size="sm" 
              variant={filterDate === 'tomorrow' ? 'default' : 'outline'}
              onClick={() => setFilterDate(filterDate === 'tomorrow' ? 'all' : 'tomorrow')}
              className={filterDate === 'tomorrow' ? '' : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'}
            >
              <CalendarClock className="h-3 w-3 mr-1" />
              Amanhã ({sprintRisks.dueTomorrow.length})
            </Button>
            <Button 
              size="sm" 
              variant={filterDate === 'overdue' ? 'default' : 'outline'}
              onClick={() => setFilterDate(filterDate === 'overdue' ? 'all' : 'overdue')}
              className={filterDate === 'overdue' ? '' : 'border-red-300 text-red-700 hover:bg-red-50'}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Atrasados ({sprintRisks.overdue.length})
            </Button>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          )}

          {hasActiveFilters && (
            <span className="text-sm text-gray-500 ml-auto">
              {filteredDeliverables.length} de {deliverables.length} entregáveis
            </span>
          )}
        </div>

        {/* Tabs de conteúdo */}
        <Tabs defaultValue="deliverables" className="space-y-4">
          <TabsList>
            <TabsTrigger value="deliverables">Entregáveis</TabsTrigger>
            <TabsTrigger value="gantt">Gantt</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="risks" className="relative">
              Riscos
              {(sprintRisks.overdue.length > 0 || sprintRisks.metricsAtRisk.length > 0) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab Entregáveis */}
          <TabsContent value="deliverables" className="space-y-4">
            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  fileInputRef.current?.click();
                  setImportModalOpen(true);
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Excel
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  setCreateForm({
                    title: '',
                    description: '',
                    assigned_to: '',
                    start_date: sprint?.start_date || '',
                    due_date: sprint?.end_date || '',
                    estimated_hours: '',
                    parent_id: ''
                  });
                  setCreateModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </div>

            {filteredDeliverables.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {hasActiveFilters ? 'Nenhum entregável encontrado com os filtros selecionados.' : 'Nenhum entregável cadastrado para esta sprint.'}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {/* Hierarchical tasks (parent tasks with subtasks) */}
                {hierarchicalTasks.map((task) => {
                  const isExpanded = expandedTasks.has(task.id);
                  const hasSubtasks = task.subtaskCount > 0;

                  return (
                    <div key={task.id}>
                      {/* Parent task card */}
                      <Card className={`${task.status === 'completed' ? 'bg-gray-50' : 'bg-white'} border-gray-200`}>
                        <CardContent className="py-3">
                          <div className="flex items-center gap-2">
                            {/* Expand button */}
                            {hasSubtasks ? (
                              <button 
                                onClick={() => toggleTaskExpanded(task.id)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                              </button>
                            ) : (
                              <div className="w-6" />
                            )}
                            
                            <Checkbox 
                              checked={task.status === 'completed'}
                              onCheckedChange={(checked) => {
                                updateDeliverableStatus(task.id, checked ? 'completed' : 'pending');
                              }}
                            />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {task.task_code && (
                                  <span className="text-xs font-mono text-gray-400">{task.task_code}</span>
                                )}
                                <span className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                  {task.title}
                                </span>
                                {hasSubtasks && (
                                  <Badge variant="outline" className="text-xs">
                                    {task.completedSubtasks}/{task.subtaskCount} subtarefas
                                  </Badge>
                                )}
                                {getDateBadge(task.due_date)}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                <span>{getProfileName(task.assigned_to)}</span>
                                <span>{format(parseDate(task.due_date), "dd/MM")}</span>
                                {task.totalHours > 0 && <span>{task.totalHours}h</span>}
                              </div>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openEditModal(task)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            
                            <Badge 
                              variant="outline"
                              className={
                                task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                task.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                'bg-gray-50 text-gray-600 border-gray-200'
                              }
                            >
                              {task.status === 'completed' ? 'Concluído' :
                               task.status === 'in_progress' ? 'Em Progresso' : 'Pendente'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Subtasks */}
                      {hasSubtasks && isExpanded && (
                        <div className="ml-8 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
                          {task.subtasks.map((subtask) => (
                            <Card key={subtask.id} className={`${subtask.status === 'completed' ? 'bg-gray-50' : 'bg-white'} border-gray-100`}>
                              <CardContent className="py-2">
                                <div className="flex items-center gap-3">
                                  <Checkbox 
                                    checked={subtask.status === 'completed'}
                                    onCheckedChange={(checked) => {
                                      updateDeliverableStatus(subtask.id, checked ? 'completed' : 'pending');
                                    }}
                                  />
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      {subtask.task_code && (
                                        <span className="text-xs font-mono text-gray-400">{subtask.task_code}</span>
                                      )}
                                      <span className={`text-sm ${subtask.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                        {subtask.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                      <span>{getProfileName(subtask.assigned_to)}</span>
                                      <span>{format(parseDate(subtask.due_date), "dd/MM")}</span>
                                      {subtask.estimated_hours && <span>{subtask.estimated_hours}h</span>}
                                    </div>
                                  </div>
                                  
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => openEditModal(subtask)}
                                    className="text-gray-400 hover:text-gray-600 h-7 w-7 p-0"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>

                                  <div className={`h-2 w-2 rounded-full ${
                                    subtask.status === 'completed' ? 'bg-green-500' :
                                    subtask.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-300'
                                  }`} />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Orphan subtasks (subtasks without visible parent) */}
                {orphanSubtasks.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">Subtarefas avulsas:</p>
                    {orphanSubtasks.map((subtask) => (
                      <Card key={subtask.id} className={`${subtask.status === 'completed' ? 'bg-gray-50' : 'bg-white'} border-gray-200 mb-1`}>
                        <CardContent className="py-2">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={subtask.status === 'completed'}
                              onCheckedChange={(checked) => {
                                updateDeliverableStatus(subtask.id, checked ? 'completed' : 'pending');
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {subtask.task_code && (
                                  <span className="text-xs font-mono text-gray-400">{subtask.task_code}</span>
                                )}
                                <span className={`text-sm ${subtask.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                  {subtask.title}
                                </span>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openEditModal(subtask)}
                              className="text-gray-400 hover:text-gray-600 h-7 w-7 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab Gantt - REAL com accordion por pessoa */}
          <TabsContent value="gantt" className="space-y-4">
            <Card className="bg-white border-gray-200 overflow-hidden">
              <CardContent className="p-0">
                {/* Gantt Chart Container */}
                <div className="border border-gray-200 rounded-lg overflow-auto bg-white">
                  {/* Header com dias */}
                  <div className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                    <div className="flex">
                      <div className="w-[340px] flex-shrink-0 px-4 py-3 font-medium text-gray-700 border-r border-gray-200">
                        Responsável / Entregável
                      </div>
                      <div className="flex-1 flex min-w-[500px]">
                        {ganttChartData.days.map((day, i) => (
                          <div 
                            key={i}
                            className={`flex-1 text-center py-2 text-xs border-r border-gray-100 last:border-r-0 ${
                              isSameDay(day, getTodayBrazil()) ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-500'
                            }`}
                            style={{ minWidth: '45px' }}
                          >
                            <div>{format(day, "EEE", { locale: ptBR })}</div>
                            <div className="font-medium">{format(day, "dd")}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Linhas do Gantt - Agrupado por pessoa */}
                  <div className="divide-y divide-gray-200">
                    {ganttByPerson.length === 0 ? (
                      <div className="py-12 text-center text-gray-500">
                        Nenhum entregável encontrado
                      </div>
                    ) : (
                      ganttByPerson.map((personGroup) => {
                        const isExpanded = expandedPersons.has(personGroup.personId);
                        
                        return (
                          <div key={personGroup.personId}>
                            {/* Header da pessoa (sempre visível) */}
                            <button
                              onClick={() => togglePersonExpanded(personGroup.personId)}
                              className="w-full flex hover:bg-gray-50/80 transition-colors"
                            >
                              {/* Nome da pessoa + resumo */}
                              <div className="w-[340px] flex-shrink-0 px-4 py-3 border-r border-gray-200 bg-gray-50/50 text-left">
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900">{personGroup.personName}</div>
                                    <div className="text-xs text-gray-500">
                                      {personGroup.count} entregável{personGroup.count !== 1 ? 'is' : ''} • {personGroup.totalHours}h • {personGroup.completedCount}/{personGroup.count} concluídos
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Barra consolidada */}
                              <div className="flex-1 relative h-12 min-w-[500px]">
                                {/* Grid lines */}
                                <div className="absolute inset-0 flex">
                                  {ganttChartData.days.map((day, i) => (
                                    <div 
                                      key={i}
                                      className={`flex-1 border-r border-gray-100 last:border-r-0 ${
                                        isSameDay(day, getTodayBrazil()) ? 'bg-primary/5' : ''
                                      }`}
                                      style={{ minWidth: '45px' }}
                                    />
                                  ))}
                                </div>
                                
                                {/* Barra consolidada quando fechado */}
                                {!isExpanded && (
                                  <div
                                    className="absolute top-4 h-4 rounded-full bg-primary/30 border border-primary/50"
                                    style={{
                                      left: `${personGroup.consolidatedBarLeft}%`,
                                      width: `${Math.max(personGroup.consolidatedBarWidth, 3)}%`,
                                      minWidth: '20px'
                                    }}
                                    title={`${format(personGroup.minStart, "dd/MM")} - ${format(personGroup.maxEnd, "dd/MM")}`}
                                  />
                                )}
                              </div>
                            </button>
                            
                            {/* Entregáveis expandidos */}
                            {isExpanded && (
                              <div className="divide-y divide-gray-100 bg-white">
                                {personGroup.deliverables.map((d) => (
                                  <div key={d.id} className="flex hover:bg-gray-50/50 group">
                                    {/* Nome do entregável */}
                                    <div className="w-[340px] flex-shrink-0 px-4 py-2 pl-10 border-r border-gray-100 bg-white">
                                      <button
                                        onClick={() => openEditModal(d)}
                                        className="w-full text-left group-hover:text-primary transition-colors"
                                      >
                                        <div className={`text-sm leading-tight ${d.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                          {d.title}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {format(d.startDate, "dd/MM")} - {format(d.endDate, "dd/MM")}
                                        </div>
                                      </button>
                                    </div>
                                    
                                    {/* Área da barra */}
                                    <div className="flex-1 relative h-10 min-w-[500px]">
                                      {/* Grid lines */}
                                      <div className="absolute inset-0 flex">
                                        {ganttChartData.days.map((day, i) => (
                                          <div 
                                            key={i}
                                            className={`flex-1 border-r border-gray-100 last:border-r-0 ${
                                              isSameDay(day, getTodayBrazil()) ? 'bg-primary/5' : ''
                                            }`}
                                            style={{ minWidth: '45px' }}
                                          />
                                        ))}
                                      </div>
                                      
                                      {/* Barra do entregável - mais fina */}
                                      <button
                                        onClick={() => openEditModal(d)}
                                        className={`absolute top-3 h-4 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer ${getStatusColor(d.status)} hover:scale-y-125`}
                                        style={{
                                          left: `${d.barLeft}%`,
                                          width: `${Math.max(d.barWidth, 3)}%`,
                                          minWidth: '20px'
                                        }}
                                        title={`${d.title} (${format(d.startDate, "dd/MM")} - ${format(d.endDate, "dd/MM")})`}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legenda */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span>Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Em Progresso</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Concluído</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-3 rounded-full bg-primary/30 border border-primary/50"></div>
                <span>Período consolidado</span>
              </div>
              <div className="text-gray-400 ml-2">
                Clique para expandir/editar
              </div>
            </div>
          </TabsContent>

          {/* Tab Agenda */}
          <TabsContent value="agenda" className="space-y-4">
            {events.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum evento cadastrado para esta sprint.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-semibold text-gray-900">
                        {format(parseDate(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </h3>
                      {getDateBadge(date)}
                    </div>
                    <div className="space-y-2 ml-4 border-l-2 border-gray-200 pl-4">
                      {dayEvents.map((event) => (
                        <Card key={event.id} className="bg-white border-gray-200">
                          <CardContent className="py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {event.start_time && (
                                    <span className="text-sm font-mono text-gray-500">
                                      {event.start_time.slice(0, 5)}
                                      {event.end_time && ` - ${event.end_time.slice(0, 5)}`}
                                    </span>
                                  )}
                                  <span className="font-medium text-gray-900">{event.title}</span>
                                </div>
                                {event.description && (
                                  <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                                )}
                                {event.participants && event.participants.length > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {getParticipantNames(event.participants)}
                                  </p>
                                )}
                              </div>
                              {getEventTypeBadge(event.event_type)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab Métricas */}
          <TabsContent value="metrics" className="space-y-4">
            {metrics.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma métrica cadastrada para esta sprint.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics.map((metric) => {
                  const percentage = metric.target_value 
                    ? Math.round(((metric.current_value || 0) / metric.target_value) * 100)
                    : 0;
                  const relatedDeliverables = getRelatedDeliverables(metric);
                  const relatedResponsibles = [...new Set(relatedDeliverables.map(d => d.assigned_to).filter(Boolean))];
                  const isExpanded = expandedMetrics.has(metric.id);

                  return (
                    <Card key={metric.id} className="bg-white border-gray-200">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-sm font-medium text-gray-900">{metric.name}</CardTitle>
                            {metric.category && (
                              <Badge variant="outline" className="w-fit text-xs mt-1">{metric.category}</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-bold text-gray-900">{metric.current_value || 0}</span>
                          {metric.target_value && (
                            <span className="text-gray-500 mb-1">/ {metric.target_value} {metric.unit}</span>
                          )}
                        </div>
                        {metric.target_value && (
                          <>
                            <Progress value={percentage} className="h-2" />
                            <p className="text-xs text-gray-500">{percentage}% concluído</p>
                          </>
                        )}
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateMetric(metric.id, (metric.current_value || 0) + 1)}
                          >
                            +1
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateMetric(metric.id, Math.max(0, (metric.current_value || 0) - 1))}
                          >
                            -1
                          </Button>
                        </div>

                        {/* Seção expandível com contexto */}
                        <Collapsible open={isExpanded} onOpenChange={() => toggleMetricExpanded(metric.id)}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between text-gray-600 hover:text-gray-900 mt-2">
                              <span className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {relatedResponsibles.length} responsáveis • {relatedDeliverables.length} entregáveis
                              </span>
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3 space-y-3">
                            {relatedResponsibles.length > 0 && (
                              <div>
                                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Responsáveis</h4>
                                <div className="flex flex-wrap gap-2">
                                  {relatedResponsibles.map(rId => (
                                    <Badge key={rId} variant="secondary" className="text-xs">
                                      {getProfileName(rId)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {relatedDeliverables.length > 0 && (
                              <div>
                                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Entregáveis Relacionados</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {relatedDeliverables.map(d => (
                                    <div key={d.id} className="flex items-center gap-2 text-sm">
                                      <Package className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                      <span className={d.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}>
                                        {d.title}
                                      </span>
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs ml-auto flex-shrink-0 ${
                                          d.status === 'completed' ? 'bg-green-50 text-green-600' :
                                          d.status === 'in_progress' ? 'bg-yellow-50 text-yellow-600' :
                                          'bg-gray-50 text-gray-500'
                                        }`}
                                      >
                                        {d.status === 'completed' ? '✓' : d.status === 'in_progress' ? '→' : '○'}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {relatedDeliverables.length === 0 && (
                              <p className="text-xs text-gray-400 italic">
                                Nenhum entregável relacionado encontrado
                              </p>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab Riscos */}
          <TabsContent value="risks" className="space-y-6">
            {/* Resumo de Riscos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className={sprintRisks.overdue.length > 0 ? 'border-red-200 bg-red-50' : 'bg-white'}>
                <CardContent className="py-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{sprintRisks.overdue.length}</div>
                  <div className="text-sm text-gray-600">Atrasados</div>
                </CardContent>
              </Card>
              <Card className={sprintRisks.dueToday.length > 0 ? 'border-amber-200 bg-amber-50' : 'bg-white'}>
                <CardContent className="py-4 text-center">
                  <div className="text-3xl font-bold text-amber-600">{sprintRisks.dueToday.length}</div>
                  <div className="text-sm text-gray-600">Vencendo Hoje</div>
                </CardContent>
              </Card>
              <Card className={sprintRisks.dueTomorrow.length > 0 ? 'border-yellow-200 bg-yellow-50' : 'bg-white'}>
                <CardContent className="py-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600">{sprintRisks.dueTomorrow.length}</div>
                  <div className="text-sm text-gray-600">Vencendo Amanhã</div>
                </CardContent>
              </Card>
              <Card className={sprintRisks.metricsAtRisk.length > 0 ? 'border-purple-200 bg-purple-50' : 'bg-white'}>
                <CardContent className="py-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{sprintRisks.metricsAtRisk.length}</div>
                  <div className="text-sm text-gray-600">Métricas em Risco</div>
                </CardContent>
              </Card>
            </div>

            {/* Progresso da Sprint */}
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Progresso da Sprint</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Progress value={sprintRisks.sprintProgress} className="flex-1 h-3" />
                  <span className="text-sm font-medium text-gray-700">{Math.round(sprintRisks.sprintProgress)}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {sprint && `${format(parseDate(sprint.start_date), "dd/MM")} - ${format(parseDate(sprint.end_date), "dd/MM")}`}
                </p>
              </CardContent>
            </Card>

            {/* Entregáveis Atrasados */}
            {sprintRisks.overdue.length > 0 && (
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Entregáveis Atrasados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sprintRisks.overdue.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{d.title}</p>
                          <p className="text-xs text-gray-500">
                            {getProfileName(d.assigned_to)} • Venceu em {format(parseDate(d.due_date), "dd/MM")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                            {Math.abs(differenceInDays(parseDate(d.due_date), new Date()))} dia{Math.abs(differenceInDays(parseDate(d.due_date), new Date())) !== 1 ? 's' : ''} atraso
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => openEditModal(d)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vencendo Hoje */}
            {sprintRisks.dueToday.length > 0 && (
              <Card className="border-amber-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Vencendo Hoje
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sprintRisks.dueToday.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{d.title}</p>
                          <p className="text-xs text-gray-500">
                            {getProfileName(d.assigned_to)} • {d.estimated_hours ? `${d.estimated_hours}h estimadas` : 'Sem estimativa'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            d.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }>
                            {d.status === 'in_progress' ? 'Em Progresso' : 'Pendente'}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => openEditModal(d)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vencendo Amanhã */}
            {sprintRisks.dueTomorrow.length > 0 && (
              <Card className="border-yellow-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    Vencendo Amanhã
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sprintRisks.dueTomorrow.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{d.title}</p>
                          <p className="text-xs text-gray-500">
                            {getProfileName(d.assigned_to)} • {d.estimated_hours ? `${d.estimated_hours}h estimadas` : 'Sem estimativa'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            d.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }>
                            {d.status === 'in_progress' ? 'Em Progresso' : 'Pendente'}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => openEditModal(d)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Métricas em Risco */}
            {sprintRisks.metricsAtRisk.length > 0 && (
              <Card className="border-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Métricas em Risco
                  </CardTitle>
                  <p className="text-xs text-gray-500">Sprint está em {Math.round(sprintRisks.sprintProgress)}% do tempo, mas estas métricas estão abaixo de 50%</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sprintRisks.metricsAtRisk.map(m => {
                      const percentage = m.target_value ? Math.round(((m.current_value || 0) / m.target_value) * 100) : 0;
                      return (
                        <div key={m.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-gray-900">{m.name}</p>
                            <span className="text-sm text-purple-700">
                              {m.current_value || 0} / {m.target_value} {m.unit}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">{percentage}% concluído</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sem riscos */}
            {sprintRisks.overdue.length === 0 && sprintRisks.dueToday.length === 0 && 
             sprintRisks.dueTomorrow.length === 0 && sprintRisks.metricsAtRisk.length === 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-8 text-center">
                  <div className="text-green-600 text-lg font-medium mb-2">Tudo em dia!</div>
                  <p className="text-gray-600 text-sm">Nenhum risco identificado para esta sprint.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Edição de Entregável */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Entregável</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Título</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título do entregável"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição detalhada"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-assigned">Responsável</Label>
                <Select 
                  value={editForm.assigned_to || "unassigned"} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, assigned_to: value === "unassigned" ? "" : value }))}
                >
                  <SelectTrigger id="edit-assigned">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start">Data Início</Label>
                <Input
                  id="edit-start"
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-due">Data Entrega</Label>
                <Input
                  id="edit-due"
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-hours">Horas Estimadas</Label>
              <Input
                id="edit-hours"
                type="number"
                step="0.5"
                min="0"
                value={editForm.estimated_hours}
                onChange={(e) => setEditForm(prev => ({ ...prev, estimated_hours: e.target.value }))}
                placeholder="Ex: 4"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir entregável?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O entregável "{editingDeliverable?.title}" 
                    será permanentemente removido junto com todos os seus anexos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={deleteDeliverable} 
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? 'Excluindo...' : 'Excluir'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveDeliverable} disabled={saving || !editForm.title || !editForm.due_date}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Criação de Tarefa */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-title">Título *</Label>
              <Input
                id="create-title"
                value={createForm.title}
                onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da tarefa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-description">Descrição</Label>
              <Textarea
                id="create-description"
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição detalhada"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-parent">Tarefa Pai (opcional)</Label>
              <Select 
                value={createForm.parent_id || "none"} 
                onValueChange={(value) => setCreateForm(prev => ({ ...prev, parent_id: value === "none" ? "" : value }))}
              >
                <SelectTrigger id="create-parent">
                  <SelectValue placeholder="Nenhuma (tarefa principal)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (tarefa principal)</SelectItem>
                  {parentTaskOptions.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.task_code && `${p.task_code} - `}{p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-assigned">Responsável</Label>
                <Select 
                  value={createForm.assigned_to || "unassigned"} 
                  onValueChange={(value) => setCreateForm(prev => ({ ...prev, assigned_to: value === "unassigned" ? "" : value }))}
                >
                  <SelectTrigger id="create-assigned">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-hours">Horas Estimadas</Label>
                <Input
                  id="create-hours"
                  type="number"
                  step="0.5"
                  min="0"
                  value={createForm.estimated_hours}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, estimated_hours: e.target.value }))}
                  placeholder="Ex: 4"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-start">Data Início</Label>
                <Input
                  id="create-start"
                  type="date"
                  value={createForm.start_date}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-due">Data Entrega *</Label>
                <Input
                  id="create-due"
                  type="date"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={createDeliverable} disabled={creating || !createForm.title || !createForm.due_date}>
              {creating ? 'Criando...' : 'Criar Tarefa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Importação Excel */}
      <Dialog open={importModalOpen} onOpenChange={(open) => {
        setImportModalOpen(open);
        if (!open) {
          setImportFile(null);
          setImportPreview(null);
          setResponsibleMapping({});
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Sprint do Excel
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!importPreview ? (
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
                <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">Selecione um arquivo Excel (.xlsx)</p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivo
                </Button>
                <p className="text-xs text-gray-400 mt-4">
                  O arquivo deve conter colunas: Sprint, ID, Título, Subtarefa, Responsável, Descrição, Estimativa (h), Data de Entrega
                </p>
              </div>
            ) : (
              <>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      <span className="font-medium">{importFile?.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Tarefas principais:</span>
                        <span className="ml-2 font-medium">{importPreview.totalTasks}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Subtarefas:</span>
                        <span className="ml-2 font-medium">{importPreview.totalSubtasks}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total de horas:</span>
                        <span className="ml-2 font-medium">{importPreview.totalHours}h</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Unmapped responsibles */}
                {importPreview.unmappedResponsibles.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-amber-700">
                        Responsáveis não encontrados ({importPreview.unmappedResponsibles.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {importPreview.unmappedResponsibles.map(name => (
                        <div key={name} className="flex items-center gap-4">
                          <span className="text-sm w-32 truncate">{name}</span>
                          <span className="text-gray-400">→</span>
                          <Select 
                            value={responsibleMapping[name] || "skip"} 
                            onValueChange={(value) => setResponsibleMapping(prev => ({
                              ...prev,
                              [name]: value === "skip" ? "" : value
                            }))}
                          >
                            <SelectTrigger className="flex-1 h-8">
                              <SelectValue placeholder="Mapear para..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">Ignorar (sem atribuição)</SelectItem>
                              {profiles.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.first_name} {p.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Preview of tasks */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Preview das tarefas:</h4>
                  <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                    {importPreview.taskGroups.map((group, i) => (
                      <div key={i} className="p-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{group.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {group.subtasks.length} subtarefas • {group.totalHours}h
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {group.responsible || 'Sem responsável'} • {group.minDate} - {group.maxDate}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setImportFile(null);
                    setImportPreview(null);
                    setResponsibleMapping({});
                  }}
                >
                  Selecionar outro arquivo
                </Button>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={importing || !importPreview}
            >
              {importing ? 'Importando...' : `Importar ${importPreview?.totalTasks || 0} tarefas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </EquipeLayout>
  );
}
