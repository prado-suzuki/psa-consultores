import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { computeFieldDiff } from '@/lib/diffUtils';
import type { Alvo } from '@/lib/classificarFicha';

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
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY, clienteId] }),
  });
}
