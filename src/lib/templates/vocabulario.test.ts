import { describe, it, expect } from 'vitest';
import { extrairCampos } from './render';
import { gerarDocumento } from './index';
import { derivarCampos } from './vocabulario';
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
