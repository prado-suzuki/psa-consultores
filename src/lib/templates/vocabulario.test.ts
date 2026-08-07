import { describe, it, expect } from 'vitest';
import { extrairCampos } from './render';
import { gerarDocumento } from './index';
import { campoDaEntidade, camposDaEntidade, derivarCampos, type TipoEntidade } from './vocabulario';
import { condicionalDeBinding, conteudoParaDeteccao, detectarBindings, detectarBindingsDeConteudo, resolverTipoDoBinding } from './binding';
import { concordarTexto } from './concordancia';
import {
  mapearIntegralizacoes,
  mapearMatricula,
  mapearPessoa,
  mapearSocio,
  montarContexto,
  type MatriculaParaMapear,
  type SocioParaMapear,
} from './mapeadores';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { Template } from './types';

// Fixture namespaced: o mesmo bloco da Mat. 9.617, agora todo sob o binding `imovel`.
const CONTEUDO_IMOVEL =
  'Um imóvel rural com área de {{imovel.area}} ({{imovel.areaExtenso}}), ' +
  'denominado {{imovel.denominacao}}, de propriedade de {{imovel.proprietario}}, ' +
  'situado no município de {{imovel.municipio}}, Estado de {{imovel.uf}}, ' +
  'com registro na matrícula de n° {{imovel.numero}}, ' +
  'no Livro {{imovel.livro}} ({{imovel.livroExtenso}}), folhas/ficha {{imovel.folha}} ({{imovel.folhaExtenso}}) ' +
  'do {{imovel.cartorio}} da comarca de {{imovel.comarca}}, Estado de {{imovel.ufCartorio}}, ' +
  'no valor de R$ {{imovel.valor}} ({{imovel.valorExtenso}}), ' +
  'inscrito no cadastro de imóvel rural sob o n° {{imovel.ccir}}, ' +
  'com os seguintes limites e confrontações: {{imovel.confrontacoes}}.';

const TEMPLATE_IMOVEL: Template = {
  id: 'fixture-imovel',
  nome: 'Fixture — descrição de imóvel',
  blocos: [{ id: 'bloco-imovel', obrigatorio: true, conteudo: CONTEUDO_IMOVEL }],
};

// Linha de matrícula da Mat. 9.617 (formato enriquecido que o hook entrega ao mapeador).
const MAT_9617: MatriculaParaMapear = {
  numero: '9.617', livro: '02', folha: '01',
  municipio_imovel: 'Lucas do Rio Verde', uf_imovel: 'MT',
  area_documento: 396.4, area_unidade: 'ha', vlr_contabil: 558413.55,
  confrontacoes_texto: '01-02 com 758,00 metros', descricao_psa_completa: null,
  bem: { denominacao: 'Fazenda Tarumã', vlr_contabil: null, ccir_codigo: '901.032.174.190-6' },
  cartorio: { nome_completo: 'Cartório de 1° Ofício de Imóveis', comarca: 'Lucas do Rio Verde', uf: 'MT' },
  titulares: [{ denominacao: 'Jose Eduardo de Macedo Soares Junior' }],
};

function pessoa(genero: 'M' | 'F'): PessoaRow {
  return {
    denominacao: 'Fulano de Tal', estado_civil: 'Casado(a)', genero,
    nacionalidade: 'Brasileiro', profissao: 'Empresário',
    documento_identidade_numero: '123', documento_identidade_orgao: 'SSP',
    documento_identidade_uf: 'MT', cpf_cnpj: '000',
  } as unknown as PessoaRow;
}

describe('binding', () => {
  it('detecta o binding `imovel` (tipo matrícula) e nenhum desconhecido', () => {
    const { bindings, desconhecidos } = detectarBindings(extrairCampos(CONTEUDO_IMOVEL));
    expect(desconhecidos).toEqual([]);
    expect(bindings).toEqual([{ nome: 'imovel', tipo: 'matricula', cardinalidade: 'um' }]);
  });

  it('resolve papéis exatos, por radical numérico e desconhecidos', () => {
    expect(resolverTipoDoBinding('proprietario')).toBe('pessoa');
    expect(resolverTipoDoBinding('socio2')).toBe('pessoa');
    expect(resolverTipoDoBinding('imovel')).toBe('matricula');
    expect(resolverTipoDoBinding('foo')).toBeNull();
  });

  it('placeholders sem ponto ou com papel desconhecido viram desconhecidos', () => {
    const { bindings, desconhecidos } = detectarBindings(['campoLivre', 'foo.bar', 'proprietario.nome']);
    expect(bindings.map((b) => b.nome)).toEqual(['proprietario']);
    expect(desconhecidos).toEqual(['campoLivre', 'foo.bar']);
  });

  it('reconhece condicionais de binding (papel + campo do catálogo)', () => {
    expect(condicionalDeBinding('imovel.fracionado')).toBe(true);
    expect(condicionalDeBinding('proprietario.profissao')).toBe(true);
    expect(condicionalDeBinding('imovel.naoExiste')).toBe(false);
    expect(condicionalDeBinding('foo.bar')).toBe(false);
    expect(condicionalDeBinding('socios')).toBe(false);
  });
});

