import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useMovimentosDaEmpresa } from '@/hooks/useMovimentacaoQuotas';
import { STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO } from '@/lib/osg/statusIntegralizacao';
import { baselineDoSnapshot, type SnapshotDaPeca } from '@/lib/osg/baselineDaPeca';
import {
  derivarEventosDaAlteracao,
  type EventoDerivado,
  type MudancaDeCadastro,
} from '@/lib/osg/eventosDaAlteracao';

// Os eventos que a alteração contratual tem de contar, montados do ledger mais a
// janela de `audit_logs` do documento registrado que a peça sucede.
//
// A janela é a MESMA que as notificações de mudança de variável já usam
// (`performed_at > snapshot_validado_em`, ver useNotificacoesDocumento): não é
// máquina nova, é a mesma apontada para outro fim. O que ela responde aqui é o
// que o livro de movimentos não sabe: endereço da sede e administração não são
// quota, e por isso não passam por `movimentacao_quotas`.

interface ArgsDosEventos {
  empresaPessoaId: string | null;
  /** `snapshot_validado_em` do documento registrado que a peça sucede. */
  validadoEm: string | null;
  /** Ids das linhas de `administracao` da empresa: o outro lado da janela. */
  administracaoIds: readonly string[];
  /**
   * `snapshot_dados` da peça registrada que esta substitui: é dele que sai o
   * ESTADO de antes (capital e quadro publicados), e não da projeção dos
   * movimentos formalizados — ver a D2 e `baselineDaPeca.ts`.
   */
  snapshotDoBase?: SnapshotDaPeca | null;
  /** CPF/CNPJ por pessoa do quadro vivo, a chave do diff de quadro. */
  cpfCnpjPorPessoaId?: Readonly<Record<string, string>>;
  /** Pessoas que administram: responde se a retirada as deixou fora do quadro. */
  administradorPessoaIds?: readonly string[];
}

/**
 * Mudanças de cadastro da PJ desde o documento registrado: as do endereço da
 * sede (logadas na `pessoa` da PJ) e as da administração (logadas nas linhas de
 * `administracao`).
 *
 * Sem `validadoEm` não há janela, e a query não roda: um documento registrado
 * sem snapshot validado não define "depois de quando".
 */
function useMudancasDesdeORegistro({
  empresaPessoaId,
  validadoEm,
  administracaoIds,
}: ArgsDosEventos) {
  const ids = useMemo(
    () => [empresaPessoaId, ...administracaoIds].filter((id): id is string => !!id).sort(),
    [empresaPessoaId, administracaoIds],
  );
  return useQuery({
    queryKey: ['mudancas-desde-registro', validadoEm, ids],
    enabled: !!validadoEm && ids.length > 0,
    queryFn: async (): Promise<MudancaDeCadastro[]> => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('entity_type, entity_id, action, changed_fields')
        .eq('area', 'osg')
        .in('entity_id', ids)
        .gt('performed_at', validadoEm!)
        .order('performed_at');
      if (error) throw error;
      return (data ?? []).map((l) => ({
        entityType: String(l.entity_type),
        entityId: String(l.entity_id),
        action: String(l.action),
        campos: Object.keys((l.changed_fields ?? {}) as Record<string, unknown>),
      }));
    },
  });
}

/**
 * A lista de eventos da alteração, já montada, cada um com a evidência que o
 * sustenta. É o que transforma o assistente de pergunta em conferência.
 */
export function useEventosDerivados(args: ArgsDosEventos): {
  eventos: EventoDerivado[];
  /**
   * Ids dos movimentos da empresa AINDA sem documento. É o que o contrato social
   * carimba ao ser registrado: ele não passa pelo assistente, e a cláusula de
   * capital dele conta todos os aportes de constituição (D3). Sai daqui, e não de
   * outra query, porque o livro já está em mão.
   */
  idsPendentes: string[];
  isFetching: boolean;
} {
  const { data: livro, isFetching: lendoLivro } = useMovimentosDaEmpresa(args.empresaPessoaId);
  const { data: mudancas, isFetching: lendoMudancas } = useMudancasDesdeORegistro(args);

  const baseline = useMemo(() => baselineDoSnapshot(args.snapshotDoBase), [args.snapshotDoBase]);

  const eventos = useMemo(() => {
    if (!args.empresaPessoaId) return [];
    return derivarEventosDaAlteracao({
      movimentos: livro?.movimentos ?? [],
      empresaPessoaId: args.empresaPessoaId,
      pjPessoaId: args.empresaPessoaId,
      mudancas: mudancas ?? [],
      baseline,
      cpfCnpjPorPessoaId: args.cpfCnpjPorPessoaId,
      administradorPessoaIds: args.administradorPessoaIds,
    });
  }, [args.empresaPessoaId, args.cpfCnpjPorPessoaId, args.administradorPessoaIds, livro, mudancas, baseline]);

  const idsPendentes = useMemo(
    () =>
      (livro?.movimentos ?? [])
        .filter((m) => m.empresaPessoaId === args.empresaPessoaId && !m.documentoGeradoId)
        .map((m) => m.id),
    [livro, args.empresaPessoaId],
  );

  return { eventos, idsPendentes, isFetching: lendoLivro || lendoMudancas };
}

