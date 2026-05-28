import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { computeFieldDiff } from '@/lib/diffUtils';
import type { Database, Json } from '@/integrations/supabase/types';

export type BemRow = Database['public']['Tables']['bem']['Row'];
export type BemInsert = Database['public']['Tables']['bem']['Insert'];
export type BemUpdate = Database['public']['Tables']['bem']['Update'];

export type MatriculaRow = Database['public']['Tables']['matricula']['Row'];
export type MatriculaInsert = Database['public']['Tables']['matricula']['Insert'];
export type MatriculaUpdate = Database['public']['Tables']['matricula']['Update'];

// `fracao` é opcional desde a migration 20260526140000 (composse sem percentual definido).
// Os tipos autogerados do Supabase ainda marcam como NOT NULL — sobrescrevemos aqui.
type RawTitularidadeRow = Database['public']['Tables']['titularidade']['Row'];
type RawTitularidadeInsert = Database['public']['Tables']['titularidade']['Insert'];
type RawTitularidadeUpdate = Database['public']['Tables']['titularidade']['Update'];

export type TitularidadeRow = Omit<RawTitularidadeRow, 'fracao'> & { fracao: number | null };
export type TitularidadeInsert = Omit<RawTitularidadeInsert, 'fracao'> & { fracao?: number | null };
export type TitularidadeUpdate = Omit<RawTitularidadeUpdate, 'fracao'> & { fracao?: number | null };

export type ImpedimentoRow = Database['public']['Tables']['impedimento']['Row'];
export type ImpedimentoInsert = Database['public']['Tables']['impedimento']['Insert'];
export type ImpedimentoUpdate = Database['public']['Tables']['impedimento']['Update'];

export type CartorioRow = Database['public']['Tables']['cartorio']['Row'];
export type CartorioInsert = Database['public']['Tables']['cartorio']['Insert'];
export type CartorioUpdate = Database['public']['Tables']['cartorio']['Update'];

export type TipoBem = 'IR' | 'IB' | 'AP' | 'PS' | 'OU';

export const TIPO_BEM_OPTIONS: Array<{ value: TipoBem; label: string; descricao: string }> = [
  { value: 'IR', label: 'Imóvel Rural', descricao: 'Imóvel rural com CCIR e ITR' },
  { value: 'IB', label: 'Imóvel de Benfeitoria', descricao: 'Imóvel urbano / IPTU' },
  { value: 'AP', label: 'Arrendamento e/ou Parceria', descricao: 'Arrendamento e/ou parceria' },
  { value: 'PS', label: 'Participação Societária', descricao: 'Quotas / ações em PJs' },
  { value: 'OU', label: 'Outros', descricao: 'Demais bens' },
];

const BEM_DIFF_FIELDS: (keyof BemRow)[] = [
  'cliente_id', 'referencia_dp', 'tipo_bem', 'descricao_outros', 'denominacao',
  'vlr_contabil', 'vlr_contabil_ajustado', 'vlr_benfeitorias',
  'vlr_mercado', 'vlr_imposto_anual', 'imposto_anual_exercicio',
  'ccir_codigo', 'inscricao_municipal', 'status_integralizacao',
  'empresa_destino_pessoa_id', 'participa_estruturacao',
  'motivo_nao_integralizacao', 'observacao',
];

const MATRICULA_DIFF_FIELDS: (keyof MatriculaRow)[] = [
  'bem_id', 'numero', 'matricula_anterior_id', 'matricula_anterior_texto',
  'livro', 'folha', 'data_matricula', 'cartorio_id',
  'municipio_imovel', 'uf_imovel', 'area_documento', 'area_real',
  'area_explorada', 'area_unidade', 'georreferenciado',
  'georref_prejudica_transferencia', 'tipo_exploracao_posse',
  'descricao_psa_completa', 'confrontacoes_texto', 'origem_descricao',
];

