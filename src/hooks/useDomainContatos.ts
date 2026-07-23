import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';

export interface InserirContatoInput {
  nome_completo?: string;
  email?: string;
  telefone?: string;
  empresa?: string;
  servico_interesse?: string;
  porte_empresa?: string;
  como_conheceu?: string;
}

const contatosMutationKeys = {
  inserirPublico: ['contatos', 'inserir-publico'] as const,
};

export function useInserirContato() {
  return useMutation<void, Error, InserirContatoInput>({
    mutationKey: contatosMutationKeys.inserirPublico,
    mutationFn: async (contato) => {
      const { error } = await supabase.from('contatos').insert({
        nome_completo: contato.nome_completo,
        email: contato.email,
        telefone: contato.telefone || null,
        empresa: contato.empresa || null,
        servico_interesse: contato.servico_interesse,
        porte_empresa: contato.porte_empresa || null,
        como_conheceu: contato.como_conheceu || null,
        mensagem: null,
      });

      if (error) throw error;
    },
  });
}