describe('condicional de binding na tela Gerar — regressão Agroaliança 13.1809', () => {
  // Conteúdo real do bloco "Teste de Matriculas" (com a seção {{#imovel.fracionado}}).
  const CONTEUDO_FRACIONADO =
    '{{#imovel.fracionado}}*{{ imovel.percentual }}* ({{ imovel.percentualExtenso }}) de um {{/imovel.fracionado}}' +
    'imóvel rural com área de {{ imovel.area }}, denominado {{ imovel.denominacao }}, ' +
    'de propriedade de {{ imovel.proprietario }}' +
    '{{#imovel.fracionado}}. Sendo a área remanescente deste imóvel de {{ imovel.remanescente }}.{{/imovel.fracionado}}';

  const AGROALIANCA: MatriculaParaMapear = {
    numero: '13.1809', livro: null, folha: null,
    municipio_imovel: null, uf_imovel: null,
    area_documento: 387.6829, area_unidade: 'ha', vlr_contabil: null,
    confrontacoes_texto: null, descricao_psa_completa: null,
    bem: { denominacao: 'Agroaliança Porto II', vlr_contabil: null, ccir_codigo: null },
    cartorio: null,
    titulares: [
      { pessoaId: 'a', denominacao: 'Avelino Neri Bocolli', fracao: 50 },
      { pessoaId: 'c', denominacao: 'Cristina Kileba Bocolli Bordignon', fracao: 50 },
      { pessoaId: 'a', denominacao: 'Avelino Neri Bocolli', integralizador: true, fracao: 50 },
      { pessoaId: 'c', denominacao: 'Cristina Kileba Bocolli Bordignon', fracao: 50 },
    ],
  };

  // Espelha o fluxo da tela Gerar: detecção estrutural → seções desconhecidas
  // forçadas a '' (prévia viva) → contexto montado → render.
  function gerarComoATela(titulares: MatriculaParaMapear['titulares']): string {
    const { bindings, secoesDesconhecidas } = detectarBindingsDeConteudo(CONTEUDO_FRACIONADO);
    const livres = Object.fromEntries(secoesDesconhecidas.map((nome) => [nome, '']));
    const ctx = montarContexto(bindings, { imovel: mapearMatricula({ ...AGROALIANCA, titulares }) }, livres);
    const template: Template = { id: 't', nome: 'n', blocos: [{ id: 'b', obrigatorio: true, conteudo: CONTEUDO_FRACIONADO }] };
    return gerarDocumento(template, ctx);
  }

  it('a seção {{#imovel.fracionado}} NÃO é desconhecida (não pode ser forçada a vazio)', () => {
    const { bindings, secoesDesconhecidas } = detectarBindingsDeConteudo(CONTEUDO_FRACIONADO);
    expect(secoesDesconhecidas).toEqual([]);
    expect(bindings.map((b) => b.nome)).toEqual(['imovel']);
  });

  it('com integralizador marcado, renderiza fração + remanescente', () => {
    const texto = gerarComoATela(AGROALIANCA.titulares);
    expect(texto).toBe(
      '*50,000%* (cinquenta inteiros por cento) de um imóvel rural com área de 387,6829 ha, ' +
      'denominado Agroaliança Porto II, de propriedade de Avelino Neri Bocolli. ' +
      'Sendo a área remanescente deste imóvel de Cristina Kileba Bocolli Bordignon.',
    );
  });

  it('sem integralizador, renderiza a forma inteira ("A e B"), sem fração', () => {
    const titulares = AGROALIANCA.titulares.map((t) => ({ ...t, integralizador: false }));
    const texto = gerarComoATela(titulares);
    expect(texto).toBe(
      'imóvel rural com área de 387,6829 ha, denominado Agroaliança Porto II, ' +
      'de propriedade de Avelino Neri Bocolli e Cristina Kileba Bocolli Bordignon',
    );
  });
});

