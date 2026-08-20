import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { AporteProposto } from '@/lib/osg/aporteInicial';
import {
  capitalDoMovimento,
  FORMAS_MOVIMENTO,
  type MovimentoDeQuotas,
} from '@/lib/osg/movimentoQuotas';

// Camada de dados do livro de movimentos de quota (`movimentacao_quotas`) e do
// quadro societário que sai dele (`v_quadro_societario`). Uma fonte só para a
// empresa Proprietária e para a Controladora: o quadro é o acumulado dos
// movimentos, entradas menos saídas, e sócio de saldo zero fica de fora.

export interface SocioDoQuadro {
  pessoaId: string;
  denominacao: string;
  tipoPessoa: string | null;
  cpfCnpj: string | null;
  quotas: number;
  vlrTotal: number;
  /** created_at do PRIMEIRO movimento do sócio: a ordem do preâmbulo. */
  ordem: string | null;
  /** Movimentos que compõem o saldo (alimentam a notificação de variável). */
  movimentoIds: string[];
}

/**
 * Quadro societário da empresa, na ordem em que os sócios saem no preâmbulo.
 *
 * São DUAS leituras, e não um embed: o PostgREST só infere relacionamento de
 * view quando a coluna vem direto da tabela base, e `pessoa_id` aqui nasce de um
 * `union all` com `group by`. Ou seja, `socio:pessoa_id (*)` não existe em
 * v_quadro_societario, então quem precisa da pessoa busca e costura, como aqui.
 */
export function useQuadroDaEmpresa(empresaPessoaId: string | null) {
  return useQuery<SocioDoQuadro[]>({
    queryKey: ['quadro-da-empresa', empresaPessoaId],
    enabled: !!empresaPessoaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_quadro_societario')
        .select('pessoa_id, quotas, vlr_total, ordem, movimento_ids')
        .eq('empresa_pessoa_id', empresaPessoaId!)
        .order('ordem');
      if (error) throw error;

      const linhas = (data ?? []).filter((l) => l.pessoa_id);
      if (linhas.length === 0) return [];

      const { data: pessoas, error: errPessoas } = await supabase
        .from('pessoa')
        .select('id, denominacao, tipo_pessoa, cpf_cnpj')
        .in('id', linhas.map((l) => l.pessoa_id!));
      if (errPessoas) throw errPessoas;
      const porId = new Map((pessoas ?? []).map((p) => [p.id, p]));

      return linhas.map((l) => {
        const p = porId.get(l.pessoa_id!);
        return {
          pessoaId: l.pessoa_id!,
          denominacao: p?.denominacao ?? '—',
          tipoPessoa: p?.tipo_pessoa ?? null,
          cpfCnpj: p?.cpf_cnpj ?? null,
          quotas: Number(l.quotas ?? 0),
          vlrTotal: Number(l.vlr_total ?? 0),
          ordem: l.ordem,
          movimentoIds: l.movimento_ids ?? [],
        };
      });
    },
  });
}

/**
 * Grava a proposta de aporte inicial da empresa Proprietária: um movimento de
 * aporte por (sócio, bem), na ordem de participação decrescente.
 *
 * `created_at` vai EXPLÍCITO e escalonado de um milissegundo por linha, e não
 * pelo default da coluna: `now()` é o timestamp da TRANSAÇÃO, então um insert em
 * lote carimbaria o mesmo instante em todas as linhas, o `ordem` da view viraria
 * empate e a ordem dos sócios no preâmbulo do contrato ficaria indeterminada.
 */
