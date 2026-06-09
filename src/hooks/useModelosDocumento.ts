import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { Database } from '@/integrations/supabase/types';
import type { TipoBloco } from '@/lib/templates';

export type ModeloRow = Database['public']['Tables']['tmpl_documento']['Row'];
export type DocumentoBlocoRow = Database['public']['Tables']['tmpl_documento_bloco']['Row'];

export interface ModeloComContagem extends ModeloRow {
  num_blocos: number;
}

/** Um bloco posicionado dentro de um modelo, com o resumo do bloco e seu conteúdo vigente. */
export interface DocumentoBlocoComBloco extends DocumentoBlocoRow {
  bloco: {
    id: string;
    nome: string;
    tipo: TipoBloco;
    categoria: string | null;
    ativo: boolean;
    conteudo: string | null;
    numero_versao: number | null;
    /** Nomes das flags requeridas (tmpl_bloco_flag → tmpl_flag.nome) — AND na composição. */
    flags: string[];
  } | null;
}

const KEY_MODELOS = ['modelos-documento'];
const keyBlocos = (documentoId: string) => ['modelo-blocos', documentoId];

/** Lista os modelos de documento com a contagem de blocos. */
export function useModelos() {
  return useQuery({
    queryKey: KEY_MODELOS,
    queryFn: async (): Promise<ModeloComContagem[]> => {
      const { data, error } = await supabase
        .from('tmpl_documento')
        .select('*, tmpl_documento_bloco(id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((m) => ({
        ...(m as ModeloRow),
        num_blocos: ((m.tmpl_documento_bloco ?? []) as unknown[]).length,
      }));
    },
  });
}

/** Carrega os blocos de um modelo, ordenados, com o conteúdo da versão atual de cada bloco. */
export function useModeloBlocos(documentoId: string | null) {
  return useQuery({
    queryKey: documentoId ? keyBlocos(documentoId) : ['modelo-blocos', 'none'],
    enabled: !!documentoId,
    queryFn: async (): Promise<DocumentoBlocoComBloco[]> => {
      const { data, error } = await supabase
        .from('tmpl_documento_bloco')
        .select(
          '*, tmpl_bloco(id, nome, tipo, categoria, ativo, tmpl_bloco_versao(conteudo, atual, numero_versao), tmpl_bloco_flag(tmpl_flag(nome)))',
        )
        .eq('documento_id', documentoId!)
        .order('ordem', { ascending: true });
      if (error) throw error;

      return (data ?? []).map((row) => {
        const bloco = row.tmpl_bloco as
          | {
              id: string;
              nome: string;
              tipo: TipoBloco;
              categoria: string | null;
              ativo: boolean;
              tmpl_bloco_versao: Array<{ conteudo: string | null; atual: boolean; numero_versao: number }>;
              tmpl_bloco_flag: Array<{ tmpl_flag: { nome: string } | null }>;
            }
          | null;
        const versaoAtual = bloco?.tmpl_bloco_versao?.find((v) => v.atual) ?? null;
        return {
          ...(row as DocumentoBlocoRow),
          bloco: bloco
            ? {
                id: bloco.id,
                nome: bloco.nome,
                tipo: bloco.tipo,
                categoria: bloco.categoria,
                ativo: bloco.ativo,
                conteudo: versaoAtual?.conteudo ?? null,
                numero_versao: versaoAtual?.numero_versao ?? null,
                flags: (bloco.tmpl_bloco_flag ?? [])
                  .map((f) => f.tmpl_flag?.nome)
                  .filter((n): n is string => Boolean(n)),
              }
            : null,
        };
      });
    },
  });
}

export interface SalvarModeloInput {
  id?: string;
  nome: string;
  tipo: string | null;
  descricao: string | null;
}

/** Cria ou edita os metadados de um modelo de documento. */
export function useSalvarModelo() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: SalvarModeloInput) => {
      if (input.id) {
        const { data, error } = await supabase
          .from('tmpl_documento')
          .update({ nome: input.nome, tipo: input.tipo, descricao: input.descricao })
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return { modelo: data as ModeloRow, acao: 'updated' as const };
      }
      const { data, error } = await supabase
        .from('tmpl_documento')
        .insert({ nome: input.nome, tipo: input.tipo, descricao: input.descricao })
        .select('*')
        .single();
      if (error) throw error;
      return { modelo: data as ModeloRow, acao: 'created' as const };
    },
    onSuccess: async ({ modelo, acao }) => {
      queryClient.invalidateQueries({ queryKey: KEY_MODELOS });
      await logAction({
        area: 'osg',
        entity_type: 'tmpl_documento',
        entity_id: modelo.id,
        entity_name: modelo.nome,
        action: acao,
      });
      toast({ title: acao === 'created' ? 'Modelo criado' : 'Modelo salvo', description: modelo.nome });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar modelo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useToggleModeloAtivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from('tmpl_documento')
        .update({ ativo })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as ModeloRow;
    },
    onSuccess: (modelo) => {
      queryClient.invalidateQueries({ queryKey: KEY_MODELOS });
      toast({ title: modelo.ativo ? 'Modelo ativado' : 'Modelo desativado', description: modelo.nome });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao alterar modelo', description: error.message, variant: 'destructive' });
    },
  });
}