describe('bloco repetidor sobre integralizações — detecção e render aninhado (padrão MMS)', () => {
  // Corpo de um bloco PARÁGRAFO repetidor (repete por integralizações): o rótulo
  // "Parágrafo Segundo:" vem da numeração; a referência cruzada, do carimbo
  // {{ ref }} no item da 1ª descrição ({{ refItem.ref }}).
  const CONTEUDO =
    'O sócio {{ socio.nome }} integraliza:\n' +
    '{{#imoveis sep="\\n"}}{{ imovel.alinea }}) ' +
    '{{#completa}}{{ imovel.percentual }} de um imóvel rural, matrícula {{ imovel.numero }}, ' +
    'de propriedade de {{ imovel.proprietario }}, no valor de R$ {{ imovel.valor }}. ' +
    'Área remanescente de {{ imovel.remanescente }}.{{/completa}}' +
    '{{#referencia}}{{ imovel.percentual }} do imóvel descrito na alínea "{{ imovel.refAlinea }}" ' +
    'do {{ refItem.ref }}, matrícula {{ imovel.numero }}, ' +
    'de propriedade de {{ imovel.proprietario }}, no valor de R$ {{ imovel.valor }}.{{/referencia}}' +
    '{{/imoveis}}';

  const socios: SocioParaMapear[] = [
    { pessoa: { id: 'j', denominacao: 'José Eduardo', tipo_pessoa: 'PF' } as unknown as PessoaRow, quotas: 1, vlr_total: 1, representante: null },
    { pessoa: { id: 'm', denominacao: 'Maria Auxiliadora', tipo_pessoa: 'PF' } as unknown as PessoaRow, quotas: 1, vlr_total: 1, representante: null },
  ];
  const matriculas = [{
    id: 'm1', numero: '2.424', livro: null, folha: null,
    municipio_imovel: null, uf_imovel: null,
    area_documento: null, area_unidade: null, vlr_contabil: 250000,
    confrontacoes_texto: null, descricao_psa_completa: null,
    bem: null, cartorio: null,
    titulares: [
      { pessoaId: 'j', denominacao: 'José Eduardo', fracao: 50 },
      { pessoaId: 'm', denominacao: 'Maria Auxiliadora', fracao: 50 },
    ],
  }];

  const repetidor = {
    id: 'b',
    tipo: 'paragrafo' as const,
    obrigatorio: true,
    conteudo: CONTEUDO,
    repeteColecao: 'integralizacoes',
  };

  it('a detecção (via conteudoParaDeteccao) vê a lista, sem binding unitário nem texto livre de ref', () => {
    const det = detectarBindingsDeConteudo(conteudoParaDeteccao(repetidor));
    expect(det.listas.map((l) => l.nome)).toEqual(['integralizacoes']);
    expect(det.secoesDesconhecidas).toEqual([]);
    expect(det.bindings).toEqual([]);
    expect(det.desconhecidos).toEqual([]);
  });

  it('cada sócio vira um parágrafo numerado; a referência cruzada usa o carimbo do original', () => {
    const det = detectarBindingsDeConteudo(conteudoParaDeteccao(repetidor));
    const itens = mapearIntegralizacoes(socios, matriculas);
    const ctx = montarContexto(det.bindings, {}, {}, { integralizacoes: itens }, det.listas);
    const template: Template = {
      id: 't',
      nome: 'n',
      blocos: [
        { id: 'resp', tipo: 'paragrafo', obrigatorio: true, conteudo: 'A responsabilidade é restrita.' },
        repetidor,
      ],
    };
    const texto = gerarDocumento(template, ctx);

    expect(texto).toContain('*Parágrafo Primeiro:* A responsabilidade é restrita.');
    expect(texto).toContain('*Parágrafo Segundo:* O sócio José Eduardo integraliza:');
    expect(texto).toContain(
      'a) 50,000% de um imóvel rural, matrícula 2.424, de propriedade de José Eduardo, ' +
      'no valor de R$ 125.000,00. Área remanescente de Maria Auxiliadora.',
    );
    expect(texto).toContain('*Parágrafo Terceiro:* O sócio Maria Auxiliadora integraliza:');
    expect(texto).toContain(
      'a) 50,000% do imóvel descrito na alínea "a" do parágrafo segundo, matrícula 2.424, ' +
      'de propriedade de Maria Auxiliadora, no valor de R$ 125.000,00.',
    );
  });
});

