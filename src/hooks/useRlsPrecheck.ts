import { supabase } from '@/integrations/supabase/client';
import type { RlsPrecheckResult } from '@/lib/rlsMessages';
import { rlsMessage } from '@/lib/rlsMessages';

export type PrecheckTable = 'tools' | 'tool_area_access' | 'sprint_backlog_items' | 'sprint_deliverables' | 'catalog_clients' | 'cliente' | 'comentarios_avaliacao' | 'contatos' | 'contribuinte' | 'contribuinte_bal_config' | 'ticket_attachments' | 'correcoes_icms' | 'profiles' | 'deliverable_attachments' | 'difal_decisao' | 'difal_sessao' | 'distribuicao_dcomp' | 'distribuicao_receita' | 'export_profiles' | 'inscricao_contribuinte' | 'novidades' | 'ordem_servico' | 'org_project_members' | 'org_projects' | 'org_tasks' | 'per_situacao' | 'pis_cofins_regra' | 'procedimentos' | 'process_stages';
export type PrecheckOp = 'update' | 'delete';

/**
 * Pre-check via SECURITY INVOKER RPC `can_perform`.
 * The function executes the operation in a subtransaction and rolls back,
 * so it has no side effects but returns whether the current user would be
 * allowed by RLS — and which role would be required.
 */
export async function canPerform(
  table: PrecheckTable,
  op: PrecheckOp,
  id: string,
): Promise<RlsPrecheckResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('can_perform', {
    p_table: table,
    p_op: op,
    p_id: id,
  });


  if (error) {
    return {
      allowed: false,
      reason: 'grant_missing',
      required_role: null,
      message: error.message,
    };
  }

  return (data ?? { allowed: false }) as RlsPrecheckResult;
}

/**
 * Throws an Error with a user-friendly message if the user cannot perform
 * the operation. No-op when allowed.
 */
export async function assertCanPerform(
  table: PrecheckTable,
  op: PrecheckOp,
  id: string,
): Promise<void> {
  const result = await canPerform(table, op, id);
  if (!result.allowed) {
    throw new Error(rlsMessage(result));
  }
}
