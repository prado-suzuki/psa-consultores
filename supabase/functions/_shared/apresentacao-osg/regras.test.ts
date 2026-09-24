// As regras que decidem o que entra na apresentacao da OSG.
//
// Cada uma destas tirava silenciosamente uma empresa, uma matricula ou um socio
// do .pptx antes de 09/2026. O teste existe para que a proxima mudanca no gerador
// diga QUAL regra caiu, e nao so que "o deck mudou" — que e tudo o que o baseline
// de ponta a ponta consegue dizer sozinho.
import { describe, expect, it } from 'vitest';

import {
  anota,
  bemIntegraliza,
  faixaDaEmpresa,
  lerTipoDeEmpresa,
  motivoDaMatriculaFora,
  motivoDoQuadroAusente,
  motivoForaDoOrganograma,
  percentuaisSaemVazios,
  plural,
  ONDE,
  relatoDasMatriculas,
  socioEntraNaFaixa,
  temImpedimentoAtivo,
} from './regras.ts';
import type { ProblemaDoDeck } from '../apresentacao/problema.ts';

describe('lerTipoDeEmpresa', () => {
  it('aceita a caixa e o espaco que o campo livre deixa passar', () => {
    expect(lerTipoDeEmpresa('cn')).toBe('CN');
    expect(lerTipoDeEmpresa(' Pr ')).toBe('PR');
  });

  it('separa ausente de desconhecido, porque o conserto e diferente', () => {
    expect(lerTipoDeEmpresa(null)).toBe('AUSENTE');
    expect(lerTipoDeEmpresa('')).toBe('AUSENTE');
    expect(lerTipoDeEmpresa('   ')).toBe('AUSENTE');
    expect(lerTipoDeEmpresa('HOLDING')).toBe('OUTRO');
  });
});

describe('motivoDoQuadroAusente', () => {
  const base = { denominacao: 'Fazenda X', temQuadroGravado: false, linhasApuradas: 0 };

  it('empresa com quadro apurado nao vira relato', () => {
    expect(motivoDoQuadroAusente({ ...base, tipo: 'CN', linhasApuradas: 3 })).toBeNull();
  });

  // O bug que motivou este arquivo: as tres causas saiam com a MESMA frase,
  // "sem linha de socio apurada", mandando o consultor procurar socio quando o
  // que faltava era preencher um campo.
  it('cada causa tem a sua frase, e a frase nomeia o campo a corrigir', () => {
    const ausente = motivoDoQuadroAusente({ ...base, tipo: 'AUSENTE' });
    expect(ausente).toContain('"tipo de empresa" está vazio');
    expect(ausente).not.toContain('socio');

    const cn = motivoDoQuadroAusente({ ...base, tipo: 'CN' });
    expect(cn).toContain('nenhuma movimentação de quotas');

    const sc = motivoDoQuadroAusente({ ...base, tipo: 'SC' });
    expect(sc).toContain('sócia (SC)');

    expect(new Set([ausente, cn, sc]).size).toBe(3);
  });

  it('PR distingue "sem quadro gravado" de "derivado vazio"', () => {
    expect(motivoDoQuadroAusente({ ...base, tipo: 'PR', temQuadroGravado: false }))
      .toContain('derivar o quadro dos bens');
    expect(motivoDoQuadroAusente({ ...base, tipo: 'PR', temQuadroGravado: true }))
      .toContain('após a apuração');
  });

  it('o nome da empresa entra na frase — sem ele o aviso nao e acionavel', () => {
    expect(motivoDoQuadroAusente({ ...base, tipo: 'AUSENTE' })).toContain('Fazenda X');
  });
});

describe('faixaDaEmpresa e organograma', () => {
  it('CN e controladora, PR e controlada, o resto nao tem faixa', () => {
    expect(faixaDaEmpresa('CN')).toBe('controladoras');
    expect(faixaDaEmpresa('PR')).toBe('controladas');
    expect(faixaDaEmpresa('SC')).toBeNull();
    expect(faixaDaEmpresa('AUSENTE')).toBeNull();
  });

  // A SC nao tem faixa propria e isso e CORRETO: ela aparece como socia. Relatar
  // seria ruido em cima de comportamento esperado.
  it('socia sem faixa nao vira aviso; empresa sem tipo vira', () => {
    expect(motivoForaDoOrganograma('Fulano Part.', 'SC')).toBeNull();
    expect(motivoForaDoOrganograma('Fazenda X', 'CN')).toBeNull();
    expect(motivoForaDoOrganograma('Fazenda X', 'AUSENTE')).toContain('não aparece no organograma');
  });
});

describe('socioEntraNaFaixa', () => {
  it('PF entra; PJ so entra se estiver marcada como socia', () => {
    expect(socioEntraNaFaixa('PF', null)).toBe(true);
    expect(socioEntraNaFaixa('PJ', 'SC')).toBe(true);
    expect(socioEntraNaFaixa('PJ', 'CN')).toBe(false);
    expect(socioEntraNaFaixa('PJ', null)).toBe(false);
  });

  it('nao se engana com caixa nem espaco', () => {
    expect(socioEntraNaFaixa(' pf ', null)).toBe(true);
    expect(socioEntraNaFaixa('PJ', ' sc ')).toBe(true);
  });
});

