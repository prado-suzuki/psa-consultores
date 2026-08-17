import { describe, it, expect } from 'vitest';
import {
  normalizarMembrosEquipe,
  mapaAreasPorPessoa,
  mapaClustersPorPessoa,
  pessoaNoRecorte,
  pessoasNoEscopo,
  desvioMedioEntrega,
  metasNoEscopo,
  resumoMetas,
  contribuicaoNoPeriodo,
  classificarContribuicao,
  chipDeArea,
  rotuloEscopoCliente,
  rotuloJanela,
  listarFalhas,
  type MetaCiclo,
  type PessoaBasica,
  type TarefaOperacional,
} from './performanceOperacional';

// ── Fixtures ────────────────────────────────────────────────────────────
const membrosBrutos = [
  // to-one aninhado como objeto (formato normal do PostgREST)
  { user_id: 'u-tax', equipe: { area: { name: 'Tributário' } } },
  // to-one devolvido como array (acontece dependendo do hint de FK)
  { user_id: 'u-osg', equipe: [{ area: [{ name: 'Societário' }] }] },
  // pessoa em duas equipes → duas áreas
  { user_id: 'u-dupla', equipe: { area: { name: 'Tax' } } },
  { user_id: 'u-dupla', equipe: { area: { name: 'OSG' } } },
  // equipe sem área cadastrada
  { user_id: 'u-sem-area', equipe: { area: null } },
  // linha órfã, sem user_id
  { user_id: null, equipe: { area: { name: 'Tax' } } },
];

describe('normalizarMembrosEquipe', () => {
  it('achata equipe→área tanto em objeto quanto em array', () => {
    const linhas = normalizarMembrosEquipe(membrosBrutos);
    expect(linhas[0]).toEqual({ user_id: 'u-tax', area_name: 'Tributário', area_key: null, cluster_id: null });
    expect(linhas[1]).toEqual({ user_id: 'u-osg', area_name: 'Societário', area_key: null, cluster_id: null });
  });

  it('preserva uma linha por vínculo (a contagem de membros não muda)', () => {
    expect(normalizarMembrosEquipe(membrosBrutos)).toHaveLength(membrosBrutos.length);
  });

  it('equipe ou área ausente vira area_name null em vez de quebrar', () => {
    expect(normalizarMembrosEquipe([{ user_id: 'x' }])).toEqual([
      { user_id: 'x', area_name: null, area_key: null, cluster_id: null },
    ]);
    expect(normalizarMembrosEquipe([{ user_id: 'x', equipe: null }])).toEqual([
      { user_id: 'x', area_name: null, area_key: null, cluster_id: null },
    ]);
  });

  it('page_categories da área define o bucket, mesmo com nome que não casa', () => {
    const linhas = normalizarMembrosEquipe([
      { user_id: 'u1', equipe: { area: { name: 'Núcleo Alfa', page_categories: ['tax'] } } },
    ]);
    expect(linhas[0].area_key).toBe('tax');
    // E o mapa de pessoas passa a enxergar essa pessoa como Tax.
    expect(mapaAreasPorPessoa(linhas).get('u1')?.has('tax')).toBe(true);
  });

  it('lista vazia devolve lista vazia', () => {
    expect(normalizarMembrosEquipe([])).toEqual([]);
  });
});

describe('mapaAreasPorPessoa', () => {
  const mapa = mapaAreasPorPessoa(normalizarMembrosEquipe(membrosBrutos));

  it('classifica a área da equipe pelo bucket canônico', () => {
    expect([...(mapa.get('u-tax') ?? [])]).toEqual(['tax']);
    expect([...(mapa.get('u-osg') ?? [])]).toEqual(['osg']);
  });

  it('pessoa em duas equipes acumula as duas áreas', () => {
    expect([...(mapa.get('u-dupla') ?? [])].sort()).toEqual(['osg', 'tax']);
  });

  it('equipe sem área cai em "outros" (não desaparece)', () => {
    expect([...(mapa.get('u-sem-area') ?? [])]).toEqual(['outros']);
  });

  it('ignora linha sem user_id', () => {
    expect(mapa.has('null')).toBe(false);
    expect(mapa.size).toBe(4);
  });
});

