import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { arquivosDeCodigo, medirCorCrua, medirEmCaixaArredondada, PASTAS_DE_TELA } from '@/lib/medirCorCrua';
import { corDoTema, hslParaRgb, luminancia, TEMAS, type Hsl } from '@/lib/paletaDeArea';

/**
 * Catraca do cartão tingido: **caixa arredondada não pinta `bg-card` na mão.**
 *
 * O DEFEITO QUE ISTO FECHA. Em 12/09/2026 a página do produto virou branca, e
 * com isso página, cartão e campo passaram a ter o MESMO valor — o que separava
 * os três era uma linha a 1,23:1. Ela mediu as três telas no navegador e a saída
 * escolhida (opção C de `docs/geral/comparacoes-de-cor/o-branco-que-sobrou.html`)
 * foi pôr a tinta NO OBJETO em vez de em volta dele: o cartão desce 35% de
 * `--muted`, o campo dentro dele fica branco, e a escada de três alturas volta —
 * invertida, com o mais claro onde a mão vai.
 *
 * Tingir o `<Card>` resolveu 392 usos em 173 arquivos numa linha — uns 84% dos
 * cartões do produto. **Mas 101 caixas arredondadas não são `<Card>`: elas
 * escrevem `bg-card` à mão**, em 72 arquivos, e a OSG responde por 25 deles.
 * Essas o componente não alcança, e é aqui que o defeito se repõe sozinho: sem
 * catraca, a caixa nova nasce branca, porque `bg-card` continua sendo uma
 * classe válida do Tailwind e continua parecendo a coisa certa a escrever.
 *
 * Das 101, **70 foram tingidas nesta passada e 31 ficaram brancas** — cada uma
 * por um dos seis motivos inventariados abaixo, e nenhum deles é "não deu
 * tempo".
 *
 * O QUE MUDOU DE NOME, e por quê. O `--card` NÃO desceu de valor. Ele pinta onze
 * cabeçalhos e barras laterais, o `SelectTrigger`, o `Input`, a pastilha ativa
 * do segmentado e a superfície de modal — descê-lo desceria o cromo do produto
 * inteiro. A superfície do OBJETO cartão ganhou nome próprio
 * (`bg-superficie-cartao`, declarado no `tailwind.config.ts`), e `bg-card` ficou
 * sendo o que sempre foi de verdade: o branco do cromo e do controle. Eram dois
 * papéis dividindo um nome só.
 *
 * ⚠️ **Estas duas classes diferem em duas letras e significam coisas opostas.**
 * É exatamente por isso que a catraca existe — a distinção não se sustenta em
 * atenção humana, e a mensagem de falha abaixo diz qual é qual.
 *
 * O QUE ESTE TESTE NÃO COBRE, de propósito:
 *
 * · **O Board.** Ele tem sistema de CSS próprio (`.v3-card`, `.v4-card`, `.kpi`,
 *   `.mc` no `index.css`), que pinta `var(--bd-surface)` em vez de passar pelo
 *   componente. A divergência que este bloco registrava — cartão do Board branco,
 *   cartão do resto tingido — FECHOU em 17/09/2026: o `--bd-surface` passou a ser
 *   o mesmo `hsl(var(--muted) / .35)`. Quem cobra o Board é a
 *   `superficieDoBoard.test.ts`, e ela cobra o que esta aqui não cobra — o SINAL
 *   do degrau, não só a razão.
 * · **A caixa de TABELA, que é decisão aberta.** A seção 6 da mesma página mede
 *   uma família inteira — 19 telas que são um aviso, um cartão de filtros e uma
 *   caixa grande com tabela ou estado vazio dentro, 90 a 99% de branco. A
 *   página renderiza as duas saídas (tabela tingida e tabela branca) e a escolha
 *   é dela. Enquanto não houver escolha, a caixa de tabela segue a regra geral:
 *   se é `<Card>`, veio tingida; se é `div` com `bg-card`, esta catraca cobra.
 *   **Se a escolha for "tabela branca", o conserto não é exceção aqui** — são 52
 *   blocos `<Card>` com tabela dentro, e o caminho está escrito na seção 8: uma
 *   variante do `<Card>`, ou a caixa da tabela deixar de ser `<Card>`.
 * · **Caixa sem raio.** `<header>` e `<aside>` pintam `bg-card` sem `rounded-*`,
 *   e estão certos: cromo não é cartão.
 * · **`rounded-full` e `rounded`/`rounded-sm`.** Pílula, chip e bloco de código
 *   não são caixa — o raio é o que separa "objeto" de "etiqueta", e o recorte é
 *   `rounded-md` para cima.
 * · **Estado.** `hover:bg-card`, `data-[state=on]:bg-card` e
 *   `disabled:hover:bg-card` descrevem o que a caixa vira, não a superfície em
 *   repouso. O prefixo antes dos dois-pontos os tira do padrão.
 */

