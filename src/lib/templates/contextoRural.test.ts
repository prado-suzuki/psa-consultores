import { describe, expect, it } from 'vitest';
import {
  descreverItens,
  listasDoInstrumentoRural,
  mapearInstrumentoRural,
  nomeDaComposse,
  type EntradaInstrumentoRural,
  type ImovelRural,
  type ParteRural,
} from './contextoRural';
import { apararSegmentos, gerarComposicao } from './index';
import { mapearPessoa } from './mapeadores';
import type { Contexto, Template } from './types';

// Fixtures com a MESMA estrutura dos contratos reais transcritos em
// docs/osg/contratos_exploracao: parceria em 90/10 e composse com origens
// múltiplas. Números reais, nomes fictícios — o que se compara palavra por
// palavra é a redação montada, não o nome de quem assinou.

const pessoa = (id: string, denominacao: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    denominacao,
    tipo_pessoa: 'PF',
    genero: 'M',
    cpf_cnpj: '111.222.333-44',
    nacionalidade: 'brasileiro',
    naturalidade_municipio: 'Cascavel',
    naturalidade_uf: 'PR',
    data_nascimento: '1968-04-12',
    profissao: 'produtor rural',
    estado_civil: 'casado',
    regime_bens: 'comunhão parcial de bens',
    documento_identidade_numero: '3.456.789',
    documento_identidade_orgao: 'SSP',
    documento_identidade_uf: 'BA',
    endereco_logradouro: 'Rua das Palmeiras',
    endereco_numero: '450',
    endereco_bairro: 'Centro',
    endereco_municipio: 'São Desidério',
    endereco_uf: 'BA',
    endereco_cep: '47820-000',
    ...extra,
  }) as unknown as ParteRural['pessoa'];

const pj = pessoa('pj', 'Boa Esperança Agropecuária Ltda.', {
  tipo_pessoa: 'PJ',
  cpf_cnpj: '11.222.333/0001-44',
  nire: '29200000001',
  junta_comercial_uf: 'BA',
});

const matricula = (numero: string, denominacao: string, area: number, municipio: string) =>
  ({
    id: `m-${numero}`,
    numero,
    livro: null,
    folha: null,
    municipio_imovel: municipio,
    uf_imovel: 'BA',
    area_documento: area,
    area_unidade: 'ha',
    vlr_contabil: null,
    confrontacoes_texto: null,
    descricao_psa_completa: null,
    tipo_bem: 'IR',
    bem: { denominacao, vlr_contabil: null, ccir_codigo: null },
    cartorio: {
      nome_completo: 'Cartório do Registro de Imóveis e Hipotecas de São Desidério',
      comarca: 'São Desidério',
      uf: 'BA',
    },
    // `proprietario` do Anexo NÃO é campo próprio: sai daqui, pelo mesmo mapeador
    // que o Contrato Social usa.
    titulares: [{ denominacao: 'Boa Esperança Agropecuária Ltda.', pessoaId: 'pj', fracao: 100 }],
    titularidadeIds: [],
  }) as unknown as ImovelRural['matricula'];

const imovel = (
  numero: string,
  nome: string,
  areaTotal: number,
  cedida: number,
  ordem: number,
  municipio = 'São Desidério',
  origemChave?: string,
  origemTipo?: string,
): ImovelRural => ({
  matricula: matricula(numero, nome, areaTotal, municipio),
  areaExplorada: cedida,
  areaUnidade: 'ha',
  ordem,
  origemChave,
  origemTipo,
});

const INSTRUMENTO_BASE = {
  dataAssinatura: '2024-08-28',
  dataEncerramento: null,
  dataInicioVigencia: null,
  vigenciaProrrogavel: false,
  percentualOutorgante: null,
  percentualExplorador: null,
  culturas: 'soja, milho e algodão',
  incluiPecuaria: true,
  // As três, como a parceria do MMS: é o caso que produz os seis parágrafos da
  // Cláusula Quinta, e o que distingue "tem gado" de "mede o gado assim".
  pecuariaModalidades: ['recria_engorda', 'cria', 'ciclo_completo'],
  permitePenhor: true,
  prazoIndivisaoQuantidade: null,
  prazoIndivisaoUnidade: null,
  indivisaoProrrogavel: null,
  indivisaoAvisoQuantidade: null,
  indivisaoAvisoUnidade: null,
  regraAdministracao: null,
  liquidacaoPeriodicidade: null,
  liquidacaoNumeroParcelas: null,
};

/**
 * O contexto como a tela Gerar o monta: um sub-objeto por binding, mais as
 * listas. `outorgante` é binding de PESSOA como qualquer outro papel (proprietário,
 * doador, donatário): o consultor o amarra na tela, e aqui a amarração é simulada
 * com a mesma pessoa que o cadastro registrou.
 */
const contextoDe = (entrada: EntradaInstrumentoRural): Contexto => ({
  instrumento: mapearInstrumentoRural(entrada),
  outorgante: entrada.outorgante ? mapearPessoa(entrada.outorgante) : {},
  ...listasDoInstrumentoRural(entrada),
});

