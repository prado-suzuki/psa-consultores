import { describe, it, expect } from 'vitest';
import { motivoDeDescarte } from './descarte';
import { gerarBlocos, gerarComposicao, gerarDocumento } from './index';
import { mapearMatricula, mapearSociedade, type MatriculaParaMapear } from './mapeadores';
import { renderBloco } from './render';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { Bloco, Contexto, Template } from './types';

/** Matrícula cadastrada só pela metade (sem cartório vinculado). */
const MATRICULA_VAZIA: MatriculaParaMapear = {
  numero: null, livro: null, folha: null,
  municipio_imovel: null, uf_imovel: null,
  area_documento: null, area_unidade: null, vlr_contabil: null,
  confrontacoes_texto: null, descricao_psa_completa: null,
  bem: null, cartorio: null, titulares: [],
};

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

describe('emenda 9.1 · valor que o motor sintetizou não segura o bloco', () => {
  // Redação canônica da cláusula de capital depois que a L3 troca o literal
  // "R$ 1,00 (um real)" pelas variáveis: dois campos que o motor SEMPRE preenche.
  const CAPITAL: Template = {
    id: 'capital',
    nome: 'capital social',
    blocos: [
      bloco('cl-capital', 'clausula',
        'O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em ' +
        '{{ sociedade.totalQuotas }} quotas de R$ {{ sociedade.quotaValorNominal }} ' +
        '({{ sociedade.quotaValorNominalExtenso }}) cada uma.'),
      bloco('cl-foro', 'clausula', 'Fica eleito o foro de {{ sociedade.sedeMunicipio }}.'),
    ],
  };

  it('a cláusula de capital de sociedade SEM capital some, apesar do valor nominal', () => {
    const sociedade = mapearSociedade(
      { id: 'e1', denominacao: 'Vale Verde Ltda.', tipo_pessoa: 'PJ', endereco_municipio: 'Sorriso' } as unknown as PessoaRow,
    );
    const { blocos, descartados } = gerarComposicao(CAPITAL, { sociedade });

    expect(blocos.map((b) => b.id)).toEqual(['cl-foro']);
    expect(descartados).toEqual([
      { id: 'cl-capital', instanciaDe: undefined, tipo: 'clausula', motivo: 'campos-vazios' },
    ]);
  });

  it('com capital calculado, a mesma cláusula volta inteira', () => {
    const sociedade = mapearSociedade(
      { id: 'e1', denominacao: 'Vale Verde Ltda.', tipo_pessoa: 'PJ', endereco_municipio: 'Sorriso' } as unknown as PessoaRow,
      { capitalValor: 1500, totalQuotas: 1500, quotaValorNominal: 1 },
    );
    const texto = gerarDocumento(CAPITAL, { sociedade });
    expect(texto).toContain('R$ 1.500,00 (mil e quinhentos reais), dividido em 1.500 quotas de R$ 1,00 (um real)');
  });

  it('a marca de sintetizado sobrevive ao round-trip JSON do snapshot', () => {
    const sociedade = mapearSociedade(
      { id: 'e1', denominacao: 'Vale Verde Ltda.', tipo_pessoa: 'PJ', endereco_municipio: 'Sorriso' } as unknown as PessoaRow,
    );
    const snapshot = JSON.parse(JSON.stringify(sociedade)) as Record<string, string>;
    expect(gerarComposicao(CAPITAL, { sociedade: snapshot }).blocos).toHaveLength(1);
    expect(gerarComposicao(CAPITAL, { sociedade: snapshot }).blocos[0].id).toBe('cl-foro');
  });

  it('o rótulo genérico de cartório também não segura sozinho um bloco', () => {
    const soCartorio: Template = {
      id: 'cartorio',
      nome: 'serventia',
      blocos: [bloco('serventia', 'livre', 'Registrado no {{ imovel.cartorio }}, da comarca de {{ imovel.comarca }}.')],
    };
    const semCartorio = mapearMatricula({ ...MATRICULA_VAZIA, numero: '9.617' });
    expect(gerarComposicao(soCartorio, { imovel: semCartorio }).descartados).toEqual([
      { id: 'serventia', instanciaDe: undefined, tipo: 'livre', motivo: 'campos-vazios' },
    ]);

    // Com dado de verdade no bloco, o rótulo genérico segue impresso (o campo
    // não pode deixar de existir): o que ele não pode é sustentar o bloco sozinho.
    const comNumero: Template = {
      id: 'imovel',
      nome: 'descrição de imóvel',
      blocos: [bloco('descricao', 'livre', 'Imóvel matriculado sob o nº {{ imovel.numero }} do {{ imovel.cartorio }}.')],
    };
    expect(gerarDocumento(comNumero, { imovel: semCartorio })).toBe(
      'Imóvel matriculado sob o nº 9.617 do Cartório de Registro de Imóveis.',
    );
  });
});

