import { useMemo } from 'react';
import { Columns2, Rows2, Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ButtonTooltip } from '@/components/ui/button-tooltip';
import type { DPBem } from '@/hooks/useRelatorioDP';

/**
 * Como as duas faixas se arrumam: produtores e imóveis em duas LINHAS (uma
 * acima da outra) ou em duas COLUNAS (lado a lado, cada lista descendo).
 *
 * Quem escolhe é o usuário, por pedido da coordenação em 18/09/2026 — "vê se
 * tem uma opção de colocar vertical ou horizontal pra pessoa escolher". Cada
 * forma ganha num caso: a horizontal é o desenho convencional de organograma e
 * cabe bem com poucos imóveis; a vertical tem largura fixa, então lista longa
 * não estoura a janela nem depende de zoom, e o nome corre na direção da
 * leitura.
 */
export type OrientacaoDoDesenho = 'horizontal' | 'vertical';

// origem / condição de exploração → rótulo + cores do box
type Origem = { label: string; fill: string; stroke: string };
const origemDe = (raw: string | null): Origem => {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('parceria')) return { label: 'Parceria', fill: '#eef6f9', stroke: '#1b8ea3' };
  if (s.includes('arrenda')) return { label: 'Arrendamento', fill: '#fffbeb', stroke: '#b45309' };
  if (s.includes('composse') || s.includes('posse')) return { label: 'Posse', fill: '#f8fafc', stroke: '#94a3b8' };
  if (s.includes('própr') || s.includes('propr') || s.includes('diret')) return { label: 'Própria', fill: '#eef7f2', stroke: '#125837' };
  return { label: raw || 'a definir', fill: '#f8fafc', stroke: '#cbd5e1' };
};

const wrap = (s: string, max: number, maxLines = 2): string[] => {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (t.length <= max || !cur) cur = t;
    else if (lines.length < maxLines - 1) { lines.push(cur); cur = w; }
    else cur = `${cur} ${w}`;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) lines.length = maxLines;
  return lines;
};

const BOX_H = 58;

/**
 * O VÃO ENTRE AS DUAS FAIXAS, e ele já foi de 72 px.
 *
 * O `rowGap` era 130 e o `BOX_H` é 58, então entre a base das caixas de
 * produtor e o topo das de imóvel sobravam 72 px — e as ligações são cúbicas
 * com os dois pontos de controle na metade dessa altura, precisando vencer até
 * 210 px na horizontal dentro deles. Saíam quase verticais e coladas umas nas
 * outras justamente JUNTO ÀS CAIXAS, que é onde se lê quem está ligado a quem.
 * A coordenação reprovou por isso, em 18/09/2026: "tem que aumentar um pouco
 * essa distância, para ver melhor de onde as linhas estão saindo."
 */
const VAO_HORIZONTAL = 132;
const VAO_VERTICAL = 252;

// Horizontal: a reserva da esquerda é dos rótulos das faixas.
const PAD_ESQ = 118;
const PAD_DIR = 22;
const PAD_TOPO = 20;
const LINHA_GAP = BOX_H + VAO_HORIZONTAL;

// Vertical: os rótulos viram cabeçalho de coluna, então a reserva vai para o topo.
const PAD_LADO = 24;
const PAD_BAIXO = 20;
const ROTULO_H = 24;
const BOX_W_VERTICAL = 200;
/** Altura por nó: a caixa mais o respiro entre uma e a seguinte. */
const PASSO_VERTICAL = BOX_H + 26;

/** A posição de um nó no eixo do fluxo — x na horizontal, y na vertical. */
const eixo = (i: number, n: number, base: number, span: number) =>
  base + (i + 0.5) * (span / Math.max(n, 1));

type Caixa = { x: number; y: number; w: number; h: number; cx: number; cy: number };

