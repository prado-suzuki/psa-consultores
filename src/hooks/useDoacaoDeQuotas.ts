import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { capitalDoMovimento } from '@/lib/osg/movimentoQuotas';
import type { Gravame, PlanoDaDoacao } from '@/lib/osg/doacaoDeQuotas';

// Camada de dados da DOAÇÃO DE QUOTAS COM RESERVA DE USUFRUTO: o ato que grava
// os lançamentos de `doacao` no livro e o ônus de cada um em `onus_quotas`, e a
// leitura do ônus vigente de uma empresa (a tabela de usufruto e voto).

/** Um ônus vigente, lido de `onus_quotas`. */
export interface OnusDeQuotas {
  id: string;
  movimentoId: string | null;
  nuProprietarioId: string;
  usufrutuarioIds: string[];
  usufrutoOrigem: 'reserva' | 'instituicao' | null;
  comVoto: boolean;
  quotas: number;
  gravames: Gravame[];
}

/**
 * O ônus VIGENTE sobre as quotas da empresa: o que a tabela de usufruto e voto
 * mostra e o que toda consolidação futura reimprime. Extinto fica fora.
 */
export function useOnusDaEmpresa(empresaPessoaId: string | null) {
  return useQuery<OnusDeQuotas[]>({
    queryKey: ['onus-da-empresa', empresaPessoaId],
    enabled: !!empresaPessoaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onus_quotas')
        .select('id, movimento_id, nu_proprietario_pessoa_id, usufrutuario_pessoa_ids, usufruto_origem, usufruto_com_voto, quotas, gravames')
        .eq('empresa_pessoa_id', empresaPessoaId!)
        .is('extinto_em', null)
        .order('created_at');
      if (error) throw error;
      return (data ?? []).map((l) => ({
        id: l.id,
        movimentoId: l.movimento_id,
        nuProprietarioId: l.nu_proprietario_pessoa_id,
        usufrutuarioIds: l.usufrutuario_pessoa_ids ?? [],
        usufrutoOrigem: (l.usufruto_origem as OnusDeQuotas['usufrutoOrigem']) ?? null,
        comVoto: l.usufruto_com_voto,
        quotas: Number(l.quotas ?? 0),
        gravames: (l.gravames ?? []) as Gravame[],
      }));
    },
  });
}

/**
 * Grava o ato da DOAÇÃO: um lançamento de `doacao` por par doador → donatário e,
 * para cada um que reserva usufruto ou grava as quotas, a linha de ônus.
 *
 * Mesmo molde de `useSubirQuotas`: o ato nasce primeiro para os lançamentos
 * apontarem para ele; se qualquer insert falhar, o ato é apagado na volta e o
 * cascade leva o que já tinha entrado (movimentos, e o ônus pelos movimentos).
 * Não há transação porque o PostgREST não expõe uma.
 *
 * `created_at` explícito e escalonado, e `sequencia` junto: `now()` é o
 * timestamp da transação e empataria as linhas, e a ordem dos pares é a ordem
 * das cláusulas do instrumento.
 */
export function useDoarQuotas() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      clienteId,
      empresaPessoaId,
      plano,
      descricao,
      dataMovimento,
    }: {
      clienteId: string;
      empresaPessoaId: string;
      plano: PlanoDaDoacao;
      /** Frase que nomeia o ato para o consultor (vira a procedência no quadro). */
      descricao: string;
      dataMovimento: string | null;
    }) => {
      if (plano.problema) throw new Error(plano.problema);
      if (plano.lancamentos.length === 0) throw new Error('Nada a gravar: o plano está vazio.');

      const { data: ato, error: erroAto } = await supabase
        .from('ato_societario')
        .insert({ cliente_id: clienteId, data: dataMovimento, descricao })
        .select('id')
        .single();
      if (erroAto) throw erroAto;

      const desfazer = async () => {
        await supabase.from('ato_societario').delete().eq('id', ato.id);
      };

      const base = Date.now();
      const { data: movimentos, error: erroMov } = await supabase
        .from('movimentacao_quotas')
        .insert(
          plano.lancamentos.map((l, i) => ({
            cliente_id: clienteId,
            tipo: 'doacao',
            empresa_pessoa_id: empresaPessoaId,
            origem_pessoa_id: l.movimento.origemPessoaId,
            destino_pessoa_id: l.movimento.destinoPessoaId,
            quotas: l.movimento.quotas,
            vlr_capital_arredondado: capitalDoMovimento(l.movimento.quotas),
            data_movimento: l.movimento.dataMovimento,
            ato_id: ato.id,
            sequencia: l.movimento.sequencia ?? i + 1,
            created_at: new Date(base + i).toISOString(),
            quotas_legitima: l.movimento.quotasLegitima,
            quotas_disponivel: l.movimento.quotasDisponivel,
            instrumento_data: l.movimento.instrumentoData,
          })),
        )
        .select('id, sequencia');
      if (erroMov) {
        await desfazer();
        throw erroMov;
      }

      // O ônus aponta para o movimento pela SEQUÊNCIA, não pela posição da
      // resposta: o PostgREST não promete devolver as linhas na ordem do insert.
      const idPorSequencia = new Map((movimentos ?? []).map((m) => [m.sequencia, m.id]));
      const onus = plano.lancamentos.flatMap((l, i) => {
        if (!l.onus) return [];
        const movimentoId = idPorSequencia.get(l.movimento.sequencia ?? i + 1);
        if (!movimentoId) return [];
        return [{
          cliente_id: clienteId,
          empresa_pessoa_id: empresaPessoaId,
          movimento_id: movimentoId,
          nu_proprietario_pessoa_id: l.onus.nuProprietarioId,
          usufrutuario_pessoa_ids: l.onus.usufrutuarioIds,
          usufruto_origem: l.onus.usufrutoOrigem,
          usufruto_com_voto: l.onus.comVoto,
          quotas: l.onus.quotas,
          gravames: l.onus.gravames,
        }];
      });
      if (onus.length > 0) {
        const { error: erroOnus } = await supabase.from('onus_quotas').insert(onus);
        if (erroOnus) {
          await desfazer();
          throw erroOnus;
        }
      }
      return {
        atoId: ato.id,
        plano,
        descricao,
        clienteId,
        empresaPessoaId,
        dataMovimento,
        onus: onus.length,
      };
    },
    onSuccess: async ({ atoId, plano, descricao, clienteId, empresaPessoaId, dataMovimento, onus }) => {
      queryClient.invalidateQueries({ queryKey: ['quadro-da-empresa', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['socios-geracao', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['movimentos-da-empresa', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['onus-da-empresa', empresaPessoaId] });
      // A tela Gerar lê as cessões e doações pendentes por esta chave.
      queryClient.invalidateQueries({ queryKey: ['cessoes-do-livro', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['relatorio-societario'] });

      await logAction({
        area: 'osg',
        entity_type: 'ato_societario',
        entity_id: atoId,
        entity_name: descricao,
        action: 'created',
        changed_fields: {
          cliente_id: { old: null, new: clienteId },
          data: { old: null, new: dataMovimento },
          descricao: { old: null, new: descricao },
        },
      });

      toast({
        title: 'Doação de quotas registrada',
        description: `${plano.lancamentos.length} lançamento(s) em um ato`
          + (onus > 0 ? `, ${onus} com ônus sobre as quotas.` : '.'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar a doação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
