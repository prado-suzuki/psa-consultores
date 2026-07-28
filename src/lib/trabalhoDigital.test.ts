import { describe, it, expect } from 'vitest';
import {
  classificarPontualidade,
  diaBrasilia,
  diagnosticoDigital,
  idsDeTarefasMae,
  pontualidadeEntregaveis,
  resolverAreaEntregavel,
  resolverAreaProjeto,
  resumoDigital,
  saudeProjetoDigital,
  somenteFolhas,
  STATUS_ENTREGAVEL,
  STATUS_ENTREGAVEL_CONCLUIDO,
  STATUS_PROJETO,
  STATUS_PROJETO_ATIVO,
  type EntradaDigital,
  type EntregavelDigital,
  type EquipeAreaDigital,
  type JanelaDigital,
  type ProjetoDigital,
  type SprintDigital,
} from './trabalhoDigital';

// ── Fixtures ──────────────────────────────────────────────────────────────
const JANELA: JanelaDigital = {
  desdeISO: '2026-07-01T00:00:00.000Z',
  ateISO: '2026-07-31T23:59:59.000Z',
};
/** "hoje" derivado de JANELA.ateISO em Brasília. */
const HOJE = '2026-07-31';

const equipes: EquipeAreaDigital[] = [
  { id: 'eq-digital', area_name: 'Digital' },
  { id: 'eq-tax', area_name: 'Fiscal / Tributário' },
  { id: 'eq-sem-area', area_name: null },
];

const entregavel = (over: Partial<EntregavelDigital> = {}): EntregavelDigital => ({
  id: 'e1',
  status: 'pending',
  due_date: '2026-07-10',
  completed_at: null,
  project_id: 'p-digital',
  sprint_id: null,
  parent_id: null,
  ...over,
});

const projeto = (over: Partial<ProjetoDigital> = {}): ProjetoDigital => ({
  id: 'p-digital',
  status: 'active',
  equipe_id: 'eq-digital',
  area: null,
  end_date: null,
  ...over,
});

const entrada = (over: Partial<EntradaDigital> = {}): EntradaDigital => ({
  entregaveis: [],
  projetos: [projeto()],
  sprints: [],
  equipes,
  janela: JANELA,
  ...over,
});

// ── Vocabulário de status ─────────────────────────────────────────────────
describe('vocabulário de status', () => {
  it('entregável usa o CHECK do banco; concluído é "completed"', () => {
    // supabase/migrations/20251209123459_31732be3-...sql:9
    expect(STATUS_ENTREGAVEL).toEqual(['pending', 'in_progress', 'completed']);
    expect(STATUS_ENTREGAVEL_CONCLUIDO).toBe('completed');
  });

  it('projeto usa o vocabulário das telas; ativo é só "active"', () => {
    // src/components/equipe/projetos/ProjectFilters.tsx:58-61
    expect(STATUS_PROJETO).toEqual(['active', 'completed', 'blocked', 'archived']);
    expect(STATUS_PROJETO_ATIVO).toBe('active');
  });
});

// ── Dia-calendário ────────────────────────────────────────────────────────
describe('diaBrasilia', () => {
  it('usa o fuso de Brasília, não o da máquina que roda o teste', () => {
    // 2026-07-11T01:00Z = 2026-07-10 22:00 em Brasília → ainda é dia 10.
    expect(diaBrasilia('2026-07-11T01:00:00.000Z')).toBe('2026-07-10');
    expect(diaBrasilia('2026-07-10T12:00:00.000Z')).toBe('2026-07-10');
  });

  it('data ausente ou inválida devolve null em vez de quebrar', () => {
    expect(diaBrasilia(null)).toBeNull();
    expect(diaBrasilia('')).toBeNull();
    expect(diaBrasilia('não é data')).toBeNull();
  });
});

