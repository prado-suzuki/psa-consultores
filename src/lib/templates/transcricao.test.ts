import { describe, expect, it } from 'vitest';
import { gerarComposicao } from './index';
import { removerMarcas } from './marcas';
import { compilar, extrairCampos } from './render';
import { RECUO_CITACAO, RECUO_CITACAO_CENTRALIZADA } from './transcricao';
import type { Bloco, Contexto, Template } from './types';

const b = (id: string, tipo: Bloco['tipo'], conteudo: string, extra: Partial<Bloco> = {}): Bloco => ({
  id, tipo, conteudo, obrigatorio: true, ...extra,
});

const RESOLUCAO = 'Altera-se o {{ refs.admin }}, de modo que se alteram das {{ refs.adminClausulas }}, que vigorarão assim:\n\n{{transcricao capitulo="admin"}}';

function modelo(resolucao: Partial<Bloco> = {}, capitulo: Bloco[] = []): Template {
  return {
    id: 't',
    nome: 't',
    blocos: [
      b('resolucao', 'clausula', RESOLUCAO, resolucao),
      b('consolidacao', 'clausula', 'Os sócios consolidam o contrato.'),
      b('cabecalho', 'livre', 'CONSOLIDAÇÃO', { reiniciaNumeracao: true }),
      b('cap1', 'capitulo', 'Denominação'),
      b('nome', 'clausula', 'A sociedade gira sob o nome X.'),
      b('cap2', 'capitulo', 'Administração', { ancora: 'admin' }),
      ...capitulo,
      b('cap3', 'capitulo', 'Haveres'),
      b('haveres', 'clausula', 'Os haveres se apuram por balanço.', { ancora: 'haveres' }),
    ],
  };
}

const CAPITULO: Bloco[] = [
  b('adm', 'clausula', 'A sociedade é administrada pelo Conselho.'),
  b('adm-p1', 'paragrafo', 'Os haveres seguem a {{ refs.haveres }}.'),
  b('adm-p2', 'paragrafo', 'O mandato é de dois anos.'),
  b('comp', 'clausula', 'Compete {{ orgao.ao }} {{ orgao.nome }}:\n{{#competencias sep=";\\n" fim=";\\n"}}{{ competencia.alinea }}) {{ competencia.texto }}{{/competencias}}.', {
    repeteColecao: 'orgaos',
  }),
];

const CONTEXTO: Contexto = {
  orgaos: [
    { orgao: { ao: 'ao', nome: 'Conselho' }, competencias: [{ competencia: { alinea: 'a', texto: 'Aprovar contas' } }, { competencia: { alinea: 'b', texto: 'Eleger diretores' } }] },
    { orgao: { ao: 'à', nome: 'Diretoria' }, competencias: [{ competencia: { alinea: 'a', texto: 'Representar' } }] },
  ],
};

const gerar = (template: Template, ctx: Contexto = CONTEXTO) => gerarComposicao(template, ctx).blocos;
const semRecuo = (texto: string) => texto.split('\n').map((l) => l.replace(/^\t+/, '')).join('\n');