const TITULARIDADE_DIFF_FIELDS: (keyof TitularidadeRow)[] = [
  'matricula_id', 'bem_id', 'titular_pessoa_id', 'tipo', 'fracao',
];

const IMPEDIMENTO_DIFF_FIELDS: (keyof ImpedimentoRow)[] = [
  'matricula_id', 'tipo', 'referencia', 'descricao',
  'credor_pessoa_id', 'credor_nome', 'data_constituicao', 'data_validade',
  'vlr', 'area_afetada', 'impede_transferencia', 'cancelado',
];

const CARTORIO_DIFF_FIELDS: (keyof CartorioRow)[] = [
  'nome_completo', 'numero_oficio', 'comarca', 'uf',
];

// ============================================================================
// BEM
// ============================================================================

export function useBensByCliente(clienteId: string | null) {
  return useQuery<BemRow[]>({
    queryKey: ['bens-by-cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('bem')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('referencia_dp');
      if (error) throw error;
      return (data ?? []) as BemRow[];
    },
    enabled: !!clienteId,
  });
}

export function useUpsertBem() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      values,
      original,
    }: {
      values: BemInsert | BemUpdate;
      original?: BemRow | null;
    }) => {
      if (original?.id) {
        const { data, error } = await supabase
          .from('bem')
          .update(values as BemUpdate)
          .eq('id', original.id)
          .select('*')
          .single();
        if (error) throw error;
        return { row: data as BemRow, original };
      }
      const { data, error } = await supabase
        .from('bem')
        .insert(values as BemInsert)
        .select('*')
        .single();
      if (error) throw error;
      return { row: data as BemRow, original: null };
    },
    onSuccess: async ({ row, original }) => {
      queryClient.invalidateQueries({ queryKey: ['bens-by-cliente', row.cliente_id] });

      const changed = computeFieldDiff(
        original as unknown as Record<string, unknown> | null,
        row as unknown as Record<string, unknown>,
        BEM_DIFF_FIELDS as string[],
      );

      await logAction({
        area: 'osg',
        entity_type: 'bem',
        entity_id: row.id,
        entity_name: `${row.referencia_dp} — ${row.denominacao}`,
        action: original ? 'updated' : 'created',
        changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
      });

      toast({
        title: original ? 'Bem atualizado' : 'Bem cadastrado',
        description: `${row.referencia_dp} — ${row.denominacao}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar bem', description: error.message, variant: 'destructive' });
    },
  });
}

// `cascade` exclui as matrículas vinculadas; `keep` as devolve ao estado órfã.
export type DeleteBemMatriculaMode = 'cascade' | 'keep';

export function useDeleteBem() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ bem, matriculaMode }: { bem: BemRow; matriculaMode: DeleteBemMatriculaMode }) => {
      if (matriculaMode === 'cascade') {
        // Exclui as matrículas explicitamente (titularidades/impedimentos caem em cascata).
        const { error: matError } = await supabase.from('matricula').delete().eq('bem_id', bem.id);
        if (matError) throw matError;
      } else {
        // Desvincula antes de excluir o bem para que as matrículas sobrevivam como órfãs.
        const { error: unlinkError } = await supabase
          .from('matricula')
          .update({ bem_id: null })
          .eq('bem_id', bem.id);
        if (unlinkError) throw unlinkError;
      }

      const { error } = await supabase.from('bem').delete().eq('id', bem.id);
      if (error) throw error;
      return bem;
    },
    onSuccess: async (bem) => {
      queryClient.invalidateQueries({ queryKey: ['bens-by-cliente', bem.cliente_id] });
      queryClient.invalidateQueries({ queryKey: ['matriculas-by-bem', bem.id] });
      queryClient.invalidateQueries({ queryKey: ['matriculas-all'] });
      queryClient.invalidateQueries({ queryKey: ['matriculas-orphan'] });
      // Titularidades diretas do bem caem em cascata (FK ON DELETE CASCADE).
      queryClient.invalidateQueries({ queryKey: ['titularidades-by-bem', bem.id] });

      await logAction({
        area: 'osg',
        entity_type: 'bem',
        entity_id: bem.id,
        entity_name: `${bem.referencia_dp} — ${bem.denominacao}`,
        action: 'deleted',
      });

      toast({ title: 'Bem removido', description: bem.denominacao });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover bem', description: error.message, variant: 'destructive' });
    },
  });
}

// ============================================================================
// MATRICULA
// ============================================================================

export interface MatriculaEnriched extends MatriculaRow {
  bem_referencia: string | null;
  bem_denominacao: string | null;
  bem_cliente_id: string | null;
  cliente_nome: string | null;
  // Clientes derivados dos titulares (titularidade -> pessoa.cliente_id).
  // É por aqui que a matrícula é atribuída a um cliente quando órfã (sem bem).
  titular_cliente_ids: string[];
  cartorio_nome: string | null;
  cartorio_comarca: string | null;
  cartorio_uf: string | null;
}

const MATRICULA_ENRICH_SELECT = `
  *,
  bem:bem_id ( id, referencia_dp, denominacao, cliente_id, cliente:cliente_id ( nome ) ),
  cartorio:cartorio_id ( nome_completo, comarca, uf ),
  titularidade ( titular:titular_pessoa_id ( cliente_id, cliente:cliente_id ( nome ) ) )
`;

type RawEnrichedMatricula = MatriculaRow & {
  bem: {
    id: string; referencia_dp: string; denominacao: string; cliente_id: string;
    cliente: { nome: string } | null;
  } | null;
  cartorio: { nome_completo: string; comarca: string; uf: string } | null;
  titularidade: Array<{
    titular: { cliente_id: string; cliente: { nome: string } | null } | null;
  }> | null;
};

const enrichMatricula = (r: RawEnrichedMatricula): MatriculaEnriched => {
  const titulares = r.titularidade ?? [];
  const titularClienteIds = [
    ...new Set(
      titulares
        .map((t) => t.titular?.cliente_id)
        .filter((id): id is string => !!id),
    ),
  ];
  return {
    ...r,
    bem_referencia: r.bem?.referencia_dp ?? null,
    bem_denominacao: r.bem?.denominacao ?? null,
    bem_cliente_id: r.bem?.cliente_id ?? null,
    cliente_nome: r.bem?.cliente?.nome ?? titulares[0]?.titular?.cliente?.nome ?? null,
    titular_cliente_ids: titularClienteIds,
    cartorio_nome: r.cartorio?.nome_completo ?? null,
    cartorio_comarca: r.cartorio?.comarca ?? null,
    cartorio_uf: r.cartorio?.uf ?? null,
  };
};

export function useMatriculasByBem(bemId: string | null) {
  return useQuery<MatriculaRow[]>({
    queryKey: ['matriculas-by-bem', bemId],
    queryFn: async () => {
      if (!bemId) return [];
      const { data, error } = await supabase
        .from('matricula')
        .select('*')
        .eq('bem_id', bemId)
        .order('numero');
      if (error) throw error;
      return (data ?? []) as MatriculaRow[];
    },
    enabled: !!bemId,
  });
}

// Registro global de todas as matrículas (inclui órfãs), para a tela "Controle de Matrículas".
export function useAllMatriculas() {
  return useQuery<MatriculaEnriched[]>({
    queryKey: ['matriculas-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matricula')
        .select(MATRICULA_ENRICH_SELECT)
        .order('numero');
      if (error) throw error;
      return ((data ?? []) as unknown as RawEnrichedMatricula[]).map(enrichMatricula);
    },
  });
}

// Apenas matrículas órfãs (bem_id IS NULL) — usado no modal de vínculo a partir do bem.
export function useOrphanMatriculas() {
  return useQuery<MatriculaEnriched[]>({
    queryKey: ['matriculas-orphan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matricula')
        .select(MATRICULA_ENRICH_SELECT)
        .is('bem_id', null)
        .order('numero');
      if (error) throw error;
      return ((data ?? []) as unknown as RawEnrichedMatricula[]).map(enrichMatricula);
    },
  });
}

// Titular inicial exigido na criação de uma matrícula (define o cliente).
export interface TitularInicial {
  titular_pessoa_id: string;
  tipo: string;
  fracao: number | null;
}

export function useUpsertMatricula() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      values,
      original,
      titular,
    }: {
      values: MatriculaInsert | MatriculaUpdate;
      original?: MatriculaRow | null;
      // Obrigatório no create; ignorado no update (titulares editados pela aba própria).
      titular?: TitularInicial;
    }) => {
      if (original?.id) {
        const { data, error } = await supabase
          .from('matricula')
          .update(values as MatriculaUpdate)
          .eq('id', original.id)
          .select('*')
          .single();
        if (error) throw error;
        return { row: data as MatriculaRow, original };
      }
      if (!titular?.titular_pessoa_id) {
        throw new Error('Titular é obrigatório para cadastrar uma matrícula');
      }
      // Inserção atômica matrícula + titularidade (rollback se o titular falhar).
      const { data, error } = await supabase.rpc('criar_matricula_com_titular', {
        matricula_data: values as unknown as Json,
        titular_data: {
          titular_pessoa_id: titular.titular_pessoa_id,
          tipo: titular.tipo,
          fracao: titular.fracao,
        } as unknown as Json,
      });
      if (error) throw error;
      return { row: data as MatriculaRow, original: null };
    },
    onSuccess: async ({ row, original }) => {
      queryClient.invalidateQueries({ queryKey: ['matriculas-by-bem', row.bem_id] });
      queryClient.invalidateQueries({ queryKey: ['matriculas-all'] });
      queryClient.invalidateQueries({ queryKey: ['matriculas-orphan'] });
      queryClient.invalidateQueries({ queryKey: ['titularidades-by-matricula', row.id] });

      const changed = computeFieldDiff(
        original as unknown as Record<string, unknown> | null,
        row as unknown as Record<string, unknown>,
        MATRICULA_DIFF_FIELDS as string[],
      );

      await logAction({
        area: 'osg',
        entity_type: 'matricula',
        entity_id: row.id,
        entity_name: `Matrícula ${row.numero}`,
        action: original ? 'updated' : 'created',
        changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
      });

      toast({
        title: original ? 'Matrícula atualizada' : 'Matrícula cadastrada',
        description: `Nº ${row.numero}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar matrícula',
        description: matriculaErrorMessage(error),
        variant: 'destructive',
      });
    },
  });
}