describe('mapaClustersPorPessoa', () => {
  const linhas = normalizarMembrosEquipe([
    // Nome que não casa com nenhum bucket e SEM page_categories: o caminho da
    // área devolveria "outros"; o do cluster acerta pela FK.
    { user_id: 'u1', equipe: { area: { name: 'Núcleo Alfa', cluster_id: 'cl-tax' } } },
    { user_id: 'u2', equipe: { area: { name: 'Núcleo Beta', cluster_id: 'cl-osg' } } },
    // Mesma pessoa em duas equipes de clusters diferentes.
    { user_id: 'u1', equipe: { area: { name: 'Núcleo Beta', cluster_id: 'cl-osg' } } },
    // Área sem cluster: fica de fora do mapa.
    { user_id: 'u3', equipe: { area: { name: 'Solta' } } },
    { user_id: null, equipe: { area: { name: 'X', cluster_id: 'cl-tax' } } },
  ]);
  const mapa = mapaClustersPorPessoa(linhas);

  it('mapeia pessoa → cluster pela FK da área, sem depender do nome', () => {
    expect([...(mapa.get('u2') ?? [])]).toEqual(['cl-osg']);
    // O caminho da área não conseguiria: o nome não casa e não há categoria.
    expect(mapaAreasPorPessoa(linhas).get('u2')?.has('outros')).toBe(true);
  });

  it('pessoa em dois clusters acumula os dois', () => {
    expect([...(mapa.get('u1') ?? [])].sort()).toEqual(['cl-osg', 'cl-tax']);
  });

  it('área sem cluster e linha sem user_id ficam fora', () => {
    expect(mapa.has('u3')).toBe(false);
    expect(mapa.size).toBe(2);
  });

  it('serve ao mesmo predicado de recorte', () => {
    expect(pessoaNoRecorte(mapa, 'u1', 'cl-tax')).toBe(true);
    expect(pessoaNoRecorte(mapa, 'u2', 'cl-tax')).toBe(false);
    // '' = todos os clientes.
    expect(pessoaNoRecorte(mapa, 'u3', '')).toBe(true);
  });
});

describe('rotuloEscopoCliente', () => {
  it('sem cliente escolhido, o rótulo é global', () => {
    expect(rotuloEscopoCliente('global', null)).toBe('todos os clientes');
    expect(rotuloEscopoCliente('area', null)).toBe('todos os clientes');
  });

  it('com cliente e recorte aplicado, nomeia o cliente', () => {
    expect(rotuloEscopoCliente('area', 'TAX')).toBe('TAX');
  });

  it('com cliente mas número global, entrega o motivo em vez de omitir', () => {
    expect(rotuloEscopoCliente('global', 'TAX')).toBe('todos os clientes (sem vínculo de equipe)');
  });
});

describe('pessoaNoRecorte', () => {
  const mapa = mapaAreasPorPessoa(normalizarMembrosEquipe(membrosBrutos));

  it('"todas" aceita qualquer pessoa, inclusive sem vínculo', () => {
    expect(pessoaNoRecorte(mapa, 'desconhecido', 'todas')).toBe(true);
    expect(pessoaNoRecorte(mapa, null, 'todas')).toBe(true);
  });

  it('pessoa sem vínculo não pertence a nenhuma área específica', () => {
    expect(pessoaNoRecorte(mapa, 'desconhecido', 'tax')).toBe(false);
    expect(pessoaNoRecorte(mapa, null, 'tax')).toBe(false);
  });

  it('pessoa de duas áreas pertence às duas', () => {
    expect(pessoaNoRecorte(mapa, 'u-dupla', 'tax')).toBe(true);
    expect(pessoaNoRecorte(mapa, 'u-dupla', 'osg')).toBe(true);
  });
});

describe('pessoasNoEscopo', () => {
  const pessoas: PessoaBasica[] = [{ id: 'u-tax' }, { id: 'u-osg' }, { id: 'u-solto' }];
  const mapa = mapaAreasPorPessoa(normalizarMembrosEquipe(membrosBrutos));

  it('"todas" devolve todo mundo, marcado como global', () => {
    const r = pessoasNoEscopo(pessoas, mapa, 'todas');
    expect(r.pessoas).toHaveLength(3);
    expect(r.escopo).toBe('global');
  });

  it('recorta pela área da equipe quando há vínculo', () => {
    const r = pessoasNoEscopo(pessoas, mapa, 'tax');
    expect(r.pessoas.map((p) => p.id)).toEqual(['u-tax']);
    expect(r.escopo).toBe('area');
  });

  it('sem NENHUM vínculo cadastrado não filtra e declara escopo global', () => {
    const r = pessoasNoEscopo(pessoas, new Map(), 'tax');
    expect(r.pessoas).toHaveLength(3);
    expect(r.escopo).toBe('global');
  });

  it('lista de pessoas vazia devolve lista vazia', () => {
    expect(pessoasNoEscopo([], mapa, 'tax').pessoas).toEqual([]);
  });
});

