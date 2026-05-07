import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientDashboard {
  id: string;
  name: string;
  description: string | null;
  url: string;
}

/**
 * Lista os dashboards/relatórios disponíveis para o cliente logado.
 * Usa `client_documents` filtrando por `document_type = 'dashboard'`.
 */
export function useClientDashboards() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-dashboards', user?.id],
    queryFn: async (): Promise<ClientDashboard[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('client_documents')
        .select('id, name, description, url')
        .eq('user_id', user.id)
        .eq('document_type', 'dashboard')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || [])
        .filter((d) => !!d.url)
        .map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          url: d.url as string,
        }));
    },
    enabled: !!user?.id,
  });
}
