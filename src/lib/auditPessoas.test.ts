import { describe, it, expect } from 'vitest';
import {
  agregarCargaPessoas,
  agregarPessoas,
  buildPessoasCsv,
  colunasPessoas,
  direcaoInicialPessoa,
  idsDasAreas,
  ordenarPessoas,
  pessoasDasAreas,
  resolverEstruturaPessoas,
  resumirPessoas,
  rotuloDiasSemRegistro,
  type LinhaPessoa,
} from './auditPessoas';
import type { AuditLog } from '@/hooks/useDomainAuditLogs';

function log(over: Partial<AuditLog>): AuditLog {
  return {
    id: crypto.randomUUID(),
    area: 'osg',
    entity_type: 'task',
    entity_id: 'ent-1',
    entity_name: 'Tarefa',
    action: 'updated',
    changed_fields: null,
    performed_by: 'u1',
    performed_at: '2026-07-20T10:00:00.000Z',
    details: null,
    ...over,
  };
}

const NOMES = { u1: 'Maria Silva', u2: 'Bruno Souza', u3: 'Carla Dias' };
const HOJE = '2026-07-29';

describe('resolverEstruturaPessoas', () => {
  const equipes = [
    { id: 'e1', name: 'Consultoria', area_id: 'a1', gestor_id: 'chefe' },
    { id: 'e2', name: 'Obrigações', area_id: 'a1', gestor_id: null },
    { id: 'e3', name: 'Projetos', area_id: 'a2', gestor_id: null },
  ];
  const areas = [{ id: 'a1', name: 'Tax' }, { id: 'a2', name: 'OSG' }];

  it('resolve área e equipe de cada pessoa', () => {
    const estrutura = resolverEstruturaPessoas([{ user_id: 'u1', equipe_id: 'e1' }], equipes, areas);
    expect(estrutura.u1).toEqual({ area: 'Tax', equipe: 'Consultoria' });
  });

  it('junta os nomes de quem está em mais de uma equipe ou área', () => {
    const estrutura = resolverEstruturaPessoas(
      [
        { user_id: 'u1', equipe_id: 'e1' },
        { user_id: 'u1', equipe_id: 'e3' },
        { user_id: 'u2', equipe_id: 'e1' },
        { user_id: 'u2', equipe_id: 'e2' },
      ],
      equipes,
      areas,
    );

    expect(estrutura.u1).toEqual({ area: 'OSG · Tax', equipe: 'Consultoria · Projetos' });
    // Duas equipes da mesma área: a área não se repete.
    expect(estrutura.u2).toEqual({ area: 'Tax', equipe: 'Consultoria · Obrigações' });
  });

  it('lota o gestor na própria equipe mesmo sem linha de membro', () => {
    const estrutura = resolverEstruturaPessoas([], equipes, areas);
    expect(estrutura.chefe).toEqual({ area: 'Tax', equipe: 'Consultoria' });
  });

  it('ignora vínculo com equipe inexistente e área sem nome', () => {
    const estrutura = resolverEstruturaPessoas(
      [{ user_id: 'u1', equipe_id: 'fantasma' }, { user_id: 'u2', equipe_id: 'e9' }],
      [{ id: 'e9', name: 'Sem área', area_id: null, gestor_id: null }],
      areas,
    );

    expect(estrutura.u1).toBeUndefined();
    expect(estrutura.u2).toEqual({ area: null, equipe: 'Sem área' });
  });
});

describe('idsDasAreas e pessoasDasAreas', () => {
  const areas = [
    { id: 'a1', name: 'Tax', page_categories: ['tax'] },
    { id: 'a2', name: 'OSG', page_categories: ['osg'] },
    { id: 'a3', name: 'Digital', page_categories: ['rotina', 'dev'] },
    { id: 'a4', name: 'Sem categoria', page_categories: null },
  ];

  it('acha as áreas da estrutura pelo slug da página', () => {
    expect(idsDasAreas(areas, ['tax'])).toEqual(['a1']);
    expect(idsDasAreas(areas, ['rotina', 'dev'])).toEqual(['a3']);
    expect(idsDasAreas(areas, ['inexistente'])).toEqual([]);
  });

  it('lista o time das equipes da área, incluindo o gestor, sem repetir', () => {
    const equipes = [
      { id: 'e1', name: 'Consultoria', area_id: 'a1', gestor_id: 'chefe' },
      { id: 'e2', name: 'Projetos', area_id: 'a2', gestor_id: null },
    ];
    const membros = [
      { user_id: 'u1', equipe_id: 'e1' },
      { user_id: 'chefe', equipe_id: 'e1' },
      { user_id: 'u2', equipe_id: 'e2' },
    ];

    expect(pessoasDasAreas(membros, equipes, ['a1']).sort()).toEqual(['chefe', 'u1']);
    expect(pessoasDasAreas(membros, equipes, [])).toEqual([]);
  });
});

