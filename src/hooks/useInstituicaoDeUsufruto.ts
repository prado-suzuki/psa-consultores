import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { PlanoDaInstituicao } from '@/lib/osg/onusDaSociedade';

// Camada de dados da INSTITUIÇÃO DE USUFRUTO AVULSA: o ato em que quem tem a
// propriedade plena entrega o usufruto dela, sem que nenhuma quota mude de mão.
//
// Difere de `useDoarQuotas` em uma coisa que muda o código inteiro: não há
// lançamento no livro. O ato produz só linhas de `onus_quotas`, presas a ele
// por `ato_id` (na doação a ponte é o `movimento_id`, que aqui não existe). É
// esse vínculo que faz o ato aparecer no card de Atos Societários e que faz
// desfazê-lo levar o usufruto junto, pelo cascade.

/**
 * Grava a instituição: um `ato_societario` e uma linha de ônus por par.
 *
 * Mesmo molde de `useDoarQuotas`: o ato nasce primeiro para o ônus apontar para
 * ele, e se o insert do ônus falhar o ato é apagado na volta. Não há transação
 * porque o PostgREST não expõe uma.
 */
export function useInstituirUsufruto() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      clienteId,
      empresaPessoaId,
      plano,
      descricao,
      dataDoAto,
    }: {
      clienteId: string;
      empresaPessoaId: string;
      plano: PlanoDaInstituicao;
      /** Frase que nomeia o ato para o consultor (vira a procedência no card). */
      descricao: string;
      dataDoAto: string | null;
    }) => {
      if (plano.problema) throw new Error(plano.problema);
      if (plano.onus.length === 0) throw new Error('Nada a gravar: o plano está vazio.');

      const { data: ato, error: erroAto } = await supabase
        .from('ato_societario')
        .insert({ cliente_id: clienteId, data: dataDoAto, descricao })
        .select('id')
        .single();
      if (erroAto) throw erroAto;

      const { error: erroOnus } = await supabase.from('onus_quotas').insert(
        plano.onus.map((o) => ({
          cliente_id: clienteId,
          empresa_pessoa_id: empresaPessoaId,
          ato_id: ato.id,
          movimento_id: null,
          nu_proprietario_pessoa_id: o.nuProprietarioId,
          usufrutuario_pessoa_ids: o.usufrutuarioIds,
          usufruto_origem: o.usufrutoOrigem,
          usufruto_com_voto: o.comVoto,
          quotas: o.quotas,
          gravames: o.gravames,
        })),
      );
      if (erroOnus) {
        await supabase.from('ato_societario').delete().eq('id', ato.id);
        throw erroOnus;
      }

      return { atoId: ato.id, quantos: plano.onus.length, descricao, clienteId, dataDoAto };
    },
    onSuccess: async ({ atoId, quantos, descricao, clienteId, dataDoAto }, { empresaPessoaId }) => {
      // O quadro societário não muda (nenhuma quota mudou de mão), mas quem
      // VOTA muda, e disso vivem o card de usufruto e o contrato consolidado.
      queryClient.invalidateQueries({ queryKey: ['onus-da-empresa', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['movimentos-da-empresa', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['relatorio-societario'] });

      await logAction({
        area: 'osg',
        entity_type: 'ato_societario',
        entity_id: atoId,
        entity_name: descricao,
        action: 'created',
        changed_fields: {
          cliente_id: { old: null, new: clienteId },
          data: { old: null, new: dataDoAto },
          descricao: { old: null, new: descricao },
        },
      });

      toast({
        title: 'Instituição de usufruto registrada',
        description: `${quantos} concessão(ões) de usufruto, sem mudança na titularidade das quotas.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar a instituição de usufruto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
