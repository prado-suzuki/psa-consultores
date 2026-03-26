import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, FolderKanban, User, Users, Building2, FileText, Calendar, Check, ChevronsUpDown, UsersRound, Filter, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  useTeamProfilesSafe,
  useTeamRolesForProjects,
  useExternalClients,
  useClienteOrdens,
  type OrdemServico,
} from '@/hooks/useTaxReferenceData';
import { useClientFormOptions } from '@/hooks/useClientFormOptions';
import { useOsProdutosContratados, groupByOs } from '@/hooks/useOsProdutosContratados';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { parseDate } from '@/lib/dateUtils';
import { useEstruturaAreas } from '@/hooks/useEstruturaAreas';
import {
  useTaxProjects,
  useProjectMembers,
  useProjectHours,
  useCreateTaxProject,
  useUpdateTaxProject,
  useDeleteTaxProject,
  TaxProject,
} from '@/hooks/useTaxProjects';
import { useEstruturaArea } from '@/hooks/useEstruturaArea';

const emptyForm = {
  name: '',
  description: '',
  status: 'active',
  start_date: '',
  end_date: '',
  leader_ids: [] as string[],
  external_client_id: '',
  estrutura_area_id: '',
  member_ids: [] as string[],
  ordem_servico_id: '',
  servico_id: '',
};

