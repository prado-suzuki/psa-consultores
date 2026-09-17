/*
 * A GERAÇÃO DO ACORDO INTEIRO, os 266 blocos de uma vez.
 *
 * A tela travou na primeira geração de verdade. Este teste reproduz o caminho
 * sem navegador: monta o template com os blocos carregados, passa o contexto que
 * o controller passaria, e gera. É onde o erro tem de aparecer.
 */
import { describe, expect, it } from 'vitest';

import blocosDoAcordo from '../../../docs/osg/acordo-blocos.json';
import { camposDoAcordo, listasDoAcordo, type EntradaAcordo } from './contextoAcordo';
import { detectarBindingsDeConteudo } from './binding';
import { gerarBlocos, gerarDocumento } from './index';
import { CAMPOS_MANUAIS, camposDaEntidade } from './vocabulario';
import { montarDocx } from './docx';
import type { Bloco, Template, TipoBloco } from './types';

interface BlocoDoArquivo {
  nome: string; tipo: string; titulo: string | null; conteudo: string; flags?: string[];
}

const blocos: Bloco[] = (blocosDoAcordo as BlocoDoArquivo[]).map((b, i) => ({
  id: `b${i}`,
  tipo: b.tipo as TipoBloco,
  tituloDocumento: b.titulo ?? undefined,
  conteudo: b.conteudo,
  obrigatorio: true,
  flagsRequeridas: b.flags,
}));

const template: Template = { id: 'acordo', nome: 'Acordo de Quotistas', blocos };

/**
 * O contexto como a tela monta: os campos do acordo, a sociedade, as listas, e
 * os CAMPOS LIVRES com '' quando ninguém digitou — que é o que a tela faz em
 * `livresFonte[ph] ?? ''`. Sem eles o render levanta, porque placeholder
 * ausente não é o mesmo que placeholder vazio.
 */
const contextoDe = (e: EntradaAcordo) => ({
  acordo: camposDoAcordo(e),
  /*
   * A QUALIFICAÇÃO INTEIRA, e não só a razão social: o preâmbulo do Acordo
   * qualifica a INTERVENIENTE ANUENTE como o contrato social qualifica a
   * sociedade. Os quatro campos abaixo saem de `mapearSociedade` no caminho de
   * verdade; aqui entram à mão porque montar uma `PessoaRow` inteira só para
   * isto esconderia o que o teste está medindo.
   */
  sociedade: {
    razaoSocial: 'ABACAXI ELÉTRICO MINERAÇÃO E BALÉ S.A.',
    cnpj: '11.222.333/0001-81',
    nire: '41200000001',
    juntaUfComPreposicao: 'do Paraná',
    sede: 'Rua das Araucárias, n.º 300, no município de Curitiba, Estado do Paraná',
    sedeMunicipio: 'Curitiba',
    sedeUfComPreposicao: 'do Paraná',
    nomeFantasia: 'ABACAXI',
    sedeUf: 'PR',
  },
  dataAssinatura: '',
  testemunha1Nome: '', testemunha1Rg: '', testemunha1Cpf: '',
  testemunha2Nome: '', testemunha2Rg: '', testemunha2Cpf: '',
  /*
   * `administradores` vem da EMPRESA, e nao do acordo: e a lista que o
   * contrato social ja usa no preambulo, e o Acordo a reaproveita para dizer
   * quem representa a sociedade no ato. Aqui ela entra a mao; na tela, quem a
   * carrega e o controller, a partir da empresa escolhida.
   */
  administradores: [
    { administrador: { nome: 'SÉRGIO IGLESIAS' } },
  ],
  ...listasDoAcordo(e),
});

