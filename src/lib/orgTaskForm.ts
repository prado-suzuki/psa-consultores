import { format } from 'date-fns';
import { z } from 'zod';

import type { CreateOrgTaskInput, OrgTaskStatus } from '@/hooks/useOrgTasks';
import { temHorasApontadas } from '@/lib/orgTaskHours';
import type { StatusColorConfig } from '@/lib/taskStatusColors';

/**
 * Regras puras do formulário de tarefa (TaskModal): schema, montagem do payload
 * e resolução de nomes usados nos comentários de sistema da revisão.
 *
 * Extraído do TaskModal preservando o comportamento — inclusive peculiaridades
 * registradas em docs/geral/achados-taskmodal.md.
 */

export const taskSchema = z
  .object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().min(1, 'Descrição é obrigatória'),
    status: z.enum([
      'backlog',
      'waiting_client',
      'todo',
      'in_progress',
      'review',
      'em_ajuste',
      'done',
    ]),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    assigned_to: z.string().min(1, 'Responsável é obrigatório'),
    assigned_to_name: z.string().optional(),
    reviewer_id: z.string().optional().nullable(),
    review_comment: z.string().optional(),
    start_date: z.date({ required_error: 'Data de Início é obrigatória' }),
    due_date: z.date({ required_error: 'Data de Vencimento é obrigatória' }),
    parent_task_id: z.string().optional(),
    project_id: z.string().min(1, 'Projeto é obrigatório'),
    client_id: z.string().min(1, 'Cliente é obrigatório'),
    contribuinte_id: z.string().optional(),
    estimated_hours: z.coerce.number().positive('Deve ser maior que 0'),
    actual_hours: z
      .union([z.coerce.number(), z.literal('')])
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    // Único bloqueio das horas: concluir sem apontamento. Horas muito acima da
    // estimativa geram apenas o aviso do `AvisoHorasDigitadas` ao lado do campo
    // — quem estourou de verdade salva sem ter que confirmar nada.
    if (data.status === 'done' && !temHorasApontadas(data.actual_hours)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actual_hours'],
        message: 'Informe as horas realizadas',
      });
    }
  });

export type TaskFormValues = z.infer<typeof taskSchema>;

/** Desfecho de uma ação de revisão disparada pelos botões do modal. */
export type ReviewOutcome = 'approved' | 'adjustments' | 'send';
/** Ações que abrem o diálogo de revisão (aprovar não abre diálogo). */
export type ReviewAction = 'send' | 'adjustments';

/**
 * Status resultante do salvamento.
 *
 * Sem `outcome`, vale o status escolhido no formulário. Com `outcome`, só
 * 'send' tem destino próprio ('review'): 'adjustments' **e 'approved'** caem em
 * 'em_ajuste' — ver achado nº 1 em docs/geral/achados-taskmodal.md.
 */
export function resolveNextStatus(
  outcome: ReviewOutcome | undefined,
  formStatus: OrgTaskStatus,
): OrgTaskStatus {
  return outcome === 'send' ? 'review' : outcome ? 'em_ajuste' : formStatus;
}

/** Payload enviado a `useCreateOrgTask`/`useUpdateOrgTask`. */
export function buildOrgTaskInput(
  values: TaskFormValues,
  nextStatus: OrgTaskStatus,
): CreateOrgTaskInput {
  return {
    title: values.title,
    description: values.description,
    status: nextStatus,
    priority: values.priority,
    assigned_to: values.assigned_to,
    assigned_to_name: values.assigned_to_name,
    reviewer_id: values.reviewer_id || null,
    due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : undefined,
    start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd') : undefined,
    parent_task_id: values.parent_task_id,
    project_id: values.project_id || undefined,
    client_id: values.client_id || undefined,
    contribuinte_id: values.contribuinte_id || undefined,
    estimated_hours: values.estimated_hours,
    // Preserva actual_hours independente do status: horas realizadas são
    // histórico e não devem ser apagadas ao mover uma tarefa done para
    // outro status. Sem isso, o diff em useUpdateOrgTask incluía
    // actual_hours (8 → null) e o trigger org_tasks_team_member_status_only
    // (RLS-06) bloqueava team_member ao mudar apenas o status.
    actual_hours:
      values.actual_hours === '' || values.actual_hours == null
        ? null
        : Number(values.actual_hours),
  };
}

export interface TaskProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export interface TaskTeamMember {
  id: string;
  name: string;
}