describe('agregarCargaPessoas', () => {
  it('conta abertas e atrasadas por responsável', () => {
    const carga = agregarCargaPessoas([
      { assigned_to: 'u1', status: 'todo', due_date: '2026-07-20' },
      { assigned_to: 'u1', status: 'in_progress', due_date: '2026-08-10' },
      { assigned_to: 'u1', status: 'done', due_date: '2026-07-01' },
      { assigned_to: 'u2', status: 'review', due_date: null },
      { assigned_to: null, status: 'todo', due_date: '2026-07-01' },
    ], HOJE);

    // A concluída sai da conta mesmo estando vencida.
    expect(carga.u1).toEqual({ abertas: 2, atrasadas: 1 });
    // Sem prazo não é atraso.
    expect(carga.u2).toEqual({ abertas: 1, atrasadas: 0 });
  });

  it('trata completed como concluída e ignora tarefa vencendo hoje', () => {
    const carga = agregarCargaPessoas([
      { assigned_to: 'u1', status: 'completed', due_date: '2026-07-01' },
      { assigned_to: 'u1', status: 'todo', due_date: HOJE },
    ], HOJE);

    expect(carga.u1).toEqual({ abertas: 1, atrasadas: 0 });
  });

  it('devolve vazio sem tarefas', () => {
    expect(agregarCargaPessoas([], HOJE)).toEqual({});
  });
});

describe('agregarPessoas', () => {
  it('monta a linha com dias ativos, último registro e situação', () => {
    const [linha] = agregarPessoas({
      logs: [
        log({ performed_by: 'u1', performed_at: '2026-07-27T09:00:00.000Z' }),
        log({ performed_by: 'u1', performed_at: '2026-07-28T18:00:00.000Z' }),
        log({ performed_by: 'u1', performed_at: '2026-07-28T19:00:00.000Z' }),
      ],
      nomePorId: NOMES,
      estrutura: { u1: { area: 'Tax', equipe: 'Consultoria' } },
      ultimoAcessoPorId: { u1: '2026-07-29T07:30:00.000Z' },
      carga: { u1: { abertas: 4, atrasadas: 1 } },
      hoje: HOJE,
    });

    expect(linha).toEqual({
      userId: 'u1',
      nome: 'Maria Silva',
      area: 'Tax',
      equipe: 'Consultoria',
      ultimoAcesso: '2026-07-29T07:30:00.000Z',
      ultimoRegistro: '2026-07-28T19:00:00.000Z',
      diasSemRegistro: 1,
      diasAtivos: 2,
      tarefasAbertas: 4,
      tarefasAtrasadas: 1,
      situacao: 'ativo',
    });
  });

  it('marca quem passou de 7 dias sem registrar', () => {
    const [linha] = agregarPessoas({
      logs: [log({ performed_by: 'u1', performed_at: '2026-07-22T10:00:00.000Z' })],
      nomePorId: NOMES,
      hoje: HOJE,
    });

    expect(linha.diasSemRegistro).toBe(7);
    expect(linha.situacao).toBe('parou');
  });

  it('inclui quem não registrou nada no período e marca sem_registro', () => {
    const linhas = agregarPessoas({
      logs: [log({ performed_by: 'u1' })],
      nomePorId: NOMES,
      incluirSemRegistro: ['u2', 'u1'],
      hoje: HOJE,
    });

    expect(linhas.map(l => l.nome)).toEqual(['Bruno Souza', 'Maria Silva']);
    const bruno = linhas.find(l => l.userId === 'u2')!;
    expect(bruno.ultimoRegistro).toBeNull();
    expect(bruno.diasSemRegistro).toBeNull();
    expect(bruno.diasAtivos).toBe(0);
    expect(bruno.situacao).toBe('sem_registro');
    // 'u1' aparece uma vez só, mesmo estando nas duas fontes.
    expect(linhas).toHaveLength(2);
  });

  it('deixa acesso nulo quando não é admin e cai para Desconhecido sem nome', () => {
    const [linha] = agregarPessoas({
      logs: [log({ performed_by: 'fantasma' })],
      nomePorId: NOMES,
      hoje: HOJE,
    });

    expect(linha.nome).toBe('Desconhecido');
    expect(linha.ultimoAcesso).toBeNull();
    expect(linha.tarefasAbertas).toBe(0);
  });

  it('devolve lista vazia sem logs nem roster', () => {
    expect(agregarPessoas({ logs: [], nomePorId: NOMES, hoje: HOJE })).toEqual([]);
  });
});

