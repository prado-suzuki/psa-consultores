import { describe, expect, it } from 'vitest';

import {
  ORGAOS_GOVERNANCA_PADRAO,
  comArtigo,
  ehOrgaoPadrao,
  generoDoOrgao,
  erroDeOrgaoGovernanca,
  hierarquiaArrumada,
  mesmaChaveDeOrgao,
  previaDaClausula,
  resumoDoOrgao,
  padroesFaltando,
} from '@/lib/orgaosGovernancaPadrao';

/** Órgão como a tela o entrega: nome e, quando veio do botão de padrões, a chave. */
const orgao = (nome: string, padrao_chave: string | null = null) => ({ nome, padrao_chave });

describe('ORGAOS_GOVERNANCA_PADRAO', () => {
  it('são os três confirmados pela analista, e todos entram no contrato', () => {
    expect(ORGAOS_GOVERNANCA_PADRAO.map((o) => o.nome)).toEqual([
      'Reunião de Sócios',
      'Conselho de Administração',
      'Diretoria Executiva',
    ]);
    expect(ORGAOS_GOVERNANCA_PADRAO.every((o) => o.entraNoContrato)).toBe(true);
  });
});

describe('mesmaChaveDeOrgao', () => {
  it('ignora caixa e espaço nas pontas', () => {
    expect(mesmaChaveDeOrgao('  conselho de administração ', 'Conselho de Administração')).toBe(true);
  });

  it('não confunde órgãos diferentes', () => {
    expect(mesmaChaveDeOrgao('Diretoria Executiva', 'Diretoria')).toBe(false);
  });
});

describe('padroesFaltando', () => {
  it('lista vazia pede os três', () => {
    expect(padroesFaltando([])).toHaveLength(3);
  });

  it('acrescenta só o que falta, e não o pacote inteiro', () => {
    const faltam = padroesFaltando([orgao('Reunião de Sócios'), orgao('Gerentes corporativos')]);
    expect(faltam.map((o) => o.nome)).toEqual(['Conselho de Administração', 'Diretoria Executiva']);
  });

  it('clicar de novo com tudo cadastrado não devolve nada', () => {
    const todos = ORGAOS_GOVERNANCA_PADRAO.map((o) => orgao(o.nome));
    expect(padroesFaltando(todos)).toEqual([]);
  });

  it('o cliente que apagou o Conselho de propósito recebe só ele de volta se pedir', () => {
    // Nem todo cliente tem Conselho: a consultoria avisou que alguns só têm
    // Diretoria. O botão não força, apenas oferece o que falta.
    const faltam = padroesFaltando([orgao('Reunião de Sócios'), orgao('Diretoria Executiva')]);
    expect(faltam.map((o) => o.nome)).toEqual(['Conselho de Administração']);
  });

  it('reconhece o padrão já cadastrado com caixa diferente', () => {
    expect(padroesFaltando(['reunião de sócios', 'CONSELHO DE ADMINISTRAÇÃO', 'Diretoria Executiva'].map((x) => orgao(x))))
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
    expect(ehOrgaoPadrao(orgao('conselho de administração'))).toBe(true);
    expect(ehOrgaoPadrao(orgao('Gerentes corporativos'))).toBe(false);
  });
});

describe('hierarquiaArrumada', () => {
  it('padrões no topo na ordem oficial, cliente depois', () => {
    expect(hierarquiaArrumada([
      'Reunião de Sócios', 'Conselho de Administração', 'Diretoria Executiva', 'Gerentes corporativos',
    ].map((x) => orgao(x)))).toBe(true);
  });

  it('órgão do cliente acima de um padrão está errado', () => {
    // Foi o caso real: quem cadastrou os gerentes antes de clicar no botão
    // ficava com eles acima da Reunião de Sócios.
    expect(hierarquiaArrumada([
      'Gerentes corporativos', 'Reunião de Sócios', 'Conselho de Administração',
    ].map((x) => orgao(x)))).toBe(false);
  });

  it('dois padrões trocados entre si está errado', () => {
    expect(hierarquiaArrumada([
      'Conselho de Administração', 'Reunião de Sócios', 'Diretoria Executiva',
    ].map((x) => orgao(x)))).toBe(false);
  });

  it('só parte dos padrões cadastrada, e no topo, está certo', () => {
    // Nem todo cliente tem Conselho: a lista de dois é válida.
    expect(hierarquiaArrumada(['Reunião de Sócios', 'Diretoria Executiva', 'Gerente de Unidade'].map((x) => orgao(x)))).toBe(true);
  });

  it('lista sem nenhum padrão não está errada', () => {
    expect(hierarquiaArrumada([orgao('Gerentes corporativos')])).toBe(true);
  });
});

