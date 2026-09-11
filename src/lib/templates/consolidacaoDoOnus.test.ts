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