describe('rotuloDiasSemRegistro', () => {
  it('formata hoje, singular, plural e ausência de registro', () => {
    expect(rotuloDiasSemRegistro(0)).toBe('hoje');
    expect(rotuloDiasSemRegistro(1)).toBe('há 1 dia');
    expect(rotuloDiasSemRegistro(12)).toBe('há 12 dias');
    expect(rotuloDiasSemRegistro(null)).toBe('—');
  });
});

describe('resumirPessoas', () => {
  function linha(over: Partial<LinhaPessoa>): LinhaPessoa {
    return {
      userId: 'u',
      nome: 'Nome',
      area: null,
      equipe: null,
      ultimoAcesso: '2026-07-29T07:00:00.000Z',
      ultimoRegistro: '2026-07-28T10:00:00.000Z',
      diasSemRegistro: 1,
      diasAtivos: 1,
      tarefasAbertas: 0,
      tarefasAtrasadas: 0,
      situacao: 'ativo',
      ...over,
    };
  }

  it('conta pessoas, paradas e quem nunca acessou', () => {
    const linhas = [
      linha({ userId: 'a' }),
      linha({ userId: 'b', situacao: 'parou' }),
      linha({ userId: 'c', situacao: 'sem_registro', ultimoAcesso: null }),
    ];

    expect(resumirPessoas(linhas, true)).toEqual({ pessoas: 3, paradas: 2, semAcesso: 1 });
  });

  it('omite o acesso quando a coluna não é visível', () => {
    expect(resumirPessoas([linha({})], false).semAcesso).toBeNull();
  });
});

describe('colunasPessoas', () => {
  it('mostra Último acesso só para quem pode ler o acesso', () => {
    expect(colunasPessoas(true)).toContain('ultimoAcesso');
    expect(colunasPessoas(false)).not.toContain('ultimoAcesso');
    // A ordem das demais não muda entre os dois casos.
    expect(colunasPessoas(true).filter(c => c !== 'ultimoAcesso')).toEqual(colunasPessoas(false));
  });
});