describe('desvioMedioEntrega', () => {
  it('média dos dias entre conclusão e prazo, com as atrasadas contadas', () => {
    const r = desvioMedioEntrega([
      { status: 'done', updated_at: '2026-07-13T12:00:00Z', due_date: '2026-07-10' },
      { status: 'done', updated_at: '2026-07-15T12:00:00Z', due_date: '2026-07-10' },
    ]);
    expect(r.dias).toBeCloseTo(4, 5); // 3 e 5 dias de atraso
    expect(r.amostra).toBe(2);
    expect(r.atrasadas).toBe(2);
  });

  it('entrega adiantada é NEGATIVA — sem piso de 1 dia', () => {
    const r = desvioMedioEntrega([
      { status: 'done', updated_at: '2026-07-01T12:00:00Z', due_date: '2026-07-10' },
    ]);
    // `differenceInDays` trunca dias inteiros: 8 dias e algumas horas → -8.
    expect(r.dias).toBeCloseTo(-8, 5);
    expect(r.atrasadas).toBe(0);
  });

  it('entrega no dia do prazo é zero, não 1', () => {
    const r = desvioMedioEntrega([
      { status: 'done', updated_at: '2026-07-10T12:00:00Z', due_date: '2026-07-10' },
    ]);
    expect(r.dias).toBe(0);
    expect(r.atrasadas).toBe(0);
  });

  it('adiantada e atrasada se compensam na média assinada', () => {
    const r = desvioMedioEntrega([
      { status: 'done', updated_at: '2026-07-05T12:00:00Z', due_date: '2026-07-10' }, // -4 (truncado)
      { status: 'done', updated_at: '2026-07-15T12:00:00Z', due_date: '2026-07-10' }, // +5
    ]);
    // Uma adiantada anula a atrasada: a média fica perto de zero, em vez de
    // somar 5 + 1 (piso) = 3 como na fórmula antiga.
    expect(r.dias).toBeCloseTo(0.5, 5);
    expect(r.amostra).toBe(2);
    expect(r.atrasadas).toBe(1);
  });

  it('ignora não concluída, sem prazo e sem data de conclusão', () => {
    const r = desvioMedioEntrega([
      { status: 'in_progress', updated_at: '2026-07-13T12:00:00Z', due_date: '2026-07-10' },
      { status: 'done', updated_at: '2026-07-13T12:00:00Z', due_date: null },
      { status: 'done', updated_at: null, due_date: '2026-07-10' },
    ]);
    expect(r).toEqual({ dias: null, amostra: 0, atrasadas: 0 });
  });

  it('escopo vazio devolve null em vez de NaN', () => {
    expect(desvioMedioEntrega([])).toEqual({ dias: null, amostra: 0, atrasadas: 0 });
  });
});

describe('metasNoEscopo', () => {
  const mapa = mapaAreasPorPessoa(normalizarMembrosEquipe(membrosBrutos));
  const metas: MetaCiclo[] = [
    { id: 'm1', responsavel_id: 'u-tax', nivel: 'individual', progresso_atual: 80 },
    { id: 'm2', responsavel_id: 'u-osg', nivel: 'individual', progresso_atual: 40 },
    { id: 'm3', responsavel_id: null, nivel: 'individual', progresso_atual: 10 },
  ];

  it('"todas" mantém tudo e declara global', () => {
    const r = metasNoEscopo(metas, mapa, 'todas');
    expect(r.metas).toHaveLength(3);
    expect(r.escopo).toBe('global');
    expect(r.semVinculoDeArea).toBe(1);
  });

  it('atribui meta pela área do responsável', () => {
    const r = metasNoEscopo(metas, mapa, 'tax');
    expect(r.metas.map((m) => m.id)).toEqual(['m1']);
    expect(r.escopo).toBe('area');
  });

  it('área sem meta atribuída devolve lista vazia mas escopo de área (0% é da área)', () => {
    const r = metasNoEscopo(metas, mapa, 'outros');
    expect(r.metas).toEqual([]);
    expect(r.escopo).toBe('area');
  });

  it('quando NENHUMA meta é atribuível, volta ao global rotulado', () => {
    const semVinculo: MetaCiclo[] = [{ id: 'm9', responsavel_id: 'fantasma', nivel: 'individual' }];
    const r = metasNoEscopo(semVinculo, mapa, 'tax');
    expect(r.metas).toHaveLength(1);
    expect(r.escopo).toBe('global');
    expect(r.semVinculoDeArea).toBe(1);
  });

  it('ciclo sem metas não quebra', () => {
    expect(metasNoEscopo([], mapa, 'tax')).toEqual({ metas: [], escopo: 'global', semVinculoDeArea: 0 });
  });
});

