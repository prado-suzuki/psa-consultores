import { describe, expect, it } from 'vitest';

import {
  agruparPorDia,
  chaveDoDia,
  cursorDoComentario,
  hrefDeOrigem,
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
    ).toEqual({ rotulo: 'na tarefa', titulo: 'Apurar ICMS', projeto: 'Recuperação 2026' });
  });

  it('descreve o projeto sem repetir o nome dele', () => {
    expect(
      origemDoComentario({
        entity_type: 'org_project',
        entity_title: 'Recuperação 2026',
        project_name: 'Recuperação 2026',
      }),
    ).toEqual({ rotulo: 'no projeto', titulo: 'Recuperação 2026', projeto: null });
  });

  it('tem texto de reserva quando o título não veio', () => {
    expect(
      origemDoComentario({ entity_type: 'org_task', entity_title: null, project_name: null }),
    ).toEqual({ rotulo: 'na tarefa', titulo: 'Tarefa sem título', projeto: null });
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
