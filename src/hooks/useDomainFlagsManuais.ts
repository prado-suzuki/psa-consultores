import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { Database } from '@/integrations/supabase/types';

// Flags MANUAIS de projeto (projeto_flag_valor). A flag derivada declarativa o
// sistema calcula do cadastro (ver src/lib/templates/flags.ts); a manual é o
// interruptor que o consultor liga na mão, para o caso em que não há de onde
// derivar. É o que a alteração contratual precisa: sem histórico da sociedade
// guardada, "teve aumento de capital" não se deduz do estado atual.
//
// Escopo: `tmpl_flag.escopo` diz de QUEM é a resposta.
//
//   'cliente'   — vale para o cliente inteiro (pj_pessoa_id e documento_base_id
//                 NULL).
//   'pj'        — vale para uma empresa dele (pj_pessoa_id = a PJ do contrato).
//   'documento' — vale para a ALTERAÇÃO CONTRATUAL que sucede um documento
//                 registrado, e é o escopo das seis flags `evento_*`.
//
// O escopo 'documento' merece a explicação, porque o nome da coluna não é o que
// se espera: `documento_base_id` aponta para o documento REGISTRADO que a
// alteração substitui, não para o documento da alteração. Dois motivos:
//
//   (a) quando o consultor responde, o documento da alteração ainda não existe.
//       Ele só nasce em "Validar versão", e é bom que seja assim: `congelado` no
//       controlador é `documentoGerado != null`, e uma linha criada cedo faria a
//       tela renderizar do snapshot em vez de compor ao vivo do cadastro
//       atualizado — sendo que o consolidado é justamente o estado NOVO;
//   (b) o predecessor é imutável, então a chave atravessa toda a linhagem da
//       alteração sem precisar de cópia a cada fork de versão (é o contrário do
//       que acontece com documento_override, que useSalvarDocumentoGerado tem
//       de recopiar a cada "Atualizar versão").
//
// Cada escopo tem seu índice único parcial (uq_projeto_flag_valor_escopo_cliente,
// _escopo_pj e _escopo_documento), e é por isso que a escrita aqui é
// find-then-insert-or-update em vez de upsert: o PostgREST não sabe informar o
// predicado (`WHERE pj_pessoa_id IS NULL`) que o ON CONFLICT precisaria para
// escolher entre índices parciais.

export type ProjetoFlagValorRow = Database['public']['Tables']['projeto_flag_valor']['Row'];

/** Escopo de um valor de flag, espelhando `tmpl_flag.escopo`. */
export type EscopoFlag = 'cliente' | 'pj' | 'documento';

/** Normaliza o `escopo` que vem do catálogo (texto livre no banco). */
export function escopoDaFlag(escopo: string | null | undefined): EscopoFlag {
  return escopo === 'pj' || escopo === 'documento' ? escopo : 'cliente';
}

const CHAVE = 'projeto-flag-valor';
const chaveValores = (
  clienteId: string | null,
  pjPessoaId: string | null,
  documentoBaseId: string | null,
) => [CHAVE, clienteId ?? '∅', pjPessoaId ?? '∅', documentoBaseId ?? '∅'] as const;

interface FlagsManuaisArgs {
  clienteId: string | null;
  /** Empresa do contrato (o `pj_pessoa_id` da tabela); null em modelo sem empresa. */
  pjPessoaId: string | null;
  /**
   * Documento registrado que a alteração em curso substitui — a chave das
   * respostas de escopo 'documento'. null quando não há alteração em curso.
   */
  documentoBaseId?: string | null;
}

/**
 * Valores manuais aplicáveis ao par cliente + empresa, mais os da alteração em
 * curso quando há uma: as linhas de escopo cliente (pj e base NULL), as da
 * empresa escolhida (base NULL) e as ancoradas no documento base, num só
 * ida-e-volta. Sem empresa, só as de escopo cliente, porque `IS NULL` e
 * `= <id>` são filtros distintos no Postgres e uma linha de outra PJ não vale
 * para este documento.
 */
export function useFlagsManuaisProjeto({
  clienteId,
  pjPessoaId,
  documentoBaseId = null,
}: FlagsManuaisArgs) {
  return useQuery({
    queryKey: chaveValores(clienteId, pjPessoaId, documentoBaseId),
    enabled: !!clienteId,
    queryFn: async (): Promise<ProjetoFlagValorRow[]> => {
      // Um OR só, com os ramos de escopo lado a lado. Os dois primeiros ramos
      // fixam documento_base_id.is.null para não arrastar a resposta de UMA
      // alteração para as demais da mesma empresa.
      const ramos = ['and(documento_base_id.is.null,pj_pessoa_id.is.null)'];
      if (pjPessoaId) ramos.push(`and(documento_base_id.is.null,pj_pessoa_id.eq.${pjPessoaId})`);
      if (documentoBaseId) ramos.push(`documento_base_id.eq.${documentoBaseId}`);

      const { data, error } = await supabase
        .from('projeto_flag_valor')
        .select('*')
        .eq('cliente_id', clienteId!)
        .or(ramos.join(','));
      if (error) throw error;
      return (data ?? []) as ProjetoFlagValorRow[];
    },
  });
}

