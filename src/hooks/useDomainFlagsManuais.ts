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
// Escopo: `tmpl_flag.escopo` diz se o valor vale para o CLIENTE inteiro
// (pj_pessoa_id NULL) ou para uma EMPRESA dele (pj_pessoa_id = a PJ do
// contrato). O banco tem um índice único parcial para cada caso
// (uq_projeto_flag_valor_escopo_cliente e uq_projeto_flag_valor_escopo_pj), e é
// por isso que a escrita aqui é find-then-insert-or-update em vez de upsert: o
// PostgREST não sabe informar o predicado (`WHERE pj_pessoa_id IS NULL`) que o
// ON CONFLICT precisaria para escolher entre os dois índices parciais.

export type ProjetoFlagValorRow = Database['public']['Tables']['projeto_flag_valor']['Row'];

/** Escopo de um valor de flag, espelhando `tmpl_flag.escopo`. */
export type EscopoFlag = 'cliente' | 'pj';

const CHAVE = 'projeto-flag-valor';
const chaveValores = (clienteId: string | null, pjPessoaId: string | null) =>
  [CHAVE, clienteId ?? '∅', pjPessoaId ?? '∅'] as const;

interface FlagsManuaisArgs {
  clienteId: string | null;
  /** Empresa do contrato (o `pj_pessoa_id` da tabela); null em modelo sem empresa. */
  pjPessoaId: string | null;
}

/**
 * Valores manuais aplicáveis ao par cliente + empresa: as linhas de escopo
 * cliente (pj_pessoa_id NULL) e as da empresa escolhida, num só ida-e-volta.
 * Sem empresa, só as de escopo cliente, porque `IS NULL` e `= <id>` são filtros
 * distintos no Postgres e uma linha de outra PJ não vale para este documento.
 */
export function useFlagsManuaisProjeto({ clienteId, pjPessoaId }: FlagsManuaisArgs) {
  return useQuery({
    queryKey: chaveValores(clienteId, pjPessoaId),
    enabled: !!clienteId,
    queryFn: async (): Promise<ProjetoFlagValorRow[]> => {
      let q = supabase.from('projeto_flag_valor').select('*').eq('cliente_id', clienteId!);
      q = pjPessoaId
        ? q.or(`pj_pessoa_id.is.null,pj_pessoa_id.eq.${pjPessoaId}`)
        : q.is('pj_pessoa_id', null);
      const { data, error } = await q;
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
 * Liga ou desliga uma flag manual no escopo dela. Não há delete (a RLS de DELETE
 * é só de admin): desligar grava `valor = false`, que é o estado que o motor lê.
 */
export function useDefinirFlagManual() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: DefinirFlagManualInput): Promise<DefinirFlagManualResultado> => {
      // Escopo 'cliente' ignora a empresa de propósito: é o que o índice parcial
      // uq_projeto_flag_valor_escopo_cliente exige (pj_pessoa_id IS NULL).
      const alvoPj = input.escopo === 'pj' ? input.pjPessoaId : null;
      if (input.escopo === 'pj' && !alvoPj) {
        throw new Error('Escolha a empresa do contrato antes de marcar esta condição.');
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      let busca = supabase
        .from('projeto_flag_valor')
        .select('*')
        .eq('cliente_id', input.clienteId)
        .eq('flag_id', input.flagId);
      busca = alvoPj ? busca.eq('pj_pessoa_id', alvoPj) : busca.is('pj_pessoa_id', null);
      const { data: existente, error: erroBusca } = await busca.maybeSingle();
      if (erroBusca) throw erroBusca;

      if (existente) {
        const anterior = (existente as ProjetoFlagValorRow).valor;
        const { data, error } = await supabase
          .from('projeto_flag_valor')
          .update({ valor: input.valor, setado_por_id: userId, updated_by: userId })
          .eq('id', (existente as ProjetoFlagValorRow).id)
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