describe('generoDoOrgao', () => {
  it('acerta os cinco nomes de órgão que existem nos sete contratos do acervo', () => {
    // Medido em 14/09 nos contratos da pasta de estudo: "Conselho de
    // Administração" (432 menções), "Reunião de Sócios" (374), "Conselho
    // Consultivo" (10), "Conselho Fiscal" (5) e "Diretoria" (3).
    expect(generoDoOrgao('Conselho de Administração')).toBe('M');
    expect(generoDoOrgao('Reunião de Sócios')).toBe('F');
    expect(generoDoOrgao('Conselho Consultivo')).toBe('M');
    expect(generoDoOrgao('Conselho Fiscal')).toBe('M');
    expect(generoDoOrgao('Diretoria')).toBe('F');
  });

  it('manda o NÚCLEO, e não a terminação', () => {
    // Foi por olhar a terminação que eu concluí, errado, que não dava para
    // adivinhar: "Administração" é feminina e não manda em nada.
    expect(generoDoOrgao('Conselho de Administração')).toBe('M');
    expect(generoDoOrgao('Diretoria Executiva de Planejamento')).toBe('F');
  });

  it('resolve o par ambíguo em "-ão", que é o caso que me enganou', () => {
    expect(generoDoOrgao('Gestão')).toBe('F');
    expect(generoDoOrgao('Órgão Colegiado')).toBe('M');
  });

  it('o catálogo vence a adivinhação nos três padrão', () => {
    for (const padrao of ORGAOS_GOVERNANCA_PADRAO) {
      expect(generoDoOrgao(padrao.nome)).toBe(padrao.genero);
    }
  });

  it('não se importa com acento nem com caixa', () => {
    expect(generoDoOrgao('COMITE DE AUDITORIA')).toBe('M');
    expect(generoDoOrgao('comitê de auditoria')).toBe('M');
  });

  it('cai na terminação quando não conhece o núcleo', () => {
    expect(generoDoOrgao('Supervisão de Riscos')).toBe('F');
    expect(generoDoOrgao('Departamento Jurídico')).toBe('M');
  });

  it('devolve null em vez de chutar masculino', () => {
    // Null é o sinal de "pergunte". Chutar aqui sairia no contrato como
    // "A Diretoria será compostO", que é o defeito que a função evita.
    expect(generoDoOrgao('Xyzzy Plugh')).toBeNull();
    expect(generoDoOrgao('   ')).toBeNull();
  });
});

describe('comArtigo', () => {
  it('escreve a frase que a tela mostra no lugar da pergunta', () => {
    expect(comArtigo('Conselho Gestor', 'M')).toBe('O Conselho Gestor');
    expect(comArtigo('  Diretoria  ', 'F')).toBe('A Diretoria');
  });
});

describe('resumoDoOrgao', () => {
  it('junta faixa, mandato e cargos', () => {
    expect(resumoDoOrgao({
      membros_minimo: 3,
      membros_maximo: 6,
      mandato_anos: 3,
      cargos_do_orgao: ['Presidente', 'Secretário'],
    })).toBe('3 a 6 membros · mandato de 3 anos · Presidente, Secretário');
  });

  it('mínimo igual ao máximo é número fixo', () => {
    expect(resumoDoOrgao({ membros_minimo: 5, membros_maximo: 5 })).toBe('5 membros');
  });

  it('aceita só uma das pontas', () => {
    expect(resumoDoOrgao({ membros_minimo: 2 })).toBe('a partir de 2 membros');
    expect(resumoDoOrgao({ membros_maximo: 7 })).toBe('até 7 membros');
  });

  it('concorda o ano no singular', () => {
    expect(resumoDoOrgao({ mandato_anos: 1 })).toBe('mandato de 1 ano');
  });

  it('órgão sem parametrização não vira travessão solto', () => {
    // A Reunião de Sócios é assim: não tem membro, mandato nem cargo.
    expect(resumoDoOrgao({})).toBe('');
    expect(resumoDoOrgao({ cargos_do_orgao: [] })).toBe('');
  });
});

