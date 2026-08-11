import { describe, it, expect } from 'vitest';
import { blocoSemDado } from './descarte';
import { gerarBlocos, gerarDocumento } from './index';
import { renderBloco } from './render';
import type { Bloco, Contexto, Template } from './types';

// B5 — bloco sem dado não entra no documento, e a numeração sai sem buraco.
//
// O cenário NÃO é o contrato social da MMS (onde o defeito apareceu, no bloco de
// georreferenciamento): é uma ESCRITURA DE DOAÇÃO com cinco blocos condicionais
// distintos e nenhum dado correspondente. Nenhum deles tem guarda escrita à mão
// — o teste falharia na hora se a correção dependesse disso — e nenhum é
// reconhecível pelo nome/id, que é o que o "Não faça" do B5 proíbe.

const bloco = (id: string, tipo: Bloco['tipo'], conteudo: string): Bloco => ({
  id,
  tipo,
  conteudo,
  obrigatorio: true,
});

/** Escritura de doação: cinco condicionais SEM guarda, entre cláusulas com dado. */
const DOACAO: Template = {
  id: 'doacao',
  nome: 'Escritura de doação com reserva de usufruto',
  blocos: [
    bloco('cl-partes', 'clausula', 'São partes o doador {{ doador.nome }} e o donatário {{ donatario.nome }}.'),
    bloco('cl-onus', 'clausula', 'O imóvel responde pelo ônus de {{ imovel.confrontacoes }}.'),
    bloco('cl-benfeitorias', 'clausula', 'As benfeitorias existentes são {{ imovel.denominacao }}.'),
    bloco('cl-arrendamento', 'clausula', 'O arrendamento vigente é de {{ imovel.percentual }}.'),
    bloco('cl-georref', 'clausula',
      'O imóvel possui área de {{ imovel.georefArea }} ha e perímetro de {{ imovel.georefPerimetro }} m, ' +
      'certificado sob o código {{ imovel.georefCertificacao }}, conforme o memorial:\n' +
      '| Vértice | Azimute |\n| :--- | ---: |\n' +
      '{{#vertices}}| {{ vertice.codVertice }} | {{ vertice.azimute }} |{{/vertices}}'),
    bloco('cl-inscricao', 'clausula', 'O imóvel é inscrito sob o nº {{ imovel.inscricaoMunicipal }}.'),
    bloco('cl-foro', 'clausula', 'Fica eleito o foro da comarca de {{ sociedade.sedeMunicipio }}.'),
  ],
};

/** Contexto do cliente que não tem nenhum dos cinco opcionais preenchidos. */
function contextoSemOpcionais(): Contexto {
  return {
    doador: { nome: 'Aparecida Nunes Farias' },
    donatario: { nome: 'Heitor Nunes Farias' },
    sociedade: { sedeMunicipio: 'Sorriso' },
    imovel: {
      confrontacoes: '', denominacao: '', percentual: '', inscricaoMunicipal: '',
      georefArea: '', georefPerimetro: '', georefCertificacao: '',
    },
    vertices: [],
  };
}

