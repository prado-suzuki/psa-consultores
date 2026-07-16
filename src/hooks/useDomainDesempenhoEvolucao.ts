import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DesempenhoEvolucaoMeta {
  id: string;
  ciclo_id: string;
  progresso_atual: number;
  peso: number;
  dimensao: string;
  classificacao_final: string | null;
  ajuste_qualitativo: string | null;
}

export interface DesempenhoEvolucaoItemAcao {
  id: string;
  reuniao_id: string;
  descricao: string;
  status: string;
}

interface ReuniaoComId {
  id: string;
}

export function useMetasMembroEvolucao(responsavelId: string) {
  return useQuery<DesempenhoEvolucaoMeta[]>({
    queryKey: ['metas_member_all', responsavelId],
    queryFn: async () => {
      if (!responsavelId) return [];

      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('responsavel_id', responsavelId)
        .eq('nivel', 'individual');

      if (error) throw error;
      return (data ?? []) as unknown as DesempenhoEvolucaoMeta[];
    },
    enabled: !!responsavelId,
  });
}

export function useItensAcaoMembroEvolucao(membroId: string, reunioes: ReuniaoComId[] | undefined) {
  return useQuery<DesempenhoEvolucaoItemAcao[]>({
    queryKey: ['itens_acao_member', membroId],
    queryFn: async () => {
      if (!membroId || !reunioes) return [];

      const reuniaoIds = reunioes.map((reuniao) => reuniao.id);
      if (reuniaoIds.length === 0) return [];

      const { data } = await supabase
        .from('itens_acao_1a1')
        .select('*')
        .in('reuniao_id', reuniaoIds);

      return (data ?? []) as unknown as DesempenhoEvolucaoItemAcao[];
    },
    enabled: !!membroId && !!reunioes,
  });
}