export function useGravarAporteInicial() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      clienteId,
      empresaPessoaId,
      aportes,
    }: {
      clienteId: string;
      empresaPessoaId: string;
      aportes: AporteProposto[];
    }) => {
      if (aportes.length === 0) throw new Error('Nada a gravar: a proposta está vazia.');

      const base = Date.now();
      const { data, error } = await supabase
        .from('movimentacao_quotas')
        .insert(
          aportes.map((a, i) => ({
            cliente_id: clienteId,
            tipo: 'aporte',
            empresa_pessoa_id: empresaPessoaId,
            destino_pessoa_id: a.pessoaId,
            quotas: a.quotas,
            bem_id: a.bemId,
            vlr_capital_arredondado: a.valor,
            created_at: new Date(base + i).toISOString(),
            // Colunas do modelo antigo, ainda NOT NULL até a migration de
            // limpeza. Espelham as novas; nada as lê.
            socio_pessoa_id: a.pessoaId,
            empresa_destino_pessoa_id: empresaPessoaId,
          })),
        )
        .select('id, destino_pessoa_id');
      if (error) throw error;
      return { linhas: data ?? [], aportes, empresaPessoaId };
    },
    onSuccess: async ({ linhas, aportes, empresaPessoaId }) => {
      queryClient.invalidateQueries({ queryKey: ['quadro-da-empresa', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['socios-geracao', empresaPessoaId] });

      const nomePorPessoa = new Map(aportes.map((a) => [a.pessoaId, a.denominacao]));
      for (const linha of linhas) {
        await logAction({
          area: 'osg',
          entity_type: 'movimentacao_quotas',
          entity_id: linha.id,
          entity_name: nomePorPessoa.get(linha.destino_pessoa_id ?? '') ?? 'Sócio',
          action: 'created',
        });
      }

      const socios = new Set(aportes.map((a) => a.pessoaId)).size;
      toast({
        title: 'Quadro societário gravado',
        description: `${aportes.length} aporte(s) de ${socios} sócio(s).`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao gravar o quadro societário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Grava UM movimento de quota: um gesto do consultor, uma linha no livro.
 *
 * É o que substituiu o CRUD do quadro. Antes, editar o quadro fazia `update` na
 * linha do sócio e remover sócio fazia `delete` físico. O quadro só sabia o
 * estado de hoje, e o de ontem era apagado. Agora "vincular sócio" é um aporte,
 * "aumentar quotas" é outro aporte, "diminuir" é uma redução e "remover" é a
 * cessão (ou doação) das quotas para quem as recebeu. O saldo continua sendo o
 * que a tela mostra, mas ele passa a ser CONSEQUÊNCIA, e o histórico existe.
 *
 * O valor não vem do formulário: é `capitalDoMovimento(quotas)`. `vlr_total` do
 * quadro é a soma de `vlr_capital_arredondado`, e gravar ali o preço pago numa
 * cessão acima do par corromperia o capital da sociedade.
 */
export function useRegistrarMovimento() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      clienteId,
      empresaPessoaId,
      movimento,
    }: {
      clienteId: string;
      empresaPessoaId: string;
      movimento: MovimentoDeQuotas;
      /** Nome de quem entra no log (o adquirente, ou o cedente na redução). */
      entityName: string;
    }) => {
      const { data, error } = await supabase
        .from('movimentacao_quotas')
        .insert({
          cliente_id: clienteId,
          tipo: movimento.tipo,
          empresa_pessoa_id: empresaPessoaId,
          origem_pessoa_id: movimento.origemPessoaId,
          destino_pessoa_id: movimento.destinoPessoaId,
          quotas: movimento.quotas,
          vlr_capital_arredondado: capitalDoMovimento(movimento.quotas),
          data_movimento: movimento.dataMovimento,
          // Colunas do modelo antigo, ainda NOT NULL até a migration de limpeza
          // (20260820163000). Espelham as novas; nada as lê. `socio_pessoa_id`
          // recebe o lado que existe, porque na redução não há adquirente.
          socio_pessoa_id: movimento.destinoPessoaId ?? movimento.origemPessoaId!,
          empresa_destino_pessoa_id: empresaPessoaId,
        })
        .select('id')
        .single();
      if (error) throw error;
      return { id: data.id, empresaPessoaId };
    },
    onSuccess: async ({ id, empresaPessoaId }, { movimento, entityName }) => {
      queryClient.invalidateQueries({ queryKey: ['quadro-da-empresa', empresaPessoaId] });
      // A tela Gerar lê o quadro pela mesma view, com outra key.
      queryClient.invalidateQueries({ queryKey: ['socios-geracao', empresaPessoaId] });
      queryClient.invalidateQueries({ queryKey: ['relatorio-societario'] });

      const forma = FORMAS_MOVIMENTO[movimento.tipo];
      await logAction({
        area: 'osg',
        entity_type: 'movimentacao_quotas',
        entity_id: id,
        entity_name: entityName,
        action: 'created',
      });

      toast({
        title: `${forma.label} registrada`,
        description: `${movimento.quotas.toLocaleString('pt-BR')} quota(s) · ${entityName}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar o movimento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
