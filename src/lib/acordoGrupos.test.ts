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
  it('dois campos descem ao contrato social, e são estes', () => {
    /*
     * A DATA DE ASSINATURA, porque o contrato social a CITA no corpo de uma
     * cláusula. No Perci: "o acordo celebrado entre as partes, em 29 de Janeiro
     * de 2.021". Sem ela, o contrato sai na outra redação, com a lacuna. Não
     * confundir com a linha que se assina à mão, que é `dataAssinatura`, campo
     * manual da tela Gerar.
     *
     * A APURAÇÃO DE HAVERES, num campo só. Eram cinco. Quatro não variam nos
     * contratos do acervo: 60 dias em 7 de 7, 05 anos em 3 de 3, IPCA nos dois
     * que citam índice, e "maior valor" em todos que combinam métodos. Campo que
     * não varia é texto fixo do modelo, e a decisão está no motor desde 14/09;
     * esta tela contrariava a própria medição. O que varia é QUAIS métodos
     * entram.
     *
     * O usufruto também desce ao contrato, mas não é campo deste cadastro: ele
     * vem de `onus_quotas`, preenchido no Quadro Societário.
     */
    expect(camposQueDescem().map((c) => c.campo))
      .toEqual(['assinado_em', 'metodos_avaliacao']);
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

  it('booleano desligado só conta depois que alguém conferiu o bloco', () => {
    /*
     * As colunas booleanas são `NOT NULL DEFAULT false`: antes de alguém abrir o
     * bloco, `false` não é resposta, é a ausência dela. Uma versão recém-criada
     * anunciava "2 de 3 respondidos" sem ninguém ter respondido nada.
     *
     * Depois de conferido, o mesmo `false` é resposta legítima de quem olhou e
     * disse "não tem", e volta a contar.
     */
    const g = grupoDoAcordo('reuniao_previa')!;
    expect(preenchidosNoGrupo(g, { reuniao_previa_obrigatoria: false }))
      .toEqual({ preenchidos: 0, total: 1 });
    expect(preenchidosNoGrupo(g, { reuniao_previa_obrigatoria: false }, true))
      .toEqual({ preenchidos: 1, total: 1 });
    // Ligado também espera a conferência: o seed não liga nenhum booleano hoje,
    // mas o dia em que ligar, "true" tambem seria resposta que ninguem deu.
    expect(preenchidosNoGrupo(g, { reuniao_previa_obrigatoria: true }))
      .toEqual({ preenchidos: 0, total: 1 });
  });

  it('lista vazia e texto em branco não contam', () => {
    const g = grupoDoAcordo('conflitos')!;
    expect(preenchidosNoGrupo(g, {
      solucao_litigios: '', camara_arbitral: null, regime_nomeacao_arbitros: '',
    })).toEqual({ preenchidos: 0, total: 3 });
  });
});

describe('as ajudas saem do documento, e não da minha cabeça', () => {
  it('todo campo que pede número diz qual número o modelo usa', () => {
    // A lição de 14/09: teste escrito contra a suposição passa e mente. Estas
    // frases foram conferidas no `VF_Modelo Acordo de Quotistas`.
    const ajudaDe = (campo: string) =>
      GRUPOS_DO_ACORDO.flatMap((g) => g.campos).find((c) => c.campo === campo)?.ajuda ?? '';

    // Os quatro números da apuração não são campos, porque não variam. Eles
    // aparecem na ajuda do único campo que restou, para o consultor saber que
    // estão no documento sem ter de digitá-los.
    expect(ajudaDe('metodos_avaliacao')).toContain('60 (sessenta) dias');
    expect(ajudaDe('metodos_avaliacao')).toContain('05 (cinco) anos');
    expect(ajudaDe('metodos_avaliacao')).toContain('IPCA');
    expect(ajudaDe('nao_concorrencia_prazo_anos')).toContain('03 (três)');
    expect(ajudaDe('nao_concorrencia_multa')).toContain('R$ 1.000.000,00');
    expect(ajudaDe('juros_valor_subscrito')).toContain('1% (um por cento) ao mês');
    expect(ajudaDe('camara_arbitral')).toContain('Câmara de Comércio Brasil Canadá');
  });

  it('o que NÃO varia não é campo; o que varia é', () => {
    /*
     * ESTE TESTE JÁ TRAVOU DUAS AFIRMAÇÕES ERRADAS MINHAS, e é por isso que ele
     * trava a REGRA e não a lista.
     *
     * Primeiro ele dizia que "prazo para indicação de árbitros" não existia em
     * documento nenhum. Existe: AgroAliança, 26.3, "no prazo de 15 (quinze)
     * dias". Corrigido, ele passou a exigir o campo. Errado de novo, por outro
     * motivo: há UMA observação desse valor e nenhuma de um valor diferente, e
     * valor que não varia é linha fixa da cláusula, como os 60 dias do balanço.
     *
     * O que a releitura da cláusula inteira mostrou variar é QUEM escolhe os
     * árbitros: as partes em 5 de 7, a câmara em 2 de 7.
     */
    const campos = GRUPOS_DO_ACORDO.flatMap((g) => g.campos).map((c) => c.campo);

    // VARIA entre documentos, então é campo. A câmara: cinco usam a Brasil
    // Canadá, a Utida usa a Câmara FGV. O regime: 5 contra 2.
    expect(campos).toContain('camara_arbitral');
    expect(campos).toContain('regime_nomeacao_arbitros');

    // NÃO VARIA: um único valor observado, ou o mesmo em todos. É texto fixo do
    // modelo, e publicar o campo convida a inventar variação que não existe.
    for (const fixo of [
      'prazo_indicacao_arbitros_dias', 'numero_arbitros', 'prazo_balanco_dias',
      'horizonte_fluxo_anos', 'taxa_minima_crescimento', 'regra_combinacao',
    ]) {
      expect(campos, `${fixo} não varia nos documentos do acervo`).not.toContain(fixo);
    }
  });

  it('a ajuda do quórum diz que se digita o ASSUNTO, e não a frase', () => {
    const c = GRUPOS_DO_ACORDO.flatMap((g) => g.campos).find((x) => x.campo === 'quoruns');
    expect(c?.ajuda).toContain('SÓ O ASSUNTO');
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
