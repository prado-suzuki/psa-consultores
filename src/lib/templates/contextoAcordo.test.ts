/*
 * O tradutor do Acordo de Quotistas (GOV-03, passo 3).
 *
 * TODA ASSERÇÃO AQUI É UMA FRASE DE DOCUMENTO DE VERDADE, conferida no acervo, e
 * não a saída que eu suporia. A regra vem da MOT-01: teste escrito contra a
 * suposição passa e mente, e em 15/09 uma catraca minha chegou a congelar uma
 * contagem errada por três dias.
 */
import { describe, expect, it } from 'vitest';

import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

import {
  camposDoAcordo, listasDoAcordo, metodosEmProsa, type EntradaAcordo,
} from './contextoAcordo';
import { renderConteudo } from './render';

const pessoa = (id: string, nome: string): PessoaRow => ({
  id, denominacao: nome, tipo_pessoa: 'PF',
} as PessoaRow);

const VAZIA: EntradaAcordo = {
  acordo: { clienteId: 'c1' },
  quoruns: [],
  ramos: [],
  ordemPreferencia: [],
  signatarios: [],
  sociedadesRelacionadas: [],
};

/** A AgroAliança, que é o único acordo do acervo com ramos familiares. */
const AGROALIANCA: EntradaAcordo = {
  acordo: { clienteId: 'c1', vigenciaAnos: 10, reuniaoPreviaObrigatoria: true },
  quoruns: [
    { chave: 'alterar_contrato_social', materia: 'Alterar o contrato social', ordem: 0,
      expressao: '75% (setenta e cinco por cento) dos presentes',
      quantidade: '75% (setenta e cinco por cento)',
      quantidadeEmFracao: '¾ (três quartos)' },
    { chave: 'nomear_administrador_nao_socio', materia: 'Nomear administrador não sócio',
      ordem: 1, expressao: 'todos os quotistas',
      quantidade: 'todos os QUOTISTAS', quantidadeEmFracao: 'todos os QUOTISTAS' },
    { chave: 'destituir_administrador', materia: 'Destituir administrador', ordem: 2,
      expressao: 'a maioria dos presentes',
      quantidade: 'a maioria', quantidadeEmFracao: 'a maioria' },
  ],
  ramos: [{ nome: 'Cristina', ordem: 0 }, { nome: 'Regina', ordem: 1 }],
  ordemPreferencia: [
    { quem: 'os descendentes dos SIGNATÁRIOS', ordem: 0 },
    { quem: 'os demais QUOTISTAS', ordem: 1 },
  ],
  signatarios: [pessoa('p1', 'CRISTINA BOCOLLI'), pessoa('p2', 'REGINA BOCOLLI')],
  sociedadesRelacionadas: [pessoa('e1', 'ALIANÇA PARTICIPAÇÕES LTDA.')],
  objetosPreferencia: ['quotas', 'imoveis', 'maquinas', 'equipamentos', 'participacoes',
    'oportunidades'],
};