/** Um acordo cheio, como o cadastro entrega. */
const ENTRADA: EntradaAcordo = {
  acordo: {
    clienteId: 'c1',
    vigenciaAnos: 20,
    naoConcorrenciaPrazoAnos: 3,
    naoConcorrenciaMulta: 'R$ 1.000.000,00 (um milhão de reais)',
    jurosValorSubscrito: 'juros de 1% (um por cento) ao mês',
    camaraArbitral: 'Câmara de Comércio Brasil Canadá',
    representanteNome: 'LUIZ MARCELO',
    representanteGenero: 'M',
    foroEleitoComarca: 'Cuiabá',
    foroEleitoEstado: 'Mato Grosso',
  },
  quoruns: [],
  ramos: [],
  ordemPreferencia: [],
  signatarios: [],
};

describe('a geração do Acordo de ponta a ponta', () => {
  it('gera o documento inteiro sem levantar', () => {
    const saida = gerarDocumento(template, contextoDe(ENTRADA));
    expect(saida.length).toBeGreaterThan(1000);
    // O cliente do documento, e nunca o do modelo.
    expect(saida).not.toContain('DUAL');
    expect(saida).toContain('ABACAXI');
  });

  it('nenhum dado de identidade fica escrito no texto dos blocos', () => {
    /*
     * A CATRACA DO CLIENTE ERRADO, e ela mede a IDENTIDADE, não o nome.
     *
     * Trocar "DUAL" pelo placeholder deixou para trás o CNPJ, o NIRE e o
     * endereço da mesma empresa, na qualificação da INTERVENIENTE ANUENTE, e
     * mais o foro de outra cidade. Nome errado uma pessoa nota; CNPJ errado
     * atravessa a revisão e chega assinado.
     *
     * Mede a SAÍDA, e não os blocos: título de cláusula não está no `conteudo`,
     * e foi por aí que sete deles escaparam da primeira varredura.
     *
     * O que pode ficar escrito é o que não é de cliente nenhum: a mediadora
     * PRADO SUZUKI é a firma do próprio escritório, nomeada nos 4 acordos do
     * acervo que nomeiam mediadora, sempre com o mesmo CNPJ.
     */
    const saida = gerarDocumento(template, contextoDe(ENTRADA));
    const semAMediadora = saida.replace('37.465.705/0001-04', '');

    expect(semAMediadora.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g) ?? [])
      .toEqual(['11.222.333/0001-81']);          // só o CNPJ que veio do contexto
    expect(saida.match(/\b\d{11}\b/g) ?? []).toEqual(['41200000001']); // só o NIRE dele
    expect(saida).not.toContain('Campo Novo do Parecis');              // foro do modelo
    expect(saida).not.toContain('Limoeiro');                           // sede do modelo
  });
});

