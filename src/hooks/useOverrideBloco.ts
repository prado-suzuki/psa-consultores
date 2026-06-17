import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { BlocoComVersao } from '@/hooks/useBibliotecaModelos';

// Override de bloco escopado a um documento gerado: edita o texto SÓ deste
// documento sem tocar o bloco original da Biblioteca. Mecanismo (sempre
// tipo='substituicao'):
//   1. cria um tmpl_bloco DERIVADO (bloco_origem_id → original, tipo_derivacao
//      'edicao_pontual', escopo_documento_raiz_id) — só para rastreabilidade;
//   2. versiona o conteúdo editado em tmpl_bloco_versao (atual=true);
//   3. registra um documento_override (alvo → substituto) que a composição aplica.
// A composição (GerarDocumento) mantém posição/flags/tipo do ORIGINAL e só troca
// o `conteudo`, então numeração, repetidores e placeholders seguem funcionando.

export interface SalvarOverrideInput {
  documentoGeradoId: string;
  /** documento_gerado.documento_raiz_id — restringe a linhagem do derivado. */
  documentoRaizId: string;
  /** Bloco original (Biblioteca) sendo ajustado. */
  blocoAlvo: BlocoComVersao;
  /** Texto editado (formato do EditorConteudoModelo). */
  novoConteudo: string;
  justificativa: string | null;
  /** Se já há override ativo para este alvo (re-edição). */
  overrideExistenteId?: string | null;
  /** O bloco derivado já criado, em re-edição. */
  blocoSubstitutoExistenteId?: string | null;
  /** Só para invalidação da prévia. */
  modeloId?: string | null;
}

function invalidar(queryClient: ReturnType<typeof useQueryClient>, documentoGeradoId: string) {
  queryClient.invalidateQueries({ queryKey: ['documento-overrides', documentoGeradoId] });
  queryClient.invalidateQueries({ queryKey: ['modelo-blocos'] });
}

/** Cria (1ª vez) ou re-edita (nova versão do derivado) o override de um bloco. */
export function useSalvarOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SalvarOverrideInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const autorId = userData.user?.id ?? null;
      const { blocoAlvo } = input;

      // ----- Caso 2 — re-edição: nova versão do bloco derivado existente -----
      if (input.overrideExistenteId && input.blocoSubstitutoExistenteId) {
        const derivadoId = input.blocoSubstitutoExistenteId;
        const { data: versaoAtual, error: erroVersaoAtual } = await supabase
          .from('tmpl_bloco_versao')
          .select('*')
          .eq('bloco_id', derivadoId)
          .eq('atual', true)
          .maybeSingle();
        if (erroVersaoAtual) throw erroVersaoAtual;

        // Sem mudança de conteúdo: só atualiza o motivo no override e encerra.
        const conteudoMudou = (versaoAtual?.conteudo ?? '') !== input.novoConteudo;
        if (conteudoMudou) {
          if (versaoAtual) {
            const { error } = await supabase
              .from('tmpl_bloco_versao')
              .update({ atual: false })
              .eq('id', versaoAtual.id);
            if (error) throw error;
          }
          const { error } = await supabase.from('tmpl_bloco_versao').insert({
            bloco_id: derivadoId,
            numero_versao: (versaoAtual?.numero_versao ?? 0) + 1,
            conteudo: input.novoConteudo,
            atual: true,
            autor_id: autorId,
            changelog: input.justificativa ?? 'Ajuste pontual no documento',
          });
          if (error) throw error;
        }

        const { error: erroOverride } = await supabase
          .from('documento_override')
          .update({ observacao: input.justificativa })
          .eq('id', input.overrideExistenteId);
        if (erroOverride) throw erroOverride;

        return { overrideId: input.overrideExistenteId, blocoSubstitutoId: derivadoId, acao: 're-editado' as const };
      }

      // ----- Caso 1 — primeiro override deste bloco neste documento -----
      const { data: derivado, error: erroDerivado } = await supabase
        .from('tmpl_bloco')
        .insert({
          nome: `${blocoAlvo.nome} — ajuste do documento`,
          categoria: blocoAlvo.categoria,
          descricao: blocoAlvo.descricao,
          tipo: blocoAlvo.tipo,
          repete_colecao: blocoAlvo.repete_colecao,
          ancora: blocoAlvo.ancora,
          bloco_origem_id: blocoAlvo.id,
          tipo_derivacao: 'edicao_pontual',
          escopo_documento_raiz_id: input.documentoRaizId,
          ativo: true,
          autor_id: autorId,
        })
        .select('*')
        .single();
      if (erroDerivado) throw erroDerivado;

      const { error: erroVersao } = await supabase.from('tmpl_bloco_versao').insert({
        bloco_id: derivado.id,
        numero_versao: 1,
        conteudo: input.novoConteudo,
        atual: true,
        autor_id: autorId,
        changelog: input.justificativa ?? 'Ajuste pontual no documento',
      });
      if (erroVersao) {
        // Evita derivado órfão sem versão se a 2ª etapa falhar.
        await supabase.from('tmpl_bloco').delete().eq('id', derivado.id);
        throw erroVersao;
      }

      const { data: override, error: erroOverride } = await supabase
        .from('documento_override')
        .insert({
          documento_gerado_id: input.documentoGeradoId,
          tipo: 'substituicao',
          bloco_alvo_id: blocoAlvo.id,
          bloco_substituto_id: derivado.id,
          observacao: input.justificativa,
        })
        .select('id')
        .single();
      if (erroOverride) throw erroOverride;

      return { overrideId: override.id, blocoSubstitutoId: derivado.id, acao: 'criado' as const };
    },
    onSuccess: (_res, input) => {
      invalidar(queryClient, input.documentoGeradoId);
      toast({ title: 'Ajuste salvo', description: 'O bloco foi ajustado só para este documento.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar o ajuste', description: error.message, variant: 'destructive' });
    },
  });
}

/**
 * Reverte um override (hard delete) — a prévia volta ao texto original. Apaga o
 * registro de override e, em seguida, o bloco derivado órfão (suas versões caem
 * por ON DELETE CASCADE). A ordem importa: bloco_substituto_id é ON DELETE
 * RESTRICT, então o override sai primeiro.
 */
export function useReverterOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ overrideId }: { overrideId: string; documentoGeradoId: string }) => {
      const { data: ov, error: erroBusca } = await supabase
        .from('documento_override')
        .select('bloco_substituto_id')
        .eq('id', overrideId)
        .maybeSingle();
      if (erroBusca) throw erroBusca;

      const { error: erroOverride } = await supabase
        .from('documento_override')
        .delete()
        .eq('id', overrideId);
      if (erroOverride) throw erroOverride;

      if (ov?.bloco_substituto_id) {
        const { error: erroDerivado } = await supabase
          .from('tmpl_bloco')
          .delete()
          .eq('id', ov.bloco_substituto_id);
        if (erroDerivado) throw erroDerivado;
      }
    },
    onSuccess: (_res, { documentoGeradoId }) => {
      invalidar(queryClient, documentoGeradoId);
      toast({ title: 'Ajuste removido', description: 'O bloco voltou ao texto padrão da biblioteca.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover o ajuste', description: error.message, variant: 'destructive' });
    },
  });
}
