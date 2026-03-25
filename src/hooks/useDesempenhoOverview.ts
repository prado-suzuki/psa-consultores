import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const METAS_TABLE = 'metas' as any; // table not in generated types yet
const FEEDBACKS_TABLE = 'feedbacks' as any; // table not in generated types yet
const REUNIOES_TABLE = 'reunioes_1a1' as any; // table not in generated types yet

interface OverviewData {
  totalMetas: number;
  metasConcluidas: number;
  mediaProgresso: number;
  totalFeedbacks: number;
  totalReunioes: number;
  proximoPrazoCritico: { titulo: string; prazo: string; progresso: number } | null;
}

export const useDesempenhoOverview = (cicloId?: string) => {
  return useQuery<OverviewData>({
    queryKey: ['desempenho_overview', cicloId],
    queryFn: async () => {
      if (!cicloId) return { totalMetas: 0, metasConcluidas: 0, mediaProgresso: 0, totalFeedbacks: 0, totalReunioes: 0, proximoPrazoCritico: null };

      const [metasRes, feedbacksRes, reunioesRes] = await Promise.all([
        supabase.from(METAS_TABLE).select('*').eq('ciclo_id', cicloId),
        supabase.from(FEEDBACKS_TABLE).select('id').eq('ciclo_id', cicloId),
        supabase.from(REUNIOES_TABLE).select('id').eq('ciclo_id', cicloId),
      ]);

      const metas = (metasRes.data ?? []) as any[];
      const totalMetas = metas.length;
      const metasConcluidas = metas.filter((m) => m.status === 'concluida').length;
      const individuais = metas.filter((m) => m.nivel === 'individual');
      const mediaProgresso = individuais.length > 0 ? Math.round(individuais.reduce((a: number, m: any) => a + (m.progresso_atual ?? 0), 0) / individuais.length) : 0;

      // Próximo prazo crítico
      const hoje = new Date().toISOString().slice(0, 10);
      const criticas = metas
        .filter((m) => m.prazo && m.prazo >= hoje && m.progresso_atual < 70 && m.status === 'ativa')
        .sort((a: any, b: any) => a.prazo.localeCompare(b.prazo));
      const proximoPrazoCritico = criticas.length > 0 ? { titulo: criticas[0].titulo, prazo: criticas[0].prazo, progresso: criticas[0].progresso_atual } : null;

      return {
        totalMetas,
        metasConcluidas,
        mediaProgresso,
        totalFeedbacks: feedbacksRes.data?.length ?? 0,
        totalReunioes: reunioesRes.data?.length ?? 0,
        proximoPrazoCritico,
      };
    },
    enabled: !!cicloId,
  });
};
