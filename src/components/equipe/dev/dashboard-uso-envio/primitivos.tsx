/**
 * Componentes visuais do dashboard "Controle de uso e envio".
 *
 * Componentes densos, com numeros em Work Sans e acentos da paleta PSA.
 * Paleta e formatadores ficam em `formatadores.ts`.
 */
import { ArrowDown, ArrowUp, ChevronDown, ChevronsUpDown, Info } from 'lucide-react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TEAL_SERIE, LIME, RISCO, ALERTA, type SortState } from './formatadores';
import { ALTURA_MIN_CABECALHO, ALTURA_MIN_KPI } from './layout';

// ── Faixa de resumo (KPIs sobre fundo escuro) ──────────────────────────

export interface KpiItem {
  label: string;
  valor: string;
  tooltip?: string;
  tom?: 'neutro' | 'positivo' | 'risco' | 'alerta';
  /**
   * A UNICA linha secundaria. Numero absoluto sem referencia nao diz se e bom
   * ou ruim, mas empilhar meta + detalhe + variacao transforma o cartao em
   * paragrafo. `melhorQuando` existe porque a polaridade nao e universal:
   * requisicao subindo e bom, latencia subindo e ruim.
   */
  /**
   * Comparativo. `valor` e obrigatorio quando ha `pct`: sem ele o delta ficava
   * pendurado no numero principal e sugeria que o total do periodo tinha caido
   * 70% — quando na verdade quem caiu foi o volume de UM mes contra o anterior.
   */
  variacao?: { pct?: number; rotulo: string; valor?: string; melhorQuando?: 'sobe' | 'desce' };
  /** Linha de apoio extra. Usada só pelo dashboard gerencial, que já foi
   *  validado com ela; no técnico ficou só valor + variação. */
  detalhe?: string;
}