describe('emenda 9.5 · referências sobrevivem ao descarte', () => {
  it('item de bloco repetidor descartado não mantém o {{ ref }} da passada anterior', () => {
    const itens = [
      { socio: { nome: 'Ivete Zanella' }, imovel: { numero: '9.617' } },
      // Segundo sócio sem nada: o parágrafo dele é descartado.
      { socio: { nome: '' }, imovel: { numero: '' } },
    ];
    const template: Template = {
      id: 'integraliza',
      nome: 'integralização',
      blocos: [
        bloco('cl', 'clausula',
          'O capital é integralizado {{#integralizacoes sep="; " fim="; e "}}pelo sócio ' +
          '{{ socio.nome }}, no {{ ref }} desta cláusula{{/integralizacoes}}.'),
        { ...bloco('p', 'paragrafo', 'O sócio {{ socio.nome }} integraliza a matrícula {{ imovel.numero }}.'), repeteColecao: 'integralizacoes' },
      ],
    };

    const texto = gerarDocumento(template, { integralizacoes: itens });
    // Sobrou um parágrafo só, e ele é o Único: a citação do sócio que ficou de
    // fora sai VAZIA, nunca apontando para um parágrafo que não existe.
    expect(texto).toContain('pelo sócio Ivete Zanella, no parágrafo único desta cláusula');
    expect(texto).toContain('; e pelo sócio , no  desta cláusula.');
    expect(texto).not.toContain('parágrafo segundo');
  });

  it('bloco ANCORADO descartado esvazia a citação e descarta a frase órfã', () => {
    const template: Template = {
      id: 'ancora',
      nome: 'âncora descartada',
      blocos: [
        bloco('cl1', 'clausula', 'Aplicam-se os critérios da {{ refs.haveres }} deste contrato.'),
        { ...bloco('cl2', 'clausula', 'Critérios: {{ sociedade.objeto }}.'), ancora: 'haveres' },
      ],
    };
    expect(gerarDocumento(template, { sociedade: { objeto: '' } })).toBe('');
  });

  it('descarta em cascata bloco cujo único dado era a referência removida', () => {
    const template: Template = {
      id: 'cascata',
      nome: 'referência como único dado',
      blocos: [
        bloco('citacao', 'livre', '{{ refs.haveres }}'),
        { ...bloco('haveres', 'clausula', '{{ sociedade.objeto }}'), ancora: 'haveres' },
      ],
    };
    const composicao = gerarComposicao(template, { sociedade: { objeto: '' } });
    expect(composicao.blocos).toEqual([]);
    expect(composicao.descartados.map((b) => b.id)).toEqual(['haveres', 'citacao']);
  });

  it('âncora de bloco excluído pelas FLAGS continua falhando cedo (regressão)', () => {
    const template: Template = {
      id: 'ancora-flag',
      nome: 'âncora por flag',
      blocos: [
        bloco('cl1', 'clausula', 'Ver {{ refs.haveres }}.'),
        { ...bloco('cl2', 'clausula', 'Haveres.'), ancora: 'haveres', obrigatorio: false, flagsRequeridas: ['x'] },
      ],
    };
    expect(() => gerarDocumento(template, {})).toThrow('refs.haveres');
  });
});

