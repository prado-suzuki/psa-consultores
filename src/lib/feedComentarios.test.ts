import { describe, expect, it } from 'vitest';

import {
  agruparPorDia,
  agruparPorOrigem,
  autoresDoGrupo,
  chaveDeOrigem,
  chaveDoDia,
  cursorDoComentario,
  hrefDeOrigem,
  mesmoBlocoDeAutor,
  montarThreads,
  origemDoComentario,
  parentIdParaResposta,
  rotuloDoDia,
} from '@/lib/feedComentarios';

/** Meio-dia local, para as contas de dia não dependerem do fuso da máquina. */
const meioDia = (ano: number, mes: number, dia: number, hora = 12) =>
  new Date(ano, mes - 1, dia, hora).toISOString();

describe('cursorDoComentario', () => {
  it('leva o par (created_at, id) do item', () => {
    const createdAt = meioDia(2026, 7, 29);
    expect(cursorDoComentario({ id: 'c1', created_at: createdAt })).toEqual({
      createdAt,
      id: 'c1',
    });
  });
});

describe('chaveDoDia', () => {
  it('usa as partes locais da data, não o recorte do ISO', () => {
    // 23h local do dia 29 já é dia 30 em UTC quando o fuso é negativo: a chave
    // tem que continuar sendo o dia local.
    const local = new Date(2026, 6, 29, 23, 30);
    expect(chaveDoDia(local.toISOString())).toBe('2026-07-29');
  });

  it('preenche mês e dia com zero à esquerda', () => {
    expect(chaveDoDia(meioDia(2026, 1, 5))).toBe('2026-01-05');
  });
});

describe('rotuloDoDia', () => {
  const hoje = new Date(2026, 6, 29, 15, 0);

  it('nomeia hoje e ontem', () => {
    expect(rotuloDoDia('2026-07-29', hoje)).toBe('Hoje');
    expect(rotuloDoDia('2026-07-28', hoje)).toBe('Ontem');
  });

  it('escreve a data nos dias anteriores', () => {
    expect(rotuloDoDia('2026-07-27', hoje)).toBe('27 de julho de 2026');
  });

  it('atravessa a virada do mês ao calcular ontem', () => {
    const primeiroDeAgosto = new Date(2026, 7, 1, 9, 0);
    expect(rotuloDoDia('2026-07-31', primeiroDeAgosto)).toBe('Ontem');
  });
});

