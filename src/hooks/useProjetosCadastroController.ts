import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AreaKey } from '@/config/areaCategories';
import { useClientFormOptions } from '@/hooks/useClientFormOptions';
import { useDashboardProjectIds } from '@/hooks/useDashboardProjectIds';
import { useDomainFiscalProjetosCadastro } from '@/hooks/useDomainFiscalProjetosCadastro';
import { useEstruturaEquipe } from '@/hooks/useEstruturaEquipe';
import { useEstruturaEquipesByCategory } from '@/hooks/useEstruturaEquipes';
import {
  useCreateOrgProject,
  useDeleteOrgProject,
  useOrgProjects,
  useProjectHours,
  useProjectMembers,
  useUpdateOrgProject,
  type OrgProject,
  type OrgProjectFormData,
} from '@/hooks/useOrgProjects';
import { groupByOs, useOsProdutosContratados } from '@/hooks/useOsProdutosContratados';
import { useProjectMemberAreas } from '@/hooks/useProjectMemberAreas';
import {
  useClienteOrdens,
  useClusterIdByPageCategory,
  useExternalClients,
  useTeamProfilesSafe,
  useTeamRolesForProjects,
} from '@/hooks/useTaxReferenceData';
import { useTeamMembersByArea } from '@/hooks/useTeamMembersByArea';
import {
  buildProjectFilterOptions,
  EMPTY_PROJECT_FORM,
  filterAndSortProjects,
  groupProjects,
  validateProjectForm,
  type ProjectGroupBy,
  type ProjectSortColumn,
  type SortDirection,
  type ProjectPrefillLocationState,
} from '@/lib/projetosCadastro';
import { computeAvailableMembers, computeExecutores, computeLideres } from '@/lib/projetoEquipe';