// Diagrama do ESTADO ATUAL (antes): produtores (PF) ── imóveis (com origem da exploração).
// Sem percentuais; produtores ordenados por baricentro p/ reduzir cruzamento de linhas.
export function EstruturaAtual({
  bens,
  titulo = 'Quem explora cada imóvel hoje',
  modoPrevia = false,
  orientacao = 'horizontal',
  onTrocarOrientacao,
}: {
  bens: DPBem[];
  titulo?: string;
  /** Dentro do modal de prévia: sem cabeçalho próprio e sem rolagem própria. */
  modoPrevia?: boolean;
  orientacao?: OrientacaoDoDesenho;
  /**
   * Sem isto não há alternador — botão que não muda nada é pior que botão
   * nenhum. Quem guarda a escolha é a página, e não este componente: a
   * `Relatorios` monta DUAS instâncias do mesmo relatório, a da prévia e a do
   * bloco que só existe na impressão, e com o estado aqui dentro a orientação
   * escolhida na tela não chegaria ao papel.
   */
  onTrocarOrientacao?: (proxima: OrientacaoDoDesenho) => void;
}) {
  const layout = useMemo(() => {
    const fazendas = bens.map((b) => {
      const nomes = new Set<string>();
      [...b.titulares, ...b.matriculas.flatMap((m) => m.titulares)].forEach((t) => nomes.add(t.denominacao));
      const origemRaw = b.matriculas.map((m) => m.tipo_exploracao_posse).find(Boolean) ?? null;
      return { id: b.id, label: b.denominacao || b.referencia_dp || 'Imóvel', origem: origemDe(origemRaw), owners: [...nomes] };
    }).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    if (!fazendas.length) return null;

    // produtores e as fazendas de cada um
    const prodMap = new Map<string, string[]>();
    fazendas.forEach((f) => f.owners.forEach((o) => prodMap.set(o, [...(prodMap.get(o) ?? []), f.id])));
    const nFaz = fazendas.length;
    const nProd = prodMap.size;
    const vertical = orientacao === 'vertical';

    // A MOLDURA muda com a orientação; o eixo do fluxo, não: nos dois casos os
    // nós se espalham por um `span`, e é sobre ele que o baricentro ordena.
    const W = vertical
      ? PAD_LADO * 2 + BOX_W_VERTICAL * 2 + VAO_VERTICAL
      : Math.max(820, PAD_ESQ + PAD_DIR + nFaz * 210);
    const base = vertical ? PAD_TOPO + ROTULO_H : PAD_ESQ;
    const span = vertical
      ? Math.max(nProd, nFaz) * PASSO_VERTICAL
      : W - PAD_ESQ - PAD_DIR;
    const H = vertical ? base + span + PAD_BAIXO : PAD_TOPO * 2 + LINHA_GAP + BOX_H;

    const prodW = vertical ? BOX_W_VERTICAL : Math.min(178, span / Math.max(nProd, 1) - 16);
    const facW = vertical ? BOX_W_VERTICAL : Math.min(190, span / nFaz - 16);
    const xFaz = PAD_LADO + BOX_W_VERTICAL + VAO_VERTICAL;

    const facPos = new Map(fazendas.map((f, i) => [f.id, eixo(i, nFaz, base, span)]));
    const produtores = [...prodMap.entries()]
      .map(([nome, fids]) => ({ nome, fids, bary: fids.reduce((a, id) => a + (facPos.get(id) ?? 0), 0) / fids.length }))
      .sort((a, b) => a.bary - b.bary || a.nome.localeCompare(b.nome, 'pt-BR'));
    const prodPos = new Map(produtores.map((p, i) => [p.nome, eixo(i, nProd, base, span)]));

    const caixa = (pos: number, w: number, faixaX: number, faixaY: number): Caixa =>
      vertical
        ? { x: faixaX, y: pos - BOX_H / 2, w, h: BOX_H, cx: faixaX + w / 2, cy: pos }
        : { x: pos - w / 2, y: faixaY, w, h: BOX_H, cx: pos, cy: faixaY + BOX_H / 2 };

    const caixaProd = new Map(
      produtores.map((p) => [p.nome, caixa(prodPos.get(p.nome)!, prodW, PAD_LADO, PAD_TOPO)]),
    );
    const caixaFaz = new Map(
      fazendas.map((f) => [f.id, caixa(facPos.get(f.id)!, facW, xFaz, PAD_TOPO + LINHA_GAP)]),
    );

    const edges = fazendas.flatMap((f) =>
      f.owners.map((o) => {
        const cp = caixaProd.get(o)!;
        const cf = caixaFaz.get(f.id)!;
        // Sai sempre pela BORDA que olha para a outra faixa, e a curva usa o
        // meio do vão como ponto de controle: é o vão que dá o respiro que
        // separa uma ligação da vizinha.
        const d = vertical
          ? (() => {
              const x1 = cp.x + cp.w, x2 = cf.x, mx = (x1 + x2) / 2;
              return `M ${x1} ${cp.cy} C ${mx} ${cp.cy} ${mx} ${cf.cy} ${x2} ${cf.cy}`;
            })()
          : (() => {
              const y1 = cp.y + cp.h, y2 = cf.y, my = (y1 + y2) / 2;
              return `M ${cp.cx} ${y1} C ${cp.cx} ${my} ${cf.cx} ${my} ${cf.cx} ${y2}`;
            })();
        return { key: `${f.id}-${o}`, d, stroke: f.origem.stroke };
      }),
    );

    const rotulos = vertical
      ? [
          { texto: 'PRODUTORES', x: PAD_LADO + prodW / 2, y: PAD_TOPO + 10, anchor: 'middle' as const },
          { texto: 'IMÓVEIS', x: xFaz + facW / 2, y: PAD_TOPO + 10, anchor: 'middle' as const },
        ]
      : [
          { texto: 'PRODUTORES', x: 10, y: PAD_TOPO + BOX_H / 2 + 3, anchor: 'start' as const },
          { texto: 'IMÓVEIS', x: 10, y: PAD_TOPO + LINHA_GAP + BOX_H / 2 + 3, anchor: 'start' as const },
        ];

    return { fazendas, produtores, caixaProd, caixaFaz, edges, rotulos, W, H };
  }, [bens, orientacao]);

  const alternador = onTrocarOrientacao ? (
    <AlternadorDeOrientacao valor={orientacao} onTrocar={onTrocarOrientacao} />
  ) : null;

  return (
    <section className="overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm">
      {/* SEM CABEÇALHO NA PRÉVIA: o modal já nomeia a peça no topo, e os dois
          títulos apareciam empilhados dizendo quase a mesma coisa. */}
      {!modoPrevia && (
        <header className="flex items-center gap-2.5 border-b border-osg-100 bg-osg-50/60 px-4 py-2.5">
          <Sprout className="h-4 w-4 text-osg-600" />
          <h3 className="text-sm font-semibold text-osg-moss">{titulo}</h3>
          <div className="ml-auto">{alternador}</div>
        </header>
      )}

      {!layout ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum imóvel cadastrado — preencha no <b className="font-medium text-muted-foreground">Cadastro Patrimonial</b> para o estado atual aparecer.
        </p>
      ) : (
        <>
          {/* A LINHA QUE RESPONDE "QUEM ESTÁ EM QUEM". O cartão diz o que a peça
              mostra e a legenda explica a cor; o que faltava era dizer o que
              cada TRAÇO significa, que é onde a leitura travava. */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Cada linha liga um produtor ao imóvel que ele explora hoje.
            </p>
            {modoPrevia && alternador}
          </div>

          {/* NA PRÉVIA O DIAGRAMA NÃO ROLA SOZINHO. Com a barra própria, a janela
              tinha duas rolagens concorrentes e o zoom não resolvia nada: o
              desenho continuava preso na largura do cartão. Solto, ele assume a
              largura natural e quem governa é o zoom do modal. */}
          <div className={modoPrevia ? 'p-4' : 'overflow-x-auto p-4'}>
            {/* `maxWidth` NO TAMANHO NATURAL, e ele importa na vertical: ali o
                desenho tem 700 px de largura fixa, e com `width: 100%` num
                modal de 1.300 px ele seria ampliado quase duas vezes — caixas e
                texto inflados, o oposto do que a orientação resolve. Limitado,
                o desenho sai no tamanho em que foi desenhado, e igual para todo
                cliente. */}
            <svg viewBox={`0 0 ${layout.W} ${layout.H}`} width="100%" className="mx-auto block" style={{ minWidth: layout.W > 1160 ? layout.W : undefined, maxWidth: layout.W, fontFamily: 'system-ui, sans-serif' }} role="img" aria-label={titulo}>
              {layout.rotulos.map((r) => (
                <text key={r.texto} x={r.x} y={r.y} textAnchor={r.anchor} fontSize={9} fontWeight={700} letterSpacing="0.06em" fill="#9aa7b4">
                  {r.texto}
                </text>
              ))}

              {/* linhas produtor → imóvel (sem rótulo) */}
              {layout.edges.map((e) => (
                <path key={e.key} d={e.d} fill="none" stroke={e.stroke} strokeOpacity={0.5} strokeWidth={1.4} />
              ))}

              {/* produtores (PF) */}
              {layout.produtores.map((p) => {
                const c = layout.caixaProd.get(p.nome)!;
                const lines = wrap(p.nome, 20, 2);
                const top = c.y + (BOX_H - lines.length * 13) / 2;
                return (
                  <g key={p.nome}>
                    <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={9} fill="#ffffff" stroke="#cbd5e1" strokeWidth={1.2} />
                    {lines.map((ln, li) => <text key={li} x={c.cx} y={top + 11 + li * 13} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1e293b">{ln}</text>)}
                  </g>
                );
              })}

              {/* imóveis (fazendas) com cor da origem */}
              {layout.fazendas.map((f) => {
                const c = layout.caixaFaz.get(f.id)!;
                const lines = wrap(f.label, 22, 2);
                const top = c.y + 10;
                return (
                  <g key={f.id}>
                    <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={9} fill={f.origem.fill} stroke={f.origem.stroke} strokeWidth={1.6} />
                    {lines.map((ln, li) => <text key={li} x={c.cx} y={top + 11 + li * 12} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="#1e293b">{ln}</text>)}
                    <text x={c.cx} y={c.y + BOX_H - 7} textAnchor="middle" fontSize={8.5} fontWeight={700} letterSpacing="0.04em" fill={f.origem.stroke}>{f.origem.label.toUpperCase()}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          {/* A LEGENDA MOSTRAVA TRÊS DAS CINCO CORES que o desenho pinta:
              faltavam a posse (imóvel em composse) e o caso sem origem
              cadastrada, que saíam cinzas e sem entrada aqui. */}
          <div className="flex flex-wrap items-center gap-4 border-t border-osg-100 px-4 py-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border" style={{ background: '#eef7f2', borderColor: '#125837' }} /> Própria</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border" style={{ background: '#eef6f9', borderColor: '#1b8ea3' }} /> Parceria</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border" style={{ background: '#fffbeb', borderColor: '#b45309' }} /> Arrendamento</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border" style={{ background: '#f8fafc', borderColor: '#94a3b8' }} /> Posse</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border" style={{ background: '#f8fafc', borderColor: '#cbd5e1' }} /> Outras origens ou a definir</span>
            {/* Saiu daqui "contraparte (parceiro/arrendador) — pendência de
                migration": jargão de banco numa legenda de cores, anunciando ao
                usuário uma pendência nossa em vez de explicar o desenho. */}
            <span className="ml-auto text-muted-foreground">A cor indica a origem da posse de cada imóvel.</span>
          </div>
        </>
      )}
    </section>
  );
}

/**
 * Duas linhas ou duas colunas, e o desenho segue.
 *
 * NÃO VAI PARA O PAPEL (`print:hidden`): é controle de tela, e o que se imprime
 * é a orientação já escolhida.
 */
function AlternadorDeOrientacao({
  valor,
  onTrocar,
}: {
  valor: OrientacaoDoDesenho;
  onTrocar: (proxima: OrientacaoDoDesenho) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-osg-200 bg-osg-50/70 p-0.5 print:hidden">
      <Opcao
        atual={valor}
        valor="horizontal"
        rotulo="Produtores e imóveis em duas linhas, uma acima da outra"
        onTrocar={onTrocar}
      >
        <Rows2 className="h-3.5 w-3.5" aria-hidden />
      </Opcao>
      <Opcao
        atual={valor}
        valor="vertical"
        rotulo="Produtores e imóveis em duas colunas, lado a lado"
        onTrocar={onTrocar}
      >
        <Columns2 className="h-3.5 w-3.5" aria-hidden />
      </Opcao>
    </div>
  );
}

function Opcao({
  atual,
  valor,
  rotulo,
  onTrocar,
  children,
}: {
  atual: OrientacaoDoDesenho;
  valor: OrientacaoDoDesenho;
  rotulo: string;
  onTrocar: (proxima: OrientacaoDoDesenho) => void;
  children: React.ReactNode;
}) {
  const ligada = atual === valor;
  // Botão só de ícone: o `ButtonTooltip` dá o nome (`aria-label`) e o balão de
  // uma vez — ver `ui/button-tooltip.tsx`.
  return (
    <ButtonTooltip text={rotulo}>
      <button
        type="button"
        onClick={() => onTrocar(valor)}
        aria-label={rotulo}
        aria-pressed={ligada}
        className={cn(
          'rounded-md p-1.5 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss',
          ligada
            ? 'bg-background text-osg-700 shadow-sm'
            : 'text-muted-foreground hover:bg-osg-100 hover:text-osg-700',
        )}
      >
        {children}
      </button>
    </ButtonTooltip>
  );
}

export default EstruturaAtual;