describe('B5 · bloco sem dado sai da composição, e a numeração fecha sem buraco', () => {
  it('cinco condicionais sem dado não deixam nenhuma frase órfã — sem guarda em bloco nenhum', () => {
    const texto = gerarDocumento(DOACAO, contextoSemOpcionais());

    expect(texto).toBe(
      '*CLÁUSULA PRIMEIRA:* São partes o doador Aparecida Nunes Farias e o donatário Heitor Nunes Farias.\n\n' +
      '*CLÁUSULA SEGUNDA:* Fica eleito o foro da comarca de Sorriso.',
    );
    // Nem a frase órfã, nem o cabeçalho da tabela sozinho.
    expect(texto).not.toContain('perímetro de');
    expect(texto).not.toContain('| Vértice |');
  });

  it('o descarte acontece ANTES da numeração: nada de "Primeira" seguida de "Sétima"', () => {
    const blocos = gerarBlocos(DOACAO, contextoSemOpcionais());
    expect(blocos.map((b) => b.id)).toEqual(['cl-partes', 'cl-foro']);
    // O rótulo continua colado no primeiro segmento (posições casam com o conteúdo).
    expect(blocos[1].conteudo.startsWith('*CLÁUSULA SEGUNDA:* ')).toBe(true);
    expect(blocos.every((b) => b.conteudo === b.segmentos.map((s) => s.texto).join(''))).toBe(true);
  });

  it('com dado, os mesmos blocos voltam e a numeração acompanha', () => {
    const ctx = contextoSemOpcionais();
    (ctx.imovel as Record<string, string>).confrontacoes = 'lote 12 ao norte';
    (ctx.imovel as Record<string, string>).georefArea = '214,4921';
    ctx.vertices = [{ vertice: { codVertice: 'MT-M-0001', azimute: '89°12\'' } }];

    const blocos = gerarBlocos(DOACAO, ctx);
    expect(blocos.map((b) => b.id)).toEqual(['cl-partes', 'cl-onus', 'cl-georref', 'cl-foro']);
    expect(blocos[3].conteudo).toContain('*CLÁUSULA QUARTA:*');
  });

  it('a referência de numeração ({{ refs.* }}) enxerga a sequência DEPOIS do descarte', () => {
    const template: Template = {
      id: 'ref',
      nome: 'referência cruzada',
      blocos: [
        bloco('cl1', 'clausula', 'Observado o disposto na {{ refs.haveres }}.'),
        bloco('cl-vazia', 'clausula', 'Arrendamento de {{ imovel.percentual }}.'),
        { ...bloco('cl2', 'clausula', 'Critérios de apuração de haveres.'), ancora: 'haveres' },
      ],
    };
    // Sem o re-render dos sobreviventes, a citação apontaria "Cláusula Terceira".
    expect(gerarDocumento(template, { imovel: { percentual: '' } })).toBe(
      '*CLÁUSULA PRIMEIRA:* Observado o disposto na Cláusula Segunda.\n\n' +
      '*CLÁUSULA SEGUNDA:* Critérios de apuração de haveres.',
    );
  });
});

describe('blocoSemDado — a regra, caso a caso', () => {
  const render = (conteudo: string, ctx: Contexto = {}) => renderBloco(conteudo, ctx);

  it('prosa fixa sem placeholder NUNCA é descartada', () => {
    expect(blocoSemDado(render('A responsabilidade dos sócios é restrita ao valor de suas quotas.'))).toBe(false);
  });

  it('1 de 5 campos preenchido segura o bloco (a pontuação órfã é assunto das pendências)', () => {
    const ctx = { i: { a: 'Fazenda Sete Lagoas', b: '', c: '', d: '', e: '' } };
    expect(blocoSemDado(render('{{ i.a }}, {{ i.b }}, {{ i.c }}, {{ i.d }}, {{ i.e }}.', ctx))).toBe(false);
  });

  it('todos os campos vazios: descarta', () => {
    const ctx = { i: { a: '', b: '' } };
    expect(blocoSemDado(render('Área de {{ i.a }} e perímetro de {{ i.b }}.', ctx))).toBe(true);
  });

  it('tabela sem corpo conta como ausência de dado; com corpo, segura o bloco', () => {
    const cabecalho = 'Memorial:\n| Vértice | Azimute |\n| :--- | ---: |\n';
    const corpo = '{{#vertices}}| {{ vertice.cod }} | {{ vertice.az }} |{{/vertices}}';
    expect(blocoSemDado(render(cabecalho + corpo, { vertices: [] }))).toBe(true);
    expect(
      blocoSemDado(render(cabecalho + corpo, { vertices: [{ vertice: { cod: 'M-01', az: '12°' } }] })),
    ).toBe(false);
  });

  it('seção de repetição com item segura o bloco; sem item, nem a prosa em volta o segura', () => {
    const conteudo = 'Quadro societário:\n{{#socios}}- {{ socio.nome }}{{/socios}}';
    expect(blocoSemDado(render(conteudo, { socios: [{ socio: { nome: '' } }] }))).toBe(false);
    // "Quadro societário:" sozinho é frase órfã: o bloco PEDIA uma lista.
    expect(blocoSemDado(render(conteudo, { socios: [] }))).toBe(true);
    // E o bloco cujo corpo inteiro é o laço não sobra como parágrafo mudo.
    expect(blocoSemDado(render('{{#socios}}{{ socio.nome }}{{/socios}}', { socios: [] }))).toBe(true);
  });

  it('lacuna de campo manual CONTA como conteúdo: o fecho de assinaturas não some', () => {
    const template: Template = {
      id: 'fecho',
      nome: 'fecho',
      blocos: [bloco('fecho', 'livre', '{{ foroComarca }}/{{ foroUf }}, {{ dataAssinatura }}.')],
    };
    const texto = gerarDocumento(template, { foroComarca: '', foroUf: '', dataAssinatura: '' });
    expect(texto).toBe('/, ____ de ______________ de 20__.');
  });
});
