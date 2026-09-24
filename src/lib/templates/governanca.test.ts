/**
 * MOT-01 · o motor reconhece os campos de governança.
 *
 * O card pede, no "pronto quando": um modelo com os placeholders novos resolve
 * TODOS eles, `detectarBindings` não devolve nenhum em `desconhecidos`, a grade
 * da matriz sai como tabela e as listas se repetem.
 *
 * Este arquivo é essa exigência escrita como teste. O defeito que ele guarda é
 * silencioso por natureza: placeholder com papel desconhecido não estoura, vira
 * `desconhecidos` e some do documento sem aviso. Sem teste, a regressão só
 * apareceria num Word já entregue, com uma frase faltando.
 */
import { describe, expect, it } from 'vitest';
import { conteudoParaDeteccao, detectarBindingsDeConteudo, PAPEIS_LISTA } from './binding';
import { camposDaEntidade } from './vocabulario';
import {
  mapearAcordoQuotistas, mapearCompetenciaMatriz, mapearOrgaoGovernanca, mapearRegistro,
} from './mapeadores';
import { renderConteudo } from './render';
import { segmentar } from './tabela';

/** O modelo que a GOV-C vai escrever, reduzido ao que exercita cada peça. */
const MODELO_GOVERNANCA = [
  'CLÁUSULA SÉTIMA: O {{ conselhoAdministracao.nome }} será composto por no mínimo',
  '{{ conselhoAdministracao.membrosMinimoNumeral }} ({{ conselhoAdministracao.membrosMinimoExtenso }})',
  'e no máximo {{ conselhoAdministracao.membrosMaximoNumeral }} ({{ conselhoAdministracao.membrosMaximoExtenso }})',
  'membros, com mandato de {{ conselhoAdministracao.mandatoAnosNumeral }}',
  '({{ conselhoAdministracao.mandatoAnosExtenso }}) anos, sendo admitida a reeleição.',
  '',
  'CLÁUSULA OITAVA: Compete ao {{ conselhoAdministracao.nome }}:',
  '{{#competencias}}{{ competencia.alinea }}) {{ competencia.atividade }};{{/competencias}}',
  '',
  'CLÁUSULA DÉCIMA QUARTA: A {{ diretoria.nome }} terá mandato de',
  '{{ diretoria.mandatoAnosNumeral }} ({{ diretoria.mandatoAnosExtenso }}) anos,',
  'sendo {{ diretoria.cargos }}.',
  '',
  '{{#quotistasSignatarios sep="; " fim="; e "}}{{ quotista.nome }}{{/quotistasSignatarios}}.',
].join('\n');

