import { describe, it, expect } from 'vitest';
import { gerarComposicao } from './index';
import { mapearEstadoDosOnus, type OnusParaMapear, type SocioParaMapear } from './mapeadores';
import type { Bloco, Contexto, Template } from './types';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

// OS TRÊS ECOS DO ÔNUS NO CONSOLIDADO, conferidos com a REDAÇÃO REAL.
//
// As três redações abaixo são cópia literal da migration
// `20260910220109_ecos_do_onus_na_consolidacao.sql`. O teste vale justamente por
// isso: o defeito que ele pega não é de aritmética (os mapeadores já têm o seu
// teste), é o de o texto citar `{{ gravame.nomes }}` enquanto o mapeador publica
// `nomes` dentro de outro papel — divergência que compila, passa no typecheck e
// só aparece como cláusula em branco no .docx do cliente.
//
// O segundo cenário é o que a fatia 3 existe para garantir: sociedade SEM ônus
// não publica nenhum dos três blocos, e a numeração do contrato sai sem buraco.

const PARAGRAFO_GRAVAMES = 'As quotas adiante indicadas encontram-se gravadas, nos termos dos instrumentos que as constituíram, permanecendo os gravames enquanto não forem expressamente revogados ou extintos: {{#gravamesVigentes sep="; " fim="; e "}}{{ gravame.quotas }} ({{ gravame.quotasExtenso }}) quotas de titularidade de *{{ nuProprietario.nomeMaiusculo }}*, com {{ gravame.nomes }}{{/gravamesVigentes}}.';

const CLAUSULA_USUFRUTO = `Sobre as quotas sujeitas a usufruto, a propriedade e o exercício do direito de voto ficam distribuídos na forma do quadro abaixo, cabendo à pessoa usufrutuária o voto das quotas em que figura, nos termos do artigo 114 da Lei nº 6.404/76, aplicado supletivamente por força do artigo 1.053, parágrafo único, do Código Civil:

| SÓCIOS | PROPRIEDADE PLENA | NUA PROPRIEDADE | USUFRUTO COM VOTO | % DE VOZ E VOTO |
| :--- | ---: | ---: | ---: | ---: |
{{#quadroUsufruto}}| {{ titular.nome }} | {{ usufruto.plena }} | {{ usufruto.nua }} | {{ usufruto.usufruto }} | {{ usufruto.pctVozEVoto }} |{{/quadroUsufruto}}

As colunas de nua propriedade e de usufruto descrevem as mesmas quotas sob direitos distintos. Havendo pessoas usufrutuárias em conjunto, no falecimento de uma delas o respectivo quinhão acrescerá à sobrevivente, nos termos do artigo 1.411 do Código Civil.`;

const PARAGRAFO_ALIENACAO = 'Enquanto vigorar o gravame de inalienabilidade, as quotas por ele atingidas não poderão ser alienadas, cedidas ou de qualquer forma oneradas, ainda que observado o procedimento desta cláusula, dependendo a transferência de prévia revogação ou extinção do gravame por quem o instituiu, ou de autorização judicial, na forma da lei. A restrição alcança {{#gravamesVigentes sep="; " fim="; e "}}{{ gravame.quotas }} ({{ gravame.quotasExtenso }}) quotas de titularidade de *{{ nuProprietario.nomeMaiusculo }}*{{/gravamesVigentes}}.';

// `obrigatorio` porque nenhum deles tem flag: é assim que o modelo real os
// grava, e é o que faz `comporBlocos` os oferecer ao descarte.
const bloco = (id: string, tipo: Bloco['tipo'], conteudo: string): Bloco => ({ id, tipo, conteudo, obrigatorio: true });

/** O trecho do consolidado em que os três ecos caem, com os vizinhos reais. */
const CONSOLIDADO: Template = {
  id: 'consolidado',
  nome: 'Contrato social consolidado (recorte)',
  blocos: [
    bloco('cap-capital', 'capitulo', 'Capital Social'),
    bloco('cl-capital', 'clausula', 'O capital social é de R$ {{ sociedade.capitalValor }}.'),
    bloco('pa-responsabilidade', 'paragrafo', 'A responsabilidade de cada sócio é restrita ao valor de suas quotas.'),
    bloco('pa-gravames', 'paragrafo', PARAGRAFO_GRAVAMES),
    bloco('cl-usufruto', 'clausula', CLAUSULA_USUFRUTO),
    bloco('cap-alienacao', 'capitulo', 'Alienação de Quotas'),
    bloco('cl-alienacao', 'clausula', 'O sócio que desejar alienar suas quotas observará o direito de preferência.'),
    bloco('pa-alienacao-gravadas', 'paragrafo', PARAGRAFO_ALIENACAO),
  ],
};

