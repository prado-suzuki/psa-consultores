/**
 * Catálogo e semente do Acordo de Quotistas (GOV-03).
 *
 * Mesmo papel do `orgaosGovernancaPadrao.ts`: guarda o que é padrão e as funções
 * puras em volta dele. Quando o consultor cria um acordo, a tela lê daqui e já
 * grava as sete linhas de quórum preenchidas, em vez de abrir uma tabela vazia.
 *
 * POR QUE AQUI E NÃO NO BANCO. Os valores abaixo saíram de medição nos sete
 * acordos do acervo, e a consultoria ainda vai confirmá-los. Em código, a
 * resposta dela é a edição de uma linha; como seed de migration, seria outra
 * migration. Acordo já criado não muda: os valores dele já são dados do cliente.
 *
 * O que foi medido, e onde:
 * - Os sete quóruns saem do `VF_Modelo Acordo de Quotistas`, cláusulas Quarta
 *   (aumento de capital), Nona (o voto, alíneas a a e) e Vigésima Quarta
 *   (reuniões prévias). A instalação da Reunião de Sócios é o art. 1.074 do
 *   Código Civil, que o bloco de contrato já transcreve.
 * - Os dez mecanismos aparecem no modelo, e a contagem ao lado de cada um diz em
 *   quantos dos sete acordos ele aparece de fato.
 */

import { cardinalExtenso } from '@/lib/templates/extenso';

/** As chaves são as mesmas do CHECK de `acordo_quorum.chave`. */
export type ChaveQuorum =
  | 'instalacao'
  | 'ordinaria'
  | 'alterar_contrato_social'
  | 'nomear_administrador_nao_socio'
  | 'destituir_administrador'
  | 'aumento_de_capital'
  | 'reuniao_previa';

export type TipoQuorum = 'maioria' | 'percentual' | 'unanimidade';

/** Sobre o que o percentual conta. */
export type BaseQuorum = 'presentes' | 'capital';

export interface QuorumPadrao {
  chave: ChaveQuorum;
  /** O assunto, como o consultor lê na tela. */
  materia: string;
  tipo: TipoQuorum;
  /** Só quando o tipo é `percentual`, como o CHECK da tabela exige. */
  percentual?: number;
  base: BaseQuorum;
}

/**
 * Os sete, na ordem em que a tela os mostra: primeiro o que faz a reunião
 * acontecer, depois o que aprova cada assunto, e por fim a reunião prévia.
 *
 * PENDENTE DA CONSULTORIA em 14/09. Perguntado à Anne se confirma os sete e se o
 * percentual conta sobre os presentes ou sobre o capital. O três quartos para
 * alterar o contrato social já foi aprovado pelo Bernardo, e não é preferência do
 * escritório: é o quórum que o Código Civil manda.
 */
export const QUORUNS_PADRAO: readonly QuorumPadrao[] = [
  {
    chave: 'instalacao',
    materia: 'Para a reunião de sócios poder começar',
    tipo: 'percentual',
    percentual: 75,
    // Sobre o capital, e não sobre os presentes: contar presentes para decidir se
    // há presentes suficientes seria circular.
    base: 'capital',
  },
  {
    chave: 'ordinaria',
    materia: 'Assunto comum, sem regra própria',
    tipo: 'maioria',
    base: 'presentes',
  },
  {
    chave: 'alterar_contrato_social',
    materia: 'Alterar o contrato social',
    tipo: 'percentual',
    percentual: 75,
    base: 'presentes',
  },
  {
    chave: 'nomear_administrador_nao_socio',
    materia: 'Nomear administrador que não é sócio',
    tipo: 'percentual',
    // Dois terços. O modelo escreve "2/3", e é `expressaoDoQuorum` que devolve a
    // fração; guardar 66,67 é só para a conta que um dia existir.
    percentual: 66.67,
    base: 'presentes',
  },
  {
    chave: 'destituir_administrador',
    materia: 'Destituir administrador',
    tipo: 'maioria',
    base: 'presentes',
  },
  {
    chave: 'aumento_de_capital',
    materia: 'Aumento de capital',
    tipo: 'percentual',
    percentual: 75,
    // "¾ das QUOTAS", e não dos presentes. O modelo troca de base aqui.
    base: 'capital',
  },
  {
    chave: 'reuniao_previa',
    materia: 'Reunião prévia',
    tipo: 'maioria',
    // "a maioria das QUOTAS", cláusula Vigésima Quarta. Base diferente da escada
    // da reunião de sócios, e é por isso que a base é campo e não escolha global.
    base: 'capital',
  },
];

/* --- Os mecanismos ---------------------------------------------------------- */