/**
 * As DUAS marcas que o registro na junta deixa, num gesto só.
 *
 * 1. Carimba `documento_gerado_id` nos movimentos que a peça formalizou. É o que
 *    dá idempotência ao assistente: movimento com documento não reaparece como
 *    evento pendente na alteração seguinte, e movimento sem documento entra na
 *    próxima peça. Sem isso, cada nova alteração recontaria a história inteira —
 *    e era isso que fazia o assistente anunciar "6 aporte(s)" onde a peça lançou
 *    dois (os outros quatro eram a constituição, que o contrato social já contou).
 * 2. Vira o status dos bens desses movimentos para 'Integralizado', que está FORA
 *    de `STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO`: o bem sai da lista de quem entra
 *    no documento sem ninguém precisar editar o cadastro.
 *
 * Por que juntas (D4/D5): as duas descrevem o mesmo fato — "este ato produziu
 * efeito" — e disparar em gestos diferentes as deixaria divergir. Por que no
 * REGISTRO e não no validar: registrar é quando o ato produz efeito, e é o único
 * gesto irreversível de propósito.
 *
 * A chave do bem é o `bem_id` dos movimentos CARIMBADOS (D6), nunca "os bens
 * aprovados da empresa": assim a AC que só acrescenta imóveis vira o status dos
 * novos e não toca nos antigos, e a PR que gerou contrato sem gravar quadro (onde
 * não há movimento nenhum) não tem bem nenhum virado por acidente.
 *
 * Só carimba quem ainda não tem documento — recarimbar reescreveria a peça que
 * registrou primeiro — e só vira status que ainda é elegível, para não sobrescrever
 * um 'Recusado' deliberado. Reaplicar não escreve nada.
 */
export function useFormalizarMovimentos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      movimentoIds,
      documentoGeradoId,
    }: {
      movimentoIds: readonly string[];
      documentoGeradoId: string;
      /** Empresa, só para invalidar as leituras dela. */
      empresaPessoaId?: string | null;
    }) => {
      const ids = [...new Set(movimentoIds)];
      if (ids.length === 0) return { carimbados: 0, integralizados: 0 };
      const { data, error } = await supabase
        .from('movimentacao_quotas')
        .update({ documento_gerado_id: documentoGeradoId })
        .in('id', ids)
        .is('documento_gerado_id', null)
        .select('id, bem_id');
      if (error) throw error;

      const carimbados = data ?? [];
      const bemIds = [...new Set(carimbados.map((l) => l.bem_id).filter((id): id is string => !!id))];
      if (bemIds.length === 0) return { carimbados: carimbados.length, integralizados: 0 };

      const { data: bens, error: erroBem } = await supabase
        .from('bem')
        .update({ status_integralizacao: 'Integralizado' })
        .in('id', bemIds)
        .in('status_integralizacao', [...STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO])
        .select('id');
      if (erroBem) throw erroBem;
      return { carimbados: carimbados.length, integralizados: (bens ?? []).length };
    },
    onSuccess: (_marcas, { empresaPessoaId }) => {
      queryClient.invalidateQueries({ queryKey: ['movimentos-da-empresa', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['aportes-do-livro', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['cessoes-do-livro', empresaPessoaId] });
      // O bem que acabou de sair da lista de elegíveis: sem isto a folha segue
      // integralizando um imóvel que este ato já consumiu.
      queryClient.invalidateQueries({ queryKey: ['integralizacoes-geracao', empresaPessoaId] });
    },
    onError: (error: Error) => {
      // Não derruba o registro: a peça está registrada, e as duas marcas são
      // reparáveis (o pior caso é o evento reaparecer na próxima peça).
      toast({
        title: 'Documento registrado, mas os eventos não foram marcados como formalizados',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
