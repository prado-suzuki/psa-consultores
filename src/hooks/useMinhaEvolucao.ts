import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const METAS = 'metas' as any;
const FEEDBACKS = 'feedbacks' as any;
const REUNIOES = 'reunioes_1a1' as any;
const CICLOS = 'ciclos_avaliacao' as any;
const ATUALIZACOES = 'atualizacoes_meta' as any;

export interface MinhaEvolucaoData {
  metas: any[];
  feedbacks: any[];
  reunioes: any[];
  ciclosEncerrados: any[];
  atualizacoes: any[];
  pprCalculado: number;
  classificacaoProjetada: string;
  metasConcluidas: number;
  metasEmRisco: number;
}

const getClassificacao = (ppr: number) => {
  if (ppr >= 100) return 'supera';
  if (ppr >= 85) return 'atende';
  if (ppr >= 70) return 'atende_parcialmente';
  return 'abaixo';
};

export const useMinhaEvolucao = (cicloId?: string) => {
  const { user } = useAuth();

  return useQuery<MinhaEvolucaoData>({
    queryKey: ['minha_evolucao', user?.id, cicloId],
    queryFn: async () => {
      if (!user?.id || !cicloId) return { metas: [], feedbacks: [], reunioes: [], ciclosEncerrados: [], atualizacoes: [], pprCalculado: 0, classificacaoProjetada: 'abaixo', metasConcluidas: 0, metasEmRisco: 0 };

      const [metasRes, feedbacksRes, reunioesRes, ciclosRes] = await Promise.all([
        supabase.from(METAS).select('*').eq('ciclo_id', cicloId).eq('responsavel_id', user.id).eq('nivel', 'individual'),
        supabase.from(FEEDBACKS).select('*').eq('ciclo_id', cicloId).eq('para_usuario_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from(REUNIOES).select('*').eq('ciclo_id', cicloId).or(`lider_id.eq.${user.id},membro_id.eq.${user.id}`),
        supabase.from(CICLOS).select('*').eq('status', 'encerrado').order('data_inicio', { ascending: true }),
      ]);

      const metas = (metasRes.data ?? []) as any[];
      const feedbacks = (feedbacksRes.data ?? []) as any[];
      const reunioes = (reunioesRes.data ?? []) as any[];
      const ciclosEncerrados = (ciclosRes.data ?? []) as any[];

      // Calculate PPR
      const totalPeso = metas.reduce((a: number, m: any) => a + (m.peso || 1), 0);
      const pprCalculado = totalPeso > 0
        ? Math.round(metas.reduce((a: number, m: any) => a + (m.progresso_atual || 0) * (m.peso || 1), 0) / totalPeso)
        : 0;

      const hoje = new Date().toISOString().slice(0, 10);
      const metasConcluidas = metas.filter((m: any) => m.status === 'concluida').length;
      const metasEmRisco = metas.filter((m: any) => m.prazo && m.prazo < hoje && m.progresso_atual < 100 && m.status === 'ativa').length;

      return {
        metas,
        feedbacks,
        reunioes,
        ciclosEncerrados,
        atualizacoes: [],
        pprCalculado,
        classificacaoProjetada: getClassificacao(pprCalculado),
        metasConcluidas,
        metasEmRisco,
      };
    },
    enabled: !!user?.id && !!cicloId,
  });
};
