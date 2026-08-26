import { describe, it, expect } from 'vitest';
import {
  computeLideres, computeExecutores, computeAvailableMembers, splitProjectMembers,
} from './projetoEquipe';

interface M { id: string; first_name: string; last_name: string; }
const m = (id: string): M => ({ id, first_name: id, last_name: 'x' });

// `x1` não tem linha em `roles`: é a forma como admin e cliente chegam ao front,
// já que a consulta de papéis só traz lider/sublider/team_member.
const members: M[] = [m('l1'), m('l2'), m('e1'), m('e2'), m('e3'), m('x1')];
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
  it('sem equipe: retorna team_member, sublider e lider', () => {
    expect(computeExecutores(members, roles, null, [], '').map(x => x.id))
      .toEqual(['l1', 'l2', 'e1', 'e2', 'e3']);
  });

  it('líder que é membro da equipe entra na lista, ao lado dos demais', () => {
    // Caso relatado: a líder da Equipe Pontuais é a responsável executora dos
    // projetos de Planejamento Tributário e sumia do select.
    expect(computeExecutores(members, roles, 'eq1', ['l1', 'e1', 'e3'], '').map(x => x.id))
      .toEqual(['l1', 'e1', 'e3']);
  });

  it('quem não tem papel na consulta (admin, cliente) fica fora, mesmo estando na equipe', () => {
    expect(computeExecutores(members, roles, 'eq1', ['x1', 'e1'], '').map(x => x.id)).toEqual(['e1']);
  });

  it('com equipe: restringe aos membros da equipe, mantendo o responsável já escolhido', () => {
    expect(computeExecutores(members, roles, 'eq1', ['e1'], 'e3').map(x => x.id)).toEqual(['e1', 'e3']);
  });

  it('com equipe cujo filtro esvazia: cai de volta para todos os elegíveis', () => {
    // equipeMemberIds aponta só para quem não é elegível e nada foi escolhido
    expect(computeExecutores(members, roles, 'eq1', ['x1'], '').map(x => x.id))
      .toEqual(['l1', 'l2', 'e1', 'e2', 'e3']);
  });
});

describe('splitProjectMembers', () => {
  it('separa pelo papel no projeto: líder no campo de líder, responsável no de membros', () => {
    const rows = [{ user_id: 'l1', role: 'leader' }, { user_id: 'l2', role: 'responsible' }];
    expect(splitProjectMembers(rows, 'l1')).toEqual({ leaderIds: ['l1'], memberIds: ['l2'] });
  });

  it('líder e responsável na mesma pessoa: o leader_id repõe a linha "leader" que não foi gravada', () => {
    const rows = [{ user_id: 'l1', role: 'responsible' }, { user_id: 'e1', role: 'member' }];
    expect(splitProjectMembers(rows, 'l1')).toEqual({ leaderIds: ['l1'], memberIds: ['e1'] });
  });

  it('o leader_id abre a lista, para o salvamento não trocar o líder do projeto', () => {
    // A consulta de membros não tem ORDER BY: sem isso, `leader_ids[0]` mudaria
    // conforme a ordem em que as linhas voltaram do banco.
    const rows = [{ user_id: 'l2', role: 'leader' }, { user_id: 'l1', role: 'leader' }];
    expect(splitProjectMembers(rows, 'l1').leaderIds).toEqual(['l1', 'l2']);
  });

  it('sem leader_id: usa só as linhas gravadas', () => {
    const rows = [{ user_id: 'l1', role: 'leader' }, { user_id: 'e1', role: 'member' }];
    expect(splitProjectMembers(rows, null)).toEqual({ leaderIds: ['l1'], memberIds: ['e1'] });
  });

  it('papel fora dos três conhecidos cai em membros, como o default da coluna', () => {
    expect(splitProjectMembers([{ user_id: 'e1', role: 'qualquer' }])).toEqual({
      leaderIds: [], memberIds: ['e1'],
    });
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
