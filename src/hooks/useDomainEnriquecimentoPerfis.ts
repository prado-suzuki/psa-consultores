/**
 * Camada de dados dos perfis de enriquecimento (`enriquecimento_perfil`).
 *
 * Único lugar que fala com a tabela — os componentes chegam por aqui. É CRUD
 * direto no Supabase (e não pela edge function, como o Agente PSA): a RLS da
 * tabela já restringe tudo a admin, e quem escreve é o próprio admin autenticado
 * — `created_by`/`updated_by` têm sentido ser o usuário real.
 *
 * NADA de exclusão física aqui, de propósito: o `nome` do perfil é chave de
 * integração — a edge function `enriquecer-texto` recebe o nome na chamada e
 * procura a linha por ele. Apagar o registro quebra consumidores que o citam; o
 * caminho é desativar (`ativo = false`), e a chamada passa a falhar com
 * "Perfil de enriquecimento inválido" até alguém reativar.
 *
 * A auditoria (área `dev`, tipo `enriquecimento_perfil`) grava diff campo a
 * campo — é configuração de comportamento de IA em produção, e a pergunta "quem
 * mudou a instrução do perfil X, quando e de que para quê" só o diff responde.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { computeFieldDiff } from '@/lib/diffUtils';
import {
  CAMPOS_AUDITADOS,
  nomeDeExibicao,
  type PerfilEnriquecimento,
  type ValoresDoPerfil,
} from '@/lib/enriquecimentoPerfis';

export const ENRIQUECIMENTO_PERFIS_QUERY_KEY = ['enriquecimento-perfis'] as const;

/**
 * A listagem inteira, em ordem de rótulo — são dezenas de linhas no máximo, e a
 * tela não tem busca: ordenar no banco evita reordenar no cliente a cada render.
 */
export function useEnriquecimentoPerfis(habilitado = true) {
  return useQuery({
    queryKey: ENRIQUECIMENTO_PERFIS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enriquecimento_perfil')
        .select('*')
        .order('rotulo', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PerfilEnriquecimento[];
    },
    enabled: habilitado,
  });
}

function useAutor() {
  const { user } = useAuth();
  return user?.id ?? null;
}

/** Criação. Audita com o diff de tudo o que entra (o "antes" é nulo). */
export function useCriarEnriquecimentoPerfil() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const autor = useAutor();

  return useMutation({
    mutationKey: ['enriquecimento-perfis', 'criar'],
    mutationFn: async (valores: ValoresDoPerfil) => {
      const novo = { ...valores, created_by: autor, updated_by: autor };
      const { data, error } = await supabase
        .from('enriquecimento_perfil')
        .insert(novo)
        .select()
        .single();
      if (error) throw error;

      await logAction({
        area: 'dev',
        entity_type: 'enriquecimento_perfil',
        entity_id: data.id,
        entity_name: nomeDeExibicao(data),
        action: 'created',
        changed_fields: computeFieldDiff(
          null,
          data as unknown as Record<string, unknown>,
          CAMPOS_AUDITADOS,
        ),
      });

      return data as PerfilEnriquecimento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENRIQUECIMENTO_PERFIS_QUERY_KEY });
    },
  });
}

/**
 * Edição. O `nome` NÃO vai no payload: é a chave de integração — o código chama
 * o perfil por ele, e renomear por aqui silenciaria todos os chamadores sem
 * aviso nenhum. No diff de auditoria ele continua sendo comparado (e nunca
 * difere, justamente porque não é enviado).
 */
export function useEditarEnriquecimentoPerfil() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const autor = useAutor();

  return useMutation({
    mutationKey: ['enriquecimento-perfis', 'editar'],
    mutationFn: async ({
      original,
      valores,
    }: {
      original: PerfilEnriquecimento;
      valores: ValoresDoPerfil;
    }) => {
      const { nome: _nomeIntegracao, ...mudancas } = valores;
      const patch = { ...mudancas, updated_by: autor };
      const { data, error } = await supabase
        .from('enriquecimento_perfil')
        .update(patch)
        .eq('id', original.id)
        .select()
        .single();
      if (error) throw error;

      await logAction({
        area: 'dev',
        entity_type: 'enriquecimento_perfil',
        entity_id: original.id,
        entity_name: nomeDeExibicao(data),
        action: 'updated',
        changed_fields: computeFieldDiff(
          original as unknown as Record<string, unknown>,
          valores as unknown as Record<string, unknown>,
          CAMPOS_AUDITADOS,
        ),
      });

      return data as PerfilEnriquecimento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENRIQUECIMENTO_PERFIS_QUERY_KEY });
    },
  });
}

/**
 * Ativação e desativação. A DESATIVAÇÃO tem efeito imediato nas chamadas da
 * edge function — por isso a confirmação fica na tela, não aqui; e por isso o
 * diff de auditoria é só o `ativo`.
 */
export function useAlternarEnriquecimentoPerfil() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const autor = useAutor();

  return useMutation({
    mutationKey: ['enriquecimento-perfis', 'alternar-ativo'],
    mutationFn: async ({ perfil, ativo }: { perfil: PerfilEnriquecimento; ativo: boolean }) => {
      const patch = { ativo, updated_by: autor };
      const { data, error } = await supabase
        .from('enriquecimento_perfil')
        .update(patch)
        .eq('id', perfil.id)
        .select()
        .single();
      if (error) throw error;

      await logAction({
        area: 'dev',
        entity_type: 'enriquecimento_perfil',
        entity_id: perfil.id,
        entity_name: nomeDeExibicao(perfil),
        action: 'updated',
        changed_fields: computeFieldDiff(
          perfil as unknown as Record<string, unknown>,
          { ativo } as unknown as Record<string, unknown>,
          ['ativo'],
        ),
      });

      return data as PerfilEnriquecimento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENRIQUECIMENTO_PERFIS_QUERY_KEY });
    },
  });
}