// Traduz a violação da constraint UNIQUE (cartorio_id, numero) em mensagem clara.
function matriculaErrorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (e?.code === '23505' || (e?.message ?? '').includes('matricula_cartorio_numero_unique')) {
    return 'Já existe uma matrícula com esse número neste cartório.';
  }
  return e?.message ?? 'Erro desconhecido';
}

export function useDeleteMatricula() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (matricula: MatriculaRow) => {
      const { error } = await supabase.from('matricula').delete().eq('id', matricula.id);
      if (error) throw error;
      return matricula;
    },
    onSuccess: async (matricula) => {
      queryClient.invalidateQueries({ queryKey: ['matriculas-by-bem', matricula.bem_id] });
      queryClient.invalidateQueries({ queryKey: ['matriculas-all'] });
      queryClient.invalidateQueries({ queryKey: ['matriculas-orphan'] });
      queryClient.invalidateQueries({ queryKey: ['titularidades-by-matricula', matricula.id] });
      queryClient.invalidateQueries({ queryKey: ['impedimentos-by-matricula', matricula.id] });

      await logAction({
        area: 'osg',
        entity_type: 'matricula',
        entity_id: matricula.id,
        entity_name: `Matrícula ${matricula.numero}`,
        action: 'deleted',
      });

      toast({ title: 'Matrícula removida', description: `Nº ${matricula.numero}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover matrícula', description: error.message, variant: 'destructive' });
    },
  });
}

// Vincula/desvincula uma matrícula a um bem alterando apenas bem_id.
export function useSetMatriculaBem() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ matricula, bemId }: { matricula: MatriculaRow; bemId: string | null }) => {
      const { data, error } = await supabase
        .from('matricula')
        .update({ bem_id: bemId })
        .eq('id', matricula.id)
        .select('*')
        .single();
      if (error) throw error;
      return { row: data as MatriculaRow, previousBemId: matricula.bem_id, bemId };
    },
    onSuccess: async ({ row, previousBemId, bemId }) => {
      queryClient.invalidateQueries({ queryKey: ['matriculas-all'] });
      queryClient.invalidateQueries({ queryKey: ['matriculas-orphan'] });
      if (bemId) queryClient.invalidateQueries({ queryKey: ['matriculas-by-bem', bemId] });
      if (previousBemId) queryClient.invalidateQueries({ queryKey: ['matriculas-by-bem', previousBemId] });

      await logAction({
        area: 'osg',
        entity_type: 'matricula',
        entity_id: row.id,
        entity_name: `Matrícula ${row.numero}`,
        action: 'updated',
        changed_fields: { bem_id: { old: previousBemId, new: bemId } },
      });

      toast({ title: bemId ? 'Matrícula vinculada' : 'Matrícula desvinculada', description: `Nº ${row.numero}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao alterar vínculo', description: error.message, variant: 'destructive' });
    },
  });
}

