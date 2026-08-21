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
import { TEAL, type SortState } from './formatadores';
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
        className="inline-flex shrink-0 cursor-help items-center rounded-sm text-slate-400 hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
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

const TOM_VALOR: Record<NonNullable<KpiItem['tom']>, string> = {
  neutro: 'text-white',
  positivo: 'text-[#A3E635]',
  risco: 'text-[#FDA4AF]',
  alerta: 'text-[#FCD34D]',
};

const TOM_BARRA: Record<NonNullable<KpiItem['tom']>, string> = {
  neutro: 'bg-[#0D9488]',
  positivo: 'bg-[#84CC16]',
  risco: 'bg-[#BE123C]',
  alerta: 'bg-[#B45309]',
};

export const FaixaResumo = ({
  itens,
  carregando,
  colunas = 4,
}: {
  itens: KpiItem[];
  carregando?: boolean;
  colunas?: 3 | 4 | 6;
}) => (
  // `--surface-escura` e não `GRAY[900]`: a superfície escura é token de TEMA, e
  // cada área já declara a sua (base/tax/osg/rotina em azul-marinho
  // `229 84% 5%`; sistema em grafite quente `35 10% 8%`). Com o hex cravado, esta
  // faixa ignorava o tema da rota e ficava azul-marinho no Board inteiro, que
  // resolve por `.sistema-theme`. O `GRAY` do módulo continua servindo a série
  // p95 dos gráficos, que é dado e não superfície.
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
            className={cn('mt-0.5 w-0.5 shrink-0 rounded-full', TOM_BARRA[k.tom ?? 'neutro'])}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              <span>{k.label}</span>
              {k.tooltip && <AjudaTooltip texto={k.tooltip} />}
            </div>
            {carregando ? (
              <Skeleton className="mt-1.5 h-6 w-20 bg-white/10" />
            ) : (
              <p
                className={cn(
                  'mt-0.5 text-[22px] font-semibold leading-none tabular-nums',
                  TOM_VALOR[k.tom ?? 'neutro'],
                )}
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
                            ? '#A3E635'
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
                  <span className="font-semibold text-slate-200">{k.variacao.valor}</span>
                )}
                <span className="text-slate-400">{k.variacao.rotulo}</span>
              </p>
            )}
            {k.detalhe && (
              <p className="mt-1 text-[11px] leading-snug text-slate-400">{k.detalhe}</p>
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
  const cor =
    insight.tom === 'risco' ? '#BE123C' : insight.tom === 'alerta' ? '#B45309' : undefined;
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
      'rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(3,7,18,.04)]',
      className,
    )}
  >
    <header
      className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-1.5"
      style={{ minHeight: ALTURA_MIN_CABECALHO }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">{titulo}</h3>
          {tooltip && <AjudaTooltip texto={tooltip} />}
        </div>
        {descricao && <p className="text-[11px] leading-snug text-slate-500">{descricao}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </header>
    {resumo && (
      <p className="border-b border-slate-100 bg-slate-50/60 px-4 py-1.5 text-xs leading-snug text-slate-700">
        {resumo}
      </p>
    )}
    <div className={cn(altura ? 'px-2 pb-1 pt-2' : 'px-0 py-0')}>
      {carregando ? (
        <Skeleton style={{ height: altura ?? 220 }} className="m-2 w-[calc(100%-1rem)]" />
      ) : vazio ? (
        <div
          className="flex items-center justify-center px-4 text-center text-xs text-slate-500"
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
        'sticky top-0 z-10 select-none whitespace-nowrap bg-slate-50 p-0 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500',
        alinhar === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => estado.toggle(campo)}
        className={cn(
          'inline-flex w-full items-center gap-1 px-3 py-1.5 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500',
          alinhar === 'right' ? 'flex-row-reverse justify-start' : 'justify-start',
        )}
      >
        {rotulo}
        <Icone className={cn('h-3 w-3', ativo ? 'text-teal-600' : 'text-slate-300')} />
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
      'whitespace-nowrap bg-slate-50/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-500',
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
      'border-t border-slate-100 transition-colors hover:bg-teal-50/40',
      onClick &&
        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500',
      selecionado && 'bg-teal-50 ring-1 ring-inset ring-teal-200',
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
      'px-3 py-1.5 tabular-nums text-slate-700',
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
  cor = TEAL[600],
  rotulo,
}: {
  valor: number;
  max: number;
  cor?: string;
  rotulo: string;
}) => (
  <div className="flex items-center justify-end gap-2">
    <span className="tabular-nums">{rotulo}</span>
    <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100">
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
    className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 py-1.5 text-[11px] font-medium text-teal-700 transition-colors hover:bg-teal-50/60"
  >
    {expandido ? 'Mostrar menos' : `Mostrar todos os ${total}`}
    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expandido && 'rotate-180')} />
    {!expandido && <span className="text-slate-400">(exibindo {limite})</span>}
  </button>
);

/** Marcador de conta de automacao, para nao confundir robo com pessoa. */
export const TagAutomacao = () => (
  <span className="ml-2 rounded border border-slate-200 bg-slate-50 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-slate-500">
    automação
  </span>
);
