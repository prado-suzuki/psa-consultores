import { describe, expect, it } from 'vitest';
import { SEM_CLUSTER } from '@/lib/clusterFilter';
import {
  buildProcessUpdatePayload,
  filterEquipeProcesses,
  getAvailableProcessProjects,
  inferProcessArea,
  mapProcessesWithProjects,
  prepareProcessImportPayloads,
  type EquipeProcesso,
} from '@/lib/equipeProcessos';

describe('importação de processos', () => {
  it.each(['Processo', 'processo', 'Process', 'name', 'Nome', 'nome'])(
    'aceita o alias de nome %s',
    (alias) => {
      expect(
        prepareProcessImportPayloads([{ [alias]: '  Processo importado  ' }], 'user-1')[0],
      ).toMatchObject({ name: 'Processo importado', stage: 'discovery', created_by: 'user-1' });
    },
  );

  it('respeita precedência truthy dos aliases, defaults e filtra nomes vazios', () => {
    const result = prepareProcessImportPayloads(
      [
        { Processo: '', processo: 0, Process: false, Nome: 'Primeiro', nome: 'Depois' },
        { Processo: '   ' },
        { Processo: null },
      ],
      undefined,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: 'Primeiro',
      code: null,
      description: null,
      area: 'Geral',
      stage: 'discovery',
      priority: 'medium',
      frequency: null,
      volume_month: null,
      financial_impact: null,
      created_by: undefined,
    });
  });

  it.each([
    ['Descoberta', 'discovery'],
    [' MAPEAMENTO ', 'mapping'],
    ['Análise', 'analysis'],
    ['analise', 'analysis'],
    ['Melhoria', 'improvement'],
    ['AUTOMAÇÃO', 'automation'],
    ['concluido', 'completed'],
    ['completed', 'completed'],
    ['etapa desconhecida', 'discovery'],
  ])('normaliza a fase %s para %s', (stage, expected) => {
    expect(prepareProcessImportPayloads([{ Processo: 'P', Fase: stage }], 'u')[0].stage).toBe(
      expected,
    );
  });

  it('aplica aliases de campos, área explícita sobre inferida e parseInt decimal', () => {
    expect(
      prepareProcessImportPayloads(
        [
          {
            Nome: 'Processo',
            Código: '  COD-1 ',
            Descrição: 'Descrição',
            Cliente: 'Equipe Ricardo',
            Área: 'Área explícita',
            Prioridade: 'high',
            Frequência: 'mensal',
            Volume: '12.9 itens',
            Impacto: 'alto',
          },
        ],
        'user-1',
      )[0],
    ).toEqual({
      name: 'Processo',
      code: 'COD-1',
      description: 'Descrição',
      area: 'Área explícita',
      stage: 'discovery',
      priority: 'high',
      frequency: 'mensal',
      volume_month: 12,
      financial_impact: 'alto',
      created_by: 'user-1',
    });
  });

  it('preserva a precedência de volume_month e o resultado NaN atual do parseInt', () => {
    const payload = prepareProcessImportPayloads(
      [
        { Processo: 'A', volume_month: '7.8', Volume: '99' },
        { Processo: 'B', volume_month: 'inválido' },
        { Processo: 'C', volume_month: 0, Volume: '4' },
      ],
      'u',
    );

    expect(payload[0].volume_month).toBe(7);
    expect(payload[1].volume_month).toBeNaN();
    expect(payload[2].volume_month).toBe(4);
  });
});

describe('regras puras de processos', () => {
  it.each([
    [undefined, 'Geral'],
    ['núcleo RICARDO', 'Fiscal'],
    ['consultoria Felipe', 'Consultoria'],
    ['custos Washington', 'Fixos'],
    ['Operações', 'Transversal'],
  ])('infere área de %s', (source, expected) => {
    expect(inferProcessArea(source)).toBe(expected);
  });

  it('mapeia relações válidas, descarta projeto nulo e não altera os demais campos', () => {
    const rows = [
      {
        id: 'process-1',
        name: 'Processo',
        description: null,
        area: null,
        stage: 'mapping',
        priority: null,
        frequency: null,
        volume_month: null,
        financial_impact: null,
        client_id: null,
        created_at: '2026-01-01',
        project_processes: [
          {
            id: 'link-1',
            impact_type: 'principal',
            project: { id: 'project-1', name: 'Projeto 1' },
          },
          { id: 'link-2', impact_type: 'apoio', project: null },
        ],
      },
    ];

    expect(mapProcessesWithProjects(rows)).toEqual([
      expect.objectContaining({
        id: 'process-1',
        stage: 'mapping',
        linked_projects: [{ id: 'project-1', name: 'Projeto 1', impact_type: 'principal' }],
      }),
    ]);
    expect(
      mapProcessesWithProjects([{ ...rows[0], project_processes: null }])[0].linked_projects,
    ).toEqual([]);
  });

  it('filtra conjuntamente busca, fase e cluster', () => {
    const process = (overrides: Partial<EquipeProcesso>): EquipeProcesso => ({
      id: 'p',
      name: 'Fechamento Fiscal',
      description: 'Apuração mensal',
      area: 'Fiscal',
      stage: 'analysis',
      priority: null,
      frequency: null,
      volume_month: null,
      financial_impact: null,
      client_id: null,
      cluster_id: 'cluster-1',
      created_at: '2026-01-01',
      ...overrides,
    });
    const rows = [
      process({ id: 'name' }),
      process({ id: 'description', name: 'Outro', description: 'FECHAMENTO auxiliar' }),
      process({
        id: 'client',
        catalog_client: {
          id: 'c',
          name: 'Cliente A',
          responsible: null,
          color: '#fff',
          is_active: true,
        },
      }),
      process({ id: 'no-cluster', cluster_id: null }),
    ];

    expect(
      filterEquipeProcesses(rows, {
        searchTerm: 'fechamento',
        stage: 'analysis',
        cluster: 'cluster-1',
      }).map(({ id }) => id),
    ).toEqual(['name', 'description', 'client']);
    expect(
      filterEquipeProcesses(rows, {
        searchTerm: '',
        stage: 'all',
        cluster: 'cluster-1',
      }).map(({ id }) => id),
    ).toEqual(['name', 'description', 'client']);
    expect(
      filterEquipeProcesses(rows, {
        searchTerm: '',
        stage: 'analysis',
        cluster: SEM_CLUSTER,
      }).map(({ id }) => id),
    ).toEqual(['no-cluster']);
  });

  it('retorna somente projetos ainda não vinculados', () => {
    const projects = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ];
    expect(
      getAvailableProcessProjects(projects, [
        {
          id: 'link',
          project_id: 'a',
          process_id: 'p',
          impact_type: null,
          impacted_stages: null,
          projects: projects[0],
        },
      ]),
    ).toEqual([{ id: 'b', name: 'B' }]);
  });

  it('monta update com trim, nulls e parseInt sem enviar campos extras', () => {
    expect(
      buildProcessUpdatePayload({
        name: '  Processo ',
        description: '  ',
        area: ' Fiscal ',
        equipe_id: '',
        stage: 'analysis',
        priority: '',
        frequency: ' mensal ',
        volume_month: '10.7',
        financial_impact: ' alto ',
      }),
    ).toEqual({
      name: 'Processo',
      description: null,
      area: 'Fiscal',
      equipe_id: null,
      stage: 'analysis',
      priority: null,
      frequency: 'mensal',
      volume_month: 10,
      financial_impact: 'alto',
    });
  });
});