describe('vocabulário namespaced — paridade Mat. 9.617', () => {
  it('reproduz o texto da Mat. 9.617 sob o namespace imovel.*', () => {
    const { bindings } = detectarBindings(extrairCampos(CONTEUDO_IMOVEL));
    const ctx = montarContexto(bindings, { imovel: mapearMatricula(MAT_9617) });
    const texto = gerarDocumento(TEMPLATE_IMOVEL, ctx);

    expect(texto).toContain('área de 396,4000 ha (trezentos e noventa e seis hectares e quarenta ares)');
    expect(texto).toContain('denominado Fazenda Tarumã, de propriedade de Jose Eduardo de Macedo Soares Junior');
    expect(texto).toContain('município de Lucas do Rio Verde, Estado de Mato Grosso');
    expect(texto).toContain('matrícula de n° 9.617');
    expect(texto).toContain('no Livro 02 (dois), folhas/ficha 01 (um)');
    expect(texto).toContain('R$ 558.413,55 (quinhentos e cinquenta e oito mil, quatrocentos e treze reais e cinquenta e cinco centavos)');
    expect(texto).toContain('sob o n° 901.032.174.190-6');
  });

  it('re-deriva os extensos a partir de valores editados manualmente', () => {
    const editado = derivarCampos('matricula', { area: '396,4000 ha', valor: '558.413,55', livro: '02', folha: '01' });
    expect(editado.areaExtenso).toBe('trezentos e noventa e seis hectares e quarenta ares');
    expect(editado.valorExtenso).toBe('quinhentos e cinquenta e oito mil, quatrocentos e treze reais e cinquenta e cinco centavos');
    expect(editado.livroExtenso).toBe('dois');
    expect(editado.folhaExtenso).toBe('um');
  });
});

// Redação urbana da família "Descrição de imóvel" (variante 4 do seed
// 20260806140000, já com a troca de "nº {{ enderecoNumero }}" por
// {{ enderecoNumeroProsa }} aplicada no banco), verbatim — é o texto que o
// cartório vai ler.
const CONTEUDO_IMOVEL_URBANO =
  'Um imóvel urbano com área total de {{ imovel.area }} ({{ imovel.areaExtenso }})' +
  '{{#imovel.temAreaConstruida}}, sendo {{ imovel.areaConstruida }} de área construída{{/imovel.temAreaConstruida}}' +
  ', localizado na {{ imovel.enderecoLogradouro }}, {{ imovel.enderecoNumeroProsa }}, ' +
  '{{#imovel.enderecoComplemento}}{{ imovel.enderecoComplemento }}, {{/imovel.enderecoComplemento}}' +
  '{{ imovel.enderecoBairro }}, no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}, ' +
  'CEP {{ imovel.enderecoCep }}, de propriedade de {{ imovel.proprietario }}, ' +
  'com registro na matrícula de nº {{ imovel.numero }}, no Livro {{ imovel.livroExtenso }}, ' +
  'Folhas/Ficha {{ imovel.folhaExtenso }} do Cartório de Registro de Imóveis de {{ imovel.comarca }}, ' +
  'Estado de {{ imovel.ufCartorio }}, inscrito no cadastro municipal sob o nº {{ imovel.inscricaoMunicipal }}, ' +
  'no valor de R$ {{ imovel.valor }} ({{ imovel.valorExtenso }}), ' +
  'e com os seguintes limites e confrontações: {{ imovel.confrontacoes }}.';

const MAT_URBANA: MatriculaParaMapear = {
  numero: '30.482', livro: '2', folha: '15',
  municipio_imovel: 'Cuiabá', uf_imovel: 'MT',
  area_documento: 360, area_unidade: 'm2', vlr_contabil: 450000,
  confrontacoes_texto: 'frente para a Rua das Acácias, fundos com o lote 12',
  descricao_psa_completa: null,
  tipo_bem: 'IB',
  bem: {
    denominacao: null, vlr_contabil: null, ccir_codigo: null,
    inscricao_municipal: '1.234.567-8', area_construida_m2: 180,
    endereco_logradouro: 'Rua das Acácias', endereco_numero: '119',
    endereco_complemento: 'apartamento 302', endereco_bairro: 'Centro',
    endereco_cep: '78000-000',
  },
  cartorio: { nome_completo: 'Cartório do 2º Ofício', comarca: 'Cuiabá', uf: 'MT' },
  titulares: [{ denominacao: 'Jose Eduardo de Macedo Soares Junior' }],
};