describe('os quoruns, cada um na frase que o modelo escreve para ele', () => {
  /*
   * NAO SAO SETE ALINEAS DE UMA LISTA, e supor isso teria produzido documento
   * errado. Cruzado com o modelo, linha a linha: quatro viram alineas da escada
   * do voto, o aumento de capital sai na Clausula Quarta, a reuniao previa na
   * Vigesima Quarta, e a instalacao nao aparece no Acordo (e do contrato
   * social). Um laco escreveria os sete em fila num lugar so.
   */
  const COM_QUORUM: EntradaAcordo = {
    ...ENTRADA,
    quoruns: [
      { chave: 'instalacao', materia: 'Para a reunião de sócios poder começar', ordem: 0,
        expressao: '80% do capital social', quantidade: '80% (oitenta por cento)',
        quantidadeEmFracao: '80% (oitenta por cento)' },
      { chave: 'ordinaria', materia: 'Assunto comum', ordem: 1,
        expressao: 'a maioria dos presentes', quantidade: 'a maioria',
        quantidadeEmFracao: 'a maioria' },
      { chave: 'alterar_contrato_social', materia: 'Alterar o contrato social', ordem: 2,
        expressao: '75% dos presentes', quantidade: '75% (setenta e cinco por cento)',
        quantidadeEmFracao: '¾ (três quartos)' },
      { chave: 'nomear_administrador_nao_socio', materia: 'Nomear administrador', ordem: 3,
        expressao: '2/3 dos presentes', quantidade: '2/3 (dois terços)',
        quantidadeEmFracao: '2/3 (dois terços)' },
      { chave: 'destituir_administrador', materia: 'Destituir administrador', ordem: 4,
        expressao: 'a maioria dos presentes', quantidade: 'a maioria',
        quantidadeEmFracao: 'a maioria' },
      { chave: 'aumento_de_capital', materia: 'Aumento de capital', ordem: 5,
        expressao: '75% do capital', quantidade: '75% (setenta e cinco por cento)',
        quantidadeEmFracao: '¾ (três quartos)' },
      { chave: 'reuniao_previa', materia: 'Reunião prévia', ordem: 6,
        expressao: 'a maioria do capital', quantidade: 'a maioria',
        quantidadeEmFracao: 'a maioria' },
    ],
  };

  it('cada quorum sai no lugar dele, e a base fica com as palavras da clausula', () => {
    /*
     * COM A FLAG DA REUNIAO PREVIA: o quorum dela mora na Clausula Vigesima
     * Quarta, que o mecanismo governa. Sem a flag a clausula nao entra, e o
     * teste procuraria uma frase que o documento nao tem por outro motivo.
     */
    const texto = gerarDocumento(
      template, contextoDe(COM_QUORUM), ['acordo_reuniao_previa_obrigatoria'],
    );
    // A escada do voto: a quantidade entra, a base do modelo permanece.
    expect(texto).toContain(
      'Conforme decidam 75% (setenta e cinco por cento) dos VOTOS dos QUOTISTAS presentes',
    );
    expect(texto).toContain('Conforme decidam 2/3 (dois terços) dos VOTOS');
    expect(texto).toContain('Conforme decidam a maioria dos VOTOS');
    // Fora da escada, e o aumento de capital escreve a FRACAO dos mesmos 75%.
    expect(texto).toContain('QUOTISTAS que representem ¾ (três quartos) das QUOTAS');
    expect(texto).toContain('no mínimo, a maioria das QUOTAS');
  });

  it('trocar o numero no cadastro troca o numero no documento', () => {
    const outro = {
      ...COM_QUORUM,
      quoruns: COM_QUORUM.quoruns.map((q) => (q.chave === 'alterar_contrato_social'
        ? { ...q, quantidade: '90% (noventa por cento)' } : q)),
    };
    const texto = gerarDocumento(template, contextoDe(outro));
    expect(texto).toContain('Conforme decidam 90% (noventa por cento) dos VOTOS');
    expect(texto).not.toContain('Conforme decidam 75% (setenta e cinco por cento)');
  });

  it('a INSTALACAO nao sai no Acordo, porque a clausula dela e do contrato social', () => {
    const texto = gerarDocumento(template, contextoDe(COM_QUORUM));
    expect(texto).not.toContain('80% (oitenta por cento)');
  });

  it('e o caso de unanimidade da lei fica escrito, porque nao e escolha do cliente', () => {
    /*
     * "todos os QUOTISTAS caso o capital nao esteja totalmente integralizado" e o
     * art. 1.061 do Codigo Civil. O cadastro tem UMA linha para administrador nao
     * socio, e ela e a do capital integralizado, que e a que varia.
     */
    const texto = gerarDocumento(template, contextoDe(COM_QUORUM));
    expect(texto).toContain('Conforme decidam todos os QUOTISTAS caso deseje-se designar');
  });
});

