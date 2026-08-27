import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { computeFieldDiff } from '@/lib/diffUtils';
import type { Database } from '@/integrations/supabase/types';

/**
 * A tabela `quadro_societario` deixou de existir (20260820163000): o quadro
 * agora é DERIVADO do livro de movimentos (`movimentacao_quotas`), lido pela
 * view `v_quadro_societario`. Este hook preserva o contrato que as telas já
 * consumiam (uma linha por sócio, com quotas e valor), traduzindo leitura e
 * escrita para o livro.
 */
type ViewRow = Database['public']['Views']['v_quadro_societario']['Row'];

export interface QuadroSocietarioRow {
  /** Identidade da LINHA do quadro: a posição de um sócio numa empresa. */
  id: string;
  empresa_pessoa_id: string;
  socio_pessoa_id: string;
  quotas: number | null;
  vlr_total: number | null;
  /** Movimentos que compõem esta posição, na ordem em que foram lançados. */
  movimento_ids: string[];
}

export interface QuadroSocietarioValues {
  empresa_pessoa_id: string;
  socio_pessoa_id: string;
  quotas: number | null;
  vlr_total: number | null;
}

/** Mantidos como aliases: as telas tipavam o formulário por eles. */
export type QuadroSocietarioInsert = QuadroSocietarioValues;
export type QuadroSocietarioUpdate = QuadroSocietarioValues;

const QUADRO_DIFF_FIELDS: (keyof QuadroSocietarioRow)[] = [
  'empresa_pessoa_id', 'socio_pessoa_id', 'quotas', 'vlr_total',
];

export interface SocioEnriched extends QuadroSocietarioRow {
  socio_denominacao: string;
  socio_tipo_pessoa: string | null;
  socio_cpf_cnpj: string | null;
}

const linhaId = (empresaId: string, socioId: string) => `${empresaId}:${socioId}`;

export function useQuadroSocietarioByEmpresa(empresaPessoaId: string | null) {
  return useQuery<SocioEnriched[]>({
    queryKey: ['quadro-societario-by-empresa', empresaPessoaId],
    queryFn: async () => {
      if (!empresaPessoaId) return [];
      const { data, error } = await supabase
        .from('v_quadro_societario')
        .select('empresa_pessoa_id, pessoa_id, quotas, vlr_total, movimento_ids')
        .eq('empresa_pessoa_id', empresaPessoaId)
        .order('quotas', { ascending: false, nullsFirst: false });
      if (error) throw error;

      const linhas = ((data ?? []) as ViewRow[]).filter((l) => l.pessoa_id);
      const ids = [...new Set(linhas.map((l) => l.pessoa_id as string))];
      if (ids.length === 0) return [];

      const { data: pessoas, error: erroPessoas } = await supabase
        .from('pessoa')
        .select('id, denominacao, tipo_pessoa, cpf_cnpj')
        .in('id', ids);
      if (erroPessoas) throw erroPessoas;

      const porId = new Map((pessoas ?? []).map((p) => [p.id, p]));

      return linhas.map((l) => {
        const socioId = l.pessoa_id as string;
        const p = porId.get(socioId);
        return {
          id: linhaId(l.empresa_pessoa_id as string, socioId),
          empresa_pessoa_id: l.empresa_pessoa_id as string,
          socio_pessoa_id: socioId,
          quotas: l.quotas ?? null,
          vlr_total: l.vlr_total ?? null,
          movimento_ids: (l.movimento_ids ?? []) as string[],
          socio_denominacao: p?.denominacao ?? '—',
          socio_tipo_pessoa: p?.tipo_pessoa ?? null,
          socio_cpf_cnpj: p?.cpf_cnpj ?? null,
        };
      });
    },
    enabled: !!empresaPessoaId,
  });
}

