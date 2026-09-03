import { describe, expect, it } from 'vitest';

import {
  ORGAOS_GOVERNANCA_PADRAO,
  ehOrgaoPadrao,
  erroDeOrgaoGovernanca,
  hierarquiaArrumada,
  mesmaChaveDeOrgao,
  padroesFaltando,
} from '@/lib/orgaosGovernancaPadrao';

describe('ORGAOS_GOVERNANCA_PADRAO', () => {
  it('são os três confirmados pela analista, e todos entram no contrato', () => {
    expect(ORGAOS_GOVERNANCA_PADRAO.map((o) => o.nome)).toEqual([
      'Reunião de Sócios',
      'Conselho de Administração',
      'Diretor Executivo',
    ]);
    expect(ORGAOS_GOVERNANCA_PADRAO.every((o) => o.entraNoContrato)).toBe(true);
  });
});

describe('mesmaChaveDeOrgao', () => {
  it('ignora caixa e espaço nas pontas', () => {
    expect(mesmaChaveDeOrgao('  conselho de administração ', 'Conselho de Administração')).toBe(true);
  });

  it('não confunde órgãos diferentes', () => {
    expect(mesmaChaveDeOrgao('Diretor Executivo', 'Diretoria')).toBe(false);
  });
});

describe('padroesFaltando', () => {
  it('lista vazia pede os três', () => {
    expect(padroesFaltando([])).toHaveLength(3);
  });

  it('acrescenta só o que falta, e não o pacote inteiro', () => {
    const faltam = padroesFaltando(['Reunião de Sócios', 'Gerentes corporativos']);
    expect(faltam.map((o) => o.nome)).toEqual(['Conselho de Administração', 'Diretor Executivo']);
  });

  it('clicar de novo com tudo cadastrado não devolve nada', () => {
    const todos = ORGAOS_GOVERNANCA_PADRAO.map((o) => o.nome);
    expect(padroesFaltando(todos)).toEqual([]);
  });

  it('o cliente que apagou o Conselho de propósito recebe só ele de volta se pedir', () => {
    // Nem todo cliente tem Conselho: a consultoria avisou que alguns só têm
    // Diretoria. O botão não força, apenas oferece o que falta.
    const faltam = padroesFaltando(['Reunião de Sócios', 'Diretor Executivo']);
    expect(faltam.map((o) => o.nome)).toEqual(['Conselho de Administração']);
  });

  it('reconhece o padrão já cadastrado com caixa diferente', () => {
    expect(padroesFaltando(['reunião de sócios', 'CONSELHO DE ADMINISTRAÇÃO', 'Diretor Executivo']))
      .toEqual([]);
  });
});

describe('erroDeOrgaoGovernanca', () => {
  it('nome repetido vira frase de gente, não nome de constraint', () => {
    const cru = 'duplicate key value violates unique constraint "orgao_governanca_nome_uq"';
    expect(erroDeOrgaoGovernanca(new Error(cru))).toBe('Este cliente já tem um órgão com esse nome.');
  });

  it('vigência invertida no banco também é traduzida', () => {
    const cru = 'new row violates check constraint "orgao_governanca_vigencia_ck"';
    expect(erroDeOrgaoGovernanca(new Error(cru))).toBe(
      'O fim da vigência não pode ser antes do início.',
    );
  });

  it('recusa de RLS não expõe vocabulário de banco', () => {
    const cru = 'new row violates row-level security policy for table "orgao_governanca"';
    expect(erroDeOrgaoGovernanca(new Error(cru))).toBe(
      'Você não tem permissão para alterar os órgãos deste cliente.',
    );
  });

  it('erro desconhecido é preservado, não engolido num texto genérico', () => {
    expect(erroDeOrgaoGovernanca(new Error('conexão perdida'))).toBe('conexão perdida');
  });

  it('erro sem mensagem cai num texto útil', () => {
    expect(erroDeOrgaoGovernanca({})).toBe('Não foi possível salvar o órgão. Tente novamente.');
  });
});

describe('ehOrgaoPadrao', () => {
  it('reconhece os três, sem se importar com caixa', () => {
    expect(ehOrgaoPadrao('conselho de administração')).toBe(true);
    expect(ehOrgaoPadrao('Gerentes corporativos')).toBe(false);
  });
});

describe('hierarquiaArrumada', () => {
  it('padrões no topo na ordem oficial, cliente depois', () => {
    expect(hierarquiaArrumada([
      'Reunião de Sócios', 'Conselho de Administração', 'Diretor Executivo', 'Gerentes corporativos',
    ])).toBe(true);
  });

  it('órgão do cliente acima de um padrão está errado', () => {
    // Foi o caso real: quem cadastrou os gerentes antes de clicar no botão
    // ficava com eles acima da Reunião de Sócios.
    expect(hierarquiaArrumada([
      'Gerentes corporativos', 'Reunião de Sócios', 'Conselho de Administração',
    ])).toBe(false);
  });

  it('dois padrões trocados entre si está errado', () => {
    expect(hierarquiaArrumada([
      'Conselho de Administração', 'Reunião de Sócios', 'Diretor Executivo',
    ])).toBe(false);
  });

  it('só parte dos padrões cadastrada, e no topo, está certo', () => {
    // Nem todo cliente tem Conselho: a lista de dois é válida.
    expect(hierarquiaArrumada(['Reunião de Sócios', 'Diretor Executivo', 'Gerente de Unidade'])).toBe(true);
  });

  it('lista sem nenhum padrão não está errada', () => {
    expect(hierarquiaArrumada(['Gerentes corporativos'])).toBe(true);
  });
});