const RAIZ = resolve(__dirname, '../..');

/**
 * `bg-card` em repouso, com ou sem alfa.
 *
 * O `(?<![\w:.-])` é o que tira `hover:bg-card` e `data-[state=active]:bg-card`:
 * variante é ESTADO, e estado de uma caixa branca continua sendo assunto de
 * quem desenhou o estado. O `(?![\w-])` impede que `bg-card-foreground` — que
 * não existe hoje, mas nasceria calado — passe por aqui.
 */
const CARTAO_CRU = /(?<![\w:.-])bg-card(?:\/\d{1,3})?(?![\w-])/g;

/**
 * Tolerância da comparação de degrau, no teste do degrau sobre o cartão.
 *
 * Hoje ela não é usada: 0.75 recompõe os três degraus EXATOS (1,112 / 1,120 /
 * 1,106 nas três áreas, na terceira casa). A folga existe para o dia em que
 * `--muted` ou o alfa do cartão se mexerem e o alfa do realce não fechar mais
 * redondo — aí o que importa é não ter perdido degrau, não empatar na quarta
 * casa. Maior que isto deixaria passar perda de verdade.
 */
const FOLGA = 0.005;

/** Um alfa escrito no fonte. Falha alto se o padrão não casar: alfa que a busca
    não acha é alfa que o teste estaria medindo de mentira. */
function alfaDeclarado(fonte: string, padrao: RegExp, onde: string): number {
  const achado = fonte.match(padrao);
  expect(achado, `não achei ${onde} — o teste não tem o que medir`).not.toBeNull();
  return Number(achado?.[1]);
}

/** `frente` sobre `fundo` com alfa, em RGB — é o que o navegador faz com `bg-x/NN`. */
function misturar(frente: number[], fundo: number[], alfa: number): [number, number, number] {
  return [0, 1, 2].map(i => frente[i] * alfa + fundo[i] * (1 - alfa)) as [number, number, number];
}

/** Razão de contraste entre dois RGB já compostos. O `contraste` do `paletaDeArea`
    recebe HSL, e superfície com alfa não volta a ser HSL. */
function razao(a: [number, number, number], b: [number, number, number]): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

/**
 * Por arquivo, quantas caixas arredondadas ainda pintam `bg-card` na mão.
 *
 * Conta a OCORRÊNCIA, e não a linha que casa: o contexto de uma expressão
 * multilinha é o mesmo em todas as linhas dela, então filtrar linha por linha
 * contava a mesma caixa uma vez por linha do `cn()` — dez para as quatro do
 * `DailyQuickStatusDialog`. O raio vem do CONTEXTO, a ocorrência vem da LINHA.
 */
/**
 * O `<Card>` NÃO entra na própria medição.
 *
 * Desde 16/09/2026 ele cita as duas superfícies: a tinta na string base e o
 * `bg-card` da variante `tabela` sobrepondo. Como o `rounded-lg` está no mesmo
 * `cn()`, ele passou a casar com o padrão "caixa arredondada pintada à mão" — mas
 * ele não é caixa desenhada à mão. É o componente que DEFINE as duas, e é
 * exatamente o que esta catraca manda usar no lugar da caixa à mão.
 * Inventariá-lo como dívida diria o contrário do que o arquivo inteiro diz.
 *
 * Ele não fica sem guarda: a asserção "o `<Card>` continua sendo a alavanca" lê
 * este arquivo à parte, e a `caixaDeTabela.test.ts` cobra a variante.
 */
const DEFINE_AS_DUAS_SUPERFICIES = 'src/components/ui/card.tsx';

const medirCaixaBranca = () =>
  medirEmCaixaArredondada(CARTAO_CRU, [DEFINE_AS_DUAS_SUPERFICIES]);

/**
 * ⚠️ Ao mexer aqui, mexa por MOTIVO e não por arquivo solto.
 *
 * Cada motivo abaixo é uma razão para a caixa continuar BRANCA depois de o
 * cartão ter descido. As 31 que ficaram, ficaram porque tingir as pioraria — e
 * seis delas (o grupo `sobre-o-rebaixado`) sumiriam da tela. Se alguma mudar de
 * contexto — o painel atrás deixa de ser `bg-muted`, o flutuante vira conteúdo —,
 * a entrada sai daqui e a caixa vai para `bg-superficie-cartao`.
 */
