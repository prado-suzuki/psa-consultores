import { describe, expect, it } from 'vitest';

import { statusList } from '@/lib/taskStatusColors';
import {
  buildOrgTaskInput,
  buildReviewSystemComment,
  filterStatusOptions,
  filterTeamMembersByProject,
  mergeTaskClientOptions,
  resolveCommentAuthorName,
  resolveNextStatus,
  resolveReviewerName,
  taskSchema,
  type TaskFormValues,
} from '@/lib/orgTaskForm';

const baseValues: TaskFormValues = {
  title: 'Apurar ICMS',
  description: 'Conferir as notas do mês',
  status: 'in_progress',
  priority: 'high',
  assigned_to: 'U1',
  assigned_to_name: 'Bernardo',
  reviewer_id: null,
  review_comment: '',
  start_date: new Date(2026, 3, 1),
  due_date: new Date(2026, 3, 10),
  parent_task_id: undefined,
  project_id: 'PRJ1',
  client_id: 'CLI1',
  contribuinte_id: 'CTB1',
  estimated_hours: 5,
  actual_hours: null,
};

describe('taskSchema', () => {
  const validInput = {
    ...baseValues,
    estimated_hours: 5,
  };

  it('aceita um formulário completo', () => {
    expect(taskSchema.safeParse(validInput).success).toBe(true);
  });

  it('exige horas realizadas positivas quando o status é done', () => {
    const result = taskSchema.safeParse({ ...validInput, status: 'done', actual_hours: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['actual_hours'],
      message: 'Informe as horas realizadas',
    });

    expect(taskSchema.safeParse({ ...validInput, status: 'done', actual_hours: 3 }).success).toBe(
      true,
    );
  });

  it('exige confirmação quando as horas realizadas passam do triplo da estimativa', () => {
    const suspeito = { ...validInput, status: 'done' as const, actual_hours: 60 };
    const result = taskSchema.safeParse(suspeito);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['actual_hours'],
      message: 'Confirme o aviso',
    });

    expect(taskSchema.safeParse({ ...suspeito, hours_ack: true }).success).toBe(true);
    expect(taskSchema.safeParse({ ...suspeito, actual_hours: 8 }).success).toBe(true);
  });

  it('coage actual_hours vazio para 0 (achado nº 2)', () => {
    // QUIRK: z.coerce.number() vence o z.literal('') dentro do union, então ''
    // não sobrevive à validação — é o que faz o payload gravar 0 em vez de null.
    const parsed = taskSchema.parse({ ...validInput, actual_hours: '' });
    expect(parsed.actual_hours).toBe(0);
  });
});

describe('resolveNextStatus', () => {
  it('sem outcome mantém o status do formulário', () => {
    expect(resolveNextStatus(undefined, 'todo')).toBe('todo');
    expect(resolveNextStatus(undefined, 'done')).toBe('done');
  });

  it('send vai para review', () => {
    expect(resolveNextStatus('send', 'in_progress')).toBe('review');
  });

  it('adjustments e approved vão para em_ajuste (achado nº 1)', () => {
    expect(resolveNextStatus('adjustments', 'review')).toBe('em_ajuste');
    // QUIRK preservado: aprovar não conclui nem mantém em revisão.
    expect(resolveNextStatus('approved', 'review')).toBe('em_ajuste');
  });
});