describe('resumoMetas', () => {
  it('média de progresso considera só metas individuais', () => {
    const r = resumoMetas([
      { nivel: 'individual', progresso_atual: 100 },
      { nivel: 'individual', progresso_atual: 50 },
      { nivel: 'equipe', progresso_atual: 0 },
    ]);
    expect(r.individuais).toBe(2);
    expect(r.progresso).toBe(75);
    expect(r.total).toBe(3);
  });

  it('conta em risco só as ativas abaixo de 70', () => {
    const r = resumoMetas([
      { nivel: 'individual', progresso_atual: 40, status: 'ativa' },
      { nivel: 'individual', progresso_atual: 90, status: 'ativa' },
      { nivel: 'individual', progresso_atual: 10, status: 'concluida' },
    ]);
    expect(r.emRisco).toBe(1);
  });

  it('progresso nulo conta como zero, não como NaN', () => {
    const r = resumoMetas([{ nivel: 'individual', progresso_atual: null }]);
    expect(r.progresso).toBe(0);
    expect(Number.isNaN(r.progresso)).toBe(false);
  });

  it('sem metas individuais o progresso é 0 sem dividir por zero', () => {
    expect(resumoMetas([{ nivel: 'equipe', progresso_atual: 90 }])).toMatchObject({
      individuais: 0,
      progresso: 0,
    });
    expect(resumoMetas([])).toEqual({ total: 0, individuais: 0, progresso: 0, emRisco: 0 });
  });
});