export type ChaveMecanismo =
  | 'preferencia'
  | 'arbitragem'
  | 'nao_concorrencia'
  | 'lock_up'
  | 'tag_along'
  | 'drag_along'
  | 'opcao_compra'
  | 'opcao_venda'
  | 'usufruto'
  | 'quarentena';

/**
 * Onde o mecanismo é REALMENTE respondido, quando não é na lista.
 *
 * Quatro dos dez já têm interruptor próprio noutro bloco, com os detalhes
 * pendurados nele: a não concorrência tem prazo, área e multa; a opção de compra
 * tem quem e por quanto; a arbitragem tem a câmara. Perguntar de novo aqui cria
 * duas respostas para o mesmo fato, e a que sobrar discordando produz cláusula
 * com cabeçalho e corpo em branco.
 *
 * Então estes quatro viram ESPELHO: mostram o estado, dizem onde se muda, e não
 * aceitam clique. O motor segue a mesma regra, em `vocabulario.ts`.
 */
export interface EspelhoDoMecanismo {
  /** O bloco que manda, para a tela dizer onde mexer. */
  bloco: string;
  /**
   * A chave do grupo, para a linha LEVAR até lá.
   *
   * Dizer onde se muda e não levar deixava a pessoa procurando o bloco no meio
   * de oito: quem clica numa caixa travada quer justamente chegar ao
   * interruptor, e é esse o clique que a linha passa a honrar.
   */
  grupo: string;
  /** Lê o interruptor de verdade nos valores do acordo. */
  ligado: (v: Record<string, unknown>) => boolean;
}

export interface Mecanismo {
  chave: ChaveMecanismo;
  rotulo: string;
  /** O que ele faz, em uma frase, para a ajuda da tela. */
  explicacao: string;
  /** Em quantos dos sete acordos do acervo ele aparece. */
  emQuantosAcordos: number;
  /** Vem marcado num acordo novo? PENDENTE da consultoria. */
  padrao: boolean;
  /** Preenchido nos quatro que se respondem noutro bloco. */
  espelha?: EspelhoDoMecanismo;
}

/**
 * Os dez, do mais comum para o menos.
 *
 * `padrao` está PROVISÓRIO: hoje reflete só a medição, marcando o que aparece em
 * seis ou sete dos acordos. Perguntado à Anne em 14/09 quais devem vir marcados
 * para cliente novo, porque aparecer em cinco de sete pode ser padrão que dois
 * clientes recusaram ou opcional que cinco pediram, e isso a contagem não diz.
 *
 * Cada um liga uma cláusula inteira do documento gerado, como `entra_no_contrato`
 * faz com o órgão. Desmarcado, a cláusula não aparece.
 */
export const MECANISMOS: readonly Mecanismo[] = [
  {
    chave: 'preferencia',
    rotulo: 'Direito de preferência',
    explicacao: 'Antes de vender para um estranho, tem que oferecer aos outros sócios.',
    emQuantosAcordos: 7,
    padrao: true,
  },
  {
    chave: 'arbitragem',
    rotulo: 'Arbitragem',
    explicacao: 'Briga não vai para o juiz, vai para uma câmara privada.',
    emQuantosAcordos: 7,
    padrao: true,
    espelha: {
      bloco: 'Solução de conflitos',
      grupo: 'conflitos',
      ligado: (v) => v.solucao_litigios === 'arbitragem',
    },
  },
  {
    chave: 'nao_concorrencia',
    rotulo: 'Não concorrência',
    explicacao: 'O sócio não pode montar negócio igual, nem através de parente.',
    emQuantosAcordos: 6,
    padrao: true,
    espelha: {
      bloco: 'Saída de sócio e preferência',
      grupo: 'saida',
      ligado: (v) => v.nao_concorrencia === true,
    },
  },
  {
    chave: 'lock_up',
    rotulo: 'Lock-up',
    explicacao: 'Um período em que ninguém pode vender, nem para os outros sócios.',
    emQuantosAcordos: 5,
    padrao: false,
  },
  {
    chave: 'tag_along',
    rotulo: 'Tag along',
    explicacao:
      'Se o majoritário vender, o minoritário pode exigir ser comprado junto, pelo mesmo preço.',
    emQuantosAcordos: 5,
    padrao: false,
  },
  {
    chave: 'drag_along',
    rotulo: 'Drag along',
    explicacao: 'Se o majoritário vender, ele pode obrigar o minoritário a vender junto.',
    emQuantosAcordos: 5,
    padrao: false,
  },
  {
    chave: 'opcao_compra',
    rotulo: 'Opção de compra',
    explicacao: 'Alguém tem o direito de exigir que outro lhe venda a participação.',
    emQuantosAcordos: 5,
    padrao: false,
    espelha: {
      bloco: 'Opções de compra e venda',
      grupo: 'opcoes',
      ligado: (v) => v.opcao_compra_prevista === true,
    },
  },
  {
    chave: 'usufruto',
    rotulo: 'Usufruto com direito de voto',
    explicacao:
      'A quota se divide entre quem é dono e quem colhe os frutos, e só um dos dois vota.',
    emQuantosAcordos: 5,
    padrao: false,
  },
  {
    chave: 'opcao_venda',
    rotulo: 'Opção de venda',
    explicacao: 'O sócio tem o direito de exigir que os outros comprem a parte dele.',
    emQuantosAcordos: 3,
    padrao: false,
    espelha: {
      bloco: 'Opções de compra e venda',
      grupo: 'opcoes',
      ligado: (v) => v.opcao_venda_prevista === true,
    },
  },
  {
    chave: 'quarentena',
    rotulo: 'Quarentena',
    explicacao: 'Quem sai fica um tempo sem poder concorrer nem voltar.',
    emQuantosAcordos: 3,
    padrao: false,
  },
];

