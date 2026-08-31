import { AlertTriangle } from 'lucide-react';
import { useRef, useState, type Ref } from 'react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { quotasDeBigint } from './itcmdFmt';

/**
 * O KIT DA CALCULADORA — as peças de tabela e de rótulo, em um lugar só.
 *
 * Havia TRÊS implementações de célula, em três arquivos, e duas delas erradas do mesmo
 * jeito: montavam a classe por concatenação de texto.
 *
 *     className={`px-3 py-1.5 text-right ${className}`}     // ← o bug
 *
 * `text-right` e o `text-left` que o call site passa caem os dois na lista, com a mesma
 * especificidade, e quem decide passa a ser a ORDEM DA FOLHA de estilo gerada pelo
 * Tailwind — não a ordem do atributo. Resultado: a coluna Pessoa ficava alinhada à
 * direita sob um cabeçalho à esquerda, com a borda esquerda serrilhada.
 *
 * A terceira implementação tinha uma gambiarra para o mesmo problema —
 * `className.includes('text-')` —, que quebra no dia em que alguém passa `text-xs`.
 *
 * Duas correções, e a segunda é a que importa:
 *
 *  1. `cn()` (tailwind-merge) resolve o conflito de verdade;
 *  2. a INTENÇÃO fica no nome. `Num` é célula de número, `Txt` é célula de texto. Não
 *     há classe de alinhamento para passar, então não há conflito para resolver.
 *
 * O vocabulário visual é o do `quadroKit` do Quadro Societário, que é o kit da OSG:
 * rótulo em `text-[11px] font-bold uppercase tracking-[0.14em]`, número em
 * `tabular-nums`, estrutura em `osg-100`, destaque em `osg-moss`.
 */

/**
 * CABEÇALHO DE COLUNA. `alinhamento` em vez de `className` de alinhamento: o cabeçalho
 * tem de casar com o corpo, e deixar isso solto é como as duas pontas se separaram.
 */
export function Th({ children, alinhar = 'direita', className, dica }: {
  children?: React.ReactNode;
  alinhar?: 'esquerda' | 'direita';
  className?: string;
  /** A explicação da coluna. Vira tooltip de verdade, não `title` do navegador. */
  dica?: React.ReactNode;
}) {
  const conteudo = dica ? <ComDica dica={dica}>{children}</ComDica> : children;

  return (
    <th
      className={cn(
        'px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-osg-700',
        alinhar === 'esquerda' ? 'text-left' : 'text-right',
        className,
      )}
    >
      {conteudo}
    </th>
  );
}

/** CÉLULA DE NÚMERO: alinhada à direita, monoespaçada, dígitos de largura fixa. */
export function Num({ children, className, dica }: {
  children?: React.ReactNode;
  className?: string;
  dica?: React.ReactNode;
}) {
  return (
    <td className={cn('px-3 py-1.5 text-right font-mono tabular-nums', className)}>
      {dica ? <ComDica dica={dica}>{children}</ComDica> : children}
    </td>
  );
}

/** CÉLULA DE TEXTO: alinhada à esquerda, fonte de texto. Nome, papel, rótulo. */
export function Txt({ children, className, dica }: {
  children?: React.ReactNode;
  className?: string;
  dica?: React.ReactNode;
}) {
  return (
    <td className={cn('px-3 py-1.5 text-left', className)}>
      {dica ? <ComDica dica={dica}>{children}</ComDica> : children}
    </td>
  );
}

/**
 * CÉLULA DE NÚMERO COM CAMPO — input ou select alinhado à direita.
 *
 * Existe por causa de um desalinhamento de 12px que só se vê lado a lado: o número em
 * texto puro termina no padding da célula (`pr-3`), mas o número DENTRO de um input
 * termina no padding da célula MAIS o padding do input. Duas colunas vizinhas, uma de
 * leitura e uma de digitação, ficavam com os dígitos em réguas diferentes — e o
 * cabeçalho, alinhado à célula, não batia com nenhuma das duas.
 *
 * Aqui a célula abre mão do próprio `pr` e deixa o campo colar na borda: o padding
 * interno do campo passa a ser o único, e o dígito cai exatamente onde cai o dígito da
 * coluna de leitura ao lado.
 *
 * `text-right` mesmo tendo campo dentro — o campo já se alinha sozinho, mas a célula
 * não vive só de campo: nas linhas em que a coluna fica em LEITURA (o traço de quem não
 * pode conceder, o percentual de quem não é usufrutuário) o que entra é um `span`, e
 * sem isto ele caía à esquerda debaixo de um cabeçalho à direita.
 */
