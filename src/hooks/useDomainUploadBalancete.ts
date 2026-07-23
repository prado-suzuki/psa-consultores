import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

interface UseDomainUploadBalanceteOptions {
  open: boolean;
  clienteId: string;
  contribuinteId: string;
}

interface SalvarDetalhamentoInput {
  contribuinteId: string;
  value: boolean;
}

const uploadBalanceteQueryKeys = {
  clientes: ['upload-balancete-clientes'] as const,
  contribuintes: (clienteId: string) =>
    ['upload-balancete-contribuintes', clienteId] as const,
  config: (contribuinteId: string) =>
    ['upload-balancete-config', contribuinteId] as const,
};

export function useDomainUploadBalancete({
  open,
  clienteId,
  contribuinteId,
}: UseDomainUploadBalanceteOptions) {
  const queryClient = useQueryClient();

  const clientesQuery = useQuery({
    queryKey: uploadBalanceteQueryKeys.clientes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const contribuintesQuery = useQuery({
    queryKey: uploadBalanceteQueryKeys.contribuintes(clienteId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social')
        .eq('cliente_id', clienteId)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      if (error) throw error;
      return data;
    },
    enabled: open && Boolean(clienteId),
  });

  const buscarConfig = useCallback(
    (idContribuinte: string) =>
      queryClient.fetchQuery({
        queryKey: uploadBalanceteQueryKeys.config(idContribuinte),
        queryFn: async () => {
          const { data, error } = await supabase
            .from('contribuinte_bal_config')
            .select('balancete_detalhamento')
            .eq('id_contribuinte', idContribuinte)
            .maybeSingle();

          if (error) throw error;
          return data;
        },
        // A leitura original era imperativa e sem cache ou retentativas.
        staleTime: 0,
        gcTime: 0,
        retry: false,
        networkMode: 'always',
      }),
    [queryClient],
  );

  const salvarDetalhamentoMutation = useMutation({
    mutationFn: async ({ contribuinteId: idContribuinte, value }: SalvarDetalhamentoInput) => {
      // Upsert pode virar update — precheck só roda quando já existe linha.
      const { data: existing } = await supabase
        .from('contribuinte_bal_config')
        .select('id')
        .eq('id_contribuinte', idContribuinte)
        .maybeSingle();

      if (existing?.id) {
        await assertCanPerform('contribuinte_bal_config', 'update', existing.id);
      }

      const { error } = await supabase
        .from('contribuinte_bal_config')
        .upsert(
          { id_contribuinte: idContribuinte, balancete_detalhamento: value },
          { onConflict: 'id_contribuinte' },
        );

      if (error) throw error;
    },
    retry: false,
    networkMode: 'always',
  });

  return {
    clientes: clientesQuery.data,
    contribuintes: contribuintesQuery.data,
    buscarConfig,
    salvarDetalhamento: salvarDetalhamentoMutation.mutateAsync,
  };
}