describe('os campos que tiram PEDACO de frase, e nao o bloco', () => {
  /*
   * Tres campos do cadastro nao cabiam em flag, porque o que sai e um trecho e
   * nao o bloco inteiro. Viraram secao condicional dentro do proprio bloco.
   */
  /*
   * COM AS FLAGS LIGADAS: dois dos tres blocos moram em clausula que um
   * mecanismo governa (a nao concorrencia e a arbitragem). Sem elas o teste
   * procuraria frase que o documento nao tem por outro motivo.
   */
  const TODAS_AS_FLAGS = [
    'acordo_nao_concorrencia', 'acordo_por_arbitragem', 'acordo_consolida_composse',
  ];
  const ligado = (extra: Partial<EntradaAcordo['acordo']>) => gerarDocumento(
    template,
    contextoDe({ ...ENTRADA, acordo: { ...ENTRADA.acordo, ...extra } }),
    TODAS_AS_FLAGS,
  );

  it('so o patrimonio liquido tira o fluxo de caixa, e mantem a definicao', () => {
    const doisMetodos = ligado({ metodosAvaliacao: ['patrimonio_liquido', 'fluxo_de_caixa_descontado'] });
    const soPatrimonio = ligado({ metodosAvaliacao: ['patrimonio_liquido'] });
    expect(doisMetodos).toContain('fluxo de caixa projetado');
    expect(doisMetodos).toContain('WACC');
    expect(soPatrimonio).not.toContain('fluxo de caixa projetado');
    expect(soPatrimonio).not.toContain('WACC');
    // A definicao de VALOR DA QUOTA e o patrimonio liquido continuam nos dois.
    expect(soPatrimonio).toContain('o valor do patrimônio líquido apurado em balanço');
  });

  it('a nao concorrencia alcanca parentes so quando o cadastro diz', () => {
    const com = ligado({ naoConcorrencia: true, naoConcorrenciaAlcancaParentes: true });
    const sem = ligado({ naoConcorrencia: true, naoConcorrenciaAlcancaParentes: false });
    expect(com).toContain('qualquer QUOTISTA, seus descendentes, cônjuges e/ou companheiros(as), realizar');
    expect(sem).toContain('qualquer QUOTISTA, realizar');
    expect(sem).not.toContain('seus descendentes, cônjuges e/ou companheiros(as), realizar');
  });

  it('o regime dos arbitros escreve a redacao escolhida, e nao sempre a primeira', () => {
    /*
     * O modelo so trazia a primeira, medida em 5 dos 7 acordos. Quem escolhesse
     * a segunda recebia um documento dizendo o contrario do cadastro.
     */
    const partes = ligado({ regimeNomeacaoArbitros: 'partes' });
    const camara = ligado({ regimeNomeacaoArbitros: 'camara' });
    expect(partes).toContain('sendo um nomeado pelo reclamante');
    expect(partes).not.toContain('conforme o regulamento');
    expect(camara).toContain('conforme o regulamento da Câmara de Comércio Brasil Canadá');
    expect(camara).not.toContain('sendo um nomeado pelo reclamante');
    // Os tres arbitros sao lei da casa e ficam nos dois.
    expect(partes).toContain('o número de árbitros será de 03 (três)');
    expect(camara).toContain('o número de árbitros será de 03 (três)');
  });
});

describe('a concordancia de quem representa os quotistas', () => {
  /*
   * A clausula saia "os QUOTISTAS elegem o Sra. Ana Zamo": o tratamento
   * concordava e o artigo antes dele, nao, porque estava escrito fixo no bloco.
   * Foi a comparacao do gerado contra o modelo que mostrou.
   *
   * O SUBSTITUTO saiu em 17/09: a consultoria disse que nao se aplica, e a
   * propria clausula ja resolve a falta em REUNIAO DE QUOTISTAS.
   */
  const comGenero = (g: string) => gerarDocumento(template, contextoDe({
    ...ENTRADA,
    acordo: {
      ...ENTRADA.acordo,
      representanteNome: 'ANA ZAMO', representanteGenero: g,
    },
  }));

  it('mulher recebe "a Sra." e homem "o Sr."', () => {
    expect(comGenero('F')).toContain('elegem a Sra. ANA ZAMO');
    expect(comGenero('M')).toContain('elegem o Sr. ANA ZAMO');
  });

});