// ============================================================================
// TITULARIDADE
// ============================================================================

export interface TitularidadeEnriched extends TitularidadeRow {
  titular_denominacao: string;
  titular_tipo: string | null;
  titular_cpf_cnpj: string | null;
}

// A titularidade ancora em exatamente um lado: numa matrícula (imóvel, fonte
// legal no registro) ou direto num bem sem matrícula (PS/AP/OU). O arco
// exclusivo é garantido pela constraint titularidade_ancora_xor no banco.
export type TitularidadeAnchor =
  | { kind: 'matricula'; id: string }
  | { kind: 'bem'; id: string };

const anchorColumn = (kind: TitularidadeAnchor['kind']) =>
  kind === 'matricula' ? 'matricula_id' : 'bem_id';

const anchorQueryKey = (anchor: TitularidadeAnchor) =>
  [`titularidades-by-${anchor.kind}`, anchor.id] as const;

// Campos da âncora para INSERT (a coluna não usada fica ausente → NULL).
export const titularidadeAnchorValues = (
  anchor: TitularidadeAnchor,
): { matricula_id: string } | { bem_id: string } =>
  anchor.kind === 'matricula' ? { matricula_id: anchor.id } : { bem_id: anchor.id };

// Invalida a(s) lista(s) afetada(s) por uma linha, qualquer que seja a âncora.
function invalidateTitularidadeLists(
  queryClient: ReturnType<typeof useQueryClient>,
  row: Pick<TitularidadeRow, 'matricula_id' | 'bem_id'>,
) {
  if (row.matricula_id) {
    queryClient.invalidateQueries({ queryKey: ['titularidades-by-matricula', row.matricula_id] });
  }
  if (row.bem_id) {
    queryClient.invalidateQueries({ queryKey: ['titularidades-by-bem', row.bem_id] });
  }
}

