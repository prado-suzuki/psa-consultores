import { describe, expect, it } from 'vitest';

import {
  MECANISMOS,
  QUORUNS_PADRAO,
  expressaoDoQuorum,
  mecanismosCoerentes,
  mecanismosPadrao,
  quorumPadrao,
} from '@/lib/acordoQuotistasPadrao';

describe('QUORUNS_PADRAO', () => {
  it('são os sete medidos no modelo, na ordem da tela', () => {
    expect(QUORUNS_PADRAO.map((q) => q.chave)).toEqual([
      'instalacao',
      'ordinaria',
      'alterar_contrato_social',
      'nomear_administrador_nao_socio',
      'destituir_administrador',
      'aumento_de_capital',
      'reuniao_previa',
    ]);
  });

  it('respeitam o CHECK da tabela: percentual só onde o tipo pede', () => {
    // `acordo_quorum_percentual_ck` recusa maioria com número e percentual sem
    // número. A semente não pode nascer sendo recusada pelo banco.
    for (const q of QUORUNS_PADRAO) {
      if (q.tipo === 'percentual') {
        expect(q.percentual, `${q.chave} é percentual e não tem número`).toBeGreaterThan(0);
        expect(q.percentual).toBeLessThanOrEqual(100);
      } else {
        expect(q.percentual, `${q.chave} não é percentual e tem número`).toBeUndefined();
      }
    }
  });

  it('a base não é uniforme, e é por isso que ela é campo', () => {
    // O modelo troca de base dentro do mesmo documento: a escada da reunião de
    // sócios conta os presentes, o aumento de capital e a reunião prévia contam
    // as quotas. Se um dia isto virar uniforme, a base pode virar escolha única.
    const bases = new Set(QUORUNS_PADRAO.map((q) => q.base));
    expect(bases).toEqual(new Set(['presentes', 'capital']));
  });

  it('alterar o contrato social é três quartos, que é o que a lei manda', () => {
    expect(quorumPadrao('alterar_contrato_social')).toMatchObject({
      tipo: 'percentual',
      percentual: 75,
    });
  });

  it('não tem chave repetida', () => {
    const chaves = QUORUNS_PADRAO.map((q) => q.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe('expressaoDoQuorum', () => {
  it('escreve símbolo mais extenso, como os sete acordos escrevem', () => {
    // "¾ (três quartos) das QUOTAS" é a forma do modelo. Só o extenso, sem o
    // símbolo, nao e como nenhum dos sete documentos escreve.
    expect(expressaoDoQuorum({ tipo: 'percentual', percentual: 75, base: 'capital' }))
      .toBe('¾ (três quartos) do capital social');
    expect(expressaoDoQuorum({ tipo: 'percentual', percentual: 66.67, base: 'presentes' }))
      .toBe('2/3 (dois terços) dos presentes');
  });

  it('o parêntese soletra o que está à esquerda dele', () => {
    // "75% (três quartos)" estaria errado: o parentese tem de soletrar o simbolo.
    for (const valor of [75, 66.67, 50, 33.33, 25, 60]) {
      const frase = expressaoDoQuorum({ tipo: 'percentual', percentual: valor, base: 'capital' });
      const [simbolo, resto] = frase.split(' (');
      expect(resto, `${valor} saiu sem parêntese`).toBeTruthy();
      if (simbolo.endsWith('%')) expect(resto).toContain('por cento');
      else expect(resto).not.toContain('por cento');
    }
  });

  it('a base entra na frase, porque ela muda o sentido', () => {
    expect(expressaoDoQuorum({ tipo: 'percentual', percentual: 75, base: 'presentes' }))
      .toBe('¾ (três quartos) dos presentes');
    expect(expressaoDoQuorum({ tipo: 'percentual', percentual: 75, base: 'capital' }))
      .toBe('¾ (três quartos) do capital social');
  });

  it('maioria e unanimidade não viram número', () => {
    expect(expressaoDoQuorum({ tipo: 'maioria', base: 'presentes' }))
      .toBe('a maioria dos presentes');
    expect(expressaoDoQuorum({ tipo: 'maioria', base: 'capital' }))
      .toBe('a maioria do capital social');
    expect(expressaoDoQuorum({ tipo: 'unanimidade', base: 'presentes' }))
      .toBe('todos os quotistas');
  });

  it('percentual sem fração conhecida sai como porcentagem soletrada', () => {
    expect(expressaoDoQuorum({ tipo: 'percentual', percentual: 60, base: 'capital' }))
      .toBe('60% (sessenta por cento) do capital social');
  });

  it('percentual quebrado não é soletrado, porque ninguém escreve assim', () => {
    // "87,5% (oitenta e sete vírgula cinco por cento)" nao existe em contrato.
    expect(expressaoDoQuorum({ tipo: 'percentual', percentual: 87.5, base: 'presentes' }))
      .toBe('87,5% dos presentes');
  });

  it('todos os sete da semente produzem frase legível', () => {
    for (const q of QUORUNS_PADRAO) {
      const frase = expressaoDoQuorum(q);
      expect(frase, `${q.chave} saiu vazio`).toBeTruthy();
      // Nenhum deles pode sair com ponto decimal de programador no meio da prosa.
      expect(frase, `${q.chave} escreveu ponto decimal`).not.toMatch(/\d\.\d/);
      // E todo quorum numerico da semente tem de vir com o extenso ao lado.
      if (q.tipo === 'percentual') {
        expect(frase, `${q.chave} saiu sem o extenso`).toContain('(');
      }
    }
  });
});

describe('MECANISMOS', () => {
  it('são os dez achados no modelo, do mais comum para o menos', () => {
    expect(MECANISMOS).toHaveLength(10);
    const contagens = MECANISMOS.map((m) => m.emQuantosAcordos);
    expect([...contagens].sort((a, b) => b - a)).toEqual(contagens);
  });

  it('a marcação padrão hoje reflete só a medição', () => {
    // PROVISÓRIO até a Anne responder: marcado é o que aparece em seis ou sete
    // dos sete acordos. Quando ela responder, muda aqui e o teste junto.
    expect(mecanismosPadrao()).toEqual(['preferencia', 'arbitragem', 'nao_concorrencia']);
    for (const m of MECANISMOS) {
      expect(m.padrao, `${m.chave} está marcado sem aparecer em 6+`).toBe(m.emQuantosAcordos >= 6);
    }
  });

  it('toda explicação fala do efeito, não do conceito', () => {
    // Regra da área: o texto diz o que acontece com a pessoa, não o que a coisa é.
    for (const m of MECANISMOS) {
      expect(m.explicacao.length, `${m.chave} sem explicação`).toBeGreaterThan(20);
      expect(m.explicacao.endsWith('.'), `${m.chave} sem ponto final`).toBe(true);
    }
  });

  it('não tem chave repetida', () => {
    const chaves = MECANISMOS.map((m) => m.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe('mecanismosCoerentes · a lista não discorda dos interruptores', () => {
  it('liga os quatro espelhados a partir do interruptor de cada um', () => {
    const fora = mecanismosCoerentes([], {
      nao_concorrencia: true,
      opcao_compra_prevista: true,
      opcao_venda_prevista: true,
      solucao_litigios: 'arbitragem',
    });
    expect(fora).toEqual(['arbitragem', 'nao_concorrencia', 'opcao_compra', 'opcao_venda']);
  });

  it('apaga a marcação velha quando o interruptor é desligado noutro bloco', () => {
    // O caso que motivou a função: a pessoa desliga a opção de compra no bloco
    // "Opções", e a marcação ficaria no banco porque ela mora na lista do bloco
    // "Saída". O documento sairia com o cabeçalho da cláusula e o corpo vazio.
    const depois = mecanismosCoerentes(['lock_up', 'opcao_compra'], {
      opcao_compra_prevista: false,
    });
    expect(depois).toEqual(['lock_up']);
  });

  it('não mexe nos seis que só existem na lista', () => {
    const marcados = ['preferencia', 'lock_up', 'tag_along', 'drag_along', 'usufruto', 'quarentena'];
    expect(mecanismosCoerentes(marcados, {})).toEqual(marcados);
  });

  it('a ordem é a do catálogo, e não a do clique', () => {
    expect(mecanismosCoerentes(['quarentena', 'lock_up', 'preferencia'], {}))
      .toEqual(['preferencia', 'lock_up', 'quarentena']);
  });

  it('exatamente quatro mecanismos são espelhados, e são os que têm detalhe', () => {
    // Se alguém criar um interruptor novo com detalhes, tem de espelhar aqui
    // também, senão volta a haver duas respostas para o mesmo fato.
    expect(MECANISMOS.filter((m) => m.espelha).map((m) => m.chave))
      .toEqual(['arbitragem', 'nao_concorrencia', 'opcao_compra', 'opcao_venda']);
  });
});
