import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface RelatorioGerado {
  id: string;
  ciclo_id: string | null;
  membro_id: string | null;
  tipo: 'avaliacao_completa' | 'resumo_executivo' | 'recomendacao_bonus' | 'historico_evolucao';
  conteudo_ia: string | null;
  gerado_por: string | null;
  gerado_em: string;
  status: 'gerando' | 'pronto' | 'erro';
}

const TABLE = 'relatorios_gerados' as any; // table not in generated types yet

export const useRelatorios = (filters?: { membro_id?: string; ciclo_id?: string; tipo?: string }) => {
  return useQuery<RelatorioGerado[]>({
    queryKey: ['relatorios_gerados', filters],
    queryFn: async () => {
      let q = supabase.from(TABLE).select('*').order('gerado_em', { ascending: false });
      if (filters?.membro_id) q = q.eq('membro_id', filters.membro_id);
      if (filters?.ciclo_id) q = q.eq('ciclo_id', filters.ciclo_id);
      if (filters?.tipo) q = q.eq('tipo', filters.tipo);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as RelatorioGerado[];
    },
  });
};

export const useCachedSintese = () => {
  return useQuery<RelatorioGerado | null>({
    queryKey: ['cached_sintese_executiva'],
    queryFn: async () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('tipo', 'resumo_executivo')
        .is('membro_id', null)
        .eq('status', 'pronto')
        .gte('gerado_em', sixHoursAgo)
        .order('gerado_em', { ascending: false })
        .limit(1);
      if (error) throw error;
      const arr = (data ?? []) as unknown as RelatorioGerado[];
      return arr[0] ?? null;
    },
  });
};

export const useCreateRelatorio = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<RelatorioGerado, 'id' | 'gerado_em' | 'gerado_por'>) => {
      const { data, error } = await supabase.from(TABLE).insert({ ...input, gerado_por: user?.id }).select().single();
      if (error) throw error;
      return data as unknown as RelatorioGerado;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relatorios_gerados'] });
      qc.invalidateQueries({ queryKey: ['cached_sintese_executiva'] });
    },
    onError: () => toast({ title: 'Erro ao criar relatorio', variant: 'destructive' }),
  });
};

export const useUpdateRelatorio = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RelatorioGerado> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as unknown as RelatorioGerado;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relatorios_gerados'] });
      qc.invalidateQueries({ queryKey: ['cached_sintese_executiva'] });
    },
  });
};