/** Os que um acordo novo já nasce com. */
export function mecanismosPadrao(): ChaveMecanismo[] {
  return MECANISMOS.filter((m) => m.padrao).map((m) => m.chave);
}

/**
 * A lista de mecanismos com os quatro espelhados forçados ao interruptor.
 *
 * Roda no SALVAR, e não na tela, de propósito: o interruptor da opção de compra
 * está noutro bloco, e quem o desligasse ali deixaria a marcação velha no banco
 * se a correção só acontecesse ao abrir a lista. Passando por aqui, não importa
 * qual bloco foi editado — o que vai ao banco é sempre coerente.
 *
 * O que a pessoa marcou nos outros seis é respeitado integralmente.
 */
export function mecanismosCoerentes(
  marcados: readonly string[] | null | undefined,
  valores: Record<string, unknown>,
): string[] {
  const manuais = (marcados ?? []).filter(
    (chave) => !MECANISMOS.some((m) => m.chave === chave && m.espelha),
  );
  const espelhados = MECANISMOS
    .filter((m) => m.espelha?.ligado(valores))
    .map((m) => m.chave as string);

  // A ordem do catálogo, para o array no banco não depender da ordem do clique.
  const todos = new Set([...manuais, ...espelhados]);
  return MECANISMOS.map((m) => m.chave as string).filter((c) => todos.has(c));
}

/* --- Como o quórum se escreve ----------------------------------------------- */

/*
 * AS FRAÇÕES QUE O DOCUMENTO ESCREVE COMO FRAÇÃO, E SÃO DUAS.
 *
 * Esta tabela já esteve errada, e vale registrar como, porque o erro passou por
 * um teste que eu mesmo escrevi. Ela trazia 75, 50 e 25 também, e mandava
 * escrever "¾ (três quartos)" para o quórum de alteração do contrato. Medido nas
 * alíneas do modelo da casa, é o contrário:
 *
 *   Conforme decidam 75% (setenta e cinco por cento) dos VOTOS dos QUOTISTAS…
 *   Conforme decidam 2/3 (dois terços) dos VOTOS dos QUOTISTAS presentes…
 *   Conforme decidam todos os QUOTISTAS…
 *   Conforme decidam a maioria dos VOTOS dos QUOTISTAS presentes…
 *
 * O critério que explica as duas formas: o documento escreve PORCENTAGEM quando
 * ela fecha em número redondo, e FRAÇÃO quando não fecha. 75%, 50% e 25% fecham;
 * dois terços viraria "66,67%", e ninguém escreve quórum com duas casas. Daí
 * sobrarem só as duas de baixo.
 *
 * O SÍMBOLO `¾` NÃO APARECE EM DOCUMENTO NENHUM do acervo. Onde a fração de três
 * quartos é usada, no Luizão, ela sai como "3/4 (três quartos)". Foi invenção
 * minha ao escrever a função.
 *
 * NÃO É COLUNA NO BANCO, e chegou a ser cogitada. O número já basta para achar a
 * linha aqui. A perda é que 66,67 não é dois terços exatos, o que só importaria
 * numa conta de quórum que ainda não existe, com erro de 0,003 ponto percentual.
 *
 * O `simbolo` e o `extenso` andam juntos porque o documento escreve os dois, e o
 * parêntese tem de soletrar o que está à esquerda: "2/3 (dois terços)" está
 * certo e "67% (dois terços)" está errado.
 */
const FRACOES: readonly { percentual: number; simbolo: string; extenso: string }[] = [
  { percentual: 66.67, simbolo: '2/3', extenso: 'dois terços' },
  { percentual: 33.33, simbolo: '1/3', extenso: 'um terço' },
];

