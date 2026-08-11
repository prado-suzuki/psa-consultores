import { describe, it, expect } from 'vitest';
import {
  areasDeAcessoDaEquipe,
  caminhoDaEquipe,
  diferencaDeEquipes,
  equipesDoUsuario,
  montarGruposDeEquipe,
} from './equipesDaEstrutura';

const clusters = [
  { id: 'c-osg', name: 'OSG Cloud', is_active: true },
  { id: 'c-tax', name: 'Tax', is_active: true },
  { id: 'c-velho', name: 'Descontinuado', is_active: false },
];

const areas = [
  { id: 'a-osg', cluster_id: 'c-osg', name: 'OSG', color: '#0ea5e9', page_categories: ['osg'] },
  { id: 'a-tax', cluster_id: 'c-tax', name: 'Fiscal', color: '#10b981', page_categories: ['tax'] },
  { id: 'a-vazia', cluster_id: 'c-tax', name: 'Sem equipe', page_categories: ['tax'] },
  { id: 'a-morta', cluster_id: 'c-velho', name: 'Legado', page_categories: [] },
];

const equipes = [
  { id: 'e-osg-2', area_id: 'a-osg', name: 'Sustentação' },
  { id: 'e-osg-1', area_id: 'a-osg', name: 'Implantação' },
  { id: 'e-tax-1', area_id: 'a-tax', name: 'Apuração' },
  { id: 'e-morta', area_id: 'a-morta', name: 'Equipe do cluster inativo' },
];

describe('montarGruposDeEquipe', () => {
  const grupos = montarGruposDeEquipe(clusters, areas, equipes);

  it('agrupa por área, com o caminho "Cluster › Área"', () => {
    expect(grupos.map((g) => g.caminho)).toEqual(['OSG Cloud › OSG', 'Tax › Fiscal']);
  });

  it('ordena as equipes da área pelo nome', () => {
    expect(grupos[0].equipes.map((e) => e.name)).toEqual(['Implantação', 'Sustentação']);
  });

  it('deixa de fora área sem equipe e equipe de cluster inativo', () => {
    const ids = grupos.flatMap((g) => g.equipes.map((e) => e.id));
    expect(ids).not.toContain('e-morta');
    expect(grupos.some((g) => g.areaId === 'a-vazia')).toBe(false);
  });
});

describe('caminhoDaEquipe', () => {
  const grupos = montarGruposDeEquipe(clusters, areas, equipes);

  it('devolve o caminho completo até a equipe', () => {
    expect(caminhoDaEquipe('e-osg-1', grupos)).toBe('OSG Cloud › OSG › Implantação');
  });

  it('devolve null para equipe fora das opções', () => {
    expect(caminhoDaEquipe('e-morta', grupos)).toBeNull();
  });
});

describe('areasDeAcessoDaEquipe', () => {
  it('traduz page_categories da área em áreas de acesso', () => {
    expect(areasDeAcessoDaEquipe('e-osg-1', equipes, areas)).toEqual(['osg']);
    expect(areasDeAcessoDaEquipe('e-tax-1', equipes, areas)).toEqual(['tax']);
  });

  it('devolve vazio quando a área não tem categoria ou a equipe não existe', () => {
    expect(areasDeAcessoDaEquipe('e-morta', equipes, areas)).toEqual([]);
    expect(areasDeAcessoDaEquipe('inexistente', equipes, areas)).toEqual([]);
  });
});

describe('equipesDoUsuario', () => {
  const membros = [
    { id: 'm1', user_id: 'u-1', equipe_id: 'e-osg-1' },
    { id: 'm2', user_id: 'u-1', equipe_id: 'e-tax-1' },
    { id: 'm3', user_id: 'u-2', equipe_id: 'e-osg-1' },
  ];

  it('lista todas as equipes da pessoa', () => {
    expect(equipesDoUsuario('u-1', membros)).toEqual(['e-osg-1', 'e-tax-1']);
  });

  it('devolve vazio para quem não está em equipe nenhuma', () => {
    expect(equipesDoUsuario('u-3', membros)).toEqual([]);
  });
});

describe('diferencaDeEquipes', () => {
  it('separa o que entra do que sai', () => {
    expect(diferencaDeEquipes(['a', 'b'], ['b', 'c'])).toEqual({
      adicionar: ['c'],
      remover: ['a'],
    });
  });

  it('não mexe em nada quando a lista não mudou', () => {
    expect(diferencaDeEquipes(['a', 'b'], ['b', 'a'])).toEqual({ adicionar: [], remover: [] });
  });
});