export function NumCampo({ children, className }: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn('py-1.5 pl-3 pr-0 text-right font-mono tabular-nums', className)}>
      {children}
    </td>
  );
}

/**
 * O VALOR EM LEITURA numa coluna que tem CAMPO nas outras linhas.
 *
 * Um número em texto puro termina no padding da célula; o mesmo número dentro de um
 * input termina no padding do INPUT, que é uma caixa de largura fixa empurrada para a
 * direita. Numa coluna em que algumas linhas são campo e outras não — o traço de quem
 * não pode conceder, o percentual de quem não é usufrutuário — isso põe os dígitos em
 * duas réguas, com ~20px de diferença. E quando a linha troca de papel, a célula vira
 * campo e o valor SALTA de uma régua para a outra.
 *
 * Aqui a leitura veste a casca do campo: mesma largura, mesma altura, mesmo recuo à
 * direita. Sem borda e sem fundo — continua sendo leitura.
 *
 * `ml-auto` empurra para a direita porque a caixa tem largura fixa dentro de uma célula
 * mais larga; é o mesmo mecanismo que já alinhava os inputs.
 */
export function ComoCampo({ largura, recuo = 'pr-3', className, children }: {
  /** A largura da caixa do campo desta coluna. Omitida quando a casca é de fora. */
  largura?: string;
  /** `pr-6` nas colunas que têm sinal de % encostado na borda. */
  recuo?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'flex h-8 items-center justify-end font-mono tabular-nums',
        largura && `ml-auto ${largura}`,
        recuo,
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A CASCA DE UMA COLUNA DE PERCENTUAL: largura fixa e o sinal de % à direita.
 *
 * O sinal fica FORA do campo e fora da leitura, uma vez só, na mesma posição nas duas
 * — é o que garante que o dígito pare no mesmo lugar em toda linha. Dentro do valor
 * ele viraria caractere digitável; repetido nos dois ramos, sairia do lugar num deles.
 */
export function ComSinalDePorcento({ largura = 'w-24', children }: {
  largura?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('relative ml-auto', largura)}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/70"
      >
        %
      </span>
    </div>
  );
}

/** CÉLULA DE CONTROLE: sem padding à direita, para o botão colar no conteúdo. */
export function Ctrl({ children, className }: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={cn('py-1.5 pl-3 pr-0', className)}>{children}</td>;
}

/**
 * DE ONDE VEIO O ÚLTIMO GESTO — é isso que separa foco pedido de foco herdado.
 *
 * Só a TABULAÇÃO conta como pedido: é o gesto cuja única finalidade é levar o foco a
 * algum lugar. Clique, Enter, digitação — nenhum deles é "quero saber o que é este
 * campo", mesmo quando o navegador ou o Radix move o foco em seguida.
 *
 * Um ouvinte para a tela toda, na captura, porque o gesto que interessa acontece longe
 * do gatilho: o clique é no item da lista suspensa, e o foco só chega ao gatilho depois
 * que a lista fecha. Sem janela de tempo e sem temporizador — a marca vale até o
 * próximo gesto, e é sempre o gesto que explica o foco seguinte.
 */
let ultimoGesto: 'ponteiro' | 'tabulacao' | 'outra-tecla' | null = null;
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => { ultimoGesto = 'ponteiro'; }, true);
  document.addEventListener('keydown', (e) => {
    ultimoGesto = e.key === 'Tab' ? 'tabulacao' : 'outra-tecla';
  }, true);
}

/** O gatilho está sob o ponteiro? Em jsdom não há ponteiro, e `false` é a verdade. */
const sobOPonteiro = (el: HTMLElement) => {
  try {
    return el.matches(':hover');
  } catch {
    return false;
  }
};

/**
 * DICA SOB DEMANDA — abre por ponteiro em cima, ou por foco que alguém pediu.
 *
 * O Radix abre a dica em QUALQUER foco, e foco não é sempre pedido de ajuda. Nesta tela
 * havia dois focos que ninguém pediu, e os dois faziam a dica subir sozinha:
 *
 *  · o `Dialog` foca o primeiro elemento focável quando abre — se ele tiver dica, ela
 *    aparece junto com o modal, sem que o ponteiro tenha passado por lugar nenhum;
 *  · o `Select` DEVOLVE o foco ao gatilho ao escolher uma opção — então trocar o papel
 *    de alguém, a emissão da GIA ou a base abria a dica daquele campo por cima da
 *    escolha que acabou de ser feita.
 *
 * O Radix se protege do CLIQUE NO PRÓPRIO GATILHO (guarda que houve `pointerdown` antes
 * do foco); do foco que chega de outro lugar, não. Aqui a dica é controlada: quando o
 * Radix pede para abrir, só aceita se o ponteiro estiver em cima ou se o foco tiver
 * vindo de uma TABULAÇÃO — e o teclado continua alcançando toda explicação, que é a
 * razão de a dica abrir no foco em primeiro lugar.
 *
 * O primeiro teste é o do ponteiro, e a ordem importa: passar o ponteiro sobre um campo
 * logo depois de clicar em outro lugar é hover legítimo, e não herança do clique.
 */
