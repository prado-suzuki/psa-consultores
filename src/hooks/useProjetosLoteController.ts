import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCreateOrgProjectsBatch } from '@/hooks/useOrgProjects';
import { useEstruturaEquipesByCategory } from '@/hooks/useEstruturaEquipes';
import { useTeamProfilesSafe, useTeamRolesForProjects } from '@/hooks/useTaxReferenceData';
import { useTeamMembersByArea } from '@/hooks/useTeamMembersByArea';
import {
  buildInitialRows,
  buildLoteFormData,
  validateLoteRow,
  type LoteCommon,
  type LoteFromOsLocationState,
  type LoteRow,
} from '@/lib/projetosLote';

export function useProjetosLoteController() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LoteFromOsLocationState | null)?.loteFromOs ?? null;

  // Campos comuns (datas/status/descrição) vêm da OS e não são editados nesta tela.
  const [common] = useState<LoteCommon>(() => state
    ? { startDate: state.startDate, endDate: state.endDate, status: state.status, description: state.description }
    : { startDate: '', endDate: '', status: 'active', description: '' });
  const [rows, setRows] = useState<LoteRow[]>(() => (state ? buildInitialRows(state) : []));

  const { data: equipesOptions = [] } = useEstruturaEquipesByCategory('tax');
  const { data: teamMembers = [] } = useTeamProfilesSafe();
  const { data: userRoles = [] } = useTeamRolesForProjects();
  const { data: areaGroupsData } = useTeamMembersByArea();
  const areaGroups = useMemo(() => areaGroupsData?.groups || [], [areaGroupsData]);
  const currentUserAreaIds = useMemo(() => areaGroupsData?.currentUserAreaIds || [], [areaGroupsData]);
  const createBatch = useCreateOrgProjectsBatch();

  const updateRow = useCallback((index: number, patch: Partial<LoteRow>) =>
    setRows(previous => previous.map((row, i) => (i === index ? { ...row, ...patch } : row))), []);

  const includedCount = useMemo(() => rows.filter(row => row.include).length, [rows]);

  const handleCreate = () => {
    if (!state) return;
    const included = rows.filter(row => row.include);
    if (included.length === 0) {
      toast.error('Selecione ao menos um produto para criar projeto');
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
        if (result.created > 0) navigate('/equipe/tax/projetos/cadastro');
      },
    });
  };

  return {
    state, common, rows, updateRow, includedCount,
    equipesOptions, teamMembers, userRoles, areaGroups, currentUserAreaIds, createBatch, handleCreate,
  };
}

export type ProjetosLoteController = ReturnType<typeof useProjetosLoteController>;
