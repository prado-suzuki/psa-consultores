import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { computeFieldDiff } from '@/lib/diffUtils';
import type { Database } from '@/integrations/supabase/types';

export type TipoPessoa = 'PF' | 'PJ';

export type PessoaRow = Database['public']['Tables']['pessoa']['Row'];
export type PessoaInsert = Database['public']['Tables']['pessoa']['Insert'];
export type PessoaUpdate = Database['public']['Tables']['pessoa']['Update'];

export type ParentescoRow = Database['public']['Tables']['parentesco']['Row'];
export type ParentescoInsert = Database['public']['Tables']['parentesco']['Insert'];
export type ParentescoUpdate = Database['public']['Tables']['parentesco']['Update'];

export type AdministracaoRow = Database['public']['Tables']['administracao']['Row'];
export type AdministracaoInsert = Database['public']['Tables']['administracao']['Insert'];
export type AdministracaoUpdate = Database['public']['Tables']['administracao']['Update'];

const PESSOA_DIFF_FIELDS: (keyof PessoaRow)[] = [
  'cliente_id', 'contribuinte_id', 'tipo_pessoa', 'denominacao', 'cpf_cnpj',
  'endereco_logradouro', 'endereco_numero', 'endereco_complemento', 'endereco_bairro',
  'endereco_municipio', 'endereco_uf', 'endereco_cep',
  'nacionalidade', 'estado_civil', 'regime_bens', 'data_nascimento',
  'filiacao_pai', 'filiacao_mae', 'profissao',
  'documento_identidade_tipo', 'documento_identidade_numero', 'documento_identidade_orgao', 'documento_identidade_uf',
  'conjuge_id',
  'nire', 'junta_comercial_uf', 'data_constituicao', 'objeto_social', 'status_constituicao',
  'tipo_empresa',
];

const PARENTESCO_DIFF_FIELDS: (keyof ParentescoRow)[] = [
  'pessoa_id', 'parente_pessoa_id', 'tipo', 'natureza',
];

const ADMINISTRACAO_DIFF_FIELDS: (keyof AdministracaoRow)[] = [
  'pj_pessoa_id', 'administrador_pessoa_id', 'cargo', 'pode_isoladamente', 'data_inicio', 'data_fim',
];

export function usePessoasByCliente(clienteId: string | null) {
  return useQuery<PessoaRow[]>({
    queryKey: ['pessoas-by-cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('pessoa')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('denominacao');
      if (error) throw error;
      return (data ?? []) as PessoaRow[];
    },
    enabled: !!clienteId,
  });
}

export function useUpsertPessoa() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      values,
      original,
    }: {
      values: PessoaInsert | PessoaUpdate;
      original?: PessoaRow | null;
    }) => {
      if (original?.id) {
        const { data, error } = await supabase
          .from('pessoa')
          .update(values as PessoaUpdate)
          .eq('id', original.id)
          .select('*')
          .single();
        if (error) throw error;
        return { row: data as PessoaRow, original };
      }
      const { data, error } = await supabase
        .from('pessoa')
        .insert(values as PessoaInsert)
        .select('*')
        .single();
      if (error) throw error;
      return { row: data as PessoaRow, original: null };
    },
    onSuccess: async ({ row, original }) => {
      queryClient.invalidateQueries({ queryKey: ['pessoas-by-cliente', row.cliente_id] });
      queryClient.invalidateQueries({ queryKey: ['parentescos-by-cliente', row.cliente_id] });

      const changed = computeFieldDiff(
        original as unknown as Record<string, unknown> | null,
        row as unknown as Record<string, unknown>,
        PESSOA_DIFF_FIELDS as string[],
      );

      await logAction({
        area: 'osg',
        entity_type: 'pessoa',
        entity_id: row.id,
        entity_name: row.denominacao,
        action: original ? 'updated' : 'created',
        changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
      });

      toast({
        title: original ? 'Pessoa atualizada' : 'Pessoa cadastrada',
        description: row.denominacao,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar pessoa', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeletePessoa() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (pessoa: PessoaRow) => {
      const { error } = await supabase.from('pessoa').delete().eq('id', pessoa.id);
      if (error) throw error;
      return pessoa;
    },
    onSuccess: async (pessoa) => {
      queryClient.invalidateQueries({ queryKey: ['pessoas-by-cliente', pessoa.cliente_id] });
      queryClient.invalidateQueries({ queryKey: ['parentescos-by-cliente', pessoa.cliente_id] });
      // O CASCADE do banco apaga as linhas do quadro societário da pessoa
      // (como empresa ou como sócia); invalida todas as empresas em cache.
      queryClient.invalidateQueries({ queryKey: ['quadro-societario-by-empresa'] });

      await logAction({
        area: 'osg',
        entity_type: 'pessoa',
        entity_id: pessoa.id,
        entity_name: pessoa.denominacao,
        action: 'deleted',
      });

      toast({ title: 'Pessoa removida', description: pessoa.denominacao });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover pessoa', description: error.message, variant: 'destructive' });
    },
  });
}

export interface ParentescoEnriched extends ParentescoRow {
  pessoa_denominacao: string;
  parente_denominacao: string;
}