export function useProjetosCadastroController(area: AreaKey) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<OrgProject | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OrgProjectFormData>({ ...EMPTY_PROJECT_FORM });
  const [filterCliente, setFilterCliente] = useState('');
  const [filterProduto, setFilterProduto] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortColumn, setSortColumn] = useState<ProjectSortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [groupBy, setGroupBy] = useState<ProjectGroupBy>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedAreaGroups, setCollapsedAreaGroups] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState('');
  // Projeto sem Responsável Executor (Canal de Chamados). Não tem coluna
  // própria: ao reabrir, deduz de responsible_id vazio.
  const [semExecutorFixo, setSemExecutorFixo] = useState(false);
  const [selectedOsId, setSelectedOsId] = useState<string | null>(null);
  const [selectedProdutoId, setSelectedProdutoId] = useState<string | null>(null);
  const [prevEquipeId, setPrevEquipeId] = useState('');
  const isOpeningEditRef = useRef(false);
  const collapsedInitializedRef = useRef(false);
  const prefillHandledRef = useRef(false);
  /** Último `?projetoId=` já aberto, para o deep-link não reabrir o modal. */
  const deepLinkHandledRef = useRef<string | null>(null);

  const { data: equipesOptions = [] } = useEstruturaEquipesByCategory(area);
  const { data: allProjects = [], isLoading } = useOrgProjects();
  const { data: clusterId } = useClusterIdByPageCategory(area);
  const { ids: visibleProjectIds } = useDashboardProjectIds(clusterId, area === 'tax');
  const projects = useMemo(() => visibleProjectIds
    ? allProjects.filter(project => visibleProjectIds.has(project.id))
    : [], [allProjects, visibleProjectIds]);
  useProjectHours();
  const { data: projectMemberAreas = {} } = useProjectMemberAreas();

  const listingOsIds = useMemo(() => [...new Set(projects
    .map(project => project.ordem_servico_id)
    .filter((id): id is string => Boolean(id)))], [projects]);
  const { data: listingOsProdutos = [] } = useOsProdutosContratados(listingOsIds);
  const listingOsProdutosByOs = useMemo(() => groupByOs(listingOsProdutos), [listingOsProdutos]);
  const filterOptions = useMemo(() => buildProjectFilterOptions(projects), [projects]);
  const filteredProjects = useMemo(() => filterAndSortProjects(projects, {
    cliente: filterCliente,
    produto: filterProduto,
    status: filterStatus,
  }, sortColumn, sortDirection), [projects, filterCliente, filterProduto, filterStatus, sortColumn, sortDirection]);
  const groupedProjects = useMemo(() => groupProjects(filteredProjects, groupBy, projectMemberAreas),
    [filteredProjects, groupBy, projectMemberAreas]);
  const hasActiveFilters = Boolean(filterCliente || filterProduto || filterStatus);

  useEffect(() => setCollapsedGroups(new Set()), [groupBy]);

  const { data: currentProjectMembers = [] } = useProjectMembers(editingProject?.id);
  const equipeId = formData.equipe_id || null;
  const { equipeInfo, liderIds: equipeLiderIds, memberIds: equipeMemberIds } = useEstruturaEquipe(equipeId);

  useEffect(() => {
    const newAreaId = equipeInfo?.area_id || '';
    if (newAreaId && newAreaId !== formData.estrutura_area_id) {
      setFormData(previous => ({ ...previous, estrutura_area_id: newAreaId }));
    }
  }, [equipeInfo?.area_id, formData.estrutura_area_id]);

  const { data: areaGroupsData } = useTeamMembersByArea();
  const allAreaGroups = useMemo(() => areaGroupsData?.groups || [], [areaGroupsData]);
  useEffect(() => {
    if (collapsedInitializedRef.current || !areaGroupsData || areaGroupsData.groups.length === 0) return;
    collapsedInitializedRef.current = true;
    const userAreas = new Set(areaGroupsData.currentUserAreaIds);
    setCollapsedAreaGroups(new Set(areaGroupsData.groups
      .filter(group => !userAreas.has(group.area_id))
      .map(group => group.area_id)));
  }, [areaGroupsData]);

  const createProject = useCreateOrgProject();
  const updateProject = useUpdateOrgProject();
  const deleteProjectMut = useDeleteOrgProject();
  const { data: teamMembers = [] } = useTeamProfilesSafe();
  const { data: userRoles = [] } = useTeamRolesForProjects();
  const { data: externalClients = [] } = useExternalClients(editingProject?.external_client_id);
  const { data: clienteOS = [] } = useClienteOrdens(formData.external_client_id || null);
  useClientFormOptions();

  const osIds = useMemo(() => clienteOS.map(os => os.id), [clienteOS]);
  const { data: osProdutos = [] } = useOsProdutosContratados(osIds);
  const osProdutosByOs = useMemo(() => groupByOs(osProdutos), [osProdutos]);
  const selectedOsProdutos = useMemo(() => selectedOsId ? (osProdutosByOs[selectedOsId] || []) : [],
    [osProdutosByOs, selectedOsId]);

  // A abertura de edição depende desta sequência: primeiro fixa OS/form e só então
  // permite que os efeitos derivados resolvam produto/serviço sem limpar datas.
  useEffect(() => {
    if (isOpeningEditRef.current) return;
    setSelectedProdutoId(selectedOsProdutos.length === 1 ? selectedOsProdutos[0].produto_segmento_id : null);
  }, [selectedOsProdutos]);

  const { resolveProdutoIdByServico } = useDomainFiscalProjetosCadastro(selectedProdutoId);

  useEffect(() => {
    if (!editingProject || !formData.servico_id || selectedProdutoId || selectedOsProdutos.length === 0) return;
    resolveProdutoIdByServico(formData.servico_id, selectedOsProdutos.map(product => product.produto_segmento_id))
      .then(produtoId => {
        if (produtoId) setSelectedProdutoId(produtoId);
      });
  }, [editingProject, formData.servico_id, selectedOsProdutos, selectedProdutoId, resolveProdutoIdByServico]);

  useEffect(() => {
    if (!formData.external_client_id) {
      setSelectedOsId(null);
      return;
    }
    if (clienteOS.length === 1) {
      const osId = clienteOS[0].id;
      setSelectedOsId(previous => previous === osId ? previous : osId);
    }
  }, [clienteOS, formData.external_client_id]);

  useEffect(() => {
    if (isOpeningEditRef.current) {
      setFormData(previous => ({ ...previous, ordem_servico_id: selectedOsId || '' }));
      isOpeningEditRef.current = false;
      return;
    }
    if (editingProject && formData.ordem_servico_id === (selectedOsId || '')) return;
    setFormData(previous => ({ ...previous, ordem_servico_id: selectedOsId || '', servico_id: '' }));
    setSelectedProdutoId(null);
    if (!selectedOsId || editingProject) return;
    const os = clienteOS.find(item => item.id === selectedOsId);
    if (!os) return;
    setFormData(previous => ({
      ...previous,
      ordem_servico_id: selectedOsId,
      start_date: previous.start_date || os.data_inicio || '',
      end_date: previous.end_date || os.data_fim || '',
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOsId]);

  useEffect(() => {
    if (prevEquipeId && formData.equipe_id && prevEquipeId !== formData.equipe_id) {
      setFormData(previous => ({ ...previous, leader_ids: [], member_ids: [] }));
    }
    setPrevEquipeId(formData.equipe_id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.equipe_id]);

  useEffect(() => {
    if (!equipeId || editingProject || equipeLiderIds.length !== 1) return;
    setFormData(previous => previous.leader_ids.length === 0
      ? { ...previous, leader_ids: [equipeLiderIds[0]] }
      : previous);
  }, [equipeId, equipeLiderIds, editingProject]);

  useEffect(() => {
    if (!editingProject || currentProjectMembers.length === 0 || userRoles.length === 0) return;
    const roleMap = new Map(userRoles.map(role => [role.user_id, role.role]));
    const leaderIds: string[] = [];
    const memberIds: string[] = [];
    for (const member of currentProjectMembers) {
      (roleMap.get(member.user_id) === 'lider' ? leaderIds : memberIds).push(member.user_id);
    }
    setFormData(previous => ({ ...previous, leader_ids: leaderIds, member_ids: memberIds }));
  }, [editingProject, currentProjectMembers, userRoles]);

  const lideres = useMemo(() => computeLideres(teamMembers, userRoles, equipeId, equipeLiderIds, formData.leader_ids),
    [teamMembers, userRoles, equipeId, equipeLiderIds, formData.leader_ids]);

  const executores = useMemo(() => computeExecutores(teamMembers, userRoles, equipeId, equipeMemberIds, formData.responsible_id),
    [teamMembers, userRoles, equipeId, equipeMemberIds, formData.responsible_id]);

  const availableMembers = useMemo(() => computeAvailableMembers(teamMembers, equipeId, equipeMemberIds,
    formData.leader_ids, formData.member_ids, formData.is_multidisciplinar, allAreaGroups),
    [teamMembers, formData.leader_ids, formData.member_ids, formData.is_multidisciplinar, equipeId, equipeMemberIds, allAreaGroups]);

  const availableMembersByArea = useMemo(() => {
    if (!formData.is_multidisciplinar) return [];
    const excluded = new Set(formData.leader_ids);
    return allAreaGroups.map(group => ({
      ...group,
      members: group.members.filter(member => !excluded.has(member.id)),
      equipes: group.equipes.map(team => ({
        ...team,
        members: team.members.filter(member => !excluded.has(member.id)),
      })).filter(team => team.members.length > 0),
    })).filter(group => group.members.length > 0);
  }, [formData.is_multidisciplinar, formData.leader_ids, allAreaGroups]);

  const handleSort = (column: ProjectSortColumn) => {
    if (sortColumn === column) setSortDirection(previous => previous === 'asc' ? 'desc' : 'asc');
    else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  const clearFilters = () => {
    setFilterCliente('');
    setFilterProduto('');
    setFilterStatus('');
  };
  const toggleGroup = (label: string) => setCollapsedGroups(previous => {
    const next = new Set(previous);
    if (next.has(label)) next.delete(label); else next.add(label);
    return next;
  });
  const toggleAreaGroup = (areaId: string) => setCollapsedAreaGroups(previous => {
    const next = new Set(previous);
    if (next.has(areaId)) next.delete(areaId); else next.add(areaId);
    return next;
  });
  const handleMemberToggle = (memberId: string) => setFormData(previous => ({
    ...previous,
    member_ids: previous.member_ids.includes(memberId)
      ? previous.member_ids.filter(id => id !== memberId)
      : [...previous.member_ids, memberId],
  }));

  const toggleSemExecutorFixo = (checked: boolean) => {
    setSemExecutorFixo(checked);
    if (checked) setFormData(previous => ({ ...previous, responsible_id: '' }));
  };

  const handleOpenModal = (project?: OrgProject) => {
    if (project) {
      setEditingProject(project);
      isOpeningEditRef.current = true;
      setSemExecutorFixo(!project.responsible_id);
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
        // Round-trip do contribuinte_id: o modal não edita esse campo, mas ele
        // precisa entrar no form para que o diff do update não o veja como
        // alterado e o zere (bug COR-01 — coluna sobrescrevendo a si mesma).
        contribuinte_id: project.contribuinte_id || undefined,
        estrutura_area_id: project.estrutura_area_id || '',
        equipe_id: project.equipe_id || '',
        is_multidisciplinar: Boolean(project.is_multidisciplinar),
        member_ids: [],
        ordem_servico_id: project.ordem_servico_id || '',
        servico_id: 'servico_id' in project && typeof project.servico_id === 'string' ? project.servico_id : '',
      });
    } else {
      setEditingProject(null);
      setSemExecutorFixo(false);
      setFormData({ ...EMPTY_PROJECT_FORM });
    }
    setIsModalOpen(true);
  };
  useEffect(() => {
    const state = location.state as ProjectPrefillLocationState | null;
    if (prefillHandledRef.current || !state?.projectPrefill) return;
    prefillHandledRef.current = true;
    const prefill = state.projectPrefill;
    setEditingProject(null);
    setSemExecutorFixo(false);
    setFormData({
      ...EMPTY_PROJECT_FORM,
      external_client_id: prefill.clientId,
      name: prefill.name,
      description: prefill.description,
      is_multidisciplinar: prefill.isMultidisciplinar,
    });
    setIsModalOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);
  /**
   * Deep-link `?projetoId=<id>`: abre o modal do projeto direto, espelhando o
   * `?taskId=` que o PainelTarefas já faz com a tarefa. É por aqui que o feed de
   * feed leva o usuário até o projeto de onde o comentário saiu.
   *
   * A busca é em `allProjects`, não em `projects`: a lista filtrada é escopada
   * pelo cluster da área e devolveria vazio para projeto de outra área. Vale a
   * mesma regra do deep-link de tarefa — o escopo de tela não limita o link, só
   * a RLS limita.
   */
  const abrirModalRef = useRef(handleOpenModal);
  abrirModalRef.current = handleOpenModal;
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projetoId = params.get('projetoId');
    if (!projetoId || deepLinkHandledRef.current === projetoId) return;
    // Ainda carregando (ou fora da RLS): o efeito roda de novo quando a lista chega.
    const project = allProjects.find(item => item.id === projetoId);
    if (!project) return;
    deepLinkHandledRef.current = projetoId;
    abrirModalRef.current(project);
    // Tira só o `projetoId` da URL, para não reabrir o modal em navegação
    // posterior nem derrubar outro parâmetro que esteja na query.
    params.delete('projetoId');
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
  }, [allProjects, location.pathname, location.search, navigate]);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setSemExecutorFixo(false);
    setFormData({ ...EMPTY_PROJECT_FORM });
  };
  const handleSubmit = () => {
    const validationError = validateProjectForm(formData,
      Boolean(selectedOsId && selectedOsProdutos.length >= 1), selectedProdutoId, semExecutorFixo);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (editingProject) {
      updateProject.mutate({ id: editingProject.id, data: formData, oldProject: editingProject, oldMembers: currentProjectMembers },
        { onSuccess: handleCloseModal });
    } else createProject.mutate(formData, { onSuccess: handleCloseModal });
  };
  const handleDelete = () => {
    if (!deleteProjectId) return;
    const project = projects.find(item => item.id === deleteProjectId);
    deleteProjectMut.mutate({ id: deleteProjectId, name: project?.name || 'Projeto excluído' },
      { onSuccess: () => setDeleteProjectId(null) });
  };

  return {
    area, projects, filteredProjects, groupedProjects, filterOptions, hasActiveFilters, isLoading,
    filterCliente, setFilterCliente, filterProduto, setFilterProduto, filterStatus, setFilterStatus,
    groupBy, setGroupBy, sortColumn, sortDirection, handleSort, clearFilters,
    collapsedGroups, toggleGroup, listingOsProdutosByOs,
    isModalOpen, setIsModalOpen, editingProject, formData, setFormData,
    handleOpenModal, handleCloseModal, handleSubmit, createProject, updateProject,
    deleteProjectId, setDeleteProjectId, handleDelete,
    externalClients, clienteOS, osProdutosByOs, selectedOsId, setSelectedOsId,
    selectedOsProdutos, selectedProdutoId, setSelectedProdutoId,
    equipesOptions, teamMembers, lideres, executores, equipeId, equipeMemberIds,
    semExecutorFixo, toggleSemExecutorFixo,
    availableMembers, availableMembersByArea, memberSearch, setMemberSearch,
    collapsedAreaGroups, toggleAreaGroup, handleMemberToggle,
  };
}

export type ProjetosCadastroController = ReturnType<typeof useProjetosCadastroController>;