function useDicaSobDemanda() {
  const [aberta, setAberta] = useState(false);
  const gatilho = useRef<HTMLElement | null>(null);

  const pedir = (querAbrir: boolean) => {
    if (!querAbrir) return setAberta(false);
    const el = gatilho.current;
    setAberta(
      (el != null && sobOPonteiro(el)) || ultimoGesto === 'tabulacao',
    );
  };

  return { aberta, pedir, gatilho };
}

/**
 * O QUE EXPLICA UM VALOR, quando a explicação é do dado e não da coluna.
 *
 * Sublinhado pontilhado em vez de ícone: numa tabela de dez colunas, um ícone por
 * célula viraria ruído, e o pontilhado é o sinal que o resto do sistema já usa.
 *
 * `tabIndex` porque o gatilho é um `span`: sem isso o teclado não alcança a explicação,
 * e dica que só o ponteiro abre exclui quem navega por Tab.
 */
export function ComDica({ dica, children }: {
  dica: React.ReactNode;
  children: React.ReactNode;
}) {
  const { aberta, pedir, gatilho } = useDicaSobDemanda();

  return (
    <Tooltip open={aberta} onOpenChange={pedir}>
      <TooltipTrigger asChild>
        <span
          ref={gatilho}
          tabIndex={0}
          className="cursor-help rounded border-b border-dotted border-current/30 outline-none focus-visible:ring-1 focus-visible:ring-osg-moss"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{dica}</TooltipContent>
    </Tooltip>
  );
}

/**
 * O QUE EXPLICA UM CONTROLE — campo, lista suspensa, botão.
 *
 * Sem `span` no meio, ao contrário do `ComDica`: o controle JÁ é focável, então ele
 * mesmo é o gatilho. Um invólucro aqui acrescentaria uma parada de tabulação antes de
 * cada campo e roubaria o anel de foco do campo de verdade.
 *
 * Substitui o `title` do navegador, que parecia dica e não era: aparece depois de um
 * segundo e meio, só para quem está com o ponteiro, sem formatação, sem quebra de
 * linha, e **leitor de tela nem sempre anuncia** — a explicação de uma coluna de
 * apuração ficava escondida atrás de um comportamento de tooltip acidental.
 */
export function DicaDoControle({ dica, children }: {
  dica: React.ReactNode;
  children: React.ReactNode;
}) {
  const { aberta, pedir, gatilho } = useDicaSobDemanda();

  return (
    <Tooltip open={aberta} onOpenChange={pedir}>
      {/* O ref vai no `TooltipTrigger` e não no filho porque o filho é qualquer
          controle — `Input`, `SelectTrigger`, `button`. O `asChild` do Radix compõe os
          dois refs no elemento de baixo. O molde é `HTMLButtonElement` por ser o caso
          mais comum; o que este ref faz é chamar `matches`, que todo elemento tem. */}
      <TooltipTrigger asChild ref={gatilho as Ref<HTMLButtonElement>}>
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{dica}</TooltipContent>
    </Tooltip>
  );
}

/** A LINHA DE TOTAL. Fecha a tabela e é onde a conferência se lê. */
export const linhaDeTotalCls =
  'border-t-2 border-border bg-osg-50/70 font-semibold text-osg-700';

/** A LINHA DE DADO, com realce ao passar o ponteiro — a tabela responde ao ponteiro. */
export const linhaCls = 'border-t border-border/70 transition-colors hover:bg-osg-50/40';

/** A MOLDURA da tabela: borda da OSG, cantos, e rolagem própria quando não cabe. */
export const molduraDaTabelaCls =
  'overflow-x-auto rounded-lg border border-border bg-card';