describe('descrição de imóvel urbano — campos e condicionais do seed', () => {
  function gerarUrbano(m: MatriculaParaMapear): string {
    const { bindings } = detectarBindingsDeConteudo(CONTEUDO_IMOVEL_URBANO);
    const ctx = montarContexto(bindings, { imovel: mapearMatricula(m) });
    const template: Template = {
      id: 'fixture-urbano', nome: 'Fixture — imóvel urbano',
      blocos: [{ id: 'b', obrigatorio: true, conteudo: CONTEUDO_IMOVEL_URBANO }],
    };
    return gerarDocumento(template, ctx);
  }

  it('as novas condicionais são reconhecidas como condicionais de binding', () => {
    expect(condicionalDeBinding('imovel.urbano')).toBe(true);
    expect(condicionalDeBinding('imovel.rural')).toBe(true);
    expect(condicionalDeBinding('imovel.posse')).toBe(true);
    expect(condicionalDeBinding('imovel.temAreaConstruida')).toBe(true);
  });

  it('renderiza a redação urbana com área em m², endereço e cadastro municipal', () => {
    const texto = gerarUrbano(MAT_URBANA);
    expect(texto).toContain('área total de 360,00 m² (trezentos e sessenta metros quadrados)');
    expect(texto).toContain('sendo 180,00 m² de área construída');
    expect(texto).toContain('localizado na Rua das Acácias, nº 119, apartamento 302, Centro');
    expect(texto).toContain('no município de Cuiabá, Estado de Mato Grosso, CEP 78000-000');
    expect(texto).toContain('inscrito no cadastro municipal sob o nº 1.234.567-8');
    expect(texto).toContain('no Livro dois, Folhas/Ficha quinze');
    expect(texto).toContain('R$ 450.000,00 (quatrocentos e cinquenta mil reais)');
  });

  it('sem complemento e sem área construída, os dois trechos somem (sem quebrar)', () => {
    const texto = gerarUrbano({
      ...MAT_URBANA,
      bem: { ...MAT_URBANA.bem!, endereco_complemento: null, area_construida_m2: null },
    });
    expect(texto).toContain('nº 119, Centro,');
    expect(texto).not.toContain('área construída');
  });

  it('imóvel sem número sai "s/nº", e não "nº s/n"', () => {
    const texto = gerarUrbano({
      ...MAT_URBANA,
      bem: { ...MAT_URBANA.bem!, endereco_numero: 's/n' },
    });
    expect(texto).toContain('localizado na Rua das Acácias, s/nº, apartamento 302');
    expect(texto).not.toContain('nº s/n');
  });

  it('área construída igual à total não entra no texto', () => {
    const texto = gerarUrbano({
      ...MAT_URBANA,
      bem: { ...MAT_URBANA.bem!, area_construida_m2: 360 },
    });
    expect(texto).not.toContain('área construída');
  });
});