describe('os objetos da preferencia, um bloco por objeto', () => {
  /*
   * QUASE DERRUBEI ESTE CAMPO por achar que o modelo nao enumerava os objetos.
   * Enumera, em prosa espalhada, e o titulo da Clausula Decima denuncia: "Do
   * direito de preferencia caso ocorra venda de SOCIEDADES RELACIONADAS, de
   * imoveis ou oportunidades de negocios".
   */
  const OBJETOS = [
    'acordo_tem_preferencia', 'acordo_preferencia_sobre_imoveis',
    'acordo_preferencia_sobre_participacoes', 'acordo_preferencia_sobre_oportunidades',
  ];

  it('cada objeto marcado traz o trecho dele, e so ele', () => {
    const tudo = gerarDocumento(template, contextoDe(ENTRADA), OBJETOS);
    expect(tudo).toContain('alienar a sua participação em qualquer uma das SOCIEDADES RELACIONADAS');
    expect(tudo).toContain('alienação de bens imóveis');
    expect(tudo).toContain('Todas as oportunidades de negócios');

    const soQuotas = gerarDocumento(template, contextoDe(ENTRADA), ['acordo_tem_preferencia']);
    expect(soQuotas).not.toContain('alienar a sua participação em qualquer uma das SOCIEDADES');
    expect(soQuotas).not.toContain('alienação de bens imóveis');
    expect(soQuotas).not.toContain('Todas as oportunidades de negócios');
    // E a Clausula Quinta, que trata das QUOTAS, continua de pe.
    expect(soQuotas).toContain('DIREITO DE PREFERÊNCIA');
  });

  it('sem participacoes saem os cinco blocos, mas a clausula fica pelos imoveis', () => {
    /*
     * A Clausula Decima hospeda DOIS objetos: as sociedades relacionadas nos
     * cinco primeiros blocos e os imoveis no ultimo. Tirar um nao leva a
     * clausula, porque o outro continua morando la. Ela so cai quando os dois
     * saem, e ai `clausulasSemCorpo` cuida do cabecalho.
     */
    const sem = gerarDocumento(
      template, contextoDe(ENTRADA),
      OBJETOS.filter((f) => f !== 'acordo_preferencia_sobre_participacoes'),
    );
    expect(sem).not.toContain('alienar a sua participação em qualquer uma das SOCIEDADES');
    expect(sem).toContain('alienação de bens imóveis');

    const nenhumDosDois = gerarDocumento(
      template, contextoDe(ENTRADA),
      ['acordo_tem_preferencia', 'acordo_preferencia_sobre_oportunidades'],
    );
    expect(nenhumDosDois).not.toContain('caso ocorra venda de SOCIEDADES RELACIONADAS');
  });
});