/**
 * UM QUADRO: tabela COM TÍTULO — a moldura das telas de leitura.
 *
 * Sem título, duas tabelas empilhadas obrigam a decifrar o que cada uma é pelos nomes
 * das colunas. Na aba de usufruto isso era pior do que parecia: a de cima é o RESULTADO
 * (como o voto ficou) e a de baixo é o ATO (quem instituiu para quem), duas coisas
 * diferentes que os cabeçalhos não separam.
 *
 * O título é `text-sm font-semibold`, e não o rótulo em caixa alta das colunas: mesma
 * receita seria mesma hierarquia, e o título passaria a ler como uma super-coluna. Ele
 * fica em `bg-card` e a faixa bege do `thead` vem logo abaixo — nome do quadro, depois
 * nomes das colunas.
 *
 * A rolagem horizontal é do CORPO, não do quadro: com ela na moldura, o título saía da
 * tela junto com as colunas.
 */
export function Quadro({ titulo, legenda, children }: {
  titulo: string;
  /** O que a tabela responde, ou o que ela não traz. Uma linha, à direita. */
  legenda?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border/70 px-3 py-2">
        <h4 className="text-sm font-semibold text-osg-700">{titulo}</h4>
        {legenda && (
          <span className="text-xs text-muted-foreground">{legenda}</span>
        )}
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

/**
 * O CONTEÚDO DE UMA ABA, entrando.
 *
 * Trocar de aba muda a tela inteira num quadro só, e sem transição parece que a página
 * foi outra: são 350ms de fade com 10px de subida, o bastante para o olho saber que o
 * mesmo painel trocou de conteúdo. O Radix desmonta a aba inativa, então a animação
 * roda a cada troca sem precisar de estado.
 *
 * Não traz `mt-*`: nas duas telas o espaçamento vem de fora (`space-y` no `Tabs`, ou um
 * `mt-0` explícito onde o padrão do shadcn atrapalha), e embutir margem aqui apagaria
 * o respiro entre a lista de abas e o conteúdo numa delas.
 */
export const abaCls = 'animate-osg-rise motion-reduce:animate-none';

/** O CABEÇALHO da tabela. */
export const cabecalhoDaTabelaCls = 'bg-osg-50/60';

/**
 * RÓTULO DE COLUNA nas tabelas montadas com o `Table` do shadcn — a lista do histórico.
 *
 * A mesma régua do `Th` daqui, aplicada por fora: ali o `TableHead` traz `h-12 px-4` e
 * o comportamento de linha que a lista usa, e o que faltava era só o rótulo. Sem isto a
 * linha de cabeçalho misturava seis rótulos capitalizados com três em minúscula
 * ("contábil", "mercado", "ITR"), que saem do nome do cenário.
 */
export const rotuloDeColunaCls =
  'text-[11px] font-bold uppercase tracking-[0.12em] text-osg-700';

/**
 * RÓTULO DE SEÇÃO dentro de um cartão de cenário — "Base de cálculo", "Simulação do
 * ITCD". Mesma régua do rótulo de coluna, um tom mais leve.
 */
export function Secao({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-osg-50/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-osg-700">
      {children}
    </p>
  );
}

/**
 * UMA LINHA DE UM QUADRO DE CENÁRIO: rótulo à esquerda, valor à direita.
 *
 * Existia duas vezes, com duas gramáticas — `px-4 py-2` com rótulo em `text-foreground`
 * no quadro da sessão, `px-3 py-1.5` com rótulo em `text-muted-foreground` no da
 * simulação aberta. São o MESMO quadro, mostrado em dois lugares: o da sessão é o que
 * acabou de ser gerado, o outro é o mesmo depois de gravado. Ler diferente nos dois é o
 * bastante para o analista achar que são contas diferentes.
 *
 * Fica o molde mais compacto: estes quadros vivem em três colunas, e é onde a largura
 * aperta.
 */
export function LinhaDeValor({ rotulo, detalhe, valor, dica }: {
  rotulo: string;
  detalhe?: string;
  valor: string;
  dica?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-1.5">
      <dt className="min-w-0 text-sm text-muted-foreground">
        {dica ? <ComDica dica={dica}>{rotulo}</ComDica> : <span className="break-words">{rotulo}</span>}
        {detalhe && <span className="ml-1.5 text-xs text-muted-foreground/70">{detalhe}</span>}
      </dt>
      <dd className="shrink-0 font-mono text-sm tabular-nums text-foreground">{valor}</dd>
    </div>
  );
}

/** A LINHA QUE FECHA o quadro do cenário — a conclusão, e por isso destacada. */
export function LinhaDeTotal({ rotulo, valor, dica }: {
  rotulo: string;
  valor: string;
  dica?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 bg-osg-50/60 px-3 py-2.5">
      <dt className={`${rotuloCls} text-osg-700`}>
        {dica ? <ComDica dica={dica}>{rotulo}</ComDica> : rotulo}
      </dt>
      <dd className="shrink-0 font-mono text-sm font-semibold tabular-nums text-osg-700">
        {valor}
      </dd>
    </div>
  );
}

/**
 * POR QUE O NOME VEM CURTO. A mesma explicação em quatro tabelas: o cadastro guarda
 * "CRISTINA KIELBA BOCOLLI BORDIGNON", e dois desses por linha comem a largura das
 * colunas de número.
 */
export const DICA_NOME_CURTO = 'Nome curto, para as colunas de número caberem. O '
  + 'cadastro guarda o nome inteiro.';

/**
 * A CONTA QUE OS CAMPOS FINAIS ENTENDEM. Texto único porque aparece em quatro lugares
 * (cabeçalho e campo, nas duas colunas finais), e quatro cópias divergiriam.
 */
export const DICA_DA_CONTA = 'Para igualar sem conta na mão: digite /2 e a calculadora '
  + 'divide o que o ato movimenta em duas partes iguais, /3 em três. A divisão é de '
  + 'quota inteira, então as linhas fecham exatas.';

/** RÓTULO DE CAMPO E DE DADO, no molde do `quadroKit`. */
export const rotuloCls = 'text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground';

/**
 * A BARRA DE PARÂMETROS DO ATO — o que vale para a tabela inteira: quem entra, a
 * modalidade, a base. Uma por aba, e a MESMA nas duas.
 *
 * TUDO À ESQUERDA, num grupo só. A barra já foi de dois jeitos errados: com
 * `justify-between` o botão de adicionar ficava sozinho no extremo esquerdo e os
 * parâmetros no extremo direito, com mil pixels de vão no meio (duas ilhas em vez de
 * uma barra); com `justify-end` tudo encostou na direita e o vão só trocou de lado.
 * Alinhados à esquerda, os controles ficam juntos, e a leitura começa onde começa a
 * tabela abaixo. O botão vem por último dentro do grupo, então ele não é o primeiro
 * item da linha e continua colado nos parâmetros.
 *
 * `items-center` e não `items-end`: nenhum controle daqui carrega rótulo em cima (o
 * rótulo é ao lado, veja `CampoDaBase`), então todos têm a mesma altura de 36px e
 * alinham pelo centro. Era `items-end` porque um deles usava `Campo`, e era esse
 * rótulo que fazia a barra inteira crescer 18px quando o campo aparecia.
 */
export const barraDoAtoCls =
  'flex flex-wrap items-center gap-x-5 gap-y-3 rounded-md '
  + 'border border-border bg-osg-50/40 px-3 py-2.5';

/**
 * UMA LINHA DE AVISO, nos dois tons que esta tela tem.
 *
 * `alerta` é consequência a registrar — a parcela devida na extinção do usufruto, o
 * quadro que parte de um ato substituído. `erro` é o que TRAVA a geração.
 *
 * Existe como componente porque havia cinco implementações, em quatro arquivos, e três
 * delas em `text-amber-700` — âmbar do Tailwind, frio de mais para a paleta quente da
 * OSG e fora do sistema de papéis. O par `status-alerta` sai do matiz do
 * `--osg-highlighter`, escurecido só até dar contraste de texto (41 64% 31%); o
 * `--warning` cru não serve para TEXTO porque é fundo de marca-texto, com 71% de
 * luminosidade.
 *
 * As três eram linha solta, sem moldura: um aviso que não é um bloco se lê como legenda
 * da tabela de cima.
 */
export function Aviso({ tom = 'alerta', children }: {
  tom?: 'alerta' | 'erro';
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
        tom === 'alerta'
          ? 'border-status-alerta/25 bg-status-alerta-soft/50 text-status-alerta'
          : 'border-destructive/30 bg-destructive/5 text-destructive',
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Quotas formatadas, sem passar por `number`. */
export function Q({ children }: { children: bigint }) {
  return <>{quotasDeBigint(children)}</>;
}

/**
 * A MOLDURA DAS DICAS — uma por tela, não uma por célula.
 *
 * O `App` já provê um `TooltipProvider`, e aninhar é legal no Radix: o de dentro só
 * define o próprio atraso. Existe para a tela não depender de um ancestral que ela não
 * controla — sem isto ela quebra em teste, e quebraria em qualquer reuso fora da
 * árvore do `App`.
 *
 * 200ms contra os 700ms do padrão: aquele número foi pensado para ícone de ajuda
 * isolado. Numa tabela de dez colunas, onde a explicação está no cabeçalho e o
 * ponteiro passeia, 700ms parece que a tela travou.
 */
export function ComoDicas({ children }: { children: React.ReactNode }) {
  return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>;
}