const campos = (entrada: EntradaInstrumentoRural) => mapearInstrumentoRural(entrada);

describe('descreverItens', () => {
  it('faixa contígua vira "ao"', () => {
    expect(descreverItens(['a', 'b', 'c', 'd', 'e', 'f'])).toBe('Itens “a” ao “f”');
  });

  it('item único não vira faixa', () => {
    expect(descreverItens(['g'])).toBe('Item “g”');
  });

  it('faixa com buraco NÃO vira "ao" — diria que o imóvel do meio veio dessa origem', () => {
    expect(descreverItens(['k', 'm'])).toBe('Itens “k” e “m”');
    expect(descreverItens(['a', 'c', 'e'])).toBe('Itens “a”, “c” e “e”');
  });
});

describe('nomeDaComposse', () => {
  it('padrão: primeiro compossuidor da ordem, em caixa alta, mais E OUTROS', () => {
    const partes: ParteRural[] = [
      { pessoa: pessoa('p2', 'Jorge Caetano'), papel: 'compossuidor', fracao: 15, ordem: 1 },
      { pessoa: pessoa('p1', 'Sérgio Prado'), papel: 'compossuidor', fracao: 70, ordem: 0 },
    ];
    expect(nomeDaComposse(partes)).toBe('SÉRGIO PRADO E OUTROS');
  });

  it('o complemento NÃO é derivável — há composse que gira como "E ESPOSA"', () => {
    // Contrato real de composse entre dois cônjuges: "sob o nome de X E ESPOSA".
    // São dois compossuidores casados ENTRE SI — fato de `pessoa`/`parentesco`,
    // não da composse. Contar dois e escrever "E ESPOSA" acertaria esse caso e
    // erraria dois irmãos; por isso o campo `nomeComposse` não é derivado, e sim
    // um padrão editável.
    const casal: ParteRural[] = [
      { pessoa: pessoa('a', 'Joaquim Rocha'), papel: 'compossuidor', fracao: 50, ordem: 0 },
      { pessoa: pessoa('b', 'Marta Rocha'), papel: 'compossuidor', fracao: 50, ordem: 1 },
    ];
    expect(nomeDaComposse(casal)).toBe('JOAQUIM ROCHA E OUTROS');
    expect(nomeDaComposse(casal, 'JOAQUIM ROCHA E ESPOSA')).toBe('JOAQUIM ROCHA E ESPOSA');
  });
});

