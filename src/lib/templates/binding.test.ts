import { describe, expect, it } from 'vitest';
import { gerarDocumento, type Template } from './index';
import { detectarBindingsDeConteudo, listarPlaceholders, normalizarReferenciasLegadas, normalizarSelecaoLegada } from './binding';

describe('normalizarReferenciasLegadas — contratos societários', () => {
  it('liga campos planos à sociedade selecionada', () => {
    const conteudo = [
      '{{ razaoSocial }}',
      '{{ sedeEndereco }}',
      '{{ sedeMunicipio }}',
      '{{ sedeUf }}',
      '{{ sedeCep }}',
      '{{ objetoSocial }}',
      '{{ capitalValor }}',
      '{{ capitalExtenso }}',
      '{{ totalQuotas }}',
      '{{ totalQuotasExtenso }}',
      '{{ foroComarca }}',
      '{{ foroUf }}',
    ].join(' | ');

    const normalizado = normalizarReferenciasLegadas(conteudo);
    const deteccao = detectarBindingsDeConteudo(normalizado);

    expect(deteccao.bindings).toEqual([
      { nome: 'sociedade', tipo: 'sociedade', cardinalidade: 'um' },
    ]);
    expect(deteccao.desconhecidos).toEqual([]);
    expect(normalizado).not.toMatch(/\{\{\s*(razaoSocial|capitalValor|foroComarca)\s*\}\}/);
  });

  it('normaliza os papéis controlada/controladora e aliases de campos', () => {
    const conteudo =
      '{{#controladora.objetoSocial}}{{ controladora.nome }}{{/controladora.objetoSocial}} ' +
      '{{ controlada.cpfCnpj }} {{ sociedade.capitalSocial }} {{ regimeCasamento }}';

    expect(normalizarReferenciasLegadas(conteudo)).toBe(
      '{{#sociedade.objeto}}{{ sociedade.razaoSocial }}{{/sociedade.objeto}} ' +
      '{{ sociedade.cnpj }} {{ sociedade.capitalValor }} {{ conjuge.regimeBens }}',
    );
  });

  it('transforma seção-raiz da controladora em condicional válida da sociedade', () => {
    const conteudo = normalizarReferenciasLegadas(
      '{{#controladora}}{{ controladora.nome }}{{/controladora}}',
    );
    expect(conteudo).toBe(
      '{{#sociedade.razaoSocial}}{{ sociedade.razaoSocial }}{{/sociedade.razaoSocial}}',
    );

    expect(gerarDocumento({
      id: 'secao-raiz',
      nome: 'Seção raiz',
      blocos: [{ id: 'b', tipo: 'livre', obrigatorio: true, conteudo }],
    }, { sociedade: { razaoSocial: 'Holding PSA Ltda.' } })).toBe('Holding PSA Ltda.');
  });

  it('gera o contrato normalizado sem referência de variável remanescente', () => {
    const template: Template = {
      id: 'contrato-controladora',
      nome: 'Contrato Controladora',
      blocos: [
        {
          id: 'cabecalho',
          tipo: 'livre',
          obrigatorio: true,
          conteudo: normalizarReferenciasLegadas(
            '{{ controladora.nome }} — {{ capitalValor }} — {{ foroComarca }}/{{ foroUf }}',
          ),
        },
      ],
    };

    const documento = gerarDocumento(template, {
      sociedade: {
        razaoSocial: 'Holding PSA Ltda.',
        capitalValor: '1.000.000,00',
        sedeMunicipio: 'Cuiabá',
        sedeUf: 'MT',
        sedeUfExtenso: 'Mato Grosso',
      },
    });

    expect(documento).toBe('Holding PSA Ltda. — 1.000.000,00 — Cuiabá/MT');
    expect(documento).not.toContain('{{');
  });

  it('reidrata aliases de rascunho sem sobrescrever seleção canônica', () => {
    expect(normalizarSelecaoLegada(
      { sociedade: { nome: 'Nome no binding legado', razaoSocial: 'Nome revisado' } },
      {
        razaoSocial: 'Nome antigo',
        capitalValor: '1.000,00',
        foroUf: 'MT',
        regimeCasamento: 'comunhão parcial',
      },
    )).toEqual({
      sociedade: {
        razaoSocial: 'Nome revisado',
        capitalValor: '1.000,00',
        sedeUf: 'MT',
        sedeUfExtenso: 'MT',
      },
      conjuge: { regimeBens: 'comunhão parcial' },
    });
  });
});