describe('os mecanismos que DESLIGAM texto', () => {
  /*
   * ATE HOJE NENHUMA RESPOSTA DO CADASTRO TIRAVA CLAUSULA DO DOCUMENTO.
   *
   * O motor sempre soube: `comporBlocos` descarta bloco cuja flag exigida nao
   * esta ativa. Faltavam as duas pontas. De um lado, os 266 blocos entraram sem
   * flag nenhuma. Do outro, `avaliarFlags` so recebia a EMPRESA como fonte, e
   * nenhum campo do acordo chegava ate ela.
   *
   * O MAPA NAO SAI DO TITULO DA CLAUSULA. A Clausula Sexta se chama "(Lock-up)"
   * e o corpo dela tem tres mecanismos: um item de lock-up, quatro de tag along
   * e oito de drag along. Foi preciso ler os 266.
   */
  const TODAS = [
    'acordo_nao_concorrencia', 'acordo_tem_lock_up', 'acordo_tem_tag_along',
    'acordo_tem_drag_along', 'acordo_opcao_venda_prevista',
    'acordo_opcao_compra_prevista', 'acordo_tem_preferencia',
    'acordo_reuniao_previa_obrigatoria', 'acordo_por_arbitragem',
    'acordo_consolida_composse', 'acordo_preferencia_sobre_imoveis',
    'acordo_preferencia_sobre_participacoes', 'acordo_preferencia_sobre_oportunidades',
  ];

  it('sao treze flags, e 62 blocos dependem de pelo menos uma', () => {
    const porFlag = new Map<string, number>();
    for (const b of blocos) for (const f of b.flagsRequeridas ?? []) {
      porFlag.set(f, (porFlag.get(f) ?? 0) + 1);
    }
    expect([...porFlag.keys()].sort()).toEqual([...TODAS].sort());
    expect(Object.fromEntries(porFlag)).toEqual({
      acordo_nao_concorrencia: 7, acordo_tem_lock_up: 1, acordo_tem_tag_along: 4,
      acordo_tem_drag_along: 8, acordo_opcao_venda_prevista: 1,
      acordo_opcao_compra_prevista: 6, acordo_tem_preferencia: 18,
      acordo_reuniao_previa_obrigatoria: 10, acordo_por_arbitragem: 5,
      acordo_consolida_composse: 1, acordo_preferencia_sobre_imoveis: 1,
      acordo_preferencia_sobre_participacoes: 5,
      acordo_preferencia_sobre_oportunidades: 1,
    });
    /*
     * 204 sem flag, e nao 198: os cinco blocos das SOCIEDADES RELACIONADAS ja
     * dependiam da preferencia, porque moram na Clausula Decima. Eles ganharam
     * uma SEGUNDA flag, e um bloco com duas exige as duas.
     */
    expect(blocos.filter((b) => !b.flagsRequeridas?.length)).toHaveLength(204);
    // Seis com DUAS flags: os da Clausula Decima. O das oportunidades mora na
    // Decima Primeira, que a preferencia nao governa, entao tem uma so.
    expect(blocos.filter((b) => (b.flagsRequeridas?.length ?? 0) > 1)).toHaveLength(6);
  });

  it('cada mecanismo tira SO os blocos dele, e o documento continua de pe', () => {
    const tudoLigado = gerarBlocos(template, contextoDe(ENTRADA), TODAS);
    expect(tudoLigado).toHaveLength(266);

    for (const flag of TODAS) {
      const sem = gerarBlocos(template, contextoDe(ENTRADA), TODAS.filter((f) => f !== flag));
      const quantos = blocos.filter((b) => b.flagsRequeridas?.includes(flag)).length;
      /*
       * Pode sair MAIS do que os blocos da flag: a clausula que perdeu todos os
       * itens sai junto (`clausula-sem-corpo`), e e isso que impede o cabecalho
       * "CLAUSULA DECIMA - Do direito de preferencia" de sobrar sozinho.
       */
      expect(sem.length, flag).toBeLessThanOrEqual(266 - quantos);
      expect(sem.length, flag).toBeGreaterThan(200);
      // O fecho com as assinaturas nunca sai, aconteca o que acontecer.
      expect(sem[sem.length - 1].conteudo, flag).toContain('TESTEMUNHAS');
    }
  });

  it('desligar a preferencia leva as duas clausulas inteiras, cabecalho incluido', () => {
    const sem = gerarBlocos(
      template, contextoDe(ENTRADA), TODAS.filter((f) => f !== 'acordo_tem_preferencia'),
    );
    const texto = sem.map((b) => b.conteudo).join(String.fromCharCode(10));
    // As duas clausulas da preferencia somem, e a numeracao fecha sem buraco.
    const clausulas = texto.match(/^\*CLÁUSULA [^*]+\*/gm) ?? [];
    expect(clausulas).toHaveLength(24);
    expect(texto).not.toContain('DIREITO DE PREFERÊNCIA para os casos de alienação');
    expect(clausulas[clausulas.length - 1]).toContain('VIGÉSIMA QUARTA');
  });

  it('desligar a nao concorrencia tira os sete e mantem as 26 clausulas', () => {
    const sem = gerarBlocos(
      template, contextoDe(ENTRADA), TODAS.filter((f) => f !== 'acordo_nao_concorrencia'),
    );
    expect(sem).toHaveLength(259);
    const texto = sem.map((b) => b.conteudo).join(String.fromCharCode(10));
    expect(texto).not.toContain('CLÁUSULA DE NÃO CONCORRÊNCIA');
    expect(texto).not.toContain('ATIVIDADE(S) CONCORRENTE(S):');
    expect(texto.match(/^\*CLÁUSULA /gm)).toHaveLength(26);
  });
});