describe('ordenarPessoas', () => {
  function linha(over: Partial<LinhaPessoa>): LinhaPessoa {
    return {
      userId: 'u',
      nome: 'Nome',
      area: null,
      equipe: null,
      ultimoAcesso: null,
      ultimoRegistro: '2026-07-28T10:00:00.000Z',
      diasSemRegistro: 1,
      diasAtivos: 1,
      tarefasAbertas: 0,
      tarefasAtrasadas: 0,
      situacao: 'ativo',
      ...over,
    };
  }

  const base = [
    linha({ userId: 'a', nome: 'Ana', ultimoRegistro: '2026-07-28T10:00:00.000Z', tarefasAbertas: 2 }),
    linha({ userId: 'b', nome: 'Bruno', ultimoRegistro: null, situacao: 'sem_registro', tarefasAbertas: 9 }),
    linha({ userId: 'c', nome: 'Carla', ultimoRegistro: '2026-07-21T10:00:00.000Z', situacao: 'parou', tarefasAbertas: 5 }),
  ];

  it('coloca quem não registrou nada no topo ao ordenar por último registro', () => {
    expect(ordenarPessoas(base, 'ultimoRegistro', 'asc').map(l => l.userId)).toEqual(['b', 'c', 'a']);
    expect(ordenarPessoas(base, 'ultimoRegistro', 'desc').map(l => l.userId)).toEqual(['a', 'c', 'b']);
  });

  it('ordena situação por gravidade, não por alfabeto', () => {
    expect(ordenarPessoas(base, 'situacao', 'desc').map(l => l.userId)).toEqual(['b', 'c', 'a']);
    expect(ordenarPessoas(base, 'situacao', 'asc').map(l => l.userId)).toEqual(['a', 'c', 'b']);
  });

  it('ordena contagem, nome e área/equipe', () => {
    expect(ordenarPessoas(base, 'tarefasAbertas', 'desc').map(l => l.userId)).toEqual(['b', 'c', 'a']);
    expect(ordenarPessoas(base, 'nome', 'asc').map(l => l.userId)).toEqual(['a', 'b', 'c']);

    const comArea = [
      linha({ userId: 'x', nome: 'Xis', area: 'Tax', equipe: 'Obrigações' }),
      linha({ userId: 'y', nome: 'Ypsilon', area: 'OSG', equipe: 'Projetos' }),
    ];
    expect(ordenarPessoas(comArea, 'areaEquipe', 'asc').map(l => l.userId)).toEqual(['y', 'x']);
  });

  it('desempata por nome e não muta o array recebido', () => {
    const empatados = [
      linha({ userId: 'z', nome: 'Zeca', diasAtivos: 3 }),
      linha({ userId: 'd', nome: 'Davi', diasAtivos: 3 }),
    ];
    expect(ordenarPessoas(empatados, 'diasAtivos', 'desc').map(l => l.userId)).toEqual(['d', 'z']);

    const original = [...base];
    ordenarPessoas(base, 'nome', 'desc');
    expect(base).toEqual(original);
  });
});

describe('direcaoInicialPessoa', () => {
  it('começa asc em texto e data, desc em contagem', () => {
    expect(direcaoInicialPessoa('nome')).toBe('asc');
    expect(direcaoInicialPessoa('ultimoRegistro')).toBe('asc');
    expect(direcaoInicialPessoa('ultimoAcesso')).toBe('asc');
    expect(direcaoInicialPessoa('tarefasAbertas')).toBe('desc');
    expect(direcaoInicialPessoa('situacao')).toBe('desc');
  });
});

describe('buildPessoasCsv', () => {
  const linhas: LinhaPessoa[] = [
    {
      userId: 'u1',
      nome: 'Souza; Bruno',
      area: 'Tax',
      equipe: 'Consultoria',
      ultimoAcesso: '2026-07-29T07:30:00.000Z',
      ultimoRegistro: '2026-07-28T19:00:00.000Z',
      diasSemRegistro: 1,
      diasAtivos: 2,
      tarefasAbertas: 4,
      tarefasAtrasadas: 1,
      situacao: 'ativo',
    },
    {
      userId: 'u2',
      nome: 'Carla Dias',
      area: null,
      equipe: null,
      ultimoAcesso: null,
      ultimoRegistro: null,
      diasSemRegistro: null,
      diasAtivos: 0,
      tarefasAbertas: 0,
      tarefasAtrasadas: 0,
      situacao: 'sem_registro',
    },
  ];

  it('exporta as colunas da visão de admin, com nome escapado', () => {
    const csv = buildPessoasCsv(linhas, colunasPessoas(true)).split('\n');

    expect(csv[0]).toBe(
      'colaborador;area;equipe;ultimo_acesso;ultimo_registro;dias_sem_registro;dias_ativos;tarefas_abertas;tarefas_atrasadas;situacao',
    );
    expect(csv[1]).toBe(
      '"Souza; Bruno";Tax;Consultoria;2026-07-29T07:30:00.000Z;2026-07-28T19:00:00.000Z;1;2;4;1;Ativo',
    );
    // Sem valor deixa a célula vazia em vez de escrever zero ou "—".
    expect(csv[2]).toBe('Carla Dias;;;;;;0;0;0;Sem registro no período');
  });

  it('não exporta a coluna de acesso quando ela não está na tela', () => {
    const csv = buildPessoasCsv(linhas, colunasPessoas(false)).split('\n');
    expect(csv[0]).not.toContain('ultimo_acesso');
    expect(csv[1]).toBe('"Souza; Bruno";Tax;Consultoria;2026-07-28T19:00:00.000Z;1;2;4;1;Ativo');
  });
});
