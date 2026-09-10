import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { computeFieldDiff } from '@/lib/diffUtils';
import type { Alvo } from '@/lib/classificarFicha';

/**
 * O fecho de falha técnica do OSG, à mão e não pelo `FECHO_SUPORTE`.
 *
 * O fecho compartilhado do `rlsMessages` diz só "o suporte", e trocá-lo mudaria
 * 24 mensagens do cadastro de cliente e do Controle PERDCOMP — áreas que não
 * entram nesta rodada. Aqui a frase é a da Patrícia (10/09/2026), a mesma da
 * faixa de cliente não notificado. Se um dia o fecho compartilhado adotar o
 * nome completo, estas cópias voltam a ser ele.
 */
const FECHO_PSA_DIGITAL =
  'Tente novamente. Se o problema continuar, entre em contato com o suporte da PSA Digital.';

export interface SolicitacaoNaoAplicavelRow {
  id: string;
  solicitacao_item_id: string;
  cliente_id: string;
  pessoa_id: string | null;
  bem_id: string | null;
  matricula_id: string | null;
  created_at: string;
  created_by: string | null;
}

const KEY = 'solicitacao-item-nao-aplicavel';

/**
 * O recorte por alvo aplicado sobre um builder já montado.
 *
 * Genérico no builder (e não `any`) porque o `.eq()` do postgrest devolve `this`:
 * o parâmetro entra e sai com o mesmo tipo, e o `.from()`/`.select()` de quem
 * chama continua conferido contra o schema. Filtra SÓ a coluna do alvo, sem
 * exigir null nas outras duas, que é como sempre funcionou.
 */
type BuilderDeAlvo<Q> = {
  eq(coluna: 'pessoa_id' | 'bem_id' | 'matricula_id', valor: string): Q;
  is(coluna: 'pessoa_id' | 'bem_id' | 'matricula_id', valor: null): Q;
};

const filtrarAlvo = <Q extends BuilderDeAlvo<Q>>(query: Q, alvo: Alvo): Q => {
  if (alvo.kind === 'pessoa') return query.eq('pessoa_id', alvo.id);
  if (alvo.kind === 'bem') return query.eq('bem_id', alvo.id);
  if (alvo.kind === 'matricula') return query.eq('matricula_id', alvo.id);
  return query.is('pessoa_id', null).is('bem_id', null).is('matricula_id', null);
};

const camposDoAlvo = (alvo: Alvo) => ({
  pessoa_id: alvo.kind === 'pessoa' ? alvo.id : null,
  bem_id: alvo.kind === 'bem' ? alvo.id : null,
  matricula_id: alvo.kind === 'matricula' ? alvo.id : null,
});

export function useSolicitacaoNaoAplicavel(clienteId: string, alvo: Alvo | null) {
  return useQuery({
    queryKey: [KEY, clienteId, alvo?.kind ?? 'novo', alvo && 'id' in alvo ? alvo.id : null],
    enabled: !!clienteId && !!alvo,
    queryFn: async (): Promise<SolicitacaoNaoAplicavelRow[]> => {
      let query = supabase.from('solicitacao_item_nao_aplicavel').select('*').eq('cliente_id', clienteId);
      query = filtrarAlvo(query, alvo!);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as SolicitacaoNaoAplicavelRow[];
    },
  });
}

/**
 * Todas as marcas do cliente, sem recortar por alvo.
 *
 * O modal de vínculo pergunta "o que não se aplica a ESTA entidade" e por isso lê
 * por alvo; o checklist derivado precisa do conjunto inteiro de uma vez, porque
 * ele varre item × instância. A chave compartilha o prefixo `[KEY, clienteId]`, o
 * mesmo que `useSincronizarSolicitacaoNaoAplicavel` invalida, então marcar algo no
 * modal atualiza o checklist sem invalidação nova.
 */
export function useSolicitacaoNaoAplicavelDoCliente(clienteId: string | null) {
  return useQuery({
    queryKey: [KEY, clienteId, '__todos__'],
    enabled: !!clienteId,
    queryFn: async (): Promise<SolicitacaoNaoAplicavelRow[]> => {
      const { data, error } = await supabase
        .from('solicitacao_item_nao_aplicavel')
        .select('*')
        .eq('cliente_id', clienteId as string);
      if (error) throw error;
      return (data ?? []) as unknown as SolicitacaoNaoAplicavelRow[];
    },
  });
}

/** O que a sincronização mexeu de fato, por `solicitacao_item_id`. */
export interface ResultadoNaoAplicavel {
  marcados: string[];
  desmarcados: string[];
}

/**
 * O aviso descreve o que o BANCO gravou, não o que a tela pediu.
 *
 * A gravação é uma sincronização: recebe o conjunto desejado e resolve sozinha o
 * que inserir e o que apagar. Montar a frase pela intenção do clique diria
 * "marcado" no dia em que a linha já estivesse marcada e nada mudasse.
 *
 * Devolve `null` quando o conjunto já era o pedido: aviso de "nada mudou" é
 * ruído, e a ficha na tela já mostra o estado.
 */
