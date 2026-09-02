import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuditLog } from '@/hooks/useAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { erroDeOrgaoGovernanca, padroesFaltando } from '@/lib/orgaosGovernancaPadrao';

/**
 * Camada de dados do cadastro de órgãos de governança (GOV-01).
 *
 * O órgão é a instância de decisão de um cliente. É ele que define as COLUNAS da
 * Matriz de Alçadas e quem recebe competência no contrato social.
 *
 * A lista NÃO é fixa: três são padrão da OSG e o cliente acrescenta os dele, com
 * nome próprio. Por isso `nome` é texto livre no banco, e a semente dos três vive
 * em `src/lib/orgaosGovernancaPadrao.ts`, fora daqui.
 *
 * SEM FILTRO DE `ambiente` NESTA QUERY, e é de propósito. `orgao_governanca` não
 * tem a coluna: o ambiente dela é o do cliente a que pertence, como em
 * `org_tasks` e `org_projects` (ver `src/lib/ambienteScope.ts`). Como toda
 * leitura aqui é POR UM CLIENTE já escolhido na tela, e a tela só oferece cliente
 * do ambiente corrente, o recorte já aconteceu antes de chegar aqui. Uma lista
 * global de órgãos, se um dia existir, precisará juntar com `cliente` e filtrar.
 *
 * EXCLUSÃO É SOFT, por `excluido`. O DELETE físico existe na RLS para sublíder ou
 * acima, mas a tela não usa: apagar órgão que já é coluna de uma Matriz assinada
 * apagaria história.
 */

type OrgaoRow = Database['public']['Tables']['orgao_governanca']['Row'];

export type OrgaoGovernanca = OrgaoRow;

export interface OrgaoGovernancaInput {
  nome: string;
  entra_no_contrato: boolean;
  ordem?: number;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
}

export const orgaosGovernancaQueryKey = (clienteId?: string | null) =>
  ['orgao-governanca', clienteId ?? null] as const;

/** Os órgãos ativos de um cliente, na ordem em que viram coluna da Matriz. */
export function useOrgaosGovernanca(clienteId?: string | null) {
  return useQuery<OrgaoGovernanca[]>({
    queryKey: orgaosGovernancaQueryKey(clienteId),
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orgao_governanca')
        .select('*')
        .eq('cliente_id', clienteId as string)
        .eq('excluido', false)
        .order('ordem')
        .order('nome');

      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Criar, editar e excluir, com auditoria em toda operação.
 *
 * O `changed_fields` do update sai de um diff campo a campo contra a linha atual,
 * e não do formulário inteiro: sem isso a auditoria registraria como alteração
 * todo campo que a pessoa apenas viu.
 */
export function useOrgaoGovernancaMutations(clienteId?: string | null) {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const { user } = useAuth();

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: orgaosGovernancaQueryKey(clienteId) });

  const criar = useMutation({
    mutationFn: async (input: OrgaoGovernancaInput) => {
      if (!clienteId) throw new Error('Selecione um cliente antes de cadastrar o órgão.');

      const { data, error } = await supabase
        .from('orgao_governanca')
        .insert({
          cliente_id: clienteId,
          nome: input.nome.trim(),
          entra_no_contrato: input.entra_no_contrato,
          ordem: input.ordem ?? 0,
          vigencia_inicio: input.vigencia_inicio ?? null,
          vigencia_fim: input.vigencia_fim ?? null,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'orgao_governanca',
        entity_id: data.id,
        entity_name: data.nome,
        action: 'created',
      });

      return data;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Órgão cadastrado');
    },
    onError: (error: unknown) => toast.error(erroDeOrgaoGovernanca(error)),
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, ...input }: OrgaoGovernancaInput & { id: string }) => {
      const { data: atual, error: erroLeitura } = await supabase
        .from('orgao_governanca')
        .select('*')
        .eq('id', id)
        .single();
      if (erroLeitura) throw erroLeitura;

      const novo = {
        nome: input.nome.trim(),
        entra_no_contrato: input.entra_no_contrato,
        ordem: input.ordem ?? atual.ordem,
        vigencia_inicio: input.vigencia_inicio ?? null,
        vigencia_fim: input.vigencia_fim ?? null,
      };

      const mudou: Record<string, { old: unknown; new: unknown }> = {};
      for (const [campo, valor] of Object.entries(novo)) {
        const anterior = (atual as Record<string, unknown>)[campo];
        if (JSON.stringify(anterior ?? null) !== JSON.stringify(valor ?? null)) {
          mudou[campo] = { old: anterior ?? null, new: valor ?? null };
        }
      }

      // Nada mudou: não grava nem audita, para o histórico não encher de linha
      // vazia de quem só abriu e fechou o modal.
      if (Object.keys(mudou).length === 0) return atual;

      const { data, error } = await supabase
        .from('orgao_governanca')
        .update({ ...novo, updated_by: user?.id ?? null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'orgao_governanca',
        entity_id: data.id,
        entity_name: data.nome,
        action: 'updated',
        changed_fields: mudou,
      });

      return data;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Órgão atualizado');
    },
    onError: (error: unknown) => toast.error(erroDeOrgaoGovernanca(error)),
  });

  const excluir = useMutation({
    mutationFn: async (orgao: Pick<OrgaoGovernanca, 'id' | 'nome'>) => {
      const { error } = await supabase
        .from('orgao_governanca')
        .update({ excluido: true, updated_by: user?.id ?? null })
        .eq('id', orgao.id);
      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'orgao_governanca',
        entity_id: orgao.id,
        entity_name: orgao.nome,
        action: 'deleted',
      });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Órgão excluído');
    },
    onError: (error: unknown) => toast.error(erroDeOrgaoGovernanca(error)),
  });

  /**
   * O botão "usar os padrões da OSG".
   *
   * Acrescenta só o que falta, então continua útil depois da primeira vez e
   * clicar duas vezes não duplica. Passa pelo MESMO `criar` de qualquer órgão, e
   * por isso a auditoria registra cada um sem tratamento especial.
   */
  const semear = useMutation({
    mutationFn: async (jaCadastrados: readonly string[]) => {
      const faltam = padroesFaltando(jaCadastrados);
      for (const [indice, padrao] of faltam.entries()) {
        await criar.mutateAsync({
          nome: padrao.nome,
          entra_no_contrato: padrao.entraNoContrato,
          ordem: jaCadastrados.length + indice,
        });
      }
      return faltam.length;
    },
    onSuccess: (quantos) => {
      invalidar();
      if (quantos === 0) toast.info('Os três órgãos padrão já estão cadastrados');
      else toast.success(`${quantos} órgão(s) padrão adicionado(s)`);
    },
    onError: (error: unknown) => toast.error(erroDeOrgaoGovernanca(error)),
  });

  return { criar, atualizar, excluir, semear };
}