describe('buildOrgTaskInput', () => {
  it('formata datas em yyyy-MM-dd e normaliza campos vazios', () => {
    expect(buildOrgTaskInput(baseValues, 'review')).toEqual({
      title: 'Apurar ICMS',
      description: 'Conferir as notas do mês',
      status: 'review',
      priority: 'high',
      assigned_to: 'U1',
      assigned_to_name: 'Bernardo',
      reviewer_id: null,
      due_date: '2026-04-10',
      start_date: '2026-04-01',
      parent_task_id: undefined,
      project_id: 'PRJ1',
      client_id: 'CLI1',
      contribuinte_id: 'CTB1',
      estimated_hours: 5,
      actual_hours: null,
    });
  });

  it('converte strings vazias de vínculo em undefined e mantém o revisor', () => {
    const input = buildOrgTaskInput(
      { ...baseValues, project_id: '', client_id: '', contribuinte_id: '', reviewer_id: 'REV1' },
      'todo',
    );
    expect(input).toMatchObject({
      project_id: undefined,
      client_id: undefined,
      contribuinte_id: undefined,
      reviewer_id: 'REV1',
    });
  });

  it('envia actual_hours como número quando preenchido', () => {
    expect(buildOrgTaskInput({ ...baseValues, actual_hours: 7 }, 'done').actual_hours).toBe(7);
    expect(buildOrgTaskInput({ ...baseValues, actual_hours: '' }, 'done').actual_hours).toBeNull();
    expect(
      buildOrgTaskInput({ ...baseValues, actual_hours: undefined }, 'done').actual_hours,
    ).toBeNull();
  });
});

describe('resolveReviewerName', () => {
  const candidates = [{ id: 'REV1', name: 'Rita Rev' }];
  const profiles = [
    { id: 'REV2', first_name: 'Zeca', last_name: 'M' },
    { id: 'REV3', first_name: 'Só', last_name: null },
  ];

  it('prefere o candidato a revisor', () => {
    expect(resolveReviewerName('REV1', candidates, profiles)).toBe('Rita Rev');
  });

  it('cai para o perfil quando o revisor não está entre os candidatos', () => {
    expect(resolveReviewerName('REV2', candidates, profiles)).toBe('Zeca M');
    expect(resolveReviewerName('REV3', candidates, profiles)).toBe('Só');
  });

  it('usa "revisor" quando não encontra ninguém', () => {
    expect(resolveReviewerName(null, candidates, profiles)).toBe('revisor');
    expect(resolveReviewerName('DESCONHECIDO', candidates, profiles)).toBe('revisor');
  });
});

describe('resolveCommentAuthorName', () => {
  const profiles = [{ id: 'U1', first_name: 'Bernardo', last_name: 'K' }];

  it('usa o perfil quando existe', () => {
    expect(resolveCommentAuthorName({ id: 'U1', email: 'b@psa.com' }, profiles)).toBe('Bernardo K');
  });

  it('cai para o metadata do auth', () => {
    expect(
      resolveCommentAuthorName(
        { id: 'U9', email: 'z@psa.com', user_metadata: { first_name: 'Zeca', last_name: 'M' } },
        profiles,
      ),
    ).toBe('Zeca M');
    expect(
      resolveCommentAuthorName(
        { id: 'U9', email: 'z@psa.com', user_metadata: { first_name: 'Zeca' } },
        profiles,
      ),
    ).toBe('Zeca');
  });

  it('cai para o e-mail e, por fim, para "Usuário"', () => {
    expect(resolveCommentAuthorName({ id: 'U9', email: 'z@psa.com' }, profiles)).toBe('z@psa.com');
    expect(resolveCommentAuthorName(null, profiles)).toBe('Usuário');
  });
});

describe('buildReviewSystemComment', () => {
  it('aprovação tem texto fixo', () => {
    expect(
      buildReviewSystemComment({
        outcome: 'approved',
        isDelegation: true,
        reviewerName: 'Rita Rev',
        serializedComment: 'ignorado',
      }),
    ).toBe('Tarefa aprovada');
  });

  it('delegação cita o revisor', () => {
    expect(
      buildReviewSystemComment({
        outcome: 'send',
        isDelegation: true,
        reviewerName: 'Rita Rev',
        serializedComment: '[[review-rich-text:v1]]Ver anexos',
      }),
    ).toBe('Enviado para revisão de Rita Rev: [[review-rich-text:v1]]Ver anexos');
  });

  it('devolução usa o prefixo de ajustes', () => {
    expect(
      buildReviewSystemComment({
        outcome: 'adjustments',
        isDelegation: false,
        reviewerName: 'revisor',
        serializedComment: '[[review-rich-text:v1]]Faltou o CFOP',
      }),
    ).toBe('Devolvido para ajustes: [[review-rich-text:v1]]Faltou o CFOP');
  });
});

