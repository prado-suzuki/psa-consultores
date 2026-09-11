import { useMutation, useQuery, type UseMutationOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { syncPerdcompToDW } from '@/lib/syncPerdcomp';
import {
  buildCreateRecord,
  buildDistribuicaoRows,
  buildUpdateRecord,
  type BuildDistribuicoesInput,
  type DcompFormData,
  type DcompOption,
  type DcompPerOption,
  type DcompPersistedRecord,
  type DistribuicaoExistente,
} from '@/lib/dcompForm';

interface PersistenceContext extends Omit<BuildDistribuicoesInput, 'nrDocumento'> {
  data: DcompFormData;
}

interface UpdateDcompInput extends PersistenceContext {
  originalNrDocumento: string;
}

type DcompMutationOptions<TVariables> = Omit<
  UseMutationOptions<DcompPersistedRecord, Error, TVariables>,
  'mutationFn'
>;

export function useDistribuicoesDcompForm(nrDocumento: string | undefined, open: boolean) {
  return useQuery<DistribuicaoExistente[]>({
    queryKey: ['dcomp-distribuicoes', nrDocumento],
    queryFn: async () => {
      if (!nrDocumento) return [];
      const { data, error } = await supabase
        .from('distribuicao_dcomp')
        .select(
          'id, tributo, grupo_tributo_id, codigo_receita_id, valor_tributo, competencia, valor_original',
        )
        .eq('nr_documento', nrDocumento);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        _legacyTributo: row.tributo,
        grupo_tributo_id: row.grupo_tributo_id,
        codigo_receita_id: row.codigo_receita_id,
        valor_tributo: Number(row.valor_tributo) || 0,
        competencia: row.competencia ? String(row.competencia).substring(0, 7) : '',
        valor_original: row.valor_original != null ? Number(row.valor_original) : null,
      }));
    },
    enabled: !!nrDocumento && open,
  });
}

export function useDcompsExistentesForm(preSelectedPer: string | undefined) {
  return useQuery<DcompOption[]>({
    queryKey: ['dcomps-existentes', preSelectedPer],
    queryFn: async () => {
      if (!preSelectedPer) return [];
      const { data, error } = await supabase
        .from('dcomp')
        .select('nr_documento, mes_ano_exercicio, nr_dcomp_ret')
        .eq('nr_per_orig', preSelectedPer)
        .order('dt_envio', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!preSelectedPer,
  });
}

export function usePersDcompForm(contribuinteId: string | undefined) {
  return useQuery<DcompPerOption[]>({
    queryKey: ['pers-for-dcomp', contribuinteId],
    queryFn: async () => {
      let query = supabase
        .from('per')
        .select(
          'nr_per, id_contribuinte, exercicio, tri_exercicio, dt_solicitada, tp_credito, porcentagem_psa',
        )
        .order('exercicio', { ascending: false });
      if (contribuinteId) query = query.eq('id_contribuinte', contribuinteId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

async function replaceDistribuicoes(nrDocumento: string, context: PersistenceContext) {
  // Montar antes de apagar. `buildDistribuicaoRows` é pura e hoje não lança, mas
  // construir as linhas novas depois de destruir as antigas é a ordem que
  // converte qualquer erro de montagem em perda de dado.
  const rows = buildDistribuicaoRows({ ...context, nrDocumento });

  // Contagem real, não amostra: é o número que prova que o delete fez efeito.
  // A leitura era `limit(1)` com o erro ignorado, então nem o "quantas havia"
  // nem a falha da própria leitura chegavam até aqui.
  const { data: existentes, error: leituraErro } = await supabase
    .from('distribuicao_dcomp')
    .select('id')
    .eq('nr_documento', nrDocumento);
  if (leituraErro) throw leituraErro;

  const atuais = existentes ?? [];
  if (atuais.length > 0) {
    await assertCanPerform('distribuicao_dcomp', 'delete', atuais[0].id);

    // `.select()` obrigatório: RLS recusando um DELETE devolve ZERO linhas, não
    // erro. Sem conferir, o insert logo abaixo somava as linhas novas às antigas
    // e o DCOMP terminava com a distribuição duplicada.
    const { data: apagadas, error: deleteError } = await supabase
      .from('distribuicao_dcomp')
      .delete()
      .eq('nr_documento', nrDocumento)
      .select('id');
    if (deleteError) throw deleteError;

    if ((apagadas?.length ?? 0) < atuais.length) {
      throw new Error(
        'O banco recusou a remoção das linhas de distribuição anteriores deste DCOMP. ' +
          'A distribuição não foi substituída, e nada novo foi inserido, para não duplicar.',
      );
    }
  }

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('distribuicao_dcomp').insert(rows);
    if (insertError) throw insertError;
  }
}

export function useCreateDcompForm(options?: DcompMutationOptions<PersistenceContext>) {
  return useMutation<DcompPersistedRecord, Error, PersistenceContext>({
    ...options,
    mutationFn: async (context) => {
      const record = buildCreateRecord(context.data);
      const { data: existing, error: checkError } = await supabase
        .from('dcomp')
        .select('nr_documento')
        .eq('nr_documento', record.nr_documento)
        .maybeSingle();
      if (checkError) throw checkError;
      if (existing) {
        throw new Error('Já existe um DCOMP com este número. Edite-o em vez de criar um novo.');
      }
      const { error } = await supabase.from('dcomp').insert([record]);
      if (error) throw error;
      await replaceDistribuicoes(record.nr_documento, context);
      return record;
    },
  });
}

export function useUpdateDcompForm(options?: DcompMutationOptions<UpdateDcompInput>) {
  return useMutation<DcompPersistedRecord, Error, UpdateDcompInput>({
    ...options,
    mutationFn: async (context) => {
      const record = buildUpdateRecord(context.data);
      // `.select()` pelo mesmo motivo do delete: update recusado pela RLS não
      // volta erro, volta zero linhas — e aí as distribuições eram substituídas
      // sob um DCOMP que não tinha mudado.
      const { data, error } = await supabase
        .from('dcomp')
        .update(record)
        .eq('nr_documento', context.originalNrDocumento)
        .select('nr_documento');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          'Não foi possível salvar este DCOMP: a alteração foi recusada pelo banco, ou o ' +
            'documento não está mais disponível para você. Atualize a página e tente novamente.',
        );
      }
      await replaceDistribuicoes(context.originalNrDocumento, context);
      return { ...record, nr_documento: context.originalNrDocumento };
    },
  });
}

/** Mantém a sincronização remota fora da UI e do cache de mutações. */
export function useSyncDcompForm() {
  return (record: DcompPersistedRecord): void => {
    syncPerdcompToDW({ dcomp: [record] });
  };
}
