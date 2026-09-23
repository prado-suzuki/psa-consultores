/**
 * A redação das resoluções da alteração contratual, lida das MIGRATIONS que a
 * levam ao banco e renderizada pelo motor. Texto copiado para o teste envelhece
 * sozinho; o que precisa ser guardado é o que vai ao banco.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gerarComposicao } from './index';
import {
  mapearOrgaoGovernanca, redacaoDaGovernanca, redacaoDoCapital, vocabularioDaPreferencia, vocabularioDaRetirada,
  type CessaoParaMapear,
} from './mapeadores';
import type { RegistroFamilias } from './familia';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { removerMarcas } from './marcas';
import type { Bloco, Contexto, Template } from './types';

/** As tuplas (bloco, texto antigo, texto novo) de uma migration de redação. */
function redacoes(arquivo: string): Map<string, { antigo: string; novo: string }> {
  const sql = readFileSync(`supabase/migrations/${arquivo}`, 'utf8');
  const tuplas = sql.matchAll(
    /'([0-9a-f-]{36})'::uuid,\s*\$txt\$([\s\S]*?)\$txt\$,\s*\$txt\$([\s\S]*?)\$txt\$/g,
  );
  return new Map([...tuplas].map(([, id, antigo, novo]) => [id, { antigo, novo }]));
}

/** Bloco sem flag só entra na composição quando é obrigatório. */
function renderizar(blocos: Bloco[], ctx: Contexto, flags: string[] = []): string[] {
  const compostos = blocos.map((b) => (b.flagsRequeridas?.length ? b : { obrigatorio: true, ...b }));
  const { blocos: gerados } = gerarComposicao({ id: 't', nome: 't', blocos: compostos }, ctx, flags);
  return gerados.map((b) => removerMarcas(b.conteudo));
}

