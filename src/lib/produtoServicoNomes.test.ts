import { describe, expect, it } from 'vitest';

import {
  contarVinculosPorServico,
  dividirNomeServico,
  faixaDeSelecao,
  gruposDeCodigo,
  montarNomeServico,
  ordenarPorCodigoDeServico,
  proximoCodigoLivre,
  servicosComCodigo,
  servicosComMesmoNome,
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

/* ───────────────────────────────────────────────────────────────────────
 * Proposta de código — os casos saem do catálogo de produção, porque é nele
 * que as duas convenções convivem: a OSG com zero à esquerda ("2.01") e a Tax
 * sem ("1.1"), no mesmo banco.
 * ─────────────────────────────────────────────────────────────────────── */

const TAX = 'cluster-tax';
const OSG = 'cluster-osg';

const servico = (id: string, nome: string, cluster_id: string | null) => ({ id, nome, cluster_id });

/** Recorte fiel do catálogo: os dois clusters, com os buracos que eles têm. */
const CATALOGO = [
  servico('t1', '1.0.Análise de incidência tributária por operação', TAX),
  servico('t2', '1.1.Apoio no fechamento contábil', TAX),
  servico('t3', '1.1.Suporte em auditorias independentes', TAX),
  servico('t4', '1.2.Consultoria em regimes especiais', TAX),
  servico('t5', '2.1.Análise dos indicadores financeiros', TAX),
  servico('t6', '2.3.Revisão de atas', TAX),
  servico('t7', 'Outros', TAX),
  servico('t8', 'Suporte em auditorias independentes', TAX),
  servico('o1', '2.01.Diagnóstico Patrimonial', OSG),
  servico('o2', '2.02.Qualificação dos Sócios', OSG),
  servico('o3', '2.16.Atos Societários de Manutenção', OSG),
];

describe('gruposDeCodigo', () => {
  it('monta os grupos do cluster em ordem numérica, com um nome de exemplo', () => {
    const grupos = gruposDeCodigo(CATALOGO, TAX);
    expect(grupos.map((g) => g.raiz)).toEqual(['1', '2']);
    expect(grupos[0].exemplo).toBe('Análise de incidência tributária por operação');
    expect(grupos[0].quantos).toBe(4);
  });

  it('lê a largura de cada catálogo em vez de impor uma', () => {
    expect(gruposDeCodigo(CATALOGO, TAX)[0].largura).toBe(1);
    expect(gruposDeCodigo(CATALOGO, OSG)[0].largura).toBe(2);
  });

  it('serviço sem código não entra em grupo nenhum', () => {
    const grupos = gruposDeCodigo(CATALOGO, TAX);
    expect(grupos.reduce((t, g) => t + g.quantos, 0)).toBe(CATALOGO.filter(
      (s) => s.cluster_id === TAX && dividirNomeServico(s.nome).codigo,
    ).length);
  });

  it('não mistura cluster', () => {
    expect(gruposDeCodigo(CATALOGO, OSG).map((g) => g.raiz)).toEqual(['2']);
  });
});

describe('proximoCodigoLivre', () => {
  it('preenche o buraco antes de crescer — "2.2" está vago entre 2.1 e 2.3', () => {
    expect(proximoCodigoLivre(CATALOGO, TAX, '2')).toBe('2.2');
  });

  it('respeita o zero à esquerda da OSG', () => {
    expect(proximoCodigoLivre(CATALOGO, OSG, '2')).toBe('2.03');
  });

  it('pula os ocupados do grupo 1 da Tax', () => {
    expect(proximoCodigoLivre(CATALOGO, TAX, '1')).toBe('1.3');
  });

  it('grupo inédito herda a largura do cluster', () => {
    expect(proximoCodigoLivre(CATALOGO, OSG, '9')).toBe('9.01');
    expect(proximoCodigoLivre(CATALOGO, TAX, '9')).toBe('9.1');
  });

  it('cluster vazio não trava', () => {
    expect(proximoCodigoLivre([], null, '1')).toBe('1.1');
  });
});

describe('servicosComCodigo', () => {
  it('devolve todos os que disputam o código, para a tela poder nomeá-los', () => {
    expect(servicosComCodigo(CATALOGO, TAX, '1.1').map((s) => s.id)).toEqual(['t2', 't3']);
  });

  it('código livre devolve lista vazia', () => {
    expect(servicosComCodigo(CATALOGO, TAX, '1.3')).toEqual([]);
  });

  it('o mesmo código em outro cluster não conta', () => {
    expect(servicosComCodigo(CATALOGO, OSG, '1.1')).toEqual([]);
  });
});

describe('servicosComMesmoNome', () => {
  /*
   * O par que existe de verdade em produção: o serviço foi cadastrado uma vez
   * com número e outra sem, e os vínculos se partiram entre as duas linhas.
   */
  it('acha o duplicado mesmo quando um dos dois tem código e o outro não', () => {
    expect(servicosComMesmoNome(CATALOGO, TAX, 'Suporte em auditorias independentes')
      .map((s) => s.id)).toEqual(['t3', 't8']);
  });

  it('ignora acento, caixa e espaço repetido', () => {
    expect(servicosComMesmoNome(CATALOGO, TAX, '  SUPORTE  em   auditorias INDEPENDENTES ')
      .map((s) => s.id)).toEqual(['t3', 't8']);
  });

  it('não acusa o próprio serviço em edição', () => {
    expect(servicosComMesmoNome(CATALOGO, TAX, 'Suporte em auditorias independentes', 't3')
      .map((s) => s.id)).toEqual(['t8']);
  });

  it('nome vazio não acusa nada', () => {
    expect(servicosComMesmoNome(CATALOGO, TAX, '   ')).toEqual([]);
  });
});

describe('montarNomeServico', () => {
  it('grava no formato dominante do catálogo', () => {
    expect(montarNomeServico('1.10', 'Apoio no fechamento contábil'))
      .toBe('1.10.Apoio no fechamento contábil');
  });

  /* O que sai daqui tem de voltar por `dividirNomeServico` — é o mesmo dado. */
  it('sobrevive à ida e volta', () => {
    const gravado = montarNomeServico('2.01', 'Diagnóstico Patrimonial');
    expect(dividirNomeServico(gravado)).toEqual({
      codigo: '2.01', nome: 'Diagnóstico Patrimonial', secao: '2',
    });
  });

  it('sem código, grava só o nome — serviço sem número continua válido', () => {
    expect(montarNomeServico('', 'Outros')).toBe('Outros');
    expect(montarNomeServico('   ', 'Outros')).toBe('Outros');
  });

  it('ponto sobrando no código não vira ponto duplo', () => {
    expect(montarNomeServico('1.1.', 'Consolidação de balanços'))
      .toBe('1.1.Consolidação de balanços');
  });
});
