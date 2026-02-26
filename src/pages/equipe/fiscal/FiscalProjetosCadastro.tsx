import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, FolderKanban, User, Users, Building2 } from 'lucide-react';
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
    responsible_id: '',
    leader_id: '',
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
        .in('role', ['lider', 'team_member']);
      if (error) throw error;
      return data as { user_id: string; role: string }[];
    },
  });

  // Filtered lists based on roles
  const lideres = useMemo(() => {
    const liderIds = userRoles.filter(r => r.role === 'lider').map(r => r.user_id);
    return teamMembers.filter(m => liderIds.includes(m.id));
  }, [teamMembers, userRoles]);

  const responsaveisInternos = useMemo(() => {
    const teamMemberIds = userRoles.filter(r => r.role === 'team_member').map(r => r.user_id);
    const liderIds = userRoles.filter(r => r.role === 'lider').map(r => r.user_id);
    return teamMembers.filter(m => teamMemberIds.includes(m.id) && !liderIds.includes(m.id));
  }, [teamMembers, userRoles]);

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

  // When editing, load current members into form
  useEffect(() => {
    if (editingProject && currentProjectMembers.length > 0) {
      const memberUserIds = currentProjectMembers
        .filter(m => m.role === 'member')
        .map(m => m.user_id);
      setFormData(prev => ({ ...prev, member_ids: memberUserIds }));
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
        responsible_id: data.responsible_id || null,
        leader_id: data.leader_id || null,
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
      if (data.responsible_id) {
        members.push({ project_id: project.id, user_id: data.responsible_id, role: 'responsible' });
      }
      if (data.leader_id && data.leader_id !== data.responsible_id) {
        members.push({ project_id: project.id, user_id: data.leader_id, role: 'leader' });
      }
      for (const uid of data.member_ids) {
        if (!members.some(m => m.user_id === uid)) {
          members.push({ project_id: project.id, user_id: uid, role: 'member' });
        }
      }
      if (members.length > 0) {
        const { error: membersError } = await supabase.from('tax_project_members').insert(members);
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
          ['responsible_id', ep.responsible_id || null, data.responsible_id || null],
          ['leader_id', ep.leader_id || null, data.leader_id || null],
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
          responsible_id: data.responsible_id || null,
          leader_id: data.leader_id || null,
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
      await supabase.from('tax_project_members').delete().eq('project_id', id);
      const members: { project_id: string; user_id: string; role: string }[] = [];
      if (data.responsible_id) {
        members.push({ project_id: id, user_id: data.responsible_id, role: 'responsible' });
      }
      if (data.leader_id && data.leader_id !== data.responsible_id) {
        members.push({ project_id: id, user_id: data.leader_id, role: 'leader' });
      }
      for (const uid of data.member_ids) {
        if (!members.some(m => m.user_id === uid)) {
          members.push({ project_id: id, user_id: uid, role: 'member' });
        }
      }
      if (members.length > 0) {
        const { error: membersError } = await supabase.from('tax_project_members').insert(members);
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
        responsible_id: project.responsible_id || '',
        leader_id: project.leader_id || '',
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
        responsible_id: '', leader_id: '', external_client_id: '', contribuinte_id: '',
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
      responsible_id: '', leader_id: '', external_client_id: '', contribuinte_id: '',
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

  const availableMembers = teamMembers.filter(
    m => m.id !== formData.responsible_id && m.id !== formData.leader_id
  );

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
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      Nenhum projeto cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project: any) => (
                    <TableRow key={project.id}>
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
              {/* Basic Info */}
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
                </div>
              </div>

              {/* Client & Team */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Cliente e Equipe</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Cliente</Label>
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
                   <div>
                    <Label>Responsável Interno</Label>
                    <Select
                      value={formData.responsible_id}
                      onValueChange={(value) => setFormData({ ...formData, responsible_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {responsaveisInternos.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Líder Responsável</Label>
                    <Select
                      value={formData.leader_id}
                      onValueChange={(value) => setFormData({ ...formData, leader_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {lideres.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Project Members */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Membros do Projeto
                  </div>
                </h3>
                <p className="text-xs text-slate-500">
                  O Responsável Interno e o Líder são adicionados automaticamente. Selecione os demais membros que terão acesso ao projeto e suas tarefas.
                </p>
                {(formData.responsible_id || formData.leader_id) && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.responsible_id && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        <User className="h-3 w-3 mr-1" />
                        {teamMembers.find(m => m.id === formData.responsible_id)?.first_name}{' '}
                        {teamMembers.find(m => m.id === formData.responsible_id)?.last_name} (Responsável)
                      </Badge>
                    )}
                    {formData.leader_id && formData.leader_id !== formData.responsible_id && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <User className="h-3 w-3 mr-1" />
                        {teamMembers.find(m => m.id === formData.leader_id)?.first_name}{' '}
                        {teamMembers.find(m => m.id === formData.leader_id)?.last_name} (Líder)
                      </Badge>
                    )}
                  </div>
                )}
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b sticky top-0 z-10">
                        <tr>
                          <th className="w-10 px-3 py-2 text-left">
                            <Checkbox
                              checked={availableMembers.length > 0 && availableMembers.every(m => formData.member_ids.includes(m.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const allIds = availableMembers.map(m => m.id);
                                  setFormData({ ...formData, member_ids: [...new Set([...formData.member_ids, ...allIds])] });
                                } else {
                                  const removeIds = new Set(availableMembers.map(m => m.id));
                                  setFormData({ ...formData, member_ids: formData.member_ids.filter(id => !removeIds.has(id)) });
                                }
                              }}
                            />
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Nome</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableMembers.map((member, idx) => (
                          <tr
                            key={member.id}
                            className={`cursor-pointer hover:bg-teal-50/60 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                            onClick={() => handleMemberToggle(member.id)}
                          >
                            <td className="px-3 py-1.5">
                              <Checkbox
                                checked={formData.member_ids.includes(member.id)}
                                onCheckedChange={() => handleMemberToggle(member.id)}
                              />
                            </td>
                            <td className="px-3 py-1.5 font-medium text-slate-900">
                              {member.first_name} {member.last_name}
                            </td>
                            <td className="px-3 py-1.5 text-slate-500">{member.first_name} {member.last_name}</td>
                          </tr>
                        ))}
                        {availableMembers.length === 0 && (
                          <tr><td colSpan={3} className="px-3 py-3 text-xs text-slate-400 text-center">Nenhum membro disponível</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {formData.member_ids.length > 0 && (
                    <div className="border-t px-3 py-1.5 text-xs text-slate-500 bg-slate-50">
                      {formData.member_ids.length} membro{formData.member_ids.length !== 1 ? 's' : ''} selecionado{formData.member_ids.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Objective & Description */}
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
                  <p className="text-sm text-slate-400">Selecione uma área para ver as categorias disponíveis.</p>
                ) : filteredCategories.length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhuma categoria vinculada a esta área.</p>
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