describe('unidade da área na edição manual (tela Gerar)', () => {
  it('a unidade vem do campo base areaUnidade, e o extenso a segue', () => {
    expect(derivarCampos('matricula', { area: '360,00 m²', areaUnidade: 'm2' }).areaExtenso).toBe(
      'trezentos e sessenta metros quadrados',
    );
    expect(derivarCampos('matricula', { area: '396,4000 ha', areaUnidade: 'ha' }).areaExtenso).toBe(
      'trezentos e noventa e seis hectares e quarenta ares',
    );
    // 'm²' digitado à mão no lugar de 'm2' também vale.
    expect(derivarCampos('matricula', { area: '360,00', areaUnidade: 'm²' }).areaExtenso).toBe(
      'trezentos e sessenta metros quadrados',
    );
  });

  it('o sufixo do texto NÃO decide a unidade nem entra no número', () => {
    // Regressão: com a unidade adivinhada do texto, "360 m2" virava 3.602 (o "2"
    // entrava no número) e "360" sem sufixo virava trezentos e sessenta HECTARES.
    expect(derivarCampos('matricula', { area: '360 m2', areaUnidade: 'm2' }).areaExtenso).toBe(
      'trezentos e sessenta metros quadrados',
    );
    expect(derivarCampos('matricula', { area: '360', areaUnidade: 'm2' }).areaExtenso).toBe(
      'trezentos e sessenta metros quadrados',
    );
    expect(derivarCampos('matricula', { area: '360,00 metros quadrados', areaUnidade: 'm2' }).areaExtenso).toBe(
      'trezentos e sessenta metros quadrados',
    );
  });

  it('sem areaUnidade assume hectare (comportamento anterior ao imóvel urbano)', () => {
    expect(derivarCampos('matricula', { area: '396,4000' }).areaExtenso).toBe(
      'trezentos e noventa e seis hectares e quarenta ares',
    );
  });

  it('texto que não é um número devolve extenso vazio (melhor vazio que unidade errada)', () => {
    expect(derivarCampos('matricula', { area: '12,5 ha (125.000 m²)', areaUnidade: 'ha' }).areaExtenso).toBe('');
    expect(derivarCampos('matricula', { area: 'a combinar' }).areaExtenso).toBe('');
    expect(derivarCampos('matricula', { area: '' }).areaExtenso).toBe('');
  });

  it('a unidade digitada por extenso também vale (mesmo vocabulário dos dois lados)', () => {
    // Regressão: `areaUnidade` aceitava só 'm2'/'m²' enquanto o sufixo de `area`
    // aceitava "metros quadrados" — quem trocasse o pré-preenchido pela palavra
    // caía no default hectare e o apartamento saía "trezentos e sessenta hectares".
    for (const unidade of ['m2', 'm²', 'M2', 'metros quadrados', 'metro quadrado']) {
      expect(derivarCampos('matricula', { area: '360,00', areaUnidade: unidade }).areaExtenso).toBe(
        'trezentos e sessenta metros quadrados',
      );
    }
    for (const unidade of ['ha', 'ha_m2', 'hectares', 'hectare', '']) {
      expect(derivarCampos('matricula', { area: '1,0000', areaUnidade: unidade }).areaExtenso).toBe('um hectare');
    }
  });

  it('ponto sem vírgula é milhar em pt-BR, não decimal (erro de 1000x no extenso)', () => {
    // "1.234 ha" digitado à mão: Number() leria 1,234 e o contrato sairia com
    // "um hectare, vinte e três ares e quarenta centiares" em lugar de 1.234 ha.
    expect(derivarCampos('matricula', { area: '1.234 ha', areaUnidade: 'ha' }).areaExtenso).toBe(
      'mil, duzentos e trinta e quatro hectares',
    );
    expect(derivarCampos('matricula', { area: '1.234', areaUnidade: 'ha' }).areaExtenso).toBe(
      'mil, duzentos e trinta e quatro hectares',
    );
    expect(derivarCampos('matricula', { area: '1.234.567', areaUnidade: 'm2' }).areaExtenso).toBe(
      'um milhão, duzentos e trinta e quatro mil, quinhentos e sessenta e sete metros quadrados',
    );
    // Sem grupos de 3 dígitos segue valendo como decimal cru (leitura tolerante).
    expect(derivarCampos('matricula', { area: '396.4', areaUnidade: 'ha' }).areaExtenso).toBe(
      'trezentos e noventa e seis hectares e quarenta ares',
    );
  });

  it('área negativa não vira "zero": não é parseável', () => {
    expect(derivarCampos('matricula', { area: '-360,00', areaUnidade: 'm2' }).areaExtenso).toBe('');
  });

  it('temAreaConstruida acompanha a área editada, comparando unidades diferentes', () => {
    const tem = (area: string, areaUnidade: string, areaConstruida: string) =>
      derivarCampos('matricula', { area, areaUnidade, areaConstruida }).temAreaConstruida;
    expect(tem('360,00 m²', 'm2', '180,00 m²')).toBe('sim');
    expect(tem('1,0000 ha', 'ha', '180,00 m²')).toBe('sim');
    expect(tem('180,00 m²', 'm2', '180,00 m²')).toBe('');
    expect(tem('0,1005 ha', 'ha', '1.005,00 m²')).toBe('');
    // Construída zerada ou negativa digitada à mão é cadastro inválido, não
    // construção: o trecho fica fora (o caminho do mapeador já guarda o dado bruto).
    expect(tem('360,00 m²', 'm2', '0,00 m²')).toBe('');
    expect(tem('360,00 m²', 'm2', '0')).toBe('');
    expect(tem('360,00 m²', 'm2', '-10,00 m²')).toBe('');
    expect(derivarCampos('matricula', { areaConstruida: '180,00 m²' }).temAreaConstruida).toBe('');
  });

  it('classificação re-deriva do tipo do bem editado', () => {
    expect(derivarCampos('matricula', { tipoBem: 'IB' }).urbano).toBe('sim');
    expect(derivarCampos('matricula', { tipoBem: 'IB' }).rural).toBe('');
    expect(derivarCampos('matricula', { tipoExploracaoPosse: 'Posse' }).posse).toBe('sim');
    expect(derivarCampos('matricula', { tipoExploracaoPosse: 'Arrendamento' }).posse).toBe('');
  });
});

