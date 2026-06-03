import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { computeFieldDiff } from '@/lib/diffUtils';
import type { Database } from '@/integrations/supabase/types';

export type QuadroSocietarioRow = Database['public']['Tables']['quadro_societario']['Row'];
export type QuadroSocietarioInsert = Database['public']['Tables']['quadro_societario']['Insert'];
export type QuadroSocietarioUpdate = Database['public']['Tables']['quadro_societario']['Update'];

// percentual e data_referencia existem na tabela mas não são usados nesta tela:
// a participação é derivada de quotas/Σquotas só na exibição.
const QUADRO_DIFF_FIELDS: (keyof QuadroSocietarioRow)[] = [
  'empresa_pessoa_id', 'socio_pessoa_id', 'quotas', 'vlr_total',
];

export interface SocioEnriched extends QuadroSocietarioRow {
  socio_denominacao: string;
  socio_tipo_pessoa: string | null;
  socio_cpf_cnpj: string | null;
}

export function useQuadroSocietarioByEmpresa(empresaPessoaId: string | null) {
  return useQuery<SocioEnriched[]>({
    queryKey: ['quadro-societario-by-empresa', empresaPessoaId],
    queryFn: async () => {
      if (!empresaPessoaId) return [];
      const { data, error } = await supabase
        .from('quadro_societario')
        .select('*, socio:socio_pessoa_id (id, denominacao, tipo_pessoa, cpf_cnpj)')
        .eq('empresa_pessoa_id', empresaPessoaId)
        .order('quotas', { ascending: false, nullsFirst: false });
      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<QuadroSocietarioRow & {
        socio: { id: string; denominacao: string; tipo_pessoa: string | null; cpf_cnpj: string | null } | null;
      }>;

      return rows.map((r) => ({
        ...r,
        socio_denominacao: r.socio?.denominacao ?? '—',
        socio_tipo_pessoa: r.socio?.tipo_pessoa ?? null,
        socio_cpf_cnpj: r.socio?.cpf_cnpj ?? null,
      }));
    },
    enabled: !!empresaPessoaId,
  });
}

export function useUpsertSocio() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      values,
      original,
      entityName,
    }: {
      values: QuadroSocietarioInsert | QuadroSocietarioUpdate;
      original?: QuadroSocietarioRow | null;
      entityName: string;
    }) => {
      if (original?.id) {
        const { data, error } = await supabase
          .from('quadro_societario')
          .update(values as QuadroSocietarioUpdate)
          .eq('id', original.id)
          .select('*')
          .single();
        if (error) throw error;
        return { row: data as QuadroSocietarioRow, original, entityName };
      }
      const { data, error } = await supabase
        .from('quadro_societario')
        .insert(values as QuadroSocietarioInsert)
        .select('*')
        .single();
      if (error) throw error;
      return { row: data as QuadroSocietarioRow, original: null, entityName };
    },
    onSuccess: async ({ row, original, entityName }) => {
      queryClient.invalidateQueries({ queryKey: ['quadro-societario-by-empresa', row.empresa_pessoa_id] });

      const changed = computeFieldDiff(
        original as unknown as Record<string, unknown> | null,
        row as unknown as Record<string, unknown>,
        QUADRO_DIFF_FIELDS as string[],
      );

      await logAction({
        area: 'osg',
        entity_type: 'quadro_societario',
        entity_id: row.id,
        entity_name: entityName,
        action: original ? 'updated' : 'created',
        changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
      });

      toast({
        title: original ? 'Sócio atualizado' : 'Sócio vinculado',
        description: entityName,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar sócio', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSocio() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ row, entityName }: { row: QuadroSocietarioRow; entityName: string }) => {
      const { error } = await supabase.from('quadro_societario').delete().eq('id', row.id);
      if (error) throw error;
      return { row, entityName };
    },
    onSuccess: async ({ row, entityName }) => {
      queryClient.invalidateQueries({ queryKey: ['quadro-societario-by-empresa', row.empresa_pessoa_id] });
      await logAction({
        area: 'osg',
        entity_type: 'quadro_societario',
        entity_id: row.id,
        entity_name: entityName,
        action: 'deleted',
      });
      toast({ title: 'Sócio desvinculado', description: entityName });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao desvincular sócio', description: error.message, variant: 'destructive' });
    },
  });
}
