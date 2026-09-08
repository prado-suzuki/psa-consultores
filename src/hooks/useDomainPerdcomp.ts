import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { currentAmbiente } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  buildLatestSituacoesMap,
  type ControleDcomp,
  type ControleDistribuicao,
  type ControlePer,
  type ControlePerSituacao,
  type ControlePerSituacaoMap,
} from '@/lib/controlePerdcomp';

type ClienteTable = Database['public']['Tables']['cliente'];
type ContribuinteTable = Database['public']['Tables']['contribuinte'];
type PerTable = Database['public']['Tables']['per'];
type PerSituacaoTable = Database['public']['Tables']['per_situacao'];
type DcompTable = Database['public']['Tables']['dcomp'];

export type ClientePerdcomp = Pick<ClienteTable['Row'], 'id' | 'nome'>;
export type ContribuintePerdcomp = Pick<
  ContribuinteTable['Row'],
  'id' | 'nome_razao_social' | 'cpf_cnpj'
>;
export type PerRetificacaoOption = Pick<
  PerTable['Row'],
  'nr_per' | 'exercicio' | 'tri_exercicio' | 'tp_credito'
>;
export type PerSituacaoOption = Pick<
  PerTable['Row'],
  'nr_per' | 'id_contribuinte' | 'exercicio' | 'tri_exercicio'
>;
export type PerExistente = Pick<PerTable['Row'], 'nr_per'>;
export type PerInsert = PerTable['Insert'];
export type PerUpdate = PerTable['Update'];
export type PerSituacaoRow = PerSituacaoTable['Row'];
export type PerSituacaoInsert = PerSituacaoTable['Insert'];
export type PerSituacaoUpdate = PerSituacaoTable['Update'];
export type DcompInsert = DcompTable['Insert'];
export type ClienteControlePerdcomp = Pick<ClienteTable['Row'], 'id' | 'nome'>;
export type ContribuinteControlePerdcomp = Pick<
  ContribuinteTable['Row'],
  'id' | 'nome_razao_social'
>;

export type GlobalProcessLookupResult =
  | { status: 'invalid' }
  | { status: 'not-found' }
  | { status: 'unlinked' }
  | { status: 'found'; contribuinteId: string; clienteId: string };

type DomainMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn' | 'mutationKey'
>;

export interface AtualizarPerPorNumeroInput {
  nrPer: string | undefined;
  payload: PerUpdate;
}

export interface AtualizarSituacaoPerPorIdInput {
  id: string | undefined;
  payload: PerSituacaoUpdate;
}

export const perdcompQueryKeys = {
  contribuintesCarga: ['contribuintes-for-perdcomp'] as const,
  clientesPerModal: ['clientes-dev-per-modal'] as const,
  contribuintesPorCliente: (clienteId: string) => ['contribuintes', clienteId] as const,
  persExistentes: (contribuinteId: string | undefined) =>
    ['pers-existentes', contribuinteId] as const,
  persParaSituacao: (contribuinteId: string | undefined) =>
    ['pers-for-situacao', contribuinteId] as const,
};

const PAGINA_PER = 1000;

const PERDCOMP_MUTATION_KEYS = {
  buscarPerPorNumero: ['perdcomp', 'per', 'buscar-por-numero'],
  upsertPersEmLote: ['perdcomp', 'per', 'upsert-em-lote'],
  inserirPer: ['perdcomp', 'per', 'inserir'],
  atualizarPerPorNumero: ['perdcomp', 'per', 'atualizar-por-numero'],
  inserirSituacaoPer: ['perdcomp', 'per-situacao', 'inserir'],
  inserirSituacaoPerComRetorno: ['perdcomp', 'per-situacao', 'inserir-com-retorno'],
  inserirSituacoesPerEmLote: ['perdcomp', 'per-situacao', 'inserir-em-lote'],
  atualizarSituacaoPerPorId: ['perdcomp', 'per-situacao', 'atualizar-por-id'],
  inserirDcomps: ['perdcomp', 'dcomp', 'inserir'],
  buscarProcessoGlobal: ['perdcomp', 'processo', 'buscar-global'],
} as const;

/**
 * Contribuintes que aparecem em ao menos um PER.
 *
 * `per.id_contribuinte` nao tem FK para `contribuinte`, entao o PostgREST nao embeda a
 * relacao: a distincao sai daqui. Le pagina a pagina porque o teto de linhas do PostgREST
 * trunca em silencio, e uma pagina perdida some com um cliente inteiro do filtro.
 */
