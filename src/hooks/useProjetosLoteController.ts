import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateOrgProjectsBatch, useOrgProjects } from '@/hooks/useOrgProjects';
import { useEstruturaEquipesByCategory } from '@/hooks/useEstruturaEquipes';
import { useTeamProfilesSafe, useTeamRolesForProjects } from '@/hooks/useTaxReferenceData';
import { useTeamMembersByArea } from '@/hooks/useTeamMembersByArea';
import type { AreaKey } from '@/config/areaCategories';
import {
  buildInitialRows,
  buildLoteFormData,
  findProdutosJaCriados,
  resolveLoteRoutes,
  validateLoteRow,
  type LoteCommon,
  type LoteFromOsLocationState,
  type LoteRow,
} from '@/lib/projetosLote';

export function useProjetosLoteController(area: AreaKey) {
  const location = useLocation();
  const navigate = useNavigate();
  const routes = resolveLoteRoutes(area);
  const state = (location.state as LoteFromOsLocationState | null)?.loteFromOs ?? null;

  // Campos comuns (datas/status/descrição) vêm da OS e não são editados nesta tela.
  const [common] = useState<LoteCommon>(() => state
    ? { startDate: state.startDate, endDate: state.endDate, status: state.status, description: state.description }
    : { startDate: '', endDate: '', status: 'active', description: '' });
  const [rows, setRows] = useState<LoteRow[]>(() => (state ? buildInitialRows(state) : []));

  // Equipes da área em que a tela foi aberta: em OSG, oferecer as equipes do Tax
  // criaria o projeto na estrutura errada.
  const { data: equipesOptions = [] } = useEstruturaEquipesByCategory(area);
  const { data: teamMembers = [] } = useTeamProfilesSafe();
  const { data: userRoles = [] } = useTeamRolesForProjects();
  const { data: areaGroupsData } = useTeamMembersByArea();
  const areaGroups = useMemo(() => areaGroupsData?.groups || [], [areaGroupsData]);
  const currentUserAreaIds = useMemo(() => areaGroupsData?.currentUserAreaIds || [], [areaGroupsData]);
  const createBatch = useCreateOrgProjectsBatch();

  // Produtos desta OS que já viraram projeto: entram desmarcados e travados,
  // para não criar o mesmo projeto duas vezes.
  const { data: allProjects = [] } = useOrgProjects();
  const jaCriados = useMemo(() => {
    if (!state) return new Set<string>();
    const projetosDaOs = allProjects.filter(project => project.ordem_servico_id === state.ordemServicoId);
    return new Set(findProdutosJaCriados(projetosDaOs, state.clientName, state.osNumero, state.produtos));
  }, [allProjects, state]);

  const updateRow = useCallback((index: number, patch: Partial<LoteRow>) =>
    setRows(previous => previous.map((row, i) => (i === index ? { ...row, ...patch } : row))), []);

  // As linhas nascem marcadas; ao chegar a lista de projetos existentes, desmarca
  // os já criados uma única vez (depois disso a escolha é do usuário).
  const jaCriadosAplicadosRef = useRef(false);
  useEffect(() => {
    if (jaCriadosAplicadosRef.current || jaCriados.size === 0) return;
    jaCriadosAplicadosRef.current = true;
    setRows(previous => previous.map(row =>
      jaCriados.has(row.produtoSegmentoId) ? { ...row, include: false } : row));
  }, [jaCriados]);

  const includedCount = useMemo(() => rows.filter(row => row.include).length, [rows]);
  const todosJaCriados = rows.length > 0 && rows.every(row => jaCriados.has(row.produtoSegmentoId));

  const handleCreate = () => {
    if (!state) return;
    const included = rows.filter(row => row.include);
    if (included.length === 0) {
      toast.error('Selecione ao menos um produto para criar projeto');
      return;
    }
    // Rede de segurança: a linha travada já não deveria estar marcada.
    const duplicados = included.filter(row => jaCriados.has(row.produtoSegmentoId));
    if (duplicados.length > 0) {
      toast.error(`Já existe projeto nesta OS para: ${duplicados.map(row => row.produtoLabel).join(', ')}`);
      return;
    }
    for (const row of included) {
      const validationError = validateLoteRow(row, common);
      if (validationError) {
        toast.error(validationError);
        return;
      }
    }
    const payload = included.map(row => buildLoteFormData(state.clientId, state.ordemServicoId, common, row));
    createBatch.mutate(payload, {
      onSuccess: (result) => {
        if (result.created > 0) navigate(routes.projetos);
      },
    });
  };

  return {
    state, routes, common, rows, updateRow, includedCount, jaCriados, todosJaCriados,
    equipesOptions, teamMembers, userRoles, areaGroups, currentUserAreaIds, createBatch, handleCreate,
  };
}

export type ProjetosLoteController = ReturnType<typeof useProjetosLoteController>;
