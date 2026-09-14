import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import { arquivosDeCodigo, medirCorCrua, PASTAS_DE_TELA } from '@/lib/medirCorCrua';
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
 *   `.mc` no `index.css`), que pinta `var(--bd-surface)` — e `--bd-surface` é
 *   `hsl(var(--card))`. Ou seja: os cartões do Board continuam brancos, e essa
 *   divergência é REAL e está aberta. Não entrou nesta passada porque mexer no
 *   `--bd-surface` muda o Board inteiro de uma vez, e o Board tem medições
 *   próprias contra o branco (ver a nota do `--bd-*` no `index.css`).
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

/** O raio que faz de uma caixa um OBJETO. `rounded-full` (pílula) e
    `rounded`/`rounded-sm` (chip, bloco de código) ficam de fora de propósito. */
const CAIXA_ARREDONDADA = /\brounded-(?:md|lg|xl|2xl|3xl)\b/;

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
 * As linhas do arquivo, cada uma somada à EXPRESSÃO DE CLASSE que a contém.
 *
 * Sem isto a catraca lê linha a linha, e o `KpiHero` prova por que isso não
 * basta: ele abre `cn(` numa linha, declara `rounded-2xl` na seguinte e
 * `bg-card` três linhas abaixo. Linha a linha, o cartão que faz a massa branca
 * do meio do Dashboard — oito deles — passa invisível pela catraca que existe
 * para achá-lo.
 *
 * O recorte é o `className=` inteiro, incluindo `cn()` multilinha e template
 * literal. O teto de 2000 caracteres existe para um `{` desbalanceado dentro de
 * string não engolir o arquivo até o fim.
 */
function linhasComAExpressaoDeClasse(texto: string): string[] {
  const linhas = texto.split('\n');
  const contexto = linhas.slice();
  const inicioDaLinha: number[] = [];
  let offset = 0;
  for (const linha of linhas) {
    inicioDaLinha.push(offset);
    offset += linha.length + 1;
  }
  const linhaDe = (pos: number) => {
    let i = inicioDaLinha.length - 1;
    while (i > 0 && inicioDaLinha[i] > pos) i--;
    return i;
  };

  const abertura = /className\s*=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = abertura.exec(texto))) {
    const inicio = m.index + m[0].length;
    const fim = fimDaExpressao(texto, inicio);
    if (fim === null) continue;
    const trecho = texto.slice(inicio, fim).replace(/\s+/g, ' ');
    for (let l = linhaDe(inicio); l <= linhaDe(fim - 1); l++) {
      contexto[l] = `${linhas[l]} ${trecho}`;
    }
    abertura.lastIndex = fim;
  }
  return contexto;
}

/** O fim da expressão que começa em `inicio`: chaves balanceadas, ou a aspa de fechar. */
function fimDaExpressao(texto: string, inicio: number): number | null {
  const TETO = 2000;
  const primeiro = texto[inicio];
  if (primeiro === '"' || primeiro === "'" || primeiro === '`') {
    const fim = texto.indexOf(primeiro, inicio + 1);
    return fim === -1 || fim - inicio > TETO ? null : fim + 1;
  }
  if (primeiro !== '{') return null;
  let profundidade = 0;
  for (let i = inicio; i < texto.length && i - inicio < TETO; i++) {
    if (texto[i] === '{') profundidade++;
    else if (texto[i] === '}') {
      profundidade--;
      if (profundidade === 0) return i + 1;
    }
  }
  return null;
}

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
function medirCaixaBranca(): Record<string, number> {
  const medido: Record<string, number> = {};
  for (const pasta of PASTAS_DE_TELA) {
    for (const caminho of arquivosDeCodigo(resolve(RAIZ, pasta))) {
      const texto = readFileSync(caminho, 'utf8');
      const contexto = linhasComAExpressaoDeClasse(texto);
      let achados = 0;
      texto.split('\n').forEach((linha, i) => {
        if (!CAIXA_ARREDONDADA.test(contexto[i])) return;
        achados += linha.match(CARTAO_CRU)?.length ?? 0;
      });
      if (achados) medido[relative(RAIZ, caminho).split(sep).join('/')] = achados;
    }
  }
  return medido;
}

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
  },
  'sobre-o-rebaixado': {
    'src/components/acessos/DashboardsTab.tsx': 2,
    'src/components/dashboards/DashboardOverviewDialog.tsx': 1,
    'src/components/equipe/dev/efd-export/EFDRecordSelector.tsx': 2,
    'src/components/equipe/osg/montagem/BlocoMontadoCard.tsx': 1,
  },
  'dentro-do-cartao': {
    // As quatro do `DailyQuickStatusDialog` são três motivos no mesmo arquivo (o
    // corpo do modal é `bg-muted/60`, e dentro dele há cartão, pílula e
    // esqueleto). Entrada de arquivo é única por construção — ver o teste
    // "nenhum arquivo aparece em dois motivos" —, então ela mora no motivo que
    // explica a maioria e o resto está escrito aqui.
    'src/components/equipe/daily/DailyQuickStatusDialog.tsx': 4,
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
  'src/components/equipe/processos/ProcessStagesTab.tsx': 1,
  'src/pages/gestao/GestaoContatos.tsx': 1,

  // GAVETA. `SheetContent` também é `bg-background`.
  'src/components/equipe/fiscal/tasks/TaskCalendar.tsx': 1,
  'src/components/sprint/SprintCalendar.tsx': 1,

  // POPOVER. `bg-popover`, que tem valor próprio e continua branco.
  'src/components/comentarios/feed/FeedFiltros.tsx': 1,
  'src/components/equipe/dev/pis-cofins/ColumnFilterDropdown.tsx': 1,
  'src/components/notifications/NotificationPopover.tsx': 4,

  // CAIXA QUE FICOU BRANCA, e cada uma por um motivo já inventariado acima: o
  // relatório é papel, o aviso do chamado se apoia em `bg-background`. Os dois
  // últimos são DÍVIDA e não decisão: a caixa que os segura está pintada
  // `bg-white` cru, que nem a catraca de `bg-card` nem a de cor crua pegam.
  'src/components/equipe/osg/relatorios/PapeisDeTrabalhoReport.tsx': 1,
  'src/pages/cliente/NovoChamado.tsx': 1,
  'src/components/equipe/mapeamento/AreaAccordion.tsx': 1,
  'src/pages/equipe/dev/MapaNCMPisCofins.tsx': 1,

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