export function descreverNaoAplicavel(
  { marcados, desmarcados }: ResultadoNaoAplicavel,
  nomes: Record<string, string>,
): { title: string; description: string } | null {
  const nome = (id: string) => nomes[id] ?? 'O documento';

  if (marcados.length === 0 && desmarcados.length === 0) return null;

  if (marcados.length === 1 && desmarcados.length === 0) {
    return {
      title: 'Documento marcado como não se aplica',
      description: `"${nome(marcados[0])}" saiu da conta desta entidade e não entra mais `
        + 'na notificação ao cliente. As outras entidades continuam com ele.',
    };
  }

  if (desmarcados.length === 1 && marcados.length === 0) {
    return {
      title: 'Documento volta a ser solicitado',
      description: `"${nome(desmarcados[0])}" voltou a contar como pendente para esta entidade.`,
    };
  }

  const partes: string[] = [];
  if (marcados.length > 0) partes.push(`${marcados.length} marcados como não se aplica`);
  if (desmarcados.length > 0) partes.push(`${desmarcados.length} de volta à solicitação`);
  return {
    title: 'Documentos atualizados',
    description: `Nesta entidade: ${partes.join(' e ')}.`,
  };
}

export function useSincronizarSolicitacaoNaoAplicavel(clienteId: string) {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      alvo, itemIds, nomes,
    }: {
      alvo: Alvo;
      itemIds: string[];
      nomes: Record<string, string>;
    }) => {
      let query = supabase.from('solicitacao_item_nao_aplicavel').select('*').eq('cliente_id', clienteId);
      query = filtrarAlvo(query, alvo);
      const { data, error } = await query;
      if (error) throw error;
      const atuais = (data ?? []) as unknown as SolicitacaoNaoAplicavelRow[];
      const desejados = new Set(itemIds);
      const remover = atuais.filter((row) => !desejados.has(row.solicitacao_item_id));
      const existentes = new Set(atuais.map((row) => row.solicitacao_item_id));
      const adicionar = itemIds.filter((id) => !existentes.has(id));

      if (adicionar.length > 0) {
        const rows = adicionar.map((solicitacao_item_id) => ({
          solicitacao_item_id, cliente_id: clienteId, ...camposDoAlvo(alvo),
        }));
        const { data: inseridas, error: insertError } = await supabase
          .from('solicitacao_item_nao_aplicavel').insert(rows).select('*');
        if (insertError) throw insertError;
        for (const row of (inseridas ?? []) as unknown as SolicitacaoNaoAplicavelRow[]) {
          await logAction({
            area: 'osg', entity_type: 'solicitacao_item_nao_aplicavel', entity_id: row.id,
            entity_name: nomes[row.solicitacao_item_id] ?? 'Documento não aplicável', action: 'created',
            changed_fields: computeFieldDiff(null, { ...row }, ['solicitacao_item_id', 'cliente_id', 'pessoa_id', 'bem_id', 'matricula_id']),
          });
        }
      }

      for (const row of remover) {
        const { error: deleteError } = await supabase.from('solicitacao_item_nao_aplicavel').delete().eq('id', row.id);
        if (deleteError) throw deleteError;
        await logAction({
          area: 'osg', entity_type: 'solicitacao_item_nao_aplicavel', entity_id: row.id,
          entity_name: nomes[row.solicitacao_item_id] ?? 'Documento não aplicável', action: 'deleted',
          changed_fields: computeFieldDiff({ ...row }, null, ['solicitacao_item_id', 'cliente_id', 'pessoa_id', 'bem_id', 'matricula_id']),
        });
      }

      return {
        marcados: adicionar,
        desmarcados: remover.map((row) => row.solicitacao_item_id),
      } satisfies ResultadoNaoAplicavel;
    },
    onSuccess: (resultado, { nomes }) => {
      const aviso = descreverNaoAplicavel(resultado, nomes);
      if (aviso) toast(aviso);
    },
    /**
     * O erro CRU vai para o console, nunca para a tela.
     *
     * O que o PostgREST devolve não ajuda o consultor e nem sempre é seguro de
     * exibir; sem o `console.error`, por outro lado, o chamado chegaria sem nada
     * para investigar. Mesmo desenho do commit `1ec00175`.
     */
    onError: (erro: unknown, { alvo }) => {
      console.error('[nao-aplicavel] falha ao sincronizar', { clienteId, alvo }, erro);
      toast({
        title: 'Não foi possível salvar a alteração',
        // "pode não ter sido" porque a gravação é inserção e remoção em sequência:
        // uma falha no meio deixa parte do caminho feito, e afirmar que nada mudou
        // seria mentira. Quem diz a verdade é a lista, recarregada no `onSettled`.
        description: 'A alteração pode não ter sido salva. A lista foi recarregada com o '
          + `que está gravado. ${FECHO_PSA_DIGITAL}`,
        variant: 'destructive',
      });
    },
    // Recarrega TAMBÉM depois de falhar: sem isto a ficha continuaria mostrando o
    // estado que o analista pediu, e não o que ficou no banco.
    onSettled: () => queryClient.invalidateQueries({ queryKey: [KEY, clienteId] }),
  });
}
