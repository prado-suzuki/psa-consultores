import { describe, it, expect } from 'vitest';
import {
  SEM_CLUSTER,
  agruparPorCluster,
  candidatosParaCopia,
  contarVinculosPorProduto,
  filtrarProdutos,
  filtrarServicos,
  normalizarTexto,
  separarVisiveisParaLote,
  servicosACopiar,
} from './produtoServicoVinculo';

const produtos = [
  { id: 'p-cha', codigo: '01-CHA', nome: 'Canal de Chamados', cluster_id: 'c-osg', estrutura_clusters: { name: 'OSG' } },
  { id: 'p-es', codigo: '02-ES', nome: 'Estruturação Societária', cluster_id: 'c-tax', estrutura_clusters: { name: 'Tax' } },
  { id: 'p-cc', codigo: '03-CC', nome: 'Consultoria contábil', cluster_id: null, estrutura_clusters: null },
  { id: 'p-old', codigo: '09-OLD', nome: 'Produto legado', cluster_id: 'c-legado', estrutura_clusters: { name: 'Legado' } },
];

const servicos = [
  { id: 's-1', nome: '1.1.Apoio no fechamento contábil', cluster_id: 'c-tax', estrutura_clusters: { name: 'Tax' } },
  { id: 's-2', nome: '1.2.Análise de riscos fiscais', cluster_id: 'c-tax', estrutura_clusters: { name: 'Tax' } },
  { id: 's-3', nome: '2.1.Abertura de chamados', cluster_id: 'c-osg', estrutura_clusters: { name: 'OSG' } },
  { id: 's-4', nome: '3.1.Serviço solto', cluster_id: null, estrutura_clusters: null },
];

const vinculos = [
  { produto_segmento_id: 'p-cha', servico_prestado_id: 's-3' },
  { produto_segmento_id: 'p-cha', servico_prestado_id: 's-1' },
  { produto_segmento_id: 'p-es', servico_prestado_id: 's-1' },
];

describe('normalizarTexto', () => {
  it('remove acentos, caixa e espaços das pontas', () => {
    expect(normalizarTexto('  Estruturação SOCIETÁRIA ')).toBe('estruturacao societaria');
  });
});

describe('contarVinculosPorProduto', () => {
  it('conta serviços por produto e omite produto sem vínculo', () => {
    const contagem = contarVinculosPorProduto(vinculos);
    expect(contagem).toEqual({ 'p-cha': 2, 'p-es': 1 });
    expect(contagem['p-cc']).toBeUndefined();
  });
});

describe('filtrarProdutos', () => {
  it('devolve tudo quando o termo está vazio', () => {
    expect(filtrarProdutos(produtos, '   ')).toHaveLength(4);
  });

  it('encontra por código parcial e por nome sem acento', () => {
    expect(filtrarProdutos(produtos, 'cha').map(p => p.id)).toEqual(['p-cha']);
    expect(filtrarProdutos(produtos, 'estruturacao').map(p => p.id)).toEqual(['p-es']);
    expect(filtrarProdutos(produtos, '02-es').map(p => p.id)).toEqual(['p-es']);
  });

  it('não quebra com código/nome nulos', () => {
    const parciais = [{ id: 'x', codigo: null, nome: null }];
    expect(filtrarProdutos(parciais, 'algo')).toEqual([]);
    expect(filtrarProdutos(parciais, '')).toHaveLength(1);
  });
});

describe('filtrarServicos', () => {
  const vinculados = new Set(['s-1', 's-3']);

  it('recorta por estado do vínculo', () => {
    expect(filtrarServicos(servicos, { termo: '', filtro: 'vinculados', vinculados }).map(s => s.id))
      .toEqual(['s-1', 's-3']);
    expect(filtrarServicos(servicos, { termo: '', filtro: 'disponiveis', vinculados }).map(s => s.id))
      .toEqual(['s-2', 's-4']);
    expect(filtrarServicos(servicos, { termo: '', filtro: 'todos', vinculados })).toHaveLength(4);
  });

  it('combina busca sem acento com o filtro', () => {
    expect(filtrarServicos(servicos, { termo: 'analise', filtro: 'todos', vinculados }).map(s => s.id))
      .toEqual(['s-2']);
    expect(filtrarServicos(servicos, { termo: 'analise', filtro: 'vinculados', vinculados }))
      .toEqual([]);
  });
});