// ── Resolução de área do projeto ──────────────────────────────────────────
describe('resolverAreaProjeto', () => {
  it('prefere a área da equipe (estrutura_equipes → estrutura_areas)', () => {
    const r = resolverAreaProjeto(projeto({ equipe_id: 'eq-digital', area: 'Fiscal' }), equipes);
    expect(r).toEqual({ area: 'dev', areaName: 'Digital', origem: 'equipe' });
  });

  it('projeto SEM equipe_id cai no texto livre projects.area', () => {
    const r = resolverAreaProjeto(projeto({ equipe_id: null, area: 'Fiscal' }), equipes);
    expect(r).toEqual({ area: 'tax', areaName: 'Fiscal', origem: 'texto' });
  });

  it('equipe existente mas sem área também cai no texto livre', () => {
    const r = resolverAreaProjeto(projeto({ equipe_id: 'eq-sem-area', area: 'Digital' }), equipes);
    expect(r).toEqual({ area: 'dev', areaName: 'Digital', origem: 'texto' });
  });

  it('equipe_id apontando para equipe fora do escopo (RLS/inativa) usa o texto', () => {
    const r = resolverAreaProjeto(projeto({ equipe_id: 'eq-fantasma', area: 'Digital' }), equipes);
    expect(r.origem).toBe('texto');
    expect(r.area).toBe('dev');
  });

  it('projeto SEM área nenhuma (sem equipe e sem texto) vira "outros"', () => {
    const r = resolverAreaProjeto(projeto({ equipe_id: null, area: null }), equipes);
    expect(r).toEqual({ area: 'outros', areaName: null, origem: 'nenhuma' });
  });

  it('texto só com espaços não vale como área', () => {
    expect(resolverAreaProjeto(projeto({ equipe_id: null, area: '   ' }), equipes).origem).toBe(
      'nenhuma',
    );
  });

  it('projeto ausente vira "outros" em vez de estourar', () => {
    expect(resolverAreaProjeto(null, equipes).area).toBe('outros');
  });
});

// ── Resolução de área do entregável ───────────────────────────────────────
describe('resolverAreaEntregavel', () => {
  const projetos = [
    projeto({ id: 'p-digital', equipe_id: 'eq-digital' }),
    projeto({ id: 'p-tax', equipe_id: 'eq-tax' }),
  ];
  const sprints: SprintDigital[] = [
    { id: 's-tax', project_id: 'p-tax' },
    { id: 's-orfa', project_id: null },
  ];

  it('resolve pelo project_id direto', () => {
    const r = resolverAreaEntregavel(
      entregavel({ project_id: 'p-digital' }),
      projetos,
      sprints,
      equipes,
    );
    expect(r).toMatchObject({ area: 'dev', vinculo: 'projeto', projetoId: 'p-digital' });
  });

  it('SEM project_id, resolve via sprint_id → sprints.project_id', () => {
    const r = resolverAreaEntregavel(
      entregavel({ project_id: null, sprint_id: 's-tax' }),
      projetos,
      sprints,
      equipes,
    );
    expect(r).toMatchObject({ area: 'tax', vinculo: 'sprint', projetoId: 'p-tax' });
  });

  it('entregável SEM nenhum vínculo cai em "outros" — nunca desaparece', () => {
    const r = resolverAreaEntregavel(
      entregavel({ project_id: null, sprint_id: null }),
      projetos,
      sprints,
      equipes,
    );
    expect(r).toEqual({ area: 'outros', areaName: null, origem: 'nenhuma', projetoId: null, vinculo: 'nenhum' });
  });

  it('sprint sem project_id não resolve nada (buraco do UPDATE ... SET project_id = NULL)', () => {
    const r = resolverAreaEntregavel(
      entregavel({ project_id: null, sprint_id: 's-orfa' }),
      projetos,
      sprints,
      equipes,
    );
    expect(r.area).toBe('outros');
    expect(r.vinculo).toBe('nenhum');
  });

  it('ponteiro para projeto que não veio na query preserva o vínculo, mas não a área', () => {
    const r = resolverAreaEntregavel(
      entregavel({ project_id: 'p-apagado' }),
      projetos,
      sprints,
      equipes,
    );
    expect(r).toMatchObject({ area: 'outros', vinculo: 'projeto', projetoId: null });
  });
});

// ── Subtarefas ────────────────────────────────────────────────────────────
describe('subtarefas (parent_id)', () => {
  const mae = entregavel({ id: 'mae', parent_id: null });
  const filha1 = entregavel({ id: 'f1', parent_id: 'mae' });
  const filha2 = entregavel({ id: 'f2', parent_id: 'mae' });
  const neta = entregavel({ id: 'n1', parent_id: 'f1' });

  it('identifica quem é mãe de alguém no escopo', () => {
    expect([...idsDeTarefasMae([mae, filha1, filha2, neta])].sort()).toEqual(['f1', 'mae']);
  });

  it('DECISÃO: só folhas contam — mãe é agrupador e duplicaria a entrega', () => {
    expect(somenteFolhas([mae, filha1, filha2, neta]).map((e) => e.id)).toEqual(['f2', 'n1']);
  });

  it('mãe SEM filha no escopo é tarefa comum e conta', () => {
    expect(somenteFolhas([mae]).map((e) => e.id)).toEqual(['mae']);
  });

  it('parent_id órfão (mãe fora do escopo) não elimina ninguém', () => {
    expect(somenteFolhas([filha1]).map((e) => e.id)).toEqual(['f1']);
  });

  it('concluir mãe + 3 filhas conta 3 entregas, não 4', () => {
    const concluido = (id: string, parent: string | null) =>
      entregavel({ id, parent_id: parent, status: 'completed', completed_at: '2026-07-05T12:00:00.000Z' });
    const resumo = resumoDigital(
      entrada({
        entregaveis: [
          concluido('mae', null),
          concluido('f1', 'mae'),
          concluido('f2', 'mae'),
          concluido('f3', 'mae'),
        ],
      }),
    );
    expect(resumo.find((r) => r.area === 'dev')?.concluidas).toBe(3);
  });
});