/** Nome do revisor citado no comentário de sistema; 'revisor' como último recurso. */
export function resolveReviewerName(
  reviewerId: string | null | undefined,
  reviewerCandidates: readonly TaskTeamMember[],
  profiles: readonly TaskProfile[],
): string {
  return (
    reviewerCandidates.find((candidate) => candidate.id === reviewerId)?.name ||
    profiles
      .filter((profile) => profile.id === reviewerId)
      .map((profile) =>
        [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim(),
      )[0] ||
    'revisor'
  );
}

export interface CommentAuthorUser {
  id?: string | null;
  email?: string | null;
  user_metadata?: { first_name?: string | null; last_name?: string | null } | null;
}

/** Autor exibido no comentário de sistema: perfil > metadata do auth > e-mail. */
export function resolveCommentAuthorName(
  user: CommentAuthorUser | null | undefined,
  profiles: readonly TaskProfile[],
): string {
  const currentUserProfile = profiles.find((profile) => profile.id === user?.id);
  if (currentUserProfile) {
    return [currentUserProfile.first_name, currentUserProfile.last_name].filter(Boolean).join(' ');
  }
  if (user?.user_metadata?.first_name) {
    return `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim();
  }
  return user?.email || 'Usuário';
}

/** Texto do comentário de sistema gravado junto com a transição de revisão. */
export function buildReviewSystemComment(params: {
  outcome: ReviewOutcome | undefined;
  isDelegation: boolean;
  reviewerName: string;
  serializedComment: string;
}): string {
  const { outcome, isDelegation, reviewerName, serializedComment } = params;
  if (outcome === 'approved') return 'Tarefa aprovada';
  return isDelegation
    ? `Enviado para revisão de ${reviewerName}: ${serializedComment}`
    : `Devolvido para ajustes: ${serializedComment}`;
}

/**
 * Opções do dropdown "Responsável".
 *
 * Restringe aos membros do projeto (executor + líderes + membros). Resolve o
 * nome via `teamMembers` e, para membros fora do cluster Tax (multidisciplinar),
 * recorre a `profiles`. Sem projeto selecionado (ou projeto legado sem membros
 * gravados) cai de volta para a lista completa.
 */
export function filterTeamMembersByProject(params: {
  teamMembers: readonly TaskTeamMember[];
  projectMemberIds: readonly string[];
  projectId: string | undefined;
  profiles: readonly TaskProfile[];
}): TaskTeamMember[] {
  const { teamMembers, projectMemberIds, projectId, profiles } = params;
  if (!projectId || !projectMemberIds.length) return [...teamMembers];

  const teamMap = new Map(teamMembers.map((m) => [m.id, m]));
  const profileMap = new Map(profiles.map((p) => [p.id, `${p.first_name} ${p.last_name}`.trim()]));
  return projectMemberIds
    .map((id) => {
      const existing = teamMap.get(id);
      if (existing) return existing;
      const name = profileMap.get(id);
      return name ? { id, name } : null;
    })
    .filter((m): m is TaskTeamMember => m !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * Status oferecidos no select.
 *
 * 'review' e 'em_ajuste' não são escolhidos à mão — só aparecem quando já são o
 * status atual da tarefa. O revisor delegado ainda perde 'done': concluir é do
 * responsável, não de quem revisa.
 */
export function filterStatusOptions(
  options: readonly StatusColorConfig[],
  params: { isReviewer: boolean; taskStatus?: OrgTaskStatus | null },
): StatusColorConfig[] {
  return options.filter((status) => {
    if (params.isReviewer && status.key === 'done') return false;
    if (status.key === 'review' || status.key === 'em_ajuste') {
      return status.key === params.taskStatus;
    }
    return true;
  });
}

export interface TaskClientOption {
  id: string;
  nome: string;
}

export interface TaskContribuinteOption {
  id: string;
  nome_razao_social: string;
  cpf_cnpj?: string | null;
}

/**
 * Listas que alimentam os selects do formulário, já filtradas pela fachada
 * (`TaskModal`) — cliente/projeto/contribuinte pelo contexto escolhido,
 * responsável pelos membros do projeto, status pelo papel do usuário.
 *
 * Andam juntas porque os dois layouts (criação empilhada e edição em faixa)
 * precisam do conjunto inteiro.
 */
export interface TaskFieldOptions {
  clients: TaskClientOption[];
  projects: { id: string; name: string }[];
  contribuintes: TaskContribuinteOption[];
  parentTasks: { id: string; title: string }[];
  teamMembers: TaskTeamMember[];
  statusOptions: StatusColorConfig[];
}

/**
 * Opções do dropdown "Cliente": a lista consultada mais o cliente já vinculado
 * à tarefa, para cobrir cliente inativo/excluído/de outro ambiente.
 */
export function mergeTaskClientOptions(
  externalClients: readonly TaskClientOption[],
  taskClient: TaskClientOption | null | undefined,
): TaskClientOption[] {
  const list = externalClients.map((c) => ({ id: c.id, nome: c.nome }));
  if (taskClient && !list.some((c) => c.id === taskClient.id)) {
    list.push({ id: taskClient.id, nome: taskClient.nome });
  }
  return list;
}