/** Nomes das flags manuais ligadas, dado o catálogo de `tmpl_flag`. */
export function nomesDasFlagsManuaisLigadas(
  valores: ProjetoFlagValorRow[],
  nomePorFlagId: Map<string, string>,
): string[] {
  return valores
    .filter((v) => v.valor)
    .map((v) => nomePorFlagId.get(v.flag_id))
    .filter((nome): nome is string => !!nome);
}

export interface DefinirFlagManualInput {
  clienteId: string;
  /** Empresa do contrato. Gravado NULL quando o escopo da flag é 'cliente'. */
  pjPessoaId: string | null;
  /** Documento registrado que a alteração substitui. Só no escopo 'documento'. */
  documentoBaseId?: string | null;
  flagId: string;
  /** `tmpl_flag.nome` — só para a trilha de auditoria ficar legível. */
  flagNome: string;
  escopo: EscopoFlag;
  valor: boolean;
}

/** Resultado do toggle: a linha vigente e o valor que ela tinha antes. */
export interface DefinirFlagManualResultado {
  linha: ProjetoFlagValorRow;
  /** null quando a linha não existia (primeiro toque nesta flag/escopo). */
  anterior: boolean | null;
}

/**
 * Encontra a linha vigente de uma flag no escopo pedido, ou null. Os três
 * escopos são filtros DIFERENTES sobre a mesma tabela, e trocar `IS NULL` por
 * `= <id>` é o que separa uma resposta da outra no Postgres.
 */
async function buscarLinha(
  clienteId: string,
  flagId: string,
  alvoPj: string | null,
  alvoBase: string | null,
) {
  let busca = supabase
    .from('projeto_flag_valor')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('flag_id', flagId);
  busca = alvoBase ? busca.eq('documento_base_id', alvoBase) : busca.is('documento_base_id', null);
  // No escopo 'documento' a chave única é (documento_base_id, flag_id): a
  // empresa vai junto como informação, mas não entra no filtro.
  if (!alvoBase) busca = alvoPj ? busca.eq('pj_pessoa_id', alvoPj) : busca.is('pj_pessoa_id', null);
  const { data, error } = await busca.maybeSingle();
  if (error) throw error;
  return (data as ProjetoFlagValorRow) ?? null;
}

/** Resolve os alvos de escrita a partir do escopo, validando o que falta. */
function alvosDoEscopo(input: {
  escopo: EscopoFlag;
  pjPessoaId: string | null;
  documentoBaseId?: string | null;
}): { alvoPj: string | null; alvoBase: string | null } {
  if (input.escopo === 'documento') {
    if (!input.documentoBaseId) {
      throw new Error('Esta condição pertence a uma alteração contratual, e não há uma em curso.');
    }
    return { alvoPj: input.pjPessoaId, alvoBase: input.documentoBaseId };
  }
  if (input.escopo === 'pj') {
    if (!input.pjPessoaId) {
      throw new Error('Escolha a empresa do contrato antes de marcar esta condição.');
    }
    return { alvoPj: input.pjPessoaId, alvoBase: null };
  }
  // Escopo 'cliente' ignora a empresa de propósito: é o que o índice parcial
  // uq_projeto_flag_valor_escopo_cliente exige (pj_pessoa_id IS NULL).
  return { alvoPj: null, alvoBase: null };
}

/**
 * Liga ou desliga uma flag manual no escopo dela. Não há delete (a RLS de DELETE
 * é só de admin): desligar grava `valor = false`, que é o estado que o motor lê.
 */
