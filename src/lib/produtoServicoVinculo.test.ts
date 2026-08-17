import { describe, it, expect } from 'vitest';
import {
  SEM_CLUSTER,
  agruparPorCluster,
  contarVinculosPorProduto,
  filtrarProdutos,
  filtrarServicos,
  normalizarTexto,
  separarVisiveisParaLote,
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