export function useParentescosByCliente(clienteId: string | null) {
  return useQuery<ParentescoEnriched[]>({
    queryKey: ['parentescos-by-cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('parentesco')
        .select(`
          *,
          pessoa:pessoa_id (id, denominacao, cliente_id),
          parente:parente_pessoa_id (id, denominacao, cliente_id)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<ParentescoRow & {
        pessoa: { id: string; denominacao: string; cliente_id: string } | null;
        parente: { id: string; denominacao: string; cliente_id: string } | null;
      }>;

      return rows
        .filter((r) => r.pessoa?.cliente_id === clienteId)
        .map((r) => ({
          ...r,
          pessoa_denominacao: r.pessoa?.denominacao ?? '—',
          parente_denominacao: r.parente?.denominacao ?? '—',
        }));
    },
    enabled: !!clienteId,
  });
}

export function useUpsertParentesco() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      values,
      original,
      clienteId,
    }: {
      values: ParentescoInsert | ParentescoUpdate;
      original?: ParentescoRow | null;
      clienteId: string;
    }) => {
      if (original?.id) {
        const { data, error } = await supabase
          .from('parentesco')
          .update(values as ParentescoUpdate)
          .eq('id', original.id)
          .select('*')
          .single();
        if (error) throw error;
        return { row: data as ParentescoRow, original, clienteId };
      }
      const { data, error } = await supabase
        .from('parentesco')
        .insert(values as ParentescoInsert)
        .select('*')
        .single();
      if (error) throw error;
      return { row: data as ParentescoRow, original: null, clienteId };
    },
    onSuccess: async ({ row, original, clienteId }) => {
      queryClient.invalidateQueries({ queryKey: ['parentescos-by-cliente', clienteId] });

      const changed = computeFieldDiff(
        original as unknown as Record<string, unknown> | null,
        row as unknown as Record<string, unknown>,
        PARENTESCO_DIFF_FIELDS as string[],
      );

      await logAction({
        area: 'osg',
        entity_type: 'parentesco',
        entity_id: row.id,
        entity_name: row.tipo || 'vínculo',
        action: original ? 'updated' : 'created',
        changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
      });

      toast({ title: original ? 'Vínculo atualizado' : 'Vínculo cadastrado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar vínculo', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteParentesco() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ row, clienteId }: { row: ParentescoRow; clienteId: string }) => {
      const { error } = await supabase.from('parentesco').delete().eq('id', row.id);
      if (error) throw error;
      return { row, clienteId };
    },
    onSuccess: async ({ row, clienteId }) => {
      queryClient.invalidateQueries({ queryKey: ['parentescos-by-cliente', clienteId] });
      await logAction({
        area: 'osg',
        entity_type: 'parentesco',
        entity_id: row.id,
        entity_name: row.tipo || 'vínculo',
        action: 'deleted',
      });
      toast({ title: 'Vínculo removido' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover vínculo', description: error.message, variant: 'destructive' });
    },
  });
}

export interface AdministracaoEnriched extends AdministracaoRow {
  administrador_denominacao: string;
}

export function useAdministracaoByPj(pjPessoaId: string | null) {
  return useQuery<AdministracaoEnriched[]>({
    queryKey: ['administracao-by-pj', pjPessoaId],
    queryFn: async () => {
      if (!pjPessoaId) return [];
      const { data, error } = await supabase
        .from('administracao')
        .select('*, administrador:administrador_pessoa_id (id, denominacao)')
        .eq('pj_pessoa_id', pjPessoaId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<AdministracaoRow & {
        administrador: { id: string; denominacao: string } | null;
      }>;

      return rows.map((r) => ({
        ...r,
        administrador_denominacao: r.administrador?.denominacao ?? '—',
      }));
    },
    enabled: !!pjPessoaId,
  });
}

export function useUpsertAdministracao() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      values,
      original,
      entityName,
    }: {
      values: AdministracaoInsert | AdministracaoUpdate;
      original?: AdministracaoRow | null;
      entityName: string;
    }) => {
      if (original?.id) {
        const { data, error } = await supabase
          .from('administracao')
          .update(values as AdministracaoUpdate)
          .eq('id', original.id)
          .select('*')
          .single();
        if (error) throw error;
        return { row: data as AdministracaoRow, original, entityName };
      }
      const { data, error } = await supabase
        .from('administracao')
        .insert(values as AdministracaoInsert)
        .select('*')
        .single();
      if (error) throw error;
      return { row: data as AdministracaoRow, original: null, entityName };
    },
    onSuccess: async ({ row, original, entityName }) => {
      queryClient.invalidateQueries({ queryKey: ['administracao-by-pj', row.pj_pessoa_id] });

      const changed = computeFieldDiff(
        original as unknown as Record<string, unknown> | null,
        row as unknown as Record<string, unknown>,
        ADMINISTRACAO_DIFF_FIELDS as string[],
      );

      await logAction({
        area: 'osg',
        entity_type: 'administracao',
        entity_id: row.id,
        entity_name: entityName,
        action: original ? 'updated' : 'created',
        changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
      });

      toast({
        title: original ? 'Administrador atualizado' : 'Administrador vinculado',
        description: entityName,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar administrador', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteAdministracao() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ row, entityName }: { row: AdministracaoRow; entityName: string }) => {
      const { error } = await supabase.from('administracao').delete().eq('id', row.id);
      if (error) throw error;
      return { row, entityName };
    },
    onSuccess: async ({ row, entityName }) => {
      queryClient.invalidateQueries({ queryKey: ['administracao-by-pj', row.pj_pessoa_id] });
      await logAction({
        area: 'osg',
        entity_type: 'administracao',
        entity_id: row.id,
        entity_name: entityName,
        action: 'deleted',
      });
      toast({ title: 'Administrador removido', description: entityName });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover administrador', description: error.message, variant: 'destructive' });
    },
  });
}