describe('mapearInstrumentoRural — parceria', () => {
  const entrada: EntradaInstrumentoRural = {
    instrumento: {
      ...INSTRUMENTO_BASE,
      tipoExploracao: 'parceria',
      dataEncerramento: '2027-10-01',
      vigenciaProrrogavel: true,
      percentualOutorgante: 10,
      percentualExplorador: 90,
    },
    outorgante: pj,
    partes: [
      { pessoa: pessoa('p1', 'Sérgio Prado'), papel: 'explorador', ordem: 0 },
      { pessoa: pessoa('p2', 'Jorge Caetano'), papel: 'explorador', ordem: 1 },
    ],
    imoveis: [
      imovel('8.939', 'Fazenda Bela Esperança I – Lote A', 295.8648, 234, 0),
      imovel('8.940', 'Fazenda Bela Esperança I', 296.0998, 219.2, 1),
    ],
    manuais: { foroComarca: 'São Desidério', foroUf: 'BA', numeroVias: 4 },
  };

  it('a natureza é DERIVADA da pecuária, não digitada', () => {
    expect(campos(entrada).natureza).toBe('AGROPECUÁRIA');
    expect(campos(entrada).naturezaPlural).toBe('AGROPECUÁRIAS');

    const sem = campos({ ...entrada, instrumento: { ...entrada.instrumento, incluiPecuaria: false } });
    expect(sem.natureza).toBe('AGRÍCOLA');
    expect(sem.pecuaria).toBe('');
  });

  // A modalidade da pecuária responde OUTRA pergunta que `incluiPecuaria`. Aquele
  // diz se há gado; estas dizem o que se MEDE na partilha da Cláusula Quinta —
  // ganho de peso, bezerros nascidos ou peso a cada 12 meses. E coexistem: o
  // assinado do MMS traz as três (seis parágrafos), o do Bela Vista traz duas
  // (cinco). Foi por supor exclusividade que isto nasceu como família de blocos.
  it('cada modalidade da pecuária é uma condicional própria', () => {
    const c = campos(entrada);
    expect(c.pecuariaRecriaEngorda).toBe('sim');
    expect(c.pecuariaCria).toBe('sim');
    expect(c.pecuariaCicloCompleto).toBe('sim');
  });

  it('modalidade não escolhida fica desligada, sem derivar das outras', () => {
    const doBelaVista = campos({
      ...entrada,
      instrumento: {
        ...entrada.instrumento,
        pecuariaModalidades: ['recria_engorda', 'cria'],
      },
    });
    expect(doBelaVista.pecuariaRecriaEngorda).toBe('sim');
    expect(doBelaVista.pecuariaCria).toBe('sim');
    expect(doBelaVista.pecuariaCicloCompleto).toBe('');
  });

  it('desligar a pecuária cala as três, mesmo com escolha gravada', () => {
    // Guarda contra o estado incoerente: a coluna pode ter uma escolha antiga, e
    // um contrato sem gado não pode medir gado.
    const semGado = campos({
      ...entrada,
      instrumento: { ...entrada.instrumento, incluiPecuaria: false },
    });
    expect(semGado.pecuaria).toBe('');
    expect(semGado.pecuariaRecriaEngorda).toBe('');
    expect(semGado.pecuariaCria).toBe('');
    expect(semGado.pecuariaCicloCompleto).toBe('');
  });

  it('o percentual sai na forma CARTORIAL — é o que o contrato assinado usa', () => {
    const c = campos(entrada);
    expect(c.percentualOutorgante).toBe('10%');
    expect(c.percentualOutorganteExtenso).toBe('dez inteiros por cento');
    expect(c.percentualExploradorExtenso).toBe('noventa inteiros por cento');
  });

  it('a faixa de alíneas vem das listas, na ordem dos imóveis', () => {
    const c = campos(entrada);
    expect(c.primeiraAlinea).toBe('a');
    expect(c.ultimaAlinea).toBe('b');
  });

  it('o cartório comum é o NOME da serventia, não o município', () => {
    // O bloco emendava um rótulo fixo no município e o ofício — que é o que
    // distingue uma serventia da outra — se perdia. Ver cartorio.ts.
    const c = campos(entrada);
    expect(c.cartorioComum).toContain('Cartório do Registro de Imóveis e Hipotecas de São Desidério');
    // A comarca já está no fim do nome: o complemento sai vazio, senão o contrato
    // diria "… de São Desidério da comarca de São Desidério".
    expect(c.cartorioComumComarca).toBe('');
  });

  it('o foro publica sigla E extenso — o contrato usa as duas', () => {
    const c = campos(entrada);
    expect(c.foroUf).toBe('BA');
    expect(c.foroUfExtenso).toBe('Bahia');
  });

  it('campo ausente publica vazio — o motor lança em undefined, não em vazio', () => {
    // A diferença é o que o motor faz com cada um: vazio resolve para nada, e
    // ausente vira a LACUNA assinalável do tipo (campos.ts). É por isso que
    // `publicarOpcionais` pula os obrigatórios — o foro em branco tem de sair
    // como traço no contrato, não sumir da frase.
    const c = campos({ ...entrada, manuais: {} });
    expect(c.prazoIndivisaoQuantidade).toBe('');
    expect(c.nomeComposse).toBe('');
    // Foro é manual E obrigatório: publica '' para o render trocar pela lacuna e
    // marcar o documento como incompleto — ausente, o render lançaria.
    expect(c.foroComarca).toBe('');
    expect(c.foroUf).toBe('');
  });
});

