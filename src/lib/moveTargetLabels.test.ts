import { describe, expect, it } from 'vitest';
import type { OrgProject } from '@/hooks/useOrgProjects';
import type { OrgTask } from '@/hooks/useOrgTasks';
import { buildProjectHint, clientName, normalizeSearch } from '@/lib/moveTargetLabels';
import type { ProjetosTarefasOs } from '@/lib/projetosTarefasHierarchy';

const project = (overrides: Partial<OrgProject> = {}) => ({
  id: 'project-1',
  name: 'Projeto Alfa',
  status: 'active',
  ordem_servico_id: 'os-1',
  external_client: { nome: 'Cliente X' },
  ...overrides,
} as OrgProject);

const osRows: ProjetosTarefasOs[] = [
  { os_id: 'os-1', numero_os: '1234', cliente_id: 'c1', cliente_nome: 'Cliente X', servico_nome: null, data_fim: null },
  { os_id: 'os-2', numero_os: 'OS-99', cliente_id: 'c1', cliente_nome: 'Cliente X', servico_nome: null, data_fim: null },
];

const tasks = [
  { id: 't1', project_id: 'project-1' },
  { id: 't2', project_id: 'project-1' },
  { id: 't3', project_id: 'project-9' },
] as OrgTask[];

describe('clientName', () => {
  it('cai no rótulo padrão quando o projeto não tem cliente', () => {
    expect(clientName(project({ external_client: null }))).toBe('Cliente não informado');
    expect(clientName(null)).toBe('Cliente não informado');
  });
});

describe('normalizeSearch', () => {
  it('ignora acentos e caixa', () => {
    expect(normalizeSearch('Apuração ICMS')).toBe('apuracao icms');
  });
});

describe('buildProjectHint', () => {
  it('prefixa "OS" só quando o número ainda não vem prefixado', () => {
    const labels = buildProjectHint(tasks, osRows);

    expect(labels.osLabel(project())).toBe('OS 1234');
    expect(labels.osLabel(project({ ordem_servico_id: 'os-2' }))).toBe('OS-99');
  });

  it('marca projeto sem OS e OS não carregada', () => {
    const labels = buildProjectHint(tasks, osRows);

    expect(labels.osLabel(project({ ordem_servico_id: null }))).toBe('Sem OS');
    expect(labels.osLabel(project({ ordem_servico_id: 'os-fantasma' }))).toBe('OS vinculada');
  });

  it('junta OS, status e volume de tarefas do projeto', () => {
    expect(buildProjectHint(tasks, osRows).hint(project())).toBe('OS 1234 · Ativo · 2 tarefa(s)');
  });
});
