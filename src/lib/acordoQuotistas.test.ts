import { describe, expect, it } from 'vitest';

import {
  diffDasListas,
  diffDoAcordo,
  mecanismoConhecido,
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
    })).toBe('Alterar o contrato social: 75% (setenta e cinco por cento) dos presentes');
  });

  it('lista vazia diz "nenhum", e não some do log', () => {
    expect(resumoDosQuoruns([])).toBe('nenhum');
  });
});

describe('rotuloDoRamo', () => {
  it('escreve o único rótulo que os documentos usam, em caixa alta', () => {
    /*
     * "RAMO [nome]" SAIU. Contado nos 14 documentos do acervo, ele não aparece
     * em nenhum, e "ramo" já significa ramo de ATIVIDADE em três acordos. O
     * mockup da governança tinha derrubado a opção com a mesma medição.
     *
     * "núcleo familiar" segue proibido: o termo exclui o cônjuge implicitamente.
     */
    expect(rotuloDoRamo({ nome: 'João Pedro' })).toBe('DESCENDENTES DE JOÃO PEDRO');
  });

  it('não deixa espaço solto virar parte do nome', () => {
    expect(rotuloDoRamo({ nome: '  Costa  ' })).toBe('DESCENDENTES DE COSTA');
  });

  it('junta os ramos por vírgula', () => {
    expect(resumoDosRamos([{ nome: 'Cristina' }, { nome: 'Regina' }]))
      .toBe('DESCENDENTES DE CRISTINA, DESCENDENTES DE REGINA');
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
    const d = diffDoAcordo(
      { nao_concorrencia_prazo_anos: 3 }, { nao_concorrencia_prazo_anos: 5 },
    );
    expect(d).toEqual({
      'Prazo da não concorrência, em anos': { old: '3', new: '5' },
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
      { quoruns: 'A', ramos: 'RAMO SILVA' },
      { quoruns: 'B', ramos: 'RAMO ANDRADE' },
    );
    expect(Object.keys(d)).toEqual(['Quóruns', 'Ramos familiares']);
    expect(d['Quóruns']).toEqual({ old: 'A', new: 'B' });
  });

  it('nada mudou, nada registrado', () => {
    const igual = { quoruns: 'A', ramos: 'B' };
    expect(diffDasListas(igual, igual)).toEqual({});
  });
});

describe('mecanismoConhecido', () => {
  it('separa o que o cadastro conhece do que não', () => {
    expect(mecanismoConhecido('drag_along')).toBe(true);
    expect(mecanismoConhecido('nucleo_familiar')).toBe(false);
  });
});
