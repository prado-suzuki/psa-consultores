import { useMutation, useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';

export interface Contato {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  empresa: string | null;
  mensagem: string | null;
  servico_interesse: string | null;
  porte_empresa: string | null;
  como_conheceu: string | null;
  status: string;
  notas_internas: string | null;
  atendido_por: string | null;
  created_at: string;
  updated_at: string;
}

interface UpdateContatoInput {
  id: string;
  status: string;
  notasInternas: string;
}

const gestaoContatosQueryKey = ['gestao-contatos'] as const;

export function useDomainGestaoContatos() {
  const contatosQuery = useQuery<Contato[]>({
    queryKey: gestaoContatosQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contatos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const updateContato = useMutation<void, Error, UpdateContatoInput>({
    mutationFn: async ({ id, status, notasInternas }) => {
      await assertCanPerform('contatos', 'update', id);
      const { error } = await supabase
        .from('contatos')
        .update({
          status,
          notas_internas: notasInternas,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
  });

  return {
    contatos: contatosQuery.data ?? [],
    loading: contatosQuery.isFetching,
    fetchError: contatosQuery.error,
    refetchContatos: contatosQuery.refetch,
    updateContato,
  };
}
