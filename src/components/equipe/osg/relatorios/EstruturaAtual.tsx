import { useMemo } from 'react';
import { Sprout } from 'lucide-react';
import type { DPBem } from '@/hooks/useRelatorioDP';

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

// Diagrama do ESTADO ATUAL (antes): produtores (PF) ── imóveis (com origem da exploração).
// Sem percentuais; produtores ordenados por baricentro p/ reduzir cruzamento de linhas.
export function EstruturaAtual({ bens, titulo = 'Estrutura atual (antes da reorganização)' }: { bens: DPBem[]; titulo?: string }) {
  const layout = useMemo(() => {
    const fazendas = bens.map((b) => {
      const nomes = new Set<string>();
      [...b.titulares, ...b.matriculas.flatMap((m) => m.titulares)].forEach((t) => nomes.add(t.denominacao));
      const origemRaw = b.matriculas.map((m) => m.tipo_exploracao_posse).find(Boolean) ?? null;
      return { id: b.id, label: b.denominacao || b.referencia_dp || 'Imóvel', origem: origemDe(origemRaw), owners: [...nomes] };
    }).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    if (!fazendas.length) return null;

    const padL = 118, padR = 22, padTop = 20, rowGap = 130, boxH = 58;
    const nCols = Math.max(fazendas.length, 1);
    const W = Math.max(820, padL + padR + Math.max(fazendas.length, 1) * 210);
    const span = W - padL - padR;
    const xOf = (i: number, n: number) => padL + (i + 0.5) * (span / Math.max(n, 1));

    const facX = new Map(fazendas.map((f, i) => [f.id, xOf(i, fazendas.length)]));
    // produtores + baricentro (média do x das fazendas que possui)
    const prodMap = new Map<string, string[]>();
    fazendas.forEach((f) => f.owners.forEach((o) => prodMap.set(o, [...(prodMap.get(o) ?? []), f.id])));
    const produtores = [...prodMap.entries()]
      .map(([nome, fids]) => ({ nome, fids, bary: fids.reduce((a, id) => a + (facX.get(id) ?? 0), 0) / fids.length }))
      .sort((a, b) => a.bary - b.bary || a.nome.localeCompare(b.nome, 'pt-BR'));
    const prodX = new Map(produtores.map((p, i) => [p.nome, xOf(i, produtores.length)]));

    const yProd = padTop, yFaz = padTop + rowGap;
    const prodW = Math.min(178, span / Math.max(produtores.length, 1) - 16);
    const facW = Math.min(190, span / fazendas.length - 16);
    const edges = fazendas.flatMap((f) => f.owners.map((o) => ({ key: `${f.id}-${o}`, px: prodX.get(o)!, fx: facX.get(f.id)!, stroke: f.origem.stroke })));
    return { fazendas, produtores, prodX, facX, yProd, yFaz, prodW, facW, boxH, edges, W, H: padTop * 2 + rowGap + boxH };
  }, [bens]);

  return (
    <section className="overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm">
      <header className="flex items-center gap-2.5 border-b border-osg-100 bg-osg-50/60 px-4 py-2.5">
        <Sprout className="h-4 w-4 text-osg-600" />
        <h3 className="text-sm font-semibold text-osg-moss">{titulo}</h3>
        <span className="ml-auto text-[11px] text-muted-foreground">como a atividade rural é explorada hoje</span>
      </header>

      {!layout ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum imóvel cadastrado — preencha no <b className="font-medium text-muted-foreground">Diagnóstico Patrimonial</b> para o estado atual aparecer.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto p-4">
            <svg viewBox={`0 0 ${layout.W} ${layout.H}`} width="100%" style={{ minWidth: layout.W > 1160 ? layout.W : undefined, fontFamily: 'system-ui, sans-serif' }} role="img" aria-label={titulo}>
              <text x={10} y={layout.yProd + layout.boxH / 2 + 3} fontSize={9} fontWeight={700} letterSpacing="0.06em" fill="#9aa7b4">PRODUTORES</text>
              <text x={10} y={layout.yFaz + layout.boxH / 2 + 3} fontSize={9} fontWeight={700} letterSpacing="0.06em" fill="#9aa7b4">IMÓVEIS</text>

              {/* linhas produtor → imóvel (sem rótulo) */}
              {layout.edges.map((e) => {
                const y1 = layout.yProd + layout.boxH, y2 = layout.yFaz, my = (y1 + y2) / 2;
                return <path key={e.key} d={`M ${e.px} ${y1} C ${e.px} ${my} ${e.fx} ${my} ${e.fx} ${y2}`} fill="none" stroke={e.stroke} strokeOpacity={0.5} strokeWidth={1.4} />;
              })}

              {/* produtores (PF) */}
              {layout.produtores.map((p) => {
                const cx = layout.prodX.get(p.nome)!, x = cx - layout.prodW / 2;
                const lines = wrap(p.nome, 20, 2);
                const top = layout.yProd + (layout.boxH - lines.length * 13) / 2;
                return (
                  <g key={p.nome}>
                    <rect x={x} y={layout.yProd} width={layout.prodW} height={layout.boxH} rx={9} fill="#ffffff" stroke="#cbd5e1" strokeWidth={1.2} />
                    {lines.map((ln, li) => <text key={li} x={cx} y={top + 11 + li * 13} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1e293b">{ln}</text>)}
                  </g>
                );
              })}

              {/* imóveis (fazendas) com cor da origem */}
              {layout.fazendas.map((f) => {
                const cx = layout.facX.get(f.id)!, x = cx - layout.facW / 2;
                const lines = wrap(f.label, 22, 2);
                const top = layout.yFaz + 10;
                return (
                  <g key={f.id}>
                    <rect x={x} y={layout.yFaz} width={layout.facW} height={layout.boxH} rx={9} fill={f.origem.fill} stroke={f.origem.stroke} strokeWidth={1.6} />
                    {lines.map((ln, li) => <text key={li} x={cx} y={top + 11 + li * 12} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="#1e293b">{ln}</text>)}
                    <text x={cx} y={layout.yFaz + layout.boxH - 7} textAnchor="middle" fontSize={8.5} fontWeight={700} letterSpacing="0.04em" fill={f.origem.stroke}>{f.origem.label.toUpperCase()}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-osg-100 px-4 py-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border" style={{ background: '#eef7f2', borderColor: '#125837' }} /> Própria</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border" style={{ background: '#eef6f9', borderColor: '#1b8ea3' }} /> Parceria</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border" style={{ background: '#fffbeb', borderColor: '#b45309' }} /> Arrendamento</span>
            <span className="ml-auto text-muted-foreground">contraparte (parceiro/arrendador) — pendência de migration</span>
          </div>
        </>
      )}
    </section>
  );
}

export default EstruturaAtual;