describe('o caminho da TELA, que o teste de motor nao cobre', () => {
  const conteudoTodo = blocos.map((b) => b.conteudo).join('\n\n');

  it('a deteccao acha os papeis certos, e os manuais como campo livre', () => {
    /*
     * `desconhecidos` NAO e erro: e o mecanismo dos campos de topo. A tela
     * transforma cada um num campo de texto livre e o preenche com '' quando
     * vazio (`livresFonte[ph] ?? ''`), entao o render nao derruba. E o mesmo
     * caminho da data de assinatura e das testemunhas.
     */
    const d = detectarBindingsDeConteudo(conteudoTodo);
    expect(d.secoesDesconhecidas, 'secao sem papel some do Word inteira').toEqual([]);
    expect(d.bindings.map((b) => b.nome).sort()).toEqual(['acordo', 'sociedade']);
    expect(d.listas.map((l) => l.nome).sort()).toEqual(['administradores', 'quotistasSignatarios']);
    /*
     * SOBRARAM SETE, e todos são do ATO DE ASSINAR: a data e as duas
     * testemunhas. É essa a régua do campo manual.
     *
     * O foro eleito, o substituto do representante e o apelido da empresa já
     * estiveram nesta lista, e saíram: são combinados uma vez e valem por vinte
     * anos, então viraram cadastro (migration 20260916181629). Campo manual que
     * o consultor redigita a cada geração é campo no lugar errado.
     */
    expect([...d.desconhecidos].sort()).toEqual([
      'dataAssinatura',
      'testemunha1Cpf', 'testemunha1Nome', 'testemunha1Rg',
      'testemunha2Cpf', 'testemunha2Nome', 'testemunha2Rg',
    ]);
    const manuais = new Set(CAMPOS_MANUAIS.map((c) => c.id));
    expect(d.desconhecidos.filter((ph) => !manuais.has(ph))).toEqual([]);
  });

  it('o docx sai sem levantar, com os 266 blocos', async () => {
    // `montarDocx` recebe os BLOCOS ja renderizados e numerados, nao o texto.
    const prontos = gerarBlocos(template, contextoDe(ENTRADA));
    await expect(montarDocx(prontos)).resolves.toBeTruthy();
  });
});

describe('o acordo VAZIO nao derruba a geracao', () => {
  /*
   * O CASO QUE TRAVOU A PRIMEIRA GERACAO DE VERDADE.
   *
   * O render LEVANTA quando o placeholder nao existe no contexto, e o `coletor`
   * descarta valor vazio. Juntando os dois, qualquer campo OPCIONAL em branco
   * derrubava o documento inteiro: a tela mostrou "Algo impediu a geracao do
   * documento — Placeholder nao resolvido: {{acordo.naoConcorrenciaMulta}}",
   * porque o acordo daquele cliente nao tinha a multa preenchida.
   *
   * Nao e o cadastro que estava errado: acordo sem multa, sem opcao de compra e
   * sem representante existe no acervo. Quem estava errado era o mapeador, que
   * nao passava por `publicarOpcionais`.
   */
  const VAZIO: EntradaAcordo = {
    acordo: { clienteId: 'c1' },
    quoruns: [], ramos: [], ordemPreferencia: [], signatarios: [],
  };

  it('gera com o cadastro em branco, sem levantar', () => {
    expect(() => gerarDocumento(template, contextoDe(VAZIO))).not.toThrow();
  });

  it('todo campo declarado chega ao contexto, nem que seja vazio', () => {
    const campos = camposDoAcordo(VAZIO);
    const ausentes = camposDaEntidade('acordoQuotistas')
      .filter((c) => !c.obrigatorio && campos[c.id] === undefined)
      .map((c) => c.id);
    expect(ausentes, 'campo ausente derruba o render de quem o cita').toEqual([]);
  });
});