describe('painel "Ajustar dados manualmente" — campos base que o catálogo expõe', () => {
  /**
   * Espelha a expansão de `camposPorBinding` (useGerarDocumentoController.ts): um
   * campo DERIVADO referenciado no modelo não vira input; o que vira input são os
   * campos-base dele. É por isso que a unidade da área precisa ser base e constar
   * em `derivadoDe` do extenso: sem ela na lista, o consultor não tem onde
   * corrigir a unidade, e o derivado é reescrito a cada edição.
   */
  function camposDoPainel(tipo: TipoEntidade, referenciados: string[]): string[] {
    const out: string[] = [];
    for (const id of referenciados) {
      const campo = campoDaEntidade(tipo, id);
      const bases = campo?.derivadoDe
        ? (Array.isArray(campo.derivadoDe) ? campo.derivadoDe : [campo.derivadoDe])
        : [id];
      for (const base of bases) if (!out.includes(base)) out.push(base);
    }
    return out;
  }

  it('{{ imovel.areaExtenso }} expõe a área E a unidade', () => {
    expect(camposDoPainel('matricula', ['areaExtenso'])).toEqual(['area', 'areaUnidade']);
  });

  it('{{ imovel.temAreaConstruida }} expõe as duas áreas e a unidade', () => {
    expect(camposDoPainel('matricula', ['temAreaConstruida'])).toEqual([
      'area', 'areaUnidade', 'areaConstruida',
    ]);
  });

  it('{{ imovel.enderecoNumeroProsa }} expõe o número cru, não a prosa', () => {
    expect(camposDoPainel('matricula', ['enderecoNumeroProsa'])).toEqual(['enderecoNumero']);
  });

  it('as condicionais de classificação expõem o tipo do bem e a exploração', () => {
    expect(camposDoPainel('matricula', ['rural', 'urbano'])).toEqual(['tipoBem']);
    expect(camposDoPainel('matricula', ['posse'])).toEqual(['tipoExploracaoPosse']);
    expect(camposDoPainel('matricula', ['fracionado'])).toEqual(['percentual', 'remanescente']);
  });

  it('todo campo listado em derivadoDe existe no catálogo da entidade', () => {
    // Base inexistente é silenciosa: o painel simplesmente não mostra o input.
    for (const tipo of ['pessoa', 'sociedade', 'bem', 'matricula', 'cartorio', 'vertice'] as TipoEntidade[]) {
      for (const campo of camposDaEntidade(tipo)) {
        const bases = campo.derivadoDe
          ? (Array.isArray(campo.derivadoDe) ? campo.derivadoDe : [campo.derivadoDe])
          : [];
        for (const base of bases) {
          expect(campoDaEntidade(tipo, base), `${tipo}.${campo.id} → ${base}`).toBeDefined();
        }
      }
    }
  });
});

describe('concordância de gênero', () => {
  it('deriva formas masculinas e femininas de pessoa.genero', () => {
    const m = mapearPessoa(pessoa('M'));
    const f = mapearPessoa(pessoa('F'));

    expect(m.casado).toBe('Casado');
    expect(m.nascido).toBe('nascido');
    expect(m.artigo).toBe('o');

    expect(f.casado).toBe('Casada');
    expect(f.nascido).toBe('nascida');
    expect(f.artigo).toBe('a');
    expect(f.residente).toBe('residente e domiciliada');
  });

  it('concorda o documento conforme o gênero do proprietário', () => {
    const conteudo = '{{proprietario.nome}}, {{proprietario.casado}} e {{proprietario.nascido}}.';
    const template: Template = { id: 't', nome: 'n', blocos: [{ id: 'b', obrigatorio: true, conteudo }] };
    const { bindings } = detectarBindings(extrairCampos(conteudo));

    const ctxM = montarContexto(bindings, { proprietario: mapearPessoa(pessoa('M')) });
    expect(gerarDocumento(template, ctxM)).toBe('Fulano de Tal, Casado e nascido.');

    const ctxF = montarContexto(bindings, { proprietario: mapearPessoa(pessoa('F')) });
    expect(gerarDocumento(template, ctxF)).toBe('Fulano de Tal, Casada e nascida.');
  });

  it('concorda texto marcado e mantém texto sem marcação', () => {
    expect(concordarTexto('Solteiro(a)', 'F')).toBe('Solteira');
    expect(concordarTexto('Solteiro(a)', 'M')).toBe('Solteiro');
    expect(concordarTexto('União Estável', 'F')).toBe('União Estável');
    expect(concordarTexto(null, 'M')).toBe('');
  });
});

