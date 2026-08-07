import { describe, it, expect } from 'vitest';
import {
  SEM_AREA,
  agruparUsuariosPorArea,
  contarUsuariosPorArea,
  resolverAreasPorUsuario,
  usuarioEstaNaArea,
} from './acessosPorArea';

const areas = [
  { id: 'a-osg', name: 'OSG', color: '#0ea5e9', gestor_chamados_id: 'u-gestor-area' },
  { id: 'a-tax', name: 'Tax', color: '#10b981', gestor_chamados_id: null },
];

const equipes = [
  { id: 'e-osg-1', area_id: 'a-osg', gestor_id: 'u-gestor-equipe' },
  { id: 'e-tax-1', area_id: 'a-tax', gestor_id: null },
  { id: 'e-orfa', area_id: 'a-inativa', gestor_id: null },
];

const membros = [
  { user_id: 'u-membro', equipe_id: 'e-osg-1' },
  { user_id: 'u-duas-areas', equipe_id: 'e-osg-1' },
  { user_id: 'u-duas-areas', equipe_id: 'e-tax-1' },
  { user_id: 'u-orfao', equipe_id: 'e-orfa' },
];

describe('resolverAreasPorUsuario', () => {
  const resolvido = resolverAreasPorUsuario(membros, equipes, areas);

  it('resolve a área de quem é membro de equipe', () => {
    expect(resolvido['u-membro']).toEqual([{ id: 'a-osg', name: 'OSG', color: '#0ea5e9' }]);
  });

  it('inclui gestor de equipe e gestor de chamados da área', () => {
    expect(resolvido['u-gestor-equipe']?.[0].id).toBe('a-osg');
    expect(resolvido['u-gestor-area']?.[0].id).toBe('a-osg');
  });

  it('acumula todas as áreas de quem está em mais de uma, em ordem alfabética', () => {
    expect(resolvido['u-duas-areas']?.map((a) => a.name)).toEqual(['OSG', 'Tax']);
  });

  it('ignora equipe apontando para área inativa/inexistente', () => {
    expect(resolvido['u-orfao']).toBeUndefined();
  });
});

describe('usuarioEstaNaArea', () => {
  const resolvido = resolverAreasPorUsuario(membros, equipes, areas);

  it('casa a área do usuário', () => {
    expect(usuarioEstaNaArea('u-membro', 'a-osg', resolvido)).toBe(true);
    expect(usuarioEstaNaArea('u-membro', 'a-tax', resolvido)).toBe(false);
  });

  it('SEM_AREA pega só quem não tem vínculo', () => {
    expect(usuarioEstaNaArea('u-fora', SEM_AREA, resolvido)).toBe(true);
    expect(usuarioEstaNaArea('u-membro', SEM_AREA, resolvido)).toBe(false);
  });
});

describe('contarUsuariosPorArea', () => {
  it('conta em cada área e joga quem não tem vínculo em SEM_AREA', () => {
    const resolvido = resolverAreasPorUsuario(membros, equipes, areas);
    const contagem = contarUsuariosPorArea(
      ['u-membro', 'u-duas-areas', 'u-cliente', 'u-orfao'],
      resolvido,
    );

    expect(contagem['a-osg']).toBe(2);
    expect(contagem['a-tax']).toBe(1);
    expect(contagem[SEM_AREA]).toBe(2);
  });
});

describe('agruparUsuariosPorArea', () => {
  const resolvido = resolverAreasPorUsuario(membros, equipes, areas);

  it('agrupa por área em ordem alfabética com "Sem área" no fim', () => {
    const grupos = agruparUsuariosPorArea(
      [{ id: 'u-cliente' }, { id: 'u-duas-areas' }, { id: 'u-membro' }],
      resolvido,
    );

    expect(grupos.map((g) => g.area?.name ?? 'sem')).toEqual(['OSG', 'Tax', 'sem']);
    expect(grupos[0].usuarios.map((u) => u.id)).toEqual(['u-duas-areas', 'u-membro']);
    expect(grupos[1].usuarios.map((u) => u.id)).toEqual(['u-duas-areas']);
    expect(grupos[2].usuarios.map((u) => u.id)).toEqual(['u-cliente']);
  });

  it('preserva a ordem recebida dentro do grupo', () => {
    const grupos = agruparUsuariosPorArea(
      [{ id: 'u-membro' }, { id: 'u-gestor-equipe' }, { id: 'u-duas-areas' }],
      resolvido,
    );

    expect(grupos[0].usuarios.map((u) => u.id)).toEqual([
      'u-membro',
      'u-gestor-equipe',
      'u-duas-areas',
    ]);
  });
});