describe('a lista de usufrutos é anunciada, e não colada à frase de abertura', () => {
  const textos = redacoes('20260923155427_uso_e_gozo_antes_da_lista_de_usufrutos.sql');
  const usufruto = {
    ordemRomana: 'i', quotas: '184.716', quotasExtenso: 'cento e oitenta e quatro mil, setecentas e dezesseis',
    usufrutuarioNomes: 'Lucas Nogueira e Marina Salgado',
  };
  const nuProprietario = { nomeMaiusculo: 'HEITOR CARDOSO', qualificacao: 'brasileiro' };

  it('reserva de usufruto: "uso e gozo, nos seguintes termos: i) sobre"', () => {
    const { novo } = textos.get('10445d6c-973e-47cb-b7fc-9d8d100f4d8a')!;
    const [texto] = renderizar(
      [{ id: 'r', tipo: 'livre', conteudo: novo }],
      { usufrutos: [{ usufruto, nuProprietario, comVoto: true, semVoto: false }] },
    );
    expect(texto).not.toContain('gozoi)');
    expect(texto).toContain('direitos de uso e gozo, nos seguintes termos: i) sobre 184.716');
  });

  it('instituição de usufruto: "mesma titularidade, nos seguintes termos: i) HEITOR"', () => {
    const { novo } = textos.get('bbaeb5b3-810d-49a7-822a-917873a4d671')!;
    const [texto] = renderizar(
      [{ id: 'r', tipo: 'livre', conteudo: novo }],
      { usufrutosInstituidos: [{ usufruto, nuProprietario, comVoto: true, semVoto: false }] },
    );
    expect(texto).not.toContain('titularidadei)');
    expect(texto).toContain('a mesma titularidade, nos seguintes termos: i) HEITOR CARDOSO');
  });

  it('a guarda confere o texto corrompido que o banco tem hoje', () => {
    for (const { antigo, novo } of textos.values()) {
      expect(antigo).toMatch(/(gozo|titularidade)\{\{#usufrutos/);
      expect(novo).not.toMatch(/(gozo|titularidade)\{\{#usufrutos/);
    }
  });
});

describe('toda resolução sai numerada na série das resoluções', () => {
  const sql = readFileSync('supabase/migrations/20260923155611_resolucoes_livres_viram_clausulas.sql', 'utf8');
  const rubricas = new Map(
    [...sql.matchAll(/'([0-9a-f-]{36})'::uuid, \$r\$([\s\S]*?)\$r\$/g)].map(([, id, r]) => [id, r]),
  );

  it('cobre as resoluções que ainda eram livres: qualificação, doação, usufruto e governança', () => {
    expect([...rubricas.keys()].sort()).toEqual([
      '01a20156-0ae5-4011-9919-d50b3b9e852b',
      '10445d6c-973e-47cb-b7fc-9d8d100f4d8a',
      '17bf4288-6490-40e8-8c68-9cf9be3a7507',
      '22d227a0-0b64-4932-b2db-0388f893d587',
      '82259dcd-a840-496a-add7-2e54f0f3f87f',
      '9009b16c-639f-43b0-96a0-d056c2488f14',
      'ac000001-0000-4000-8000-000000000007',
      'bbaeb5b3-810d-49a7-822a-917873a4d671',
      'c25643d9-f920-4b25-975f-5902a48ddf0e',
    ]);
    expect(sql).toContain("set tipo = 'clausula'");
  });

  it('a doação numera como a cessão, e o consolidado recomeça na Cláusula Primeira', () => {
    const doacao = [
      '9009b16c-639f-43b0-96a0-d056c2488f14',
      '10445d6c-973e-47cb-b7fc-9d8d100f4d8a',
      '82259dcd-a840-496a-add7-2e54f0f3f87f',
      '17bf4288-6490-40e8-8c68-9cf9be3a7507',
      'c25643d9-f920-4b25-975f-5902a48ddf0e',
    ];
    // O que a migration grava: o texto vigente sem a rubrica.
    const resolucoes: Bloco[] = doacao.map((id, i) => {
      const rubrica = rubricas.get(id)!;
      const vigente = `${rubrica}Texto da resolução ${i + 1}.`;
      return { id, tipo: 'clausula', conteudo: vigente.slice(rubrica.length) };
    });
    const textos = renderizar([
      { id: 'secao', tipo: 'livre', conteudo: 'DAS ALTERAÇÕES CONTRATUAIS' },
      ...resolucoes,
      { id: 'ratificacao', tipo: 'clausula', conteudo: 'As demais cláusulas permanecem.' },
      { id: 'consolidacao', tipo: 'clausula', conteudo: 'Os sócios resolvem consolidar.' },
      { id: 'cabecalho', tipo: 'livre', conteudo: 'Cabeçalho da consolidação', reiniciaNumeracao: true },
      { id: 'denominacao', tipo: 'clausula', conteudo: 'A sociedade gira sob o nome X.' },
    ], {});

    expect(textos.slice(1, 6)).toEqual([
      'CLÁUSULA PRIMEIRA: Texto da resolução 1.',
      'CLÁUSULA SEGUNDA: Texto da resolução 2.',
      'CLÁUSULA TERCEIRA: Texto da resolução 3.',
      'CLÁUSULA QUARTA: Texto da resolução 4.',
      'CLÁUSULA QUINTA: Texto da resolução 5.',
    ]);
    expect(textos[6]).toBe('CLÁUSULA SEXTA: As demais cláusulas permanecem.');
    expect(textos.at(-1)).toBe('CLÁUSULA PRIMEIRA: A sociedade gira sob o nome X.');
  });
});

describe('a nova redação da cláusula de capital é transcrita uma vez só', () => {
  const textos = redacoes('20260923155940_capital_transcrito_uma_vez_na_alteracao.sql');
  const novo = (id: string) => textos.get(id)!.novo;
  const AUMENTO = 'ac000001-0000-4000-8000-000000000002';
  const CESSAO = 'ac000001-0000-4000-8000-000000000003';
  const INTEGRALIZACAO = 'ac000001-0000-4000-8000-000000000004';

  const blocos = (): Bloco[] => [
    { id: AUMENTO, tipo: 'clausula', conteudo: novo(AUMENTO), flagsRequeridas: ['evento_aumento_capital'] },
    { id: CESSAO, tipo: 'clausula', conteudo: novo(CESSAO), flagsRequeridas: ['evento_cessao_quotas'] },
    { id: INTEGRALIZACAO, tipo: 'clausula', conteudo: novo(INTEGRALIZACAO), flagsRequeridas: ['evento_integralizacao'] },
    // O novo quadro (ac000001-…-006) não muda: quando entra, é sempre ele quem transcreve.
    {
      id: 'quadro', tipo: 'clausula', flagsRequeridas: ['evento_mudanca_socios'],
      conteudo: 'Altera-se a composição do quadro societário. Em consequência, modificam-se as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação: “O capital social é de R$ {{ sociedade.capitalValor }}.”',
    },
    { id: 'cabecalho', tipo: 'livre', conteudo: 'Consolidação', obrigatorio: true, reiniciaNumeracao: true },
    { id: 'capital', tipo: 'clausula', conteudo: 'Capital.', obrigatorio: true, ancora: 'capital_social' },
  ];

  const socio = { ordemRomana: 'i', nomeMaiusculo: 'LUCAS', inscrito: 'inscrito', cpfCnpj: '1', quotas: '10', quotasExtenso: 'dez', vlrTotal: '10,00', vlrTotalExtenso: 'dez reais' };
  const ctx = (flags: string[]): Contexto => ({
    sociedade: {
      houveAumentoCapital: 'sim', capitalDelta: '10,00', capitalDeltaExtenso: 'dez reais',
      capitalAnterior: '1,00', capitalAnteriorExtenso: 'um real', capitalValor: '11,00', capitalExtenso: 'onze reais',
      totalQuotas: '11', totalQuotasExtenso: 'onze', quotaValorNominal: '1,00', quotaValorNominalExtenso: 'um real',
    },
    socios: [{ socio }],
    cessoes: [{ cessao: { ordemRomana: 'i', quotas: '10', quotasExtenso: 'dez', valor: '10,00', valorExtenso: 'dez reais' }, cedente: socio, cessionario: socio }],
    integralizacoes: [{ socio: { ...socio, peloSocio: 'pelo sócio' }, aportes: [{ aporte: { alinea: 'a', valor: '10,00', valorExtenso: 'dez reais' }, seImovel: false, seMoeda: true, seQuotas: false }] }],
    redacaoCapital: redacaoDoCapital(flags),
  });
  const transcricoes = (flags: string[]) => {
    const textos = renderizar(blocos(), ctx(flags), flags);
    return { textos, vezes: textos.join('\n').split('O capital social é de').length - 1 };
  };

  it('aumento, integralização e novo quadro: só o novo quadro transcreve', () => {
    const { textos, vezes } = transcricoes(['evento_aumento_capital', 'evento_integralizacao', 'evento_mudanca_socios']);
    expect(vezes).toBe(1);
    expect(textos[0]).toBe('CLÁUSULA PRIMEIRA: Aumenta-se o capital social em R$ 10,00 (dez reais), de modo que o capital social anterior de R$ 1,00 (um real) passará a ser de R$ 11,00 (onze reais).');
    expect(textos[1]).not.toContain('Cláusula');
    expect(textos[2]).toContain('Altera-se a composição do quadro societário');
  });

  it('cessão e novo quadro: a cessão narra o ato e o novo quadro transcreve', () => {
    const { textos, vezes } = transcricoes(['evento_cessao_quotas', 'evento_mudanca_socios']);
    expect(vezes).toBe(1);
    expect(textos[0]).toMatch(/cede e transfere 10 \(dez\) quotas.*a LUCAS/);
    expect(textos[0]).not.toContain('Em razão da cessão');
  });

  it('um evento só: a transcrição continua na própria resolução', () => {
    expect(transcricoes(['evento_aumento_capital']).textos[0]).toContain('modificando-se, consequentemente, as disposições contidas na Cláusula Primeira');
    expect(transcricoes(['evento_cessao_quotas']).textos[0]).toContain('Em razão da cessão, modificam-se');
    expect(transcricoes(['evento_aumento_capital', 'evento_integralizacao']).textos[1]).toContain('Em consequência, modificam-se');
    for (const flags of [['evento_aumento_capital'], ['evento_cessao_quotas'], ['evento_aumento_capital', 'evento_integralizacao']]) {
      expect(transcricoes(flags).vezes).toBe(1);
    }
  });
});

describe('cessão total: os cedentes comparecem e ninguém renuncia por quem não existe', () => {
  const textos = redacoes('20260923160238_retirantes_no_preambulo_e_renuncia_so_com_terceiros.sql');
  const PREAMBULO = textos.get('ac000002-0000-4000-8000-000000000001')!.novo;
  const RENUNCIA = textos.get('ac000003-0000-4000-8000-000000000001')!.novo;

  const pessoa = (id: string, genero: 'M' | 'F' | null, tipo_pessoa = 'PF') =>
    ({ id, denominacao: id, genero, tipo_pessoa }) as unknown as PessoaRow;
  const JATOBA = pessoa('JATOBÁ SEMENTES S.A.', null, 'PJ');
  const LUCAS = pessoa('LUCAS NOGUEIRA', 'M');
  const HEITOR = pessoa('HEITOR CARDOSO', 'M');
  const MARINA = pessoa('MARINA SALGADO', 'F');
  const cessao = (cedente: PessoaRow, cessionario: PessoaRow) =>
    ({ id: cedente.id, cedente, cessionario, quotas: 1, valor: 1 }) as CessaoParaMapear;
  const item = (chave: string) => (p: PessoaRow) => ({ [chave]: { qualificacao: `${p.id}, qualificado` } });

  const preambulo = (socios: PessoaRow[], retirantes: PessoaRow[]) => renderizar(
    [{ id: 'p', tipo: 'livre', conteudo: PREAMBULO }],
    {
      socios: socios.map(item('socio')),
      retirantes: retirantes.map(item('retirante')),
      retirada: vocabularioDaRetirada(retirantes, socios),
      sociedade: {
        tituloColetivoSocios: socios.length === 1 ? 'Única sócia' : 'Únicos sócios',
        razaoSocial: 'Farroupilha Comércio Ltda', cnpj: '07.781.351/8252-30', juntaUfExtenso: 'Mato Grosso',
        nire: '51202129910', sede: 'Rua Vitor Dias, n.º 1094',
      },
    },
  )[0];

  it('o preâmbulo qualifica os retirantes e o fecho conta todas as partes', () => {
    const texto = preambulo([JATOBA], [LUCAS, HEITOR, MARINA]);
    expect(texto).toContain('JATOBÁ SEMENTES S.A., qualificado; e, na qualidade de sócios retirantes,\n\nLUCAS NOGUEIRA, qualificado;\n\nHEITOR CARDOSO, qualificado; e\n\nMARINA SALGADO, qualificado.');
    expect(texto).toContain('Únicos sócios da sociedade limitada Farroupilha Comércio Ltda');
    expect(texto).not.toContain('Única sócia');
  });

  it('sem retirante, o preâmbulo sai como sempre saiu', () => {
    const texto = preambulo([LUCAS, JATOBA], []);
    expect(texto).toMatch(/^LUCAS NOGUEIRA, qualificado; e\n\nJATOBÁ SEMENTES S\.A\., qualificado\.\n\n {2}Únicos sócios da sociedade limitada/);
    expect(texto).not.toContain('retirante');
  });

  const renuncia = (cessoes: CessaoParaMapear[], socios: PessoaRow[]) => renderizar(
    [{ id: 'r', tipo: 'clausula', conteudo: RENUNCIA }],
    { preferencia: vocabularioDaPreferencia(cessoes, socios) },
  );

  it('todos cedem à controladora: não há demais sócios, e a renúncia não sai', () => {
    expect(renuncia([cessao(LUCAS, JATOBA), cessao(HEITOR, JATOBA), cessao(MARINA, JATOBA)], [JATOBA])).toEqual([]);
  });

  it('com sócio fora da cessão, a renúncia sai e concorda com ele', () => {
    expect(renuncia([cessao(LUCAS, HEITOR)], [HEITOR, MARINA])).toEqual([
      'CLÁUSULA PRIMEIRA: A outra sócia, ciente da cessão de quotas formalizada neste instrumento, renuncia expressamente ao direito de preferência previsto no contrato social.',
    ]);
    expect(renuncia([cessao(LUCAS, JATOBA)], [JATOBA, HEITOR, MARINA])[0]).toContain(
      'Os demais sócios, cientes da cessão de quotas formalizada neste instrumento, renunciam expressamente',
    );
  });
});

describe('as resoluções de governança transcrevem o capítulo da administração', () => {
  const textos = redacoes('20260923181010_resolucoes_de_governanca_transcrevem_o_capitulo.sql');
  const INSTALACAO = '01a20156-0ae5-4011-9919-d50b3b9e852b';
  const ALTERACAO = '22d227a0-0b64-4932-b2db-0388f893d587';
  const MUDANCA = '40dd930b-701b-4c6d-821d-b4f6b6d5ae23';

  // Os blocos do capítulo, na ordem em que a migration da governança os semeia.
  const capitulo: Bloco[] = [...readFileSync(
    'supabase/migrations/20260915201913_capitulo_da_governanca_no_contrato_social.sql', 'utf8',
  ).matchAll(
    /pg_temp\.bloco\(\s*'([0-9a-f-]{36})'::uuid,\s*'[^']*',\s*'(\w+)',\s*\$txt\$([\s\S]*?)\$txt\$(?:,\s*(?:null|'(\w+)'))?(?:,\s*'(\w+)')?\s*\)/g,
  )]
    .filter(([, id]) => id !== INSTALACAO && id !== ALTERACAO)
    .map(([, id, tipo, conteudo, ancora, repete]) => ({
      id, tipo: tipo as Bloco['tipo'], conteudo, ancora, repeteColecao: repete,
      flagsRequeridas: ['governanca_por_orgaos'],
    }));

  const familias: RegistroFamilias = {
    'Alínea de competência': [{
      id: 'alinea-padrao', rotulo: null, ordem: 1, seletor: {},
      conteudo: '{{ competencia.papeisInfinitivo }} {{ competencia.atividadeMinuscula }}',
    }],
  };

  const conselho = mapearOrgaoGovernanca({
    id: 'c', nome: 'Conselho de Administração', genero: 'M', membros_minimo: 3, membros_maximo: 4, mandato_anos: 2,
  });
  const diretoria = mapearOrgaoGovernanca({
    id: 'd', nome: 'Diretoria', genero: 'F', membros_minimo: 3, membros_maximo: 3, mandato_anos: 3,
  });
  const competencia = (alinea: string, papeisInfinitivo: string, atividadeMinuscula: string) =>
    ({ competencia: { alinea, papeisInfinitivo, atividadeMinuscula } });
  const ctx: Contexto = {
    conselhoAdministracao: conselho,
    diretoria,
    orgaosComCompetencia: [
      { orgao: conselho, competencias: [competencia('a', 'Aprovar', 'o orçamento anual'), competencia('b', 'Eleger', 'os diretores')] },
      { orgao: diretoria, competencias: [competencia('a', 'Executar', 'o planejamento estratégico')] },
    ],
  };

  const obrigatorio = (id: string, tipo: Bloco['tipo'], conteudo: string, extra: Partial<Bloco> = {}): Bloco =>
    ({ id, tipo, conteudo, obrigatorio: true, ...extra });
  const RESOLUCOES = [INSTALACAO, ALTERACAO, MUDANCA];
  const modelo = (): Template => ({
    id: 'ac',
    nome: 'Contrato Social',
    blocos: [
      obrigatorio('secao', 'livre', 'DAS ALTERAÇÕES CONTRATUAIS'),
      { id: 'sede', tipo: 'clausula', conteudo: 'Altera-se a sede.', flagsRequeridas: ['evento_sede'] },
      { id: INSTALACAO, tipo: 'clausula', conteudo: textos.get(INSTALACAO)!.novo, flagsRequeridas: ['evento_governanca', 'governanca_instalada'] },
      { id: ALTERACAO, tipo: 'clausula', conteudo: textos.get(ALTERACAO)!.novo, flagsRequeridas: ['evento_governanca', 'governanca_alterada'] },
      { id: MUDANCA, tipo: 'clausula', conteudo: textos.get(MUDANCA)!.novo, flagsRequeridas: ['evento_mudanca_administracao', 'governanca_por_orgaos'] },
      obrigatorio('ratificacao', 'clausula', 'As demais cláusulas permanecem.'),
      obrigatorio('cabecalho', 'livre', 'CONSOLIDAÇÃO', { reiniciaNumeracao: true }),
      obrigatorio('cap-denominacao', 'capitulo', 'Denominação, Sede e Prazo'),
      obrigatorio('denominacao', 'clausula', 'A sociedade gira sob o nome X.'),
      obrigatorio('sede-c', 'clausula', 'A sede é em Y.'),
      obrigatorio('cap-capital', 'capitulo', 'Capital Social'),
      obrigatorio('capital', 'clausula', 'O capital é de R$ 10,00.'),
      obrigatorio('cap-admin', 'capitulo', 'Administração', { ancora: 'capituloAdministracao' }),
      { id: 'admin-simples', tipo: 'clausula', conteudo: 'A sociedade é administrada isoladamente por Z.', flagsRequeridas: ['administracao_simples'] },
      ...capitulo,
      obrigatorio('cap-falecimento', 'capitulo', 'Falecimento'),
      obrigatorio('falecimento', 'clausula', 'O falecimento não dissolve a sociedade.'),
    ],
  });

  const GOVERNANCA = ['e_alteracao', 'governanca_por_orgaos'];
  const gerar = (flags: string[], template = modelo()) => gerarComposicao(
    template, { ...ctx, redacaoGovernanca: redacaoDaGovernanca(flags) }, flags, familias,
  );
  const texto = (blocos: { conteudo: string }[]) => blocos.map((b) => removerMarcas(b.conteudo));
  const rotulos = (t: string) => t.match(/CLÁUSULA [^:]+:/g) ?? [];

  it('a guarda confere o texto vigente, que só remetia à consolidação', () => {
    expect([...textos.keys()].sort()).toEqual([...RESOLUCOES].sort());
    for (const { antigo, novo } of textos.values()) {
      expect(antigo).toContain('passa a vigorar com a redação da consolidação deste instrumento');
      expect(novo).toContain('{{transcricao capitulo="capituloAdministracao"}}');
    }
  });

  it('instalação: cita o intervalo e transcreve o capítulo como o consolidado o numera', () => {
    const { blocos, descartados } = gerar([...GOVERNANCA, 'evento_governanca', 'governanca_instalada']);
    expect(descartados).toEqual([]);
    const linhas = texto(blocos);
    const resolucao = linhas[1];
    expect(resolucao).toMatch(/^CLÁUSULA PRIMEIRA: Neste ato, a sociedade passa a ser administrada pelo Conselho de Administração e pela Diretoria, órgãos instituídos por meio do presente, alterando todo o regramento elencado junto ao Capítulo III, que trata da administração da sociedade, de modo que se alteram das Cláusulas Quarta à Vigésima deste Contrato Social, de modo que vigorarão nos seguintes termos e forma:\n\n\t\tCAPÍTULO III\n\t\tAdministração\n\tCLÁUSULA QUARTA: A sociedade é administrada pelo Conselho de Administração e pela Diretoria/);
    expect(linhas[2]).toBe('CLÁUSULA SEGUNDA: As demais cláusulas permanecem.');

    const inicio = blocos.findIndex((b) => b.id === 'cap-admin');
    const fim = blocos.findIndex((b) => b.id === 'cap-falecimento');
    const consolidado = texto(blocos.slice(inicio, fim)).join('\n');
    const transcrito = resolucao.slice(resolucao.indexOf('\t\tCAPÍTULO III')).replace(/^\t+/gm, '');
    for (const linha of consolidado.split('\n')) expect(transcrito).toContain(linha);
    // Cada número uma vez só na transcrição, e os mesmos do consolidado.
    expect(rotulos(transcrito)).toEqual(rotulos(consolidado));
    expect(new Set(rotulos(transcrito)).size).toBe(17);
    // A competência sai uma cláusula por órgão, igual ao consolidado.
    expect(transcrito).toContain('Compete ao Conselho de Administração, além de outras matérias previstas neste contrato social:\na) Aprovar o orçamento anual;\nb) Eleger os diretores.');
    expect(transcrito).toContain('Compete à Diretoria, além de outras matérias previstas neste contrato social:\na) Executar o planejamento estratégico.');
    expect(linhas.at(-1)).toBe('CLÁUSULA VIGÉSIMA PRIMEIRA: O falecimento não dissolve a sociedade.');
  });

  it('instalação com mudança na administração: o capítulo é transcrito uma vez só', () => {
    const { blocos, descartados } = gerar([...GOVERNANCA, 'evento_governanca', 'governanca_instalada', 'evento_mudanca_administracao']);
    expect(descartados.map((d) => d.id)).toEqual([MUDANCA]);
    expect(texto(blocos).join('\n').split('\t\tCAPÍTULO III').length - 1).toBe(1);
  });

  it('alteração da governança: órgãos já instituídos', () => {
    const [, resolucao] = texto(gerar([...GOVERNANCA, 'evento_governanca', 'governanca_alterada']).blocos);
    expect(resolucao).toMatch(/^CLÁUSULA PRIMEIRA: Neste ato, alteram-se a composição, as competências e as alçadas do Conselho de Administração e da Diretoria, órgãos já instituídos, alterando o regramento elencado junto ao Capítulo III, que trata da administração da sociedade, de modo que se alteram das Cláusulas Quarta à Vigésima deste Contrato Social, de modo que vigorarão nos seguintes termos e forma:\n\n\t\tCAPÍTULO III/);
  });

  it('só a mudança na administração: mantém o regramento e transcreve', () => {
    const [, resolucao] = texto(gerar([...GOVERNANCA, 'evento_mudanca_administracao']).blocos);
    expect(resolucao).toMatch(/^CLÁUSULA PRIMEIRA: Neste ato, altera-se a administração da sociedade, mantendo todo o regramento elencado junto ao Capítulo III, que trata da administração da sociedade, de modo que alteram-se as Cláusulas Quarta à Vigésima deste Contrato Social, que vigorarão nos seguintes termos e forma:\n\n\t\tCAPÍTULO III/);
  });

  it('AC sem governança sai igual a um modelo sem as resoluções de governança', () => {
    const flags = ['e_alteracao', 'administracao_simples', 'evento_sede'];
    const semResolucoes = { ...modelo(), blocos: modelo().blocos.filter((b) => !RESOLUCOES.includes(b.id)) };
    const com = gerar(flags);
    expect(com.blocos).toEqual(gerar(flags, semResolucoes).blocos);
    expect(texto(com.blocos).join('\n')).not.toContain('\t');
    expect(texto(com.blocos)[1]).toBe('CLÁUSULA PRIMEIRA: Altera-se a sede.');
  });
});
