import { describe, it, expect } from 'vitest';
import { expandirRepetidores } from './repetidor';
import { gerarBlocos, gerarDocumento } from './index';
import { reidratarItensPorLista } from './mapeadores';
import type { ItemLista } from './mapeadores';
import type { Bloco, Contexto, Template } from './types';

const bloco = (id: string, tipo: Bloco['tipo'], conteudo: string, extra: Partial<Bloco> = {}): Bloco => ({
  id,
  tipo,
  conteudo,
  obrigatorio: true,
  ...extra,
});

describe('expandirRepetidores', () => {
  it('expande uma instância por item, com o PRÓPRIO item como escopo (sem clone)', () => {
    const itens = [{ socio: { nome: 'José' } }, { socio: { nome: 'Maria' } }];
    const expandidos = expandirRepetidores(
      [bloco('p', 'paragrafo', 'O sócio {{ socio.nome }} integraliza.', { repeteColecao: 'integralizacoes' })],
      { integralizacoes: itens },
    );
    expect(expandidos.map((b) => b.id)).toEqual(['p#1', 'p#2']);
    expect(expandidos.map((b) => b.instanciaDe)).toEqual(['p', 'p']);
    expect(expandidos[0].escopo).toBe(itens[0]); // identidade preservada: é nela que o {{ ref }} é carimbado
    expect(expandidos.every((b) => b.repeteColecao === undefined)).toBe(true);
  });

  it('coleção vazia: o bloco sai da composição; ausente: erro (falha cedo)', () => {
    const repetidor = bloco('p', 'paragrafo', 'X', { repeteColecao: 'socios' });
    expect(expandirRepetidores([repetidor], { socios: [] })).toEqual([]);
    expect(() => expandirRepetidores([repetidor], {})).toThrow('{{#socios}}');
  });

  it('sem repetidores, devolve a mesma lista (caminho barato)', () => {
    const blocos = [bloco('cl', 'clausula', 'Caput.')];
    expect(expandirRepetidores(blocos, {})).toBe(blocos);
  });
});