const pf = (id: string, nome: string) => ({ id, denominacao: nome, tipo_pessoa: 'PF' } as PessoaRow);
const PAI = pf('pai', 'João da Silva');
const FILHA = pf('filha', 'Maria da Silva');
const PESSOAS = new Map([[PAI.id, PAI], [FILHA.id, FILHA]]);

/** O pai doou tudo à filha e reservou o usufruto com voto, gravando as quotas. */
const ONUS: OnusParaMapear = {
  movimentoId: 'mov-1',
  nuProprietarioId: FILHA.id,
  usufrutuarioIds: [PAI.id],
  usufrutoOrigem: 'reserva',
  comVoto: true,
  quotas: 1000,
  gravames: ['inalienabilidade', 'impenhorabilidade', 'incomunicabilidade'],
};
const QUADRO: SocioParaMapear[] = [
  { pessoa: FILHA, quotas: 1000, vlr_total: 1000, representante: null },
];

function comporCom(onus: OnusParaMapear[]) {
  const estado = mapearEstadoDosOnus(onus, QUADRO, (id) => PESSOAS.get(id), 1000);
  const contexto: Contexto = {
    sociedade: { capitalValor: '1.000,00' },
    gravamesVigentes: estado.gravamesVigentes,
    quadroUsufruto: estado.quadroUsufruto,
  };
  return { estado, composicao: gerarComposicao(CONSOLIDADO, contexto) };
}

describe('os três ecos do ônus no contrato consolidado', () => {
  it('com ônus vigente, os três blocos entram e nomeiam quotas, gravames e voto', () => {
    const { estado, composicao } = comporCom([ONUS]);
    expect(estado.problemas).toEqual([]);
    expect(composicao.descartados).toEqual([]);

    const por = (id: string) => composicao.blocos.find((b) => b.id === id)!.conteudo;

    expect(por('pa-gravames')).toContain(
      '1.000 (mil) quotas de titularidade de *MARIA DA SILVA*, com INALIENABILIDADE, IMPENHORABILIDADE, INCOMUNICABILIDADE',
    );

    // A filha tem as quotas e não vota; o pai não tem quota nenhuma e vota tudo.
    // As duas linhas existem, e o percentual é o do VOTO, não o do capital.
    const usufruto = por('cl-usufruto');
    expect(usufruto).toContain('| Maria da Silva | 0 | 1.000 | 0 | 0,0000 |');
    expect(usufruto).toContain('| João da Silva | 0 | 0 | 1.000 | 100,0000 |');

    expect(por('pa-alienacao-gravadas')).toContain('alcança 1.000 (mil) quotas de titularidade de *MARIA DA SILVA*');
  });

  it('a numeração conta os três: a cláusula de usufruto é autônoma', () => {
    const { composicao } = comporCom([ONUS]);
    const por = (id: string) => composicao.blocos.find((b) => b.id === id)!.conteudo;
    expect(por('cl-capital')).toMatch(/^\*CLÁUSULA PRIMEIRA:\*/);
    expect(por('pa-gravames')).toMatch(/^\*Parágrafo Segundo:\*/);
    expect(por('cl-usufruto')).toMatch(/^\*CLÁUSULA SEGUNDA:\*/);
    expect(por('cl-alienacao')).toMatch(/^\*CLÁUSULA TERCEIRA:\*/);
    // Único parágrafo da cláusula de alienação: o rótulo tem de dizer isso.
    expect(por('pa-alienacao-gravadas')).toMatch(/^\*Parágrafo Único:\*/);
  });

  it('sociedade sem ônus não publica nenhum dos três, e a numeração não fica com buraco', () => {
    const { estado, composicao } = comporCom([]);
    expect(estado).toEqual({ quadroUsufruto: [], gravamesVigentes: [], problemas: [] });

    expect(composicao.descartados.map((d) => [d.id, d.motivo])).toEqual([
      ['pa-gravames', 'lista-vazia'],
      // 'lista-vazia', não 'tabela-vazia': o laço não produziu item nenhum, e
      // esse motivo é mais específico do que o corpo da tabela ter saído vazio.
      ['cl-usufruto', 'lista-vazia'],
      ['pa-alienacao-gravadas', 'lista-vazia'],
    ]);
    const por = (id: string) => composicao.blocos.find((b) => b.id === id)!.conteudo;
    expect(por('cl-capital')).toMatch(/^\*CLÁUSULA PRIMEIRA:\*/);
    expect(por('pa-responsabilidade')).toMatch(/^\*Parágrafo Único:\*/);
    expect(por('cl-alienacao')).toMatch(/^\*CLÁUSULA SEGUNDA:\*/);
  });
});

