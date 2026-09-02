import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useAuth } from '@/contexts/AuthContext';
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

/**
 * O texto ANTES e DEPOIS não entra em `changed_fields` de propósito: ele já é
 * versionado em `tmpl_bloco_versao`, que é o lugar onde se lê a redação de cada
 * versão. Duplicá-lo aqui encheria os painéis de histórico (que renderizam o
 * diff campo a campo) com cláusulas inteiras de contrato.
 */
function invalidar(queryClient: ReturnType<typeof useQueryClient>, documentoGeradoId: string) {
  queryClient.invalidateQueries({ queryKey: ['documento-overrides', documentoGeradoId] });
  queryClient.invalidateQueries({ queryKey: ['modelo-blocos'] });
}

/** Cria (1ª vez) ou re-edita (nova versão do derivado) o override de um bloco. */
export function useSalvarOverride() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SalvarOverrideInput) => {
      const autorId = user?.id ?? null;
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
        let numeroNovo = versaoAtual?.numero_versao ?? 0;
        if (conteudoMudou) {
          // Baixar a versão atual e subir a nova numa transação só: feito daqui,
          // em duas escritas, o bloco ficava sem versão `atual` entre uma e outra
          // — e para sempre, se a segunda falhasse. Quem lê resolve
          // `find(v => v.atual) ?? null`, ou seja, texto vazio no documento.
          const { data: versaoNova, error } = await supabase.rpc('nova_versao_bloco', {
            _bloco_id: derivadoId,
            _conteudo: input.novoConteudo,
            _changelog: input.justificativa ?? 'Ajuste pontual no documento',
          });
          if (error) throw error;
          numeroNovo = versaoNova?.numero_versao ?? numeroNovo;
        }

        const { error: erroOverride } = await supabase
          .from('documento_override')
          .update({ observacao: input.justificativa })
          .eq('id', input.overrideExistenteId);
        if (erroOverride) throw erroOverride;

        await logAction({
          area: 'osg',
          entity_type: 'documento_override',
          entity_id: input.overrideExistenteId,
          entity_name: blocoAlvo.nome,
          action: 'updated',
          details: conteudoMudou
            ? 'Ajuste do bloco reeditado neste documento'
            : 'Motivo do ajuste reescrito (texto do bloco inalterado)',
          changed_fields: {
            observacao: { old: null, new: input.justificativa },
            ...(conteudoMudou
              ? { numero_versao: { old: versaoAtual?.numero_versao ?? 0, new: numeroNovo } }
              : {}),
          },
        });

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

      // Mesmo caminho da re-edição: quem numera e marca a versão atual é a RPC,
      // num lugar só. Aqui é a versão 1 de um bloco recém-criado, então não há
      // versão anterior a baixar.
      const { error: erroVersao } = await supabase.rpc('nova_versao_bloco', {
        _bloco_id: derivado.id,
        _conteudo: input.novoConteudo,
        _changelog: input.justificativa ?? 'Ajuste pontual no documento',
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

      await logAction({
        area: 'osg',
        entity_type: 'documento_override',
        entity_id: override.id,
        entity_name: blocoAlvo.nome,
        action: 'created',
        details: 'Bloco ajustado só para este documento',
        changed_fields: {
          bloco_alvo_id: { old: null, new: blocoAlvo.id },
          bloco_substituto_id: { old: null, new: derivado.id },
          observacao: { old: null, new: input.justificativa },
        },
      });

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
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ overrideId }: { overrideId: string; documentoGeradoId: string }) => {
      // O nome do bloco alvo vem junto na mesma leitura: depois do delete não há
      // mais de onde tirá-lo, e a trilha sem nome não diz o que foi revertido.
      const { data: ov, error: erroBusca } = await supabase
        .from('documento_override')
        .select('bloco_substituto_id, bloco_alvo_id, observacao, alvo:tmpl_bloco!bloco_alvo_id(nome)')
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

      await logAction({
        area: 'osg',
        entity_type: 'documento_override',
        entity_id: overrideId,
        entity_name: ov?.alvo?.nome ?? 'Bloco ajustado',
        action: 'deleted',
        details: 'Ajuste revertido: o bloco voltou ao texto da biblioteca',
        changed_fields: {
          bloco_alvo_id: { old: ov?.bloco_alvo_id ?? null, new: null },
          bloco_substituto_id: { old: ov?.bloco_substituto_id ?? null, new: null },
          observacao: { old: ov?.observacao ?? null, new: null },
        },
      });
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
