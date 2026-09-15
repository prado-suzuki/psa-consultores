import { describe, expect, it } from 'vitest';

import {
  diffDasListas,
  diffDoAcordo,
  mecanismoConhecido,
  resumoDaOrdem,
  resumoDoQuorum,
  resumoDosMecanismos,
  resumoDosQuoruns,
  resumoDosRamos,
  rotuloDoRamo,
} from '@/lib/acordoQuotistas';

describe('resumoDoQuorum', () => {
  it('junta a matéria com a expressão que o documento usa', () => {
    expect(resumoDoQuorum({
      materia: 'Alterar o contrato social',
      tipo: 'percentual',
      percentual: 75,
      base: 'presentes',
    })).toBe('Alterar o contrato social: ¾ (três quartos) dos presentes');
  });

  it('lista vazia diz "nenhum", e não some do log', () => {
    expect(resumoDosQuoruns([])).toBe('nenhum');
  });
});

describe('rotuloDoRamo', () => {
  it('escreve os dois rótulos que o card aceita, em caixa alta', () => {
    // "núcleo familiar" é proibido: o termo exclui o cônjuge implicitamente.
    expect(rotuloDoRamo({ nome: 'Silva', rotulo: 'ramo' })).toBe('RAMO SILVA');
    expect(rotuloDoRamo({ nome: 'João Pedro', rotulo: 'descendentes' }))
      .toBe('DESCENDENTES DE JOÃO PEDRO');
  });

  it('não deixa espaço solto virar parte do nome', () => {
    expect(rotuloDoRamo({ nome: '  Costa  ', rotulo: 'ramo' })).toBe('RAMO COSTA');
  });

  it('junta os ramos por vírgula', () => {
    expect(resumoDosRamos([
      { nome: 'Silva', rotulo: 'ramo' },
      { nome: 'Ana', rotulo: 'descendentes' },
    ])).toBe('RAMO SILVA, DESCENDENTES DE ANA');
  });
});

describe('resumoDaOrdem', () => {
  it('numera pela posição, e ordena antes de numerar', () => {
    expect(resumoDaOrdem([
      { quem: 'Demais quotistas', ordem: 2 },
      { quem: 'Holding', ordem: 0 },
      { quem: 'Descendentes dos signatários', ordem: 1 },
    ])).toBe('1. Holding · 2. Descendentes dos signatários · 3. Demais quotistas');
  });

  it('sem ordem definida diz "nenhuma"', () => {
    expect(resumoDaOrdem([])).toBe('nenhuma');
  });
});

describe('resumoDosMecanismos', () => {
  it('escreve o rótulo da tela, e não a chave do banco', () => {
    expect(resumoDosMecanismos(['tag_along', 'lock_up']))
      .toBe('Tag along, Lock-up');
  });

  it('chave desconhecida é descartada em vez de vazar para o log', () => {
    expect(resumoDosMecanismos(['tag_along', 'inventado'])).toBe('Tag along');
  });

  it('nulo e vazio dizem "nenhum"', () => {
    expect(resumoDosMecanismos(null)).toBe('nenhum');
    expect(resumoDosMecanismos([])).toBe('nenhum');
  });
});

describe('diffDoAcordo', () => {
  it('registra o rótulo de gente, e não o nome da coluna', () => {
    const d = diffDoAcordo({ prazo_balanco_dias: 60 }, { prazo_balanco_dias: 90 });
    expect(d).toEqual({
      'Prazo máximo do balanço, em dias': { old: '60', new: '90' },
    });
  });

  it('booleano vira sim e não', () => {
    const d = diffDoAcordo({ nao_concorrencia: false }, { nao_concorrencia: true });
    expect(d['Cláusula de não concorrência']).toEqual({ old: 'não', new: 'sim' });
  });

  it('nulo é "em branco", e não a palavra null', () => {
    const d = diffDoAcordo({ camara_arbitral: null }, { camara_arbitral: 'CAM-CCBC' });
    expect(d['Câmara arbitral']).toEqual({ old: 'em branco', new: 'CAM-CCBC' });
  });

  it('mecanismo entra pelo rótulo, mesmo dentro do array', () => {
    const d = diffDoAcordo({ mecanismos: ['lock_up'] }, { mecanismos: ['lock_up', 'tag_along'] });
    expect(d['Mecanismos presentes']).toEqual({
      old: 'Lock-up',
      new: 'Lock-up, Tag along',
    });
  });

  it('campo que não mudou não entra', () => {
    // Sem isto o log registraria como alteração todo campo que a pessoa só viu.
    expect(diffDoAcordo({ vigencia_anos: 10 }, { vigencia_anos: 10 })).toEqual({});
  });

  it('campo ausente no que foi salvo não entra', () => {
    expect(diffDoAcordo({ vigencia_anos: 10 }, {})).toEqual({});
  });

  it('ignora id, versão e as colunas de auditoria', () => {
    const d = diffDoAcordo(
      { id: 'a', cliente_id: 'c', versao: 1, excluido: false, updated_by: 'x' },
      { id: 'b', cliente_id: 'd', versao: 2, excluido: true, updated_by: 'y' },
    );
    expect(d).toEqual({});
  });
});

describe('diffDasListas', () => {
  it('uma entrada por lista, e não uma por linha', () => {
    const d = diffDasListas(
      { quoruns: 'A', ramos: 'RAMO SILVA', ordem: '1. Holding' },
      { quoruns: 'B', ramos: 'RAMO SILVA', ordem: '1. Holding · 2. Filhos' },
    );
    expect(Object.keys(d)).toEqual(['Quóruns', 'Ordem do direito de preferência']);
    expect(d['Quóruns']).toEqual({ old: 'A', new: 'B' });
  });

  it('nada mudou, nada registrado', () => {
    const igual = { quoruns: 'A', ramos: 'B', ordem: 'C' };
    expect(diffDasListas(igual, igual)).toEqual({});
  });
});

describe('mecanismoConhecido', () => {
  it('separa o que o cadastro conhece do que não', () => {
    expect(mecanismoConhecido('drag_along')).toBe(true);
    expect(mecanismoConhecido('nucleo_familiar')).toBe(false);
  });
});
