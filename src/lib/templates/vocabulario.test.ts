import { describe, it, expect } from 'vitest';
import { extrairCampos } from './render';
import { gerarDocumento } from './index';
import { derivarCampos } from './vocabulario';
import { detectarBindings, resolverTipoDoBinding } from './binding';
import { concordarTexto } from './concordancia';
import {
  mapearMatricula,
  mapearPessoa,
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
