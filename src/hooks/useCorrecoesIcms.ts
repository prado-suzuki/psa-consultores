import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';

export type FamiliaCorrecao = 'acucar' | 'etanol_interestado' | 'biodiesel';

export interface CorrecaoIcmsRow {
  id: string;
  contribuinte_id: string;
  familia: FamiliaCorrecao;
  data_lancamento: string; // YYYY-MM-DD
  competencia: string | null;
  descricao: string;
  produto: string | null;
  campos: Record<string, number | null>;
  ambiente: string;
  excluido: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCorrecaoIcmsInput {
  contribuinte_id: string;
  familia: FamiliaCorrecao;
  data_lancamento: string;
  competencia?: string | null;
  descricao: string;
  produto?: string | null;
  campos: Record<string, number | null>;
}

interface UseCorrecoesIcmsParams {
  contribuinteId: string;
  familia: FamiliaCorrecao;
  dataInicio?: string;
  dataFim?: string;
  enabled?: boolean;
}

const TABLE = 'correcoes_icms';

export function correcoesQueryKey(params: UseCorrecoesIcmsParams) {
  return [
    'correcoes-icms',
    params.contribuinteId,
    params.familia,
    params.dataInicio ?? null,
    params.dataFim ?? null,
  ] as const;
}

export function useCorrecoesIcms(params: UseCorrecoesIcmsParams) {
  return useQuery<CorrecaoIcmsRow[]>({
    queryKey: correcoesQueryKey(params),
    queryFn: async () => {
      let query = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(TABLE as any)
        .select('*')
        .eq('contribuinte_id', params.contribuinteId)
        .eq('familia', params.familia)
        .eq('ambiente', currentAmbiente)
        .eq('excluido', false)
        .order('data_lancamento', { ascending: true });

      if (params.dataInicio) query = query.gte('data_lancamento', params.dataInicio);
      if (params.dataFim) query = query.lte('data_lancamento', params.dataFim);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as CorrecaoIcmsRow[];
    },
    enabled: (params.enabled ?? true) && !!params.contribuinteId,
    staleTime: 30_000,
  });
}

export function useCreateCorrecaoIcms() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: CreateCorrecaoIcmsInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const payload = {
        contribuinte_id: input.contribuinte_id,
        familia: input.familia,
        data_lancamento: input.data_lancamento,
        competencia: input.competencia ?? null,
        descricao: input.descricao,
        produto: input.produto ?? null,
        campos: input.campos,
        ambiente: currentAmbiente,
        created_by: user.id,
      };

      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(TABLE as any)
        .insert(payload)
        .select('*')
        .single();

      if (error) throw error;
      const row = data as unknown as CorrecaoIcmsRow;

      const changed: Record<string, { old: unknown; new: unknown }> = {};
      Object.entries(payload).forEach(([k, v]) => {
        changed[k] = { old: null, new: v };
      });

      await logAction({
        area: 'dev',
        entity_type: 'correcao_icms',
        entity_id: row.id,
        entity_name: `${input.familia} • ${input.descricao}`,
        action: 'created',
        changed_fields: changed,
      });

      return row;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['correcoes-icms', vars.contribuinte_id, vars.familia],
      });
    },
  });
}

export function useDeleteCorrecaoIcms() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (row: CorrecaoIcmsRow) => {
      const { error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from(TABLE as any)
        .update({ excluido: true })
        .eq('id', row.id);

      if (error) throw error;

      await logAction({
        area: 'dev',
        entity_type: 'correcao_icms',
        entity_id: row.id,
        entity_name: `${row.familia} • ${row.descricao}`,
        action: 'deleted',
        changed_fields: { excluido: { old: false, new: true } },
      });

      return row;
    },
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: ['correcoes-icms', row.contribuinte_id, row.familia],
      });
    },
  });
}