describe('listasDoInstrumentoRural', () => {
  const entrada: EntradaInstrumentoRural = {
    instrumento: {
      ...INSTRUMENTO_BASE,
      tipoExploracao: 'composse',
      prazoIndivisaoQuantidade: 3,
      prazoIndivisaoUnidade: 'anos',
      indivisaoProrrogavel: true,
      indivisaoAvisoQuantidade: 3,
      indivisaoAvisoUnidade: 'meses',
      regraAdministracao: 'maioria',
      liquidacaoPeriodicidade: 'mensal',
      liquidacaoNumeroParcelas: 60,
    },
    partes: [
      { pessoa: pessoa('p1', 'Sérgio Prado'), papel: 'compossuidor', fracao: 70, ordem: 0 },
      { pessoa: pessoa('p2', 'Jorge Caetano'), papel: 'compossuidor', fracao: 15, ordem: 1 },
      { pessoa: pessoa('p3', 'Denise Caetano', { genero: 'F' }), papel: 'compossuidor', fracao: 15, ordem: 2 },
    ],
    imoveis: [
      imovel('8.939', 'Fazenda Bela Esperança I – Lote A', 295.8648, 234, 0, 'São Desidério', 'interna', 'parceria'),
      imovel('8.940', 'Fazenda Bela Esperança I', 296.0998, 219.2, 1, 'São Desidério', 'interna', 'parceria'),
      imovel('57.072', 'Fazenda Mata do Puba', 946.09, 615, 2, 'Barreiras', 'puba', 'parceria'),
      imovel('2.331', 'Fazenda Guatambu', 500, 335, 3, 'São Desidério', 'luz', 'arrendamento'),
    ],
    origens: [
      {
        chave: 'puba',
        tituloInstrumento: 'Contrato de Parceria Agrícola',
        dataAssinatura: '2022-05-17',
        outorgante: pessoa('puba', 'Agropecuária Mata do Puba Ltda.', {
          tipo_pessoa: 'PJ',
          cpf_cnpj: '22.333.444/0001-55',
          nire: '29200000002',
          junta_comercial_uf: 'BA',
          endereco_municipio: 'Barreiras',
        }),
        outorganteRepresentante: 'seus administradores Ricardo Puba e Fernanda Puba',
        capitalSocialNaAssinatura: 4500000,
      },
      {
        chave: 'luz',
        tituloInstrumento: 'Instrumento Particular de Exploração',
        dataAssinatura: '2022-08-01',
        outorgante: pessoa('luz', 'José Hildebrando da Luz'),
        capitalSocialNaAssinatura: null,
      },
    ],
    manuais: { foroComarca: 'São Desidério', foroUf: 'BA', numeroVias: 3 },
  };

  const listas = () => listasDoInstrumentoRural(entrada);
  const origens = () =>
    listas().origensDaPosse as unknown as
      { origemPosse: Record<string, string>; outorgante: Record<string, string> }[];

  it('a fração é campo da RELAÇÃO, não da pessoa', () => {
    const comp = listas().compossuidores as unknown as { compossuidor: Record<string, string> }[];
    expect(comp.map((x) => x.compossuidor.fracao)).toEqual(['70%', '15%', '15%']);
    expect(comp[0].compossuidor.ordemRomana).toBe('i');
  });

  it('o Considerando V agrupa por origem, com as letras do Anexo', () => {
    const o = origens();
    expect(o).toHaveLength(3); // interna + puba + luz
    expect(o[0].origemPosse.itens).toBe('Itens “a” ao “b”');
    expect(o[1].origemPosse.itens).toBe('Item “c”');
    // A letra do Considerando é própria (a, b, c…), não a do Anexo.
    expect(o.map((x) => x.origemPosse.letra)).toEqual(['a', 'b', 'c']);
  });

  it('o verbo do Considerando V concorda com a quantidade de itens', () => {
    expect(origens()[0].origemPosse.advir).toBe('advêm');
    expect(origens()[1].origemPosse.advir).toBe('advém');
  });

  it('o outorgante da origem é qualificado pelo mapeador de PESSOA, com o representante', () => {
    const puba = origens()[1].outorgante;
    expect(puba.qualificacao).toContain('*AGROPECUÁRIA MATA DO PUBA LTDA.*');
    expect(puba.qualificacao).toContain('pessoa jurídica de direito privado');
    // Por EXTENSO, com a REGÊNCIA do nome do estado e dizendo NIRE — como o
    // preâmbulo escreve a mesma PJ. As duas frases aparecem no mesmo contrato, e
    // divergir salta aos olhos. Este teste pedia "Estado de Bahia" e "sob o nº":
    // as duas eram o defeito, não o contrato.
    expect(puba.qualificacao).toContain('Junta Comercial do Estado da Bahia sob o NIRE n.º 29200000002');
    expect(puba.qualificacao).toContain('representada por seus administradores Ricardo Puba');
    // A origem interna não tem outorgante a qualificar.
    expect(origens()[0].outorgante.qualificacao).toBeUndefined();
  });

  it('o capital na assinatura é campo da ORIGEM, não da pessoa', () => {
    const o = origens();
    expect(o[1].origemPosse.capitalSocialNaAssinatura).toBe('4500000');
    expect(o[1].origemPosse.capitalSocialNaAssinaturaExtenso).toContain('quatro milhões');
    // Fecha bem SEM capital: a banca já emitiu Considerando V assim.
    expect(o[2].origemPosse.capitalSocialNaAssinatura).toBe('');
    expect(o[2].origemPosse.capitalSocialNaAssinaturaExtenso).toBe('');
  });

  it('a linha de assinatura sai por papel, concordada em gênero', () => {
    const sig = listas().signatarios as unknown as { signatario: Record<string, string> }[];
    expect(sig.map((s) => s.signatario.papel)).toEqual([
      'Compossuidor Rural', 'Compossuidor Rural', 'Compossuidora Rural',
    ]);
    // A qualificação do fecho é o complemento CURTO, não o preâmbulo inteiro.
    expect(sig[0].signatario.qualificacao).toBe('');
    // A fábrica é a mesma do fecho societário: as condicionais todas existem.
    expect(sig[0].signatario.eCompossuidor).toBe('sim');
    expect(sig[0].signatario.eTestemunha).toBe('');
  });

  it('nomear administrador NÃO cria uma segunda linha de assinatura', () => {
    const sig = listasDoInstrumentoRural({
      ...entrada,
      partes: [
        ...entrada.partes,
        { pessoa: pessoa('p1', 'Sérgio Prado'), papel: 'administrador_nomeado', ordem: 0 },
      ],
    }).signatarios as unknown as { signatario: Record<string, string> }[];
    expect(sig).toHaveLength(3);
  });

  it('a PJ outorgante assina no feminino mesmo sem gênero cadastrado', () => {
    const sig = listasDoInstrumentoRural({
      ...entrada,
      instrumento: { ...entrada.instrumento, tipoExploracao: 'parceria' },
      outorgante: pj,
      partes: [{ pessoa: pessoa('p1', 'Sérgio Prado'), papel: 'explorador', ordem: 0 }],
    }).signatarios as unknown as { signatario: Record<string, string> }[];
    expect(sig.map((s) => s.signatario.papel)).toEqual(['Parceira Outorgante', 'Parceiro Outorgado']);
  });

  it('a área cedida é da RELAÇÃO; a área da matrícula segue sendo a da matrícula', () => {
    const imoveis = listas().imoveisDoAnexo as unknown as { imovel: Record<string, string> }[];
    expect(imoveis.map((i) => i.imovel.alinea)).toEqual(['a', 'b', 'c', 'd']);
    expect(imoveis[0].imovel.areaCedida).toContain('234');
    expect(imoveis[0].imovel.area).toContain('295');
  });

  it('as condicionais de administração são publicadas em separado — o motor não tem else', () => {
    const c = campos(entrada);
    expect(c.administracaoMaioria).toBe('sim');
    expect(c.administracaoNomeados).toBe('');
  });

  it('com 1 nomeado o contrato diz isoladamente; com 2, em conjunto', () => {
    const comUm = campos({
      ...entrada,
      instrumento: { ...entrada.instrumento, regraAdministracao: 'nomeados' },
      partes: [...entrada.partes, { pessoa: pessoa('p1', 'Sérgio Prado'), papel: 'administrador_nomeado', ordem: 0 }],
    });
    expect(comUm.nomeadoUnico).toBe('sim');
    expect(comUm.nomeadosEmConjunto).toBe('');

    const comDois = campos({
      ...entrada,
      instrumento: { ...entrada.instrumento, regraAdministracao: 'nomeados' },
      partes: [
        ...entrada.partes,
        { pessoa: pessoa('p1', 'Sérgio Prado'), papel: 'administrador_nomeado', ordem: 0 },
        { pessoa: pessoa('p2', 'Jorge Caetano'), papel: 'administrador_nomeado', ordem: 1 },
      ],
    });
    expect(comDois.nomeadoUnico).toBe('');
    expect(comDois.nomeadosEmConjunto).toBe('sim');
  });

  it('a periodicidade tem forma CRUA e forma de PROSA — a prosa é derivada', () => {
    expect(campos(entrada).liquidacaoPeriodicidade).toBe('mensal');
    expect(campos(entrada).liquidacaoPeriodicidadeProsa).toBe('mensais');

    const anual = campos({
      ...entrada,
      instrumento: { ...entrada.instrumento, liquidacaoPeriodicidade: 'anual', liquidacaoNumeroParcelas: 10 },
    });
    // "anuais", seco: o composse assinado escreve "10 (dez) parcelas iguais e
    // anuais atualizadas monetariamente". "e consecutivas" é redação do Contrato
    // Social, e tinha vazado para cá — palavra a mais dentro de cláusula
    // assinada. Contrato que a queira ganha pelo "Ajustar dados manualmente".
    expect(anual.liquidacaoPeriodicidadeProsa).toBe('anuais');
    expect(anual.liquidacaoParcelasExtenso).toBe('dez');
  });

  it('o vencimento da primeira parcela NÃO sai da periodicidade', () => {
    // Dois contratos reais com parcelas ANUAIS discordam: um usa "1 (um) ano do
    // evento", o outro "30 (trinta) dias". A primeira versão amarrava os dois
    // eixos e escreveria, com toda a confiança, uma data que o contrato não tem.
    const padrao = campos({
      ...entrada,
      instrumento: { ...entrada.instrumento, liquidacaoPeriodicidade: 'anual', liquidacaoNumeroParcelas: 10 },
    });
    expect(padrao.liquidacaoPrimeiroVencimento).toBe('30 (trinta) dias após o evento');

    const outro = campos({
      ...entrada,
      manuais: { ...entrada.manuais, liquidacaoPrimeiroVencimento: '1 (um) ano do evento' },
    });
    expect(outro.liquidacaoPrimeiroVencimento).toBe('1 (um) ano do evento');
  });

});

