import { describe, expect, it } from 'vitest';

import {
  ROTULO_SEM_SECAO,
  SEM_SECAO,
  SEM_CLUSTER,
  agruparPorClusterESecao,
  agruparPorSecao,
  contarVinculosPorServico,
  dividirNomeServico,
  estadoDaSecao,
  faixaDeSelecao,
} from '@/lib/produtoServicoSecoes';

const nomeDe = (s: { nome: string }) => s.nome;

describe('dividirNomeServico', () => {
  it('separa prefixo de dois níveis', () => {
    expect(dividirNomeServico('1.1.Apoio na implantação de práticas contábeis')).toEqual({
      codigo: '1.1',
      nome: 'Apoio na implantação de práticas contábeis',
      secao: '1',
    });
  });

  it('separa prefixo de um nível', () => {
    expect(dividirNomeServico('3.Adequação de sistemas e processos')).toEqual({
      codigo: '3',
      nome: 'Adequação de sistemas e processos',
      secao: '3',
    });
  });

  it('aceita espaço no lugar do ponto final', () => {
    expect(dividirNomeServico('5.1 Laudo contábil-financeiro')).toEqual({
      codigo: '5.1',
      nome: 'Laudo contábil-financeiro',
      secao: '5',
    });
  });

  it('sem prefixo, o nome inteiro sobrevive e o código é nulo', () => {
    expect(dividirNomeServico('Outros')).toEqual({ codigo: null, nome: 'Outros', secao: null });
  });

  it('número solto não vira código — senão o grupo ficaria sem rótulo', () => {
    expect(dividirNomeServico('2024')).toEqual({ codigo: null, nome: '2024', secao: null });
    expect(dividirNomeServico('1.')).toEqual({ codigo: null, nome: '1.', secao: null });
  });

  it('não quebra com nome vazio ou nulo', () => {
    expect(dividirNomeServico(null)).toEqual({ codigo: null, nome: '', secao: null });
    expect(dividirNomeServico('')).toEqual({ codigo: null, nome: '', secao: null });
  });
});

describe('agruparPorSecao', () => {
  it('agrupa pelo primeiro nível e ordena numericamente', () => {
    const secoes = agruparPorSecao(
      [{ nome: '10.Décima' }, { nome: '2.Segunda' }, { nome: '1.1.Primeira' }, { nome: '1.2.Outra' }],
      nomeDe,
    );
    expect(secoes.map((s) => s.chave)).toEqual(['1', '2', '10']);
    expect(secoes[0].itens).toHaveLength(2);
  });

  /*
   * O caso que decide a implementação: `servicos_prestados` não tem coluna de
   * código, e um serviço cadastrado sem o prefixo não pode desaparecer da tela
   * só porque o parsing não achou onde encaixá-lo.
   */
  it('serviço sem prefixo vira grupo explícito, nunca some', () => {
    const secoes = agruparPorSecao([{ nome: '1.Primeira' }, { nome: 'Outros' }], nomeDe);
    const semSecao = secoes.find((s) => s.chave === SEM_SECAO);
    expect(semSecao).toBeDefined();
    expect(semSecao!.titulo).toBe(ROTULO_SEM_SECAO);
    expect(semSecao!.itens).toEqual([{ nome: 'Outros' }]);
    // e vem por último
    expect(secoes[secoes.length - 1].chave).toBe(SEM_SECAO);
    // nenhum item foi perdido no caminho
    expect(secoes.flatMap((s) => s.itens)).toHaveLength(2);
  });

  it('lista vazia não inventa grupo', () => {
    expect(agruparPorSecao([], nomeDe)).toEqual([]);
  });
});

describe('contarVinculosPorServico', () => {
  it('conta quantos produtos usam cada serviço', () => {
    expect(
      contarVinculosPorServico([
        { servico_prestado_id: 'a' },
        { servico_prestado_id: 'a' },
        { servico_prestado_id: 'b' },
      ]),
    ).toEqual({ a: 2, b: 1 });
  });

  it('sem vínculo, devolve mapa vazio', () => {
    expect(contarVinculosPorServico([])).toEqual({});
  });
});