describe('qualificação completa (pessoa.qualificacao)', () => {
  // Casos calcados no Contrato Social da Agropecuária Bom Pastor (modelo real).
  function pf(extra: Record<string, unknown>): PessoaRow {
    return { ...pessoa('M'), tipo_pessoa: 'PF', ...extra } as unknown as PessoaRow;
  }

  it('PF casado injeta o regime de bens e o endereço em prosa', () => {
    const campos = mapearPessoa(pf({
      denominacao: 'Wilson Carlos Galera', genero: 'M',
      estado_civil: 'Casado(a)', regime_bens: 'Comunhão Universal',
      profissao: 'engenheiro civil', cpf_cnpj: '803.465.108-72',
      documento_identidade_numero: '498924-0', documento_identidade_orgao: 'SSP', documento_identidade_uf: 'SP',
      nacionalidade: 'Brasileiro',
      endereco_logradouro: 'Rua Professor Estevão Correa', endereco_numero: '119',
      endereco_complemento: null, endereco_bairro: null,
      endereco_municipio: 'Cuiabá', endereco_uf: 'MT', endereco_cep: '78000-000',
    }));
    expect(campos.qualificacao).toBe(
      '*WILSON CARLOS GALERA*, brasileiro, casado em regime de comunhão universal de bens, ' +
      'engenheiro civil, portador do RG nº 498924-0 SSP/SP, inscrito no CPF/MF sob o nº 803.465.108-72, ' +
      'residente e domiciliado na Rua Professor Estevão Correa, nº 119, ' +
      'no município de Cuiabá, Estado de Mato Grosso, CEP: 78000-000',
    );
  });

  it('PF solteira ganha "nascida em" (exigência da Junta) e concorda no feminino', () => {
    const campos = mapearPessoa(pf({
      denominacao: 'MARIA LUIZA SANSÃO', genero: 'F',
      estado_civil: 'Solteiro(a)', regime_bens: null, data_nascimento: '1969-06-04',
      profissao: 'administradora de empresas', cpf_cnpj: '452.895.221-15',
      documento_identidade_numero: '622.505', documento_identidade_orgao: 'SSP', documento_identidade_uf: 'MT',
      nacionalidade: 'Brasileira',
    }));
    expect(campos.qualificacao).toContain('brasileira, solteira, nascida em 04/06/1969, administradora de empresas');
    expect(campos.qualificacao).toContain('portadora do RG nº 622.505 SSP/MT, inscrita no CPF/MF sob o nº 452.895.221-15');
  });

  it('PF viúva sai sem regime e sem data de nascimento; campos ausentes são omitidos', () => {
    const campos = mapearPessoa(pf({
      denominacao: 'MARTA BOIAGO SANSÃO', genero: 'F',
      estado_civil: 'Viúvo(a)', regime_bens: null, profissao: 'do lar',
      cpf_cnpj: '406.174.831-91',
      documento_identidade_numero: null, documento_identidade_orgao: null, documento_identidade_uf: null,
      nacionalidade: 'Brasileira',
    }));
    expect(campos.qualificacao).toBe(
      '*MARTA BOIAGO SANSÃO*, brasileira, viúva, do lar, inscrita no CPF/MF sob o nº 406.174.831-91',
    );
  });

  it('PJ qualifica com CNPJ, NIRE na Junta e sede estabelecida em prosa', () => {
    const campos = mapearPessoa({
      ...pessoa('M'), tipo_pessoa: 'PJ',
      denominacao: 'Agropecuária Bom Pastor Ltda.', cpf_cnpj: '07.013.633/0001-83',
      nire: '51200912501', junta_comercial_uf: 'MT',
      estado_civil: null, profissao: null, nacionalidade: null,
      documento_identidade_numero: null, documento_identidade_orgao: null, documento_identidade_uf: null,
      endereco_logradouro: 'Rodovia MT 343, km 10', endereco_numero: 's/n', endereco_complemento: 'lado direito',
      endereco_bairro: 'zona rural', endereco_municipio: 'Barra do Bugres', endereco_uf: 'MT',
      endereco_cep: '78393-970',
    } as unknown as PessoaRow);
    expect(campos.qualificacao).toBe(
      '*AGROPECUÁRIA BOM PASTOR LTDA.*, pessoa jurídica de direito privado, ' +
      'inscrita no CNPJ/MF sob o nº 07.013.633/0001-83, ' +
      'registrada na Junta Comercial do Estado de Mato Grosso sob o nº 51200912501, ' +
      'com sede estabelecida na Rodovia MT 343, km 10, s/nº, lado direito, zona rural, ' +
      'no município de Barra do Bugres, Estado de Mato Grosso, CEP: 78393-970',
    );
  });

  it('sócia PJ em lista incorpora o representante qualificado, com "por" contraído', () => {
    const item = mapearSocio({
      pessoa: { ...pessoa('M'), tipo_pessoa: 'PJ', denominacao: 'BOM PASTOR LTDA.', cpf_cnpj: '07.013.633/0001-83' } as unknown as PessoaRow,
      quotas: 100, vlr_total: 1000,
      representante: 'o senhor WILSON CARLOS GALERA, brasileiro, casado em regime de comunhão universal de bens, e, o senhor DANTE PETRONI NETO, brasileiro',
    });
    const socio = item.socio as Record<string, string>;
    expect(socio.qualificacao).toContain(
      'neste ato representada pelo senhor WILSON CARLOS GALERA, brasileiro, casado em regime de comunhão universal de bens, e, o senhor DANTE PETRONI NETO, brasileiro',
    );
    expect(item.sePJ).toBe(true);
  });

  it('re-deriva a qualificação a partir de valores editados manualmente', () => {
    const editado = derivarCampos('pessoa', {
      nome: 'EUDA DIAS DE OLIVEIRA', genero: 'F', nacionalidade: 'Brasileira',
      estadoCivil: 'Separada Judicialmente', profissao: 'agropecuarista',
    });
    expect(editado.qualificacao).toBe(
      '*EUDA DIAS DE OLIVEIRA*, brasileira, separada judicialmente, agropecuarista',
    );
  });
});