// ── A prova de fogo: o motor REAL renderiza sobre o contexto montado do jeito
// que a tela Gerar monta (binding unitário + listas). Se o contexto não resolver
// um placeholder, `gerarComposicao` LANÇA — não devolve texto com buraco.
describe('renderização de ponta a ponta com o motor real', () => {
  const entrada: EntradaInstrumentoRural = {
    instrumento: {
      ...INSTRUMENTO_BASE,
      tipoExploracao: 'parceria',
      dataEncerramento: '2027-10-01',
      vigenciaProrrogavel: true,
      percentualOutorgante: 10,
      percentualExplorador: 90,
    },
    outorgante: pj,
    partes: [
      { pessoa: pessoa('p1', 'Sérgio Prado'), papel: 'explorador', ordem: 0 },
      { pessoa: pessoa('p2', 'Jorge Caetano'), papel: 'explorador', ordem: 1 },
    ],
    imoveis: [
      imovel('8.939', 'Fazenda Bela Esperança I – Lote A', 295.8648, 234, 0),
      imovel('8.940', 'Fazenda Bela Esperança I', 296.0998, 219.2, 1),
    ],
    manuais: { foroComarca: 'São Desidério', foroUf: 'BA', numeroVias: 4 },
  };

  const template: Template = {
    id: 'parceria-teste',
    nome: 'Parceria Rural',
    blocos: [
      {
        id: 'titulo',
        tipo: 'livre',
        obrigatorio: true,
        conteudo: '*INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE EXPLORAÇÃO {{ instrumento.natureza }}*',
      },
      {
        id: 'preambulo-outorgante',
        tipo: 'livre',
        obrigatorio: true,
        conteudo: '*PARCEIRA OUTORGANTE:*\n\n{{ outorgante.qualificacao }}.',
      },
      {
        id: 'preambulo-outorgados',
        tipo: 'livre',
        obrigatorio: true,
        conteudo:
          '*PARCEIROS OUTORGADOS:*\n\n{{#exploradores sep=";\n\n" fim="; e\n\n"}}{{ explorador.qualificacao }}{{/exploradores}}.',
      },
      { id: 'cap-areas', tipo: 'capitulo', obrigatorio: true, conteudo: 'Das Áreas Cedidas em Parceria' },
      {
        id: 'cl-areas',
        tipo: 'clausula',
        obrigatorio: true,
        conteudo:
          'As partes constituem parceria rural, cedendo os imóveis descritos nas alíneas "{{ instrumento.primeiraAlinea }}" à "{{ instrumento.ultimaAlinea }}" a seguir:\n\n{{#imoveisDoAnexo sep="\n"}}*{{ imovel.alinea }})* {{ imovel.areaCedida }} de um imóvel com área de {{ imovel.area }}, denominado *{{ imovel.denominacao }}*, matrícula nº {{ imovel.numero }}, município de {{ imovel.municipio }}, Estado de {{ imovel.uf }};{{/imoveisDoAnexo}}',
      },
      {
        id: 'pg-cartorio',
        tipo: 'paragrafo',
        obrigatorio: true,
        conteudo:
          'Todos os imóveis são de propriedade de {{ instrumento.proprietarioComum }}, registrados no {{ instrumento.cartorioComum }}{{#instrumento.cartorioComumComarca}} da comarca de {{ instrumento.cartorioComumComarca }}{{/instrumento.cartorioComumComarca}}.',
      },
      { id: 'cap-partilha', tipo: 'capitulo', obrigatorio: true, conteudo: 'Da Participação nos Frutos' },
      {
        id: 'cl-partilha',
        tipo: 'clausula',
        obrigatorio: true,
        conteudo:
          'Caberá à PARCEIRA OUTORGANTE *{{ instrumento.percentualOutorgante }} ({{ instrumento.percentualOutorganteExtenso }})*, e aos PARCEIROS OUTORGADOS os outros *{{ instrumento.percentualExplorador }} ({{ instrumento.percentualExploradorExtenso }})*.',
      },
      {
        id: 'pg-prorrogacao',
        tipo: 'paragrafo',
        obrigatorio: true,
        conteudo:
          '{{#instrumento.prorrogavel}}Ultrapassada a data prevista, o contrato passará a ser por tempo indeterminado.{{/instrumento.prorrogavel}}',
      },
      { id: 'cap-foro', tipo: 'capitulo', obrigatorio: true, conteudo: 'Do Foro' },
      {
        id: 'cl-foro',
        tipo: 'clausula',
        obrigatorio: true,
        conteudo:
          'As partes elegem o foro da comarca de {{ instrumento.foroComarca }}, Estado de {{ instrumento.foroUfExtenso }}.',
      },
      {
        id: 'fecho',
        tipo: 'livre',
        obrigatorio: true,
        conteudo:
          'Firmam o presente em {{ instrumento.numeroVias }} ({{ instrumento.numeroViasExtenso }}) vias de igual teor.\n\n{{ instrumento.foroComarca }}/{{ instrumento.foroUf }}, {{ instrumento.dataAssinatura }}.\n\n{{#signatarios sep="\n\n"}}_______________________________________\n*{{ signatario.nomeMaiusculo }}*\n{{ signatario.papel }}{{/signatarios}}',
      },
    ],
  };

  const render = (e: EntradaInstrumentoRural) =>
    gerarComposicao(template, contextoDe(e)).blocos
      .map((b) => apararSegmentos(b.segmentos).map((s) => s.texto).join(''))
      .join('\n\n');

  const texto = render(entrada);

  it('renderiza sem placeholder pendente', () => {
    expect(texto).not.toContain('{{');
    expect(texto).not.toContain('undefined');
  });

  it('a qualificação da PJ entra inteira no preâmbulo, com o nome em caixa alta', () => {
    expect(texto).toContain('*BOA ESPERANÇA AGROPECUÁRIA LTDA.*');
    expect(texto).toContain('pessoa jurídica de direito privado');
    expect(texto).toContain('11.222.333/0001-44');
  });

  it('os dois outorgados entram separados por "; e"', () => {
    expect(texto).toContain('*SÉRGIO PRADO*');
    expect(texto).toContain('*JORGE CAETANO*');
    expect(texto).toMatch(/;\s*e/);
  });

  it('o cartório sai com o NOME da serventia, sem repetir a comarca', () => {
    expect(texto).toContain('registrados no Cartório do Registro de Imóveis e Hipotecas de São Desidério.');
    expect(texto).not.toContain('São Desidério da comarca de São Desidério');
  });

  it('a numeração das cláusulas é automática e contínua', () => {
    expect(texto).toContain('CLÁUSULA PRIMEIRA');
    expect(texto).toContain('CLÁUSULA SEGUNDA');
    expect(texto).toContain('CLÁUSULA TERCEIRA');
  });

  it('o parágrafo condicional entra quando a vigência é prorrogável, e some quando não', () => {
    expect(texto).toContain('por tempo indeterminado');
    const semProrrogar = render({
      ...entrada,
      instrumento: { ...entrada.instrumento, vigenciaProrrogavel: false },
    });
    expect(semProrrogar).not.toContain('por tempo indeterminado');
    // Sem buraco na numeração: o descarte reordena antes de numerar.
    expect(semProrrogar).toContain('CLÁUSULA TERCEIRA');
  });

  it('foro não preenchido vira LACUNA no contrato, em vez de sumir da frase', () => {
    const semForo = render({ ...entrada, manuais: { numeroVias: 4 } });
    expect(semForo).toContain('foro da comarca de ____________________');
  });

  it('o fecho traz uma linha por parte, com o papel concordado', () => {
    expect(texto).toContain('Parceira Outorgante');
    expect(texto).toContain('Parceiro Outorgado');
    expect(texto).toContain('4 (quatro) vias');
    expect(texto).toContain('São Desidério/BA, 28/08/2.024.');
    expect(texto).toContain('Estado de Bahia');
  });
});