describe('contextoAcordo · o que se deduz das listas', () => {
  it('as duas condicionais de alcance saem do tamanho das listas, e não de um campo', () => {
    const cheio = camposDoAcordo(AGROALIANCA);
    expect(cheio.temRamos).toBe('sim');
    expect(cheio.temSociedadesRelacionadas).toBe('sim');
    // Dois ramos: "os DOIS grupos de descendentes" (AgroAliança, 1.1.7).
    expect(cheio.quantosRamosExtenso).toBe('dois');

    const vazio = camposDoAcordo(VAZIA);
    expect(vazio.temRamos).toBe('');
    expect(vazio.temSociedadesRelacionadas).toBe('');
    expect(vazio.quantosRamosExtenso).toBe('');
  });

  it('os objetos da preferência saem com as palavras do DOCUMENTO, não com as da tela', () => {
    /*
     * A tela diz "Equipamentos" e "Imóveis". O acordo escreve "implementos" e
     * "bens imóveis". A frase abaixo é a do AgroAliança, 1.1.8, literal.
     */
    expect(camposDoAcordo(AGROALIANCA).objetosPreferencia).toBe(
      'as QUOTAS, bens imóveis, máquinas, implementos, participações em SOCIEDADES '
      + 'RELACIONADAS e oportunidades de negócio',
    );
  });

  it('a ordem dos objetos é a do catálogo, e não a de quem marcou', () => {
    // Marcar na ordem inversa não pode reescrever a frase do documento.
    const invertido = camposDoAcordo({
      ...AGROALIANCA,
      objetosPreferencia: ['oportunidades', 'quotas', 'imoveis'],
    });
    expect(invertido.objetosPreferencia)
      .toBe('as QUOTAS, bens imóveis e oportunidades de negócio');
  });

  it('a fila da preferência vira uma frase só, na ordem gravada', () => {
    expect(camposDoAcordo(AGROALIANCA).ordemPreferencia)
      .toBe('os descendentes dos SIGNATÁRIOS e os demais QUOTISTAS');
  });

  it('a apuração em prosa usa as palavras do documento', () => {
    expect(metodosEmProsa(['patrimonio_liquido', 'fluxo_de_caixa_descontado']))
      .toBe('o patrimônio líquido e o fluxo de caixa descontado');
    expect(metodosEmProsa(['patrimonio_liquido'])).toBe('o patrimônio líquido');
    expect(metodosEmProsa(null)).toBe('');
  });
});

describe('contextoAcordo · as cinco listas', () => {
  it('entrega as cinco, e nenhuma a menos', () => {
    // Lista que o tradutor esquece some do Word em silêncio: o render não acha o
    // papel e o trecho inteiro desaparece. Foi o defeito número um da MOT-01.
    expect(Object.keys(listasDoAcordo(VAZIA)).sort()).toEqual([
      'ordemDaPreferencia', 'quorunsDoAcordo', 'quotistasSignatarios',
      'ramosFamiliares', 'sociedadesRelacionadas',
    ]);
  });

  it('cada lista numera a si mesma, da letra a em diante', () => {
    const listas = listasDoAcordo(AGROALIANCA);
    expect(listas.quorunsDoAcordo.map((i) => (i.quorum as Record<string, string>).alinea))
      .toEqual(['a', 'b', 'c']);
    expect(listas.ramosFamiliares.map((i) => (i.ramo as Record<string, string>).alinea))
      .toEqual(['a', 'b']);
    expect(listas.ordemDaPreferencia.map((i) => (i.preferente as Record<string, string>).ordem))
      .toEqual(['1', '2']);
  });

  it('a ordem gravada manda, e não a ordem em que o array chegou', () => {
    const fora = listasDoAcordo({
      ...VAZIA,
      ramos: [{ nome: 'Regina', ordem: 1 }, { nome: 'Cristina', ordem: 0 }],
    });
    expect(fora.ramosFamiliares.map((i) => (i.ramo as Record<string, string>).rotulo))
      .toEqual(['DESCENDENTES DE CRISTINA', 'DESCENDENTES DE REGINA']);
  });

  it('o signatário é pessoa qualificada, e não um nome solto', () => {
    // O preâmbulo do acordo qualifica cada quotista por inteiro, como o contrato
    // faz com os sócios. Item com só o nome daria preâmbulo sem qualificação.
    const item = listasDoAcordo(AGROALIANCA).quotistasSignatarios[0]
      .quotista as Record<string, string>;
    expect(item.nome).toBe('CRISTINA BOCOLLI');
    expect(item.ordem).toBe('1');
    expect(Object.keys(item).length, 'o item veio sem a qualificação').toBeGreaterThan(3);
  });
});

