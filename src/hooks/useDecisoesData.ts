import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const METAS = 'metas' as any;
const FEEDBACKS = 'feedbacks' as any;

export interface MembroDecisao {
  membro_id: string;
  first_name: string;
  last_name: string;
  ppr: number;
  classificacao: string;
  totalMetas: number;
  metasConcluidas: number;
  feedbacksPositivos: number;
  feedbacksDesenvolvimento: number;
  recomendacao_decisao: string | null;
}

const getClassificacao = (ppr: number) => {
  if (ppr >= 100) return 'supera';
  if (ppr >= 85) return 'atende';
  if (ppr >= 70) return 'atende_parcialmente';
  return 'abaixo';
};

export const useDecisoesData = (cicloId?: string) => {
  return useQuery<MembroDecisao[]>({
    queryKey: ['decisoes_data', cicloId],
    queryFn: async () => {
      if (!cicloId) return [];

      const [metasRes, feedbacksRes, profilesRes] = await Promise.all([
        supabase.from(METAS).select('*').eq('ciclo_id', cicloId).eq('nivel', 'individual'),
        supabase.from(FEEDBACKS).select('*').eq('ciclo_id', cicloId),
        supabase.from('profiles' as any).select('id, first_name, last_name'),
      ]);

      const metas = (metasRes.data ?? []) as any[];
      const feedbacks = (feedbacksRes.data ?? []) as any[];
      const profiles = (profilesRes.data ?? []) as any[];
      const profileMap = new Map(profiles.map((p: any) => [p.id, p]));

      // Group metas by responsavel_id
      const byMembro = new Map<string, any[]>();
      metas.forEach((m: any) => {
        if (!m.responsavel_id) return;
        if (!byMembro.has(m.responsavel_id)) byMembro.set(m.responsavel_id, []);
        byMembro.get(m.responsavel_id)!.push(m);
      });

      const result: MembroDecisao[] = [];
      byMembro.forEach((memberMetas, membroId) => {
        const profile = profileMap.get(membroId);
        if (!profile) return;

        const totalPeso = memberMetas.reduce((a: number, m: any) => a + (m.peso || 1), 0);
        const ppr = totalPeso > 0
          ? Math.round(memberMetas.reduce((a: number, m: any) => a + (m.progresso_atual || 0) * (m.peso || 1), 0) / totalPeso)
          : 0;

        const memberFeedbacks = feedbacks.filter((f: any) => f.para_usuario_id === membroId);
        const firstMeta = memberMetas[0]; // get recomendacao_decisao from any meta

        result.push({
          membro_id: membroId,
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          ppr,
          classificacao: getClassificacao(ppr),
          totalMetas: memberMetas.length,
          metasConcluidas: memberMetas.filter((m: any) => m.status === 'concluida').length,
          feedbacksPositivos: memberFeedbacks.filter((f: any) => f.tipo === 'positivo' || f.tipo === 'reconhecimento').length,
          feedbacksDesenvolvimento: memberFeedbacks.filter((f: any) => f.tipo === 'construtivo' || f.tipo === 'desenvolvimento').length,
          recomendacao_decisao: firstMeta?.recomendacao_decisao ?? null,
        });
      });

      return result.sort((a, b) => b.ppr - a.ppr);
    },
    enabled: !!cicloId,
  });
};

export const usePendingDecisionsCount = (cicloId?: string) => {
  return useQuery<number>({
    queryKey: ['pending_decisions_count', cicloId],
    queryFn: async () => {
      if (!cicloId) return 0;
      const { data, error } = await supabase
        .from(METAS)
        .select('responsavel_id')
        .eq('ciclo_id', cicloId)
        .eq('nivel', 'individual')
        .is('recomendacao_decisao', null);
      if (error) throw error;
      const unique = new Set((data ?? []).map((d: any) => d.responsavel_id).filter(Boolean));
      return unique.size;
    },
    enabled: !!cicloId,
  });
};
