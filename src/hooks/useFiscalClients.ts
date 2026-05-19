import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';

export interface Cliente {
  id: string;
  nome: string;
  municipio: string | null;
  uf: string | null;
  setor_cliente: string | null;
  telefone: string | null;
  fixo: string | null;
  ativo: boolean | null;
  categoria: string | null;
  created_at: string;
  updated_at: string;
}

/** Lista de clientes ativos */
export function useFiscalClientsList() {
  return useQuery<Cliente[]>({
    queryKey: ['empresa-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('*')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');

      if (error) throw error;
      const list = (data || []) as Cliente[];

      // Enrich setor_cliente vindo da OS mais recente
      const ids = list.map(c => c.id);
      if (ids.length > 0) {
        const { data: viewRows } = await (supabase.from('cliente_setor_regiao_atual' as any) as any)
          .select('id_cliente, setor_cliente')
          .in('id_cliente', ids);
        const byId = new Map<string, string | null>(
          ((viewRows || []) as Array<{ id_cliente: string; setor_cliente: string | null }>)
            .map(r => [r.id_cliente, r.setor_cliente])
        );
        for (const c of list) c.setor_cliente = byId.get(c.id) ?? null;
      }

      return list;
    },
  });
}
