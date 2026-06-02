import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { Database } from '@/integrations/supabase/types';

export type BlocoRow = Database['public']['Tables']['tmpl_bloco']['Row'];
export type BlocoVersaoRow = Database['public']['Tables']['tmpl_bloco_versao']['Row'];

/** Bloco com a sua versão atual (conteúdo vigente). */
export interface BlocoComVersao extends BlocoRow {
  versao_atual: BlocoVersaoRow | null;
}

const QUERY_KEY = ['biblioteca-modelos', 'blocos'];

/** Lista os blocos com a versão marcada como atual. */
export function useBlocos() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<BlocoComVersao[]> => {
      const { data, error } = await supabase
        .from('tmpl_bloco')
        .select('*, tmpl_bloco_versao(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data ?? []).map((bloco) => {
        const versoes = (bloco.tmpl_bloco_versao ?? []) as BlocoVersaoRow[];
        return {
          ...(bloco as BlocoRow),
          versao_atual: versoes.find((v) => v.atual) ?? null,
        };
      });
    },
  });
}

export interface SalvarBlocoInput {
  /** Presente em edição; ausente em criação. */
  id?: string;
  nome: string;
  categoria: string | null;
  descricao: string | null;
  conteudo: string;
  /** Motivo da alteração — vira changelog da nova versão (apenas em edição). */
  changelog?: string | null;
}

/**
 * Cria um bloco novo (com versão 1) ou edita um existente.
 * Na edição, se o conteúdo mudar, cria uma NOVA versão e rebaixa a anterior —
 * garantindo reprodutibilidade dos documentos já gerados (princípio da arquitetura OSG).
 * Mudanças apenas de metadados (nome/categoria/descrição) não geram versão.
 */
export function useSalvarBloco() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: SalvarBlocoInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const autorId = userData.user?.id ?? null;

      // ----- Criação -----
      if (!input.id) {
        const { data: bloco, error: erroBloco } = await supabase
          .from('tmpl_bloco')
          .insert({
            nome: input.nome,
            categoria: input.categoria,
            descricao: input.descricao,
            autor_id: autorId,
          })
          .select('*')
          .single();
        if (erroBloco) throw erroBloco;

        const { error: erroVersao } = await supabase.from('tmpl_bloco_versao').insert({
          bloco_id: bloco.id,
          numero_versao: 1,
          conteudo: input.conteudo,
          atual: true,
          autor_id: autorId,
          changelog: 'Versão inicial',
        });
        if (erroVersao) {
          // Evita bloco órfão sem versão se a segunda etapa falhar.
          await supabase.from('tmpl_bloco').delete().eq('id', bloco.id);
          throw erroVersao;
        }
        return { bloco: bloco as BlocoRow, acao: 'created' as const };
      }

      // ----- Edição -----
      const { data: bloco, error: erroBloco } = await supabase
        .from('tmpl_bloco')
        .update({
          nome: input.nome,
          categoria: input.categoria,
          descricao: input.descricao,
        })
        .eq('id', input.id)
        .select('*')
        .single();
      if (erroBloco) throw erroBloco;

      // Versão atual para comparar o conteúdo.
      const { data: versaoAtual, error: erroVersaoAtual } = await supabase
        .from('tmpl_bloco_versao')
        .select('*')
        .eq('bloco_id', input.id)
        .eq('atual', true)
        .maybeSingle();
      if (erroVersaoAtual) throw erroVersaoAtual;

      const conteudoMudou = (versaoAtual?.conteudo ?? '') !== input.conteudo;
      if (conteudoMudou) {
        if (versaoAtual) {
          const { error } = await supabase
            .from('tmpl_bloco_versao')
            .update({ atual: false })
            .eq('id', versaoAtual.id);
          if (error) throw error;
        }
        const { error } = await supabase.from('tmpl_bloco_versao').insert({
          bloco_id: input.id,
          numero_versao: (versaoAtual?.numero_versao ?? 0) + 1,
          conteudo: input.conteudo,
          atual: true,
          autor_id: autorId,
          changelog: input.changelog ?? null,
        });
        if (error) throw error;
      }

      return { bloco: bloco as BlocoRow, acao: 'updated' as const, conteudoMudou };
    },
    onSuccess: async ({ bloco, acao }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      await logAction({
        area: 'osg',
        entity_type: 'tmpl_bloco',
        entity_id: bloco.id,
        entity_name: bloco.nome,
        action: acao,
      });
      toast({ title: acao === 'created' ? 'Bloco criado' : 'Bloco salvo', description: bloco.nome });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar bloco', description: error.message, variant: 'destructive' });
    },
  });
}

/** Ativa ou desativa um bloco (soft toggle — não remove do histórico). */
export function useToggleBlocoAtivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from('tmpl_bloco')
        .update({ ativo })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as BlocoRow;
    },
    onSuccess: (bloco) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: bloco.ativo ? 'Bloco ativado' : 'Bloco desativado', description: bloco.nome });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao alterar bloco', description: error.message, variant: 'destructive' });
    },
  });
}