async function buscarContribuinteIdsComPer(): Promise<string[]> {
  const ids = new Set<string>();
  for (let pagina = 0; ; pagina += 1) {
    const inicio = pagina * PAGINA_PER;
    const { data, error } = await supabase
      .from('per')
      .select('id_contribuinte')
      .range(inicio, inicio + PAGINA_PER - 1);
    if (error) throw error;
    for (const per of data ?? []) ids.add(per.id_contribuinte);
    if ((data ?? []).length < PAGINA_PER) return [...ids];
  }
}

async function buscarClienteIdsComPer(): Promise<string[]> {
  const contribuinteIds = await buscarContribuinteIdsComPer();
  if (contribuinteIds.length === 0) return [];
  const { data, error } = await supabase
    .from('contribuinte')
    .select('cliente_id')
    .in('id', contribuinteIds)
    .eq('excluido', false)
    .eq('ambiente', currentAmbiente);
  if (error) throw error;
  return [
    ...new Set(
      (data ?? [])
        .map((contribuinte) => contribuinte.cliente_id)
        .filter((clienteId): clienteId is string => !!clienteId),
    ),
  ];
}

/** So os clientes com PER lancado: o filtro serve para achar quem tem cadastro. */
export function useClientesControlePerdcomp() {
  return useQuery<ClienteControlePerdcomp[]>({
    queryKey: ['clientes-com-perdcomp'],
    queryFn: async () => {
      const clienteIds = await buscarClienteIdsComPer();
      if (clienteIds.length === 0) return [];
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .in('id', clienteIds)
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Mesmo recorte um nivel abaixo. Key propria de proposito: `useContribuintesPerModal` cadastra
 * PER novo e precisa da lista inteira, inclusive de quem ainda nao tem nenhum.
 */
export function useContribuintesControlePerdcomp(clienteId: string) {
  return useQuery<ContribuinteControlePerdcomp[]>({
    queryKey: ['contribuintes-com-perdcomp', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const contribuinteIds = await buscarContribuinteIdsComPer();
      if (contribuinteIds.length === 0) return [];
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social')
        .in('id', contribuinteIds)
        .eq('cliente_id', clienteId)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clienteId,
  });
}

export function usePersControlePerdcomp(contribuinteId: string, searched: boolean) {
  return useQuery<ControlePer[]>({
    queryKey: ['perdcomp-per', contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return [];
      const { data, error } = await supabase
        .from('per_with_contribuinte')
        .select('*')
        .eq('id_contribuinte', contribuinteId)
        .order('exercicio', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ControlePer[];
    },
    enabled: searched && !!contribuinteId,
  });
}

export function useSituacoesControlePerdcomp(contribuinteId: string, searched: boolean) {
  return useQuery<ControlePerSituacaoMap>({
    queryKey: ['per-situacoes', contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return {};
      const { data: pers, error: perError } = await supabase
        .from('per')
        .select('nr_per')
        .eq('id_contribuinte', contribuinteId);
      if (perError) throw perError;
      const perNumbers = (pers ?? []).map((per) => per.nr_per);
      if (perNumbers.length === 0) return {};
      const { data, error } = await supabase
        .from('per_situacao')
        .select('nr_proc_per, situacao, criado_em, dt_pagamento')
        .in('nr_proc_per', perNumbers)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return buildLatestSituacoesMap((data ?? []) as ControlePerSituacao[]);
    },
    enabled: searched && !!contribuinteId,
  });
}

export function useDcompsControlePerdcomp(contribuinteId: string, searched: boolean) {
  return useQuery<ControleDcomp[]>({
    queryKey: ['perdcomp-dcomp', contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return [];
      const { data: pers, error: perError } = await supabase
        .from('per')
        .select('nr_per')
        .eq('id_contribuinte', contribuinteId);
      if (perError) throw perError;
      const perNumbers = (pers ?? []).map((per) => per.nr_per);
      if (perNumbers.length === 0) return [];
      const { data, error } = await supabase
        .from('dcomp')
        .select('*')
        .in('nr_per_orig', perNumbers)
        .order('dt_envio', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: searched && !!contribuinteId,
  });
}

export function useDistribuicoesControlePerdcomp(
  contribuinteId: string,
  documentNumbers: string[],
  searched: boolean,
) {
  return useQuery<ControleDistribuicao[]>({
    queryKey: ['perdcomp-distribuicoes', contribuinteId, documentNumbers.join(',')],
    queryFn: async () => {
      if (documentNumbers.length === 0) return [];
      const { data, error } = await supabase
        .from('distribuicao_dcomp')
        .select('nr_documento, valor_tributo, valor_original')
        .in('nr_documento', documentNumbers);
      if (error) throw error;
      return data ?? [];
    },
    enabled: searched && documentNumbers.length > 0,
  });
}

export function useSituacoesDistintasControlePerdcomp() {
  return useQuery<string[]>({
    queryKey: ['per-situacoes-distintas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('per_situacao')
        .select('situacao')
        .not('situacao', 'is', null);
      return Array.from(new Set((data ?? []).map((row) => row.situacao)));
    },
  });
}

export function useBuscarProcessoGlobalPerdcomp(): UseMutationResult<
  GlobalProcessLookupResult,
  Error,
  string
> {
  return useMutation<GlobalProcessLookupResult, Error, string>({
    mutationKey: PERDCOMP_MUTATION_KEYS.buscarProcessoGlobal,
    mutationFn: async (processNumber) => {
      const digits = processNumber.replace(/\D/g, '');
      if (!digits) return { status: 'invalid' };
      const { data: matchedPers } = await supabase
        .from('per')
        .select('id_contribuinte')
        .like('nr_per', `%${digits}%`)
        .limit(1);
      let contribuinteId = matchedPers?.[0]?.id_contribuinte ?? null;
      if (!contribuinteId) {
        const { data: matchedDcomps } = await supabase
          .from('dcomp')
          .select('nr_per_orig')
          .like('nr_documento', `%${digits}%`)
          .limit(1);
        if (matchedDcomps?.[0]?.nr_per_orig) {
          const { data: per } = await supabase
            .from('per')
            .select('id_contribuinte')
            .eq('nr_per', matchedDcomps[0].nr_per_orig)
            .maybeSingle();
          contribuinteId = per?.id_contribuinte ?? null;
        }
      }
      if (!contribuinteId) return { status: 'not-found' };
      const { data: contribuinte } = await supabase
        .from('contribuinte')
        .select('cliente_id')
        .eq('id', contribuinteId)
        .maybeSingle();
      if (!contribuinte?.cliente_id) return { status: 'unlinked' };
      return { status: 'found', contribuinteId, clienteId: contribuinte.cliente_id };
    },
  });
}

export function useContribuintesCargaPerdcomp() {
  return useQuery<ContribuintePerdcomp[]>({
    queryKey: perdcompQueryKeys.contribuintesCarga,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClientesPerModal() {
  return useQuery<ClientePerdcomp[]>({
    queryKey: perdcompQueryKeys.clientesPerModal,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome');

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContribuintesPerModal(clienteId: string) {
  return useQuery<ContribuintePerdcomp[]>({
    queryKey: perdcompQueryKeys.contribuintesPorCliente(clienteId),
    queryFn: async () => {
      if (!clienteId) return [];

      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .eq('cliente_id', clienteId)
        .eq('excluido', false)
        .eq('ambiente', currentAmbiente)
        .order('nome_razao_social');

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clienteId,
  });
}

export function usePersExistentesPerModal(contribuinteId: string | undefined, isEditing: boolean) {
  return useQuery<PerRetificacaoOption[]>({
    queryKey: perdcompQueryKeys.persExistentes(contribuinteId),
    queryFn: async () => {
      if (!contribuinteId) return [];

      const { data, error } = await supabase
        .from('per')
        .select('nr_per, exercicio, tri_exercicio, tp_credito')
        .eq('id_contribuinte', contribuinteId)
        .order('exercicio', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contribuinteId && !isEditing,
  });
}

export function usePersParaSituacao(contribuinteId?: string) {
  return useQuery<PerSituacaoOption[]>({
    queryKey: perdcompQueryKeys.persParaSituacao(contribuinteId),
    queryFn: async () => {
      let query = supabase
        .from('per')
        .select('nr_per, id_contribuinte, exercicio, tri_exercicio')
        .order('exercicio', { ascending: false });

      if (contribuinteId) {
        query = query.eq('id_contribuinte', contribuinteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBuscarPerPorNumero(): UseMutationResult<PerExistente | null, Error, string> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.buscarPerPorNumero,
    mutationFn: async (nrPer) => {
      // O consumidor atual trata somente a existência; o erro desta consulta era ignorado.
      const { data } = await supabase
        .from('per')
        .select('nr_per')
        .eq('nr_per', nrPer)
        .maybeSingle();

      return data;
    },
  });
}

export function useUpsertPersEmLote(): UseMutationResult<void, Error, PerInsert[]> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.upsertPersEmLote,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('per').upsert(payload, { onConflict: 'nr_per' });
      if (error) throw error;
    },
  });
}

export function useInserirPer(): UseMutationResult<void, Error, PerInsert[]> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.inserirPer,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('per').insert(payload);
      if (error) throw error;
    },
  });
}

export function useAtualizarPerPorNumero(): UseMutationResult<
  void,
  Error,
  AtualizarPerPorNumeroInput
> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.atualizarPerPorNumero,
    mutationFn: async ({ nrPer, payload }) => {
      // Sem a guarda, o filtro virava `nr_per=eq.undefined` e não casava com
      // nada — update de zero linhas, reportado como salvo.
      if (!nrPer) throw new Error('PER inválido');
      const { data, error } = await supabase
        .from('per')
        .update(payload)
        .eq('nr_per', nrPer)
        .select('nr_per');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          'Não foi possível salvar este PER: a alteração foi recusada pelo banco, ou o ' +
            'processo não está mais disponível para você. Atualize a página e tente novamente.',
        );
      }
    },
  });
}

export function useInserirSituacaoPer(): UseMutationResult<void, Error, PerSituacaoInsert> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.inserirSituacaoPer,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('per_situacao').insert(payload);
      if (error) throw error;
    },
  });
}

export function useInserirSituacaoPerComRetorno(): UseMutationResult<
  PerSituacaoRow,
  Error,
  PerSituacaoInsert
> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.inserirSituacaoPerComRetorno,
    mutationFn: async (payload) => {
      const { data, error } = await supabase.from('per_situacao').insert(payload).select().single();

      if (error) throw error;
      return data;
    },
  });
}