describe('emenda 9.2 · o descarte se anuncia', () => {
  it('reporta id, tipo e MOTIVO de cada bloco que ficou de fora', () => {
    const { blocos, descartados } = gerarComposicao(DOACAO, contextoSemOpcionais());
    expect(blocos).toHaveLength(2);
    expect(descartados).toEqual([
      { id: 'cl-onus', instanciaDe: undefined, tipo: 'clausula', motivo: 'campos-vazios' },
      { id: 'cl-benfeitorias', instanciaDe: undefined, tipo: 'clausula', motivo: 'campos-vazios' },
      { id: 'cl-arrendamento', instanciaDe: undefined, tipo: 'clausula', motivo: 'campos-vazios' },
      { id: 'cl-georref', instanciaDe: undefined, tipo: 'clausula', motivo: 'lista-vazia' },
      { id: 'cl-inscricao', instanciaDe: undefined, tipo: 'clausula', motivo: 'campos-vazios' },
    ]);
  });

  it('laço não fiado (seção resolvida como "" pela tela) aparece como lista-vazia, não some calado', () => {
    const fecho: Template = {
      id: 'fecho',
      nome: 'fecho',
      blocos: [bloco('assinaturas', 'livre', '{{#signatarios}}____\n{{ signatario.nome }}{{/signatarios}}')],
    };
    // É o que o controller injeta quando o papel de lista não está registrado.
    const { blocos, descartados } = gerarComposicao(fecho, { signatarios: [] });
    expect(blocos).toHaveLength(0);
    expect(descartados).toEqual([
      { id: 'assinaturas', instanciaDe: undefined, tipo: 'livre', motivo: 'lista-vazia' },
    ]);
  });

  it('instância de repetidor descartada reporta o bloco de origem', () => {
    const template: Template = {
      id: 'rep',
      nome: 'repetidor',
      blocos: [
        { ...bloco('p', 'paragrafo', 'O sócio {{ socio.nome }} integraliza.'), repeteColecao: 'socios' },
      ],
    };
    const { descartados } = gerarComposicao(template, {
      socios: [{ socio: { nome: 'Ivete Zanella' } }, { socio: { nome: '' } }],
    });
    expect(descartados).toEqual([
      { id: 'p#2', instanciaDe: 'p', tipo: 'paragrafo', motivo: 'campos-vazios' },
    ]);
  });
});

describe('motivoDeDescarte — a regra, caso a caso', () => {
  const render = (conteudo: string, ctx: Contexto = {}) => renderBloco(conteudo, ctx);

  it('prosa fixa sem placeholder NUNCA é descartada', () => {
    expect(motivoDeDescarte(render('A responsabilidade dos sócios é restrita ao valor de suas quotas.'))).toBeNull();
  });

  it('1 de 5 campos preenchido segura o bloco (a pontuação órfã é assunto das pendências)', () => {
    const ctx = { i: { a: 'Fazenda Sete Lagoas', b: '', c: '', d: '', e: '' } };
    expect(motivoDeDescarte(render('{{ i.a }}, {{ i.b }}, {{ i.c }}, {{ i.d }}, {{ i.e }}.', ctx))).toBeNull();
  });

  it('todos os campos vazios: descarta', () => {
    const ctx = { i: { a: '', b: '' } };
    expect(motivoDeDescarte(render('Área de {{ i.a }} e perímetro de {{ i.b }}.', ctx))).toBe('campos-vazios');
  });

  it('tabela sem corpo conta como ausência de dado; com corpo, segura o bloco', () => {
    const cabecalho = 'Memorial:\n| Vértice | Azimute |\n| :--- | ---: |\n';
    const corpo = '{{#vertices}}| {{ vertice.cod }} | {{ vertice.az }} |{{/vertices}}';
    // A tabela é alimentada por um laço: o motivo mais específico é a lista.
    expect(motivoDeDescarte(render(cabecalho + corpo, { vertices: [] }))).toBe('lista-vazia');
    // Tabela escrita à mão, sem laço: linha de células vazias é buraco, não dado.
    expect(motivoDeDescarte(render('| A | B |\n| :-- | --: |\n| {{ i.a }} | {{ i.b }} |', { i: { a: '', b: '' } })))
      .toBe('tabela-vazia');
    expect(
      motivoDeDescarte(render(cabecalho + corpo, { vertices: [{ vertice: { cod: 'M-01', az: '12°' } }] })),
    ).toBeNull();
  });

  it('seção de repetição com item segura o bloco; sem item, nem a prosa em volta o segura', () => {
    const conteudo = 'Quadro societário:\n{{#socios}}- {{ socio.nome }}{{/socios}}';
    expect(motivoDeDescarte(render(conteudo, { socios: [{ socio: { nome: '' } }] }))).toBeNull();
    // "Quadro societário:" sozinho é frase órfã: o bloco PEDIA uma lista.
    expect(motivoDeDescarte(render(conteudo, { socios: [] }))).toBe('lista-vazia');
    // E o bloco cujo corpo inteiro é o laço não sobra como parágrafo mudo.
    expect(motivoDeDescarte(render('{{#socios}}{{ socio.nome }}{{/socios}}', { socios: [] }))).toBe('lista-vazia');
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
