import { currentAmbiente, type Ambiente } from '@/config/api';

// Escopo de ambiente das tabelas que NÃO têm a coluna `ambiente`.
//
// `cliente`, `contribuinte` e afins carregam a coluna e são filtradas na própria
// query (ver AGENTS.md). `org_projects`, `org_tasks` e `ordem_servico` não: o
// ambiente delas é o do cliente a que estão ligadas. Sem isso as listas de
// projetos e tarefas do preview mostravam o trabalho de produção (e vice-versa),
// já que o mesmo cliente existe nos dois ambientes com UUIDs diferentes.

/** Ambiente de cada cliente, indexado por id (ver ambientePorClienteQuery). */
export type AmbientePorCliente = Record<string, string>;

/**
 * Se o registro pertence ao ambiente informado, olhando o cliente dele.
 *
 * Registro sem cliente (projeto interno, tarefa sem cliente) não tem ambiente e
 * NUNCA é escondido. Cliente ausente do índice (soft-deleted, fora do RLS) também
 * passa: sumir com trabalho real por falta de dado é pior que mostrar de mais —
 * só sai quem tem cliente de OUTRO ambiente.
 */
export function isDoAmbiente(
  clienteId: string | null | undefined,
  ambientePorCliente: AmbientePorCliente,
  ambiente: Ambiente = currentAmbiente,
): boolean {
  if (!clienteId) return true;
  const ambienteDoCliente = ambientePorCliente[clienteId];
  if (!ambienteDoCliente) return true;
  return ambienteDoCliente === ambiente;
}

/** Projeto no escopo: o ambiente vem do cliente PSA vinculado. */
export function isProjetoDoAmbiente(
  projeto: { external_client_id: string | null },
  ambientePorCliente: AmbientePorCliente,
  ambiente: Ambiente = currentAmbiente,
): boolean {
  return isDoAmbiente(projeto.external_client_id, ambientePorCliente, ambiente);
}

/**
 * Tarefa no escopo: precisa estar de acordo pelos dois vínculos que carregam
 * cliente — o próprio (`client_id`) e o do projeto onde ela mora. Basta um deles
 * ser do outro ambiente para a tarefa sair, senão a tarefa ficaria órfã na
 * hierarquia quando o projeto dela é escondido.
 */
export function isTarefaDoAmbiente(
  tarefa: { client_id: string | null; project?: { external_client_id?: string | null } | null },
  ambientePorCliente: AmbientePorCliente,
  ambiente: Ambiente = currentAmbiente,
): boolean {
  return isDoAmbiente(tarefa.client_id, ambientePorCliente, ambiente)
    && isDoAmbiente(tarefa.project?.external_client_id ?? null, ambientePorCliente, ambiente);
}
