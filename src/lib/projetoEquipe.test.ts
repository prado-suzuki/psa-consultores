import { describe, it, expect } from 'vitest';
import {
  computeLideres, computeExecutores, computeAvailableMembers, splitProjectMembers,
  clusterIdDaArea, computeOfferedAreaGroups, computeClustersExtras, computeQuadrosDoProjeto,
  type AreaComEquipes,
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

// A estrutura real em 08/09/2026, reduzida ao que estas funções leem: o cluster
// TAX tem UMA área com quatro equipes (Fiscal, Fixos, Pontuais e Sinop — é o
// caso que motivou o recorte por cluster) e a OSG tem uma equipe só. `robo` está
// nos dois clusters, como a Automação PSA, que é a única pessoa da empresa
// nessa situação e a que derrubou um projeto do Tax no quadro da OSG.
const equipe = (equipe_id: string, equipe_name: string, ids: string[]) => ({
  equipe_id, equipe_name, members: ids.map(m),
});
const AREAS: AreaComEquipes<M>[] = [
  {
    area_id: 'a-tax', area_name: 'Tax', cluster_id: 'c-tax', cluster_name: 'TAX',
    members: [m('fis1'), m('fix1'), m('pon1'), m('sin1'), m('robo')],
    equipes: [
      equipe('e-fiscal', 'Fiscal', ['fis1', 'robo']),
      equipe('e-fixos', 'Fixos', ['fix1']),
      equipe('e-pontuais', 'Pontuais', ['pon1']),
      equipe('e-sinop', 'Sinop', ['sin1']),
    ],
  },
  {
    area_id: 'a-osg', area_name: 'OSG', cluster_id: 'c-osg', cluster_name: 'OSG',
    members: [m('osg1'), m('robo')],
    equipes: [equipe('e-osg', 'Equipe OSG', ['osg1', 'robo'])],
  },
  {
    area_id: 'a-digital', area_name: 'Digital', cluster_id: 'c-pps', cluster_name: 'PSA Prado Suzuki',
    members: [m('dig1')],
    equipes: [equipe('e-digital', 'Equipe Digital', ['dig1'])],
  },
];

describe('clusterIdDaArea', () => {
  it('resolve o cluster pela área gravada no projeto', () => {
    expect(clusterIdDaArea(AREAS, 'a-tax')).toBe('c-tax');
  });

  it('área vazia ou desconhecida não resolve cluster', () => {
    expect(clusterIdDaArea(AREAS, null)).toBeNull();
    expect(clusterIdDaArea(AREAS, 'a-que-nao-existe')).toBeNull();
  });
});

describe('computeOfferedAreaGroups', () => {
  it('com equipe: oferece o cluster do projeto inteiro, e só ele', () => {
    // O pedido que originou isto: cliente 100% Tax, e a caixa de Membros só
    // deixava escolher a Equipe Fiscal.
    const grupos = computeOfferedAreaGroups(AREAS, false, 'c-tax', []);
    expect(grupos.map(g => g.area_id)).toEqual(['a-tax']);
    expect(grupos[0].equipes.map(e => e.equipe_name)).toEqual(['Fiscal', 'Fixos', 'Pontuais', 'Sinop']);
  });

  it('multidisciplinar: volta a oferecer a casa inteira', () => {
    expect(computeOfferedAreaGroups(AREAS, true, 'c-tax', []).map(g => g.area_id))
      .toEqual(['a-tax', 'a-osg', 'a-digital']);
  });

  it('sem cluster resolvido: não oferece nada, para a tela cair no corte por equipe', () => {
    expect(computeOfferedAreaGroups(AREAS, false, null, [])).toEqual([]);
  });

  it('tira os líderes escolhidos, e some a equipe que fica vazia', () => {
    const grupos = computeOfferedAreaGroups(AREAS, false, 'c-tax', ['fix1']);
    expect(grupos[0].members.map(x => x.id)).not.toContain('fix1');
    expect(grupos[0].equipes.map(e => e.equipe_name)).toEqual(['Fiscal', 'Pontuais', 'Sinop']);
  });
});

describe('computeClustersExtras', () => {
  it('marca quem está em equipe de outro cluster, mesmo aparecendo no grupo daqui', () => {
    // `robo` está na Fiscal (TAX) E na Equipe OSG: escolhê-la pelo grupo Tax
    // ainda publica o projeto no quadro da OSG, porque
    // `resolve_user_cluster_ids` olha TODAS as equipes da pessoa.
    expect(computeClustersExtras(AREAS, 'c-tax')).toEqual({
      robo: ['OSG'],
      osg1: ['OSG'],
      dig1: ['PSA Prado Suzuki'],
    });
  });

  it('quem só existe no cluster do projeto não recebe marca', () => {
    expect(computeClustersExtras(AREAS, 'c-tax').fis1).toBeUndefined();
  });
});

describe('computeQuadrosDoProjeto', () => {
  it('só o quadro do projeto quando todo mundo é de casa', () => {
    expect(computeQuadrosDoProjeto(AREAS, ['fis1', 'fix1', 'sin1'], 'TAX')).toEqual(['TAX']);
  });

  it('a pessoa de dois clusters acrescenta o segundo quadro', () => {
    expect(computeQuadrosDoProjeto(AREAS, ['fis1', 'robo'], 'TAX')).toEqual(['OSG', 'TAX']);
  });

  it('sem ninguém escolhido, resta o quadro da própria área', () => {
    expect(computeQuadrosDoProjeto(AREAS, [], 'TAX')).toEqual(['TAX']);
  });
});
