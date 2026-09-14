import { describe, expect, it } from 'vitest';

import {
  GRUPOS_DO_ACORDO,
  camposQueDescem,
  grupoDoAcordo,
  preenchidosNoGrupo,
} from '@/lib/acordoGrupos';

describe('GRUPOS_DO_ACORDO', () => {
  it('são os oito da validação de 11/09, com os nomes das cláusulas', () => {
    expect(GRUPOS_DO_ACORDO.map((g) => g.chave)).toEqual([
      'alcance', 'quorum', 'reuniao_previa', 'saida',
      'opcoes', 'usufruto', 'conflitos', 'representacao',
    ]);
  });

  it('nenhum campo aparece em dois grupos', () => {
    const campos = GRUPOS_DO_ACORDO.flatMap((g) => g.campos.map((c) => c.campo));
    expect(new Set(campos).size).toBe(campos.length);
  });

  it('todo grupo tem resumo, para o cartão da lista não nascer mudo', () => {
    for (const g of GRUPOS_DO_ACORDO) {
      expect(g.resumo.length, `${g.chave} sem resumo`).toBeGreaterThan(20);
      expect(g.campos.length, `${g.chave} sem campo`).toBeGreaterThan(0);
    }
  });

  it('campo com opções é de escolha, e campo de escolha tem opções', () => {
    for (const c of GRUPOS_DO_ACORDO.flatMap((g) => g.campos)) {
      if (c.tipo === 'multi' || c.tipo === 'escolha') {
        expect(c.opcoes?.length, `${c.campo} sem opções`).toBeGreaterThan(1);
      } else {
        expect(c.opcoes, `${c.campo} tem opções sem ser de escolha`).toBeUndefined();
      }
    }
  });

  it('todo campo que depende de outro depende de um booleano do MESMO grupo', () => {
    for (const g of GRUPOS_DO_ACORDO) {
      const booleanosAqui = g.campos.filter((c) => c.tipo === 'booleano').map((c) => c.campo);
      for (const c of g.campos.filter((x) => x.dependeDe)) {
        expect(booleanosAqui, `${c.campo} depende de fora do grupo`).toContain(c.dependeDe);
      }
    }
  });
});

describe('camposQueDescem', () => {
  it('são os sete que também viram cláusula no contrato social', () => {
    // Cinco de apuração de haveres, que está nos oito contratos do acervo, mais o
    // usufruto, que no cadastro é um controle só sobre o quadro societário.
    expect(camposQueDescem().map((c) => c.campo)).toEqual([
      'metodos_avaliacao', 'regra_combinacao', 'prazo_balanco_dias',
      'horizonte_fluxo_anos', 'taxa_minima_crescimento', 'usufruto',
    ]);
  });
});

describe('preenchidosNoGrupo', () => {
  it('conta só o que está à vista: campo escondido não pesa', () => {
    const g = grupoDoAcordo('opcoes')!;
    // Com a opção de compra desligada, os dois campos dela nem aparecem.
    const semCompra = preenchidosNoGrupo(g, {
      opcao_compra_prevista: false, opcao_venda_prevista: false, juros_valor_subscrito: null,
    });
    expect(semCompra.total).toBe(3);

    const comCompra = preenchidosNoGrupo(g, {
      opcao_compra_prevista: true, opcao_venda_prevista: false, juros_valor_subscrito: null,
    });
    expect(comCompra.total).toBe(5);
  });

  it('booleano desligado conta como respondido, porque "não tem" é resposta', () => {
    const g = grupoDoAcordo('reuniao_previa')!;
    expect(preenchidosNoGrupo(g, { reuniao_previa_obrigatoria: false }))
      .toEqual({ preenchidos: 1, total: 1 });
  });

  it('lista vazia e texto em branco não contam', () => {
    const g = grupoDoAcordo('conflitos')!;
    expect(preenchidosNoGrupo(g, {
      solucao_litigios: '', camara_arbitral: null, prazo_indicacao_arbitros_dias: undefined,
    })).toEqual({ preenchidos: 0, total: 3 });
  });
});
