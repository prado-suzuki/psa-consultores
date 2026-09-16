/*
 * A GERAÇÃO DO ACORDO INTEIRO, os 266 blocos de uma vez.
 *
 * A tela travou na primeira geração de verdade. Este teste reproduz o caminho
 * sem navegador: monta o template com os blocos carregados, passa o contexto que
 * o controller passaria, e gera. É onde o erro tem de aparecer.
 */
import { describe, expect, it } from 'vitest';

import blocosDoAcordo from '../../../docs/osg/acordo-blocos.json';
import { camposDoAcordo, listasDoAcordo, type EntradaAcordo } from './contextoAcordo';
import { detectarBindingsDeConteudo } from './binding';
import { gerarBlocos, gerarDocumento } from './index';
import { camposDaEntidade } from './vocabulario';
import { montarDocx } from './docx';
import type { Bloco, Template, TipoBloco } from './types';

interface BlocoDoArquivo { nome: string; tipo: string; titulo: string | null; conteudo: string }

const blocos: Bloco[] = (blocosDoAcordo as BlocoDoArquivo[]).map((b, i) => ({
  id: `b${i}`,
  tipo: b.tipo as TipoBloco,
  tituloDocumento: b.titulo ?? undefined,
  conteudo: b.conteudo,
  obrigatorio: true,
}));

const template: Template = { id: 'acordo', nome: 'Acordo de Quotistas', blocos };

/** Um acordo cheio, como o cadastro entrega. */
const ENTRADA: EntradaAcordo = {
  acordo: {
    clienteId: 'c1',
    vigenciaAnos: 20,
    naoConcorrenciaPrazoAnos: 3,
    naoConcorrenciaMulta: 'R$ 1.000.000,00 (um milhão de reais)',
    jurosValorSubscrito: 'juros de 1% (um por cento) ao mês',
    camaraArbitral: 'Câmara de Comércio Brasil Canadá',
    representanteNome: 'LUIZ MARCELO',
    representanteGenero: 'M',
  },
  quoruns: [],
  ramos: [],
  ordemPreferencia: [],
  signatarios: [],
  sociedadesRelacionadas: [],
};

describe('a geração do Acordo de ponta a ponta', () => {
  it('gera o documento inteiro sem levantar', () => {
    const contexto = {
      acordo: camposDoAcordo(ENTRADA),
      sociedade: { razaoSocial: 'ABACAXI ELÉTRICO MINERAÇÃO E BALÉ S.A.' },
      ...listasDoAcordo(ENTRADA),
    };
    const saida = gerarDocumento(template, contexto);
    expect(saida.length).toBeGreaterThan(1000);
  });
});

describe('o caminho da TELA, que o teste de motor nao cobre', () => {
  const conteudoTodo = blocos.map((b) => b.conteudo).join('\n\n');

  it('a deteccao de bindings nao acha papel nem secao desconhecida', () => {
    // A tela roda isto sobre o modelo inteiro antes de montar os passos. Papel
    // desconhecido vira campo livre que ela pede para digitar a mao.
    const d = detectarBindingsDeConteudo(conteudoTodo);
    expect(d.desconhecidos, 'placeholder sem papel').toEqual([]);
    expect(d.secoesDesconhecidas, 'secao sem papel').toEqual([]);
    expect(d.bindings.map((b) => b.nome).sort()).toEqual(['acordo']);
  });

  it('o docx sai sem levantar, com os 266 blocos', async () => {
    // `montarDocx` recebe os BLOCOS ja renderizados e numerados, nao o texto.
    const contexto = {
      acordo: camposDoAcordo(ENTRADA),
      sociedade: { razaoSocial: 'ABACAXI ELÉTRICO MINERAÇÃO E BALÉ S.A.' },
      ...listasDoAcordo(ENTRADA),
    };
    const prontos = gerarBlocos(template, contexto);
    await expect(montarDocx(prontos)).resolves.toBeTruthy();
  });
});

describe('o acordo VAZIO nao derruba a geracao', () => {
  /*
   * O CASO QUE TRAVOU A PRIMEIRA GERACAO DE VERDADE.
   *
   * O render LEVANTA quando o placeholder nao existe no contexto, e o `coletor`
   * descarta valor vazio. Juntando os dois, qualquer campo OPCIONAL em branco
   * derrubava o documento inteiro: a tela mostrou "Algo impediu a geracao do
   * documento — Placeholder nao resolvido: {{acordo.naoConcorrenciaMulta}}",
   * porque o acordo daquele cliente nao tinha a multa preenchida.
   *
   * Nao e o cadastro que estava errado: acordo sem multa, sem opcao de compra e
   * sem representante existe no acervo. Quem estava errado era o mapeador, que
   * nao passava por `publicarOpcionais`.
   */
  const VAZIO: EntradaAcordo = {
    acordo: { clienteId: 'c1' },
    quoruns: [], ramos: [], ordemPreferencia: [], signatarios: [], sociedadesRelacionadas: [],
  };

  it('gera com o cadastro em branco, sem levantar', () => {
    const contexto = {
      acordo: camposDoAcordo(VAZIO),
      sociedade: { razaoSocial: 'ABACAXI ELÉTRICO MINERAÇÃO E BALÉ S.A.' },
      ...listasDoAcordo(VAZIO),
    };
    expect(() => gerarDocumento(template, contexto)).not.toThrow();
  });

  it('todo campo declarado chega ao contexto, nem que seja vazio', () => {
    const campos = camposDoAcordo(VAZIO);
    const ausentes = camposDaEntidade('acordoQuotistas')
      .filter((c) => !c.obrigatorio && campos[c.id] === undefined)
      .map((c) => c.id);
    expect(ausentes, 'campo ausente derruba o render de quem o cita').toEqual([]);
  });
});
