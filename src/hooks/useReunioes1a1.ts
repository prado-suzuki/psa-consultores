import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from './useAuditLog';
import { toast } from '@/hooks/use-toast';

export interface Reuniao1a1 {
  id: string;
  lider_id: string | null;
  membro_id: string | null;
  ciclo_id: string | null;
  data_reuniao: string;
  temas_discutidos: string | null;
  sentimento: number | null;
  observacoes_lider: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemAcao1a1 {
  id: string;
  reuniao_id: string;
  descricao: string;
  responsavel_id: string | null;
  prazo: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const R_TABLE = 'reunioes_1a1' as any; // table not in generated types yet
const I_TABLE = 'itens_acao_1a1' as any; // table not in generated types yet

export const useReunioes = (membroId?: string) => {
  return useQuery<Reuniao1a1[]>({
    queryKey: ['reunioes_1a1', membroId],
    queryFn: async () => {
      let q = supabase.from(R_TABLE).select('*').order('data_reuniao', { ascending: false });
      if (membroId) q = q.eq('membro_id', membroId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Reuniao1a1[];
    },
  });
};

export const useItensAcao = (reuniaoId?: string) => {
  return useQuery<ItemAcao1a1[]>({
    queryKey: ['itens_acao_1a1', reuniaoId],
    queryFn: async () => {
      const { data, error } = await supabase.from(I_TABLE).select('*').eq('reuniao_id', reuniaoId!).order('created_at');
      if (error) throw error;
      return (data ?? []) as ItemAcao1a1[];
    },
    enabled: !!reuniaoId,
  });
};

export const useAllOpenItensAcao = () => {
  return useQuery<(ItemAcao1a1 & { reuniao?: Reuniao1a1 })[]>({
    queryKey: ['itens_acao_1a1_open'],
    queryFn: async () => {
      const { data, error } = await supabase.from(I_TABLE).select('*').in('status', ['aberto', 'em_andamento']).order('prazo');
      if (error) throw error;
      return (data ?? []) as ItemAcao1a1[];
    },
  });
};

export const useCreateReuniao = () => {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: { reuniao: Omit<Reuniao1a1, 'id' | 'created_at' | 'updated_at'>; itens: Omit<ItemAcao1a1, 'id' | 'created_at' | 'updated_at' | 'reuniao_id'>[] }) => {
      const { data: r, error: rErr } = await supabase.from(R_TABLE).insert(input.reuniao).select().single();
      if (rErr) throw rErr;
      const reuniao = r as Reuniao1a1;
      if (input.itens.length > 0) {
        const itensPayload = input.itens.map((i) => ({ ...i, reuniao_id: reuniao.id }));
        const { error: iErr } = await supabase.from(I_TABLE).insert(itensPayload);
        if (iErr) throw iErr;
      }
      return reuniao;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['reunioes_1a1'] });
      qc.invalidateQueries({ queryKey: ['itens_acao_1a1'] });
      qc.invalidateQueries({ queryKey: ['itens_acao_1a1_open'] });
      logAction({ area: 'cadastros', entity_type: 'reuniao_1a1', entity_id: data.id, entity_name: `1:1 em ${data.data_reuniao}`, action: 'created' });
      toast({ title: '1:1 registrado' });
    },
    onError: () => toast({ title: 'Erro ao registrar 1:1', variant: 'destructive' }),
  });
};

export const useUpdateItemAcao = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ItemAcao1a1> & { id: string }) => {
      const { data, error } = await supabase.from(I_TABLE).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as ItemAcao1a1;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['itens_acao_1a1'] });
      qc.invalidateQueries({ queryKey: ['itens_acao_1a1_open'] });
    },
  });
};
