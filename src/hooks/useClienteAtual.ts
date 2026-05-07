import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Resolve o `id_cliente` do representante vinculado ao usuário logado.
 * Mesmo padrão usado em useCreateTicketCliente: a RLS de `representante`
 * permite ao próprio usuário ler seu registro via auth.uid() = user_id.
 */
export function useClienteAtual() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cliente-atual', user?.id],
    queryFn: async (): Promise<string | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('representante' as any)
        .select('id_cliente')
        .eq('user_id', user.id)
        .eq('excluido', false);

      if (error) throw error;

      const ids = ((data || []) as any[])
        .map((r) => r.id_cliente)
        .filter(Boolean);

      return ids[0] ?? null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
