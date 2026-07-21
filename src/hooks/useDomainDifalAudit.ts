import { useMutation, useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import { useApiAuth } from '@/hooks/useApiAuth';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import type { DifalGroupedItem, NCMRegrasResponse, TipoDecisao } from '@/types/difal';

interface UseDomainDifalAuditParams {
  open: boolean;
  group: DifalGroupedItem | null;
  ufDestino: string;
}

interface SaveDifalDecisionInput {
  sessaoId: string;
  codNcm: string;
  decisao: TipoDecisao;
  regraId: string | null;
}

export function useDomainDifalAudit({
  open,
  group,
  ufDestino,
}: UseDomainDifalAuditParams) {
  const { fetchWithAuth } = useApiAuth();

  const regrasQuery = useQuery({
    queryKey: ['ncm-regras', group?.cod_ncm, ufDestino],
    queryFn: async () => {
      if (!group) return null;

      const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/ncm/regras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ncms: [group.cod_ncm],
          uf: ufDestino,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar regras NCM');
      }

      return response.json() as Promise<NCMRegrasResponse>;
    },
    enabled: open && !!group && !!ufDestino,
  });

  const saveDecisionMutation = useMutation<void, Error, SaveDifalDecisionInput>({
    networkMode: 'always',
    mutationFn: async ({ sessaoId, codNcm, decisao, regraId }) => {
      // Upsert pode virar update — precheck só roda quando já existe linha
      const { data: existing } = await supabase
        .from('difal_decisao')
        .select('id')
        .eq('sessao_id', sessaoId)
        .eq('cod_ncm', codNcm)
        .maybeSingle();

      if (existing?.id) {
        await assertCanPerform('difal_decisao', 'update', existing.id);
      }

      const { error } = await supabase
        .from('difal_decisao')
        .upsert({
          sessao_id: sessaoId,
          cod_ncm: codNcm,
          decisao: decisao,
          id_icms_st_bq: regraId,
          decidido_em: new Date().toISOString(),
        }, {
          onConflict: 'sessao_id,cod_ncm',
        });

      if (error) throw error;
    },
  });

  return { regrasQuery, saveDecisionMutation };
}
