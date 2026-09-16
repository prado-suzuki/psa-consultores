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

/**
 * O contexto como a tela monta: os campos do acordo, a sociedade, as listas, e
 * os CAMPOS LIVRES com '' quando ninguém digitou — que é o que a tela faz em
 * `livresFonte[ph] ?? ''`. Sem eles o render levanta, porque placeholder
 * ausente não é o mesmo que placeholder vazio.
 */
const contextoDe = (e: EntradaAcordo) => ({
  acordo: camposDoAcordo(e),
  sociedade: { razaoSocial: 'ABACAXI ELÉTRICO MINERAÇÃO E BALÉ S.A.' },
  nomeCurtoDaEmpresa: 'ABACAXI',
  substitutoDoRepresentante: '',
  /*
   * `administradores` vem da EMPRESA, e nao do acordo: e a lista que o
   * contrato social ja usa no preambulo, e o Acordo a reaproveita para dizer
   * quem representa a sociedade no ato. Aqui ela entra a mao; na tela, quem a
   * carrega e o controller, a partir da empresa escolhida.
   */
  administradores: [
    { administrador: { nome: 'SÉRGIO IGLESIAS' } },
  ],
  ...listasDoAcordo(e),
});

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
    const saida = gerarDocumento(template, contextoDe(ENTRADA));
    expect(saida.length).toBeGreaterThan(1000);
    // O cliente do documento, e nunca o do modelo.
    expect(saida).not.toContain('DUAL');
    expect(saida).toContain('ABACAXI');
  });
});

describe('o caminho da TELA, que o teste de motor nao cobre', () => {
  const conteudoTodo = blocos.map((b) => b.conteudo).join('\n\n');

  it('a deteccao acha os papeis certos, e os manuais como campo livre', () => {
    /*
     * `desconhecidos` NAO e erro: e o mecanismo dos campos de topo. A tela
     * transforma cada um num campo de texto livre e o preenche com '' quando
     * vazio (`livresFonte[ph] ?? ''`), entao o render nao derruba. E o mesmo
     * caminho da data de assinatura e das testemunhas.
     */
    const d = detectarBindingsDeConteudo(conteudoTodo);
    expect(d.secoesDesconhecidas, 'secao sem papel some do Word inteira').toEqual([]);
    expect(d.bindings.map((b) => b.nome).sort()).toEqual(['acordo', 'sociedade']);
    expect(d.listas.map((l) => l.nome).sort()).toEqual(['administradores', 'quotistasSignatarios']);
    expect([...d.desconhecidos].sort())
      .toEqual(['nomeCurtoDaEmpresa', 'substitutoDoRepresentante']);
  });

  it('o docx sai sem levantar, com os 266 blocos', async () => {
    // `montarDocx` recebe os BLOCOS ja renderizados e numerados, nao o texto.
    const prontos = gerarBlocos(template, contextoDe(ENTRADA));
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
    expect(() => gerarDocumento(template, contextoDe(VAZIO))).not.toThrow();
  });

  it('todo campo declarado chega ao contexto, nem que seja vazio', () => {
    const campos = camposDoAcordo(VAZIO);
    const ausentes = camposDaEntidade('acordoQuotistas')
      .filter((c) => !c.obrigatorio && campos[c.id] === undefined)
      .map((c) => c.id);
    expect(ausentes, 'campo ausente derruba o render de quem o cita').toEqual([]);
  });
});