// ── O preâmbulo e o fecho da pessoa jurídica outorgante ─────────────────────
//
// Dois fatos que `pessoa` não guarda e que os assinados exigem: o capital social
// vigente NA DATA da assinatura e quem assinava pela empresa. Sem eles o
// preâmbulo saía sem capital e sem representantes, e o fecho dava à empresa uma
// linha só — quando a parceria do MMS tem quatro (dois administradores) e a do
// Bela Vista tem seis (três).
describe('outorgante pessoa jurídica: capital e administradores', () => {
  const adm1 = pessoa('adm-1', 'José Eduardo de Macedo Soares Júnior', {
    genero: 'M',
    filiacao_pai: 'José Eduardo de Macedo Soares Sobrinho',
    filiacao_mae: 'Teresa Maria Alcantara Machado de Macedo Soares',
  });
  const adm2 = pessoa('adm-2', 'Maria Auxiliadora Malheiros', {
    genero: 'F',
    estado_civil: 'casada',
    filiacao_pai: 'Licio Malheiros',
    filiacao_mae: 'Ana Maria Pereira Malheiros',
  });

  const entrada = (extra: Partial<EntradaInstrumentoRural> = {}): EntradaInstrumentoRural => ({
    instrumento: { ...INSTRUMENTO_BASE, tipoExploracao: 'parceria' },
    outorgante: pj,
    partes: [{ pessoa: pessoa('p1', 'Ana Explora', {}), papel: 'explorador', ordem: 1 }],
    imoveis: [imovel('9.617', 'Fazenda Tarumã', 220.066, 217.8, 1)],
    ...extra,
  });

  it('a qualificação declara o capital social subscrito e integralizado', () => {
    const c = campos(entrada({ outorganteCapitalSocial: 872674 }));
    expect(c.outorganteQualificacao).toContain(
      'com capital social totalmente subscrito e integralizado no valor de ' +
      'R$ 872.674,00 (oitocentos e setenta e dois mil, seiscentos e setenta e quatro reais)',
    );
  });

  it('e nomeia os administradores, cada um qualificado por inteiro, com filiação', () => {
    const c = campos(entrada({ outorganteAdministradores: [adm1, adm2] }));
    // "seus administradores" no plural, e a preposição contraída pelo mapeador de
    // pessoa — não por uma segunda regra escrita aqui.
    expect(c.outorganteQualificacao).toContain('neste ato representada por seus administradores');
    // Filiação, e NÃO naturalidade: é o estilo que os assinados usam para quem
    // assina pela empresa (os outorgados da mesma parceria saem com naturalidade).
    expect(c.outorganteQualificacao).toContain(
      'filho de José Eduardo de Macedo Soares Sobrinho e Teresa Maria Alcantara Machado de Macedo Soares',
    );
    expect(c.outorganteQualificacao).not.toContain('natural de Cascavel');
    // A enumeração separa com "; e " antes do último, e o nome do administrador
    // sai em Title Case: dentro da qualificação da outorgante ele não é PARTE do
    // instrumento, é como a parte se representa. É o que o assinado do MMS faz
    // ("representado por seus administradores José Eduardo de Macedo Soares
    // Júnior, brasileiro, …"), e a caixa alta ali roubava o destaque de quem
    // de fato contrata. Ver `estiloNome` em `montarQualificacao`.
    expect(c.outorganteQualificacao).toContain('; e *Maria Auxiliadora Malheiros*');
    expect(c.outorganteQualificacao).not.toContain('*MARIA AUXILIADORA MALHEIROS*');
  });

  it('com um administrador só, o tratamento vai para o singular', () => {
    const c = campos(entrada({ outorganteAdministradores: [adm1] }));
    // "por seu administrador", sem contração: `porContraido` só contrai diante de
    // artigo ("o"/"a"), e é o que os assinados escrevem — "representado por seus
    // administradores".
    expect(c.outorganteQualificacao).toContain('neste ato representada por seu administrador');
    expect(c.outorganteQualificacao).not.toContain('seus administradores');
  });

  it('a Junta Comercial sai com a regência do estado e dizendo NIRE', () => {
    // A pessoa jurídica da fixture é registrada na Bahia: "do Estado DA Bahia".
    // E o número tem de vir nomeado — antes saía "sob o nº", um número sem nome
    // logo depois do CNPJ.
    const c = campos(entrada());
    expect(c.outorganteQualificacao).toContain('Junta Comercial do Estado da Bahia sob o NIRE n.º 29200000001');
  });

  it('sem outorgante (composse) o campo sai vazio, não ausente', () => {
    const c = campos({ ...entrada(), outorgante: null });
    expect(c.outorganteQualificacao).toBe('');
  });

  it('o fecho dá UMA LINHA por administrador da empresa, concordada em gênero', () => {
    const listas = listasDoInstrumentoRural(entrada({ outorganteAdministradores: [adm1, adm2] }));
    const linhas = listas.signatarios.map((i) => i.signatario as Record<string, string>);
    // Duas linhas da empresa + o outorgado.
    expect(linhas).toHaveLength(3);
    expect(linhas[0].nome).toBe('Boa Esperança Agropecuária Ltda.');
    expect(linhas[0].papel).toBe('Parceira Outorgante');
    expect(linhas[0].qualificacao).toBe(
      'representada por seu Administrador José Eduardo de Macedo Soares Júnior',
    );
    expect(linhas[1].nome).toBe('Boa Esperança Agropecuária Ltda.');
    // A concordância é com o ADMINISTRADOR, não com a sociedade.
    expect(linhas[1].qualificacao).toBe(
      'representada por sua Administradora Maria Auxiliadora Malheiros',
    );
    // A fixture da parte é masculina; a concordância dela é outro teste.
    expect(linhas[2].papel).toBe('Parceiro Outorgado');
  });

  it('sem administrador cadastrado, a empresa assina numa linha só e sem complemento', () => {
    const listas = listasDoInstrumentoRural(entrada());
    const linhas = listas.signatarios.map((i) => i.signatario as Record<string, string>);
    expect(linhas).toHaveLength(2);
    expect(linhas[0].qualificacao).toBe('');
  });

  it('testemunha digitada na tela Gerar entra no fecho, depois das partes', () => {
    // A lista agrária SUBSTITUI a do quadro societário: sem repassar as
    // testemunhas aqui, quem digitasse uma a veria desaparecer sem aviso.
    const listas = listasDoInstrumentoRural(
      entrada({ testemunhas: [{ nome: 'Debora Regina Dugato', cpfCnpj: '999.888.777-66' }] }),
    );
    const linhas = listas.signatarios.map((i) => i.signatario as Record<string, string>);
    expect(linhas[linhas.length - 1]).toMatchObject({
      nome: 'Debora Regina Dugato',
      papel: 'Testemunha',
      eTestemunha: 'sim',
    });
  });
});