describe('contribuicaoNoPeriodo', () => {
  const pessoas: PessoaBasica[] = [
    { id: 'a', first_name: 'Ana', last_name: 'Alves' },
    { id: 'b', first_name: 'Bruno', last_name: 'Braga' },
    { id: 'c', first_name: 'Caio', last_name: 'Costa' },
  ];

  const tarefas: TarefaOperacional[] = [
    // Ana: 3 entregas, 1 atrasada, 1 sem prazo
    { assigned_to: 'a', status: 'done', updated_at: '2026-07-05T10:00:00Z', due_date: '2026-07-10' },
    { assigned_to: 'a', status: 'done', updated_at: '2026-07-12T10:00:00Z', due_date: '2026-07-10' },
    { assigned_to: 'a', status: 'done', updated_at: '2026-07-12T10:00:00Z', due_date: null },
    // Bruno: 1 entrega no prazo + 1 tarefa em andamento (não conta)
    { assigned_to: 'b', status: 'done', updated_at: '2026-07-10T12:00:00Z', due_date: '2026-07-10' },
    { assigned_to: 'b', status: 'in_progress', updated_at: '2026-07-11T10:00:00Z', due_date: '2026-07-10' },
    // tarefa sem responsável não entra
    { assigned_to: null, status: 'done', updated_at: '2026-07-10T10:00:00Z', due_date: '2026-07-10' },
  ];

  it('o número da janela são as ENTREGAS da janela, não o PPR do ciclo', () => {
    const r = contribuicaoNoPeriodo(pessoas, tarefas, []);
    expect(r.map((m) => [m.id, m.entregas])).toEqual([
      ['a', 3],
      ['b', 1],
    ]);
  });

  it('pontualidade usa só entregas com prazo definido', () => {
    const ana = contribuicaoNoPeriodo(pessoas, tarefas, []).find((m) => m.id === 'a');
    expect(ana).toMatchObject({ comPrazo: 2, noPrazo: 1, pontualidade: 50 });
  });

  it('entrega no mesmo dia do prazo conta como no prazo', () => {
    const bruno = contribuicaoNoPeriodo(pessoas, tarefas, []).find((m) => m.id === 'b');
    expect(bruno).toMatchObject({ comPrazo: 1, noPrazo: 1, pontualidade: 100 });
  });

  it('entrega sem prazo nenhum deixa pontualidade null (não vira 0%)', () => {
    const r = contribuicaoNoPeriodo(
      [{ id: 'a', first_name: 'Ana' }],
      [{ assigned_to: 'a', status: 'done', updated_at: '2026-07-12T10:00:00Z', due_date: null }],
      [],
    );
    expect(r[0]).toMatchObject({ entregas: 1, comPrazo: 0, pontualidade: null });
  });

  it('pessoa sem entrega e sem meta fica fora da lista', () => {
    expect(contribuicaoNoPeriodo(pessoas, tarefas, []).map((m) => m.id)).not.toContain('c');
  });

  it('pessoa sem entrega mas com meta individual aparece com PPR e zero entrega', () => {
    const metas: MetaCiclo[] = [
      { responsavel_id: 'c', nivel: 'individual', progresso_atual: 60, peso: 1 },
    ];
    const caio = contribuicaoNoPeriodo(pessoas, tarefas, metas).find((m) => m.id === 'c');
    expect(caio).toMatchObject({ entregas: 0, pontualidade: null, pprCiclo: 60 });
  });

  it('PPR é média ponderada pelo peso e null sem meta individual', () => {
    const metas: MetaCiclo[] = [
      { responsavel_id: 'a', nivel: 'individual', progresso_atual: 100, peso: 3 },
      { responsavel_id: 'a', nivel: 'individual', progresso_atual: 20, peso: 1 },
      { responsavel_id: 'a', nivel: 'equipe', progresso_atual: 0, peso: 5 },
    ];
    const r = contribuicaoNoPeriodo(pessoas, tarefas, metas);
    expect(r.find((m) => m.id === 'a')?.pprCiclo).toBe(80);
    expect(r.find((m) => m.id === 'b')?.pprCiclo).toBeNull();
  });

  it('ordena por entregas decrescente', () => {
    const r = contribuicaoNoPeriodo(pessoas, tarefas, []);
    expect(r.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('lista de pessoas vazia devolve lista vazia', () => {
    expect(contribuicaoNoPeriodo([], tarefas, [])).toEqual([]);
  });

  it('sem tarefa nenhuma no período ninguém é inventado', () => {
    expect(contribuicaoNoPeriodo(pessoas, [], [])).toEqual([]);
  });

  it('monta nome e iniciais mesmo com sobrenome ausente', () => {
    const r = contribuicaoNoPeriodo(
      [{ id: 'a', first_name: 'Ana', last_name: null }],
      [{ assigned_to: 'a', status: 'done', updated_at: '2026-07-12T10:00:00Z', due_date: null }],
      [],
    );
    expect(r[0].nome).toBe('Ana');
    expect(r[0].iniciais).toBe('A');
  });
});

describe('classificarContribuicao', () => {
  it('sem entrega o rótulo é neutro — nunca "Abaixo"', () => {
    expect(classificarContribuicao({ entregas: 0, pontualidade: null })).toEqual({
      variant: 'gy',
      label: 'sem entregas',
    });
  });

  it('entrega sem prazo cadastrado também é neutra', () => {
    expect(classificarContribuicao({ entregas: 3, pontualidade: null }).variant).toBe('gy');
  });

  it('classifica pelas faixas de pontualidade', () => {
    expect(classificarContribuicao({ entregas: 1, pontualidade: 100 }).label).toBe('Supera');
    expect(classificarContribuicao({ entregas: 1, pontualidade: 90 }).label).toBe('Atende');
    expect(classificarContribuicao({ entregas: 1, pontualidade: 75 }).label).toBe('Parcial');
    expect(classificarContribuicao({ entregas: 1, pontualidade: 10 }).label).toBe('Abaixo');
  });
});

describe('chipDeArea', () => {
  it('usa o nome cadastrado com a variante do bucket canônico', () => {
    expect(chipDeArea('Tributário')).toEqual({ variant: 'tax', label: 'Tributário' });
    expect(chipDeArea('Societário')).toEqual({ variant: 'osg', label: 'Societário' });
  });

  it('área desconhecida é chip neutro, não Dev', () => {
    expect(chipDeArea('Controladoria')).toEqual({ variant: 'gy', label: 'Controladoria' });
  });

  it('sem área o texto é "Sem área" (antes dizia N/A pintado de Dev)', () => {
    expect(chipDeArea(null)).toEqual({ variant: 'gy', label: 'Sem área' });
    expect(chipDeArea('   ')).toEqual({ variant: 'gy', label: 'Sem área' });
  });
});

describe('rótulos de escopo e janela', () => {


  it('rotuloJanela descreve a janela do filtro', () => {
    expect(rotuloJanela('7d')).toBe('últimos 7 dias');
    expect(rotuloJanela('90d')).toBe('últimos 90 dias');
    expect(rotuloJanela('ciclo')).toBe('ciclo ativo');
    expect(rotuloJanela('')).toBe('últimos 30 dias');
  });
});

describe('listarFalhas', () => {
  it('lista só as fontes que falharam', () => {
    expect(
      listarFalhas([
        { rotulo: 'projetos', falhou: true },
        { rotulo: 'equipe', falhou: false },
        { rotulo: 'metas', falhou: true },
      ]),
    ).toEqual(['projetos', 'metas']);
  });

  it('nada falhou devolve lista vazia (sem banner)', () => {
    expect(listarFalhas([{ rotulo: 'projetos', falhou: false }])).toEqual([]);
    expect(listarFalhas([])).toEqual([]);
  });
});