function useTitularidadesByAnchor(anchor: TitularidadeAnchor | null) {
  return useQuery<TitularidadeEnriched[]>({
    queryKey: anchor ? anchorQueryKey(anchor) : ['titularidades-by-none'],
    queryFn: async () => {
      if (!anchor) return [];
      const { data, error } = await supabase
        .from('titularidade')
        .select(`
          *,
          titular:titular_pessoa_id (id, denominacao, tipo_pessoa, cpf_cnpj)
        `)
        .eq(anchorColumn(anchor.kind), anchor.id)
        .order('created_at');
      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<TitularidadeRow & {
        titular: { id: string; denominacao: string; tipo_pessoa: string | null; cpf_cnpj: string | null } | null;
      }>;

      return rows.map((r) => ({
        ...r,
        titular_denominacao: r.titular?.denominacao ?? '—',
        titular_tipo: r.titular?.tipo_pessoa ?? null,
        titular_cpf_cnpj: r.titular?.cpf_cnpj ?? null,
      }));
    },
    enabled: !!anchor,
  });
}

export function useTitularidadesByMatricula(matriculaId: string | null) {
  return useTitularidadesByAnchor(matriculaId ? { kind: 'matricula', id: matriculaId } : null);
}

export function useTitularidadesByBem(bemId: string | null) {
  return useTitularidadesByAnchor(bemId ? { kind: 'bem', id: bemId } : null);
}

