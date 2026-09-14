import { describe, it, expect } from 'vitest';
import {
  areasDeAcessoDaEquipe,
  caminhoDaEquipe,
  caminhoDeQualquerEquipe,
  colunasDeEquipe,
  colunasDeEquipeDaMatriz,
  diferencaDeEquipes,
  equipesDoUsuario,
  equipesPorUsuario,
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

/* As duas funções que a matriz de acessos usa para montar as colunas de equipe.
   Acrescentadas em 14/09/2026, quando a terceira dimensão entrou. */
describe('colunasDeEquipe', () => {
  const grupos = montarGruposDeEquipe(clusters, areas, equipes);

  it('achata mantendo a ordem de caminho — irmãs da mesma área ficam vizinhas', () => {
    const colunas = colunasDeEquipe(grupos);
    const caminhos = colunas.map((c) => c.caminhoDaArea);
    // Cada caminho aparece num bloco contínuo: nenhum volta depois de outro.
    const vistos = new Set<string>();
    let anterior = '';
    for (const caminho of caminhos) {
      if (caminho !== anterior) {
        expect(vistos.has(caminho)).toBe(false);
        vistos.add(caminho);
        anterior = caminho;
      }
    }
  });

  it('cada coluna carrega o caminho da área — o nome sozinho não localiza', () => {
    for (const coluna of colunasDeEquipe(grupos)) {
      expect(coluna.caminhoDaArea).toContain('›');
      expect(coluna.nome).toBeTruthy();
    }
  });

  it('devolve exatamente as equipes que o seletor oferece', () => {
    expect(colunasDeEquipe(grupos).map((c) => c.id).sort()).toEqual(
      grupos.flatMap((g) => g.equipes.map((e) => e.id)).sort(),
    );
  });

  it('sem grupos, sem colunas', () => {
    expect(colunasDeEquipe([])).toEqual([]);
  });
});

describe('equipesPorUsuario', () => {
  it('agrupa numa passada, e quem está em duas equipes fica com as duas', () => {
    const mapa = equipesPorUsuario([
      { id: 'v1', user_id: 'u-a', equipe_id: 'e-1' },
      { id: 'v2', user_id: 'u-a', equipe_id: 'e-2' },
      { id: 'v3', user_id: 'u-b', equipe_id: 'e-1' },
    ]);
    expect([...mapa['u-a']].sort()).toEqual(['e-1', 'e-2']);
    expect([...mapa['u-b']]).toEqual(['e-1']);
  });

  it('concorda com `equipesDoUsuario`, que é a leitura de um por vez', () => {
    const membros = [
      { id: 'v1', user_id: 'u-a', equipe_id: 'e-1' },
      { id: 'v2', user_id: 'u-a', equipe_id: 'e-2' },
      { id: 'v3', user_id: 'u-b', equipe_id: 'e-1' },
    ];
    const mapa = equipesPorUsuario(membros);
    for (const userId of ['u-a', 'u-b']) {
      expect([...(mapa[userId] ?? [])].sort()).toEqual(equipesDoUsuario(userId, membros).sort());
    }
  });

  it('quem não é membro de nada nem aparece no mapa', () => {
    expect(equipesPorUsuario([])['u-z']).toBeUndefined();
  });
});

/* A REGRA QUE SEPARA A MATRIZ DO SELETOR, e o defeito que ela conserta.
   Em 14/09/2026 produção tinha 15 vínculos em três equipes DESATIVADAS — nove
   só numa. O seletor as descarta (certo: não se entra numa equipe fechada), e
   por isso o chip do diálogo imprimia o UUID cru. A matriz precisa delas. */
const equipeDesativada = { id: 'e-desativada', area_id: 'a-desativada', name: 'Estudos e Pesquisas', is_active: false };
const areaDesativada = { id: 'a-desativada', cluster_id: 'c-tax', name: 'PSA Consultores', is_active: false, page_categories: ['tax'] };
const equipeDesativadaVazia = { id: 'e-desativada-vazia', area_id: 'a-desativada', name: 'Nunca teve ninguem', is_active: false };
const areasTodas = [...areas.map((a) => ({ ...a, is_active: true })), areaDesativada];
const equipesTodas = [...equipes.map((e) => ({ ...e, is_active: true })), equipeDesativada, equipeDesativadaVazia];
const membrosDaDesativada = [{ id: 'v9', user_id: 'u-hercio', equipe_id: 'e-desativada' }];

describe('colunasDeEquipeDaMatriz', () => {
  const colunas = colunasDeEquipeDaMatriz(clusters, areasTodas, equipesTodas, membrosDaDesativada);

  it('inclui a equipe DESATIVADA que tem gente — sem ela não há por onde desvincular', () => {
    const desativada = colunas.find((c) => c.id === 'e-desativada');
    expect(desativada).toBeDefined();
    expect(desativada?.inativa).toBe(true);
    expect(desativada?.caminhoDaArea).toBe('Tax › PSA Consultores');
  });

  it('descarta a desativada VAZIA — não há o que ver nem o que desfazer', () => {
    expect(colunas.find((c) => c.id === 'e-desativada-vazia')).toBeUndefined();
  });

  it('a equipe ativa não vem marcada como inativa', () => {
    for (const c of colunas.filter((x) => x.id !== 'e-desativada' && x.id !== 'e-morta')) {
      expect(c.inativa).toBe(false);
    }
  });

  it('CLUSTER inativo com gente também vira coluna — tanto faz qual degrau fechou', () => {
    /* Escrevi este teste esperando `[]` e o código discordou — com razão. A
       regra é"tem gente, tem coluna", e ela não pergunta em que degrau a
       estrutura foi desativada: o vínculo existe igual, e sem a coluna não há
       por onde tirá-lo. O `montarGruposDeEquipe` é que descarta cluster
       inativo, porque lá a pergunta é outra (entrar, não sair). */
    const comGente = colunasDeEquipeDaMatriz(
      clusters,
      [{ id: 'a-x', cluster_id: 'c-velho', name: 'Legado', is_active: true }],
      [{ id: 'e-x', area_id: 'a-x', name: 'Time do legado', is_active: true }],
      [{ id: 'v', user_id: 'u', equipe_id: 'e-x' }],
    );
    expect(comGente.map((c) => c.id)).toEqual(['e-x']);
    expect(comGente[0].inativa).toBe(true);

    // E sem gente, ela não aparece.
    const semGente = colunasDeEquipeDaMatriz(
      clusters,
      [{ id: 'a-x', cluster_id: 'c-velho', name: 'Legado', is_active: true }],
      [{ id: 'e-x', area_id: 'a-x', name: 'Time do legado', is_active: true }],
      [],
    );
    expect(semGente).toEqual([]);
  });

  it('sem `is_active` nas listas (as já filtradas) devolve o mesmo que o seletor', () => {
    /* Sem membros, a `e-morta` do fixture (cluster inativo) fica de fora dos
       dois lados, e as duas funções convergem. */
    const pelaMatriz = colunasDeEquipeDaMatriz(clusters, areas, equipes, []).map((c) => c.id).sort();
    const peloSeletor = colunasDeEquipe(montarGruposDeEquipe(clusters, areas, equipes)).map((c) => c.id).sort();
    expect(pelaMatriz).toEqual(peloSeletor);
  });

  it('ordena por caminho e depois por nome — a desativada não vai para o fim', () => {
    const caminhos = colunas.map((c) => `${c.caminhoDaArea} › ${c.nome}`);
    expect([...caminhos].sort((a, b) => a.localeCompare(b, 'pt-BR'))).toEqual(caminhos);
  });
});

describe('caminhoDeQualquerEquipe', () => {
  const colunas = colunasDeEquipeDaMatriz(clusters, areasTodas, equipesTodas, membrosDaDesativada);

  it('nomeia a equipe desativada, que era onde o UUID cru vazava', () => {
    expect(caminhoDeQualquerEquipe('e-desativada', colunas)).toBe('Tax › PSA Consultores › Estudos e Pesquisas');
  });

  it('concorda com `caminhoDaEquipe` nas equipes ativas', () => {
    const grupos = montarGruposDeEquipe(clusters, areas, equipes);
    for (const equipe of equipes) {
      const pelo = caminhoDaEquipe(equipe.id, grupos);
      if (pelo) expect(caminhoDeQualquerEquipe(equipe.id, colunas)).toBe(pelo);
    }
  });

  it('id que não existe devolve null, e não o próprio id', () => {
    expect(caminhoDeQualquerEquipe('nao-existe', colunas)).toBeNull();
  });
});