describe('MOT-01 · placeholders de governança não caem em desconhecidos', () => {
  it('o modelo de governança resolve todos os papéis', () => {
    const deteccao = detectarBindingsDeConteudo(MODELO_GOVERNANCA);
    expect(deteccao.desconhecidos, 'placeholder sem papel some do Word sem avisar').toEqual([]);
  });

  it('os papéis de órgão apontam para a entidade certa', () => {
    const { bindings } = detectarBindingsDeConteudo(MODELO_GOVERNANCA);
    const porNome = Object.fromEntries(bindings.map((b) => [b.nome, b.tipo]));
    expect(porNome.conselhoAdministracao).toBe('orgaoGovernanca');
    expect(porNome.diretoria).toBe('orgaoGovernanca');
  });

  /*
   * Controle negativo. Sem ele, o teste acima passaria também num mundo em que
   * `detectarBindings` deixou de reportar desconhecidos: um teste que só sabe
   * dizer "vazio" não distingue "está tudo mapeado" de "parou de olhar".
   */
  it('papel que não existe CONTINUA caindo em desconhecidos', () => {
    const deteccao = detectarBindingsDeConteudo('{{ orgaoQueNinguemDeclarou.nome }}');
    expect(deteccao.desconhecidos).toContain('orgaoQueNinguemDeclarou.nome');
  });

  // O papel pode existir e o campo não: `{{ diretoria.campoQueNaoExiste }}` sai vazio sem aviso.
  it('todo campo de órgão do modelo existe no vocabulário', () => {
    const conhecidos = new Set(camposDaEntidade('orgaoGovernanca').map((c) => c.id));
    const usados = [...MODELO_GOVERNANCA.matchAll(/\{\{\s*(?:conselhoAdministracao|diretoria)\.(\w+)/g)]
      .map((m) => m[1]);
    expect(usados.length).toBeGreaterThan(0);
    expect(usados.filter((c) => !conhecidos.has(c))).toEqual([]);
  });

  it('as listas de governança são reconhecidas como lista', () => {
    const { listas } = detectarBindingsDeConteudo(MODELO_GOVERNANCA);
    const nomes = listas.map((l) => l.nome);
    expect(nomes).toContain('competencias');
    expect(nomes).toContain('quotistasSignatarios');
  });
});

/*
 * OS BLOCOS DE VERDADE, copiados do modelo de teste que gerou o primeiro
 * documento. O teste acima usava um modelo escrito à mão para o próprio teste,
 * e passou enquanto a geração real falhava com "Coleção do bloco repetidor não
 * resolvida". A diferença é que aqui entram as três seções que o modelo real
 * usa e que ninguém tinha declarado em PAPEIS_LISTA.
 */
const BLOCO_COMPOSICAO =
  'CLÁUSULA SÉTIMA: {{ conselhoAdministracao.artigo }} {{ conselhoAdministracao.nome }} será '
  + '{{ conselhoAdministracao.composto }} por no mínimo '
  + '{{ conselhoAdministracao.membrosMinimoNumeral }} ({{ conselhoAdministracao.membrosMinimoExtenso }}) '
  + 'e no máximo {{ conselhoAdministracao.membrosMaximoNumeral }} '
  + '({{ conselhoAdministracao.membrosMaximoExtenso }}) membros.';

const BLOCO_COMPETENCIA = [
  'Compete {{ orgao.ao }} {{ orgao.nome }}:',
  '{{#competencias}}{{ competencia.alinea }}) {{ competencia.papeis }} {{ competencia.atividade }}'
  + '{{#competencia.temAlcada}}, {{ competencia.alcada }}{{/competencia.temAlcada}}'
  + '{{#competencia.sobe}}, encaminhando a {{ competencia.sobePara }} o que exceder{{/competencia.sobe}};'
  + '{{/competencias}}',
].join('\n');

const BLOCO_GRADE = [
  '| | Estrutura Organizacional {{#matrizOrgaos sep=""}}| {{/matrizOrgaos}}',
  '| Decisão | {{#matrizOrgaos sep=""}}{{ orgaoDaGrade.nome }} | {{/matrizOrgaos}}',
  '| --- {{#matrizOrgaos sep=""}}| --- {{/matrizOrgaos}}|',
  '{{#matrizLinhas sep="\n"}}| {{ linhaDaGrade.atividade }} | '
  + '{{#celulas sep=""}}{{ celula.resumo }} | {{/celulas}}{{/matrizLinhas}}',
].join('\n');

describe('MOT-01 · os blocos do modelo de verdade', () => {
  /*
   * `conteudoParaDeteccao` e não `detectarBindingsDeConteudo` direto: é ele que
   * embrulha o bloco na coleção que ele repete, e é o caminho que a tela usa.
   * Analisar o bloco cru dá outro resultado, e foi assim que a primeira versão
   * deste arquivo passou enquanto a geração real falhava.
   */
  const detectar = (conteudo: string, repeteColecao?: string) =>
    detectarBindingsDeConteudo(conteudoParaDeteccao({ conteudo, repeteColecao }));

  it('nenhuma seção dos três blocos é desconhecida', () => {
    for (const [nome, bloco, colecao] of [
      ['composicao', BLOCO_COMPOSICAO, undefined],
      ['competencia', BLOCO_COMPETENCIA, 'orgaosComCompetencia'],
      ['grade', BLOCO_GRADE, undefined],
    ] as const) {
      const d = detectar(bloco, colecao);
      expect(d.desconhecidos, `bloco ${nome}: seção some do Word sem avisar`).toEqual([]);
    }
  });

  it('a coleção que o bloco repete é papel de lista conhecido', () => {
    // `repete_colecao` do bloco aponta para um nome de PAPEIS_LISTA. Sem o
    // registro, a geração morre com "Coleção do bloco repetidor não resolvida".
    expect(Object.keys(PAPEIS_LISTA)).toContain('orgaosComCompetencia');
    expect(Object.keys(PAPEIS_LISTA)).toContain('matrizOrgaos');
    expect(Object.keys(PAPEIS_LISTA)).toContain('matrizLinhas');
  });

  it('as chaves de item não viram campo de digitar à mão', () => {
    // `orgao.nome` dentro da repetição é escopo do item, não pergunta ao
    // consultor. Vazando, a tela pede que ele digite o que a Matriz já tem.
    const { campos } = detectar(BLOCO_COMPETENCIA, 'orgaosComCompetencia');
    expect(campos.filter((c) => c.startsWith('orgao.'))).toEqual([]);
    expect(campos.filter((c) => c.startsWith('competencia.'))).toEqual([]);

    const grade = detectar(BLOCO_GRADE);
    expect(grade.campos.filter((c) => c.includes('DaGrade') || c.startsWith('celula.'))).toEqual([]);
  });
});

describe('MOT-01 · o despacho conhece os tipos novos', () => {
  /*
   * A tela não chama o mapeador direto: ela chama `mapearRegistro`, que despacha
   * pelo tipo. Os três tipos entraram no vocabulário e não neste switch, e o
   * resultado foi o Conselho chegar VAZIO ao documento e a geração morrer em
   * "Placeholder não resolvido: {{conselhoAdministracao.artigo}}". Os testes de
   * unidade passavam porque chamavam o mapeador pelo nome.
   */
  it('o órgão passa pelo despacho e volta com os campos derivados', () => {
    const campos = mapearRegistro('orgaoGovernanca', {
      id: 'og1', nome: 'Conselho de Administração', genero: 'M',
      membros_minimo: 3, membros_maximo: 6, mandato_anos: 3,
    });
    expect(campos.nome).toBe('Conselho de Administração');
    expect(campos.artigo).toBe('o');
    expect(campos.membrosMinimoNumeral).toBe('03');
  });

  it('a competência e o acordo também', () => {
    const c = mapearRegistro('competenciaMatriz', {
      id: 'c1', atividade: 'Distribuição de Lucros', papeis: ['Valida'],
    });
    expect(c.atividade).toBe('Distribuição de Lucros');

    const a = mapearRegistro('acordoQuotistas', { clienteId: 'cli1', assinadoEm: '2025-09-29' });
    expect(a.jaAssinado).toBe('sim');
  });
});

describe('MOT-01 · os mapeadores entregam a frase que o contrato escreve', () => {
  it('o órgão sai com numeral e extenso lado a lado', () => {
    const campos = mapearOrgaoGovernanca({
      id: 'og1', nome: 'Conselho de Administração',
      membros_minimo: 3, membros_maximo: 6, mandato_anos: 3,
    });
    // "no mínimo 03 (três) e no máximo 06 (seis) membros" — Perci, cláusula 5ª.
    expect(campos.membrosMinimoNumeral).toBe('03');
    expect(campos.membrosMinimoExtenso).toBe('três');
    expect(campos.membrosMaximoNumeral).toBe('06');
    expect(campos.membrosMaximoExtenso).toBe('seis');
    expect(campos.membrosEmFaixa).toBe('sim');
    expect(campos.membrosFixo).toBe('');
  });

  it('a cláusula concorda com o gênero do órgão', () => {
    const conselho = mapearOrgaoGovernanca({ id: 'm', nome: 'Conselho de Administração', genero: 'M' });
    expect(conselho.artigo).toBe('o');
    // Começo de frase: "O Conselho de Administração será composto".
    expect(conselho.artigoMaiusculo).toBe('O');
    expect(conselho.ao).toBe('ao');
    expect(conselho.composto).toBe('composto');

    const diretoria = mapearOrgaoGovernanca({ id: 'f', nome: 'Diretoria Executiva', genero: 'F' });
    expect(diretoria.artigo).toBe('a');
    expect(diretoria.artigoMaiusculo).toBe('A');
    expect(diretoria.ao).toBe('à');
    expect(diretoria.composto).toBe('composta');
  });

  it('órgão sem gênero gravado concorda pelo nome, e não no masculino', () => {
    const diretoria = mapearOrgaoGovernanca({ id: 'f', nome: 'Diretoria Executiva', genero: null });
    expect(diretoria.pelo).toBe('pela');
    expect(diretoria.do).toBe('da');

    const conselho = mapearOrgaoGovernanca({ id: 'm', nome: 'Conselho de Administração' });
    expect(conselho.pelo).toBe('pelo');
  });

  it('mínimo igual ao máximo acende a frase curta do Horita', () => {
    const campos = mapearOrgaoGovernanca({
      id: 'og2', nome: 'Conselho de Administração',
      membros_minimo: 3, membros_maximo: 3, mandato_anos: 3,
    });
    expect(campos.membrosFixo).toBe('sim');
    expect(campos.membrosEmFaixa).toBe('');
  });

  it('sem cargos nomeados, acende a redação do Mattei', () => {
    const semCargos = mapearOrgaoGovernanca({ id: 'og3', nome: 'Diretoria' });
    expect(semCargos.semCargos).toBe('sim');
    expect(semCargos.temCargos).toBe('');

    // O Bela Vista nomeia os três, e a cláusula os lista em prosa.
    const comCargos = mapearOrgaoGovernanca({
      id: 'og4',
      nome: 'Diretoria',
      cargos_do_orgao: [
        'Diretor de Mercado e Finanças', 'Diretor Operações', 'Diretor de Sistema de Irrigação',
      ],
    });
    expect(comCargos.cargos).toBe(
      'Diretor de Mercado e Finanças, Diretor Operações e Diretor de Sistema de Irrigação',
    );
    expect(comCargos.temCargos).toBe('sim');
  });

  it('a data do acordo escolhe entre as duas redações do capítulo X', () => {
    const assinado = mapearAcordoQuotistas({ clienteId: 'c1', assinadoEm: '2025-09-29' });
    expect(assinado.jaAssinado).toBe('sim');
    expect(assinado.aindaNaoAssinado).toBe('');

    const naoAssinado = mapearAcordoQuotistas({ clienteId: 'c1' });
    expect(naoAssinado.jaAssinado).toBe('');
    expect(naoAssinado.aindaNaoAssinado).toBe('sim');
  });
});

describe('MOT-01 · a grade da Matriz sai como tabela com as colunas do cliente', () => {
  it('uma coluna por órgão, sem modelo por cliente', () => {
    const grade = [
      '| Decisão | {{#matrizOrgaos sep=""}}{{ orgaoDaGrade.nome }} | {{/matrizOrgaos}}',
      '| --- {{#matrizOrgaos sep=""}}| --- {{/matrizOrgaos}}|',
      '{{#matrizLinhas sep="\\n"}}| {{ linhaDaGrade.atividade }} | {{#celulas sep=""}}{{ celula.resumo }} | {{/celulas}}{{/matrizLinhas}}',
    ].join('\n');

    const contexto = {
      matrizOrgaos: [
        { orgaoDaGrade: { nome: 'Reunião de Sócios' } },
        { orgaoDaGrade: { nome: 'Conselho' } },
        { orgaoDaGrade: { nome: 'Diretoria' } },
      ],
      matrizLinhas: [{
        linhaDaGrade: { atividade: 'Distribuição de Lucros' },
        celulas: [
          { celula: { resumo: 'Delibera' } },
          { celula: { resumo: 'Valida' } },
          { celula: { resumo: 'Analisa' } },
        ],
      }],
    };

    const segmentos = segmentar(renderConteudo(grade, contexto).split('\n'));
    const tabela = segmentos.find((s) => s.tipo === 'tabela');
    expect(tabela, 'a grade não virou tabela').toBeDefined();
    if (tabela?.tipo !== 'tabela') return;
    expect(tabela.cabecalho).toEqual(['Decisão', 'Reunião de Sócios', 'Conselho', 'Diretoria']);
    expect(tabela.corpo).toEqual([['Distribuição de Lucros', 'Delibera', 'Valida', 'Analisa']]);
  });

  it('a célula da matriz chega pronta para a grade e solta para a alínea', () => {
    const campos = mapearCompetenciaMatriz({
      id: 'mc1',
      atividade: 'Distribuição de Lucros',
      papeis: ['Valida', 'Sugere'],
      papeisInfinitivo: ['Validar', 'Sugerir'],
      alcada: 'até R$ 100.000,00',
      sobePara: 'Reunião de Sócios',
      sobeParaAo: 'à',
      resumo: 'Valida, Sugere · até R$ 100.000,00 · sobe para Reunião de Sócios',
    });
    expect(campos.papeis).toBe('Valida e Sugere');
    // O documento gerado em 14/09 mostrou a alínea nascendo na terceira pessoa
    // ("Delibera Distribuição de Lucros"), e os sete contratos escrevem
    // infinitivo. Sem catálogo, cai no nome em vez de sair vazio.
    expect(campos.papeisInfinitivo).toBe('Validar e Sugerir');
    expect(campos.sobeParaAo).toBe('à');
    expect(campos.sobe).toBe('sim');
    expect(campos.temAlcada).toBe('sim');
    expect(campos.resumo).toContain('sobe para Reunião de Sócios');
  });
});

/*
 * O CADASTRO DO ACORDO CHEGANDO AO MOTOR (GOV-03, passo 1).
 *
 * Cada asserção aqui é uma frase de documento de verdade, e não a saída que eu
 * suporia. O defeito que este arquivo existe para pegar é o da MOT-01: campo
 * não declarado não dá erro, some do Word e ninguém vê.
 */
describe('GOV-03 · o motor conhece os parâmetros do acordo', () => {
  /*
   * CONDICIONAL APAGADA TEM DUAS FORMAS, e as duas são falsas no render.
   *
   * A que o mapeador escreve some do objeto: o `coletor` descarta string vazia,
   * então `set('naoConcorrencia', '')` não cria a chave. A DERIVADA fica, com
   * valor '', porque `derivarCampos` grava o retorno de `derivar`. Para a seção
   * {{#…}} dá no mesmo; para uma asserção, não, e é por isso que este auxiliar
   * existe em vez de um `toBe('')` que passaria a mentir conforme o campo.
   */
  const apagada = (v: unknown) => v === undefined || v === '';

  /** Um acordo completo, nos moldes do modelo da casa. */
  const COMPLETO = {
    clienteId: 'c1',
    assinadoEm: '2025-09-29',
    vigenciaAnos: 10,
    temRamos: true,
    reuniaoPreviaObrigatoria: true,
    objetosPreferencia: 'quotas, imóveis, máquinas e oportunidades de negócio',
    objetosPreferenciaChaves: ['quotas', 'imoveis', 'maquinas', 'oportunidades'],
    mecanismos: ['preferencia', 'lock_up', 'tag_along', 'drag_along', 'nao_concorrencia'],
    metodosAvaliacao: ['patrimonio_liquido', 'fluxo_de_caixa_descontado'],
    consolidaComposse: true,
    naoConcorrencia: true,
    naoConcorrenciaPrazoAnos: 3,
    naoConcorrenciaArea: 'em todos os estados do Brasil',
    naoConcorrenciaMulta: 'R$ 1.000.000,00 (um milhão de reais)',
    naoConcorrenciaAlcancaParentes: true,
    opcaoCompraPrevista: true,
    opcaoCompraQuem: 'os demais QUOTISTAS',
    opcaoVendaPrevista: false,
    jurosValorSubscrito: 'juros de 1% (um por cento) ao mês',
    solucaoLitigios: 'arbitragem',
    camaraArbitral: 'Câmara de Comércio Brasil Canadá',
    regimeNomeacaoArbitros: 'partes',
    representanteNome: 'LUIZ MARCELO',
    representanteGenero: 'M',
  };

  it('o par numeral+extenso escreve os prazos como o documento escreve', () => {
    const c = mapearAcordoQuotistas(COMPLETO);
    // Modelo: "em um período de 03 (três) anos".
    expect(`${c.naoConcorrenciaPrazoAnosNumeral} (${c.naoConcorrenciaPrazoAnosExtenso}) anos`)
      .toBe('03 (três) anos');
    // Utida: "permanecerá em vigor por um período de 10 (dez) anos".
    expect(`${c.vigenciaAnosNumeral} (${c.vigenciaAnosExtenso}) anos`).toBe('10 (dez) anos');
    // O sigilo saiu: zero cláusulas de sigilo nos sete acordos do acervo.
  });

  it('cada mecanismo marcado acende a sua condicional, e só ela', () => {
    const c = mapearAcordoQuotistas(COMPLETO);
    expect(c.temPreferencia).toBe('sim');
    expect(c.temLockUp).toBe('sim');
    expect(c.temTagAlong).toBe('sim');
    expect(c.temDragAlong).toBe('sim');
    // Não marcados: a cláusula não existe naquele documento.
    expect(c.temQuarentena).toBe('');
    expect(c.temUsufrutoComVoto).toBe('');
  });

  it('onde existe interruptor com detalhe, é ele que decide e não a marcação', () => {
    // O cadastro deixa marcar o mecanismo "nao_concorrencia" e desligar o
    // interruptor. Se a marcação vencesse, sairia o cabeçalho da cláusula com
    // prazo, área e multa em branco.
    const desencontrado = mapearAcordoQuotistas({
      ...COMPLETO, mecanismos: ['nao_concorrencia'], naoConcorrencia: false,
    });
    expect(apagada(desencontrado.naoConcorrencia)).toBe(true);
  });

  it('a lista de métodos manda no fluxo de caixa, e o booleano antigo ainda responde', () => {
    expect(mapearAcordoQuotistas(COMPLETO).usaFluxoDeCaixa).toBe('sim');
    expect(mapearAcordoQuotistas(COMPLETO).somentePatrimonioLiquido).toBe('');

    const soPatrimonio = mapearAcordoQuotistas({
      ...COMPLETO, metodosAvaliacao: ['patrimonio_liquido'],
    });
    expect(apagada(soPatrimonio.usaFluxoDeCaixa)).toBe(true);
    expect(soPatrimonio.somentePatrimonioLiquido).toBe('sim');

    // Sem lista, quem responde é o booleano de antes do cadastro.
    const legado = mapearAcordoQuotistas({ clienteId: 'c1', usaFluxoDeCaixa: true });
    expect(legado.usaFluxoDeCaixa).toBe('sim');
  });

  it('a preferência só passa da Cláusula Quinta quando há algo além das quotas', () => {
    expect(mapearAcordoQuotistas(COMPLETO).preferenciaAlemDasQuotas).toBe('sim');
    const soQuotas = mapearAcordoQuotistas({
      ...COMPLETO, objetosPreferenciaChaves: ['quotas'],
    });
    expect(soQuotas.preferenciaAlemDasQuotas).toBe('');
  });

  it('o tratamento do representante concorda com o gênero', () => {
    const c = mapearAcordoQuotistas(COMPLETO);
    // Modelo: "os QUOTISTAS elegem o Sr. LUIZ MARCELO como representante".
    expect(`os QUOTISTAS elegem o ${c.representanteTratamento} ${c.representanteNome}`)
      .toBe('os QUOTISTAS elegem o Sr. LUIZ MARCELO');
    expect(c.temRepresentante).toBe('sim');

    const ela = mapearAcordoQuotistas({
      ...COMPLETO, representanteNome: 'CRISTINA', representanteGenero: 'F',
    });
    expect(ela.representanteTratamento).toBe('Sra.');
  });

  it('quem escolhe os árbitros acende uma redação e apaga a outra', () => {
    // Em 5 dos 7 acordos, incluindo o modelo, as partes nomeiam; em 2 é a
    // câmara, "conforme o regulamento da CAM-CCBCC".
    const partes = mapearAcordoQuotistas(COMPLETO);
    expect(partes.arbitrosPelasPartes).toBe('sim');
    expect(partes.arbitrosPelaCamara).toBe('');

    const camara = mapearAcordoQuotistas({ ...COMPLETO, regimeNomeacaoArbitros: 'camara' });
    expect(camara.arbitrosPelasPartes).toBe('');
    expect(camara.arbitrosPelaCamara).toBe('sim');
  });

  it('a solução de litígios acende uma redação e apaga a outra', () => {
    const arbitral = mapearAcordoQuotistas(COMPLETO);
    expect(arbitral.porArbitragem).toBe('sim');
    expect(arbitral.porJudicial).toBe('');

    const juizo = mapearAcordoQuotistas({ ...COMPLETO, solucaoLitigios: 'judicial' });
    expect(juizo.porArbitragem).toBe('');
    expect(juizo.porJudicial).toBe('sim');
  });

  it('acordo enxuto não acende cláusula nenhuma que não tenha', () => {
    // A Utida não tem reunião prévia; Perci, Mattei e Zamo não têm fluxo de
    // caixa; e há acordo sem sigilo e sem opção de compra. O documento desses
    // clientes tem de sair sem os cabeçalhos correspondentes.
    const c = mapearAcordoQuotistas({ clienteId: 'c1' });
    for (const campo of [
      'reuniaoPreviaObrigatoria', 'temRamos',
      'naoConcorrencia', 'opcaoCompraPrevista', 'opcaoVendaPrevista', 'temRepresentante',
      'porArbitragem', 'porJudicial', 'temLockUp', 'temTagAlong', 'temDragAlong',
      'preferenciaAlemDasQuotas', 'usaFluxoDeCaixa', 'consolidaComposse',
    ]) {
      expect(apagada(c[campo]), `${campo} acendeu numa entrada vazia`).toBe(true);
    }
    // As duas que DEVEM acender: são o outro lado de uma pergunta não respondida.
    expect(c.semReuniaoPrevia).toBe('sim');
    expect(c.somentePatrimonioLiquido).toBe('sim');
  });

  it('todo placeholder do modelo existe na entidade', () => {
    /*
     * ATENÇÃO AO QUE `desconhecidos` NÃO PEGA.
     *
     * Ele só verifica o PAPEL antes do ponto: `{{ acordo.campoQueNaoExiste }}`
     * passa limpo por ele, porque "acordo" é papel conhecido. Quem confere o
     * nome do campo é `condicionalDeBinding`, e só para SEÇÃO — um
     * `{{#acordo.temLockDown}}` cai em `secoesDesconhecidas`, mas um
     * `{{ acordo.multaDoLockUp }}` solto não cai em lugar nenhum: resolve ''
     * e a frase sai truncada no Word entregue.
     *
     * Por isso este teste faz as três conferências, e não só a primeira.
     */
    const modelo = [
      '{{#acordo.jaAssinado}}firmaram em {{ acordo.assinadoEmExtenso }}, com vigência de',
      '{{ acordo.vigenciaAnosNumeral }} ({{ acordo.vigenciaAnosExtenso }}) anos{{/acordo.jaAssinado}}.',
      '{{#acordo.temSociedadesRelacionadas}}e das SOCIEDADES RELACIONADAS{{/acordo.temSociedadesRelacionadas}}',
      '{{#acordo.temRamos}}Cada ramo vota como bloco único.{{/acordo.temRamos}}',
      '{{#acordo.reuniaoPreviaObrigatoria}}As deliberações constituirão Acordos de Voto.{{/acordo.reuniaoPreviaObrigatoria}}',
      '{{#acordo.semReuniaoPrevia}}Sem reunião prévia.{{/acordo.semReuniaoPrevia}}',
      'A preferência é sobre {{ acordo.objetosPreferencia }}.',
      '{{#acordo.preferenciaAlemDasQuotas}}Cláusula Décima.{{/acordo.preferenciaAlemDasQuotas}}',
      '{{#acordo.temLockUp}}lock-up{{/acordo.temLockUp}}{{#acordo.temTagAlong}}tag along{{/acordo.temTagAlong}}',
      '{{#acordo.temDragAlong}}drag along{{/acordo.temDragAlong}}{{#acordo.temQuarentena}}quarentena{{/acordo.temQuarentena}}',
      '{{#acordo.temPreferencia}}preferência{{/acordo.temPreferencia}}{{#acordo.temUsufrutoComVoto}}usufruto{{/acordo.temUsufrutoComVoto}}',
      '{{#acordo.usaFluxoDeCaixa}}fluxo de caixa descontado{{/acordo.usaFluxoDeCaixa}}',
      '{{#acordo.somentePatrimonioLiquido}}só patrimônio líquido{{/acordo.somentePatrimonioLiquido}}',
      '{{#acordo.usaDuplaAvaliacao}}dupla avaliação{{/acordo.usaDuplaAvaliacao}}',
      '{{#acordo.consolidaComposse}}inclusive através de parceria rural{{/acordo.consolidaComposse}}',
      '{{#acordo.naoConcorrencia}}por {{ acordo.naoConcorrenciaPrazoAnosNumeral }}',
      '({{ acordo.naoConcorrenciaPrazoAnosExtenso }}) anos {{ acordo.naoConcorrenciaArea }},',
      'sob multa de {{ acordo.naoConcorrenciaMulta }}{{/acordo.naoConcorrencia}}',
      '{{#acordo.naoConcorrenciaAlcancaParentes}}e suas PARTES RELACIONADAS{{/acordo.naoConcorrenciaAlcancaParentes}}',
      '{{#acordo.opcaoCompraPrevista}}{{ acordo.opcaoCompraQuem }} por',
      '{{ acordo.opcaoCompraQuem }}{{/acordo.opcaoCompraPrevista}}',
      '{{#acordo.opcaoVendaPrevista}}opção de venda{{/acordo.opcaoVendaPrevista}}',
      'acrescido de {{ acordo.jurosValorSubscrito }}.',
      '{{#acordo.porArbitragem}}Regras de Arbitragem da {{ acordo.camaraArbitral }}{{/acordo.porArbitragem}}',
      '{{#acordo.porJudicial}}foro da comarca{{/acordo.porJudicial}}',
      '{{#acordo.temRepresentante}}elegem o {{ acordo.representanteTratamento }}',
      '{{ acordo.representanteNome }}{{/acordo.temRepresentante}}',
    ].join('\n');

    const deteccao = detectarBindingsDeConteudo(modelo);
    expect(deteccao.desconhecidos, 'placeholder sem papel some do Word sem avisar').toEqual([]);
    expect(deteccao.secoesDesconhecidas, 'condicional sem campo na entidade').toEqual([]);

    const conhecidos = new Set(camposDaEntidade('acordoQuotistas').map((c) => c.id));
    const usados = [...modelo.matchAll(/\{\{#?\s*acordo\.([A-Za-z0-9_]+)/g)]
      .map((m) => m[1]);
    expect(usados.length, 'o modelo do teste deixou de exercitar os campos').toBeGreaterThan(30);
    expect(usados.filter((c) => !conhecidos.has(c))).toEqual([]);
  });

  it('o teste acima pegaria um campo inventado', () => {
    // A rede só vale se ela prende. Sem esta prova, a asserção de cima passaria
    // igual se `camposDaEntidade` devolvesse qualquer coisa.
    const ruim = '{{ acordo.multaDoLockUp }} e {{#acordo.temLockDown}}x{{/acordo.temLockDown}}';
    const conhecidos = new Set(camposDaEntidade('acordoQuotistas').map((c) => c.id));
    const usados = [...ruim.matchAll(/\{\{#?\s*acordo\.([A-Za-z0-9_]+)/g)].map((m) => m[1]);

    expect(usados.filter((c) => !conhecidos.has(c))).toEqual(['multaDoLockUp', 'temLockDown']);
    // E o que o motor sozinho enxerga: a seção, sim; o placeholder solto, não.
    const deteccao = detectarBindingsDeConteudo(ruim);
    expect(deteccao.secoesDesconhecidas).toEqual(['acordo.temLockDown']);
    expect(deteccao.desconhecidos).toEqual([]);
  });
});

/*
 * AS CINCO LISTAS DO ACORDO (GOV-03, passo 2).
 *
 * Seção de lista não declarada é o pior dos silêncios do motor: o render não
 * acha o papel, o trecho inteiro some, e o Word sai sem a cláusula. Foi assim
 * que a MOT-01 perdeu as competências na primeira geração.
 */
describe('GOV-03 · as listas do Acordo', () => {
  const MODELO_LISTAS = [
    'São signatários deste ACORDO:',
    '{{#quotistasSignatarios sep="; " fim="; e "}}{{ quotista.nome }}{{/quotistasSignatarios}}.',
    '',
    'O ACORDO alcança as SOCIEDADES RELACIONADAS:',
    '',
    'Os QUOTISTAS dividem-se em:',
    '{{#ramosFamiliares sep="; e "}}({{ ramo.alinea }}) {{ ramo.rotulo }}, {{ ramo.definicao }}',
    '{{/ramosFamiliares}}.',
    '',
    'Prevalecerão os seguintes quóruns de deliberação:',
    '{{#quorunsDoAcordo sep="\n"}}{{ quorum.alinea }}) Conforme decidam {{ quorum.expressao }}',
    'em relação a {{ quorum.materia }};{{/quorunsDoAcordo}}',
  ].join('\n');

  it('as três seções são papéis conhecidos', () => {
    const deteccao = detectarBindingsDeConteudo(MODELO_LISTAS);
    expect(deteccao.secoesDesconhecidas, 'seção sem papel some do Word inteira').toEqual([]);
    expect(deteccao.listas.map((l) => l.nome).sort()).toEqual([
      'quorunsDoAcordo', 'quotistasSignatarios',
      'ramosFamiliares',
    ]);
  });

  it('todo campo de item usado está declarado no papel da lista', () => {
    // O campo do item NÃO é conferido pelo motor: `{{ quorum.expressaum }}`
    // resolve '' e a alínea sai truncada. Quem confere é esta asserção.
    const porItem: Record<string, string> = {
      quotista: 'quotistasSignatarios',
      ramo: 'ramosFamiliares',
      quorum: 'quorunsDoAcordo',
    };
    /*
     * As três listas novas NÃO herdam campo da entidade.
     *
     * O `tipo` delas aponta para `acordoQuotistas` só porque um papel de lista
     * precisa de um; uma linha de quórum não é entidade do vocabulário. Aceitar
     * os 51 campos do acordo como campos do item deixaria passar
     * `{{ quorum.vigenciaAnos }}`, que resolve '' e trunca a alínea. Para elas,
     * só vale o que está em `camposExtras`.
     */
    const herdaDaEntidade = ['quotistasSignatarios'];
    const faltando: string[] = [];
    for (const [item, lista] of Object.entries(porItem)) {
      const papel = PAPEIS_LISTA[lista];
      const extras = new Set(papel.camposExtras.map((c) => c.id));
      const daEntidade = new Set(
        herdaDaEntidade.includes(lista) ? camposDaEntidade(papel.tipo).map((c) => c.id) : [],
      );
      const usados = [...MODELO_LISTAS.matchAll(new RegExp(`\\{\\{\\s*${item}\\.([A-Za-z0-9_]+)`, 'g'))]
        .map((m) => m[1]);
      for (const campo of usados) {
        if (!extras.has(campo) && !daEntidade.has(campo)) faltando.push(`${item}.${campo}`);
      }
    }
    expect(faltando).toEqual([]);
  });

  it('as três saem do cadastro do acordo, e não de escolha na tela', () => {
    // Enquanto fossem `selecao`, a tela Gerar pediria para escolher de novo o
    // que o cadastro já tem. Conferido em 15/09: nenhum bloco do sandbox usava
    // as duas que existiam antes, então a troca não reescreve documento nenhum.
    for (const nome of [
      'quotistasSignatarios', 'ramosFamiliares', 'quorunsDoAcordo',
    ]) {
      expect(PAPEIS_LISTA[nome].fonte, `${nome} saindo da fonte errada`).toBe('acordo_quotistas');
    }
  });

  it('a definição dos ramos sai igual à do acordo da AgroAliança', () => {
    /*
     * A prova de que o campo não INVENTA nada: o texto montado tem de sair
     * igual ao do documento real, palavra por palavra. Se sair diferente, ou o
     * campo está errado ou o acordo não precisava dele.
     */
    const contexto = {
      ...mapearAcordoQuotistas({ clienteId: 'c1', temRamos: true, quantosRamos: 2 }),
      acordo: mapearAcordoQuotistas({ clienteId: 'c1', temRamos: true, quantosRamos: 2 }),
      sociedade: { nomeCurto: 'ALIANÇA' },
      ramosFamiliares: [
        { ramo: { alinea: 'a', rotulo: 'DESCENDENTES DE CRISTINA',
          definicao: 'formado por CRISTINA e seus descendentes em linha vertical' } },
        { ramo: { alinea: 'b', rotulo: 'DESCENDENTES DE REGINA',
          definicao: 'formado por REGINA e seus descendentes em linha vertical' } },
      ],
    };
    const modelo = '{{#acordo.temRamos}}DESCENDENTES DAS QUOTISTAS: os '
      + '{{ acordo.quantosRamosExtenso }} grupos de descendentes em linha vertical das '
      + 'QUOTISTAS que compõem ou poderão compor o quadro societário da '
      + '{{ sociedade.nomeCurto }}, assim definidos: '
      + '{{#ramosFamiliares sep="; e "}}({{ ramo.alinea }}) {{ ramo.rotulo }}, '
      + '{{ ramo.definicao }}{{/ramosFamiliares}}.{{/acordo.temRamos}}';

    // AgroAliança, 1.1.7, literal.
    expect(renderConteudo(modelo, contexto)).toBe(
      'DESCENDENTES DAS QUOTISTAS: os dois grupos de descendentes em linha vertical das '
      + 'QUOTISTAS que compõem ou poderão compor o quadro societário da ALIANÇA, assim '
      + 'definidos: (a) DESCENDENTES DE CRISTINA, formado por CRISTINA e seus descendentes '
      + 'em linha vertical; e (b) DESCENDENTES DE REGINA, formado por REGINA e seus '
      + 'descendentes em linha vertical.',
    );
  });

  it('sem ramos, a definição inteira não existe no documento', () => {
    const modelo = '{{#acordo.temRamos}}DESCENDENTES DAS QUOTISTAS: …{{/acordo.temRamos}}';
    const semRamos = mapearAcordoQuotistas({ clienteId: 'c1' });
    expect(renderConteudo(modelo, { acordo: semRamos })).toBe('');
  });

  it('NENHUMA condicional do acordo derruba o render quando está desligada', () => {
    /*
     * A CATRACA DESTE ARQUIVO.
     *
     * Condicional ausente do contexto nao some calada: `renderConteudo` levanta
     * "Seção não resolvida" e o documento inteiro deixa de sair. Foi o que
     * aconteceu com `temRamos`, porque o `coletor` descarta string vazia e a
     * condicional desligada e exatamente string vazia.
     *
     * Um acordo vazio e o pior caso de proposito: e o cliente que nao tem ramo,
     * nem sigilo, nem opcao de compra, que sao 6 dos 7 do acervo.
     */
    const vazio = mapearAcordoQuotistas({ clienteId: 'c1' });
    const condicionais = camposDaEntidade('acordoQuotistas')
      .filter((c) => c.label.includes('(condicional)'))
      .map((c) => c.id);

    expect(condicionais.length, 'a entidade perdeu as condicionais').toBeGreaterThan(15);
    const quebraram: string[] = [];
    for (const campo of condicionais) {
      const modelo = `{{#acordo.${campo}}}x{{/acordo.${campo}}}`;
      try {
        renderConteudo(modelo, { acordo: vazio });
      } catch {
        quebraram.push(campo);
      }
    }
    expect(quebraram, 'condicional ausente do contexto derruba o documento inteiro').toEqual([]);
  });

  it('a lista escreve as alíneas de quórum como o modelo escreve', () => {
    const contexto = {
      quorunsDoAcordo: [
        { quorum: { alinea: 'a', expressao: '75% (setenta e cinco por cento) dos presentes',
          materia: 'Alterar o contrato social' } },
        { quorum: { alinea: 'b', expressao: 'todos os quotistas',
          materia: 'Nomear administrador não sócio' } },
      ],
    };
    const modelo = '{{#quorunsDoAcordo sep="\n"}}{{ quorum.alinea }}) Conforme decidam '
      + '{{ quorum.expressao }} em relação a {{ quorum.materia }};{{/quorunsDoAcordo}}';

    // Modelo da casa: "a) Conforme decidam 75% (setenta e cinco por cento) dos
    // VOTOS dos QUOTISTAS presentes [...] em relação aos seguintes assuntos:
    // alteração do contrato social".
    expect(renderConteudo(modelo, contexto)).toBe(
      'a) Conforme decidam 75% (setenta e cinco por cento) dos presentes em relação a '
      + 'Alterar o contrato social;\n'
      + 'b) Conforme decidam todos os quotistas em relação a Nomear administrador não sócio;',
    );
  });
});
