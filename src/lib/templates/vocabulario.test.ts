import { describe, it, expect } from 'vitest';
import { camposNecessarios, montarContextoDeEntradas } from './vocabulario';
import { extrairCampos } from './render';
import { gerarDocumento } from './index';
import type { Template } from './types';

// Fixture: um bloco que exercita todos os placeholders do vocabulário.
const CONTEUDO_MATRICULA =
  'Um imóvel rural com área de {{area}} ({{areaExtenso}}), ' +
  'denominado {{denominacao}}, de propriedade de {{proprietario}}, ' +
  'situado no município de {{municipio}}, Estado de {{uf}}, ' +
  'com registro na matrícula de n° {{matricula}}, ' +
  'no Livro {{livro}} ({{livroExtenso}}), folhas/ficha {{folha}} ({{folhaExtenso}}) ' +
  'do {{cartorio}} da comarca de {{comarca}}, Estado de {{ufCartorio}}, ' +
  'no valor de R$ {{valor}} ({{valorExtenso}}), ' +
  'inscrito no cadastro de imóvel rural sob o n° {{ccir}}, ' +
  'com os seguintes limites e confrontações: {{confrontacoes}}.';

const TEMPLATE_MATRICULA: Template = {
  id: 'fixture-matricula',
  nome: 'Fixture — descrição de imóvel',
  blocos: [{ id: 'bloco-matricula', obrigatorio: true, conteudo: CONTEUDO_MATRICULA }],
};

describe('vocabulário', () => {
  it('mapeia os placeholders do bloco de matrícula para os campos de entrada', () => {
    const placeholders = extrairCampos(CONTEUDO_MATRICULA);
    const { campos, desconhecidos } = camposNecessarios(placeholders);

    // area+areaExtenso colapsam num único campo (areaHa); idem valor, livro, folha.
    expect(desconhecidos).toEqual([]);
    expect(campos.map((c) => c.id).sort()).toEqual(
      ['areaHa', 'ccir', 'cartorio', 'comarca', 'confrontacoes', 'denominacao', 'folha', 'livro', 'matricula', 'municipio', 'proprietario', 'uf', 'ufCartorio', 'valorContabil'].sort(),
    );
  });

  it('deriva os campos por extenso a partir das entradas cruas', () => {
    const ctx = montarContextoDeEntradas({ areaHa: '396.4', valorContabil: '558413.55', livro: '02', folha: '01' });
    expect(ctx.areaExtenso).toBe('trezentos e noventa e seis hectares e quarenta ares');
    expect(ctx.valorExtenso).toBe('quinhentos e cinquenta e oito mil, quatrocentos e treze reais e cinquenta e cinco centavos');
    expect(ctx.area).toBe('396,4000 ha');
    expect(ctx.valor).toBe('558.413,55');
    expect(ctx.livroExtenso).toBe('dois');
    expect(ctx.folhaExtenso).toBe('um');
  });

  it('gera o documento da Mat. 9.617 a partir do vocabulário (sem montarContexto específico)', () => {
    const ctx = montarContextoDeEntradas({
      areaHa: '396.4',
      valorContabil: '558413.55',
      livro: '02',
      folha: '01',
      denominacao: 'Fazenda Tarumã',
      proprietario: 'Jose Eduardo de Macedo Soares Junior',
      municipio: 'Lucas do Rio Verde',
      uf: 'Mato Grosso',
      matricula: '9.617',
      cartorio: 'Cartório de 1° Ofício de Imóveis',
      comarca: 'Lucas do Rio Verde',
      ufCartorio: 'Mato Grosso',
      ccir: '901.032.174.190-6',
      confrontacoes: '01-02 com 758,00 metros',
    });
    const texto = gerarDocumento(TEMPLATE_MATRICULA, ctx);
    expect(texto).toContain('área de 396,4000 ha (trezentos e noventa e seis hectares e quarenta ares)');
    expect(texto).toContain('no Livro 02 (dois), folhas/ficha 01 (um)');
    expect(texto).toContain('R$ 558.413,55 (quinhentos e cinquenta e oito mil, quatrocentos e treze reais e cinquenta e cinco centavos)');
  });
});