// ── Pontualidade ──────────────────────────────────────────────────────────
describe('classificarPontualidade', () => {
  it('concluído NO PRAZO: completed_at <= due_date', () => {
    expect(
      classificarPontualidade(
        entregavel({ status: 'completed', due_date: '2026-07-10', completed_at: '2026-07-08T12:00:00.000Z' }),
        JANELA,
        HOJE,
      ),
    ).toBe('no_prazo');
  });

  it('concluído no PRÓPRIO dia do vencimento ainda é no prazo (due_date é DATE)', () => {
    expect(
      classificarPontualidade(
        entregavel({ status: 'completed', due_date: '2026-07-10', completed_at: '2026-07-10T23:30:00.000Z' }),
        JANELA,
        HOJE,
      ),
    ).toBe('no_prazo');
  });

  it('concluído ATRASADO: completed_at depois do due_date', () => {
    expect(
      classificarPontualidade(
        entregavel({ status: 'completed', due_date: '2026-07-10', completed_at: '2026-07-15T12:00:00.000Z' }),
        JANELA,
        HOJE,
      ),
    ).toBe('atrasado');
  });

  it('concluído SEM completed_at é INDETERMINADO — nem no prazo, nem atrasado', () => {
    expect(
      classificarPontualidade(
        entregavel({ status: 'completed', due_date: '2026-07-10', completed_at: null }),
        JANELA,
        HOJE,
      ),
    ).toBe('indeterminado');
  });

  it('em aberto com due_date no passado é ATRASO', () => {
    expect(
      classificarPontualidade(entregavel({ status: 'in_progress', due_date: '2026-07-10' }), JANELA, HOJE),
    ).toBe('aberto_vencido');
  });

  it('em aberto com due_date no futuro não é julgado', () => {
    expect(
      classificarPontualidade(entregavel({ status: 'pending', due_date: '2026-08-15' }), JANELA, HOJE),
    ).toBe('aberto_no_prazo');
  });

  it('status null é tratado como "pending" (o banco aceita null)', () => {
    expect(
      classificarPontualidade(entregavel({ status: null, due_date: '2026-07-10' }), JANELA, HOJE),
    ).toBe('aberto_vencido');
  });

  it('concluído FORA da janela não é entrega deste período', () => {
    expect(
      classificarPontualidade(
        entregavel({ status: 'completed', due_date: '2026-05-10', completed_at: '2026-05-08T12:00:00.000Z' }),
        JANELA,
        HOJE,
      ),
    ).toBe('fora_da_janela');
  });
});

describe('pontualidadeEntregaveis', () => {
  const folhas = [
    entregavel({ id: 'ok1', status: 'completed', due_date: '2026-07-10', completed_at: '2026-07-09T12:00:00.000Z' }),
    entregavel({ id: 'ok2', status: 'completed', due_date: '2026-07-20', completed_at: '2026-07-18T12:00:00.000Z' }),
    entregavel({ id: 'late', status: 'completed', due_date: '2026-07-05', completed_at: '2026-07-12T12:00:00.000Z' }),
    entregavel({ id: 'sem-data', status: 'completed', due_date: '2026-07-05', completed_at: null }),
    entregavel({ id: 'aberto-vencido', status: 'in_progress', due_date: '2026-07-02' }),
    entregavel({ id: 'aberto-ok', status: 'pending', due_date: '2026-09-01' }),
  ];

  it('separa no prazo, atrasado, indeterminado e aberto vencido', () => {
    expect(pontualidadeEntregaveis(folhas, JANELA, HOJE)).toEqual({
      noPrazo: 2,
      atrasados: 1,
      indeterminados: 1,
      abertosVencidos: 1,
      julgados: 3,
      pontualidade: 67,
    });
  });

  it('o indeterminado fica fora do numerador E do denominador', () => {
    const so2 = pontualidadeEntregaveis(
      [
        entregavel({ id: 'ok', status: 'completed', due_date: '2026-07-10', completed_at: '2026-07-09T12:00:00.000Z' }),
        entregavel({ id: 'x', status: 'completed', due_date: '2026-07-10', completed_at: null }),
      ],
      JANELA,
      HOJE,
    );
    expect(so2.julgados).toBe(1);
    expect(so2.pontualidade).toBe(100);
    expect(so2.indeterminados).toBe(1);
  });

  it('lista vazia não divide por zero', () => {
    expect(pontualidadeEntregaveis([], JANELA, HOJE)).toEqual({
      noPrazo: 0,
      atrasados: 0,
      indeterminados: 0,
      abertosVencidos: 0,
      julgados: 0,
      pontualidade: 0,
    });
  });
});