export function useDefinirFlagManual() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: DefinirFlagManualInput): Promise<DefinirFlagManualResultado> => {
      const { alvoPj, alvoBase } = alvosDoEscopo(input);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const existente = await buscarLinha(input.clienteId, input.flagId, alvoPj, alvoBase);

      if (existente) {
        const anterior = existente.valor;
        const { data, error } = await supabase
          .from('projeto_flag_valor')
          .update({ valor: input.valor, setado_por_id: userId, updated_by: userId })
          .eq('id', existente.id)
          .select('*')
          .single();
        if (error) throw error;
        return { linha: data as ProjetoFlagValorRow, anterior };
      }

      const { data, error } = await supabase
        .from('projeto_flag_valor')
        .insert({
          cliente_id: input.clienteId,
          pj_pessoa_id: alvoPj,
          documento_base_id: alvoBase,
          flag_id: input.flagId,
          valor: input.valor,
          setado_por_id: userId,
          created_by: userId,
          updated_by: userId,
        })
        .select('*')
        .single();
      if (error) throw error;
      return { linha: data as ProjetoFlagValorRow, anterior: null };
    },
    onSuccess: ({ linha, anterior }, input) => {
      queryClient.invalidateQueries({ queryKey: [CHAVE] });
      logAction({
        area: 'osg',
        entity_type: 'projeto_flag_valor',
        entity_id: linha.id,
        entity_name: input.flagNome,
        action: anterior === null ? 'created' : 'updated',
        changed_fields: { valor: { old: anterior, new: linha.valor } },
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar a condição', description: error.message, variant: 'destructive' });
    },
  });
}

// --- Respostas de uma alteração contratual, de uma vez --------------------

export interface RespostaDeEvento {
  flagId: string;
  /** `tmpl_flag.nome` — para a trilha de auditoria. */
  flagNome: string;
  valor: boolean;
}

export interface ResponderEventosInput {
  clienteId: string;
  pjPessoaId: string | null;
  /** Documento registrado que a alteração substitui. */
  documentoBaseId: string;
  /** TODAS as flags do assistente, inclusive as não marcadas. */
  respostas: RespostaDeEvento[];
}

/**
 * Grava de uma vez as respostas do assistente de alteração contratual.
 *
 * Grava TODAS as flags, inclusive as desmarcadas (`valor = false`), e não só as
 * ligadas. Duas razões: "não houve cessão de quotas" é uma resposta de verdade,
 * e a existência de pelo menos uma linha ancorada no documento base é o que
 * marca que há UMA ALTERAÇÃO EM CURSO ali. Se só as marcadas fossem gravadas,
 * desmarcar tudo apagaria a alteração da tela.
 *
 * Sem DELETE (a RLS de DELETE é só de admin) e sem upsert (índice parcial, ver
 * o cabeçalho): lê as linhas já ancoradas neste documento base, atualiza as que
 * mudaram e insere as que faltam.
 */
export function useResponderEventosDaAlteracao() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: ResponderEventosInput): Promise<ProjetoFlagValorRow[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const { data: existentes, error: erroBusca } = await supabase
        .from('projeto_flag_valor')
        .select('*')
        .eq('documento_base_id', input.documentoBaseId);
      if (erroBusca) throw erroBusca;
      const porFlagId = new Map(
        ((existentes ?? []) as ProjetoFlagValorRow[]).map((r) => [r.flag_id, r]),
      );

      const aInserir = input.respostas.filter((r) => !porFlagId.has(r.flagId));
      const aAtualizar = input.respostas.filter((r) => {
        const atual = porFlagId.get(r.flagId);
        return atual != null && atual.valor !== r.valor;
      });

      const gravadas: ProjetoFlagValorRow[] = [];

      if (aInserir.length > 0) {
        const { data, error } = await supabase
          .from('projeto_flag_valor')
          .insert(
            aInserir.map((r) => ({
              cliente_id: input.clienteId,
              pj_pessoa_id: input.pjPessoaId,
              documento_base_id: input.documentoBaseId,
              flag_id: r.flagId,
              valor: r.valor,
              setado_por_id: userId,
              created_by: userId,
              updated_by: userId,
            })),
          )
          .select('*');
        if (error) throw error;
        gravadas.push(...((data ?? []) as ProjetoFlagValorRow[]));
      }

      // Um update por linha: são seis flags no pior caso, e o PostgREST não faz
      // update em lote com valores distintos por linha sem virar upsert (que o
      // índice parcial impede).
      for (const r of aAtualizar) {
        const atual = porFlagId.get(r.flagId)!;
        const { data, error } = await supabase
          .from('projeto_flag_valor')
          .update({ valor: r.valor, setado_por_id: userId, updated_by: userId })
          .eq('id', atual.id)
          .select('*')
          .single();
        if (error) throw error;
        gravadas.push(data as ProjetoFlagValorRow);
      }

      return gravadas;
    },
    onSuccess: (gravadas, input) => {
      queryClient.invalidateQueries({ queryKey: [CHAVE] });
      const nomePorFlagId = new Map(input.respostas.map((r) => [r.flagId, r.flagNome]));
      for (const linha of gravadas) {
        logAction({
          area: 'osg',
          entity_type: 'projeto_flag_valor',
          entity_id: linha.id,
          entity_name: nomePorFlagId.get(linha.flag_id) ?? linha.flag_id,
          action: 'updated',
          changed_fields: { valor: { old: null, new: linha.valor } },
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar os eventos da alteração',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
