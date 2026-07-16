import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

export type GerenciarDadosTable = 'cliente' | 'contribuinte';
export type GerenciarDadosAmbiente = 'prod' | 'dev';

type ClienteInsert = Database['public']['Tables']['cliente']['Insert'];
type ContribuinteInsert = Database['public']['Tables']['contribuinte']['Insert'];

interface LimparTabelaInput {
  selectedTable: GerenciarDadosTable;
  selectedAmbiente: GerenciarDadosAmbiente;
}

const gerenciarDadosQueryKeys = {
  clientesExistentes: (ambiente: GerenciarDadosAmbiente) =>
    ['gerenciar-dados', 'clientes-existentes', ambiente] as const,
  amostraContribuinte: (ambiente: GerenciarDadosAmbiente) =>
    ['gerenciar-dados', 'amostra-contribuinte', ambiente] as const,
};

const gerenciarDadosMutationKeys = {
  importarClientes: ['gerenciar-dados', 'importar-clientes'] as const,
  importarContribuintes: ['gerenciar-dados', 'importar-contribuintes'] as const,
  limparTabela: ['gerenciar-dados', 'limpar-tabela'] as const,
};

export function useDomainGerenciarDados() {
  const queryClient = useQueryClient();

  const buscarClientesExistentes = (selectedAmbiente: GerenciarDadosAmbiente) =>
    queryClient.fetchQuery({
      queryKey: gerenciarDadosQueryKeys.clientesExistentes(selectedAmbiente),
      staleTime: 0,
      queryFn: async () => {
        const { data } = await supabase
          .from('cliente')
          .select('id, nome')
          .eq('ambiente', selectedAmbiente);

        return data ?? null;
      },
    });

  const importarClientesMutation = useMutation<void, Error, ClienteInsert[]>({
    mutationKey: gerenciarDadosMutationKeys.importarClientes,
    mutationFn: async (clientes) => {
      const { error } = await supabase.from('cliente').insert(clientes);
      if (error) throw error;
    },
  });

  const importarContribuintesMutation = useMutation<void, Error, ContribuinteInsert[]>({
    mutationKey: gerenciarDadosMutationKeys.importarContribuintes,
    mutationFn: async (contribuintes) => {
      const { error } = await supabase.from('contribuinte').insert(contribuintes);
      if (error) throw error;
    },
  });

  const limparTabelaMutation = useMutation<void, Error, LimparTabelaInput>({
    mutationKey: gerenciarDadosMutationKeys.limparTabela,
    mutationFn: async ({ selectedTable, selectedAmbiente }) => {
      // Para limpar clientes, precisamos deletar contribuintes primeiro (FK)
      if (selectedTable === 'cliente') {
        // Precheck: como o delete é em lote, amostra um id pra rodar can_perform
        const sample = await queryClient.fetchQuery({
          queryKey: gerenciarDadosQueryKeys.amostraContribuinte(selectedAmbiente),
          staleTime: 0,
          queryFn: async () => {
            const { data } = await supabase
              .from('contribuinte')
              .select('id')
              .eq('ambiente', selectedAmbiente)
              .limit(1)
              .maybeSingle();

            return data ?? null;
          },
        });

        if (sample?.id) {
          await assertCanPerform('contribuinte', 'delete', sample.id);
        }

        const { error: contribError } = await supabase
          .from('contribuinte')
          .delete()
          .eq('ambiente', selectedAmbiente);

        if (contribError) throw contribError;
      }

      const { error } = await supabase
        .from(selectedTable)
        .delete()
        .eq('ambiente', selectedAmbiente);

      if (error) throw error;
    },
  });

  return {
    buscarClientesExistentes,
    importarClientesMutation,
    importarContribuintesMutation,
    limparTabelaMutation,
  };
}