// Os *Elementos do Perímetro* da alínea do Anexo saem da MESMA coleção do
// memorial SIGEF — o Anexo do Bela Vista a imprime em tabela e o do MMS em prosa,
// e a diferença é do bloco, não do dado.
describe('georreferenciamento na alínea do Anexo', () => {
  const entrada: EntradaInstrumentoRural = {
    instrumento: { ...INSTRUMENTO_BASE, tipoExploracao: 'parceria' },
    outorgante: pj,
    partes: [{ pessoa: pessoa('p1', 'Ana Explora', {}), papel: 'explorador', ordem: 1 }],
    imoveis: [imovel('9.617', 'Fazenda Tarumã', 220.066, 217.8, 1)],
  };

  it('sem georref, a seção fica vazia e o trecho é descartado pelo motor', () => {
    const listas = listasDoInstrumentoRural(entrada);
    expect(listas.imoveisDoAnexo[0].vertices).toEqual([]);
  });

  it('com georref, o perímetro entra no imóvel e os vértices na seção do item', () => {
    const listas = listasDoInstrumentoRural(entrada, {
      'm-9.617': {
        cabecalho: { area_ha: '220,0660', perimetro_m: '14.862,02' } as never,
        vertices: [
          { cod_vertice: 'M-01', azimute_dcm: "50°26'17\"", distancia_m: '758,00' } as never,
        ],
      },
    });
    const item = listas.imoveisDoAnexo[0];
    expect((item.imovel as Record<string, string>).georefPerimetro).toBe('14.862,02');
    expect(item.vertices).toHaveLength(1);
    expect((item.vertices as Array<Record<string, Record<string, string>>>)[0].vertice.codVertice)
      .toBe('M-01');
  });
});