describe('faixaDeSelecao', () => {
  const visiveis = ['a', 'b', 'c', 'd', 'e'];

  it('pega a faixa entre âncora e alvo, inclusive', () => {
    expect(faixaDeSelecao(visiveis, 'b', 'd')).toEqual(['b', 'c', 'd']);
  });

  it('funciona de baixo para cima', () => {
    expect(faixaDeSelecao(visiveis, 'd', 'b')).toEqual(['b', 'c', 'd']);
  });

  it('sem âncora, é um clique comum', () => {
    expect(faixaDeSelecao(visiveis, null, 'c')).toEqual(['c']);
    expect(faixaDeSelecao(visiveis, 'c', 'c')).toEqual(['c']);
  });

  it('âncora que saiu do filtro não anula o clique', () => {
    // A âncora pode ter sido filtrada para fora entre um clique e outro; o
    // shift+clique tem que continuar selecionando ao menos o alvo.
    expect(faixaDeSelecao(visiveis, 'z', 'c')).toEqual(['c']);
  });
});

describe('agruparPorClusterESecao', () => {
  interface S { id: string; nome: string; cluster: string | null; clusterNome: string | null; vinc: boolean }
  const acesso = {
    nome: (s: S) => s.nome,
    clusterId: (s: S) => s.cluster,
    clusterNome: (s: S) => s.clusterNome,
    vinculado: (s: S) => s.vinc,
  };

  /*
   * O defeito que este teste tranca: OSG numera "1.01" e Tax numera "1.1". As
   * duas formas dão seção "1", então um agrupamento PLANO por número junta os
   * dois clusters debaixo do mesmo cabeçalho. Foi o que apareceu na tela.
   */
  it('não mistura clusters que numeram a seção do mesmo jeito', () => {
    const servicos: S[] = [
      { id: 'a', nome: '1.01.Levantar a estrutura societária', cluster: 'osg', clusterNome: 'OSG', vinc: false },
      { id: 'b', nome: '1.02.Analisar aspectos societários', cluster: 'osg', clusterNome: 'OSG', vinc: false },
      { id: 'c', nome: '1.1.Apoio na implantação de práticas', cluster: 'tax', clusterNome: 'TAX', vinc: true },
      { id: 'd', nome: '1.2.Apoio no fechamento contábil', cluster: 'tax', clusterNome: 'TAX', vinc: false },
    ];
    const grupos = agruparPorClusterESecao(servicos, acesso, 'tax');

    expect(grupos.map((g) => g.titulo)).toEqual(['TAX', 'OSG']);
    // Cada cluster tem a SUA seção "1", com só os serviços dele.
    for (const grupo of grupos) {
      expect(grupo.secoes).toHaveLength(1);
      expect(grupo.secoes[0].chave).toBe('1');
      expect(grupo.secoes[0].itens).toHaveLength(2);
      const clusters = new Set(grupo.secoes[0].itens.map((s) => s.cluster));
      expect(clusters.size, 'seção com dois clusters dentro').toBe(1);
    }
  });

  it('o contador é do cluster, não do catálogo inteiro', () => {
    const servicos: S[] = [
      { id: 'a', nome: '1.1.Um', cluster: 'tax', clusterNome: 'TAX', vinc: true },
      { id: 'b', nome: '1.2.Dois', cluster: 'tax', clusterNome: 'TAX', vinc: false },
      { id: 'c', nome: '1.01.Tres', cluster: 'osg', clusterNome: 'OSG', vinc: false },
    ];
    const [tax, osg] = agruparPorClusterESecao(servicos, acesso, 'tax');
    expect([tax.vinculados, tax.total]).toEqual([1, 2]);
    expect([osg.vinculados, osg.total]).toEqual([0, 1]);
  });

  it('o cluster do produto vem primeiro e o sem-cluster por último', () => {
    const servicos: S[] = [
      { id: 'a', nome: '1.Zeta', cluster: 'z', clusterNome: 'Zeta', vinc: false },
      { id: 'b', nome: '1.Sem', cluster: null, clusterNome: null, vinc: false },
      { id: 'c', nome: '1.Alfa', cluster: 'a', clusterNome: 'Alfa', vinc: false },
    ];
    const grupos = agruparPorClusterESecao(servicos, acesso, 'z');
    expect(grupos.map((g) => g.titulo)).toEqual(['Zeta', 'Alfa', 'Sem cluster']);
    expect(grupos[0].sugerido).toBe(true);
    expect(grupos.at(-1)!.chave).toBe(SEM_CLUSTER);
  });
});

describe('estadoDaSecao', () => {
  const itens = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('nenhum marcado', () => {
    expect(estadoDaSecao(itens, new Set())).toBe(false);
  });

  it('todos marcados', () => {
    expect(estadoDaSecao(itens, new Set(['a', 'b', 'c']))).toBe(true);
  });

  it('parte marcada vira o traço, não o check', () => {
    expect(estadoDaSecao(itens, new Set(['a']))).toBe('indeterminate');
  });

  it('seção vazia não fica marcada', () => {
    expect(estadoDaSecao([], new Set(['a']))).toBe(false);
  });
});
