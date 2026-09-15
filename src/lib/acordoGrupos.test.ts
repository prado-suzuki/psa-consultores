import { describe, expect, it } from 'vitest';

import {
  GRUPOS_DO_ACORDO,
  camposQueDescem,
  grupoDoAcordo,
  preenchidosNoGrupo,
} from '@/lib/acordoGrupos';

describe('GRUPOS_DO_ACORDO', () => {
  it('são os da validação de 11/09, mais a identificação, na ordem de leitura', () => {
    // Eram oito na validação. O de usufruto saiu, porque não pedia nada ao
    // analista e o Quadro Societário já monta a tabela de quem vota. Entrou a
    // identificação, que guarda assinatura, vigência e sigilo, e que não tinha
    // dono em tela nenhuma. Ela vem primeiro porque é o cabeçalho do documento.
    expect(GRUPOS_DO_ACORDO.map((g) => g.chave)).toEqual([
      'identificacao', 'alcance', 'quorum', 'reuniao_previa', 'saida',
      'opcoes', 'conflitos', 'representacao',
    ]);
  });

  it('nenhum grupo pede usufruto, porque ele se cadastra no Quadro', () => {
    // Tranca a correção: cadastrar aqui faria o acordo dizer um dono do voto e o
    // contrato dizer outro. O motor lê `onus_quotas` na hora de gerar.
    const campos = GRUPOS_DO_ACORDO.flatMap((g) => g.campos.map((c) => c.campo));
    expect(campos).not.toContain('usufruto');
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
  it('são os cinco da apuração de haveres, que está nos oito contratos', () => {
    // O usufruto também desce ao contrato, mas não é campo DESTE cadastro: ele
    // vem de `onus_quotas`, preenchido no Quadro Societário.
    expect(camposQueDescem().map((c) => c.campo)).toEqual([
      'metodos_avaliacao', 'regra_combinacao', 'prazo_balanco_dias',
      'horizonte_fluxo_anos', 'taxa_minima_crescimento',
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

describe('as ajudas saem do documento, e não da minha cabeça', () => {
  it('todo campo que pede número diz qual número o modelo usa', () => {
    // A lição de 14/09: teste escrito contra a suposição passa e mente. Estas
    // frases foram conferidas no `VF_Modelo Acordo de Quotistas`.
    const ajudaDe = (campo: string) =>
      GRUPOS_DO_ACORDO.flatMap((g) => g.campos).find((c) => c.campo === campo)?.ajuda ?? '';

    expect(ajudaDe('prazo_balanco_dias')).toContain('60 (sessenta) dias antes do evento');
    expect(ajudaDe('horizonte_fluxo_anos')).toContain('05 (cinco) anos');
    expect(ajudaDe('taxa_minima_crescimento')).toContain('IPCA');
    expect(ajudaDe('nao_concorrencia_prazo_anos')).toContain('03 (três)');
    expect(ajudaDe('nao_concorrencia_multa')).toContain('R$ 1.000.000,00');
    expect(ajudaDe('juros_valor_subscrito')).toContain('1% (um por cento) ao mês');
    expect(ajudaDe('camara_arbitral')).toContain('Câmara de Comércio Brasil Canadá');
  });

  it('o campo sem fonte no modelo avisa em vez de fingir', () => {
    // O modelo diz quantos árbitros são, e não em quanto tempo se indica. O
    // campo veio do levantamento e pode estar com o nome trocado.
    const c = GRUPOS_DO_ACORDO.flatMap((g) => g.campos)
      .find((x) => x.campo === 'prazo_indicacao_arbitros_dias');
    expect(c?.ajuda).toContain('ATENÇÃO');
    expect(c?.ajuda).toContain('03 (três)');
  });

  it('só o grupo de 15 campos se divide em blocos', () => {
    for (const g of GRUPOS_DO_ACORDO) {
      const secoes = new Set(g.campos.map((c) => c.secao));
      if (g.chave === 'saida') {
        expect(secoes.size, 'a saída de sócio precisa de mais de um bloco').toBe(3);
        expect(secoes.has(undefined), 'campo sem bloco no grupo dividido').toBe(false);
      } else {
        expect(secoes, `${g.chave} não devia ter bloco`).toEqual(new Set([undefined]));
      }
    }
  });
});
