import type { ReactNode } from 'react';

import { AREAS } from '@/lib/nomeDaArea';

/**
 * O texto de cada tela ESPELHADA — título e subtítulo — em um lugar só.
 *
 * POR QUE ISTO EXISTE. A Tax e a OSG montam as mesmas onze telas: mesmo miolo,
 * mesmo `TituloDaPagina`, layouts irmãos. O que nunca foi compartilhado era o
 * TEXTO — ele nascia escrito à mão dentro de cada invólucro, vinte e três vezes.
 * Enquanto ninguém revisava, as duas cópias pareciam iguais; quando a revisão de
 * conteúdo de 15/09/2026 passou só pela Tax, as onze telas da OSG ficaram para
 * trás de uma vez, e a lista do que divergiu teve que virar documento.
 *
 * É o quarto caso do mesmo padrão nesta base, e os três anteriores estão
 * escritos: o fundo de página saiu dos oito layouts para o `body` depois de
 * cinco pintarem a superfície errada; o `TituloDaPagina` nasceu de seis cópias
 * idênticas mais uma já divergida; o `nomeDaArea` nasceu de nove pontos de
 * escrita para sete áreas. A frase que aqueles três deixaram é a razão deste
 * arquivo: DECISÃO REPETIDA POR ARQUIVO DIVERGE, E NÃO AVISA.
 *
 * O ESPELHO É ESTRUTURAL, NÃO UMA REGRA A LEMBRAR. O invólucro não escreve
 * texto nem escolhe área: ele nomeia a TELA (`<FiscalLayout tela="clientes">`) e
 * o layout resolve o resto, porque o layout é quem sabe de que área ele é.
 * Renomear "Lista de Chamados" passa a ser uma linha aqui, e as duas áreas
 * mudam juntas — não por convenção, por não haver outro lugar de onde puxar.
 *
 * O TEXTO É O DA TAX, e isso é a decisão, não um acaso de qual veio primeiro:
 * a Tax é a única que passou por revisão de conteúdo da coordenação, contra a
 * régua de que o subtítulo complementa o título e responde, de forma concreta,
 * o que o usuário encontra ou faz naquela tela.
 *
 * O BOARD NÃO ENTRA, e não é esquecimento. Ele compartilha o miolo de chamados,
 * mas tem registro próprio e deliberado — "Estratégico", "Projetos", "Logs",
 * "Capacidade · 14 dias · quem estoura" —, não usa o `TituloDaPagina` e monta o
 * cabeçalho dele. Espelhar a voz da Tax sobre a do Board apagaria uma decisão de
 * linguagem em vez de fechar uma divergência. As telas do OSG Work, o Controle
 * de Projetos e a Solicitação de documentos também ficam fora, por motivo mais
 * simples: não existem na Tax, então não há o que espelhar.
 *
 * COMO ACRESCENTAR UMA TELA: escreva a entrada aqui e troque `title`/`subtitle`
 * por `tela` nos dois invólucros. Se os textos das duas áreas não forem o mesmo,
 * é sinal de que ou uma delas está desatualizada, ou a tela não é espelhada.
 */

/** As áreas que espelham. Ver no cabeçalho por que o Board não está aqui. */
export type AreaEspelhada = 'tax' | 'osg';

export interface TextoDeTela {
  /** O nome da tela, no `<h1>` do cabeçalho. */
  title: string;
  /** A linha que diz o que se encontra ou se faz ali. */
  subtitle: string;
}

/**
 * A marca que o nome da área substitui.
 *
 * Só três telas a usam, e as três porque o texto NOMEIA a área ("na área Tax",
 * "à área OSG") — não porque o texto varie. O resto é literalmente o mesmo nas
 * duas, que é o ponto.
 *
 * O nome sai do `AREAS`, e não de uma tabela nova: quem responde "como esta área
 * se chama na tela" já é aquele arquivo, e duas fontes para o mesmo nome seria
 * repetir o defeito que este aqui existe para fechar.
 */
const MARCA_DA_AREA = '{AREA}';

