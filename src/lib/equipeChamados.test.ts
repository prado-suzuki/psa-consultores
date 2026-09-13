import { describe, expect, it } from 'vitest';
import {
  CLUSTER_SEM_VINCULO,
  RESPONSAVEL_SEM_ATRIBUICAO,
  combinaComCluster,
  combinaComResponsavel,
} from '@/lib/equipeChamados';

/*
 * As duas regras que decidem o que a lista de chamados mostra.
 *
 * Elas moram aqui, e não dentro de cada tela, porque a mesma pergunta é feita em
 * três lugares (`/equipe/chamados`, a Gestão de Chamados da Tax e a da OSG) e
 * uma resposta diferente em qualquer um deles é chamado sumindo.
 *
 * O caso do `null` é o que motivou os dois: chamado sem cluster não casa com
 * cluster nenhum, e com o filtro preso a um cluster ele não existia em tela
 * alguma — em produção um chamado em andamento ficou invisível para o
 * responsável e para a diretoria.
 */
describe('combinaComCluster', () => {
  it('deixa passar tudo em "todos", inclusive o que não tem cluster', () => {
    expect(combinaComCluster({ cluster_id: 'cluster-1' }, 'todos')).toBe(true);
    expect(combinaComCluster({ cluster_id: null }, 'todos')).toBe(true);
  });

  it('casa pelo id do cluster', () => {
    expect(combinaComCluster({ cluster_id: 'cluster-1' }, 'cluster-1')).toBe(true);
    expect(combinaComCluster({ cluster_id: 'cluster-2' }, 'cluster-1')).toBe(false);
  });

  it('esconde o sem cluster de qualquer cluster escolhido', () => {
    expect(combinaComCluster({ cluster_id: null }, 'cluster-1')).toBe(false);
  });

  it('"Sem cluster" traz só os órfãos — o único jeito de achá-los', () => {
    expect(combinaComCluster({ cluster_id: null }, CLUSTER_SEM_VINCULO)).toBe(true);
    expect(combinaComCluster({ cluster_id: 'cluster-1' }, CLUSTER_SEM_VINCULO)).toBe(false);
  });
});

describe('combinaComResponsavel', () => {
  it('deixa passar tudo em "todos", inclusive o que não tem dono', () => {
    expect(combinaComResponsavel({ assigned_to: 'user-1' }, 'todos')).toBe(true);
    expect(combinaComResponsavel({ assigned_to: null }, 'todos')).toBe(true);
  });

  it('casa pelo id de quem responde', () => {
    expect(combinaComResponsavel({ assigned_to: 'user-1' }, 'user-1')).toBe(true);
    expect(combinaComResponsavel({ assigned_to: 'user-2' }, 'user-1')).toBe(false);
  });

  it('"Sem responsável" traz a fila que ninguém pegou', () => {
    expect(combinaComResponsavel({ assigned_to: null }, RESPONSAVEL_SEM_ATRIBUICAO)).toBe(true);
    expect(combinaComResponsavel({ assigned_to: 'user-1' }, RESPONSAVEL_SEM_ATRIBUICAO)).toBe(false);
  });
});