export function useInserirSituacoesPerEmLote(): UseMutationResult<
  void,
  Error,
  PerSituacaoInsert[]
> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.inserirSituacoesPerEmLote,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('per_situacao').insert(payload);
      if (error) throw error;
    },
  });
}

export function useAtualizarSituacaoPerPorId(): UseMutationResult<
  PerSituacaoRow,
  Error,
  AtualizarSituacaoPerPorIdInput
> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.atualizarSituacaoPerPorId,
    mutationFn: async ({ id, payload }) => {
      const { data, error } = await supabase
        .from('per_situacao')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useInserirDcomps(): UseMutationResult<void, Error, DcompInsert[]> {
  return useMutation({
    mutationKey: PERDCOMP_MUTATION_KEYS.inserirDcomps,
    mutationFn: async (payload) => {
      const { error } = await supabase.from('dcomp').insert(payload);
      if (error) throw error;
    },
  });
}

export type PerDcompTipo = 'per' | 'dcomp';

const ROTULO_PERDCOMP: Record<PerDcompTipo, string> = { per: 'PER', dcomp: 'DCOMP' };

/**
 * A linha ainda está visível para quem pediu a exclusão?
 *
 * Serve para separar as duas causas de "zero linhas apagadas", que a mesma
 * resposta do PostgREST não distingue: sem permissão de excluir (a linha
 * aparece na leitura, some no delete) ou a linha não está mais lá (já excluída
 * por outra pessoa, ou de um cliente fora dos clusters de quem pediu). Só roda
 * quando o delete já falhou, então não custa nada no caminho feliz.
 *
 * O terceiro estado existe porque a própria sondagem pode falhar (sessão
 * expirada, rede). Tratar essa falha como "não está mais lá" seria inventar uma
 * causa a partir de uma leitura que nem aconteceu.
 */
type SondagemPerDcomp = 'visivel' | 'ausente' | 'indeterminado';

async function sondarPerDcomp(
  type: PerDcompTipo,
  identifier: string,
): Promise<SondagemPerDcomp> {
  const { data, error } =
    type === 'per'
      ? await supabase.from('per').select('nr_per').eq('nr_per', identifier).maybeSingle()
      : await supabase
          .from('dcomp')
          .select('nr_documento')
          .eq('nr_documento', identifier)
          .maybeSingle();

  if (error) {
    console.error('[perdcomp] falha ao sondar o registro após exclusão recusada', error);
    return 'indeterminado';
  }
  return data ? 'visivel' : 'ausente';
}

/**
 * As duas FKs de retificação são as únicas que ficaram sem cascata, de
 * propósito. Elas apontam para tabelas diferentes, e ao excluir um PER as duas
 * podem disparar: `per_nr_proc_ret_fkey` quando outro PER o retifica, e
 * `dcomp_nr_dcomp_ret_fkey` quando um DCOMP de OUTRO processo retifica um dos
 * DCOMPs que a cascata levaria junto. Uma frase só para os dois casos mandaria
 * a pessoa procurar um PER retificador que não existe.
 */
function mensagemDeRetificacao(type: PerDcompTipo, error: unknown): string {
  if (type === 'dcomp') {
    return (
      'Este DCOMP não pode ser excluído porque outro DCOMP o aponta como documento ' +
      'retificado. Exclua o retificador primeiro.'
    );
  }

  const detalhe = ['message', 'details']
    .map((campo) => (error as Record<string, unknown>)?.[campo])
    .filter((valor): valor is string => typeof valor === 'string')
    .join(' ');

  if (detalhe.includes('dcomp_nr_dcomp_ret_fkey')) {
    return (
      'Este PER não pode ser excluído porque um DCOMP de outro processo aponta como ' +
      'retificado um dos DCOMPs deste PER. Exclua o DCOMP retificador primeiro.'
    );
  }
  return (
    'Este PER não pode ser excluído porque outro PER o aponta como processo retificado. ' +
    'Exclua o retificador primeiro.'
  );
}

/**
 * Exclusão definitiva de um PER ou de um DCOMP.
 *
 * **Um comando só, de propósito.** Antes eram quatro deletes em sequência, sem
 * transação e na ordem errada: `distribuicao_dcomp` saía primeiro, e ela era
 * justamente a única das quatro tabelas que o sublíder já tinha permissão para
 * apagar. Resultado: a recusa chegava no passo seguinte, as distribuições já
 * tinham ido embora, o DCOMP continuava de pé e a tela dizia que concluiu.
 * A migration `20260908212829_perdcomp_exclusao_sublider_cascata` pôs
 * `on delete cascade` nas FKs `per_situacao.nr_proc_per` e `dcomp.nr_per_orig`
 * (a de `distribuicao_dcomp.nr_documento` já era), então apagar o PER arrasta
 * situações, DCOMPs e distribuições numa transação só. **Este hook depende
 * daquela migration estar em produção** — sem ela, o delete do PER bate na FK
 * das situações e volta 23503.
 *
 * **O `.select()` não é enfeite.** Quando a RLS recusa um DELETE, o Postgres não
 * devolve erro: a cláusula `using` da política filtra a linha e a operação
 * termina com sucesso afetando ZERO linhas. Sem conferir isso, o sucesso era
 * anunciado, a lista era invalidada e o registro reaparecia — que é exatamente
 * o "clico em excluir e não exclui" relatado em 08/09/2026.
 */
export function useExcluirPerDcompDefinitivamente(
  type: PerDcompTipo,
  identifier: string,
  options?: DomainMutationOptions<void, void>,
): UseMutationResult<void, Error, void> {
  return useMutation({
    mutationFn: async () => {
      const rotulo = ROTULO_PERDCOMP[type];

      const { data, error } =
        type === 'per'
          ? await supabase.from('per').delete().eq('nr_per', identifier).select('nr_per')
          : await supabase
              .from('dcomp')
              .delete()
              .eq('nr_documento', identifier)
              .select('nr_documento');

      if (error) {
        // Apagar o processo original porque pediram para apagar o retificador
        // seria dano silencioso: a recusa aqui é correta, só precisa ser legível.
        if ((error as { code?: string }).code === '23503') {
          throw new Error(mensagemDeRetificacao(type, error));
        }
        throw error;
      }

      if (!data || data.length === 0) {
        const sondagem = await sondarPerDcomp(type, identifier);
        if (sondagem === 'indeterminado') {
          throw new Error(
            `A exclusão deste ${rotulo} não foi efetivada, e não foi possível confirmar o ` +
              `motivo. Atualize a página e tente novamente.`,
          );
        }
        throw new Error(
          sondagem === 'visivel'
            ? `A exclusão foi recusada pelo banco. Você não tem permissão para excluir este ` +
              `${rotulo}: é necessário ter o papel de Sublíder ou superior.`
            : `Este ${rotulo} não está mais disponível para você — pode ter sido excluído por ` +
              `outra pessoa. Atualize a página e tente novamente.`,
        );
      }
    },
    ...options,
  });
}