describe('contextoAcordo · a cláusula sai igual à do documento', () => {
  it('a definição dos ramos reproduz o AgroAliança 1.1.7', () => {
    const contexto = {
      acordo: camposDoAcordo(AGROALIANCA),
      sociedade: { nomeCurto: 'ALIANÇA' },
      ...listasDoAcordo(AGROALIANCA),
    };
    const modelo = '{{#acordo.temRamos}}DESCENDENTES DAS QUOTISTAS: os '
      + '{{ acordo.quantosRamosExtenso }} grupos de descendentes em linha vertical das '
      + 'QUOTISTAS que compõem ou poderão compor o quadro societário da '
      + '{{ sociedade.nomeCurto }}, assim definidos: '
      + '{{#ramosFamiliares sep="; e "}}({{ ramo.alinea }}) {{ ramo.rotulo }}, '
      + '{{ ramo.definicao }}{{/ramosFamiliares}}.{{/acordo.temRamos}}';

    expect(renderConteudo(modelo, contexto)).toBe(
      'DESCENDENTES DAS QUOTISTAS: os dois grupos de descendentes em linha vertical das '
      + 'QUOTISTAS que compõem ou poderão compor o quadro societário da ALIANÇA, assim '
      + 'definidos: (a) DESCENDENTES DE CRISTINA, formado por CRISTINA e seus descendentes '
      + 'em linha vertical; e (b) DESCENDENTES DE REGINA, formado por REGINA e seus '
      + 'descendentes em linha vertical.',
    );
  });

  it('as alíneas de quórum reproduzem o bloco do modelo da casa', () => {
    const contexto = { acordo: camposDoAcordo(AGROALIANCA), ...listasDoAcordo(AGROALIANCA) };
    const modelo = 'prevalecerão os seguintes quóruns de deliberação: '
      + '{{#quorunsDoAcordo sep=" "}}{{ quorum.alinea }}) Conforme decidam '
      + '{{ quorum.expressao }} em relação a {{ quorum.materia }};{{/quorunsDoAcordo}}';

    // Modelo: "a) Conforme decidam 75% (setenta e cinco por cento) dos VOTOS dos
    // QUOTISTAS presentes [...] em relação aos seguintes assuntos: alteração do
    // contrato social".
    expect(renderConteudo(modelo, contexto)).toBe(
      'prevalecerão os seguintes quóruns de deliberação: a) Conforme decidam 75% (setenta e '
      + 'cinco por cento) dos presentes em relação a Alterar o contrato social; b) Conforme '
      + 'decidam todos os quotistas em relação a Nomear administrador não sócio; c) Conforme '
      + 'decidam a maioria dos presentes em relação a Destituir administrador;',
    );
  });

  it('cliente sem ramo, sem sociedade e sem quórum não derruba o render', () => {
    /*
     * O PIOR CASO É O COMUM: 6 dos 7 acordos não têm ramo. Um contexto vazio tem
     * de render sem exceção e sem deixar cabeçalho órfão. Condicional ausente
     * levanta "Seção não resolvida" e o documento inteiro deixa de sair.
     */
    const contexto = { acordo: camposDoAcordo(VAZIA), ...listasDoAcordo(VAZIA) };
    const modelo = '{{#acordo.temRamos}}há ramos{{/acordo.temRamos}}'
      + '{{#acordo.temSociedadesRelacionadas}}e relacionadas{{/acordo.temSociedadesRelacionadas}}'
      + '{{#quorunsDoAcordo}}{{ quorum.materia }}{{/quorunsDoAcordo}}'
      + '{{#ramosFamiliares}}{{ ramo.rotulo }}{{/ramosFamiliares}}'
      + '{{#ordemDaPreferencia}}{{ preferente.quem }}{{/ordemDaPreferencia}}'
      + '{{#quotistasSignatarios}}{{ quotista.nome }}{{/quotistasSignatarios}}'
      + '{{#sociedadesRelacionadas}}{{ sociedadeRelacionada.razaoSocial }}'
      + '{{/sociedadesRelacionadas}}';

    expect(renderConteudo(modelo, contexto)).toBe('');
  });
});