describe('previaDaClausula', () => {
  it('escreve a faixa com numeral e extenso, como o contrato do Mattei', () => {
    expect(previaDaClausula({
      nome: 'Conselho de Administração',
      genero: 'M',
      membros_minimo: 4,
      membros_maximo: 7,
      mandato_anos: 2,
    })).toBe(
      'O Conselho de Administração será composto por no mínimo 04 (quatro) e no máximo '
      + '07 (sete) membros, com mandato de 02 (dois) anos, sendo admitida a reeleição.',
    );
  });

  it('concorda o particípio com o gênero do órgão', () => {
    expect(previaDaClausula({
      nome: 'Diretoria Executiva', genero: 'F', membros_minimo: 1, membros_maximo: 4,
    })).toBe('A Diretoria Executiva será composta por no mínimo 01 (um) e no máximo 04 (quatro) membros.');
  });

  it('mínimo igual ao máximo encolhe a frase', () => {
    expect(previaDaClausula({
      nome: 'Conselho Fiscal', genero: 'M', membros_minimo: 3, membros_maximo: 3,
    })).toBe('O Conselho Fiscal será composto por 03 (três) membros.');
  });

  it('os cargos entram na frase', () => {
    expect(previaDaClausula({
      nome: 'Diretoria', genero: 'F', membros_minimo: 3, membros_maximo: 3,
      cargos_do_orgao: ['Presidente', 'Vice-Presidente', 'Secretário'],
    })).toBe(
      'A Diretoria será composta por 03 (três) membros, sendo Presidente, Vice-Presidente e Secretário.',
    );
  });

  it('só mandato, sem quantidade, ainda vira frase de pé', () => {
    expect(previaDaClausula({ nome: 'Conselho Gestor', genero: 'M', mandato_anos: 4 }))
      .toBe('O Conselho Gestor terá mandato de 04 (quatro) anos, sendo admitida a reeleição.');
  });

  it('sem nada a dizer devolve vazio, e não meia frase', () => {
    // A Reunião de Sócios cai aqui: não tem membro, mandato nem cargo.
    expect(previaDaClausula({ nome: 'Reunião de Sócios', genero: 'F' })).toBe('');
  });

  it('sem gênero resolvido não arrisca escrever nada', () => {
    expect(previaDaClausula({ nome: 'Xyzzy', genero: null, membros_minimo: 3 })).toBe('');
  });
});

describe('a chave sobrevive ao rename', () => {
  /*
   * O caso da validação de 14/09: o usuário trocou uma letra em "Reunião de
   * Sócios" e a tela ofereceu criar o padrão de novo, o que deixaria o cliente
   * com dois. A chave existia desde 11/09 e nenhuma destas funções a usava.
   */
  const renomeado = { nome: 'Reunião de Sócioa', padrao_chave: 'reuniao_socios' };

  it('órgão padrão renomeado continua sendo reconhecido', () => {
    expect(ehOrgaoPadrao(renomeado)).toBe(true);
  });

  it('e não é oferecido de novo pelo botão de padrões', () => {
    const faltam = padroesFaltando([
      renomeado,
      orgao('Conselho de Administração', 'conselho_administracao'),
      orgao('Diretoria Executiva', 'diretoria_executiva'),
    ]);
    expect(faltam).toEqual([]);
  });

  it('nem solta a trava de ordem', () => {
    expect(hierarquiaArrumada([
      renomeado,
      orgao('Conselho de Administração', 'conselho_administracao'),
      orgao('Diretoria Executiva', 'diretoria_executiva'),
      orgao('Gerentes corporativos'),
    ])).toBe(true);
  });

  it('a CHAVE vence o nome, e não os dois juntos', () => {
    // Um órgão que carrega a chave da Diretoria e foi renomeado para o nome do
    // Conselho continua sendo a Diretoria. Casar pelos dois faria dele os dois,
    // e o botão de padrões concluiria que nada falta.
    const confuso = orgao('Conselho de Administração', 'diretoria_executiva');
    expect(padroesFaltando([confuso]).map((p) => p.chave)).toEqual([
      'reuniao_socios', 'conselho_administracao',
    ]);
  });

  it('órgão sem chave continua reconhecido pelo nome', () => {
    // Linha cadastrada antes de 11/09, ou digitada à mão em vez do botão.
    expect(ehOrgaoPadrao(orgao('Conselho de Administração'))).toBe(true);
  });

  it('órgão do cliente com nome parecido não vira padrão', () => {
    expect(ehOrgaoPadrao(orgao('Conselho Consultivo'))).toBe(false);
  });
});