type Campos = Record<string, string>;

// Resolução da AC, cópia literal de `20260910212126_resolucao_doacao_quotas_usufruto.sql`.
const RESOLUCAO_USUFRUTO = `*Do usufruto e do direito de voto.* Considerando as reservas de usufruto vigentes, a propriedade e o exercício do direito de voto sobre as quotas da sociedade ficam distribuídos da seguinte forma:

{{#quadroUsufruto sep="\\n"}}{{ usufruto.ordemRomana }}) *{{ titular.nomeMaiusculo }}*: {{ usufruto.quotas }} quotas, das quais {{ usufruto.plena }} em propriedade plena e {{ usufruto.nua }} em nua propriedade; usufruto com voto sobre {{ usufruto.usufruto }} quotas; voz e voto correspondentes a {{ usufruto.vozEVoto }} quotas ({{ usufruto.pctVozEVoto }}%).{{/quadroUsufruto}}`;

describe('usufruto conjunto do Jatobá na resolução e no consolidado', () => {
  const LUCAS = pf('lucas', 'Lucas Nogueira');
  const MARINA = pf('marina', 'Marina Salgado');
  const HEITOR = pf('heitor', 'Heitor Nogueira');
  const pessoas = new Map([LUCAS, MARINA, HEITOR].map((p) => [p.id, p]));
  const quadro: SocioParaMapear[] = [
    { pessoa: LUCAS, quotas: 1_662_451, vlr_total: 1_662_451, representante: null },
    { pessoa: MARINA, quotas: 367_166, vlr_total: 367_166, representante: null },
    { pessoa: HEITOR, quotas: 599_925, vlr_total: 599_925, representante: null },
  ];
  const onus = (usufrutuarioIds: string[]): OnusParaMapear => ({
    ...ONUS, nuProprietarioId: HEITOR.id, usufrutuarioIds, quotas: 184_716,
  });
  const compor = (usufrutuarioIds: string[]) => {
    const estado = mapearEstadoDosOnus([onus(usufrutuarioIds)], quadro, (id) => pessoas.get(id), 2_629_542);
    const template: Template = {
      id: 'jatoba',
      nome: 'Jatobá (recorte)',
      blocos: [bloco('res-usufruto', 'livre', RESOLUCAO_USUFRUTO), bloco('cl-usufruto', 'clausula', CLAUSULA_USUFRUTO)],
    };
    const composicao = gerarComposicao(template, { quadroUsufruto: estado.quadroUsufruto });
    const por = (id: string) => composicao.blocos.find((b) => b.id === id)!.conteudo;
    return { estado, resolucao: por('res-usufruto'), clausula: por('cl-usufruto') };
  };

  it('o casal cousufrutuário divide o bloco em quinhões e o voto fecha 100%', () => {
    const { estado, resolucao, clausula } = compor([LUCAS.id, MARINA.id]);
    expect(estado.problemas).toEqual([]);

    expect(clausula).toContain('| Lucas Nogueira | 1.662.451 | 0 | 92.358 | 66,7344 |');
    expect(clausula).toContain('| Marina Salgado | 367.166 | 0 | 92.358 | 17,4754 |');
    expect(clausula).toContain('| Heitor Nogueira | 415.209 | 184.716 | 0 | 15,7902 |');

    expect(resolucao).toContain('*LUCAS NOGUEIRA*: 1.662.451 quotas, das quais 1.662.451 em propriedade plena e 0 em nua propriedade; usufruto com voto sobre 92.358 quotas; voz e voto correspondentes a 1.754.809 quotas (66,7344%).');
    expect(resolucao).toContain('*MARINA SALGADO*: 367.166 quotas, das quais 367.166 em propriedade plena e 0 em nua propriedade; usufruto com voto sobre 92.358 quotas; voz e voto correspondentes a 459.524 quotas (17,4754%).');

    const pcts = estado.quadroUsufruto.map((i) => Number((i.usufruto as Campos).pctVozEVoto.replace(',', '.')));
    expect(pcts.reduce((a, p) => a + p, 0).toFixed(4)).toBe('100.0000');
  });

  it('usufruto de uma pessoa só continua com o bloco inteiro', () => {
    const { clausula } = compor([LUCAS.id]);
    expect(clausula).toContain('| Lucas Nogueira | 1.662.451 | 0 | 184.716 | 70,2467 |');
    expect(clausula).toContain('| Marina Salgado | 367.166 | 0 | 0 | 13,9631 |');
  });
});
