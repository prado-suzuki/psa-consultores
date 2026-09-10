import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * A linha de `profiles` do próprio usuário.
 *
 * Existe `useProfilesNomeMap` (em `useDomainProfiles`), que traz o mapa de
 * TODOS os perfis para resolver nome de autor, responsável e menção. Ele não
 * serve aqui: é uma varredura da tabela inteira para responder uma pergunta de
 * uma linha só, e roda contra a view `profiles_safe`, que não devolve as
 * colunas que a tela de conta vai editar.
 *
 * A leitura é da tabela `profiles` mesmo, filtrada por `id`. A policy de SELECT
 * é própria-usuário, então esta query só enxerga a linha de quem está logado —
 * o filtro é o que torna a intenção explícita, não o que dá a permissão.
 */

export interface MeuPerfil {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

export const chaveMeuPerfil = (userId: string | null) => ['meu-perfil', userId] as const;

export function useMeuPerfil() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: chaveMeuPerfil(userId),
    enabled: Boolean(userId),
    // O nome do usuário não muda enquanto ele trabalha. Sem isto, o cartão
    // refetch a cada troca de área, que remonta a barra lateral inteira.
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<MeuPerfil | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, phone')
        .eq('id', userId as string)
        // `maybeSingle` e não `single`: quando a policy recusa a leitura o
        // retorno é zero linha, e `single` transformaria isso em erro — o
        // cartão apagaria o nome em vez de cair no e-mail.
        .maybeSingle();

      if (error) throw error;

      return data ?? null;
    },
  });
}