describe('gerarBlocos com repetidor — numeração estrutural das instâncias', () => {
  // O cenário da Cláusula Quinta real: responsabilidade solidária no Primeiro,
  // um parágrafo de integralização POR SÓCIO a partir do Segundo.
  const template: Template = {
    id: 't',
    nome: 'capital',
    blocos: [
      bloco('cl', 'clausula', 'O capital é {{ capital }}, conforme {{#integralizacoes sep="; " fim="; e "}}o valor de {{ socio.vlrTotal }} arrolado no {{ ref }} desta cláusula{{/integralizacoes}}.'),
      bloco('p1', 'paragrafo', 'A responsabilidade é restrita.'),
      bloco('p2', 'paragrafo', 'O sócio {{ socio.nome }} integraliza neste ato.', { repeteColecao: 'integralizacoes' }),
    ],
  };
  const contexto = (): Contexto => ({
    capital: 'R$ 100,00',
    integralizacoes: [
      { socio: { nome: 'José', vlrTotal: 'R$ 50,00' } },
      { socio: { nome: 'Maria', vlrTotal: 'R$ 50,00' } },
    ],
  });

  it('cada instância vira um parágrafo numerado pela posição real', () => {
    expect(gerarDocumento(template, contexto())).toBe(
      '*CLÁUSULA PRIMEIRA:* O capital é R$ 100,00, conforme o valor de R$ 50,00 arrolado no parágrafo segundo desta cláusula; e o valor de R$ 50,00 arrolado no parágrafo terceiro desta cláusula.\n' +
        '*Parágrafo Primeiro:* A responsabilidade é restrita.\n' +
        '*Parágrafo Segundo:* O sócio José integraliza neste ato.\n' +
        '*Parágrafo Terceiro:* O sócio Maria integraliza neste ato.',
    );
  });

  it('instância solitária vira Parágrafo Único — e {{ ref }} acompanha', () => {
    const soUmaInstancia: Template = {
      ...template,
      blocos: [template.blocos[0], template.blocos[2]],
    };
    const ctx = contexto();
    (ctx.integralizacoes as unknown[]).pop();
    expect(gerarDocumento(soUmaInstancia, ctx)).toBe(
      '*CLÁUSULA PRIMEIRA:* O capital é R$ 100,00, conforme o valor de R$ 50,00 arrolado no parágrafo único desta cláusula.\n' +
        '*Parágrafo Único:* O sócio José integraliza neste ato.',
    );
  });

  it('referência cruzada por identidade: {{ refItem.ref }} lê o carimbo do item original', () => {
    const ctx = contexto();
    const itens = ctx.integralizacoes as Record<string, unknown>[];
    // Como o mapeador liga a 2ª ocorrência à 1ª descrição (José descreve; Maria referencia).
    itens[0].referencia = false;
    itens[1].referencia = true;
    itens[1].refItem = itens[0];
    const comReferencia: Template = {
      ...template,
      blocos: [
        template.blocos[0],
        template.blocos[1],
        bloco('p2', 'paragrafo', '{{ socio.nome }} integraliza{{#referencia}} o imóvel descrito no {{ refItem.ref }}{{/referencia}}.', {
          repeteColecao: 'integralizacoes',
        }),
      ],
    };
    const blocos = gerarBlocos(comReferencia, ctx);
    expect(blocos[2].conteudo).toBe('*Parágrafo Segundo:* José integraliza.');
    expect(blocos[3].conteudo).toBe('*Parágrafo Terceiro:* Maria integraliza o imóvel descrito no parágrafo segundo.');
  });

  it('snapshot jsonb perde a identidade de refItem; reidratarItensPorLista a religa', () => {
    const comReferencia: Template = {
      ...template,
      blocos: [
        template.blocos[0],
        template.blocos[1],
        bloco('p2', 'paragrafo', '{{ socio.nome }} integraliza{{#referencia}} o imóvel descrito no {{ refItem.ref }}{{/referencia}}.', {
          repeteColecao: 'integralizacoes',
        }),
      ],
    };
    // Como mapearIntegralizacoes monta: ordem por sócio (a chave da reidratação)
    // e a 2ª ocorrência apontando, por identidade, à 1ª descrição.
    const montar = (): Contexto => {
      const ctx = contexto();
      const itens = ctx.integralizacoes as Record<string, unknown>[];
      (itens[0].socio as Record<string, unknown>).ordem = '1';
      (itens[1].socio as Record<string, unknown>).ordem = '2';
      itens[0].referencia = false;
      itens[1].referencia = true;
      itens[1].refItem = itens[0];
      return ctx;
    };

    // O round-trip do snapshot duplica refItem (cópia solta) → o carimbo {{ ref }}
    // cai no item real do array, não na cópia, e {{ refItem.ref }} não resolve.
    const snapshot = JSON.parse(JSON.stringify(montar())) as Contexto;
    expect(() => gerarBlocos(comReferencia, snapshot)).toThrow('Placeholder não resolvido: {{refItem.ref}}');

    // Reidratado, refItem volta a apontar ao objeto real → resolve como no vivo.
    reidratarItensPorLista(snapshot as Record<string, ItemLista[]>);
    const blocos = gerarBlocos(comReferencia, snapshot);
    expect(blocos[3].conteudo).toBe('*Parágrafo Terceiro:* Maria integraliza o imóvel descrito no parágrafo segundo.');
  });

  it('o sufixo #n preserva o vínculo com a posição do modelo via instanciaDe', () => {
    const blocos = gerarBlocos(template, contexto());
    expect(blocos.map((b) => b.id)).toEqual(['cl', 'p1', 'p2#1', 'p2#2']);
    expect(blocos[2].instanciaDe).toBe('p2');
  });
});

describe('gerarBlocos com âncora — {{ refs.* }}', () => {
  it('bloco ancorado publica sua numeração textual para referência avulsa', () => {
    const template: Template = {
      id: 't',
      nome: 'doc',
      blocos: [
        bloco('cl1', 'clausula', 'Aplicam-se os critérios da {{ refs.haveres }}.'),
        bloco('cl2', 'clausula', 'Critérios de apuração de haveres.', { ancora: 'haveres' }),
      ],
    };
    expect(gerarDocumento(template, {})).toBe(
      '*CLÁUSULA PRIMEIRA:* Aplicam-se os critérios da Cláusula Segunda.\n\n' +
        '*CLÁUSULA SEGUNDA:* Critérios de apuração de haveres.',
    );
  });

  it('âncora de bloco excluído pelas flags: placeholder não resolve (falha cedo)', () => {
    const template: Template = {
      id: 't',
      nome: 'doc',
      blocos: [
        bloco('cl1', 'clausula', 'Ver {{ refs.haveres }}.'),
        bloco('cl2', 'clausula', 'Haveres.', { ancora: 'haveres', obrigatorio: false, flagsRequeridas: ['x'] }),
      ],
    };
    expect(() => gerarDocumento(template, {})).toThrow('refs.haveres');
  });
});