describe('agruparPorCluster', () => {
  it('ordena ativos por nome, inativos depois e "Sem cluster" por último', () => {
    const grupos = agruparPorCluster(produtos, { clustersInativos: new Set(['c-legado']) });
    expect(grupos.map(g => g.key)).toEqual(['c-osg', 'c-tax', 'c-legado', SEM_CLUSTER]);
    expect(grupos.map(g => g.nome)).toEqual(['OSG', 'Tax', 'Legado', 'Sem cluster']);
    expect(grupos.find(g => g.key === 'c-legado')?.inativo).toBe(true);
    expect(grupos.find(g => g.key === SEM_CLUSTER)?.inativo).toBe(false);
  });

  it('põe o cluster do produto selecionado como sugerido na frente', () => {
    const grupos = agruparPorCluster(servicos, { clusterSugerido: 'c-osg' });
    expect(grupos.map(g => g.key)).toEqual(['c-osg', 'c-tax', SEM_CLUSTER]);
    expect(grupos[0].sugerido).toBe(true);
    expect(grupos[1].sugerido).toBe(false);
  });

  it('não marca "Sem cluster" como sugerido quando o produto não tem cluster', () => {
    const grupos = agruparPorCluster(servicos, { clusterSugerido: null });
    expect(grupos.every(g => !g.sugerido)).toBe(true);
  });

  it('preserva a ordem original dos itens dentro do grupo', () => {
    const grupos = agruparPorCluster(servicos);
    expect(grupos.find(g => g.key === 'c-tax')?.items.map(s => s.id)).toEqual(['s-1', 's-2']);
  });
});

describe('separarVisiveisParaLote', () => {
  it('separa o que falta vincular do que já está vinculado', () => {
    const { paraVincular, jaVinculados } = separarVisiveisParaLote(servicos, new Set(['s-1']));
    expect(paraVincular.map(s => s.id)).toEqual(['s-2', 's-3', 's-4']);
    expect(jaVinculados.map(s => s.id)).toEqual(['s-1']);
  });
});

/* ───────────────────────────────────────────────────────────────────────
 * Copiar de outro produto
 * ─────────────────────────────────────────────────────────────────────── */

const TAX = 'cl-tax';
const OSG = 'cl-osg';

const prod = (id: string, cluster_id: string | null) => ({
  id, codigo: id.toUpperCase(), nome: `Produto ${id}`, cluster_id,
});
const liga = (p: string, s: string) => ({ produto_segmento_id: p, servico_prestado_id: s });

const PRODUTOS = [prod('alvo', TAX), prod('cheio', TAX), prod('irmao', TAX), prod('fora', OSG), prod('vazio', TAX)];
const VINCULOS = [
  liga('alvo', 's1'),
  liga('cheio', 's1'), liga('cheio', 's2'), liga('cheio', 's3'),
  liga('irmao', 's1'), liga('irmao', 's2'),
  liga('fora', 's9'), liga('fora', 's10'), liga('fora', 's11'),
];

describe('servicosACopiar', () => {
  it('traz só o que o alvo ainda não tem', () => {
    expect(servicosACopiar(VINCULOS, 'cheio', 'alvo')).toEqual(['s2', 's3']);
  });

  it('origem contida no alvo não traz nada', () => {
    expect(servicosACopiar(VINCULOS, 'alvo', 'cheio')).toEqual([]);
  });

  it('origem sem vínculo nenhum não traz nada', () => {
    expect(servicosACopiar(VINCULOS, 'vazio', 'alvo')).toEqual([]);
  });
});

describe('candidatosParaCopia', () => {
  const alvo = PRODUTOS[0];

  it('deixa de fora o próprio alvo e quem não tem vínculo nenhum', () => {
    const ids = candidatosParaCopia(PRODUTOS, VINCULOS, alvo).map((c) => c.id);
    expect(ids).not.toContain('alvo');
    expect(ids).not.toContain('vazio');
  });

  /*
   * A ordem É a recomendação: o primeiro da lista é o que a pessoa escolhe sem
   * ler o resto. Mesmo cluster primeiro; dentro dele, quem traz mais coisa nova.
   */
  it('põe o mesmo cluster na frente e, dentro dele, quem traz mais', () => {
    // `fora` traz 3 novos contra os 2 de `cheio`: se o cluster não viesse
    // primeiro, ele lideraria. É o que separa esta regra de uma ordenação
    // simples por quantidade.
    expect(candidatosParaCopia(PRODUTOS, VINCULOS, alvo).map((c) => c.id))
      .toEqual(['cheio', 'irmao', 'fora']);
  });

  it('separa o total do candidato do que ele acrescenta aqui', () => {
    const cheio = candidatosParaCopia(PRODUTOS, VINCULOS, alvo).find((c) => c.id === 'cheio');
    expect(cheio).toMatchObject({ total: 3, novos: 2 });
  });

  it('produto de outro cluster continua alcançável, só que depois', () => {
    const fora = candidatosParaCopia(PRODUTOS, VINCULOS, alvo).find((c) => c.id === 'fora');
    expect(fora).toMatchObject({ mesmoCluster: false, total: 3, novos: 3 });
  });
});