/**
 * "60% (sessenta por cento)", que é a forma do contrato.
 *
 * Só soletra quando o valor é inteiro: "87,5% (oitenta e sete vírgula cinco por
 * cento)" ninguém escreve, então o quebrado sai só com o símbolo.
 */
function porcentagem(valor: number): string {
  const simbolo = `${valor.toString().replace('.', ',')}%`;
  return Number.isInteger(valor)
    ? `${simbolo} (${cardinalExtenso(valor)} por cento)`
    : simbolo;
}

const BASE_EM_PROSA: Record<BaseQuorum, string> = {
  presentes: 'dos presentes',
  capital: 'do capital social',
};

/**
 * Como este quórum se escreve no documento.
 *
 * "a maioria dos presentes", "¾ (três quartos) do capital social", "todos os
 * quotistas".
 *
 * SÍMBOLO MAIS EXTENSO ENTRE PARÊNTESES no caso numérico, que é como os sete
 * acordos escrevem e como o motor já escreve o resto ("03 (três) membros"). O
 * modelo traz as duas grafias para o mesmo 75, "¾ (três quartos)" na cláusula do
 * aumento de capital e "75% (setenta e cinco por cento)" na escada do voto; a
 * fração ganha por ser a que o escritório usa nas frações redondas.
 *
 * A base entra na frase porque ela muda o sentido: três quartos dos presentes e
 * três quartos do capital são coisas diferentes numa segunda convocação, que
 * instala com qualquer número.
 */
export function expressaoDoQuorum(q: {
  tipo: TipoQuorum;
  percentual?: number | null;
  base: BaseQuorum;
}): string {
  if (q.tipo === 'unanimidade') return 'todos os quotistas';
  if (q.tipo === 'maioria') return `a maioria ${BASE_EM_PROSA[q.base]}`;
  return `${quantidadeDoQuorum(q)} ${BASE_EM_PROSA[q.base]}`;
}

/**
 * SÓ A QUANTIDADE, sem a base: "75% (setenta e cinco por cento)", "a maioria".
 *
 * É o que o DOCUMENTO pede, e a diferença não é estética. A alínea do modelo
 * escreve "Conforme decidam 75% (setenta e cinco por cento) dos VOTOS dos
 * QUOTISTAS presentes nas REUNIÕES DE QUOTISTAS, REUNIÕES PRÉVIAS e/ou REUNIÃO
 * DE SÓCIOS": a base já está ali, com as palavras da cláusula. Encaixar a
 * expressão inteira produziria "75% dos presentes dos VOTOS dos QUOTISTAS
 * presentes".
 *
 * A tela continua mostrando a expressão completa, que é o que faz sentido para
 * quem confere uma linha isolada.
 */
export function quantidadeDoQuorum(q: {
  tipo: TipoQuorum;
  percentual?: number | null;
}): string {
  if (q.tipo === 'unanimidade') return 'todos os QUOTISTAS';
  if (q.tipo === 'maioria') return 'a maioria';
  const valor = q.percentual ?? 0;
  const fracao = FRACOES.find((f) => f.percentual === valor);
  return fracao ? `${fracao.simbolo} (${fracao.extenso})` : porcentagem(valor);
}

/**
 * A MESMA QUANTIDADE EM FRAÇÃO, para o único lugar que a escreve assim.
 *
 * O modelo é inconsistente consigo mesmo, e reproduzir isso é ser fiel a ele:
 * os mesmos 75% saem "75% (setenta e cinco por cento)" na escada do voto e
 * "¾ (três quartos) das QUOTAS" no aumento de capital. Por isso `FRACOES` não
 * traz o 3/4 (senão a escada passaria a escrever a fração), e esta função o
 * conhece à parte.
 *
 * Sem fração conhecida, devolve a mesma coisa que `quantidadeDoQuorum`.
 */
const FRACOES_DO_AUMENTO: Readonly<Record<number, string>> = {
  75: '¾ (três quartos)',
  50: '½ (metade)',
  25: '¼ (um quarto)',
};

export function quantidadeDoQuorumEmFracao(q: {
  tipo: TipoQuorum;
  percentual?: number | null;
}): string {
  if (q.tipo === 'percentual') {
    const f = FRACOES_DO_AUMENTO[Math.round(q.percentual ?? 0)];
    if (f) return f;
  }
  return quantidadeDoQuorum(q);
}

/** O quórum de uma chave, do catálogo. */
export function quorumPadrao(chave: ChaveQuorum): QuorumPadrao | undefined {
  return QUORUNS_PADRAO.find((q) => q.chave === chave);
}