/** Ajuda contextual portalizada para continuar visivel dentro de tabelas e cards. */
export const AjudaTooltip = ({ texto }: { texto: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label="Mais informações"
        className="inline-flex shrink-0 cursor-help items-center rounded-sm text-muted-foreground hover:text-[var(--bd-accent-d)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipPrimitive.Portal>
      <TooltipContent
        side="top"
        sideOffset={6}
        collisionPadding={12}
        className="z-[100] max-w-[280px] text-center text-xs font-normal normal-case tracking-normal"
      >
        {texto}
      </TooltipContent>
    </TooltipPrimitive.Portal>
  </Tooltip>
);

/**
 * Texto truncado que revela o valor completo no mesmo tooltip do resto do
 * dashboard. Substitui o `title=` nativo do HTML, que abria uma caixinha cinza
 * do sistema operacional — visual e timing diferentes do Radix usado aqui.
 */
export const TextoComTooltip = ({
  texto,
  children,
  className,
  style,
}: {
  texto: string;
  children: React.ReactNode;
  className?: string;
  /** Necessario quando o gatilho e um item de flex com largura propria: sem
   *  isso o span do trigger colapsa e o filho perde a base do width em %. */
  style?: React.CSSProperties;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className={cn('cursor-help', className)} style={style}>
        {children}
      </span>
    </TooltipTrigger>
    <TooltipPrimitive.Portal>
      <TooltipContent
        side="top"
        sideOffset={6}
        collisionPadding={12}
        className="z-[100] max-w-[420px] break-words text-left text-xs font-normal normal-case tracking-normal"
      >
        {texto}
      </TooltipContent>
    </TooltipPrimitive.Portal>
  </Tooltip>
);

// Cor por tom, aplicada via `style` (não classe Tailwind): assim os valores
// vem de `formatadores.ts` — a paleta validada do manual de marca — em vez de
// repetir o hex aqui. `risco`/`alerta` do TOM_VALOR são tons CLAROS para texto
// (rose-300/amber-300), sem equivalente ainda em `formatadores.ts` (RISCO e
// ALERTA de lá são os tons escuros usados em fundo); ficam literais até essa
// variante clara ganhar um nome lá.
const TOM_VALOR: Record<NonNullable<KpiItem['tom']>, string> = {
  neutro: '#fff',
  positivo: LIME[400],
  risco: '#FDA4AF',
  alerta: '#FCD34D',
};

const TOM_BARRA: Record<NonNullable<KpiItem['tom']>, string> = {
  // TEAL_SERIE, não TEAL[600]: várias dessas barrinhas aparecem lado a lado
  // na mesma tela (uma por KPI) — é marca de série, não texto, então segue a
  // mesma regra de croma que `SERIES` em formatadores.ts.
  neutro: TEAL_SERIE,
  positivo: LIME[500],
  risco: RISCO,
  alerta: ALERTA,
};

/** Tom -> cor do NUMERO na variante clara. Degrau `-d` porque pinta letra. */
const TOM_VALOR_CLARO: Record<NonNullable<KpiItem['tom']>, string> = {
  neutro: 'var(--bd-ink)',
  positivo: 'var(--bd-go-d)',
  risco: 'var(--bd-risk-d)',
  alerta: 'var(--bd-warn-d)',
};

/**
 * A faixa de KPI em CARTOES CLAROS -- as mesmas classes da faixa do Estrategico
 * (`.stat-strip` / `.stat-item`), com a mesma anatomia: rotulo em caixa alta,
 * numero grande tabular, pilula de variacao, linha de apoio.
 *
 * POR QUE ELA EXISTE. A faixa escura era o unico bloco do Board com layout de
 * outra familia -- a usuaria apontou exatamente isso ao abrir Ferramentas. A
 * referencia de design nao tem faixa escura: KPI e cartao claro. Mas o mesmo
 * componente serve `/equipe/dev`, que e outra area e nao passou por esta
 * refatoracao; por isso a escolha e uma PROP explicita, e nao farejar a rota:
 * quem muda de layout e quem pediu.
 */
const FaixaEmCartoes = ({
  itens,
  carregando,
  colunas,
}: {
  itens: KpiItem[];
  carregando?: boolean;
  colunas: 3 | 4 | 6;
}) => (
  <div className="stat-strip" data-cols={colunas} data-reveal>
    {itens.map((k) => (
      <div key={k.label} className="stat-item">
        <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>{k.label}</span>
          {k.tooltip && <AjudaTooltip texto={k.tooltip} />}
        </div>
        {carregando ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="stat-num" style={{ color: TOM_VALOR_CLARO[k.tom ?? 'neutro'] }}>
            {k.valor}
          </div>
        )}
        {k.variacao && !carregando && (
          <span
            className={cn(
              'pill',
              k.variacao.pct === undefined || k.variacao.pct === 0
                ? 'pill-neutral'
                : k.variacao.pct > 0 === (k.variacao.melhorQuando === 'sobe')
                  ? 'pill-up'
                  : 'pill-down',
            )}
          >
            {k.variacao.pct !== undefined && (
              <span className="tabular-nums">
                {k.variacao.pct > 0 ? '▲' : k.variacao.pct < 0 ? '▼' : '='}{' '}
                {Math.abs(k.variacao.pct * 100).toFixed(1).replace('.', ',')}%
              </span>
            )}
            {k.variacao.valor && <span>{k.variacao.valor}</span>}
            <span style={{ fontWeight: 500 }}>{k.variacao.rotulo}</span>
          </span>
        )}
        {k.detalhe && <div className="stat-sub">{k.detalhe}</div>}
      </div>
    ))}
  </div>
);

export const FaixaResumo = ({
  itens,
  carregando,
  colunas = 4,
  variante = 'escura',
}: {
  itens: KpiItem[];
  carregando?: boolean;
  colunas?: 3 | 4 | 6;
  /**
   * `escura` = a faixa original (Dev). `cartoes` = os cartoes claros do design
   * system do Board. Default na escura para NAO mexer em `/equipe/dev` sem
   * alguem pedir.
   */
  variante?: 'escura' | 'cartoes';
}) =>
  variante === 'cartoes' ? (
    <FaixaEmCartoes itens={itens} carregando={carregando} colunas={colunas} />
  ) : (
  // `--surface-escura` e não `GRAY[900]`: a superfície escura é token de TEMA, e
  // o tema da rota já declara a sua. Hoje são DUAS: a casa em teal profundo
  // (`178 60% 8%`) e a Tax/OSG em azul-marinho (`229 84% 5%`). Esta tela é do
  // Dev, que fica na casa desde 31/08/2026 — antes disso vestia a
  // `.sistema-theme` e a faixa saía em grafite quente. Com o hex cravado, ela
  // ignorava tudo isso e ficava azul-marinho em qualquer rota. O `GRAY` do
  // módulo continua servindo a série p95 dos gráficos, que é dado e não
  // superfície.
  //
  // ⚠️ Esta tela é a que derrubou o grafite do Dev. Ela usa `--bd-accent-d` e
  // `--bd-accent-t` (mais abaixo, no link e no hover de linha), e os dois NÃO
  // andam juntos: o `-t` sai de `var(--primary)` e o `-d` está cravado em teal
  // no `:root`. Sob a `.sistema-theme` isso dava link teal com hover grafite na
  // mesma tabela. Hoje coincide porque o Dev é a casa; se algum dia ele voltar
  // a ter acento próprio, é aqui que quebra primeiro.
  <div className="rounded-xl px-4 py-4" style={{ background: 'hsl(var(--surface-escura))' }}>
    <div
      className={cn(
        'grid gap-x-6 gap-y-4 sm:grid-cols-2',
        colunas === 6
          ? 'lg:grid-cols-3 xl:grid-cols-6'
          : colunas === 3
            ? 'lg:grid-cols-3'
            : 'xl:grid-cols-4',
      )}
    >
      {itens.map((k) => (
        <div key={k.label} className="flex gap-2.5" style={{ minHeight: ALTURA_MIN_KPI }}>
          <span
            className="mt-0.5 w-0.5 shrink-0 rounded-full"
            style={{ background: TOM_BARRA[k.tom ?? 'neutro'] }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <span>{k.label}</span>
              {k.tooltip && <AjudaTooltip texto={k.tooltip} />}
            </div>
            {carregando ? (
              /* eslint-disable-next-line ui/token-nao-sobrescrito --
                 cor fixa DELIBERADA: este skeleton vive dentro da faixa
                 ESCURA (`--surface-escura`), e o `bg-muted` do componente é
                 um tom claro de superfície clara -- ali ele desaparece. A
                 variante de cartões claros (`FaixaEmCartoes`, acima) usa o
                 `<Skeleton>` sem classe nenhuma, como manda a regra. */
              <Skeleton className="mt-1.5 h-6 w-20 bg-white/10" />
            ) : (
              <p
                className="mt-0.5 text-[22px] font-semibold leading-none tabular-nums"
                style={{ color: TOM_VALOR[k.tom ?? 'neutro'] }}
              >
                {k.valor}
              </p>
            )}
            {k.variacao && !carregando && (
              <p className="mt-1 flex flex-wrap items-baseline gap-x-1 text-[11px]">
                {k.variacao.pct !== undefined && (
                  <span
                    className="font-semibold tabular-nums"
                    style={{
                      color:
                        k.variacao.pct === 0
                          ? '#94A3B8'
                          : k.variacao.pct > 0 === (k.variacao.melhorQuando === 'sobe')
                            ? LIME[400]
                            : '#FDA4AF',
                    }}
                  >
                    {k.variacao.pct > 0 ? '▲' : k.variacao.pct < 0 ? '▼' : '='}{' '}
                    {Math.abs(k.variacao.pct * 100)
                      .toFixed(1)
                      .replace('.', ',')}
                    %
                  </span>
                )}
                {k.variacao.valor && (
                  <span className="font-semibold text-foreground">{k.variacao.valor}</span>
                )}
                <span className="text-muted-foreground">{k.variacao.rotulo}</span>
              </p>
            )}
            {k.detalhe && (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{k.detalhe}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
  );

/** Renderiza um insight calculado. Nada aqui e escrito para um cenario. */
export const FraseInsight = ({
  insight,
  className,
}: {
  insight: { destaque: string; texto: string; tom?: 'neutro' | 'risco' | 'alerta' } | null;
  className?: string;
}) => {
  if (!insight) return null;
  const cor = insight.tom === 'risco' ? RISCO : insight.tom === 'alerta' ? ALERTA : undefined;
  return (
    <span className={className}>
      <strong style={cor ? { color: cor } : undefined}>{insight.destaque}</strong> {insight.texto}
    </span>
  );
};

/**
 * Nome da serie escrito na cor dela, dentro da frase do subtitulo.
 *
 * Substitui a caixa de legenda: com a legenda, o olho precisa ir e voltar entre
 * o grafico e o quadradinho de cor a cada leitura (movimento sacadico). Com o
 * termo colorido na frase, a identificacao acontece onde a atencao ja esta.
 * Usar SEMPRE junto de rotulo direto ou de negrito — cor sozinha nao identifica
 * nada para quem tem deficiencia de cor.
 */
export const TermoColorido = ({ cor, children }: { cor: string; children: React.ReactNode }) => (
  <strong style={{ color: cor }}>{children}</strong>
);

/**
 * Rotulo no fim da linha, no lugar da legenda. Renderiza so no ultimo ponto da
 * serie; nos demais devolve null.
 */
export const RotuloFinalLinha =
  (texto: string, cor: string, total: number) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({ x, y, index }: any) => {
    if (index !== total - 1) return null;
    return (
      <text
        x={Number(x) + 6}
        y={Number(y) + 3}
        style={{ fontSize: 11, fontWeight: 600, fill: cor, fontFamily: "'Work Sans', sans-serif" }}
      >
        {texto}
      </text>
    );
  };

// ── Card ───────────────────────────────────────────────────────────────

interface CardProps {
  titulo: string;
  /** A conclusao em uma frase. O leitor deve poder parar aqui. */
  resumo?: React.ReactNode;
  /** Aceita JSX para o nome da serie vir na cor dela, no lugar da legenda. */
  descricao?: React.ReactNode;
  tooltip?: string;
  acao?: React.ReactNode;
  /** Altura da area de grafico. Omita em cards de tabela. */
  altura?: number;
  carregando?: boolean;
  vazio?: boolean;
  mensagemVazio?: string;
  children: React.ReactNode;
  className?: string;
}

export const Painel = ({
  titulo,
  resumo,
  descricao,
  tooltip,
  acao,
  altura,
  carregando,
  vazio,
  mensagemVazio = 'Nenhum dado encontrado para os filtros selecionados.',
  children,
  className,
}: CardProps) => (
  <section
    className={cn(
      'rounded-xl border border-border bg-white shadow-[0_1px_2px_rgba(3,7,18,.04)]',
      className,
    )}
  >
    <header
      className="flex items-start justify-between gap-4 border-b border-border px-4 py-1.5"
      style={{ minHeight: ALTURA_MIN_CABECALHO }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground">{titulo}</h3>
          {tooltip && <AjudaTooltip texto={tooltip} />}
        </div>
        {descricao && <p className="text-[11px] leading-snug text-muted-foreground">{descricao}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </header>
    {resumo && (
      <p className="border-b border-border bg-muted px-4 py-1.5 text-xs leading-snug text-foreground">
        {resumo}
      </p>
    )}
    <div className={cn(altura ? 'px-2 pb-1 pt-2' : 'px-0 py-0')}>
      {carregando ? (
        <Skeleton style={{ height: altura ?? 220 }} className="m-2 w-[calc(100%-1rem)]" />
      ) : vazio ? (
        <div
          className="flex items-center justify-center px-4 text-center text-xs text-muted-foreground"
          style={{ height: altura ?? 160 }}
          role="status"
        >
          {mensagemVazio}
        </div>
      ) : altura ? (
        <div style={{ height: altura }}>{children}</div>
      ) : (
        children
      )}
    </div>
  </section>
);

// ── Tabela densa ───────────────────────────────────────────────────────

export const Tabela = ({
  children,
  altura = 260,
  caption = 'Dados do dashboard',
}: {
  children: React.ReactNode;
  /** Altura da area rolavel. A lista rola dentro do painel. */
  altura?: number;
  caption?: string;
}) => (
  <div className="overflow-auto" style={{ maxHeight: altura }}>
    <table className="w-full border-collapse text-xs">
      <caption className="sr-only">{caption}</caption>
      {children}
    </table>
  </div>
);

interface ThProps<T> {
  campo: keyof T;
  estado: SortState<T>;
  children: React.ReactNode;
  alinhar?: 'left' | 'right';
  className?: string;
  tooltip?: string;
}

export function Th<T>({
  campo,
  estado,
  children,
  alinhar = 'left',
  className,
  tooltip,
}: ThProps<T>) {
  const ativo = estado.key === campo;
  const Icone = !ativo ? ChevronsUpDown : estado.dir === 'asc' ? ArrowUp : ArrowDown;
  // Sem icone de informacao em tabela: uma coluna de 4 letras com um "i" do lado
  // fica mais larga que o proprio dado. O gatilho e o texto do cabecalho.
  const rotulo = tooltip ? (
    <TextoComTooltip texto={tooltip} className="underline decoration-dotted underline-offset-2">
      {children}
    </TextoComTooltip>
  ) : (
    children
  );
  return (
    <th
      scope="col"
      aria-sort={ativo ? (estado.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(
        'sticky top-0 z-10 select-none whitespace-nowrap bg-muted p-0 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground',
        alinhar === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => estado.toggle(campo)}
        className={cn(
          'inline-flex w-full items-center gap-1 px-3 py-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          alinhar === 'right' ? 'flex-row-reverse justify-start' : 'justify-start',
        )}
      >
        {rotulo}
        <Icone className={cn('h-3 w-3', ativo ? 'text-[var(--bd-accent-d)]' : 'text-muted-foreground')} />
      </button>
    </th>
  );
}

export const ThEstatico = ({
  children,
  alinhar = 'left',
  className,
  tooltip,
}: {
  children: React.ReactNode;
  alinhar?: 'left' | 'right';
  className?: string;
  tooltip?: string;
}) => (
  <th
    scope="col"
    className={cn(
      'whitespace-nowrap bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground',
      alinhar === 'right' ? 'text-right' : 'text-left',
      className,
    )}
  >
    <span
      className={cn('inline-flex items-center gap-1', alinhar === 'right' && 'flex-row-reverse')}
    >
      {children}
      {tooltip && <AjudaTooltip texto={tooltip} />}
    </span>
  </th>
);

export const Tr = ({
  children,
  onClick,
  selecionado = false,
  rotuloInteracao,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  selecionado?: boolean;
  rotuloInteracao?: string;
}) => (
  <tr
    className={cn(
      'border-t border-border transition-colors hover:bg-[var(--bd-accent-t)]',
      onClick &&
        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
      selecionado && 'bg-[var(--bd-accent-t)] ring-1 ring-inset ring-ring',
    )}
    onClick={onClick}
    onKeyDown={(event) => {
      if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      onClick();
    }}
    tabIndex={onClick ? 0 : undefined}
    aria-label={rotuloInteracao}
    aria-selected={onClick ? selecionado : undefined}
  >
    {children}
  </tr>
);

export const Td = ({
  children,
  alinhar = 'left',
  className,
}: {
  children: React.ReactNode;
  alinhar?: 'left' | 'right';
  className?: string;
}) => (
  <td
    className={cn(
      'px-3 py-1.5 tabular-nums text-foreground',
      alinhar === 'right' && 'text-right',
      className,
    )}
  >
    {children}
  </td>
);

/** Barra proporcional dentro da celula — le mais rapido que so o numero. */
export const CelulaBarra = ({
  valor,
  max,
  cor = TEAL_SERIE, // marca de série, mesma regra de croma de SERIES/TOM_BARRA
  rotulo,
}: {
  valor: number;
  max: number;
  cor?: string;
  rotulo: string;
}) => (
  <div className="flex items-center justify-end gap-2">
    <span className="tabular-nums">{rotulo}</span>
    <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
      <span
        className="block h-full rounded-full"
        style={{ width: `${max > 0 ? Math.max(2, (valor / max) * 100) : 0}%`, background: cor }}
      />
    </span>
  </div>
);

export const BotaoExpandir = ({
  expandido,
  total,
  limite,
  onClick,
}: {
  expandido: boolean;
  total: number;
  limite: number;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-center gap-1.5 border-t border-border py-1.5 text-[11px] font-medium text-[var(--bd-accent-d)] transition-colors hover:bg-[var(--bd-accent-t)]"
  >
    {expandido ? 'Mostrar menos' : `Mostrar todos os ${total}`}
    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expandido && 'rotate-180')} />
    {!expandido && <span className="text-muted-foreground">(exibindo {limite})</span>}
  </button>
);

/** Marcador de conta de automacao, para nao confundir robo com pessoa. */
export const TagAutomacao = () => (
  <span className="ml-2 rounded border border-border bg-muted px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
    automação
  </span>
);
