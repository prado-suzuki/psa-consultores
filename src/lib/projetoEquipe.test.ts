import { describe, it, expect } from 'vitest';
import { computeLideres, computeExecutores, computeAvailableMembers } from './projetoEquipe';

interface M { id: string; first_name: string; last_name: string; }
const m = (id: string): M => ({ id, first_name: id, last_name: 'x' });

const members: M[] = [m('l1'), m('l2'), m('e1'), m('e2'), m('e3')];
const roles = [
  { user_id: 'l1', role: 'lider' },
  { user_id: 'l2', role: 'lider' },
  { user_id: 'e1', role: 'team_member' },
  { user_id: 'e2', role: 'sublider' },
  { user_id: 'e3', role: 'team_member' },
];

describe('computeLideres', () => {
  it('sem equipe: retorna todos os perfis com papel lider', () => {
    expect(computeLideres(members, roles, null, [], []).map(x => x.id)).toEqual(['l1', 'l2']);
  });

  it('com equipe: restringe aos líderes da equipe, mantendo os já selecionados', () => {
    expect(computeLideres(members, roles, 'eq1', ['l1'], ['l2']).map(x => x.id)).toEqual(['l1', 'l2']);
  });

  it('com equipe cujo filtro esvazia: cai de volta para todos os líderes', () => {
    // equipeLiderIds aponta para alguém sem papel lider e nada selecionado
    expect(computeLideres(members, roles, 'eq1', ['e1'], []).map(x => x.id)).toEqual(['l1', 'l2']);
  });
});

describe('computeExecutores', () => {
  it('sem equipe: retorna team_member e sublider', () => {
    expect(computeExecutores(members, roles, null, [], '').map(x => x.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('com equipe: restringe aos membros da equipe, mantendo o responsável já escolhido', () => {
    expect(computeExecutores(members, roles, 'eq1', ['e1'], 'e3').map(x => x.id)).toEqual(['e1', 'e3']);
  });

  it('com equipe cujo filtro esvazia: cai de volta para todos os elegíveis', () => {
    expect(computeExecutores(members, roles, 'eq1', ['l1'], '').map(x => x.id)).toEqual(['e1', 'e2', 'e3']);
  });
});

describe('computeAvailableMembers', () => {
  it('sem equipe e sem seleção: vazio', () => {
    expect(computeAvailableMembers(members, null, [], [], [], false, [])).toEqual([]);
  });

  it('com equipe: membros da equipe menos os líderes selecionados', () => {
    const result = computeAvailableMembers(members, 'eq1', ['e1', 'e2', 'e3'], ['e1'], [], false, []);
    expect(result.map(x => x.id)).toEqual(['e2', 'e3']);
  });

  it('sem equipe mas com membros já selecionados: retorna os selecionados (menos líderes)', () => {
    const result = computeAvailableMembers(members, null, [], ['l1'], ['e2'], false, []);
    expect(result.map(x => x.id)).toEqual(['e2']);
  });

  it('multidisciplinar: união de todas as áreas menos os líderes', () => {
    const groups = [{ members: [m('e1'), m('e2')] }, { members: [m('e2'), m('e3')] }];
    const result = computeAvailableMembers(members, null, [], ['e1'], [], true, groups);
    expect(result.map(x => x.id).sort()).toEqual(['e2', 'e3']);
  });
});