describe('agruparPorDia', () => {
  const hoje = new Date(2026, 6, 29, 15, 0);

  it('agrupa em blocos contíguos, preservando a ordem de entrada', () => {
    const itens = [
      { id: 'a', created_at: meioDia(2026, 7, 29, 14) },
      { id: 'b', created_at: meioDia(2026, 7, 29, 9) },
      { id: 'c', created_at: meioDia(2026, 7, 28, 18) },
      { id: 'd', created_at: meioDia(2026, 7, 27, 8) },
    ];

    const grupos = agruparPorDia(itens, hoje);

    expect(grupos.map((grupo) => [grupo.dia, grupo.rotulo])).toEqual([
      ['2026-07-29', 'Hoje'],
      ['2026-07-28', 'Ontem'],
      ['2026-07-27', '27 de julho de 2026'],
    ]);
    expect(grupos[0].itens.map((item) => item.id)).toEqual(['a', 'b']);
    expect(grupos[1].itens.map((item) => item.id)).toEqual(['c']);
  });

  it('junta num grupo só o dia que atravessa a fronteira de página', () => {
    // Simula duas páginas concatenadas cortando o dia 29 no meio: o agrupamento
    // roda sobre a lista achatada, então não pode nascer um segundo bloco "Hoje".
    const pagina1 = [{ id: 'a', created_at: meioDia(2026, 7, 29, 14) }];
    const pagina2 = [
      { id: 'b', created_at: meioDia(2026, 7, 29, 8) },
      { id: 'c', created_at: meioDia(2026, 7, 28, 8) },
    ];

    const grupos = agruparPorDia([...pagina1, ...pagina2], hoje);

    expect(grupos).toHaveLength(2);
    expect(grupos[0].itens.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('devolve lista vazia sem item', () => {
    expect(agruparPorDia([], hoje)).toEqual([]);
  });
});

describe('chaveDeOrigem', () => {
  it('separa tarefa e projeto de mesmo id', () => {
    expect(chaveDeOrigem({ entity_type: 'org_task', entity_id: 'x' })).not.toBe(
      chaveDeOrigem({ entity_type: 'org_project', entity_id: 'x' }),
    );
  });
});

describe('agruparPorOrigem', () => {
  const tarefa = (id: string, entityId: string) => ({
    id,
    entity_type: 'org_task',
    entity_id: entityId,
  });

  it('junta comentários seguidos da mesma tarefa num bloco', () => {
    const grupos = agruparPorOrigem([
      tarefa('a', 't1'),
      tarefa('b', 't1'),
      tarefa('c', 't2'),
    ]);

    expect(grupos.map((grupo) => grupo.itens.map((item) => item.id))).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
  });

  it('não reembaralha a cronologia: a mesma origem interrompida vira dois blocos', () => {
    const grupos = agruparPorOrigem([tarefa('a', 't1'), tarefa('b', 't2'), tarefa('c', 't1')]);

    expect(grupos).toHaveLength(3);
    expect(grupos.map((grupo) => grupo.chave)).toEqual([
      'org_task:t1',
      'org_task:t2',
      'org_task:t1',
    ]);
  });

  it('devolve lista vazia sem item', () => {
    expect(agruparPorOrigem([])).toEqual([]);
  });
});

describe('mesmoBlocoDeAutor', () => {
  const base = {
    author_id: 'u1',
    parent_id: null as string | null,
    created_at: meioDia(2026, 7, 29, 10),
  };

  it('continua o bloco quando é a mesma pessoa em poucos minutos', () => {
    expect(
      mesmoBlocoDeAutor({ ...base, created_at: new Date(2026, 6, 29, 10, 3).toISOString() }, base),
    ).toBe(true);
  });

  it('abre bloco novo passada a janela de dez minutos', () => {
    expect(
      mesmoBlocoDeAutor({ ...base, created_at: new Date(2026, 6, 29, 10, 41).toISOString() }, base),
    ).toBe(false);
  });

  it('abre bloco novo para outra pessoa', () => {
    expect(mesmoBlocoDeAutor({ ...base, author_id: 'u2' }, base)).toBe(false);
  });

  it('abre bloco novo quando uma das falas é resposta de outra thread', () => {
    expect(mesmoBlocoDeAutor({ ...base, parent_id: 'raiz' }, base)).toBe(false);
  });

  it('nunca agrupa autor anônimo — dois removidos não são a mesma pessoa', () => {
    const anonimo = { ...base, author_id: null };
    expect(mesmoBlocoDeAutor(anonimo, anonimo)).toBe(false);
  });

  it('não agrupa o primeiro item do bloco', () => {
    expect(mesmoBlocoDeAutor(base, undefined)).toBe(false);
  });
});

describe('montarThreads', () => {
  const item = (id: string, hora: number, parentId: string | null = null, autor = 'u1') => ({
    id,
    parent_id: parentId,
    created_at: meioDia(2026, 7, 29, hora),
    author_id: autor,
  });

  it('pendura a resposta na raiz e lê a conversa do mais antigo ao mais novo', () => {
    // Entra na ordem do feed (mais novo primeiro) e sai na ordem de leitura.
    const threads = montarThreads([
      item('r2', 17, 'raiz'),
      item('r1', 15, 'raiz'),
      item('raiz', 10),
    ]);

    expect(threads).toHaveLength(1);
    expect(threads[0].raiz?.id).toBe('raiz');
    expect(threads[0].respostas.map((resposta) => resposta.id)).toEqual(['r1', 'r2']);
  });

  it('ordena as conversas pelo começo de cada uma', () => {
    const threads = montarThreads([item('b', 16), item('a2', 15, 'a'), item('a', 9)]);

    expect(threads.map((thread) => thread.raizId)).toEqual(['a', 'b']);
  });

  it('deixa a resposta solta quando a raiz não veio na leva', () => {
    const threads = montarThreads([item('solta', 15, 'raiz-de-outra-pagina')]);

    expect(threads[0].raiz).toBeNull();
    expect(threads[0].raizId).toBe('raiz-de-outra-pagina');
    expect(threads[0].respostas.map((resposta) => resposta.id)).toEqual(['solta']);
  });

  it('marca continuação de bloco entre raízes seguidas da mesma pessoa', () => {
    const threads = montarThreads([item('r2', 10), item('r1', 9, null)]);
    // 9h e 10h estão fora da janela de dez minutos: não é continuação.
    expect(threads.map((thread) => thread.continuaBloco)).toEqual([false, false]);

    const seguidas = montarThreads([
      { ...item('b', 10), created_at: new Date(2026, 6, 29, 10, 4).toISOString() },
      { ...item('a', 10), created_at: new Date(2026, 6, 29, 10, 0).toISOString() },
    ]);
    expect(seguidas.map((thread) => thread.continuaBloco)).toEqual([false, true]);
  });

  it('não continua bloco depois de uma thread que abriu respostas', () => {
    const seguidas = montarThreads([
      { ...item('b', 10), created_at: new Date(2026, 6, 29, 10, 6).toISOString() },
      { ...item('a2', 10, 'a'), created_at: new Date(2026, 6, 29, 10, 3).toISOString() },
      { ...item('a', 10), created_at: new Date(2026, 6, 29, 10, 0).toISOString() },
    ]);

    expect(seguidas.map((thread) => [thread.raizId, thread.continuaBloco])).toEqual([
      ['a', false],
      ['b', false],
    ]);
  });

  it('não continua bloco a thread que abre respostas — o avatar ancora o fio', () => {
    const seguidas = montarThreads([
      { ...item('b2', 10, 'b'), created_at: new Date(2026, 6, 29, 10, 8).toISOString() },
      { ...item('b', 10), created_at: new Date(2026, 6, 29, 10, 4).toISOString() },
      { ...item('a', 10), created_at: new Date(2026, 6, 29, 10, 0).toISOString() },
    ]);

    expect(seguidas.map((thread) => [thread.raizId, thread.continuaBloco])).toEqual([
      ['a', false],
      ['b', false],
    ]);
  });

  it('devolve lista vazia sem item', () => {
    expect(montarThreads([])).toEqual([]);
  });
});

describe('autoresDoGrupo', () => {
  it('lista quem falou sem repetir, na ordem de aparição', () => {
    expect(
      autoresDoGrupo([
        { author_id: 'u1', author_name: 'Ana' },
        { author_id: 'u2', author_name: 'Bruno' },
        { author_id: 'u1', author_name: 'Ana' },
      ]),
    ).toEqual([
      { id: 'u1', nome: 'Ana' },
      { id: 'u2', nome: 'Bruno' },
    ]);
  });

  it('nomeia o autor removido e o mantém como um só', () => {
    expect(
      autoresDoGrupo([
        { author_id: null, author_name: null },
        { author_id: null, author_name: null },
      ]),
    ).toEqual([{ id: null, nome: 'Usuário removido' }]);
  });
});

describe('hrefDeOrigem', () => {
  it('aponta para o deep-link da tarefa em cada área', () => {
    const item = { entity_type: 'org_task', entity_id: 't1' };
    expect(hrefDeOrigem(item, 'tax')).toBe('/equipe/tax/projetos/tarefas?taskId=t1');
    expect(hrefDeOrigem(item, 'osg')).toBe('/equipe/osg/projetos/tarefas?taskId=t1');
  });

  it('aponta para o deep-link do projeto em cada área', () => {
    const item = { entity_type: 'org_project', entity_id: 'p1' };
    expect(hrefDeOrigem(item, 'tax')).toBe('/equipe/tax/projetos/cadastro?projetoId=p1');
    expect(hrefDeOrigem(item, 'osg')).toBe('/equipe/osg/projetos/cadastro?projetoId=p1');
  });
});

describe('origemDoComentario', () => {
  it('descreve a tarefa com o projeto ao lado', () => {
    expect(
      origemDoComentario({
        entity_type: 'org_task',
        entity_title: 'Apurar ICMS',
        project_name: 'Recuperação 2026',
      }),
    ).toEqual({
      rotulo: 'na tarefa',
      titulo: 'Apurar ICMS',
      projeto: 'Recuperação 2026',
      cliente: null,
    });
  });

  it('descreve o projeto sem repetir o nome dele', () => {
    expect(
      origemDoComentario({
        entity_type: 'org_project',
        entity_title: 'Recuperação 2026',
        project_name: 'Recuperação 2026',
      }),
    ).toEqual({ rotulo: 'no projeto', titulo: 'Recuperação 2026', projeto: null, cliente: null });
  });

  it('tem texto de reserva quando o título não veio', () => {
    expect(
      origemDoComentario({ entity_type: 'org_task', entity_title: null, project_name: null }),
    ).toEqual({ rotulo: 'na tarefa', titulo: 'Tarefa sem título', projeto: null, cliente: null });
  });

  it('leva o cliente quando ele acrescenta contexto', () => {
    expect(
      origemDoComentario(
        {
          entity_type: 'org_task',
          entity_title: 'Apurar ICMS',
          project_name: 'Recuperação 2026',
        },
        'Frigorífico Vale',
      ).cliente,
    ).toBe('Frigorífico Vale');
  });

  it('omite o cliente já contido no nome do projeto, ignorando acento e caixa', () => {
    expect(
      origemDoComentario(
        {
          entity_type: 'org_task',
          entity_title: 'Apurar ICMS',
          project_name: 'Recuperação 2026 — FRIGORIFICO VALE',
        },
        'Frigorífico Vale',
      ).cliente,
    ).toBeNull();
  });

  it('omite o cliente já contido no nome do projeto comentado', () => {
    expect(
      origemDoComentario(
        {
          entity_type: 'org_project',
          entity_title: 'Reestruturação — Grupo Andrade',
          project_name: 'Reestruturação — Grupo Andrade',
        },
        'Grupo Andrade',
      ).cliente,
    ).toBeNull();
  });

  it('mostra o cliente na tarefa sem projeto', () => {
    expect(
      origemDoComentario(
        { entity_type: 'org_task', entity_title: 'Conferir matrícula', project_name: null },
        'Fazenda Boa Vista',
      ),
    ).toEqual({
      rotulo: 'na tarefa',
      titulo: 'Conferir matrícula',
      projeto: null,
      cliente: 'Fazenda Boa Vista',
    });
  });
});

describe('parentIdParaResposta', () => {
  it('pendura na raiz quando o item é raiz', () => {
    expect(parentIdParaResposta({ id: 'raiz', parent_id: null })).toBe('raiz');
  });

  it('pendura na mesma raiz quando o item já é resposta (thread de um nível)', () => {
    expect(parentIdParaResposta({ id: 'resposta', parent_id: 'raiz' })).toBe('raiz');
  });
});