// ── Saúde do projeto ──────────────────────────────────────────────────────
describe('saudeProjetoDigital', () => {
  const aberta = (id: string, due: string) =>
    entregavel({ id, status: 'pending', due_date: due });
  const feita = (id: string) =>
    entregavel({ id, status: 'completed', due_date: '2026-07-01', completed_at: '2026-07-01T12:00:00.000Z' });

  it('projeto sem entregável não é acusado de atraso', () => {
    expect(saudeProjetoDigital(projeto(), [], HOJE)).toBe('em_dia');
  });

  it('end_date no passado torna o projeto atrasado', () => {
    expect(saudeProjetoDigital(projeto({ end_date: '2026-06-30' }), [feita('a')], HOJE)).toBe('atrasado');
  });

  it('mais de 40% das folhas vencidas e abertas = atrasado', () => {
    const folhas = [aberta('a', '2026-07-01'), aberta('b', '2026-07-02'), feita('c')];
    expect(saudeProjetoDigital(projeto(), folhas, HOJE)).toBe('atrasado');
  });

  it('entre 20% e 40% vencidas = em risco', () => {
    const folhas = [aberta('a', '2026-07-01'), feita('b'), feita('c'), feita('d')];
    expect(saudeProjetoDigital(projeto(), folhas, HOJE)).toBe('em_risco');
  });

  it('prazo apertado com pouca conclusão = em risco', () => {
    const folhas = [aberta('a', '2026-09-01'), aberta('b', '2026-09-02')];
    expect(saudeProjetoDigital(projeto({ end_date: '2026-08-05' }), folhas, HOJE)).toBe('em_risco');
  });
});

// ── Resumo ────────────────────────────────────────────────────────────────
describe('resumoDigital', () => {
  it('devolve exatamente as chaves do ResumoArea do Board', () => {
    const resumo = resumoDigital(
      entrada({ entregaveis: [entregavel({ status: 'completed', completed_at: '2026-07-05T12:00:00.000Z' })] }),
    );
    expect(Object.keys(resumo[0]).sort()).toEqual(
      ['area', 'atrasados', 'concluidas', 'emDia', 'emRisco', 'label', 'pontualidade', 'projetos'].sort(),
    );
  });

  it('consolida a linha da Digital com label do Board', () => {
    const resumo = resumoDigital(
      entrada({
        entregaveis: [
          entregavel({ id: 'a', status: 'completed', due_date: '2026-07-10', completed_at: '2026-07-08T12:00:00.000Z' }),
          entregavel({ id: 'b', status: 'completed', due_date: '2026-07-10', completed_at: '2026-07-14T12:00:00.000Z' }),
        ],
      }),
    );
    expect(resumo).toEqual([
      {
        area: 'dev',
        label: 'Dev',
        projetos: 1,
        emDia: 1,
        emRisco: 0,
        atrasados: 0,
        pontualidade: 50,
        concluidas: 2,
      },
    ]);
  });

  it('entregável de projeto Tax NÃO é contado como Digital', () => {
    const resumo = resumoDigital(
      entrada({
        projetos: [projeto({ id: 'p-tax', equipe_id: 'eq-tax' })],
        entregaveis: [
          entregavel({ project_id: 'p-tax', status: 'completed', completed_at: '2026-07-05T12:00:00.000Z' }),
        ],
      }),
    );
    expect(resumo.map((r) => r.area)).toEqual(['tax']);
    expect(resumo.find((r) => r.area === 'dev')).toBeUndefined();
  });

  it('entregável sem vínculo nenhum aparece no bucket "outros" — não some', () => {
    const resumo = resumoDigital(
      entrada({
        projetos: [],
        entregaveis: [entregavel({ project_id: null, sprint_id: null, status: 'pending' })],
      }),
    );
    expect(resumo.map((r) => r.area)).toEqual(['outros']);
    expect(resumo[0]).toMatchObject({ projetos: 0, concluidas: 0 });
  });

  it('só conta projeto com status "active"', () => {
    const resumo = resumoDigital(
      entrada({
        projetos: [projeto({ id: 'p-digital', status: 'archived' })],
        entregaveis: [entregavel({ status: 'completed', completed_at: '2026-07-05T12:00:00.000Z' })],
      }),
    );
    expect(resumo[0]).toMatchObject({ area: 'dev', projetos: 0, concluidas: 1 });
  });

  it('concluído sem completed_at não entra em "concluidas" (não dá para datar)', () => {
    const resumo = resumoDigital(
      entrada({ entregaveis: [entregavel({ status: 'completed', completed_at: null })] }),
    );
    expect(resumo[0].concluidas).toBe(0);
    expect(resumo[0].pontualidade).toBe(0);
  });

  it('respeita a janela: entrega de maio não conta em julho', () => {
    const resumo = resumoDigital(
      entrada({
        entregaveis: [
          entregavel({ id: 'maio', status: 'completed', due_date: '2026-05-10', completed_at: '2026-05-09T12:00:00.000Z' }),
        ],
      }),
    );
    expect(resumo[0].concluidas).toBe(0);
  });

  it('escopo totalmente vazio devolve lista vazia', () => {
    expect(resumoDigital(entrada({ projetos: [], entregaveis: [] }))).toEqual([]);
  });

  it('mantém a ordem de BOARD_AREAS ao devolver vários buckets', () => {
    const resumo = resumoDigital(
      entrada({
        projetos: [
          projeto({ id: 'p-digital', equipe_id: 'eq-digital' }),
          projeto({ id: 'p-tax', equipe_id: 'eq-tax' }),
        ],
        entregaveis: [
          entregavel({ id: 'a', project_id: 'p-digital' }),
          entregavel({ id: 'b', project_id: 'p-tax' }),
          entregavel({ id: 'c', project_id: null, sprint_id: null }),
        ],
      }),
    );
    expect(resumo.map((r) => r.area)).toEqual(['tax', 'dev', 'outros']);
  });
});