type MotivoDeFicarBranca =
  /** **Flutua sobre conteúdo.** A tinta do cartão tem alfa (35% de `--muted`),
      e alfa sobre conteúdo arbitrário deixa passar o que está atrás. O painel
      de chamados pendentes cai sobre a tela com `shadow-xl`; o fantasma de
      arrastar da Ficha cobre o cartão de origem com `absolute inset-0`. Os dois
      precisam de superfície OPACA, e `--card` é a opaca que existe. */
  | 'flutua-sobre-conteudo'
  /** **É controle, e não cartão.** A barra de filtros do Feed (que é o modelo da
      seção 3 da página de comparação), a barra do Montador, o campo de busca da
      lista de clientes e o botão de 28px que abre o comentário. A escada da
      opção C põe o MAIS CLARO onde a mão vai — tingir um controle é andar na
      direção contrária da decisão que este arquivo aplica. */
  | 'controle'
  /** **Apoia-se no rebaixado.** A caixa está dentro de um painel `bg-muted/60`,
      e a tinta do cartão É FEITA de `--muted`: 35% de `--muted` sobre `--muted`
      dá `--muted`. Tingir aqui não escurece a caixa, **apaga** a caixa. Este é o
      motivo mais fácil de reintroduzir por engano, porque a classe parece a
      certa e o resultado não dá erro nenhum — só some. */
  | 'sobre-o-rebaixado'
  /** **É conteúdo dentro do cartão.** A subtarefa dentro do card do Kanban, a
      linha de titularidade dentro do painel, o ato dentro da `SecaoRecolhivel`
      (que é um `<Card>`). O branco aqui é o SEGUNDO degrau da escada, e é o que
      a opção C foi buscar: campo claro dentro de cartão tingido. Se o pai
      deixar de ser cartão, estas mudam de motivo — não de cor por conta. */
  | 'dentro-do-cartao'
  /** **É papel.** As duas caixas da `FolhaDocumento` representam a folha do
      documento que vai ser gerado. Papel é branco; ali o branco é o assunto, não
      a superfície. */
  | 'folha-de-papel'
  /** **Decidido olhando, em 17/09/2026.** O cartão de conteúdo, o cabeçalho de
      resumo e a lista vazia do lote 2 da fila do `bg-white`. O candidato tingido
      estava montado ao lado, nas duas áreas, em
      `comparacoes-de-cor/o-branco-literal-das-27.html`, e ela escolheu o claro
      nos três papéis — o cabeçalho e a lista vazia com as palavras "gosto como
      tá hoje" e "prefiro como tá hoje".

      **Na OSG isso tem custo, e ele está aceito:** `--card` e `--background` da
      `.osg-theme` são o MESMO valor (`32 28% 98.5%`), então a caixa fica a
      1,000:1 contra a página e quem a segura é a borda. É o mesmo custo que a
      caixa de tabela aceitou em 16/09 — e note que o branco LITERAL de antes
      estava a 1,031:1, ou seja, a conversão perdeu separação ali. Perdeu de
      propósito: o literal não acompanha tema nem área, e era branco frio no
      meio da areia. */
  | 'claro-decidido-olhando'
  /** **É caixa de tabela.** Tabela se lê pelas linhas, e o hover de linha tem
      teto — a decisão B de 16/09/2026. Estas duas estavam FORA de `<Card>`, que
      é o recorte que fez a contagem daquele dia cair de 53 em 49 para 45 em 42,
      então a decisão alcança elas sem ter sido reaberta. A `caixaDeTabela` cobra
      a variante do `<Card>`; estas são `div`, e ficam aqui. */
  | 'caixa-de-tabela'
  /** **O aviso já foi decidido, olhando.** Em `b63d6ede` o `ui/alert.tsx` trocou
      a mancha de cor por uma faixa lateral de 4px, e o texto subiu para 14,2:1
      justamente por ficar sobre branco. Tingir o fundo do aviso reabriria uma
      medição fechada há dois dias. */
  | 'aviso-decidido';

