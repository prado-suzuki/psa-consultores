/**
 * MOT-01 · a cláusula de competência de cada órgão, montada a partir da Matriz.
 *
 * O caso que o teste guarda é o do recorte: no Mattei a cláusula do Conselho tem
 * 19 alíneas e a Diretoria tem outra cláusula. Uma lista de competências sem
 * dono faria o Conselho receber as alíneas da Diretoria, e o erro só apareceria
 * lendo o contrato gerado.
 */
import { describe, expect, it } from 'vitest';
import { gradeDaMatriz, listasDaGovernanca, type EntradaGovernanca } from './contextoGovernanca';
import { renderConteudo } from './render';
import { segmentar } from './tabela';
import type { Campos, ItemLista } from './mapeadores';

const ENTRADA: EntradaGovernanca = {
  orgaos: [
    { id: 'rs', nome: 'Reunião de Sócios' },
    { id: 'ca', nome: 'Conselho de Administração', membros_minimo: 3, membros_maximo: 6, mandato_anos: 3 },
    { id: 'de', nome: 'Diretoria Executiva' },
  ],
  linhas: [
    {
      id: 'l1', ordem: 1, atividade: 'Distribuição de Lucros',
      celulas: [
        { id: 'c1', orgaoId: 'rs', papeis: ['Delibera'], resumo: 'Delibera' },
        { id: 'c2', orgaoId: 'ca', papeis: ['Valida'], alcada: 'até R$ 100.000,00', sobePara: 'Reunião de Sócios', resumo: 'Valida · até R$ 100.000,00' },
        { id: 'c3', orgaoId: 'de', papeis: ['Analisa'], resumo: 'Analisa' },
      ],
    },
    {
      id: 'l2', ordem: 2, atividade: 'Aquisição de insumos',
      celulas: [
        { id: 'c4', orgaoId: 'rs', papeis: [], naoParticipa: true },
        { id: 'c5', orgaoId: 'ca', papeis: ['Aprova'], resumo: 'Aprova' },
        { id: 'c6', orgaoId: 'de', papeis: ['Executa'], resumo: 'Executa' },
      ],
    },
    {
      id: 'l3', ordem: 3, atividade: 'Representação Legal',
      celulas: [
        { id: 'c7', orgaoId: 'ca', papeis: ['Aprova'], resumo: 'Aprova' },
        { id: 'c8', orgaoId: 'de', papeis: ['Representa'], resumo: 'Representa' },
      ],
    },
  ],
};

const campos = (item: ItemLista, chave: string) => item[chave] as Campos;

describe('MOT-01 · cada órgão leva só as suas alíneas', () => {
  it('a competência mora dentro do órgão, não numa lista solta', () => {
    const { orgaosComCompetencia } = listasDaGovernanca(ENTRADA);
    expect(orgaosComCompetencia).toHaveLength(3);

    const nomes = orgaosComCompetencia.map((o) => campos(o, 'orgao').nome);
    expect(nomes).toEqual(['Reunião de Sócios', 'Conselho de Administração', 'Diretoria Executiva']);
  });

  it('quem não participa não vira alínea, e a letra não deixa buraco', () => {
    const { orgaosComCompetencia } = listasDaGovernanca(ENTRADA);

    // A Reunião de Sócios não participa da linha 2 e não tem célula na linha 3.
    const reuniao = orgaosComCompetencia[0].competencias as ItemLista[];
    expect(reuniao).toHaveLength(1);
    expect(campos(reuniao[0], 'competencia').atividade).toBe('Distribuição de Lucros');
    expect(campos(reuniao[0], 'competencia').alinea).toBe('a');

    // O Conselho está nas três, então as letras correm de a a c.
    const conselho = orgaosComCompetencia[1].competencias as ItemLista[];
    expect(conselho.map((c) => campos(c, 'competencia').alinea)).toEqual(['a', 'b', 'c']);
  });

  it('a alínea sai com o verbo e a alçada da célula', () => {
    const { orgaosComCompetencia } = listasDaGovernanca(ENTRADA);
    const primeira = campos((orgaosComCompetencia[1].competencias as ItemLista[])[0], 'competencia');
    expect(primeira.papeis).toBe('Valida');
    expect(primeira.alcada).toBe('até R$ 100.000,00');
    expect(primeira.sobe).toBe('sim');
  });

  it('o bloco repetido escreve uma cláusula por órgão', () => {
    const bloco = [
      'Compete ao {{ orgao.nome }}:',
      '{{#competencias}}{{ competencia.alinea }}) {{ competencia.atividade }};{{/competencias}}',
    ].join('\n');

    const { orgaosComCompetencia } = listasDaGovernanca(ENTRADA);
    const conselho = renderConteudo(bloco, orgaosComCompetencia[1] as never);

    expect(conselho).toContain('Compete ao Conselho de Administração:');
    expect(conselho).toContain('a) Distribuição de Lucros;');
    expect(conselho).toContain('c) Representação Legal;');
    // O que é da Diretoria não pode vazar para a cláusula do Conselho.
    expect(conselho).not.toContain('Executa');
  });
});

describe('MOT-01 · a grade do documento da Matriz', () => {
  it('mantém a coluna do órgão que não participa, para o quadro não desalinhar', () => {
    const grade = [
      '| Decisão | {{#orgaos sep=""}}{{ nome }} | {{/orgaos}}',
      '| --- {{#orgaos sep=""}}| --- {{/orgaos}}|',
      '{{#linhas sep="\\n"}}| {{ atividade }} | {{#celulas sep=""}}{{ resumo }} | {{/celulas}}{{/linhas}}',
    ].join('\n');

    const segmentos = segmentar(renderConteudo(grade, gradeDaMatriz(ENTRADA) as never).split('\n'));
    const tabela = segmentos.find((s) => s.tipo === 'tabela');
    expect(tabela).toBeDefined();
    if (tabela?.tipo !== 'tabela') return;

    expect(tabela.cabecalho).toEqual([
      'Decisão', 'Reunião de Sócios', 'Conselho de Administração', 'Diretoria Executiva',
    ]);
    // Linha 2: a Reunião de Sócios não participa, e a célula diz isso em vez de sumir.
    expect(tabela.corpo[1]).toEqual(['Aquisição de insumos', 'Não participa', 'Aprova', 'Executa']);
    // Linha 3: a Reunião de Sócios não tem célula nenhuma, e a coluna fica vazia.
    expect(tabela.corpo[2]).toEqual(['Representação Legal', '', 'Aprova', 'Representa']);
  });
});