/** Adiciona um bloco ao final da sequência do modelo. */
export function useAdicionarBloco() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentoId, blocoId }: { documentoId: string; blocoId: string }) => {
      const { data: ultima, error: erroOrdem } = await supabase
        .from('tmpl_documento_bloco')
        .select('ordem')
        .eq('documento_id', documentoId)
        .order('ordem', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (erroOrdem) throw erroOrdem;

      const { error } = await supabase.from('tmpl_documento_bloco').insert({
        documento_id: documentoId,
        bloco_id: blocoId,
        ordem: (ultima?.ordem ?? 0) + 1,
      });
      if (error) {
        if (error.code === '23505') throw new Error('Este bloco já está no modelo.');
        throw error;
      }
      return documentoId;
    },
    onSuccess: (documentoId) => {
      queryClient.invalidateQueries({ queryKey: keyBlocos(documentoId) });
      queryClient.invalidateQueries({ queryKey: KEY_MODELOS });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar bloco', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoverDocumentoBloco() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, documentoId }: { id: string; documentoId: string }) => {
      const { error } = await supabase.from('tmpl_documento_bloco').delete().eq('id', id);
      if (error) throw error;
      return documentoId;
    },
    onSuccess: (documentoId) => {
      queryClient.invalidateQueries({ queryKey: keyBlocos(documentoId) });
      queryClient.invalidateQueries({ queryKey: KEY_MODELOS });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover bloco', description: error.message, variant: 'destructive' });
    },
  });
}

/** Atualiza obrigatório/observação de um bloco posicionado. */
export function useAtualizarDocumentoBloco() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      documentoId,
      patch,
    }: {
      id: string;
      documentoId: string;
      patch: { obrigatorio?: boolean; observacao?: string | null };
    }) => {
      const { error } = await supabase.from('tmpl_documento_bloco').update(patch).eq('id', id);
      if (error) throw error;
      return documentoId;
    },
    onSuccess: (documentoId) => {
      queryClient.invalidateQueries({ queryKey: keyBlocos(documentoId) });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar bloco', description: error.message, variant: 'destructive' });
    },
  });
}

/** Reescreve a ordem dos blocos do modelo (ordem = posição na lista). */
export function useReordenarBlocos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentoId, idsOrdenados }: { documentoId: string; idsOrdenados: string[] }) => {
      // ordem não tem unique constraint, então atualizar em paralelo é seguro.
      const resultados = await Promise.all(
        idsOrdenados.map((id, i) =>
          supabase.from('tmpl_documento_bloco').update({ ordem: i + 1 }).eq('id', id),
        ),
      );
      const erro = resultados.find((r) => r.error)?.error;
      if (erro) throw erro;
      return documentoId;
    },
    // Update otimista: a lista reordena na hora, sem esperar o banco.
    onMutate: async ({ documentoId, idsOrdenados }) => {
      const key = keyBlocos(documentoId);
      await queryClient.cancelQueries({ queryKey: key });
      const anterior = queryClient.getQueryData<DocumentoBlocoComBloco[]>(key);
      if (anterior) {
        const porId = new Map(anterior.map((b) => [b.id, b]));
        const reordenado = idsOrdenados
          .map((id) => porId.get(id))
          .filter((b): b is DocumentoBlocoComBloco => Boolean(b));
        queryClient.setQueryData<DocumentoBlocoComBloco[]>(key, reordenado);
      }
      return { anterior, key };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.anterior) queryClient.setQueryData(context.key, context.anterior);
      toast({ title: 'Erro ao reordenar', description: error.message, variant: 'destructive' });
    },
    onSettled: (documentoId) => {
      if (documentoId) queryClient.invalidateQueries({ queryKey: keyBlocos(documentoId) });
    },
  });
}
