import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, FolderKanban, User, Users, Building2, FileText, Calendar, DollarSign } from 'lucide-react';
import { isProductionEnvironment } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuditLog } from '@/hooks/useAuditLog';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  responsible_id: string | null;
  leader_id: string | null;
  external_client_id: string | null;
  area_id: string | null;
  objective: string | null;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

interface ExternalClient {
  id: string;
  nome: string;
  setor_cliente: string | null;
}

interface TaxArea {
  id: string;
  nome: string;
}

interface TaxCategoria {
  id: string;
  nome: string;
}

interface TaxAreaCategoria {
  id: string;
  area_id: string;
  categoria_id: string;
}

const FiscalProjetosCadastro = () => {
  const { logAction } = useAuditLog();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    start_date: '',
    end_date: '',
    leader_ids: [] as string[],
    sublider_ids: [] as string[],
    external_client_id: '',
    contribuinte_id: '',
    area_id: '',
    objective: '',
    category_ids: [] as string[],
    member_ids: [] as string[],
  });

  // Fetch tax_areas
  const { data: taxAreas = [] } = useQuery({
    queryKey: ['tax-areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_areas')
        .select('id, nome')
        .order('nome');
      if (error) throw error;
      return data as TaxArea[];
    },
  });

  // Fetch tax_categorias
  const { data: taxCategorias = [] } = useQuery({
    queryKey: ['tax-categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_categorias')
        .select('id, nome')
        .order('nome');
      if (error) throw error;
      return data as TaxCategoria[];
    },
  });

  // Fetch aggregated estimated hours per project from fiscal_tasks
  const { data: projectHours = {} } = useQuery({
    queryKey: ['fiscal-project-hours'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_tasks')
        .select('project_id, estimated_hours');
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((t: any) => {
        if (t.project_id && t.estimated_hours) {
          map[t.project_id] = (map[t.project_id] || 0) + t.estimated_hours;
        }
      });
      return map;
    },
  });

  // Fetch tax_area_categorias (links)
  const { data: areaCategoryLinks = [] } = useQuery({
    queryKey: ['tax-area-categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_area_categorias')
        .select('id, area_id, categoria_id');
      if (error) throw error;
      return data as TaxAreaCategoria[];
    },
  });

  // Fetch team members (profiles_safe - accessible to all team members)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-profiles-safe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles_safe')
        .select('id, first_name, last_name')
        .order('first_name');
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch user roles for filtering leaders vs team members
  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles-lider-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['lider', 'team_member', 'sublider']);
      if (error) throw error;
      return data as { user_id: string; role: string }[];
    },
  });

  // Filtered lists based on roles
  const lideres = useMemo(() => {
    const liderIds = userRoles.filter(r => r.role === 'lider').map(r => r.user_id);
    return teamMembers.filter(m => liderIds.includes(m.id));
  }, [teamMembers, userRoles]);

  const sublideres = useMemo(() => {
    const subliderIds = userRoles.filter(r => r.role === 'sublider').map(r => r.user_id);
    return teamMembers.filter(m => subliderIds.includes(m.id));
  }, [teamMembers, userRoles]);

  // Fetch members filtered by selected subliders' teams
  const { data: filteredMemberIds = [] } = useQuery({
    queryKey: ['sublider-team-members', formData.sublider_ids],
    queryFn: async () => {
      if (formData.sublider_ids.length === 0) return [];
      // Get teams where sublider_id is one of the selected subliders
      const { data: teams, error: tErr } = await supabase
        .from('estrutura_equipes')
        .select('id')
        .in('sublider_id', formData.sublider_ids);
      if (tErr) throw tErr;
      if (!teams?.length) return [];
      // Get members of those teams
      const { data: members, error: mErr } = await supabase
        .from('estrutura_equipe_membros')
        .select('user_id')
        .in('equipe_id', teams.map(t => t.id));
      if (mErr) throw mErr;
      return [...new Set((members || []).map(m => m.user_id))];
    },
    enabled: formData.sublider_ids.length > 0,
  });

  // Fetch external clients
  const { data: externalClients = [] } = useQuery({
    queryKey: ['external-clients-tax'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome, setor_cliente')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data as ExternalClient[];
    },
  });

  // Fetch contribuintes filtered by selected client
  const { data: contribuintes = [] } = useQuery({
    queryKey: ['contribuintes-for-project', formData.external_client_id],
    queryFn: async () => {
      if (!formData.external_client_id) return [];
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', formData.external_client_id)
        .order('nome_razao_social');
      if (error) throw error;
      return data as { id: string; nome_razao_social: string; cpf_cnpj: string | null }[];
    },
    enabled: !!formData.external_client_id,
  });

  // Fetch OS/contratos for selected client
  const ordemServicoTable = isProductionEnvironment ? 'ordem_servico' : 'contrato_dev';
  const { data: clienteOS = [] } = useQuery({
    queryKey: ['cliente-os', formData.external_client_id, ordemServicoTable],
    queryFn: async () => {
      if (!formData.external_client_id) return [];
      const { data, error } = await supabase
        .from(ordemServicoTable)
        .select('*')
        .eq('id_cliente', formData.external_client_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!formData.external_client_id,
  });

  // Helper to get OS id regardless of environment
  const getOsId = (os: any): string => isProductionEnvironment ? os.id : os.id_contrato;
  const getOsLabel = (os: any): string => isProductionEnvironment ? (os.numero_os || 'Sem número') : (os.numero_contrato || 'Sem número');
  const getOsValue = (os: any): number | null => isProductionEnvironment ? os.valor_projeto : os.valor_fixo;

  // State for selected OS
  const [selectedOsId, setSelectedOsId] = useState<string | null>(null);

  // Auto-select when single OS
  useEffect(() => {
    if (!formData.external_client_id) {
      setSelectedOsId(null);
      return;
    }
    if (clienteOS.length === 1) {
      setSelectedOsId(getOsId(clienteOS[0]));
    }
  }, [clienteOS, formData.external_client_id]);

  // Auto-fill dates from selected OS (only on create)
  useEffect(() => {
    if (!selectedOsId || editingProject) return;
    const os = clienteOS.find((o: any) => getOsId(o) === selectedOsId);
    if (!os) return;
    setFormData(prev => ({
      ...prev,
      start_date: prev.start_date || (os as any).data_inicio || '',
      end_date: prev.end_date || (os as any).data_fim || '',
    }));
  }, [selectedOsId]);

  // Fetch projects with area join
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['fiscal-projects-tax-area'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_projects')
        .select(`
          *,
          responsible:profiles!tax_projects_responsible_id_fkey(id, first_name, last_name),
          leader:profiles!tax_projects_leader_id_fkey(id, first_name, last_name),
          external_client:cliente!tax_projects_external_client_id_fkey(id, nome),
          area_ref:tax_areas!tax_projects_area_id_fkey(id, nome),
          contribuinte:contribuinte!tax_projects_contribuinte_id_fkey(id, nome_razao_social)
        `)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch project members when editing
  const { data: currentProjectMembers = [] } = useQuery({
    queryKey: ['tax-project-members', editingProject?.id],
    queryFn: async () => {
      if (!editingProject?.id) return [];
      const { data, error } = await supabase
        .from('tax_project_members')
        .select('user_id, role')
        .eq('project_id', editingProject.id);
      if (error) throw error;
      return data;
    },
    enabled: !!editingProject?.id,
  });

  // Fetch project categories when editing
  const { data: currentProjectCategories = [] } = useQuery({
    queryKey: ['tax-project-categorias', editingProject?.id],
    queryFn: async () => {
      if (!editingProject?.id) return [];
      const { data, error } = await supabase
        .from('tax_project_categorias')
        .select('categoria_id')
        .eq('project_id', editingProject.id);
      if (error) throw error;
      return data;
    },
    enabled: !!editingProject?.id,
  });

  // Track previous area_id to detect user-driven changes
  const [prevAreaId, setPrevAreaId] = useState('');

  // Filter categories by selected area
  const filteredCategories = useMemo(() => {
    if (!formData.area_id) return [];
    const validCategoryIds = areaCategoryLinks
      .filter(link => link.area_id === formData.area_id)
      .map(link => link.categoria_id);
    return taxCategorias.filter(cat => validCategoryIds.includes(cat.id));
  }, [formData.area_id, taxCategorias, areaCategoryLinks]);

  // Clear category_ids only when area changes by user action (not on initial edit load)
  useEffect(() => {
    if (prevAreaId && formData.area_id && prevAreaId !== formData.area_id) {
      setFormData(prev => ({ ...prev, category_ids: [] }));
    }
    setPrevAreaId(formData.area_id);
  }, [formData.area_id]);

  // When editing, load current members (leaders, subliders, members) into form
  useEffect(() => {
    if (editingProject && currentProjectMembers.length > 0) {
      const leaderUserIds = currentProjectMembers
        .filter(m => m.role === 'leader' || m.role === 'responsible')
        .map(m => m.user_id);
      const subliderUserIds = currentProjectMembers
        .filter(m => m.role === 'sublider')
        .map(m => m.user_id);
      const memberUserIds = currentProjectMembers
        .filter(m => m.role === 'member')
        .map(m => m.user_id);
      setFormData(prev => ({ ...prev, leader_ids: leaderUserIds, sublider_ids: subliderUserIds, member_ids: memberUserIds }));
    }
  }, [editingProject, currentProjectMembers]);

  // When editing, load current categories into form
  useEffect(() => {
    if (editingProject && currentProjectCategories.length > 0) {
      const catIds = currentProjectCategories.map(c => c.categoria_id);
      setFormData(prev => ({ ...prev, category_ids: catIds }));
    }
  }, [editingProject, currentProjectCategories]);

  const createProject = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: project, error } = await supabase.from('tax_projects').insert({
        name: data.name,
        description: data.description || null,
        status: data.status,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        responsible_id: data.leader_ids[0] || null,
        leader_id: data.leader_ids[0] || null,
        external_client_id: data.external_client_id || null,
        contribuinte_id: data.contribuinte_id || null,
        area_id: data.area_id || null,
        objective: data.objective || null,
        created_by: user?.id || null,
      }).select('id').single();
      if (error) throw error;

      // Insert project categories
      if (data.category_ids.length > 0) {
        const categoryRows = data.category_ids.map(catId => ({
          project_id: project.id,
          categoria_id: catId,
        }));
        const { error: catError } = await supabase.from('tax_project_categorias').insert(categoryRows);
        if (catError) throw catError;
      }

      // Insert project members
      const members: { project_id: string; user_id: string; role: string }[] = [];
      for (const uid of data.leader_ids) {
        members.push({ project_id: project.id, user_id: uid, role: 'leader' });
      }
      for (const uid of data.sublider_ids) {
        if (!members.some(m => m.user_id === uid)) {
          members.push({ project_id: project.id, user_id: uid, role: 'sublider' });
        }
      }
      for (const uid of data.member_ids) {
        if (!members.some(m => m.user_id === uid)) {
          members.push({ project_id: project.id, user_id: uid, role: 'member' });
        }
      }
      if (members.length > 0) {
        const { error: membersError } = await supabase.from('tax_project_members').upsert(members, { onConflict: 'project_id,user_id', ignoreDuplicates: true });
        if (membersError) throw membersError;
      }

      await logAction({
        area: 'tax', entity_type: 'project', entity_id: project.id,
        entity_name: data.name, action: 'created',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-projects-tax-area'] });
      toast.success('Projeto criado com sucesso');
      handleCloseModal();
    },
    onError: (error) => {
      toast.error('Erro ao criar projeto: ' + error.message);
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof formData) => {
      const changedFields: Record<string, { old: unknown; new: unknown }> = {};
      if (editingProject) {
        const ep = editingProject as any;
        const comparisons: [string, unknown, unknown][] = [
          ['name', ep.name, data.name],
          ['status', ep.status, data.status],
          ['start_date', ep.start_date || null, data.start_date || null],
          ['end_date', ep.end_date || null, data.end_date || null],
          ['area_id', ep.area_id || null, data.area_id || null],
          ['description', ep.description || null, data.description || null],
          ['responsible_id', ep.responsible_id || null, data.leader_ids[0] || null],
          ['leader_id', ep.leader_id || null, data.leader_ids[0] || null],
          ['external_client_id', ep.external_client_id || null, data.external_client_id || null],
          ['contribuinte_id', ep.contribuinte_id || null, data.contribuinte_id || null],
          ['objective', ep.objective || null, data.objective || null],
        ];
        for (const [field, oldVal, newVal] of comparisons) {
          if (oldVal !== newVal) changedFields[field] = { old: oldVal, new: newVal };
        }
        // Compare category_ids arrays
        const oldCatIds = currentProjectCategories.map(c => c.categoria_id).sort();
        const newCatIds = [...data.category_ids].sort();
        if (JSON.stringify(oldCatIds) !== JSON.stringify(newCatIds)) {
          changedFields.category_ids = { old: oldCatIds, new: newCatIds };
        }
        // Compare member_ids arrays
        const oldMemberIds = currentProjectMembers
          .filter(m => m.role === 'member')
          .map(m => m.user_id)
          .sort();
        const newMemberIds = [...data.member_ids].sort();
        if (JSON.stringify(oldMemberIds) !== JSON.stringify(newMemberIds)) {
          changedFields.member_ids = { old: oldMemberIds, new: newMemberIds };
        }
      }

      const { error } = await supabase
        .from('tax_projects')
        .update({
          name: data.name,
          description: data.description || null,
          status: data.status,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          responsible_id: data.leader_ids[0] || null,
          leader_id: data.leader_ids[0] || null,
          external_client_id: data.external_client_id || null,
          contribuinte_id: data.contribuinte_id || null,
          area_id: data.area_id || null,
          objective: data.objective || null,
        })
        .eq('id', id);
      if (error) throw error;

      // Replace project categories: delete all, re-insert
      await supabase.from('tax_project_categorias').delete().eq('project_id', id);
      if (data.category_ids.length > 0) {
        const categoryRows = data.category_ids.map(catId => ({
          project_id: id,
          categoria_id: catId,
        }));
        const { error: catError } = await supabase.from('tax_project_categorias').insert(categoryRows);
        if (catError) throw catError;
      }

      // Replace project members: delete all, re-insert
      const { error: delError } = await supabase.from('tax_project_members').delete().eq('project_id', id);
      if (delError) throw delError;
      const members: { project_id: string; user_id: string; role: string }[] = [];
      for (const uid of data.leader_ids) {
        members.push({ project_id: id, user_id: uid, role: 'leader' });
      }
      for (const uid of data.sublider_ids) {
        if (!members.some(m => m.user_id === uid)) {
          members.push({ project_id: id, user_id: uid, role: 'sublider' });
        }
      }
      for (const uid of data.member_ids) {
        if (!members.some(m => m.user_id === uid)) {
          members.push({ project_id: id, user_id: uid, role: 'member' });
        }
      }
      if (members.length > 0) {
        const { error: membersError } = await supabase.from('tax_project_members').upsert(members, { onConflict: 'project_id,user_id', ignoreDuplicates: true });
        if (membersError) throw membersError;
      }

      // Only log if something actually changed
      if (Object.keys(changedFields).length > 0) {
        await logAction({
          area: 'tax', entity_type: 'project', entity_id: id,
          entity_name: data.name, action: 'updated',
          changed_fields: changedFields,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-projects-tax-area'] });
      queryClient.invalidateQueries({ queryKey: ['tax-project-members'] });
      queryClient.invalidateQueries({ queryKey: ['tax-project-categorias'] });
      toast.success('Projeto atualizado');
      handleCloseModal();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const project = projects.find((p: any) => p.id === id);
      const { error } = await supabase.from('tax_projects').delete().eq('id', id);
      if (error) throw error;

      await logAction({
        area: 'tax', entity_type: 'project', entity_id: id,
        entity_name: project?.name || 'Projeto excluído', action: 'deleted',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-projects-tax-area'] });
      toast.success('Projeto excluído');
      setDeleteProjectId(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  const handleOpenModal = (project?: any) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        leader_ids: [],
        sublider_ids: [],
        external_client_id: project.external_client_id || '',
        contribuinte_id: project.contribuinte_id || '',
        area_id: project.area_id || '',
        objective: project.objective || '',
        category_ids: [],
        member_ids: [],
      });
    } else {
      setEditingProject(null);
      setFormData({ 
        name: '', description: '', status: 'active',
        start_date: '', end_date: '',
        leader_ids: [], sublider_ids: [], external_client_id: '', contribuinte_id: '',
        area_id: '', objective: '', category_ids: [], member_ids: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setFormData({ 
      name: '', description: '', status: 'active',
      start_date: '', end_date: '',
      leader_ids: [], sublider_ids: [], external_client_id: '', contribuinte_id: '',
      area_id: '', objective: '', category_ids: [], member_ids: [],
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (editingProject) {
      updateProject.mutate({ id: editingProject.id, ...formData });
    } else {
      createProject.mutate(formData);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(c => c !== categoryId)
        : [...prev.category_ids, categoryId],
    }));
  };

  const handleMemberToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(memberId)
        ? prev.member_ids.filter(id => id !== memberId)
        : [...prev.member_ids, memberId],
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700">Concluído</Badge>;
      case 'on_hold':
        return <Badge className="bg-amber-100 text-amber-700">Pausado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAreaLabel = (project: any) => {
    if (project.area_ref) return project.area_ref.nome;
    return '-';
  };

  const availableMembers = useMemo(() => {
    const excludeIds = new Set([...formData.leader_ids, ...formData.sublider_ids]);
    if (formData.sublider_ids.length === 0) return [];
    return teamMembers.filter(
      m => !excludeIds.has(m.id) && filteredMemberIds.includes(m.id)
    );
  }, [teamMembers, formData.leader_ids, formData.sublider_ids, filteredMemberIds]);

  return (
    <FiscalLayout title="Cadastro de Projetos" subtitle="Gerencie os projetos da área Tax">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Projetos Tax</h2>
              <p className="text-sm text-slate-500">{projects.length} projetos cadastrados</p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>

        {/* Projects Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contribuinte</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Horas Est.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      Nenhum projeto cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project: any) => (
                    <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenModal(project)}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{project.name}</span>
                          {project.objective && (
                            <p className="text-xs text-slate-500 truncate max-w-xs">{project.objective}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.external_client ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm">{project.external_client.nome}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {project.contribuinte ? (
                          <span className="text-sm">{project.contribuinte.nome_razao_social}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{getAreaLabel(project)}</span>
                      </TableCell>
                      <TableCell>
                        {project.responsible ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm">
                              {project.responsible.first_name} {project.responsible.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {project.start_date ? format(new Date(project.start_date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {project.end_date ? format(new Date(project.end_date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {projectHours[project.id] ? `${projectHours[project.id]}h` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(project)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteProjectId(project.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* 1. Cliente */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Cliente</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Cliente *</Label>
                    <Select
                      value={formData.external_client_id}
                      onValueChange={(value) => setFormData({ ...formData, external_client_id: value, contribuinte_id: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {externalClients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.nome} {client.setor_cliente && `(${client.setor_cliente})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Contribuinte</Label>
                    <Select
                      value={formData.contribuinte_id}
                      onValueChange={(value) => setFormData({ ...formData, contribuinte_id: value })}
                      disabled={!formData.external_client_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={formData.external_client_id ? "Selecione o contribuinte" : "Selecione um cliente primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {contribuintes.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome_razao_social} {c.cpf_cnpj && `(${c.cpf_cnpj})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 2. OS vinculadas (read-only) */}
              {formData.external_client_id && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Ordens de Serviço Vinculadas
                  </h3>
                  {clienteOS.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma OS encontrada para este cliente.</p>
                  ) : (
                    <div className="space-y-2">
                      {clienteOS.map((os: any) => {
                        const osId = getOsId(os);
                        const isSelected = selectedOsId === osId;
                        return (
                          <div
                            key={osId}
                            onClick={() => setSelectedOsId(osId)}
                            className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-200'
                                : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-medium text-sm">
                                OS: {getOsLabel(os)}
                              </span>
                              {isProductionEnvironment && os.situacao && (
                                <Badge variant="outline" className="text-xs">
                                  {os.situacao}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {os.data_inicio && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Início: {format(new Date(os.data_inicio + 'T00:00:00'), 'dd/MM/yyyy')}
                                </span>
                              )}
                              {os.data_fim && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Fim: {format(new Date(os.data_fim + 'T00:00:00'), 'dd/MM/yyyy')}
                                </span>
                              )}
                              {getOsValue(os) != null && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {Number(getOsValue(os)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              )}
                            </div>
                            {isProductionEnvironment && os.servicos_contratados && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {(Array.isArray(os.servicos_contratados)
                                  ? os.servicos_contratados
                                  : typeof os.servicos_contratados === 'object'
                                    ? Object.keys(os.servicos_contratados)
                                    : []
                                ).map((s: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs font-normal">{s}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <p className="text-xs text-muted-foreground">
                        {clienteOS.length > 1
                          ? 'Clique em uma OS para usar suas datas como sugestão.'
                          : 'OS selecionada automaticamente. Datas sugeridas no formulário abaixo.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome do Projeto *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do projeto"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="on_hold">Pausado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Área</Label>
                    <Select
                      value={formData.area_id}
                      onValueChange={(value) => setFormData({ ...formData, area_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a área" />
                      </SelectTrigger>
                      <SelectContent>
                        {taxAreas.map(area => (
                          <SelectItem key={area.id} value={area.id}>{area.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data de Início</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Data de Término</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 4. Integrantes */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Integrantes
                  </div>
                </h3>

                {/* Líder Geral (multi-select) */}
                <div>
                  <Label>Líder Geral</Label>
                  {formData.leader_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
                      {formData.leader_ids.map(id => {
                        const m = teamMembers.find(t => t.id === id);
                        return m ? (
                          <Badge key={id} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {m.first_name} {m.last_name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="border rounded-md overflow-hidden">
                    <div className="max-h-32 overflow-y-auto">
                      <table className="w-full text-sm">
                        <tbody>
                          {lideres.map((member, idx) => (
                            <tr
                              key={member.id}
                              className={`cursor-pointer hover:bg-accent/40 transition-colors ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  leader_ids: prev.leader_ids.includes(member.id)
                                    ? prev.leader_ids.filter(id => id !== member.id)
                                    : [...prev.leader_ids, member.id],
                                }));
                              }}
                            >
                              <td className="w-10 px-3 py-1.5">
                                <Checkbox checked={formData.leader_ids.includes(member.id)} onCheckedChange={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    leader_ids: prev.leader_ids.includes(member.id)
                                      ? prev.leader_ids.filter(id => id !== member.id)
                                      : [...prev.leader_ids, member.id],
                                  }));
                                }} />
                              </td>
                              <td className="px-3 py-1.5 font-medium text-foreground">
                                {member.first_name} {member.last_name}
                              </td>
                            </tr>
                          ))}
                          {lideres.length === 0 && (
                            <tr><td colSpan={2} className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum líder disponível</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Sublíder (multi-select) */}
                <div>
                  <Label>Sublíder</Label>
                  {formData.sublider_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
                      {formData.sublider_ids.map(id => {
                        const m = teamMembers.find(t => t.id === id);
                        return m ? (
                          <Badge key={id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {m.first_name} {m.last_name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="border rounded-md overflow-hidden">
                    <div className="max-h-32 overflow-y-auto">
                      <table className="w-full text-sm">
                        <tbody>
                          {sublideres.map((member, idx) => (
                            <tr
                              key={member.id}
                              className={`cursor-pointer hover:bg-accent/40 transition-colors ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  sublider_ids: prev.sublider_ids.includes(member.id)
                                    ? prev.sublider_ids.filter(id => id !== member.id)
                                    : [...prev.sublider_ids, member.id],
                                }));
                              }}
                            >
                              <td className="w-10 px-3 py-1.5">
                                <Checkbox checked={formData.sublider_ids.includes(member.id)} onCheckedChange={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    sublider_ids: prev.sublider_ids.includes(member.id)
                                      ? prev.sublider_ids.filter(id => id !== member.id)
                                      : [...prev.sublider_ids, member.id],
                                  }));
                                }} />
                              </td>
                              <td className="px-3 py-1.5 font-medium text-foreground">
                                {member.first_name} {member.last_name}
                              </td>
                            </tr>
                          ))}
                          {sublideres.length === 0 && (
                            <tr><td colSpan={2} className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum sublíder disponível</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Membros do Projeto (condicional à seleção de sublíderes) */}
                <div>
                  <Label>Membros do Projeto</Label>
                  {formData.sublider_ids.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecione ao menos um sublíder para ver os membros disponíveis.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mt-1 mb-2">
                        Membros das equipes dos sublíderes selecionados.
                      </p>
                      <div className="border rounded-md overflow-hidden">
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b sticky top-0 z-10">
                              <tr>
                                <th className="w-10 px-3 py-2 text-left">
                                  <Checkbox
                                    checked={availableMembers.length > 0 && availableMembers.every(m => formData.member_ids.includes(m.id))}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        const allIds = availableMembers.map(m => m.id);
                                        setFormData(prev => ({ ...prev, member_ids: [...new Set([...prev.member_ids, ...allIds])] }));
                                      } else {
                                        const removeIds = new Set(availableMembers.map(m => m.id));
                                        setFormData(prev => ({ ...prev, member_ids: prev.member_ids.filter(id => !removeIds.has(id)) }));
                                      }
                                    }}
                                  />
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Nome</th>
                              </tr>
                            </thead>
                            <tbody>
                              {availableMembers.map((member, idx) => (
                                <tr
                                  key={member.id}
                                  className={`cursor-pointer hover:bg-accent/40 transition-colors ${idx % 2 === 1 ? 'bg-muted/30' : ''}`}
                                  onClick={() => handleMemberToggle(member.id)}
                                >
                                  <td className="px-3 py-1.5">
                                    <Checkbox
                                      checked={formData.member_ids.includes(member.id)}
                                      onCheckedChange={() => handleMemberToggle(member.id)}
                                    />
                                  </td>
                                  <td className="px-3 py-1.5 font-medium text-foreground">
                                    {member.first_name} {member.last_name}
                                  </td>
                                </tr>
                              ))}
                              {availableMembers.length === 0 && (
                                <tr><td colSpan={2} className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum membro encontrado nas equipes dos sublíderes selecionados</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        {formData.member_ids.length > 0 && (
                          <div className="border-t px-3 py-1.5 text-xs text-muted-foreground bg-muted/50">
                            {formData.member_ids.length} membro{formData.member_ids.length !== 1 ? 's' : ''} selecionado{formData.member_ids.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 5. Objetivo, Descrição e Categorias */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Objetivo e Descrição</h3>
                <div>
                  <Label>Objetivo do Projeto</Label>
                  <Textarea
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                    placeholder="Descreva o objetivo principal do projeto"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Descrição Detalhada</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição completa do projeto"
                    rows={3}
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Categorias</h3>
                {!formData.area_id ? (
                  <p className="text-sm text-muted-foreground">Selecione uma área para ver as categorias disponíveis.</p>
                ) : filteredCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria vinculada a esta área.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredCategories.map(category => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={category.id}
                          checked={formData.category_ids.includes(category.id)}
                          onCheckedChange={() => handleCategoryToggle(category.id)}
                        />
                        <label
                          htmlFor={category.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {category.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createProject.isPending || updateProject.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {editingProject ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProjectId && deleteProject.mutate(deleteProjectId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FiscalLayout>
  );
};

export default FiscalProjetosCadastro;
