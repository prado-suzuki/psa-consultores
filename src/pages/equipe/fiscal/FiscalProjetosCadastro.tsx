import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { Plus, Pencil, Trash2, FolderKanban, User, Users, Building2, FileText, Calendar, Check, ChevronsUpDown, UsersRound, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, Crown, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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
import {
  useOrgProjects,
  useProjectMembers,
  useProjectHours,
  useCreateOrgProject,
  useUpdateOrgProject,
  useDeleteOrgProject,
  OrgProject,
} from '@/hooks/useOrgProjects';
import { useEstruturaEquipe } from '@/hooks/useEstruturaEquipe';
import { useEstruturaEquipesByCategory } from '@/hooks/useEstruturaEquipes';
import { useTeamMembersByArea } from '@/hooks/useTeamMembersByArea';
import { useProjectMemberAreas } from '@/hooks/useProjectMemberAreas';
import { Switch } from '@/components/ui/switch';

const emptyForm = {
  name: '',
  description: '',
  status: 'active',
  start_date: '',
  end_date: '',
  leader_ids: [] as string[],
  responsible_id: '',
  external_client_id: '',
  estrutura_area_id: '',
  equipe_id: '',
  is_multidisciplinar: false,
  member_ids: [] as string[],
  ordem_servico_id: '',
  servico_id: '',
};

const FiscalProjetosCadastro = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<OrgProject | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [filterCliente, setFilterCliente] = useState('');
  const [filterProduto, setFilterProduto] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [groupBy, setGroupBy] = useState<'none' | 'cliente' | 'equipe' | 'area'>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const isOpeningEditRef = useRef(false);

  // ── Hooks centralizados ──────────────────────────────────────────────
  const { data: equipesOptions = [] } = useEstruturaEquipesByCategory('tax');
  const { data: projects = [], isLoading } = useOrgProjects();
  const { data: projectHours = {} } = useProjectHours();
  const { data: projectMemberAreas = {} } = useProjectMemberAreas();

  // Fetch OS products for listing table (all projects' ordem_servico_id)
  const listingOsIds = useMemo(() => {
    const ids = projects.map(p => (p as any).ordem_servico_id).filter(Boolean) as string[];
    return [...new Set(ids)];
  }, [projects]);
  const { data: listingOsProdutos = [] } = useOsProdutosContratados(listingOsIds);
  const listingOsProdutosByOs = useMemo(() => groupByOs(listingOsProdutos), [listingOsProdutos]);
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
      case 'servico': return project.servico_nome || '';
      case 'cliente': return project.external_client?.nome || '';
      case 'equipe': return project.equipe_ref?.name || '';
      case 'pessoas': return project.responsible ? `${project.responsible.first_name} ${project.responsible.last_name}` : '';
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

  // ── Agrupamento dinâmico ─────────────────────────────────────────────
  const groupedProjects = useMemo(() => {
    if (groupBy === 'none') return null;
    const map = new Map<string, { label: string; projects: OrgProject[] }>();
    for (const p of filteredProjects) {
      let key: string;
      let label: string;
      if (groupBy === 'cliente') {
        key = p.external_client_id || '__none__';
        label = p.external_client?.nome || 'Sem cliente';
      } else if (groupBy === 'area') {
        const memberAreas = projectMemberAreas[p.id];
        if (memberAreas && memberAreas.names.length > 0) {
          key = memberAreas.ids.join('|');
          label = memberAreas.names.join(' + ');
        } else {
          key = '__none__';
          label = 'Sem área';
        }
      } else {
        key = p.equipe_id || '__none__';
        label = p.equipe_ref?.name || 'Sem equipe';
      }
      if (!map.has(key)) map.set(key, { label, projects: [] });
      map.get(key)!.projects.push(p);
    }
    return Array.from(map.values()).sort((a, b) => {
      const aIsNone = a.label.startsWith('Sem ');
      const bIsNone = b.label.startsWith('Sem ');
      if (aIsNone !== bIsNone) return aIsNone ? 1 : -1;
      return a.label.localeCompare(b.label, 'pt-BR');
    });
  }, [filteredProjects, groupBy, projectMemberAreas]);

  useEffect(() => {
    setCollapsedGroups(new Set());
  }, [groupBy]);

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) { next.delete(label); } else { next.add(label); }
      return next;
    });
  };

  const statusLabelMap: Record<string, string> = {
    planned: 'Planejado', active: 'Ativo', completed: 'Concluído', on_hold: 'Pausado', cancelled: 'Cancelado',
  };
  const { data: currentProjectMembers = [] } = useProjectMembers(editingProject?.id);

  const equipeId = formData.equipe_id || null;

  const {
    equipeInfo,
    liderIds: equipeLiderIds,
    memberIds: equipeMemberIds,
  } = useEstruturaEquipe(equipeId);

  // Auto-derive estrutura_area_id from selected equipe to keep backwards-compat
  useEffect(() => {
    const newAreaId = equipeInfo?.area_id || '';
    if (newAreaId && newAreaId !== formData.estrutura_area_id) {
      setFormData(prev => ({ ...prev, estrutura_area_id: newAreaId }));
    }
  }, [equipeInfo?.area_id]);

  const { data: areaGroupsData } = useTeamMembersByArea();
  const allAreaGroups = areaGroupsData?.groups || [];
  const currentUserAreaIds = useMemo(
    () => areaGroupsData?.currentUserAreaIds || [],
    [areaGroupsData]
  );

  const [collapsedAreaGroups, setCollapsedAreaGroups] = useState<Set<string>>(new Set());
  const collapsedInitializedRef = useRef(false);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (collapsedInitializedRef.current) return;
    if (!areaGroupsData || areaGroupsData.groups.length === 0) return;
    collapsedInitializedRef.current = true;
    const userSet = new Set(areaGroupsData.currentUserAreaIds);
    setCollapsedAreaGroups(
      new Set(
        areaGroupsData.groups
          .filter(g => !userSet.has(g.area_id))
          .map(g => g.area_id)
      )
    );
  }, [areaGroupsData]);

  const toggleAreaGroup = (areaId: string) => {
    setCollapsedAreaGroups(prev => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  };

  const createProject = useCreateOrgProject();
  const updateProject = useUpdateOrgProject();
  const deleteProjectMut = useDeleteOrgProject();

  const { data: teamMembers = [] } = useTeamProfilesSafe();
  const { data: userRoles = [] } = useTeamRolesForProjects();

  const { data: externalClients = [] } = useExternalClients(editingProject?.external_client_id);
  const { data: clienteOS = [] } = useClienteOrdens(formData.external_client_id || null);
  const { produtoSegmentoFullOptions } = useClientFormOptions();

  const getOsId = (os: OrdemServico): string => os.id;
  const getOsLabel = (os: OrdemServico): string => os.numero_os || 'Sem número';

  const [selectedOsId, setSelectedOsId] = useState<string | null>(null);
  const [selectedProdutoId, setSelectedProdutoId] = useState<string | null>(null);

  // Fetch produtos contratados for all OS of the selected client
  const osIds = useMemo(() => clienteOS.map(os => getOsId(os)), [clienteOS]);
  const { data: osProdutos = [] } = useOsProdutosContratados(osIds);
  const osProdutosByOs = useMemo(() => groupByOs(osProdutos), [osProdutos]);

  // Products of the selected OS
  const selectedOsProdutos = useMemo(
    () => selectedOsId ? (osProdutosByOs[selectedOsId] || []) : [],
    [osProdutosByOs, selectedOsId]
  );

  // Auto-select produto if OS has exactly 1 product
  useEffect(() => {
    if (isOpeningEditRef.current) return;
    if (selectedOsProdutos.length === 1) {
      setSelectedProdutoId(selectedOsProdutos[0].produto_segmento_id);
    } else {
      setSelectedProdutoId(null);
    }
  }, [selectedOsProdutos]);

  // Fetch serviços vinculados ao produto selecionado
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

  // Resolve produto from servico_id when editing (async lookup)
  useEffect(() => {
    if (!editingProject || !formData.servico_id || selectedProdutoId) return;
    if (selectedOsProdutos.length === 0) return;
    const produtoIds = selectedOsProdutos.map(p => p.produto_segmento_id);
    supabase
      .from('produto_servico')
      .select('produto_segmento_id')
      .eq('servico_prestado_id', formData.servico_id)
      .in('produto_segmento_id', produtoIds)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSelectedProdutoId(data[0].produto_segmento_id);
        }
      });
  }, [editingProject, formData.servico_id, selectedOsProdutos, selectedProdutoId]);

  useEffect(() => {
    if (!formData.external_client_id) {
      setSelectedOsId(null);
      return;
    }
    if (clienteOS.length === 1) {
      const osId = getOsId(clienteOS[0]);
      setSelectedOsId(prev => prev === osId ? prev : osId);
    }
  }, [clienteOS, formData.external_client_id]);

  // Sync ordem_servico_id + auto-fill dates from selected OS + clear servico + clear produto
  useEffect(() => {
    if (isOpeningEditRef.current) {
      setFormData(prev => ({ ...prev, ordem_servico_id: selectedOsId || '' }));
      isOpeningEditRef.current = false;
      return;
    }
    // Skip clearing if editing and OS hasn't actually changed
    if (editingProject && formData.ordem_servico_id === (selectedOsId || '')) {
      return;
    }
    setFormData(prev => ({ ...prev, ordem_servico_id: selectedOsId || '', servico_id: '' }));
    setSelectedProdutoId(null);
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

  // Track previous equipe_id to detect user-driven changes
  const [prevEquipeId, setPrevEquipeId] = useState('');

  // Clear fields when equipe changes by user action
  useEffect(() => {
    if (prevEquipeId && formData.equipe_id && prevEquipeId !== formData.equipe_id) {
      setFormData(prev => ({ ...prev, leader_ids: [], member_ids: [] }));
    }
    setPrevEquipeId(formData.equipe_id);
  }, [formData.equipe_id]);

  // Auto-fill leader when equipe has exactly 1 gestor (only on create)
  useEffect(() => {
    if (!equipeId || editingProject) return;
    if (equipeLiderIds.length === 1) {
      setFormData(prev => {
        if (prev.leader_ids.length === 0) {
          return { ...prev, leader_ids: [equipeLiderIds[0]] };
        }
        return prev;
      });
    }
  }, [equipeId, equipeLiderIds, editingProject]);

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

  // Filtered lists based on roles + equipe structure
  const lideres = useMemo(() => {
    const liderIds = userRoles.filter(r => r.role === 'lider').map(r => r.user_id);
    const allLideres = teamMembers.filter(m => liderIds.includes(m.id));
    if (equipeId && equipeLiderIds.length > 0) {
      const selectedSet = new Set(formData.leader_ids);
      const filtered = allLideres.filter(m => equipeLiderIds.includes(m.id) || selectedSet.has(m.id));
      return filtered.length > 0 ? filtered : allLideres;
    }
    return allLideres;
  }, [teamMembers, userRoles, equipeId, equipeLiderIds, formData.leader_ids]);

  // Executores: only team_member or sublider (never lider/admin)
  const executores = useMemo(() => {
    const excludedRoles = new Set(['lider', 'admin']);
    const allowedRoles = new Set(['team_member', 'sublider']);
    const roleMap = new Map(userRoles.map(r => [r.user_id, r.role]));
    const eligible = teamMembers.filter(m => {
      const role = roleMap.get(m.id);
      if (!role) return false;
      if (excludedRoles.has(role)) return false;
      return allowedRoles.has(role);
    });
    if (equipeId && equipeMemberIds.length > 0) {
      const equipeSet = new Set(equipeMemberIds);
      const filtered = eligible.filter(m => equipeSet.has(m.id) || m.id === formData.responsible_id);
      return filtered.length > 0 ? filtered : eligible;
    }
    return eligible;
  }, [teamMembers, userRoles, equipeId, equipeMemberIds, formData.responsible_id]);

  const handleOpenModal = (project?: any) => {
    if (project) {
      setEditingProject(project);
      isOpeningEditRef.current = true;
      setSelectedOsId(project.ordem_servico_id || null);
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        leader_ids: [],
        responsible_id: project.responsible_id || '',
        external_client_id: project.external_client_id || '',
        estrutura_area_id: project.estrutura_area_id || '',
        equipe_id: project.equipe_id || '',
        is_multidisciplinar: !!project.is_multidisciplinar,
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
    if (!formData.external_client_id) {
      toast.error('Selecione o Cliente');
      return;
    }
    if (selectedOsId && selectedOsProdutos.length >= 1 && !selectedProdutoId) {
      toast.error('Selecione o Produto Contratado');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.equipe_id) {
      toast.error('Selecione a Equipe');
      return;
    }
    if (!formData.status) {
      toast.error('Selecione o Status');
      return;
    }
    if (formData.leader_ids.length === 0) {
      toast.error('Selecione ao menos um Líder Geral');
      return;
    }
    if (!formData.responsible_id) {
      toast.error('Selecione o Responsável Executor');
      return;
    }
    if (formData.member_ids.length === 0) {
      toast.error('Selecione ao menos um Membro do Projeto');
      return;
    }
    if (!formData.start_date) {
      toast.error('Data de Início é obrigatória');
      return;
    }
    if (!formData.end_date) {
      toast.error('Data de Término é obrigatória');
      return;
    }
    if (formData.start_date > formData.end_date) {
      toast.error('Data de Término deve ser posterior à Data de Início');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Descrição do Projeto é obrigatória');
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

  const getEquipeLabel = (project: any) => {
    if (project.equipe_ref) return project.equipe_ref.name;
    return '-';
  };

  const availableMembers = useMemo(() => {
    const excludeIds = new Set(formData.leader_ids);
    const selectedSet = new Set(formData.member_ids);

    if (formData.is_multidisciplinar) {
      // Show all internal users (deduplicated across area groups)
      const all = new Map<string, { id: string; first_name: string; last_name: string }>();
      for (const g of allAreaGroups) {
        for (const m of g.members) all.set(m.id, m);
      }
      return [...all.values()].filter(m => !excludeIds.has(m.id));
    }

    if (equipeId) {
      if (equipeMemberIds.length === 0 && selectedSet.size === 0) return [];
      return teamMembers.filter(
        m => !excludeIds.has(m.id) && (equipeMemberIds.includes(m.id) || selectedSet.has(m.id))
      );
    }

    // No equipe selected — show only already-selected members
    if (selectedSet.size === 0) return [];
    return teamMembers.filter(m => !excludeIds.has(m.id) && selectedSet.has(m.id));
  }, [teamMembers, formData.leader_ids, formData.member_ids, formData.is_multidisciplinar, equipeId, equipeMemberIds, allAreaGroups]);

  // Area groups filtered for the multidisciplinar selector
  const availableMembersByArea = useMemo(() => {
    if (!formData.is_multidisciplinar) return [];
    const excludeIds = new Set(formData.leader_ids);
    return allAreaGroups
      .map(g => ({
        ...g,
        members: g.members.filter(m => !excludeIds.has(m.id)),
        equipes: g.equipes
          .map(e => ({ ...e, members: e.members.filter(m => !excludeIds.has(m.id)) }))
          .filter(e => e.members.length > 0),
      }))
      .filter(g => g.members.length > 0);
  }, [formData.is_multidisciplinar, formData.leader_ids, allAreaGroups]);

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

          <Select value={groupBy} onValueChange={v => setGroupBy(v as 'none' | 'cliente' | 'equipe' | 'area')}>
            <SelectTrigger className="w-48">
              <Layers className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Agrupar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem agrupamento</SelectItem>
              <SelectItem value="cliente">Agrupar por Cliente</SelectItem>
              <SelectItem value="equipe">Agrupar por Equipe</SelectItem>
              <SelectItem value="area">Agrupar por Área</SelectItem>
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
        {(() => {
          const renderTableHeader = () => (
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: '18%' }} className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Projeto<SortIcon column="name" /></div>
                </TableHead>
                <TableHead style={{ width: '14%' }} className="cursor-pointer select-none" onClick={() => handleSort('produto')}>
                  <div className="flex items-center">Produto<SortIcon column="produto" /></div>
                </TableHead>
                <TableHead style={{ width: '12%' }} className="cursor-pointer select-none" onClick={() => handleSort('servico')}>
                  <div className="flex items-center">Serviço<SortIcon column="servico" /></div>
                </TableHead>
                <TableHead style={{ width: '11%' }} className="cursor-pointer select-none" onClick={() => handleSort('cliente')}>
                  <div className="flex items-center">Cliente<SortIcon column="cliente" /></div>
                </TableHead>
                <TableHead style={{ width: '8%' }} className="cursor-pointer select-none" onClick={() => handleSort('equipe')}>
                  <div className="flex items-center">Equipe<SortIcon column="equipe" /></div>
                </TableHead>
                <TableHead style={{ width: '9%' }} className="cursor-pointer select-none" onClick={() => handleSort('pessoas')}>
                  <div className="flex items-center">Pessoas<SortIcon column="pessoas" /></div>
                </TableHead>
                <TableHead style={{ width: '7%' }} className="cursor-pointer select-none whitespace-nowrap" onClick={() => handleSort('status')}>
                  <div className="flex items-center">Status<SortIcon column="status" /></div>
                </TableHead>
                <TableHead style={{ width: '7%' }} className="whitespace-nowrap">Início</TableHead>
                <TableHead style={{ width: '7%' }} className="whitespace-nowrap">Término</TableHead>
                <TableHead style={{ width: '6%' }} className="whitespace-nowrap text-right">Hrs Contr.</TableHead>
                <TableHead style={{ width: '6%' }} className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
          );

          const renderProjectRow = (project: OrgProject) => {
            const executorName = project.responsible
              ? `${project.responsible.first_name} ${project.responsible.last_name}`
              : null;
            const liderName = project.leader
              ? `${project.leader.first_name} ${project.leader.last_name}`
              : null;
            const osId = (project as any).ordem_servico_id;
            const osProds = osId ? (listingOsProdutosByOs[osId] || []) : [];
            const totalHrsContratadas = osProds.reduce((sum, p) => sum + (p.horas_contratadas ?? 0), 0);
            return (
              <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenModal(project)}>
                <TableCell className="whitespace-normal break-words">
                  <span className="font-medium">{project.name}</span>
                </TableCell>
                <TableCell className="whitespace-normal break-words">
                  <span className="text-sm">{project.servico_contratado || '-'}</span>
                </TableCell>
                <TableCell className="whitespace-normal break-words">
                  <span className="text-sm">{project.servico_nome || '-'}</span>
                </TableCell>
                <TableCell className="truncate max-w-0" title={project.external_client?.nome || '-'}>
                  {project.external_client ? (
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{project.external_client.nome}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="text-sm">{getEquipeLabel(project)}</span>
                </TableCell>
                <TableCell
                  title={[
                    executorName ? `${executorName} (executor)` : null,
                    liderName ? `${liderName} (líder)` : null,
                  ].filter(Boolean).join(' / ')}
                >
                  <div className="space-y-0.5">
                    {executorName && project.responsible ? (
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{`${project.responsible.first_name} ${project.responsible.last_name.charAt(0)}.`}</span>
                      </div>
                    ) : null}
                    {liderName && liderName !== executorName && project.leader ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Crown className="h-3 w-3 shrink-0" />
                        <span className="truncate">{`${project.leader.first_name} ${project.leader.last_name.charAt(0)}.`}</span>
                      </div>
                    ) : null}
                    {!executorName && !liderName && <span className="text-muted-foreground">-</span>}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{getStatusBadge(project.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {project.start_date ? format(parseDate(project.start_date), 'dd/MM/yy') : '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {project.end_date ? format(parseDate(project.end_date), 'dd/MM/yy') : '-'}
                </TableCell>
                <TableCell className="text-sm text-right text-muted-foreground whitespace-nowrap">
                  {totalHrsContratadas > 0 ? `${totalHrsContratadas}h` : '-'}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(project)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteProjectId(project.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          };

          if (!groupedProjects) {
            return (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="table-fixed min-w-[1000px]">
                    {renderTableHeader()}
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                            Carregando projetos...
                          </TableCell>
                        </TableRow>
                      ) : filteredProjects.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                            {hasActiveFilters ? 'Nenhum projeto encontrado com os filtros aplicados.' : 'Nenhum projeto cadastrado.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProjects.map(renderProjectRow)
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          }

          // Grouped rendering
          if (isLoading) {
            return (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Carregando projetos...
                </CardContent>
              </Card>
            );
          }

          if (groupedProjects.length === 0) {
            return (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {hasActiveFilters ? 'Nenhum projeto encontrado com os filtros aplicados.' : 'Nenhum projeto cadastrado.'}
                </CardContent>
              </Card>
            );
          }

          return (
            <div className="space-y-4">
              {groupedProjects.map(group => {
                const isCollapsed = collapsedGroups.has(group.label);
                const completedCount = group.projects.filter(p => p.status === 'completed').length;
                const progressPercent = group.projects.length > 0
                  ? Math.round((completedCount / group.projects.length) * 100)
                  : 0;

                return (
                  <div key={group.label}>
                    <div
                      className="bg-muted rounded-lg px-4 py-2.5 flex items-center gap-3 cursor-pointer select-none hover:bg-muted/80 transition-colors"
                      onClick={() => toggleGroup(group.label)}
                    >
                      {isCollapsed
                        ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <span className="font-semibold text-sm">{group.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {group.projects.length} {group.projects.length === 1 ? 'projeto' : 'projetos'}
                      </Badge>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-muted-foreground">{progressPercent}%</span>
                        <Progress value={progressPercent} className="h-1.5 w-24" />
                      </div>
                    </div>
                    {!isCollapsed && (
                      <Card className="mt-1 border-t-0 rounded-t-none">
                        <CardContent className="p-0 overflow-x-auto">
                          <Table className="table-fixed min-w-[1000px]">
                            {renderTableHeader()}
                            <TableBody>
                              {group.projects.map(renderProjectRow)}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
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
                          const osProdList = osProdutosByOs[osId] || [];
                          const prodLabel = osProdList.length > 0
                            ? osProdList.map(p => [p.produto_codigo, p.produto_nome].filter(Boolean).join(' — ')).join(', ')
                            : null;
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
                                  {prodLabel
                                    ? `OS: ${getOsLabel(os)} — ${prodLabel}`
                                    : `OS: ${getOsLabel(os)}`}
                                </span>
                                {getOsSituacaoBadge(os.situacao)}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {os.data_emissao && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Emissão: {format(parseDate(os.data_emissao), 'dd/MM/yyyy')}
                                  </span>
                                )}
                                {os.data_inicio && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Início: {format(parseDate(os.data_inicio), 'dd/MM/yyyy')}
                                  </span>
                                )}
                                {os.data_fim && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Fim: {format(parseDate(os.data_fim), 'dd/MM/yyyy')}
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

                {/* Produto Contratado (seletor derivado da OS) */}
                {selectedOsId && selectedOsProdutos.length >= 1 && (
                  <div>
                    <Label>Produto Contratado *</Label>
                    <Select
                      value={selectedProdutoId || '_none'}
                      onValueChange={(value) => {
                        setSelectedProdutoId(value === '_none' ? null : value);
                        setFormData(prev => ({ ...prev, servico_id: '' }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Selecione...</SelectItem>
                        {selectedOsProdutos.map((p) => (
                          <SelectItem key={p.produto_segmento_id} value={p.produto_segmento_id}>
                            {p.produto_codigo} — {p.produto_nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Serviço (filtrado pelo produto selecionado) */}
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
                            ? selectedOsProdutos.length === 0
                              ? "OS sem produto cadastrado"
                              : "Selecione um produto primeiro"
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

                {/* Equipe + Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Equipe *</Label>
                    <Select
                      value={formData.equipe_id}
                      onValueChange={(value) => {
                        const eq = equipesOptions.find(e => e.id === value);
                        setFormData(prev => ({
                          ...prev,
                          equipe_id: value,
                          estrutura_area_id: eq?.area_id || prev.estrutura_area_id,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a equipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipesOptions.map(eq => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {eq.name}
                            {eq.area_name ? <span className="text-xs text-muted-foreground ml-1">— {eq.area_name}</span> : null}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status <span className="text-destructive">*</span></Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planejado</SelectItem>
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
                    <Label>Data de Início <span className="text-destructive">*</span></Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Data de Término <span className="text-destructive">*</span></Label>
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

                {/* Responsável Executor */}
                <div>
                  <Label>Responsável Executor *</Label>
                  <Select
                    value={formData.responsible_id}
                    onValueChange={(value) => setFormData({ ...formData, responsible_id: value === '_none' ? '' : value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o executor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Selecione...</SelectItem>
                      {executores.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.first_name} {member.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Toggle Multidisciplinar */}
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Multidisciplinar</Label>
                    <p className="text-xs text-muted-foreground">
                      Permite selecionar membros de qualquer equipe, agrupados por área.
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_multidisciplinar}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, is_multidisciplinar: checked }))
                    }
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label>Membros do Projeto <span className="text-destructive">*</span></Label>
                    {!formData.is_multidisciplinar && equipeId && equipeMemberIds.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                        onClick={() => {
                          const excludeIds = new Set(formData.leader_ids);
                          const eligibleIds = equipeMemberIds.filter(id => !excludeIds.has(id));
                          setFormData(prev => ({
                            ...prev,
                            member_ids: [...new Set([...prev.member_ids, ...eligibleIds])],
                          }));
                        }}
                      >
                        <UsersRound className="h-3.5 w-3.5" />
                        Incluir todos da equipe
                      </Button>
                    )}
                  </div>
                  {!formData.is_multidisciplinar && !equipeId && formData.member_ids.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecione uma equipe para ver os membros disponíveis.
                    </p>
                  ) : !formData.is_multidisciplinar && equipeId && equipeMemberIds.length === 0 && formData.member_ids.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Nenhum membro encontrado nesta equipe.
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
                          <CommandInput
                            placeholder="Buscar membro..."
                            value={memberSearch}
                            onValueChange={setMemberSearch}
                          />
                          <CommandList>
                            <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                            {formData.is_multidisciplinar ? (
                              availableMembersByArea.map(group => {
                                const hasSearch = memberSearch.trim().length > 0;
                                const isCollapsed = collapsedAreaGroups.has(group.area_id) && !hasSearch;
                                const allSelectedInGroup = group.members.length > 0 && group.members.every(m => formData.member_ids.includes(m.id));
                                return (
                                  <CommandGroup key={group.area_id}>
                                    <CommandItem
                                      value={`__area_header_${group.area_id}__ ${group.area_name} ${group.cluster_name}`}
                                      onSelect={() => toggleAreaGroup(group.area_id)}
                                      className="bg-muted/40 data-[selected=true]:bg-muted font-semibold"
                                    >
                                      {isCollapsed
                                        ? <ChevronRight className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                        : <ChevronDown className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />}
                                      <span className="flex-1 truncate">{group.area_name}</span>
                                      {group.cluster_name && (
                                        <span className="ml-2 text-xs font-normal text-muted-foreground truncate">
                                          {group.cluster_name}
                                        </span>
                                      )}
                                      <Badge variant="secondary" className="ml-2 text-xs">
                                        {group.members.length}
                                      </Badge>
                                    </CommandItem>
                                    {!isCollapsed && (
                                      <>
                                        <CommandItem
                                          value={`__select_all_area_${group.area_id}__`}
                                          onSelect={() => {
                                            const ids = group.members.map(m => m.id);
                                            const allSelected = ids.every(id => formData.member_ids.includes(id));
                                            if (allSelected) {
                                              const removeIds = new Set(ids);
                                              setFormData(prev => ({ ...prev, member_ids: prev.member_ids.filter(id => !removeIds.has(id)) }));
                                            } else {
                                              setFormData(prev => ({ ...prev, member_ids: [...new Set([...prev.member_ids, ...ids])] }));
                                            }
                                          }}
                                          className="pl-6"
                                        >
                                          <Check className={`mr-2 h-4 w-4 ${allSelectedInGroup ? 'opacity-100' : 'opacity-0'}`} />
                                          <span className="font-medium">Selecionar todos da área</span>
                                        </CommandItem>
                                        {hasSearch || group.equipes.length <= 1 ? (
                                          group.members.map(member => (
                                            <CommandItem
                                              key={`${group.area_id}-${member.id}`}
                                              value={`${member.first_name} ${member.last_name} ${group.area_name}`}
                                              onSelect={() => handleMemberToggle(member.id)}
                                              className="pl-6"
                                            >
                                              <Check className={`mr-2 h-4 w-4 ${formData.member_ids.includes(member.id) ? 'opacity-100' : 'opacity-0'}`} />
                                              {member.first_name} {member.last_name}
                                            </CommandItem>
                                          ))
                                        ) : (
                                          group.equipes.map((equipe, idx) => (
                                            <Fragment key={equipe.equipe_id}>
                                              <div
                                                className={`px-2 ${idx === 0 ? 'pt-1' : 'pt-2'} pb-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/70 border-t border-border/40 ${idx === 0 ? 'border-t-0' : ''}`}
                                              >
                                                {equipe.equipe_name}
                                              </div>
                                              {equipe.members.map(member => (
                                                <CommandItem
                                                  key={`${group.area_id}-${equipe.equipe_id}-${member.id}`}
                                                  value={`${member.first_name} ${member.last_name} ${group.area_name} ${equipe.equipe_name}`}
                                                  onSelect={() => handleMemberToggle(member.id)}
                                                  className="pl-6"
                                                >
                                                  <Check className={`mr-2 h-4 w-4 ${formData.member_ids.includes(member.id) ? 'opacity-100' : 'opacity-0'}`} />
                                                  {member.first_name} {member.last_name}
                                                </CommandItem>
                                              ))}
                                            </Fragment>
                                          ))
                                        )}
                                      </>
                                    )}
                                  </CommandGroup>
                                );
                              })
                            ) : (
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
                            )}
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
                  <Label>Descrição do Projeto <span className="text-destructive">*</span></Label>
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
