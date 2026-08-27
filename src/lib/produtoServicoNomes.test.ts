import { describe, expect, it } from 'vitest';

import {
  contarVinculosPorServico,
  dividirNomeServico,
  faixaDeSelecao,
  ordenarPorCodigoDeServico,
} from '@/lib/produtoServicoNomes';

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

describe('ordenarPorCodigoDeServico', () => {
  /*
   * O caso que decide a implementação: comparar a string inteira põe "1.10"
   * antes de "1.2", e a lista da tela é lida como a planilha da operação, onde
   * não vem. Por isso a comparação é segmento a segmento, como número.
   */
  it('ordena segmento a segmento, não pela string', () => {
    const emOrdem = ordenarPorCodigoDeServico(
      [{ nome: '1.10.Décima' }, { nome: '2.Segunda' }, { nome: '1.2.Segunda de um' }, { nome: '1.1.Primeira' }],
      nomeDe,
    );
    expect(emOrdem.map(nomeDe)).toEqual([
      '1.1.Primeira', '1.2.Segunda de um', '1.10.Décima', '2.Segunda',
    ]);
  });

  it('prefixo mais curto vem antes do que se desdobra', () => {
    const emOrdem = ordenarPorCodigoDeServico([{ nome: '3.1.Filho' }, { nome: '3.Pai' }], nomeDe);
    expect(emOrdem.map(nomeDe)).toEqual(['3.Pai', '3.1.Filho']);
  });

  /*
   * `servicos_prestados` não tem coluna de código, e serviço cadastrado sem o
   * prefixo não pode desaparecer da lista só porque o parsing não achou onde
   * encaixá-lo. Ele vai para o fim — visível.
   */
  it('serviço sem código vai para o fim, em ordem alfabética, e nunca some', () => {
    const emOrdem = ordenarPorCodigoDeServico(
      [{ nome: 'Outros' }, { nome: '2.Segunda' }, { nome: 'Apoio no fechamento' }, { nome: '1.Primeira' }],
      nomeDe,
    );
    expect(emOrdem.map(nomeDe)).toEqual([
      '1.Primeira', '2.Segunda', 'Apoio no fechamento', 'Outros',
    ]);
  });

  it('não altera o array recebido', () => {
    const original = [{ nome: '2.Dois' }, { nome: '1.Um' }];
    ordenarPorCodigoDeServico(original, nomeDe);
    expect(original.map(nomeDe)).toEqual(['2.Dois', '1.Um']);
  });

  it('lista vazia devolve lista vazia', () => {
    expect(ordenarPorCodigoDeServico([], nomeDe)).toEqual([]);
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