const CAIXA_QUE_FICA_BRANCA: Record<MotivoDeFicarBranca, Record<string, number>> = {
  'flutua-sobre-conteudo': {
    'src/components/notifications/PendingTicketsAlert.tsx': 1,
    'src/components/equipe/osg/biblioteca/FichaBloco.tsx': 1,
  },
  controle: {
    'src/components/comentarios/feed/FeedFiltros.tsx': 1,
    'src/components/comentarios/feed/FeedItemComentario.tsx': 1,
    // Seis das oito abaixo são a MESMA peça repetida: a pastilha ativa de um
    // segmentado, branca sobre a canaleta rebaixada — é o `.seg span.on` que a
    // seção 3 da página de comparação desenha, e lá ela é branca. As outras duas
    // são a barra do Montador e a opção de `role="radio"` da Ficha.
    //
    // ⚠️ Elas só entraram na medição quando a catraca passou a ler a EXPRESSÃO de
    // classe: as seis moram num `cn()` em que o `rounded-md` está numa linha e o
    // `bg-card` em outra. A leitura linha a linha dava a fila por fechada.
    'src/components/equipe/clientes/ClientesFilterBar.tsx': 3,
    'src/components/equipe/fiscal/tasks/TaskModal.tsx': 1,
    'src/components/equipe/osg/documentos/classificar/FichaColuna.tsx': 1,
    'src/components/equipe/osg/montagem/MontadorWorkbench.tsx': 2,
    'src/components/equipe/projetos-cadastro/ProjetoDialog.tsx': 1,
    // ── Chegaram em 17/09/2026, do lote 1 da fila do `bg-white` ──
    //
    // Não são caixa nova: são as MESMAS caixas, que estavam escritas em branco
    // literal e passavam por esta catraca sem serem vistas — ela procura
    // `bg-card`, e `bg-white` não é `bg-card`. Trocar o literal pelo token não
    // moveu um pixel na casa (`--card` da `.base-theme` é `0 0% 100%`), e é o
    // ponto: o que elas ganharam foi acompanhar TEMA e ÁREA, que o literal não
    // faz. Na OSG, que é areia, era branco frio sobre superfície quente.
    //
    // Quatro das onze são a MESMA peça de novo — a pastilha ativa de um
    // segmentado, branca sobre a canaleta rebaixada. Com as seis que já estavam
    // acima, são DEZ cópias do mesmo controle escritas à mão em dez arquivos, e
    // isso é sinal de componente que não existe, não de dívida de cor.
    // Os dois checklists somam SEIS papéis entre eles, e não um: a pastilha
    // (lote 1), a barra de filtros, a lista vazia, o cabeçalho e o cartão (lote
    // 2). Entrada de arquivo é única por construção, então eles moram no motivo
    // da pastilha e da barra — os dois que são controle de verdade — e o resto
    // está no `claro-decidido-olhando`, que é de onde vieram.
    'src/components/cliente/ChecklistDocumentosCliente.tsx': 4,
    'src/components/cliente/checklist/LinhaPendencia.tsx': 1,
    'src/components/equipe/board/dashboard-uso-envio/GerencialFiltros.tsx': 1,
    'src/components/equipe/kanban/KanbanFilters.tsx': 1,
    'src/pages/equipe/EquipeKanban.tsx': 1,
    // Duas, e a segunda é a moldura do dashboard embutido: ali o branco é do
    // conteúdo de terceiro, que o `<iframe>` cobre inteiro. Fica no motivo do
    // botão, que é o que explica a maioria do arquivo.
    'src/components/dashboards/DashboardEmbedView.tsx': 2,
    'src/components/equipe/dev/EFDBlockTree.tsx': 1,
    'src/components/equipe/dev/calculadora-ibs-cbs/por-estado/PorEstadoUfs.tsx': 1,
    'src/components/equipe/dev/procedimentos/AddProcedimentoModal.tsx': 1,
    'src/components/equipe/kanban/KanbanBoard.tsx': 1,
    'src/components/equipe/osg/checklists/ChecklistPendentes.tsx': 5,
    'src/components/equipe/osg/documentos/classificar/ClassificarLevaDialog.tsx': 1,
    'src/components/shared/BotaoModelo.tsx': 1,
    'src/pages/equipe/osg/BibliotecaModelos.tsx': 1,
  },
  'sobre-o-rebaixado': {
    'src/components/acessos/DashboardsTab.tsx': 2,
    'src/components/dashboards/DashboardOverviewDialog.tsx': 1,
    'src/components/equipe/dev/efd-export/EFDRecordSelector.tsx': 2,
    'src/components/equipe/osg/montagem/BlocoMontadoCard.tsx': 1,
    // Do lote 1 da fila do `bg-white`, 17/09/2026. As duas são o caso puro do
    // motivo, e foram conferidas no pai: a tela de erro monta sobre
    // `bg-muted`, e o histórico do PER/DCOMP mora numa `<aside className="bg-muted">`
    // — nessa, o irmão de baixo já era `bg-muted/50`, então o par escuro/claro
    // estava escrito ali do lado e só o claro é que era literal.
    'src/components/ErrorBoundary.tsx': 1,
    'src/components/equipe/dev/perdcomp/per-detail/PerDetailSituationSidebar.tsx': 1,
  },
  'dentro-do-cartao': {
    // As quatro do `DailyQuickStatusDialog` são três motivos no mesmo arquivo (o
    // corpo do modal é `bg-muted/60`, e dentro dele há cartão, pílula e
    // esqueleto). Entrada de arquivo é única por construção — ver o teste
    // "nenhum arquivo aparece em dois motivos" —, então ela mora no motivo que
    // explica a maioria e o resto está escrito aqui.
    'src/components/equipe/daily/DailyQuickStatusDialog.tsx': 4,
    // Seis numa tela só, do lote 1 da fila do `bg-white` (17/09/2026), e é a
    // maior concentração da fila inteira. São seis `div` irmãs dentro de um
    // `<Card>` — a síntese e os cinco recortes da análise do Claude. O pai já
    // pinta gradiente de acento, então aqui o claro é o segundo degrau da
    // escada, exatamente o que este motivo descreve.
    'src/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteAnalysis.tsx': 6,
    // O `TabelasDaOs.tsx` do Adm & Fin ESTEVE AQUI, por um dia, e saiu em
    // 16/09/2026 — não porque a caixa deixou de ser branca, mas porque ela deixou
    // de ser exceção. Ele foi o único caso do repositório, e a pergunta dela ao
    // vê-lo inscrito aqui ("então não é padrão ser branco? aí tem que mudar o
    // padrão") abriu a frente que virou a variante `tabela` do `<Card>`. Quem
    // guarda o caso agora é a `caixaDeTabela.test.ts`, que cobra o contrário.
    'src/components/equipe/fiscal/tasks/kanban/TaskKanbanSubtaskRow.tsx': 1,
    'src/components/equipe/osg/diagnostico-patrimonial/titularidade/TitularidadeLinha.tsx': 1,
    'src/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/ImoveisPanel.tsx': 1,
    'src/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/PartesPanel.tsx': 1,
    'src/components/equipe/osg/quadro-societario/AtosSocietarios.tsx': 1,
    'src/components/equipe/osg/montagem/BibliotecaPalette.tsx': 1,
  },
  'folha-de-papel': {
    'src/components/equipe/osg/gerar/FolhaDocumento.tsx': 2,
  },
  'aviso-decidido': {
    'src/components/ui/alert.tsx': 1,
  },
  'claro-decidido-olhando': {
    'src/components/cliente/checklist/ResumoHero.tsx': 1,
    'src/components/equipe/dev/dashboard-uso-envio/primitivos.tsx': 1,
    // Duas no mesmo arquivo: o cartão de procedimento e o ESQUELETO dele. O
    // esqueleto não é decisão — ele acompanha o cartão que substitui, senão a
    // tela muda de cor ao terminar de carregar. Vale para o `ProcedimentosDev`,
    // que é a terceira cópia do mesmo esqueleto, numa página.
    'src/components/equipe/dev/procedimentos/ProcedimentoCard.tsx': 2,
    'src/components/equipe/mapeamento/AreaAccordion.tsx': 1,
    'src/components/equipe/osg/gerar/PainelConferencia.tsx': 2,
    'src/components/equipe/osg/onboarding/OnboardingEmptyState.tsx': 1,
    'src/components/equipe/osg/onboarding/onboardingKit.ts': 2,
    'src/components/ui/onboarding-checklist.tsx': 1,
    'src/pages/Ajuda.tsx': 1,
    'src/pages/equipe/EquipeSprintDetalhes.tsx': 1,
    'src/pages/equipe/dev/ProcedimentosDev.tsx': 1,
  },
  'caixa-de-tabela': {
    'src/pages/equipe/EquipeRelatorios.tsx': 1,
    'src/pages/equipe/dev/MapaNCMPisCofins.tsx': 1,
  },
};

