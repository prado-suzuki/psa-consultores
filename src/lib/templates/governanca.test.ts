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
import { detectarBindingsDeConteudo } from './binding';
import {
  mapearAcordoQuotistas, mapearCompetenciaMatriz, mapearOrgaoGovernanca,
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
  'CLÁUSULA DÉCIMA QUARTA: Compete aos diretores, isoladamente, a representação',
  'da sociedade para atos cujo valor não exceda {{ diretoria.representaSozinhoAte }}',
  '({{ diretoria.representaSozinhoAteExtenso }}).',
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

  it('as listas de governança são reconhecidas como lista', () => {
    const { listas } = detectarBindingsDeConteudo(MODELO_GOVERNANCA);
    const nomes = listas.map((l) => l.nome);
    expect(nomes).toContain('competencias');
    expect(nomes).toContain('quotistasSignatarios');
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
    expect(conselho.ao).toBe('ao');
    expect(conselho.composto).toBe('composto');

    const diretoria = mapearOrgaoGovernanca({ id: 'f', nome: 'Diretoria Executiva', genero: 'F' });
    expect(diretoria.artigo).toBe('a');
    expect(diretoria.ao).toBe('à');
    expect(diretoria.composto).toBe('composta');
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

  it('a assinatura conjunta só acende acima de um assinante', () => {
    const um = mapearOrgaoGovernanca({
      id: 'og5', nome: 'Diretoria',
      representa_sozinho_ate: 2000000, representa_assinantes_acima: 1,
    });
    expect(um.exigeAssinaturaConjunta).toBe('');

    const dois = mapearOrgaoGovernanca({
      id: 'og6', nome: 'Diretoria',
      representa_sozinho_ate: 2000000, representa_assinantes_acima: 2,
    });
    expect(dois.exigeAssinaturaConjunta).toBe('sim');
    expect(dois.representaAssinantesAcimaExtenso).toBe('dois');
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
      '| Decisão | {{#orgaos sep=""}}{{ nome }} | {{/orgaos}}',
      '| --- {{#orgaos sep=""}}| --- {{/orgaos}}|',
      '{{#linhas sep="\\n"}}| {{ atividade }} | {{#celulas sep=""}}{{ resumo }} | {{/celulas}}{{/linhas}}',
    ].join('\n');

    const contexto = {
      orgaos: [{ nome: 'Reunião de Sócios' }, { nome: 'Conselho' }, { nome: 'Diretoria' }],
      linhas: [{
        atividade: 'Distribuição de Lucros',
        celulas: [{ resumo: 'Delibera' }, { resumo: 'Valida' }, { resumo: 'Analisa' }],
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
      alcada: 'até R$ 100.000,00',
      sobePara: 'Reunião de Sócios',
      resumo: 'Valida, Sugere · até R$ 100.000,00 · sobe para Reunião de Sócios',
    });
    expect(campos.papeis).toBe('Valida e Sugere');
    expect(campos.sobe).toBe('sim');
    expect(campos.temAlcada).toBe('sim');
    expect(campos.resumo).toContain('sobe para Reunião de Sócios');
  });
});