async function clienteDaEmpresa(empresaPessoaId: string): Promise<string> {
  const { data, error } = await supabase
    .from('pessoa')
    .select('cliente_id')
    .eq('id', empresaPessoaId)
    .single();
  if (error) throw error;
  if (!data?.cliente_id) throw new Error('Empresa sem cliente vinculado');
  return data.cliente_id;
}

export function useUpsertSocio() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      values,
      original,
      entityName,
    }: {
      values: QuadroSocietarioValues;
      original?: QuadroSocietarioRow | null;
      entityName: string;
    }) => {
      const quotas = values.quotas ?? 0;
      const valor = values.vlr_total ?? 0;

      // Um único movimento na origem da posição: corrige-se o próprio
      // lançamento, sem apagar e reinserir (preserva o UUID do movimento).
      if (original && original.movimento_ids.length === 1) {
        const { error } = await supabase
          .from('movimentacao_quotas')
          .update({ quotas, vlr_capital_arredondado: valor })
          .eq('id', original.movimento_ids[0]);
        if (error) throw error;
      } else {
        // Posição nova, ou composta por vários movimentos: lança-se a
        // diferença como um movimento novo, que é como o livro registra ajuste.
        const deltaQuotas = quotas - (original?.quotas ?? 0);
        const deltaValor = valor - (original?.vlr_total ?? 0);
        const cliente_id = await clienteDaEmpresa(values.empresa_pessoa_id);
        const reduz = deltaQuotas < 0;

        const { error } = await supabase.from('movimentacao_quotas').insert({
          cliente_id,
          tipo: reduz ? 'reducao' : 'aporte',
          empresa_pessoa_id: values.empresa_pessoa_id,
          origem_pessoa_id: reduz ? values.socio_pessoa_id : null,
          destino_pessoa_id: reduz ? null : values.socio_pessoa_id,
          quotas: Math.abs(deltaQuotas),
          vlr_capital_arredondado: Math.abs(deltaValor),
        });
        if (error) throw error;
      }

      const row: QuadroSocietarioRow = {
        id: linhaId(values.empresa_pessoa_id, values.socio_pessoa_id),
        empresa_pessoa_id: values.empresa_pessoa_id,
        socio_pessoa_id: values.socio_pessoa_id,
        quotas: values.quotas,
        vlr_total: values.vlr_total,
        movimento_ids: original?.movimento_ids ?? [],
      };
      return { row, original: original ?? null, entityName };
    },
    onSuccess: async ({ row, original, entityName }) => {
      queryClient.invalidateQueries({ queryKey: ['quadro-societario-by-empresa', row.empresa_pessoa_id] });

      const changed = computeFieldDiff(
        original as unknown as Record<string, unknown> | null,
        row as unknown as Record<string, unknown>,
        QUADRO_DIFF_FIELDS as string[],
      );

      await logAction({
        area: 'osg',
        entity_type: 'movimentacao_quotas',
        entity_id: row.socio_pessoa_id,
        entity_name: entityName,
        action: original ? 'updated' : 'created',
        changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
      });

      toast({
        title: original ? 'Sócio atualizado' : 'Sócio vinculado',
        description: entityName,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar sócio', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSocio() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ row, entityName }: { row: QuadroSocietarioRow; entityName: string }) => {
      if (row.movimento_ids.length > 0) {
        const { error } = await supabase
          .from('movimentacao_quotas')
          .delete()
          .in('id', row.movimento_ids);
        if (error) throw error;
      }
      return { row, entityName };
    },
    onSuccess: async ({ row, entityName }) => {
      queryClient.invalidateQueries({ queryKey: ['quadro-societario-by-empresa', row.empresa_pessoa_id] });
      await logAction({
        area: 'osg',
        entity_type: 'movimentacao_quotas',
        entity_id: row.socio_pessoa_id,
        entity_name: entityName,
        action: 'deleted',
      });
      toast({ title: 'Sócio desvinculado', description: entityName });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao desvincular sócio', description: error.message, variant: 'destructive' });
    },
  });
}