/**
 * O `bg-muted/50` que FICA, agrupado pelo MOTIVO de ter ficado.
 *
 * Dos 66 lugares que pintavam `bg-muted/50` em 12/09/2026, 41 se apoiavam em
 * cartão e viraram `bg-superficie-realce`. Estes 25 não se apoiam, e o motivo é
 * sempre o mesmo: **o chão deles não se moveu quando o cartão desceu.** Modal e
 * gaveta são `bg-background`, popover é `bg-popover`, e os três continuam
 * brancos. Converter os 25 junto teria escurecido caixa que está certa — o erro
 * simétrico do que a conversão consertou.
 *
 * A asserção é de igualdade EXATA: classe nova em arquivo que não está aqui
 * derruba o teste dizendo onde. Quem acrescentar uma linha responde antes qual é
 * o fundo dela, e se o fundo for cartão a classe é a outra.
 */
const SOBRE_BRANCO: Record<string, number> = {
  // MODAL. `DialogContent` é `bg-background`, como a página: o alfa do cartão foi
  // escolhido justamente para dar o mesmo pixel nos dois, e nada aqui mudou.
  'src/components/equipe/NewClientModal.tsx': 1,
  'src/components/equipe/client-form/HistoricoTab.tsx': 1,
  'src/components/equipe/dev/EFDAnalysisModal.tsx': 1,
  'src/components/equipe/dev/EFDExportDialog.tsx': 1,
  'src/components/equipe/dev/balancete/UploadBalanceteModal.tsx': 1,
  'src/components/equipe/dev/carga-chamados/RepresentantesPendentesModal.tsx': 1,
  'src/components/equipe/dev/export-dialog/ColumnSelector.tsx': 1,
  'src/components/equipe/dev/perdcomp/per-detail/PerDetailDcompPanel.tsx': 1,
  'src/components/equipe/dev/perdcomp/per-detail/PerDetailSituationSidebar.tsx': 1,
  'src/components/equipe/osg/governanca/AcrescentarAtividadeModal.tsx': 1,
  'src/components/equipe/osg/governanca/AcrescentarItemModal.tsx': 1,
  'src/components/equipe/processos/ProcessStagesTab.tsx': 1,
  'src/pages/gestao/GestaoContatos.tsx': 1,

  // GAVETA. `SheetContent` também é `bg-background`.
  'src/components/equipe/fiscal/tasks/TaskCalendar.tsx': 1,
  'src/components/sprint/SprintCalendar.tsx': 1,

  // POPOVER. `bg-popover`, que tem valor próprio e continua branco.
  'src/components/comentarios/feed/FeedFiltros.tsx': 1,
  'src/components/equipe/dev/pis-cofins/ColumnFilterDropdown.tsx': 1,
  // As quatro linhas do sino (chamado, revisão, menção, aviso interno). Saíram do
  // `NotificationPopover.tsx` em 14/09/2026, quando o balão ganhou histórico e a
  // fachada passou do teto de 600 linhas — o fundo delas não mudou, continua o
  // `bg-popover`.
  'src/components/notifications/ItensDoSino.tsx': 4,

  // CAIXA QUE FICOU BRANCA, e cada uma por um motivo já inventariado acima: o
  // relatório é papel, o aviso do chamado se apoia em `bg-background`. Os dois
  // últimos são DÍVIDA e não decisão: a caixa que os segura está pintada
  // `bg-white` cru, que nem a catraca de `bg-card` nem a de cor crua pegam.
  'src/components/equipe/osg/relatorios/PapeisDeTrabalhoReport.tsx': 1,
  'src/pages/cliente/NovoChamado.tsx': 1,
  'src/components/equipe/mapeamento/AreaAccordion.tsx': 1,
  'src/pages/equipe/dev/MapaNCMPisCofins.tsx': 1,

  // TABELA SOBRE A PÁGINA. As duas telas da Biblioteca de Slides (17/09/2026)
  // desenham uma lista dentro de uma caixa de borda SEM tinta — `rounded-xl
  // border`, sem `bg` —, então a faixa de cabeçalho se apoia direto no
  // `bg-background` da página, não num cartão. É o mesmo chão do grupo MODAL
  // acima, pelo mesmo motivo: o alfa de hoje foi calibrado contra ele.
  'src/pages/equipe/osg/BibliotecaApresentacoes.tsx': 1,
  'src/pages/equipe/osg/Relatorios.tsx': 1,

  // CONTROLE, e aqui o papel é outro: é campo DESABILITADO. O degrau dele não é
  // contra o cartão, é contra os campos habilitados ao lado, que são brancos e
  // não mudaram. Subir o alfa aqui não conserta nada e apaga a diferença.
  'src/components/equipe/client-form/ContribuinteDadosFiscais.tsx': 1,
  'src/components/equipe/osg/diagnostico-patrimonial/matricula/MatriculaDadosTab.tsx': 1,
};