describe('bemIntegraliza', () => {
  it('so "Aprovado" vira quota', () => {
    expect(bemIntegraliza('Aprovado')).toBe(true);
    expect(bemIntegraliza('Pendente')).toBe(false);
    expect(bemIntegraliza('Em analise')).toBe(false);
    expect(bemIntegraliza('Integralizado')).toBe(false);
    expect(bemIntegraliza(null)).toBe(false);
  });
});

describe('temImpedimentoAtivo', () => {
  it('cancelado nao impede; qualquer nao-cancelado impede', () => {
    expect(temImpedimentoAtivo([])).toBe(false);
    expect(temImpedimentoAtivo(null)).toBe(false);
    expect(temImpedimentoAtivo([{ cancelado: true }])).toBe(false);
    expect(temImpedimentoAtivo([{ cancelado: true }, { cancelado: false }])).toBe(true);
    expect(temImpedimentoAtivo([{}])).toBe(true);
  });
});

describe('motivoDaMatriculaFora', () => {
  const ok = { temImpedimentoAtivo: false, valor: 1000, totalDeTitulares: 1 };

  it('matricula completa entra', () => {
    expect(motivoDaMatriculaFora(ok)).toBeNull();
  });

  it('nomeia cada falta', () => {
    expect(motivoDaMatriculaFora({ ...ok, temImpedimentoAtivo: true })).toBe('impedimento');
    expect(motivoDaMatriculaFora({ ...ok, valor: null })).toBe('sem_valor');
    expect(motivoDaMatriculaFora({ ...ok, valor: NaN })).toBe('sem_valor');
    expect(motivoDaMatriculaFora({ ...ok, totalDeTitulares: 0 })).toBe('sem_titular');
  });

  // Espelha a ordem do codigo. Trocar a ordem aqui sem trocar la faz o relato
  // apontar a causa errada, que e o defeito que este arquivo existe para impedir.
  it('impedimento vence valor, e valor vence titular', () => {
    expect(motivoDaMatriculaFora({ temImpedimentoAtivo: true, valor: null, totalDeTitulares: 0 }))
      .toBe('impedimento');
    expect(motivoDaMatriculaFora({ temImpedimentoAtivo: false, valor: null, totalDeTitulares: 0 }))
      .toBe('sem_valor');
  });
});

describe('relatoDasMatriculas', () => {
  it('agrupa por motivo em vez de uma linha por matricula', () => {
    const r = relatoDasMatriculas('Fazenda X', ['sem_valor', 'sem_valor', 'sem_titular', null]);
    expect(r).toHaveLength(2);
    expect(r[0]).toContain('2 matrículas ficaram');
    expect(r[0]).toContain('sem valor contábil');
    expect(r[1]).toContain('1 matrícula ficou');
  });

  it('nenhum descarte, nenhuma linha', () => {
    expect(relatoDasMatriculas('Fazenda X', [null, null])).toEqual([]);
  });
});

describe('percentuaisSaemVazios', () => {
  // Total zero faz o pct virar NaN e o fmtPct imprimir "—" em toda linha: o
  // quadro parece ter dezenas de buracos quando falta um numero so.
  it('total zero ou negativo esvazia os percentuais', () => {
    expect(percentuaisSaemVazios(0)).toBe(true);
    expect(percentuaisSaemVazios(-5)).toBe(true);
    expect(percentuaisSaemVazios(100)).toBe(false);
  });
});

describe('plural e anota', () => {
  it('concorda o numero', () => {
    expect(plural(1, 'matrícula ficou', 'matrículas ficaram')).toBe('1 matrícula ficou');
    expect(plural(3, 'matrícula ficou', 'matrículas ficaram')).toBe('3 matrículas ficaram');
  });

  it('anota sem acumulador nao quebra — quem nao quer relato chama sem ele', () => {
    expect(() => anota(undefined, ONDE.quadro, 'ignorado')).not.toThrow();
  });

  // `onde` e a parte do deck, `detalhe` e o que houve. O tipo veio do gerador
  // tributario, que ja separava os dois; aqui o campo era ausente e o nome da
  // secao acabava dentro da frase.
  it('grava os tres campos, e `origem` e o padrao', () => {
    const probs: ProblemaDoDeck[] = [];
    anota(probs, ONDE.patrimonial, 'algo');
    anota(probs, ONDE.quadro, 'outro', 'formatacao');
    expect(probs).toEqual([
      { tipo: 'origem', onde: 'Diagnóstico Patrimonial', detalhe: 'algo' },
      { tipo: 'formatacao', onde: 'Quadro Societário', detalhe: 'outro' },
    ]);
  });

  it('as tres secoes do deck da OSG sao distintas', () => {
    expect(new Set(Object.values(ONDE)).size).toBe(3);
  });
});