// ── Diagnóstico ───────────────────────────────────────────────────────────
describe('diagnosticoDigital', () => {
  it('expõe cada furo da atribuição em vez de escondê-lo', () => {
    const d = diagnosticoDigital(
      entrada({
        projetos: [
          projeto({ id: 'p-digital', equipe_id: 'eq-digital' }),
          projeto({ id: 'p-texto', equipe_id: null, area: 'Digital' }),
          projeto({ id: 'p-nada', equipe_id: null, area: null }),
          projeto({ id: 'p-morto', status: 'archived' }),
        ],
        sprints: [{ id: 's-digital', project_id: 'p-digital' }],
        entregaveis: [
          entregavel({ id: 'mae', parent_id: null }),
          entregavel({ id: 'filha', parent_id: 'mae' }),
          entregavel({ id: 'via-sprint', project_id: null, sprint_id: 's-digital' }),
          entregavel({ id: 'sem-nada', project_id: null, sprint_id: null }),
          entregavel({ id: 'apagado', project_id: 'p-fantasma' }),
          entregavel({ id: 'texto', project_id: 'p-texto' }),
          entregavel({ id: 'sem-area', project_id: 'p-nada' }),
          entregavel({ id: 'sem-data', project_id: 'p-digital', status: 'completed', completed_at: null }),
        ],
      }),
    );
    expect(d).toMatchObject({
      entregaveis: 8,
      tarefasMae: 1,
      folhas: 7,
      resolvidosViaSprint: 1,
      semVinculoDeProjeto: 1,
      projetoNaoEncontrado: 1,
      semAreaResolvida: 1,
      areaPeloTextoLivre: 1,
      concluidosSemCompletedAt: 1,
      projetosNaoAtivos: 1,
      diaReferencia: HOJE,
    });
  });

  it('conta os abertos vencidos na data de referência da janela', () => {
    const d = diagnosticoDigital(
      entrada({
        entregaveis: [
          entregavel({ id: 'a', due_date: '2026-07-01' }),
          entregavel({ id: 'b', due_date: '2026-12-01' }),
        ],
      }),
    );
    expect(d.abertosVencidos).toBe(1);
  });

  it('entrada vazia zera tudo sem NaN', () => {
    const d = diagnosticoDigital(entrada({ projetos: [], entregaveis: [] }));
    expect(d.folhas).toBe(0);
    expect(d.pontualidade.pontualidade).toBe(0);
    expect(Number.isNaN(d.pontualidade.pontualidade)).toBe(false);
  });
});
