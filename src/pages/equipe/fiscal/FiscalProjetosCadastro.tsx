import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, FolderKanban, User, Users, Building2, FileText, Calendar, Check, ChevronsUpDown, UsersRound } from 'lucide-react';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useServicosPrestados,
  useAreaServicos,
  useTeamProfilesSafe,
  useTeamRolesForProjects,
  useSubliderTeamMembers,
  useExternalClients,
  useContribuintes,
  useClienteOrdens,
  type OrdemServico,
} from '@/hooks/useTaxReferenceData';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useTaxAreas } from '@/hooks/useTaxAreas';
import {
  useTaxProjects,
  useProjectMembers,
  useProjectServicos,
  useProjectHours,
  useCreateTaxProject,
  useUpdateTaxProject,
  useDeleteTaxProject,
  TaxProject,
} from '@/hooks/useTaxProjects';
import { useEstruturaArea } from '@/hooks/useEstruturaArea';
import { useServicosContratados } from '@/hooks/useServicosContratados';


const FiscalProjetosCadastro = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<TaxProject | null>(null);
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
    ordem_servico_id: '',
  });

  // ── Hooks centralizados ──────────────────────────────────────────────
  const { data: taxAreas = [] } = useTaxAreas();
  const { data: projects = [], isLoading } = useTaxProjects();
  const { data: projectHours = {} } = useProjectHours();
  const { data: currentProjectMembers = [] } = useProjectMembers(editingProject?.id);
  const { data: currentProjectCategories = [] } = useProjectServicos(editingProject?.id);

  // Derive estruturaAreaId from selected tax area
  const selectedTaxArea = taxAreas.find(a => a.id === formData.area_id);
  const estruturaAreaId = selectedTaxArea?.estrutura_area_id || null;

  const {
    liderIds: areaLiderIds,
    subliderIds: areaSubliderIds,
    memberIds: areaMemberIds,
  } = useEstruturaArea(estruturaAreaId);

  const { suggestedCategoryIds } = useServicosContratados(formData.external_client_id || null);
  const suggestedSet = useMemo(() => new Set(suggestedCategoryIds), [suggestedCategoryIds]);

  const createProject = useCreateTaxProject();
  const updateProject = useUpdateTaxProject();
  const deleteProjectMut = useDeleteTaxProject();

  // ── Queries centralizadas via hooks ────────────────────────────────────
  const { data: taxCategorias = [] } = useServicosPrestados();
  const { data: areaCategoryLinks = [] } = useAreaServicos();
  const { data: teamMembers = [] } = useTeamProfilesSafe();
  const { data: userRoles = [] } = useTeamRolesForProjects();

  // Filtered lists based on roles + area structure
  const lideres = useMemo(() => {
    const liderIds = userRoles.filter(r => r.role === 'lider').map(r => r.user_id);
    const allLideres = teamMembers.filter(m => liderIds.includes(m.id));
    if (estruturaAreaId && areaLiderIds.length > 0) {
      const selectedSet = new Set(formData.leader_ids);
      const filtered = allLideres.filter(m => areaLiderIds.includes(m.id) || selectedSet.has(m.id));
      return filtered.length > 0 ? filtered : allLideres;
    }
    return allLideres;
  }, [teamMembers, userRoles, estruturaAreaId, areaLiderIds, formData.leader_ids]);

  const sublideres = useMemo(() => {
    const subliderRoleIds = userRoles.filter(r => r.role === 'sublider').map(r => r.user_id);
    const allSublideres = teamMembers.filter(m => subliderRoleIds.includes(m.id));
    if (estruturaAreaId && areaSubliderIds.length > 0) {
      const selectedSet = new Set(formData.sublider_ids);
      const filtered = allSublideres.filter(m => areaSubliderIds.includes(m.id) || selectedSet.has(m.id));
      return filtered.length > 0 ? filtered : allSublideres;
    }
    return allSublideres;
  }, [teamMembers, userRoles, estruturaAreaId, areaSubliderIds, formData.sublider_ids]);

  const { data: filteredMemberIds = [] } = useSubliderTeamMembers(
    formData.sublider_ids,
    !estruturaAreaId && formData.sublider_ids.length > 0,
  );
  const { data: externalClients = [] } = useExternalClients(editingProject?.external_client_id);
  const { data: contribuintes = [] } = useContribuintes(
    formData.external_client_id || null,
    editingProject?.contribuinte_id,
  );
  const { data: clienteOS = [] } = useClienteOrdens(formData.external_client_id || null);

  // Helper to get OS fields via typed interface
  const getOsId = (os: OrdemServico): string => os.id;
  const getOsLabel = (os: OrdemServico): string => os.numero_os || 'Sem número';
  const getOsValue = (os: OrdemServico): number | null => os.valor_projeto;

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
    const os = clienteOS.find((o) => getOsId(o) === selectedOsId);
    if (!os) return;
    setFormData(prev => ({
      ...prev,
      start_date: prev.start_date || os.data_inicio || '',
      end_date: prev.end_date || os.data_fim || '',
    }));
  }, [selectedOsId]);

  // Track previous area_id to detect user-driven changes
  const [prevAreaId, setPrevAreaId] = useState('');

  // Filter categories by selected area
  const filteredCategories = useMemo(() => {
    if (!formData.area_id) return [];
    const validCategoryIds = areaCategoryLinks
      .filter(link => link.area_id === formData.area_id)
      .map(link => link.servico_id);
    return taxCategorias.filter(cat => validCategoryIds.includes(cat.id));
  }, [formData.area_id, taxCategorias, areaCategoryLinks]);

  // Clear fields when area changes by user action
  useEffect(() => {
    if (prevAreaId && formData.area_id && prevAreaId !== formData.area_id) {
      setFormData(prev => ({ ...prev, leader_ids: [], sublider_ids: [], member_ids: [], category_ids: [] }));
    }
    setPrevAreaId(formData.area_id);
  }, [formData.area_id]);

  // Auto-fill leader when area has exactly 1 leader (only on create)
  useEffect(() => {
    if (!estruturaAreaId || editingProject) return;
    if (areaLiderIds.length === 1) {
      setFormData(prev => {
        if (prev.leader_ids.length === 0) {
          return { ...prev, leader_ids: [areaLiderIds[0]] };
        }
        return prev;
      });
    }
  }, [estruturaAreaId, areaLiderIds, editingProject]);

  // When editing, load current members — migrate roles based on current user_roles
  useEffect(() => {
    if (editingProject && currentProjectMembers.length > 0 && userRoles.length > 0) {
      const roleMap = new Map(userRoles.map(r => [r.user_id, r.role]));
      const leaderUserIds: string[] = [];
      const subliderUserIds: string[] = [];
      const memberUserIds: string[] = [];

      for (const m of currentProjectMembers) {
        const currentRole = roleMap.get(m.user_id);
        if (currentRole === 'lider') {
          leaderUserIds.push(m.user_id);
        } else if (currentRole === 'sublider') {
          subliderUserIds.push(m.user_id);
        } else {
          memberUserIds.push(m.user_id);
        }
      }

      setFormData(prev => ({ ...prev, leader_ids: leaderUserIds, sublider_ids: subliderUserIds, member_ids: memberUserIds }));
    }
  }, [editingProject, currentProjectMembers, userRoles]);

  // When editing, load current categories into form
  useEffect(() => {
    if (editingProject && currentProjectCategories.length > 0) {
      const catIds = currentProjectCategories.map((c: any) => c.servico_id);
      setFormData(prev => ({ ...prev, category_ids: catIds }));
    }
  }, [editingProject, currentProjectCategories]);

  const handleOpenModal = (project?: any) => {
    if (project) {
      setEditingProject(project);
      setSelectedOsId(project.ordem_servico_id || null);
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
        ordem_servico_id: project.ordem_servico_id || '',
      });
    } else {
      setEditingProject(null);
      setFormData({ 
        name: '', description: '', status: 'active',
        start_date: '', end_date: '',
        leader_ids: [], sublider_ids: [], external_client_id: '', contribuinte_id: '',
        area_id: '', objective: '', category_ids: [], member_ids: [],
        ordem_servico_id: '',
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
    if (formData.leader_ids.length === 0) {
      toast.error('Selecione ao menos um Líder Geral');
      return;
    }
    if (editingProject) {
      updateProject.mutate(
        {
          id: editingProject.id,
          data: formData,
          oldProject: editingProject,
          oldMembers: currentProjectMembers,
          oldCategoryIds: currentProjectCategories.map((c: any) => c.servico_id),
        },
        { onSuccess: handleCloseModal }
      );
    } else {
      createProject.mutate(formData, { onSuccess: handleCloseModal });
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

  const getOsSituacaoBadge = (situacao: string | null) => {
    if (!situacao) return null;
    switch (situacao) {
      case 'em_andamento':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Em Andamento</Badge>;
      case 'concluida':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Concluída</Badge>;
      case 'pendente':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Pendente</Badge>;
      case 'cancelada':
        return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Cancelada</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{situacao}</Badge>;
    }
  };

  const getServicoName = (servicoId: string | null): string | null => {
    if (!servicoId) return null;
    const cat = taxCategorias.find(c => c.id === servicoId);
    return cat?.nome || null;
  };

  const getAreaLabel = (project: any) => {
    if (project.area_ref) return project.area_ref.nome;
    return '-';
  };

  const availableMembers = useMemo(() => {
    const excludeIds = new Set([...formData.leader_ids, ...formData.sublider_ids]);
    const selectedSet = new Set(formData.member_ids);

    if (estruturaAreaId) {
      if (areaMemberIds.length === 0 && selectedSet.size === 0) return [];
      return teamMembers.filter(
        m => !excludeIds.has(m.id) && (areaMemberIds.includes(m.id) || selectedSet.has(m.id))
      );
    }

    if (formData.sublider_ids.length === 0 && selectedSet.size === 0) return [];
    return teamMembers.filter(
      m => !excludeIds.has(m.id) && (filteredMemberIds.includes(m.id) || selectedSet.has(m.id))
    );
  }, [teamMembers, formData.leader_ids, formData.sublider_ids, formData.member_ids, filteredMemberIds, estruturaAreaId, areaMemberIds]);

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
                  <TableHead>Projeto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Carregando projetos...
                    </TableCell>
                  </TableRow>
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum projeto cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project: any) => (
                    <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenModal(project)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium">{project.name}</span>
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
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-4">
            <div className="space-y-6">
              {/* 1. Cliente */}
              <div className="space-y-4">
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
                            {client.nome}
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
                                ? 'border-blue-400 bg-blue-50/60 ring-1 ring-blue-200'
                                : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-medium text-sm">
                                OS: {getOsLabel(os)}
                              </span>
                              {getOsSituacaoBadge(os.situacao)}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {os.data_emissao && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Emissão: {format(new Date(os.data_emissao + 'T00:00:00'), 'dd/MM/yyyy')}
                                </span>
                              )}
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
                            </div>
                            {(() => {
                              const servicoName = getServicoName(os.id_servico);
                              return servicoName ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {servicoName}
                                  </Badge>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        );
                      })}
                      <p className="text-xs text-muted-foreground">
                        {clienteOS.length > 1
                          ? `Este cliente possui ${clienteOS.length} ordens de serviço. Clique em uma OS para preencher as datas automaticamente.`
                          : 'OS única selecionada automaticamente — datas de início e término preenchidas.'}
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

                {/* Líder Geral (multi-select dropdown) */}
                <div>
                  <Label>Líder Geral</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-auto min-h-10 mt-1">
                        {formData.leader_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {formData.leader_ids.map(id => {
                              const m = teamMembers.find(t => t.id === id);
                              return m ? (
                                <Badge key={id} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  {m.first_name} {m.last_name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Selecionar líderes...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar líder..." />
                        <CommandList>
                          <CommandEmpty>Nenhum líder encontrado.</CommandEmpty>
                          <CommandGroup>
                            {lideres.map(member => (
                              <CommandItem
                                key={member.id}
                                value={`${member.first_name} ${member.last_name}`}
                                onSelect={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    leader_ids: prev.leader_ids.includes(member.id)
                                      ? prev.leader_ids.filter(id => id !== member.id)
                                      : [...prev.leader_ids, member.id],
                                  }));
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${formData.leader_ids.includes(member.id) ? 'opacity-100' : 'opacity-0'}`} />
                                {member.first_name} {member.last_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Sublíder (multi-select dropdown) */}
                <div>
                  <Label>Sublíder</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-auto min-h-10 mt-1">
                        {formData.sublider_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {formData.sublider_ids.map(id => {
                              const m = teamMembers.find(t => t.id === id);
                              return m ? (
                                <Badge key={id} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {m.first_name} {m.last_name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Selecionar sublíderes...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar sublíder..." />
                        <CommandList>
                          <CommandEmpty>Nenhum sublíder encontrado.</CommandEmpty>
                          <CommandGroup>
                            {sublideres.map(member => (
                              <CommandItem
                                key={member.id}
                                value={`${member.first_name} ${member.last_name}`}
                                onSelect={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    sublider_ids: prev.sublider_ids.includes(member.id)
                                      ? prev.sublider_ids.filter(id => id !== member.id)
                                      : [...prev.sublider_ids, member.id],
                                  }));
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${formData.sublider_ids.includes(member.id) ? 'opacity-100' : 'opacity-0'}`} />
                                {member.first_name} {member.last_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Membros do Projeto (multi-select dropdown) */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Membros do Projeto</Label>
                    {estruturaAreaId && areaMemberIds.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                        onClick={() => {
                          const excludeIds = new Set([...formData.leader_ids, ...formData.sublider_ids]);
                          const eligibleIds = areaMemberIds.filter(id => !excludeIds.has(id));
                          setFormData(prev => ({
                            ...prev,
                            member_ids: [...new Set([...prev.member_ids, ...eligibleIds])],
                          }));
                        }}
                      >
                        <UsersRound className="h-3.5 w-3.5" />
                        Incluir todos da área
                      </Button>
                    )}
                  </div>
                  {!estruturaAreaId && formData.sublider_ids.length === 0 && formData.member_ids.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecione ao menos um sublíder para ver os membros disponíveis.
                    </p>
                  ) : estruturaAreaId && areaMemberIds.length === 0 && formData.member_ids.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Nenhum membro encontrado na estrutura desta área.
                    </p>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-auto min-h-10 mt-1">
                          {formData.member_ids.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {formData.member_ids.map(id => {
                                const m = teamMembers.find(t => t.id === id);
                                return m ? (
                                  <Badge key={id} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                    {m.first_name} {m.last_name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Selecionar membros...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar membro..." />
                          <CommandList>
                            <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__select_all__"
                                onSelect={() => {
                                  const allIds = availableMembers.map(m => m.id);
                                  const allSelected = allIds.every(id => formData.member_ids.includes(id));
                                  if (allSelected) {
                                    const removeIds = new Set(allIds);
                                    setFormData(prev => ({ ...prev, member_ids: prev.member_ids.filter(id => !removeIds.has(id)) }));
                                  } else {
                                    setFormData(prev => ({ ...prev, member_ids: [...new Set([...prev.member_ids, ...allIds])] }));
                                  }
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${availableMembers.length > 0 && availableMembers.every(m => formData.member_ids.includes(m.id)) ? 'opacity-100' : 'opacity-0'}`} />
                                <span className="font-medium">Selecionar todos</span>
                              </CommandItem>
                              {availableMembers.map(member => (
                                <CommandItem
                                  key={member.id}
                                  value={`${member.first_name} ${member.last_name}`}
                                  onSelect={() => handleMemberToggle(member.id)}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${formData.member_ids.includes(member.id) ? 'opacity-100' : 'opacity-0'}`} />
                                  {member.first_name} {member.last_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  {formData.member_ids.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.member_ids.length} membro{formData.member_ids.length !== 1 ? 's' : ''} selecionado{formData.member_ids.length !== 1 ? 's' : ''}
                    </p>
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

              {/* Categories (multi-select dropdown) */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Categorias</h3>
                {!formData.area_id ? (
                  <p className="text-sm text-muted-foreground">Selecione uma área para ver as categorias disponíveis.</p>
                ) : filteredCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma categoria vinculada a esta área.</p>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-auto min-h-10">
                        {formData.category_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {formData.category_ids.map(id => {
                              const cat = filteredCategories.find(c => c.id === id);
                              return cat ? (
                                <Badge key={id} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                  {cat.nome}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Selecionar categorias...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar categoria..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                          <CommandGroup>
                            {filteredCategories.map(category => (
                              <CommandItem
                                key={category.id}
                                value={category.nome}
                                onSelect={() => handleCategoryToggle(category.id)}
                              >
                                <Check className={`mr-2 h-4 w-4 ${formData.category_ids.includes(category.id) ? 'opacity-100' : 'opacity-0'}`} />
                                {category.nome}
                                {suggestedSet.has(category.id) && (
                                  <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 hover:bg-emerald-100">
                                    Contratado
                                  </Badge>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {/* Bottom padding so last fields aren't hidden behind footer */}
              <div className="pb-4" />
            </div>
          </div>
          <DialogFooter className="border-t pt-4 mt-0">
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
              onClick={() => {
                if (deleteProjectId) {
                  const project = projects.find((p: any) => p.id === deleteProjectId);
                  deleteProjectMut.mutate(
                    { id: deleteProjectId, name: project?.name || 'Projeto excluído' },
                    { onSuccess: () => setDeleteProjectId(null) }
                  );
                }
              }}
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