const FiscalProjetosCadastro = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<TaxProject | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [filterCliente, setFilterCliente] = useState('');
  const [filterProduto, setFilterProduto] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // ── Hooks centralizados ──────────────────────────────────────────────
  const { data: estruturaAreas = [] } = useEstruturaAreas('tax');
  const { data: projects = [], isLoading } = useTaxProjects();
  const { data: projectHours = {} } = useProjectHours();

  // ── Filtros locais ───────────────────────────────────────────────────
  const filterOptions = useMemo(() => {
    const clientesMap = new Map<string, string>();
    const produtosSet = new Set<string>();
    const statusSet = new Set<string>();
    for (const p of projects) {
      if (p.external_client_id && p.external_client?.nome) {
        clientesMap.set(p.external_client_id, p.external_client.nome);
      }
      if (p.servico_contratado) produtosSet.add(p.servico_contratado);
      if (p.status) statusSet.add(p.status);
    }
    return {
      clientes: Array.from(clientesMap, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome)),
      produtos: Array.from(produtosSet).sort(),
      status: Array.from(statusSet),
    };
  }, [projects]);

  const getSortValue = (project: any, col: string): string => {
    switch (col) {
      case 'name': return project.name || '';
      case 'produto': return project.servico_contratado || '';
      case 'cliente': return project.external_client?.nome || '';
      case 'area': return project.area_ref?.name || '';
      case 'responsavel': return project.responsible ? `${project.responsible.first_name} ${project.responsible.last_name}` : '';
      case 'status': return project.status || '';
      default: return '';
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary" />;
  };

  const filteredProjects = useMemo(() => {
    const filtered = projects.filter(p => {
      if (filterCliente && p.external_client_id !== filterCliente) return false;
      if (filterProduto && p.servico_contratado !== filterProduto) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
    if (sortColumn) {
      filtered.sort((a, b) => {
        const valA = getSortValue(a, sortColumn).toLowerCase();
        const valB = getSortValue(b, sortColumn).toLowerCase();
        const cmp = valA.localeCompare(valB, 'pt-BR');
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }
    return filtered;
  }, [projects, filterCliente, filterProduto, filterStatus, sortColumn, sortDirection]);

  const hasActiveFilters = !!(filterCliente || filterProduto || filterStatus);
  const clearFilters = () => { setFilterCliente(''); setFilterProduto(''); setFilterStatus(''); };

  const statusLabelMap: Record<string, string> = {
    active: 'Ativo', completed: 'Concluído', on_hold: 'Pausado', cancelled: 'Cancelado',
  };
  const { data: currentProjectMembers = [] } = useProjectMembers(editingProject?.id);

  const estruturaAreaId = formData.estrutura_area_id || null;

  const {
    liderIds: areaLiderIds,
    memberIds: areaMemberIds,
  } = useEstruturaArea(estruturaAreaId);

  const createProject = useCreateTaxProject();
  const updateProject = useUpdateTaxProject();
  const deleteProjectMut = useDeleteTaxProject();

  const { data: teamMembers = [] } = useTeamProfilesSafe();
  const { data: userRoles = [] } = useTeamRolesForProjects();

  const { data: externalClients = [] } = useExternalClients(editingProject?.external_client_id);
  const { data: clienteOS = [] } = useClienteOrdens(formData.external_client_id || null);
  const { produtoSegmentoFullOptions } = useClientFormOptions();

  const getOsId = (os: OrdemServico): string => os.id;
  const getOsLabel = (os: OrdemServico): string => os.numero_os || 'Sem número';

  const [selectedOsId, setSelectedOsId] = useState<string | null>(null);

  // Resolve produto from selected OS for service filtering
  const selectedOs = useMemo(() => clienteOS.find(o => getOsId(o) === selectedOsId), [clienteOS, selectedOsId]);
  const selectedProdutoId = selectedOs?.id_produto_segmento || null;

  // Fetch serviços vinculados ao produto da OS selecionada
  interface ProdutoServicoRow { servico_prestado_id: string; servico: { id: string; nome: string } | null }
  const { data: servicosByProduto = [] } = useQuery({
    queryKey: ['project-servicos-by-produto', selectedProdutoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produto_servico')
        .select('servico_prestado_id, servico:servicos_prestados(id, nome)')
        .eq('produto_segmento_id', selectedProdutoId!) as {
          data: ProdutoServicoRow[] | null; error: unknown;
        };
      if (error) throw error;
      return (data || [])
        .map(r => r.servico)
        .filter((s): s is { id: string; nome: string } => !!s);
    },
    enabled: !!selectedProdutoId,
  });

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

  // Sync ordem_servico_id + auto-fill dates from selected OS + clear servico
  useEffect(() => {
    setFormData(prev => ({ ...prev, ordem_servico_id: selectedOsId || '', servico_id: '' }));
    if (!selectedOsId || editingProject) return;
    const os = clienteOS.find((o) => getOsId(o) === selectedOsId);
    if (!os) return;
    setFormData(prev => ({
      ...prev,
      ordem_servico_id: selectedOsId,
      start_date: prev.start_date || os.data_inicio || '',
      end_date: prev.end_date || os.data_fim || '',
    }));
  }, [selectedOsId]);

  // Track previous estrutura_area_id to detect user-driven changes
  const [prevAreaId, setPrevAreaId] = useState('');

  // Clear fields when area changes by user action
  useEffect(() => {
    if (prevAreaId && formData.estrutura_area_id && prevAreaId !== formData.estrutura_area_id) {
      setFormData(prev => ({ ...prev, leader_ids: [], member_ids: [] }));
    }
    setPrevAreaId(formData.estrutura_area_id);
  }, [formData.estrutura_area_id]);

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

  // When editing, load current members
  useEffect(() => {
    if (editingProject && currentProjectMembers.length > 0 && userRoles.length > 0) {
      const roleMap = new Map(userRoles.map(r => [r.user_id, r.role]));
      const leaderUserIds: string[] = [];
      const memberUserIds: string[] = [];

      for (const m of currentProjectMembers) {
        const currentRole = roleMap.get(m.user_id);
        if (currentRole === 'lider') {
          leaderUserIds.push(m.user_id);
        } else {
          memberUserIds.push(m.user_id);
        }
      }

      setFormData(prev => ({ ...prev, leader_ids: leaderUserIds, member_ids: memberUserIds }));
    }
  }, [editingProject, currentProjectMembers, userRoles]);

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
  }, [teamMembers, userRoles, formData.estrutura_area_id, areaLiderIds, formData.leader_ids]);

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
        external_client_id: project.external_client_id || '',
        estrutura_area_id: project.estrutura_area_id || '',
        member_ids: [],
        ordem_servico_id: project.ordem_servico_id || '',
        servico_id: (project as any).servico_id || '',
      });
    } else {
      setEditingProject(null);
      setFormData({ ...emptyForm });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setFormData({ ...emptyForm });
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
        },
        { onSuccess: handleCloseModal }
      );
    } else {
      createProject.mutate(formData, { onSuccess: handleCloseModal });
    }
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

  const getAreaLabel = (project: any) => {
    if (project.area_ref) return project.area_ref.name;
    return '-';
  };

  const availableMembers = useMemo(() => {
    const excludeIds = new Set(formData.leader_ids);
    const selectedSet = new Set(formData.member_ids);

    if (estruturaAreaId) {
      if (areaMemberIds.length === 0 && selectedSet.size === 0) return [];
      return teamMembers.filter(
        m => !excludeIds.has(m.id) && (areaMemberIds.includes(m.id) || selectedSet.has(m.id))
      );
    }

    // No area selected — show only already-selected members
    if (selectedSet.size === 0) return [];
    return teamMembers.filter(m => !excludeIds.has(m.id) && selectedSet.has(m.id));
  }, [teamMembers, formData.leader_ids, formData.member_ids, estruturaAreaId, areaMemberIds]);

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
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? `${filteredProjects.length} de ${projects.length} projetos`
                  : `${projects.length} projetos cadastrados`}
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCliente} onValueChange={v => setFilterCliente(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-52">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {filterOptions.clientes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterProduto} onValueChange={v => setFilterProduto(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-52">
              <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {filterOptions.produtos.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={v => setFilterStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {filterOptions.status.map(s => (
                <SelectItem key={s} value={s}>{statusLabelMap[s] || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>

        {/* Projects Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                    <div className="flex items-center">Projeto<SortIcon column="name" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('produto')}>
                    <div className="flex items-center">Produto<SortIcon column="produto" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('cliente')}>
                    <div className="flex items-center">Cliente<SortIcon column="cliente" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('area')}>
                    <div className="flex items-center">Área<SortIcon column="area" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('responsavel')}>
                    <div className="flex items-center">Responsável<SortIcon column="responsavel" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                    <div className="flex items-center">Status<SortIcon column="status" /></div>
                  </TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Carregando projetos...
                    </TableCell>
                  </TableRow>
                ) : filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {hasActiveFilters ? 'Nenhum projeto encontrado com os filtros aplicados.' : 'Nenhum projeto cadastrado.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project: any) => (
                    <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenModal(project)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium">{project.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{project.servico_contratado || '-'}</span>
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

              {/* ── SEÇÃO 1: IDENTIFICAÇÃO ─────────────────────────── */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Identificação
                </h3>

                {/* Cliente */}
                <div>
                  <Label>Cliente *</Label>
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
                          {client.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* OS vinculadas (read-only) */}
                {formData.external_client_id && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Ordens de Serviço Vinculadas
                    </Label>
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
                                  {(() => {
                                    const p = os.id_produto_segmento
                                      ? produtoSegmentoFullOptions.find(ps => ps.id === os.id_produto_segmento)
                                      : null;
                                    return p
                                      ? `OS: ${getOsLabel(os)} — ${p.codigo} — ${p.nome}`
                                      : `OS: ${getOsLabel(os)}`;
                                  })()}
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

                {/* Serviço (filtrado pelo produto da OS selecionada) */}
                {selectedOsId && (
                  <div>
                    <Label>Serviço</Label>
                    <Select
                      value={formData.servico_id}
                      onValueChange={(value) => setFormData({ ...formData, servico_id: value === '_none' ? '' : value })}
                      disabled={!selectedProdutoId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !selectedProdutoId
                            ? "OS sem produto cadastrado"
                            : "Selecione o serviço"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Nenhum</SelectItem>
                        {servicosByProduto.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Nome do Projeto */}
                <div>
                  <Label>Nome do Projeto *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do projeto"
                  />
                </div>

                {/* Área + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Área *</Label>
                    <Select
                      value={formData.estrutura_area_id}
                      onValueChange={(value) => setFormData({ ...formData, estrutura_area_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a área" />
                      </SelectTrigger>
                      <SelectContent>
                        {estruturaAreas.map(area => (
                          <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                </div>
              </div>

              {/* ── SEÇÃO 2: PERÍODO ───────────────────────────────── */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Período
                </h3>
                <div className="grid grid-cols-2 gap-4">
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

              {/* ── SEÇÃO 3: EQUIPE ────────────────────────────────── */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Equipe
                </h3>

                {/* Líder Geral */}
                <div>
                  <Label>Líder Geral *</Label>
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

                {/* Membros do Projeto */}
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
                          const excludeIds = new Set(formData.leader_ids);
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
                  {!estruturaAreaId && formData.member_ids.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecione uma área para ver os membros disponíveis.
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

              {/* ── SEÇÃO 4: DETALHES ──────────────────────────────── */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Detalhes</h3>
                <div>
                  <Label>Descrição do Projeto</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do projeto"
                    rows={3}
                  />
                </div>
              </div>

              {/* Bottom padding */}
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