/** A classe com qualquer variante na frente (`hover:`, `md:`, `dark:`). */
const CLASSE_MUTED_50 = /\b(?:[a-z-]+:)*bg-muted\/50\b/g;

describe('cartão tingido: caixa arredondada não pinta `bg-card` na mão', () => {
  it('a caixa branca que sobrou é exatamente a que está inventariada', () => {
    const esperado = Object.fromEntries(
      Object.values(CAIXA_QUE_FICA_BRANCA).flatMap(grupo => Object.entries(grupo)),
    );
    expect(
      medirCaixaBranca(),
      'A fila da caixa branca mudou.\n'
        + '· Arquivo NOVO na medição: alguém desenhou um cartão à mão com `bg-card`.\n'
        + '  Duas saídas, nesta ordem — use o `<Card>` de `@/components/ui/card`, que já\n'
        + '  traz a tinta, o raio, a borda e a sombra; ou, se a caixa precisa ser outra\n'
        + '  tag (`section`, `article`, `li`, `button`), troque `bg-card` por\n'
        + '  `bg-superficie-cartao`. As duas classes diferem em duas letras e significam\n'
        + '  o oposto: `bg-card` é o branco do CROMO e do CONTROLE (cabeçalho, barra,\n'
        + '  campo, modal); `bg-superficie-cartao` é a superfície do OBJETO cartão.\n'
        + '· Contagem que SUBIU: mesmo caso, em arquivo que já estava na fila.\n'
        + '· Contagem que CAIU, ou arquivo que sumiu: a conversão andou. Atualize\n'
        + '  CAIXA_QUE_FICA_BRANCA neste arquivo, mantendo a entrada no grupo do MOTIVO.\n'
        + '· A caixa TEM de continuar branca? Então ela é um dos seis motivos do tipo\n'
        + '  MotivoDeFicarBranca. Entre no grupo certo, e se nenhum servir, escreva o\n'
        + '  motivo novo — a lista existe para dizer POR QUE, não para caber.',
    ).toEqual(esperado);
  });

  it('nenhum arquivo aparece em dois motivos', () => {
    // Mesma razão da `filaDoRedEmerald`: arquivo em dois grupos faz o `esperado`
    // acima somar errado, e a resposta deixa de ser única.
    const vistos = Object.values(CAIXA_QUE_FICA_BRANCA).flatMap(grupo => Object.keys(grupo));
    expect(vistos.length, 'arquivo repetido entre motivos').toBe(new Set(vistos).size);
  });

  it('o `<Card>` continua sendo a alavanca: ele pinta a superfície de cartão', () => {
    // A outra metade do contrato. A regra acima cobra as caixas escritas à mão e
    // não olha o componente — e é o componente que alcança 365 usos em 173
    // arquivos. Um `bg-card` de volta aqui devolveria o branco a 84% do produto
    // sem derrubar nenhuma das asserções acima.
    const card = readFileSync(resolve(RAIZ, 'src/components/ui/card.tsx'), 'utf8');
    expect(card, 'o `<Card>` deixou de pintar `bg-superficie-cartao`').toMatch(
      /rounded-lg border bg-superficie-cartao text-card-foreground/,
    );
  });

  it('nenhum consumidor de `<Card>` repinta o fundo por cima da tinta', () => {
    // `cn()` deixa a última classe vencer, então `<Card className="bg-card">`
    // CANCELA a tinta em silêncio — e cinco faziam isso antes desta passada, um
    // deles (`DailyFormCard`) no cartão principal de uma tela inteira. Nenhuma
    // das asserções acima pegaria: o arquivo não tem `rounded-*` nessa linha,
    // porque o raio vem do próprio `<Card>`.
    //
    // A regra de ESLint `ui/token-nao-sobrescrito` é vizinha desta asserção e
    // NÃO a substitui: ela acusa cor CRUA por cima do token (`bg-white`,
    // `bg-slate-50`) e deixa passar de propósito a sobrescrita para OUTRO token,
    // que é composição legítima — e `bg-card` é outro token. Era por essa fresta
    // que os cinco passavam. O mapa dela, esse sim, acompanha o `ui/` sozinho.
    const FUNDO_BRANCO = /(?<![\w:.-])bg-(?:card|white)(?:\/\d{1,3})?(?![\w-])/;
    const culpados: string[] = [];
    for (const pasta of PASTAS_DE_TELA) {
      for (const caminho of arquivosDeCodigo(resolve(RAIZ, pasta))) {
        const texto = readFileSync(caminho, 'utf8');
        const abertura = /<Card(?![A-Za-z])[\s\S]{0,2000}?>/g;
        let m: RegExpExecArray | null;
        while ((m = abertura.exec(texto))) {
          if (!FUNDO_BRANCO.test(m[0])) continue;
          const linha = texto.slice(0, m.index).split('\n').length;
          culpados.push(`${relative(RAIZ, caminho).split(sep).join('/')}:${linha}`);
        }
      }
    }
    expect(
      culpados,
      '`<Card>` com fundo branco no `className`. Isso cancela a tinta do\n'
        + 'componente e a caixa volta a ser branca sem ninguém ver — apague a\n'
        + 'classe em vez de trocá-la; o `<Card>` já pinta a superfície certa.\n'
        + culpados.join('\n'),
    ).toEqual([]);
  });

  it('tingir o cartão não custou o degrau que se apoia nele', () => {
    /*
     * O DEFEITO DE CLASSE, e ele já apareceu duas vezes no mesmo dia: **quando
     * uma superfície se move, todo degrau construído sobre ela se move junto, e
     * nada falha.** O `<Card>` desceu 35% de `--muted`, e o hover da linha
     * (`hover:bg-muted/50`) e a faixa de totais (`bg-muted/50`) são feitos do
     * MESMO `--muted` que agora está no fundo — os dois encolheram por tabela,
     * em toda tabela do produto, sem uma linha de código mudar.
     *
     * Esta asserção RECALCULA em vez de olhar o número: ela lê os dois alfas de
     * onde eles moram (os dois no `tailwind.config.ts`, `superficie-cartao` e
     * `superficie-realce`), lê `--card` e `--muted` de cada tema no `index.css`,
     * compõe as duas camadas e compara com o degrau que o hover tinha contra o
     * cartão BRANCO. É a mesma forma do `rebaixar(--canvas)`: quem mexer em
     * qualquer uma das quatro peças ouve, e não precisa saber que as quatro
     * conversam.
     *
     * Por que ler o fonte: a opacidade mora numa classe do Tailwind, então não
     * há função para chamar — é a mesma razão do `contrasteDaEscadinha.test.ts`.
     */
    const css = readFileSync(resolve(RAIZ, 'src/index.css'), 'utf8');
    const alfaDoCartao = alfaDeclarado(
      readFileSync(resolve(RAIZ, 'tailwind.config.ts'), 'utf8'),
      /'superficie-cartao':\s*'hsl\(var\(--muted\)\s*\/\s*([\d.]+)\)'/,
      'o alfa da cor `superficie-cartao` no tailwind.config.ts',
    );
    const alfaDoRealce = alfaDeclarado(
      readFileSync(resolve(RAIZ, 'tailwind.config.ts'), 'utf8'),
      /'superficie-realce':\s*'hsl\(var\(--muted\)\s*\/\s*([\d.]+)\)'/,
      'o alfa da cor `superficie-realce` no tailwind.config.ts',
    );

    const frouxos: string[] = [];
    for (const tema of TEMAS) {
      const card = corDoTema(css, tema, 'card');
      const muted = corDoTema(css, tema, 'muted');
      expect(card, `${tema}: --card não resolve`).not.toBeNull();
      expect(muted, `${tema}: --muted não resolve`).not.toBeNull();

      const branco = hslParaRgb(card as Hsl);
      const tinta = hslParaRgb(muted as Hsl);
      // Como era: hover sobre o cartão BRANCO, no alfa de hoje do componente.
      const antes = razao(misturar(tinta, branco, 0.5), branco);
      // Como está: as duas camadas, hover sobre o cartão TINGIDO.
      const tingido = misturar(tinta, branco, alfaDoCartao);
      const agora = razao(misturar(tinta, tingido, alfaDoRealce), tingido);
      if (agora < antes - FOLGA) {
        frouxos.push(
          `${tema}: hover a ${agora.toFixed(3)}:1 contra o cartão, e valia ${antes.toFixed(3)}:1`,
        );
      }
    }

    expect(
      frouxos,
      'O degrau sobre o cartão encolheu contra a superfície dele.\n'
        + 'Não conserte mexendo no cartão: quem compensa é o alfa do\n'
        + '`superficie-realce`, no `tailwind.config.ts` (hoje 0.75, calibrado\n'
        + 'exatamente para repor o que havia contra o cartão branco). As 41\n'
        + 'linhas que usam a classe acompanham o número sem serem tocadas — é\n'
        + 'para isso que ele mora num lugar só.\n'
        + frouxos.join('\n'),
    ).toEqual([]);
  });

  it('o `bg-muted/50` que sobrou não se apoia no cartão', () => {
    /*
     * O par do teste acima, e é ele que impede a correção de virar varredura
     * cega. Subir o alfa de tudo que era `bg-muted/50` teria escurecido 25
     * caixas que estão certas — o chão delas é branco e continua branco.
     *
     * O inventário é por ARQUIVO e por MOTIVO, não por linha: linha se move a
     * cada edição, e o motivo é o que a próxima pessoa precisa ler.
     */
    expect(
      medirCorCrua(CLASSE_MUTED_50),
      'Mudou quem pinta o degrau de `--muted` nas pastas de tela.\n'
        + 'Se a caixa nova se apoia em cartão, a classe é `bg-superficie-realce`:\n'
        + 'o degrau encolhe sobre o cartão, porque os dois são feitos do mesmo\n'
        + '`--muted`. Se ela se apoia em modal, gaveta ou popover, o alfa de hoje\n'
        + 'está certo — acrescente o arquivo ao inventário, no grupo do motivo.\n',
    ).toEqual(SOBRE_BRANCO);
  });

  it('a superfície do cartão é feita do `--muted`, para acompanhar a área sozinha', () => {
    // O valor mora num lugar só, e é isso que permite mudar o degrau sem
    // varredura. Feito de `--muted`, ele segue Tax, OSG e a casa sem que
    // ninguém declare três vezes — que é o defeito que o `fundoDePagina`
    // fechou nos oito layouts e o `paletaDeArea` cobra nos papéis de status.
    const config = readFileSync(resolve(RAIZ, 'tailwind.config.ts'), 'utf8');
    expect(config, 'a cor `superficie-cartao` sumiu do tailwind.config.ts').toMatch(
      /'superficie-cartao':\s*'hsl\(var\(--muted\)\s*\/\s*0?\.\d+\)'/,
    );
  });
});
