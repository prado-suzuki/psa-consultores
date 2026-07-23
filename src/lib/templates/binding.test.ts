import { describe, expect, it } from 'vitest';
import { gerarDocumento, type Template } from './index';
import { detectarBindingsDeConteudo, normalizarReferenciasLegadas, normalizarSelecaoLegada } from './binding';

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