describe('transcrição de capítulo', () => {
  it('escreve o capítulo do consolidado com a numeração dele, recuado', () => {
    const blocos = gerar(modelo({}, CAPITULO));
    const resolucao = blocos[0].conteudo;
    expect(removerMarcas(resolucao)).toMatch(
      /^CLÁUSULA PRIMEIRA: Altera-se o Capítulo II, de modo que se alteram das Cláusulas Segunda à Quarta, que vigorarão assim:\n\n/,
    );

    const transcrito = resolucao.slice(resolucao.indexOf(RECUO_CITACAO));
    const inicio = blocos.findIndex((x) => x.id === 'cap2');
    const fim = blocos.findIndex((x) => x.id === 'cap3');
    const consolidado = blocos.slice(inicio, fim);
    // Mesmo texto, mesma ordem e mesma numeração do consolidado.
    for (const bloco of consolidado) expect(semRecuo(transcrito)).toContain(bloco.conteudo.trim());
    expect(removerMarcas(transcrito)).toBe([
      `${RECUO_CITACAO_CENTRALIZADA}CAPÍTULO II`,
      `${RECUO_CITACAO_CENTRALIZADA}Administração`,
      `${RECUO_CITACAO}CLÁUSULA SEGUNDA: A sociedade é administrada pelo Conselho.`,
      `${RECUO_CITACAO}Parágrafo Primeiro: Os haveres seguem a Cláusula Quinta.`,
      `${RECUO_CITACAO}Parágrafo Segundo: O mandato é de dois anos.`,
      '',
      `${RECUO_CITACAO}CLÁUSULA TERCEIRA: Compete ao Conselho:`,
      `${RECUO_CITACAO}a) Aprovar contas;`,
      `${RECUO_CITACAO}b) Eleger diretores.`,
      '',
      `${RECUO_CITACAO}CLÁUSULA QUARTA: Compete à Diretoria:`,
      `${RECUO_CITACAO}a) Representar.`,
    ].join('\n'));
  });

  it('não consome número: resoluções e consolidado seguem as próprias séries', () => {
    const rotulos = gerar(modelo({}, CAPITULO))
      .map((x) => removerMarcas(x.conteudo).match(/^CLÁUSULA [^:]+/)?.[0])
      .filter(Boolean);
    expect(rotulos).toEqual([
      'CLÁUSULA PRIMEIRA', 'CLÁUSULA SEGUNDA',
      'CLÁUSULA PRIMEIRA', 'CLÁUSULA SEGUNDA', 'CLÁUSULA TERCEIRA', 'CLÁUSULA QUARTA', 'CLÁUSULA QUINTA',
    ]);
  });

  it('a transcrição mantém a proveniência dos valores do capítulo', () => {
    const [resolucao] = gerar(modelo({}, CAPITULO));
    const valores = resolucao.segmentos.filter((s) => s.tipo === 'valor').map((s) => s.texto);
    expect(valores).toEqual(expect.arrayContaining(['Conselho', 'Diretoria', 'Aprovar contas', 'Cláusula Quinta']));
    expect(resolucao.segmentos.map((s) => s.texto).join('')).toBe(resolucao.conteudo);
  });

  it('capítulo descartado transcreve vazio; âncora inexistente falha cedo', () => {
    const descartado = modelo({ conteudo: 'Resolução de {{ sociedade }}:{{transcricao capitulo="admin"}}' }, CAPITULO);
    descartado.blocos = descartado.blocos.map((x) => (x.id === 'cap2' ? { ...x, conteudo: '{{ tituloAdmin }}' } : x));
    const blocos = gerarComposicao(descartado, { ...CONTEXTO, sociedade: 'X', tituloAdmin: '' });
    expect(blocos.descartados.map((x) => x.id)).toContain('cap2');
    expect(removerMarcas(blocos.blocos[0].conteudo)).toBe('CLÁUSULA PRIMEIRA: Resolução de X:');

    const semCapitulo = modelo({ conteudo: '{{transcricao capitulo="admin"}}Fim.' });
    semCapitulo.blocos = semCapitulo.blocos.filter((x) => x.id !== 'cap2');
    expect(() => gerar(semCapitulo)).toThrow('Transcrição de capítulo inexistente');
  });

  it('bloco que abre pela transcrição mantém o rótulo de numeração', () => {
    const [resolucao] = gerar(modelo({ conteudo: '{{transcricao capitulo="admin"}}' }, CAPITULO));
    expect(removerMarcas(resolucao.conteudo)).toMatch(/^CLÁUSULA PRIMEIRA: \t\tCAPÍTULO II/);
  });

  it('a diretiva não vira campo na detecção e exige o capítulo', () => {
    expect(extrairCampos('{{transcricao capitulo="admin"}}')).toEqual([]);
    expect(compilar('{{transcricao capitulo="admin"}}')).toEqual([{ tipo: 'transcricao', capitulo: 'admin' }]);
    expect(() => compilar('{{transcricao pagina="1"}}')).toThrow('Transcrição sem capítulo');
  });

  it('documento sem transcrição sai idêntico', () => {
    const template = modelo({ conteudo: 'Resolução sem transcrição.' }, CAPITULO);
    const blocos = gerar(template);
    expect(blocos.every((x) => !x.conteudo.includes(RECUO_CITACAO))).toBe(true);
    expect(blocos[0].conteudo).toBe('*CLÁUSULA PRIMEIRA:* Resolução sem transcrição.');
  });
});