describe('filterTeamMembersByProject', () => {
  const teamMembers = [
    { id: 'U1', name: 'Bernardo' },
    { id: 'U2', name: 'Ana' },
  ];
  const profiles = [
    { id: 'U1', first_name: 'Bernardo', last_name: 'K' },
    { id: 'U9', first_name: 'Zeca', last_name: 'M' },
  ];

  it('sem projeto retorna a lista completa, na ordem original', () => {
    expect(
      filterTeamMembersByProject({
        teamMembers,
        projectMemberIds: ['U1'],
        projectId: undefined,
        profiles,
      }),
    ).toEqual(teamMembers);
  });

  it('projeto sem membros gravados também cai na lista completa', () => {
    expect(
      filterTeamMembersByProject({
        teamMembers,
        projectMemberIds: [],
        projectId: 'PRJ1',
        profiles,
      }),
    ).toEqual(teamMembers);
  });

  it('resolve nomes fora do cluster via perfis e ordena em pt-BR', () => {
    expect(
      filterTeamMembersByProject({
        teamMembers,
        projectMemberIds: ['U9', 'U2', 'U1'],
        projectId: 'PRJ1',
        profiles,
      }),
    ).toEqual([
      { id: 'U2', name: 'Ana' },
      { id: 'U1', name: 'Bernardo' },
      { id: 'U9', name: 'Zeca M' },
    ]);
  });

  it('descarta membros sem nome conhecido', () => {
    expect(
      filterTeamMembersByProject({
        teamMembers,
        projectMemberIds: ['U1', 'FANTASMA'],
        projectId: 'PRJ1',
        profiles,
      }),
    ).toEqual([{ id: 'U1', name: 'Bernardo' }]);
  });
});

describe('filterStatusOptions', () => {
  const labels = (isReviewer: boolean, taskStatus?: string | null) =>
    filterStatusOptions(statusList, {
      isReviewer,
      taskStatus: taskStatus as never,
    }).map((s) => s.key);

  it('esconde review e em_ajuste quando não são o status atual', () => {
    expect(labels(false, 'in_progress')).toEqual([
      'backlog',
      'waiting_client',
      'todo',
      'in_progress',
      'done',
    ]);
  });

  it('mostra o status de revisão quando é o atual da tarefa', () => {
    expect(labels(false, 'review')).toContain('review');
    expect(labels(false, 'review')).not.toContain('em_ajuste');
    expect(labels(false, 'em_ajuste')).toContain('em_ajuste');
  });

  it('remove done para o revisor delegado', () => {
    expect(labels(true, 'review')).toEqual([
      'backlog',
      'waiting_client',
      'todo',
      'in_progress',
      'review',
    ]);
  });

  it('tarefa nova (sem status) não oferece review nem em_ajuste', () => {
    expect(labels(false, null)).toEqual([
      'backlog',
      'waiting_client',
      'todo',
      'in_progress',
      'done',
    ]);
  });
});

describe('mergeTaskClientOptions', () => {
  const clients = [{ id: 'CLI1', nome: 'Cliente Um' }];

  it('mantém a lista quando o cliente da tarefa já está nela', () => {
    expect(mergeTaskClientOptions(clients, { id: 'CLI1', nome: 'Cliente Um' })).toEqual(clients);
  });

  it('acrescenta o cliente da tarefa ausente da lista (inativo/outro ambiente)', () => {
    expect(mergeTaskClientOptions(clients, { id: 'CLI9', nome: 'Cliente Antigo' })).toEqual([
      { id: 'CLI1', nome: 'Cliente Um' },
      { id: 'CLI9', nome: 'Cliente Antigo' },
    ]);
  });

  it('sem cliente na tarefa devolve apenas a lista consultada', () => {
    expect(mergeTaskClientOptions(clients, null)).toEqual(clients);
  });
});
