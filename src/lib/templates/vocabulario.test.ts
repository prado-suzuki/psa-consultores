import { describe, it, expect } from 'vitest';
import { extrairCampos } from './render';
import { gerarDocumento } from './index';
import { derivarCampos } from './vocabulario';
import { detectarBindings, resolverTipoDoBinding } from './binding';
import { concordarTexto } from './concordancia';
import {
  mapearMatricula,
  mapearPessoa,
  mapearSocio,
  montarContexto,
  type MatriculaParaMapear,
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