describe('detectarBindingsDeConteudo — papel de lista dentro de uma condicional', () => {
  // O memorial do georreferenciamento só entra quando a matrícula tem georref, e é
  // por isso que {{#vertices}} vive dentro de {{#imovel.georefArea}}. A condicional
  // não é papel de lista, mas a lista aninhada tem de ser carregada, senão o
  // contexto não a tem e o render acusa "Seção não resolvida" num trecho opcional.
  const memorial =
    '{{#imovel.georefArea}}Área de {{ imovel.georefArea }} ha:\n' +
    '{{#vertices}}| {{ vertice.codVertice }} | {{ vertice.azimute }} |{{/vertices}}{{/imovel.georefArea}}';

  it('registra a lista aninhada', () => {
    expect(detectarBindingsDeConteudo(memorial).listas.map((l) => l.nome)).toEqual(['vertices']);
  });

  it('mantém o binding da condicional e não inventa um do item da lista', () => {
    const { bindings } = detectarBindingsDeConteudo(memorial);
    expect(bindings.map((b) => [b.nome, b.tipo, b.cardinalidade])).toEqual([['imovel', 'matricula', 'um']]);
  });

  it('campos do item ficam no escopo do item, não viram campo de topo', () => {
    const { campos } = detectarBindingsDeConteudo(memorial);
    expect(campos).toContain('imovel.georefArea');
    expect(campos).not.toContain('vertice.codVertice');
    expect(campos).not.toContain('vertice.azimute');
  });

  it('a mesma lista em duas condicionais entra uma vez', () => {
    const duas = `${memorial}${memorial.replace('georefArea', 'georefPerimetro')}`;
    expect(detectarBindingsDeConteudo(duas).listas.map((l) => l.nome)).toEqual(['vertices']);
  });
});

describe('B15 · imóvel singular e imóveis múltiplos têm contratos distintos', () => {
  it('laço de imóveis pede seleção múltipla, sem inventar binding singular', () => {
    const deteccao = detectarBindingsDeConteudo(
      '{{#imoveis}}{{ imovel.numero }}{{#vertices}}{{ vertice.codVertice }}{{/vertices}}{{/imoveis}}',
    );
    expect(deteccao.listas.map((lista) => [lista.nome, lista.papel.fonte])).toEqual([
      ['imoveis', 'selecao'],
    ]);
    expect(deteccao.bindings).toEqual([]);
    expect(deteccao.desconhecidos).toEqual([]);
  });

  it('modelo de matrícula digitada continua pedindo exatamente um imóvel', () => {
    expect(detectarBindingsDeConteudo('{{ imovel.numero }}').bindings).toEqual([
      { nome: 'imovel', tipo: 'matricula', cardinalidade: 'um' },
    ]);
  });
});

describe('partes · qualificação de N pessoas escolhidas a dedo', () => {
  // O contrato rural qualifica uma empresa outorgante e várias pessoas físicas que
  // NÃO estão no quadro societário nem na administração dela (outorgado,
  // compossuidor, donatário, testemunha nominada). Um bloco, uma seção de
  // repetição, e a lista sai da escolha do consultor — não de uma relação da PJ.
  const secao =
    '{{#partes}}{{ parte.ordemRomana }}) {{ parte.nome }}' +
    '{{#sePF}}, portador do CPF {{ parte.cpfCnpj }}{{/sePF}}' +
    '{{#sePJ}}, inscrita no CNPJ {{ parte.cpfCnpj }}{{/sePJ}}{{/partes}}';

  it('entra como lista de seleção manual de pessoas', () => {
    const deteccao = detectarBindingsDeConteudo(secao);
    expect(deteccao.listas.map((lista) => [lista.nome, lista.papel.fonte, lista.papel.tipo])).toEqual([
      ['partes', 'selecao', 'pessoa'],
    ]);
    expect(deteccao.secoesDesconhecidas).toEqual([]);
  });

  it('campos do item não vazam para binding unitário nem para texto livre', () => {
    const deteccao = detectarBindingsDeConteudo(secao);
    expect(deteccao.bindings).toEqual([]);
    expect(deteccao.desconhecidos).toEqual([]);
    expect(deteccao.campos).not.toContain('parte.nome');
    expect(deteccao.campos).not.toContain('parte.cpfCnpj');
    expect(deteccao.campos).not.toContain('parte.ordemRomana');
  });

  it('o autocomplete do editor sugere o laço e os extras de ordem', () => {
    const sugeridos = listarPlaceholders();
    expect(sugeridos.find((p) => p.placeholder === 'partes')?.insercao).toBe(
      '{{#partes sep="; " fim="; e "}}{{ parte.nome }}{{/partes}}',
    );
    const placeholders = sugeridos.map((p) => p.placeholder);
    expect(placeholders).toContain('partes.linhas');
    expect(placeholders).toContain('parte.ordem');
    expect(placeholders).toContain('parte.ordemRomana');
  });
});

describe('B12/B13 · fecho reconhece signatários como lista própria', () => {
  it('não transforma os campos do signatário em bindings ou texto livre', () => {
    const fecho =
      '{{#signatarios}}' +
      '{{ signatario.nomeMaiusculo }} — {{ signatario.papel }}' +
      '{{#signatario.qualificacao}} {{ signatario.qualificacao }}{{/signatario.qualificacao}}' +
      '{{/signatarios}}';
    const deteccao = detectarBindingsDeConteudo(fecho);

    expect(deteccao.listas.map((lista) => [lista.nome, lista.papel.fonte])).toEqual([
      ['signatarios', 'signatarios'],
    ]);
    expect(deteccao.bindings).toEqual([]);
    expect(deteccao.desconhecidos).toEqual([]);
    expect(deteccao.secoesDesconhecidas).toEqual([]);
  });
});