export function useUpsertTitularidade() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      values,
      original,
    }: {
      values: TitularidadeInsert | TitularidadeUpdate;
      original?: TitularidadeRow | null;
    }) => {
      if (original?.id) {
        const { data, error } = await supabase
          .from('titularidade')
          .update(values as unknown as RawTitularidadeUpdate)
          .eq('id', original.id)
          .select('*')
          .single();
        if (error) throw error;
        return { row: data as TitularidadeRow, original };
      }
      const { data, error } = await supabase
        .from('titularidade')
        .insert(values as unknown as RawTitularidadeInsert)
        .select('*')
        .single();
      if (error) throw error;
      return { row: data as TitularidadeRow, original: null };
    },
    onSuccess: async ({ row, original }) => {
      invalidateTitularidadeLists(queryClient, row);

      const changed = computeFieldDiff(
        original as unknown as Record<string, unknown> | null,
        row as unknown as Record<string, unknown>,
        TITULARIDADE_DIFF_FIELDS as string[],
      );

      await logAction({
        area: 'osg',
        entity_type: 'titularidade',
        entity_id: row.id,
        entity_name: row.tipo,
        action: original ? 'updated' : 'created',
        changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
      });

      toast({ title: original ? 'Titularidade atualizada' : 'Titularidade cadastrada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar titularidade', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteTitularidade() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (titularidade: TitularidadeRow) => {
      const { error } = await supabase.from('titularidade').delete().eq('id', titularidade.id);
      if (error) throw error;
      return titularidade;
    },
    onSuccess: async (titularidade) => {
      invalidateTitularidadeLists(queryClient, titularidade);
      await logAction({
        area: 'osg',
        entity_type: 'titularidade',
        entity_id: titularidade.id,
        entity_name: titularidade.tipo,
        action: 'deleted',
      });
      toast({ title: 'Titularidade removida' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover titularidade', description: error.message, variant: 'destructive' });
    },
  });
}

// ============================================================================
// IMPEDIMENTO
// ============================================================================

export interface ImpedimentoEnriched extends ImpedimentoRow {
  credor_denominacao: string | null;
}

export function useImpedimentosByMatricula(matriculaId: string | null) {
  return useQuery<ImpedimentoEnriched[]>({
    queryKey: ['impedimentos-by-matricula', matriculaId],
    queryFn: async () => {
      if (!matriculaId) return [];
      const { data, error } = await supabase
        .from('impedimento')
        .select(`
          *,
          credor:credor_pessoa_id (id, denominacao)
        `)
        .eq('matricula_id', matriculaId)
        .order('created_at');
      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<ImpedimentoRow & {
        credor: { id: string; denominacao: string } | null;
      }>;

      return rows.map((r) => ({
        ...r,
        credor_denominacao: r.credor?.denominacao ?? r.credor_nome ?? null,
      }));
    },
    enabled: !!matriculaId,
  });
}

export function useUpsertImpedimento() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      values,
      original,
    }: {
      values: ImpedimentoInsert | ImpedimentoUpdate;
      original?: ImpedimentoRow | null;
    }) => {
      if (original?.id) {
        const { data, error } = await supabase
          .from('impedimento')
          .update(values as ImpedimentoUpdate)
          .eq('id', original.id)
          .select('*')
          .single();
        if (error) throw error;
        return { row: data as ImpedimentoRow, original };
      }
      const { data, error } = await supabase
        .from('impedimento')
        .insert(values as ImpedimentoInsert)
        .select('*')
        .single();
      if (error) throw error;
      return { row: data as ImpedimentoRow, original: null };
    },
    onSuccess: async ({ row, original }) => {
      queryClient.invalidateQueries({ queryKey: ['impedimentos-by-matricula', row.matricula_id] });

      const changed = computeFieldDiff(
        original as unknown as Record<string, unknown> | null,
        row as unknown as Record<string, unknown>,
        IMPEDIMENTO_DIFF_FIELDS as string[],
      );

      await logAction({
        area: 'osg',
        entity_type: 'impedimento',
        entity_id: row.id,
        entity_name: row.tipo,
        action: original ? 'updated' : 'created',
        changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
      });

      toast({ title: original ? 'Impedimento atualizado' : 'Impedimento cadastrado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar impedimento', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteImpedimento() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (impedimento: ImpedimentoRow) => {
      const { error } = await supabase.from('impedimento').delete().eq('id', impedimento.id);
      if (error) throw error;
      return impedimento;
    },
    onSuccess: async (impedimento) => {
      queryClient.invalidateQueries({ queryKey: ['impedimentos-by-matricula', impedimento.matricula_id] });
      await logAction({
        area: 'osg',
        entity_type: 'impedimento',
        entity_id: impedimento.id,
        entity_name: impedimento.tipo,
        action: 'deleted',
      });
      toast({ title: 'Impedimento removido' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover impedimento', description: error.message, variant: 'destructive' });
    },
  });
}

// ============================================================================
// CARTORIO
// ============================================================================

export function useCartorios() {
  return useQuery<CartorioRow[]>({
    queryKey: ['cartorios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cartorio')
        .select('*')
        .order('uf')
        .order('comarca')
        .order('nome_completo');
      if (error) throw error;
      return (data ?? []) as CartorioRow[];
    },
  });
}

export function useUpsertCartorio() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      values,
      original,
    }: {
      values: CartorioInsert | CartorioUpdate;
      original?: CartorioRow | null;
    }) => {
      if (original?.id) {
        const { data, error } = await supabase
          .from('cartorio')
          .update(values as CartorioUpdate)
          .eq('id', original.id)
          .select('*')
          .single();
        if (error) throw error;
        return { row: data as CartorioRow, original };
      }
      const { data, error } = await supabase
        .from('cartorio')
        .insert(values as CartorioInsert)
        .select('*')
        .single();
      if (error) throw error;
      return { row: data as CartorioRow, original: null };
    },
    onSuccess: async ({ row, original }) => {
      queryClient.invalidateQueries({ queryKey: ['cartorios'] });

      const changed = computeFieldDiff(
        original as unknown as Record<string, unknown> | null,
        row as unknown as Record<string, unknown>,
        CARTORIO_DIFF_FIELDS as string[],
      );

      await logAction({
        area: 'osg',
        entity_type: 'cartorio',
        entity_id: row.id,
        entity_name: row.nome_completo,
        action: original ? 'updated' : 'created',
        changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
      });

      toast({
        title: original ? 'Cartório atualizado' : 'Cartório cadastrado',
        description: row.nome_completo,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar cartório', description: error.message, variant: 'destructive' });
    },
  });
}
