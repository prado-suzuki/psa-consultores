import type { DeckDaApresentacao } from '@/hooks/useGerarApresentacao';

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
  deck: DeckDaApresentacao | null;
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
    // "e", não "/": a barra sugere alternativa, e a peça reúne as duas visões.
    nome: 'Quadro Societário e Organograma',
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
    // SEM "PAPÉIS DE TRABALHO", por decisão da revisão de 18/09/2026: papel de
    // trabalho é material interno de apoio, e o que chega ao cliente são as
    // premissas e as análises tributárias. O nome interno não acompanha —
    // `PapeisDeTrabalhoReport`, `useDomainPapelDeTrabalho` e `wp_apresentacao`
    // ficam como estão.
    nome: 'Planejamento Tributário',
    // Os assuntos que o arquivo entrega, na ordem em que o cliente os vê.
    // Saiu o ", por revisão": qual revisão vai é a linha de baixo, e dizê-lo
    // aqui duplicava o que o seletor já mostra.
    //
    // ERAM QUATRO ATÉ 21/09/2026, quando o padrão visual novo entrou: o capítulo
    // ganhou os cenários avaliados e as diferenças entre os modelos de
    // exploração, e perdeu as caixas de comentário por tributo.
    origem: 'Premissas, cenários, diferenças dos modelos, carga tributária, transferência e resumo.',
    deck: null,
    geraSlides: true,
  },
  // AS DUAS ERAM UMA: a "Abertura de Demanda" trazia o diagrama e a tabela
  // grudados, e saíam sempre juntos. Separadas, cada uma se marca, se vê e se
  // imprime por si. O que as unia era o DESTINATÁRIO — as duas vão no mesmo
  // pacote para a área Fiscal —, e isso é dito uma vez na aba.
  {
    id: 'terras',
    // Sem "Relação de", que não acrescentava significado ao título.
    nome: 'Terras e áreas exploradas',
    // A ORIGEM ANTERIOR PROMETIA CONTRATO SEMPRE. Sem registro em
    // `exploracao_rural` a tabela cai para as matrículas e mostra 6 colunas em
    // vez de 13 — outorgante, prazos e sacas/ha somem. O texto agora descreve o
    // que existe sempre e condiciona o resto.
    origem:
      'Imóveis rurais explorados, com matrícula, localização, áreas e, quando houver, dados do instrumento de exploração.',
    deck: null,
  },
  {
    id: 'estrutura',
    nome: 'Produtores por imóvel e origem da posse',
    // SEM FECHAR A LISTA DE ORIGENS. A revisão sugeria "…se a posse é própria,
    // parceria ou arrendamento", mas `origemDe` (EstruturaAtual.tsx) devolve
    // CINCO — própria, parceria, arrendamento, posse e o "a definir" —, e o
    // subtítulo mentiria no primeiro cliente com composse. As categorias
    // aparecem na legenda do desenho, que é onde elas cabem.
    origem: 'Veja quem explora cada imóvel e qual é a origem da posse.',
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
