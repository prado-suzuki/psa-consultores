import { describe, expect, it } from 'vitest';

import {
  aplicarFiltrosNaUrl,
  contarFiltrosAtivos,
  desdeDoPeriodo,
  filtrosDaUrl,
  FILTROS_VAZIOS,
  temFiltroAtivo,
  type FeedFiltros,
} from '@/lib/feedFiltros';

/** Meia-noite local, que é onde os presets de período ancoram. */
const meiaNoite = (ano: number, mes: number, dia: number) => new Date(ano, mes - 1, dia).toISOString();

describe('desdeDoPeriodo', () => {
  it('não tem piso quando o período é qualquer data', () => {
    expect(desdeDoPeriodo('sempre')).toBeNull();
  });

  it('corta na meia-noite local, não no instante da consulta', () => {
    const agora = new Date(2026, 6, 30, 15, 42, 7);
    expect(desdeDoPeriodo('hoje', agora)).toBe(meiaNoite(2026, 7, 30));
  });

  it('conta hoje como o primeiro dos 7 dias', () => {
    const agora = new Date(2026, 6, 30, 9);
    expect(desdeDoPeriodo('7d', agora)).toBe(meiaNoite(2026, 7, 24));
  });

  it('conta hoje como o primeiro dos 30 dias, atravessando o mês', () => {
    const agora = new Date(2026, 6, 30, 9);
    expect(desdeDoPeriodo('30d', agora)).toBe(meiaNoite(2026, 7, 1));
  });

  it('atravessa a virada do ano', () => {
    const agora = new Date(2026, 0, 3, 20);
    expect(desdeDoPeriodo('7d', agora)).toBe(meiaNoite(2025, 12, 28));
  });

  it('é estável ao longo do dia — todas as páginas da rolagem pegam o mesmo corte', () => {
    const manha = desdeDoPeriodo('7d', new Date(2026, 6, 30, 8, 1));
    const noite = desdeDoPeriodo('7d', new Date(2026, 6, 30, 23, 59));
    expect(manha).toBe(noite);
  });
});

describe('contarFiltrosAtivos', () => {
  it('não conta nada no recorte vazio', () => {
    expect(contarFiltrosAtivos(FILTROS_VAZIOS)).toBe(0);
    expect(temFiltroAtivo(FILTROS_VAZIOS)).toBe(false);
  });

  it('conta um por filtro ligado, período incluído', () => {
    const filtros: FeedFiltros = {
      clienteId: 'cli-1',
      projetoId: 'proj-1',
      autorId: 'user-1',
      apenasMencoes: true,
      periodo: '7d',
    };
    expect(contarFiltrosAtivos(filtros)).toBe(5);
    expect(temFiltroAtivo(filtros)).toBe(true);
  });

  it('trata o período padrão como filtro desligado', () => {
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, periodo: 'sempre' })).toBe(0);
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, periodo: 'hoje' })).toBe(1);
  });
});

describe('filtrosDaUrl', () => {
  it('devolve o recorte vazio quando a URL não pede nada', () => {
    expect(filtrosDaUrl(new URLSearchParams())).toEqual(FILTROS_VAZIOS);
  });

  it('lê os cinco filtros', () => {
    const params = new URLSearchParams(
      'cliente=cli-1&projeto=proj-1&autor=user-1&mencoes=1&periodo=30d',
    );
    expect(filtrosDaUrl(params)).toEqual({
      clienteId: 'cli-1',
      projetoId: 'proj-1',
      autorId: 'user-1',
      apenasMencoes: true,
      periodo: '30d',
    });
  });

  it('só liga menções com o valor 1 — nada de "0" ligando o filtro', () => {
    expect(filtrosDaUrl(new URLSearchParams('mencoes=0')).apenasMencoes).toBe(false);
    expect(filtrosDaUrl(new URLSearchParams('mencoes=')).apenasMencoes).toBe(false);
  });

  it('cai no padrão em período desconhecido, em vez de quebrar a tela', () => {
    expect(filtrosDaUrl(new URLSearchParams('periodo=ontem')).periodo).toBe('sempre');
  });

  it('trata parâmetro vazio como ausência de filtro', () => {
    expect(filtrosDaUrl(new URLSearchParams('cliente=&projeto=')).clienteId).toBeNull();
  });
});

describe('aplicarFiltrosNaUrl', () => {
  it('escreve só o que está ligado', () => {
    const params = aplicarFiltrosNaUrl(new URLSearchParams(), {
      ...FILTROS_VAZIOS,
      clienteId: 'cli-1',
      periodo: 'hoje',
    });
    expect(params.toString()).toBe('cliente=cli-1&periodo=hoje');
  });

  it('tira da URL o filtro que foi desligado', () => {
    const antes = new URLSearchParams('cliente=cli-1&mencoes=1&periodo=7d');
    const depois = aplicarFiltrosNaUrl(antes, FILTROS_VAZIOS);
    expect(depois.toString()).toBe('');
  });

  it('preserva os parâmetros que não são do feed (deep-link de tarefa)', () => {
    const antes = new URLSearchParams('taskId=task-9');
    const depois = aplicarFiltrosNaUrl(antes, { ...FILTROS_VAZIOS, autorId: 'user-1' });
    expect(depois.get('taskId')).toBe('task-9');
    expect(depois.get('autor')).toBe('user-1');
  });

  it('não altera o objeto recebido', () => {
    const antes = new URLSearchParams('cliente=cli-1');
    aplicarFiltrosNaUrl(antes, FILTROS_VAZIOS);
    expect(antes.get('cliente')).toBe('cli-1');
  });

  it('faz a volta completa: URL → filtros → URL', () => {
    const filtros: FeedFiltros = {
      clienteId: 'cli-1',
      projetoId: 'proj-1',
      autorId: 'user-1',
      apenasMencoes: true,
      periodo: '30d',
    };
    expect(filtrosDaUrl(aplicarFiltrosNaUrl(new URLSearchParams(), filtros))).toEqual(filtros);
  });
});
