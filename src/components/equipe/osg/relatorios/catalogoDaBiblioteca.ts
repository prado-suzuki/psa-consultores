import type { DeckTipo } from '@/hooks/useGerarApresentacao';

/**
 * O que a Biblioteca de Slides guarda, e o que cada coisa gera.
 *
 * A tela nasceu como um `Select` de quatro relatórios ao lado de um menu com
 * três opções de deck, e as duas listas não conversavam: quatro entradas de um
 * lado, duas do outro, e nada dizia qual alimentava qual. Dois dos quatro não
 * viram slide nenhum — e o usuário só descobria isso tentando.
 *
 * Aqui os dois papéis ficam declarados no mesmo lugar: `deck` diz qual
 * apresentação a peça gera, e `null` diz, com todas as letras, que ela é
 * relatório de tela. É o que o `PRONTO QUANDO` da tarefa cobra — que quem abre
 * entenda o que vai para a apresentação do cliente e qual botão gera o quê.
 *
 * O SLIDE AINDA NÃO É UNIDADE, e isso é limite de escopo, não esquecimento:
 * escolher quais slides entram obrigaria a mexer na edge function, nos dois
 * templates e a criar o cadastro de quais slides existem. Cada deck continua
 * saindo inteiro.
 */

export interface PecaDaBiblioteca {
  id: string;
  /** O nome na tela. É o mesmo do cartão e do cabeçalho da peça aberta. */
  nome: string;
  /** De onde sai o conteúdo — a pergunta que o usuário faz antes de gerar. */
  origem: string;
  /**
   * O deck da apresentação da OSG que esta peça gera, quando o botão único de
   * cima a alcança. `null` quando não — o que NÃO significa que ela não gera
   * slide: ver `geraSlides`.
   */
  deck: DeckTipo | null;
  /**
   * A peça produz .pptx pelo caminho DELA, com controles próprios na tela.
   *
   * Existe porque os Papéis de Trabalho geram o deck tributário escolhendo a
   * revisão, por outra edge function. Sem esta marca eles caíam em "relatório de
   * tela" — e a tela dizia, errado, que não entram em apresentação nenhuma.
   */
  geraSlides?: boolean;
}

export const PECAS_DA_BIBLIOTECA: readonly PecaDaBiblioteca[] = [
  {
    id: 'dp',
    nome: 'Diagnóstico Patrimonial',
    origem: 'Bens, titularidades e matrículas do cadastro patrimonial.',
    deck: 'patrimonial',
  },
  {
    id: 'societario',
    nome: 'Quadro Societário / Organograma',
    origem: 'Empresas, sócios e participações do quadro societário.',
    deck: 'societaria',
  },
  {
    // GERA SLIDES, mas por outro caminho: o deck tributário sai da própria tela,
    // escolhendo a revisão do papel de trabalho, e a função que o monta
    // (`gerar-slides-tributarios`) não é a mesma do deck da OSG. Por isso
    // `deck: null` — o seletor de cima não o alcança — e `geraSlides: true`, que
    // é o que a aba usa para não tratá-lo como relatório de tela.
    id: 'papeis',
    nome: 'Papéis de Trabalho — Planejamento Tributário',
    origem: 'Premissas, carga tributária e transferência da atividade rural, por revisão.',
    deck: null,
    geraSlides: true,
  },
  // AS DUAS ERAM UMA: a "Abertura de Demanda" trazia o diagrama e a tabela
  // grudados, e saíam sempre juntos. Separadas, cada uma se marca, se vê e se
  // imprime por si. O que as unia era o DESTINATÁRIO — as duas vão no mesmo
  // pacote para a área Fiscal —, e isso é dito uma vez na aba.
  {
    id: 'terras',
    nome: 'Relação de terras exploradas',
    origem: 'Instrumentos de exploração rural, com imóvel, área cedida e prazos.',
    deck: null,
  },
  {
    id: 'estrutura',
    nome: 'Estrutura atual — produtores e imóveis',
    origem: 'Quem explora cada imóvel hoje, e por qual origem de posse.',
    deck: null,
  },
];

/**
 * O nome da peça, para o cabeçalho dela usar o MESMO texto da ficha.
 *
 * OS DOIS ERAM STRINGS SOLTAS, e derivaram. A ficha dizia "Diagnóstico
 * Patrimonial" e o cabeçalho que ela abria dizia "Quadro Patrimonial" — um
 * terceiro nome, que não era nem o do seletor nem o do módulo de origem. Nas
 * outras peças a diferença era só de caixa e de separador, o bastante para a
 * tela parecer ter mais níveis do que tem.
 *
 * Erra alto de propósito: id fora do catálogo estoura na importação do módulo,
 * não vira cabeçalho em branco na frente do cliente.
 */
export const nomeDaPeca = (id: string): string => {
  const peca = PECAS_DA_BIBLIOTECA.find((p) => p.id === id);
  if (!peca) throw new Error(`Peça "${id}" não existe no catálogo da Biblioteca de Slides.`);
  return peca.nome;
};

/**
 * A peça produz .pptx, por qualquer um dos dois caminhos.
 *
 * Existe como função, e não só como filtro, porque quem desenha a ficha precisa
 * da MESMA resposta que monta a aba. Enquanto o ícone perguntava `deck !== null`
 * por conta própria, os Papéis de Trabalho apareciam com ícone de relatório
 * dentro da aba "Slides da apresentação" — a tela se contradizia sozinha.
 */
export const viraSlide = (p: PecaDaBiblioteca): boolean => p.deck !== null || p.geraSlides === true;

/** Tudo que vira slide — pelo botão de cima ou pelos controles da própria tela. */
export const PECAS_DE_SLIDE = PECAS_DA_BIBLIOTECA.filter(viraSlide);

/** As que o botão único de cima alcança: os decks da apresentação da OSG. */
export const PECAS_COM_DECK = PECAS_DA_BIBLIOTECA.filter((p) => p.deck !== null);

/** As que ficam na tela e não viram slide nenhum. */
export const PECAS_SO_DE_TELA = PECAS_DA_BIBLIOTECA.filter((p) => !viraSlide(p));
