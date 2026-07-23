import { describe, expect, it } from 'vitest';
import type { OrgProject } from '@/hooks/useOrgProjects';
import type { OrgTask } from '@/hooks/useOrgTasks';
import type { OsRow } from '@/lib/dashboardClientesOs/types';
import { buildProjetosTarefasHierarchy, extractProductAcronyms } from '@/lib/projetosTarefasHierarchy';

const project = (id: string, osId: string | null = 'os-1'): OrgProject => ({
  id,
  name: id,
  description: null,
  status: 'active',
  start_date: null,
  end_date: null,
  created_at: '2026-01-01',
  responsible_id: null,
  leader_id: null,
  external_client_id: null,
  contribuinte_id: null,
  estrutura_area_id: null,
  equipe_id: null,
  is_multidisciplinar: false,
  objective: null,
  ordem_servico_id: osId,
});

const task = (id: string, overrides: Partial<OrgTask> = {}): OrgTask => ({
  id,
  title: id,
  description: null,
  status: 'todo',
  priority: 'medium',
  assigned_to: null,
  assigned_to_name: null,
  reviewer_id: null,
  created_by: null,
  due_date: null,
  due_time: null,
  is_recurring: false,
  recurrence_type: null,
  category: 'task',
  tags: [],
  estimated_hours: null,
  actual_hours: null,
  parent_task_id: null,
  start_date: null,
  project_id: 'project-1',
  client_id: null,
  contribuinte_id: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  ...overrides,
});

const os = {
  os_id: 'os-1',
  numero_os: 'OS-12',
  cliente_nome: 'Cliente Alfa',
  servico_nome: 'Consultoria',
  data_fim: '2026-12-20',
} as OsRow;

describe('buildProjetosTarefasHierarchy', () => {
  it('extrai apenas as siglas dos produtos contratados', () => {
    expect(extractProductAcronyms('PTR — Planejamento Tributário, CT - Consultoria Tributária')).toEqual(['PTR', 'CT']);
    expect(extractProductAcronyms(null)).toEqual([]);
  });

  it('monta OS, projeto, tarefa e subtarefas recursivas sem perder órfãs', () => {
    const result = buildProjetosTarefasHierarchy(
      [project('project-1'), project('project-sem-os', null)],
      [
        task('pai'),
        task('filha', { parent_task_id: 'pai', status: 'done' }),
        task('neta', { parent_task_id: 'filha' }),
        task('sem-projeto', { project_id: null }),
      ],
      [os],
    );

    expect(result[0].os?.numero_os).toBe('OS-12');
    expect(result[0].os?.data_fim).toBe('2026-12-20');
    expect(result[0].projects[0].tasks[0].children[0].children[0].task.id).toBe('neta');
    expect(result[0]).toMatchObject({ taskCount: 3, completedTaskCount: 1 });
    expect(result[1].projects.map(node => node.project?.id ?? null)).toEqual(['project-sem-os', null]);
  });

  it('busca sem acentos e preserva os ancestrais de uma subtarefa encontrada', () => {
    const result = buildProjetosTarefasHierarchy(
      [project('project-1')],
      [task('pai', { title: 'Planejamento' }), task('filha', { title: 'Apuração fiscal', parent_task_id: 'pai' })],
      [os],
      'apuracao',
    );

    expect(result).toHaveLength(1);
    expect(result[0].projects[0].tasks[0].task.id).toBe('pai');
    expect(result[0].projects[0].tasks[0].children[0].task.id).toBe('filha');
  });

  it('mantém todos os descendentes quando a OS ou o projeto corresponde à busca', () => {
    const projects = [project('project-1')];
    projects[0].name = 'Revisão tributária';
    const tasks = [task('task-1')];

    expect(buildProjetosTarefasHierarchy(projects, tasks, [os], 'cliente alfa')[0].taskCount).toBe(1);
    expect(buildProjetosTarefasHierarchy(projects, tasks, [os], 'tributaria')[0].projects[0].tasks).toHaveLength(1);
  });

  it('ordena por cliente e separa tarefas sem OS em grupos por cliente', () => {
    const firstProject = project('project-1', null);
    firstProject.external_client_id = 'client-b';
    firstProject.external_client = { id: 'client-b', nome: 'Cliente Beta' };
    const result = buildProjetosTarefasHierarchy(
      [firstProject],
      [
        task('orphan-a', { project_id: null, client_id: 'client-a', client: { id: 'client-a', nome: 'Cliente Alfa' } }),
        task('orphan-b', { project_id: null, client_id: 'client-b', client: { id: 'client-b', nome: 'Cliente Beta' } }),
      ],
      [],
    );

    expect(result.map(group => group.clientName)).toEqual(['Cliente Alfa', 'Cliente Beta']);
    expect(result[0].projects[0].tasks[0].task.id).toBe('orphan-a');
    expect(result[1].projects.flatMap(node => node.tasks).map(node => node.task.id)).toContain('orphan-b');
  });

  it('consolida Sem OS quando cadastros distintos têm o mesmo nome de cliente', () => {
    const first = project('project-a', null);
    first.external_client_id = 'duplicate-a';
    first.external_client = { id: 'duplicate-a', nome: 'Agro Amazônia' };
    const second = project('project-b', null);
    second.external_client_id = 'duplicate-b';
    second.external_client = { id: 'duplicate-b', nome: 'AGRO AMAZONIA' };

    const result = buildProjetosTarefasHierarchy([first, second], [], []);

    expect(result).toHaveLength(1);
    expect(result[0].projects.map(node => node.project?.id)).toEqual(['project-a', 'project-b']);
  });
});