export const TELAS_ESPELHADAS = {
  boasVindas: {
    title: `Bem-vindo à área ${MARCA_DA_AREA}`,
    subtitle: 'Escolha uma ferramenta para começar',
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: `Acompanhe os principais indicadores operacionais da área ${MARCA_DA_AREA} em tempo real.`,
  },
  clientes: {
    title: 'Clientes',
    subtitle: 'Consulte e gerencie os cadastros de clientes e contribuintes.',
  },
  projetosETarefas: {
    title: 'Projetos e tarefas',
    subtitle:
      'Acompanhe ordens de serviço, projetos, tarefas e subtarefas por status e responsável.',
  },
  projetosEmLote: {
    title: 'Criar projetos em lote',
    subtitle: 'Um projeto por produto da Ordem de Serviço',
  },
  feed: {
    title: 'Feed',
    subtitle: 'Acompanhe atualizações e conversas vinculadas aos seus projetos e tarefas.',
  },
  // "Dashboards", e não "Gerencial": Gerencial é o GRUPO do menu, e esta é a
  // primeira tela de dentro dele. Chamar as duas pelo mesmo nome era o filho com
  // o nome do pai — corrigido na Tax em 15/09/2026, e a OSG vem junto por aqui.
  dashboardsGerencial: {
    title: 'Dashboards',
    subtitle: 'Acompanhe clientes e ordens de serviço do seu cluster.',
  },
  // O par LISTA / INDICADORES é o que torna evidente que as duas telas leem o
  // mesmo conjunto de dados: uma consulta, a outra mede.
  chamadosLista: {
    title: 'Lista de Chamados',
    subtitle: 'Consulte e gerencie os chamados dos clientes da sua carteira.',
  },
  chamadosIndicadores: {
    title: 'Indicadores de Chamados',
    subtitle: 'Monitore volume, prazos, status e responsáveis pelos chamados.',
  },
  chamadoDetalhe: {
    title: 'Detalhes do Chamado',
    subtitle: 'Chamado do cliente',
  },
  produtosServicos: {
    title: 'Produtos & Serviços',
    subtitle: 'Os serviços que cada produto gera em projeto novo',
  },
  logsDeUso: {
    title: 'Logs de Uso',
    subtitle: `Acompanhe acessos, atividade, produtividade e histórico de uso do time na área ${MARCA_DA_AREA}.`,
  },
} as const satisfies Record<string, TextoDeTela>;

/** As chaves como tipo: tela inexistente vira erro de compilação. */
export type TelaEspelhada = keyof typeof TELAS_ESPELHADAS;

/**
 * As duas formas de um layout receber cabeçalho, e só uma por vez.
 *
 * `tela` é para as espelhadas; `title`/`subtitle` seguem existindo para as que
 * não são — o OSG Work, a Capacidade do Board, a Solicitação de documentos com
 * subtítulo calculado. Os `never` são o que impede o meio-termo: passar as duas
 * coisas não compila, então ninguém escreve um título à mão "só nesta" e
 * silenciosamente sai do espelho.
 */
export type TextoDoCabecalho =
  | { tela: TelaEspelhada; title?: never; subtitle?: never }
  | { tela?: never; title: string; subtitle?: ReactNode };

/** O texto de uma tela espelhada, com o nome da área já no lugar. */
export function textosDaTela(tela: TelaEspelhada, area: AreaEspelhada): TextoDeTela {
  const { title, subtitle } = TELAS_ESPELHADAS[tela];
  const nome = AREAS[area].nome;
  // `split/join` e não `replaceAll`: a marca tem chaves, que são especiais em
  // expressão regular, e isto não depende da lib do TypeScript.
  return {
    title: title.split(MARCA_DA_AREA).join(nome),
    subtitle: subtitle.split(MARCA_DA_AREA).join(nome),
  };
}

/**
 * O cabeçalho que um layout vai exibir, venha ele da tela ou escrito à mão.
 *
 * Vive aqui, e não dentro de cada layout, pelo mesmo motivo de todo o resto do
 * arquivo: são dois layouts hoje e a conta é a mesma nos dois.
 */
export function resolverCabecalho(
  texto: TextoDoCabecalho,
  area: AreaEspelhada,
): { title: string; subtitle?: ReactNode } {
  return texto.tela
    ? textosDaTela(texto.tela, area)
    : { title: texto.title, subtitle: texto.subtitle };
}
