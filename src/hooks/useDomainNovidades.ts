import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { toast } from '@/hooks/use-toast';

export type NovidadeCategoria = 'empresa' | 'tributario' | 'servicos' | 'cases';

export interface Novidade {
  id: string;
  categoria: NovidadeCategoria;
  titulo: string;
  descricao: string;
  data_publicacao: string;
  itens: string[];
  imagem_url: string | null;
  botao_texto: string | null;
  botao_url: string | null;
  ativo: boolean;
  created_at: string;
  conteudo_completo?: string | null;
  imagem_lateral_url?: string | null;
  imagem_lateral_posicao?: string | null;
  texto_original?: string | null;
}

export interface NovidadeFormData {
  categoria: NovidadeCategoria;
  titulo: string;
  descricao: string;
  itens: string[];
  imagem_url: string;
  botao_texto: string;
  botao_url: string;
  ativo: boolean;
  conteudo_completo: string;
  imagem_lateral_url: string;
  imagem_lateral_posicao: 'esquerda' | 'direita';
  texto_original: string;
}

export interface RestructureNovidadeResponse {
  texto_reestruturado?: string;
}

interface UpdateNovidadeInput {
  id: string;
  data: NovidadeFormData;
}

interface ToggleNovidadeAtivoInput {
  id: string;
  ativo: boolean;
}

interface UseDomainNovidadesOptions {
  onFormSaved: () => void;
}

export const novidadesQueryKey = ['gestao-novidades'] as const;
export const novidadesPublicasQueryKey = ['novidades-publicas'] as const;

function buildNovidadePayload(data: NovidadeFormData) {
  return {
    categoria: data.categoria,
    titulo: data.titulo,
    descricao: data.descricao,
    itens: data.itens,
    imagem_url: data.imagem_url || null,
    botao_texto: data.botao_texto || null,
    botao_url: data.botao_url || null,
    ativo: data.ativo,
    conteudo_completo: data.conteudo_completo || null,
    imagem_lateral_url: data.imagem_lateral_url || null,
    imagem_lateral_posicao: data.imagem_lateral_posicao || 'direita',
    texto_original: data.texto_original || null,
  };
}

export function usePublicNovidades() {
  return useQuery({
    queryKey: novidadesPublicasQueryKey,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('novidades')
        .select('*')
        .eq('ativo', true)
        .order('data_publicacao', { ascending: false });

      if (error) throw error;
      return data as Novidade[];
    },
  });
}

export function useDomainNovidades({ onFormSaved }: UseDomainNovidadesOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: novidadesQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('novidades')
        .select('*')
        .order('data_publicacao', { ascending: false });

      if (error) throw error;
      return data as Novidade[];
    },
  });

  const invalidateNovidades = () => {
    void queryClient.invalidateQueries({ queryKey: novidadesQueryKey });
  };

  const createMutation = useMutation({
    mutationFn: async (data: NovidadeFormData) => {
      const { error } = await supabase.from('novidades').insert(buildNovidadePayload(data));
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateNovidades();
      toast({ title: 'Novidade criada com sucesso!' });
      onFormSaved();
    },
    onError: () => {
      toast({ title: 'Erro ao criar novidade', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: UpdateNovidadeInput) => {
      await assertCanPerform('novidades', 'update', id);
      const { error } = await supabase
        .from('novidades')
        .update(buildNovidadePayload(data))
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateNovidades();
      toast({ title: 'Novidade atualizada com sucesso!' });
      onFormSaved();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar novidade',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await assertCanPerform('novidades', 'delete', id);
      const { error } = await supabase.from('novidades').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateNovidades();
      toast({ title: 'Novidade excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir novidade',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: ToggleNovidadeAtivoInput) => {
      await assertCanPerform('novidades', 'update', id);
      const { error } = await supabase.from('novidades').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateNovidades();
      toast({ title: 'Status atualizado!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const restructureMutation = useMutation({
    mutationFn: async (texto: string) => {
      const { data, error } = await supabase.functions.invoke<RestructureNovidadeResponse>(
        'restructure-novidade',
        { body: { texto } },
      );

      if (error) throw error;
      return data;
    },
  });

  return {
    novidades: query.data,
    isLoading: query.isLoading,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleAtivoMutation,
    restructureMutation,
  };
}
