import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, FolderKanban, User, Users, Building2 } from 'lucide-react';
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
  area: string | null;
  objective: string | null;
  categories: string[] | null;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

interface ExternalClient {
  id: string;
  nome: string;
  setor_cliente: string | null;
}

const AREA_OPTIONS = [
  { value: 'tributario', label: 'Tributário' },
  { value: 'contabil', label: 'Contábil' },
  { value: 'previdenciario', label: 'Previdenciário' },
  { value: 'societario', label: 'Societário' },
  { value: 'consultivo', label: 'Consultivo' },
  { value: 'outro', label: 'Outro' },
];

const CATEGORY_OPTIONS = [
  'Recuperação de Crédito',
  'Planejamento Tributário',
  'Compliance Fiscal',
  'Auditoria',
  'Consultoria',
  'Due Diligence',
  'Contencioso',
  'Revisão de Obrigações',
];

const FiscalProjetosCadastro = () => {
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    responsible_id: '',
    leader_id: '',
    external_client_id: '',
    area: '',
    objective: '',
    categories: [] as string[],
    member_ids: [] as string[],
  });

  // Fetch team members (profiles)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');
      if (error) throw error;
      return data as Profile[];
    },
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

  // Fetch projects for Tax area
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['fiscal-projects-tax-area'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_projects')
        .select(`
          *,
          responsible:profiles!tax_projects_responsible_id_fkey(id, first_name, last_name),
          leader:profiles!tax_projects_leader_id_fkey(id, first_name, last_name),
          external_client:cliente!tax_projects_external_client_id_fkey(id, nome)
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

  // When editing, load current members into form
  useEffect(() => {
    if (editingProject && currentProjectMembers.length > 0) {
      const memberUserIds = currentProjectMembers
        .filter(m => m.role === 'member')
        .map(m => m.user_id);
      setFormData(prev => ({ ...prev, member_ids: memberUserIds }));
    }
  }, [editingProject, currentProjectMembers]);

  const createProject = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: project, error } = await supabase.from('tax_projects').insert({
        name: data.name,
        description: data.description || null,
        status: data.status,
        responsible_id: data.responsible_id || null,
        leader_id: data.leader_id || null,
        external_client_id: data.external_client_id || null,
        area: data.area || null,
        objective: data.objective || null,
        categories: data.categories.length > 0 ? data.categories : null,
      }).select('id').single();
      if (error) throw error;

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

      // Audit log
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
      // Build changed_fields by comparing with editingProject
      const changedFields: Record<string, { old: unknown; new: unknown }> = {};
      if (editingProject) {
        if (data.name !== editingProject.name) changedFields.name = { old: editingProject.name, new: data.name };
        if (data.status !== editingProject.status) changedFields.status = { old: editingProject.status, new: data.status };
        if ((data.area || null) !== (editingProject.area || null)) changedFields.area = { old: editingProject.area, new: data.area };
        if ((data.description || null) !== (editingProject.description || null)) changedFields.description = { old: editingProject.description, new: data.description };
      }

      const { error } = await supabase
        .from('tax_projects')
        .update({
          name: data.name,
          description: data.description || null,
          status: data.status,
          responsible_id: data.responsible_id || null,
          leader_id: data.leader_id || null,
          external_client_id: data.external_client_id || null,
          area: data.area || null,
          objective: data.objective || null,
          categories: data.categories.length > 0 ? data.categories : null,
        })
        .eq('id', id);
      if (error) throw error;

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

      // Audit log
      await logAction({
        area: 'tax', entity_type: 'project', entity_id: id,
        entity_name: data.name, action: 'updated',
        changed_fields: Object.keys(changedFields).length > 0 ? changedFields : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-projects-tax-area'] });
      queryClient.invalidateQueries({ queryKey: ['tax-project-members'] });
      toast.success('Projeto atualizado');
      handleCloseModal();
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      // Get project name for audit log before deleting
      const project = projects.find((p: any) => p.id === id);
      const { error } = await supabase.from('tax_projects').delete().eq('id', id);
      if (error) throw error;

      // Audit log
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

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        responsible_id: project.responsible_id || '',
        leader_id: project.leader_id || '',
        external_client_id: project.external_client_id || '',
        area: project.area || '',
        objective: project.objective || '',
        categories: project.categories || [],
        member_ids: [],
      });
    } else {
      setEditingProject(null);
      setFormData({ 
        name: '', 
        description: '', 
        status: 'active',
        responsible_id: '',
        leader_id: '',
        external_client_id: '',
        area: '',
        objective: '',
        categories: [],
        member_ids: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setFormData({ 
      name: '', 
      description: '', 
      status: 'active',
      responsible_id: '',
      leader_id: '',
      external_client_id: '',
      area: '',
      objective: '',
      categories: [],
      member_ids: [],
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

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
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

  const getAreaLabel = (area: string | null) => {
    if (!area) return '-';
    return AREA_OPTIONS.find(a => a.value === area)?.label || area;
  };

  // Filter team members for the members section (exclude responsible & leader)
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
                  <TableHead>Área</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
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
                        <span className="text-sm">{getAreaLabel(project.area)}</span>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(project)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
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
                    <Label>Área</Label>
                    <Select
                      value={formData.area}
                      onValueChange={(value) => setFormData({ ...formData, area: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a área" />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                      onValueChange={(value) => setFormData({ ...formData, external_client_id: value })}
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
                        {teamMembers.map(member => (
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
                        {teamMembers.map(member => (
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
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {availableMembers.map(member => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={formData.member_ids.includes(member.id)}
                        onCheckedChange={() => handleMemberToggle(member.id)}
                      />
                      <label
                        htmlFor={`member-${member.id}`}
                        className="text-sm leading-none cursor-pointer"
                      >
                        {member.first_name} {member.last_name}
                      </label>
                    </div>
                  ))}
                  {availableMembers.length === 0 && (
                    <p className="text-xs text-slate-400 col-span-2">Nenhum membro disponível</p>
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
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORY_OPTIONS.map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={category}
                        checked={formData.categories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <label
                        htmlFor={category}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
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
