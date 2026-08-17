import { describe, expect, it } from 'vitest';
import {
  buildBaseDaArea, buildHeatmap, buildOverdueRows, HEATMAP_MEMBROS_CONSOLIDADO,
  HEATMAP_MEMBROS_PADRAO, scopeProjects,
} from './areaDashboardData';
import type { FiscalDashProject, FiscalDashTask } from '@/hooks/useFiscalDashboardData';

function projeto(over: Partial<FiscalDashProject> = {}): FiscalDashProject {
  return {
    id: 'p1',
    name: 'Recuperação de crédito',
    status: 'active',
    estrutura_area_id: 'area-tax',
    equipe_id: null,
    external_client_id: null,
    contribuinte_id: null,
    ...over,
  } as FiscalDashProject;
}

function tarefa(over: Partial<FiscalDashTask> = {}): FiscalDashTask {
  return {
    id: 't1',
    title: 'Apurar ICMS',
    status: 'todo',
    project_id: 'p1',
    client_id: null,
    contribuinte_id: null,
    assigned_to: null,
    assigned_to_name: null,
    estimated_hours: null,
    due_date: '2026-08-01',
    ...over,
  } as FiscalDashTask;
}

const HOJE = new Date('2026-08-17T00:00:00');

describe('scopeProjects', () => {
  const doTax = projeto({ id: 'a', estrutura_area_id: 'area-tax' });
  const daOsg = projeto({ id: 'b', estrutura_area_id: 'area-osg' });
  const semArea = projeto({ id: 'c', estrutura_area_id: null });

  it('mantém só as áreas do escopo', () => {
    const ids = scopeProjects([doTax, daOsg, semArea], new Set(['area-osg']), 'osg').map(p => p.id);
    expect(ids).toEqual(['b']);
  });

  it('projeto sem área na estrutura entra no Tax (legado), não no OSG', () => {
    expect(scopeProjects([semArea], new Set(['area-tax']), 'tax').map(p => p.id)).toEqual(['c']);
    expect(scopeProjects([semArea], new Set(['area-osg']), 'osg')).toEqual([]);
  });

  it('no consolidado soma as duas áreas e leva o legado sem área', () => {
    const ids = scopeProjects(
      [doTax, daOsg, semArea], new Set(['area-tax', 'area-osg']), 'todas',
    ).map(p => p.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('no consolidado ignora área que não está no escopo lido da estrutura', () => {
    const deOutra = projeto({ id: 'd', estrutura_area_id: 'area-marketing' });
    const ids = scopeProjects([deOutra], new Set(['area-tax', 'area-osg']), 'todas').map(p => p.id);
    expect(ids).toEqual([]);
  });
});

describe('buildBaseDaArea', () => {
  it('classifica a área pelas page_categories', () => {
    expect(buildBaseDaArea([
      { id: 'area-tax', page_categories: ['tax'] },
      { id: 'area-osg', page_categories: ['osg'] },
    ])).toEqual({ 'area-tax': '/equipe/tax', 'area-osg': '/equipe/osg' });
  });

  it('cai no Tax quando a área não declara categoria', () => {
    expect(buildBaseDaArea([{ id: 'x', page_categories: null }, { id: 'y' }])).toEqual({
      x: '/equipe/tax', y: '/equipe/tax',
    });
  });
});

describe('buildOverdueRows', () => {
  const atrasada = tarefa({ id: 't-atrasada', due_date: '2026-08-10' });
  const noPrazo = tarefa({ id: 't-no-prazo', due_date: '2026-08-30' });
  const concluida = tarefa({ id: 't-done', due_date: '2026-08-01', status: 'done' });
  const projectMap = { p1: projeto({ estrutura_area_id: 'area-osg' }) };
  const resolveClientId = () => null;

  it('lista só o que venceu e ainda não está concluído', () => {
    const rows = buildOverdueRows(
      [atrasada, noPrazo, concluida], projectMap, {}, {}, resolveClientId, HOJE,
    );
    expect(rows.map(r => r.id)).toEqual(['t-atrasada']);
    expect(rows[0].daysOverdue).toBe(7);
  });

  it('sem mapa de área a linha não sugere base — quem exibe usa a da tela', () => {
    const [row] = buildOverdueRows([atrasada], projectMap, {}, {}, resolveClientId, HOJE);
    expect(row.areaBase).toBeNull();
  });

  it('com mapa de área a linha volta para a área dona do projeto', () => {
    const [row] = buildOverdueRows(
      [atrasada], projectMap, {}, {}, resolveClientId, HOJE,
      buildBaseDaArea([{ id: 'area-osg', page_categories: ['osg'] }]),
    );
    expect(row.areaBase).toBe('/equipe/osg');
  });

  it('tarefa de projeto sem área não inventa base', () => {
    const [row] = buildOverdueRows(
      [atrasada], { p1: projeto({ estrutura_area_id: null }) }, {}, {}, resolveClientId, HOJE,
      buildBaseDaArea([{ id: 'area-osg', page_categories: ['osg'] }]),
    );
    expect(row.areaBase).toBeNull();
  });
});

describe('buildHeatmap', () => {
  // Uma tarefa aberta por pessoa, vencendo amanhã, dentro da janela de 14 dias.
  const tarefasDe = (quantidade: number) => Array.from({ length: quantidade }, (_, i) => tarefa({
    id: `t${i}`, assigned_to: `pessoa-${i}`, due_date: '2026-08-18', estimated_hours: i + 1,
  }));

  it('mostra no máximo o padrão da área', () => {
    const { rows } = buildHeatmap(tarefasDe(20), {}, HOJE);
    expect(rows).toHaveLength(HEATMAP_MEMBROS_PADRAO);
  });

  it('o consolidado cabe mais gente — seis esconderia metade do time', () => {
    const { rows } = buildHeatmap(tarefasDe(20), {}, HOJE, HEATMAP_MEMBROS_CONSOLIDADO);
    expect(rows).toHaveLength(HEATMAP_MEMBROS_CONSOLIDADO);
    expect(HEATMAP_MEMBROS_CONSOLIDADO).toBeGreaterThan(HEATMAP_MEMBROS_PADRAO);
  });

  it('ordena por carga: quem tem mais horas na janela vem primeiro', () => {
    const { rows } = buildHeatmap(tarefasDe(3), {
      'pessoa-0': 'Ana Alves', 'pessoa-1': 'Bruno Braga', 'pessoa-2': 'Caio Costa',
    }, HOJE);
    expect(rows.map(r => r.label)).toEqual(['CC', 'BB', 'AA']);
  });
});
