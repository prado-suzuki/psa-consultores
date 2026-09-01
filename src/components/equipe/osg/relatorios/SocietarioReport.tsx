import { useMemo } from 'react';
import { Info, Network, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { useRelatorioSocietario, type EmpresaSocietaria, type SocioLinha } from '@/hooks/useRelatorioSocietario';
import { GerarDeckButton } from '@/components/equipe/osg/relatorios/GerarApresentacao';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtMoney = (v: number | null): string => (v === null || Number.isNaN(Number(v)) ? '—' : brl.format(Number(v)));
const fmtInt = (v: number | null): string => (v === null || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR'));
const fmtPct = (n: number | null): string => (n === null ? '—' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`);

// % do sócio: SEMPRE quotas/Σquotas. Percentual não soma ao longo do tempo, e
// por isso o quadro (v_quadro_societario) não o agrega nem o guarda. Quem quer
// o percentual do quadro calcula de quotas, aqui.
const socioPct = (e: EmpresaSocietaria, s: SocioLinha): number | null =>
  e.totalQuotas > 0 && s.quotas != null ? (Number(s.quotas) / e.totalQuotas) * 100 : null;

// Papel societário da PJ (campo pessoa.tipo_empresa).
const PAPEL_LABEL: Record<string, string> = { PR: 'Proprietária', CN: 'Controladora', SC: 'Sócia' };
const papelTxt = (t: string | null): string => (t ? PAPEL_LABEL[t] ?? t : '');

const th = 'whitespace-nowrap border-b border-osg-200 bg-muted px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground';
const td = 'border-t border-osg-100 px-3 py-2 align-top text-muted-foreground';

// ---------- tabela de quadro societário (= slides 17-18) ----------
function QuadroTabela({ empresa }: { empresa: EmpresaSocietaria }) {
  const HEAD = ['Sócio', 'Quotas', 'Valor', '%'];

  return (
    <section className="overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-osg-100 bg-osg-50/60 px-4 py-2.5">
        <PieChart className="h-4 w-4 shrink-0 text-osg-600" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase text-osg-moss">{empresa.nome}</h3>
          <p className="text-xs text-muted-foreground">
            {empresa.tipoEmpresa ? `${papelTxt(empresa.tipoEmpresa)} · ` : ''}
            {empresa.cnpj ? `CNPJ ${empresa.cnpj} · ` : ''}Capital social {fmtMoney(empresa.totalValor)} · {fmtInt(empresa.totalQuotas)} quotas
          </p>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>{HEAD.map((h, i) => <th key={i} className={cn(th, i > 0 && 'text-right')}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {empresa.socios.map((s, i) => (
              <tr key={i} className="hover:bg-osg-50/30">
                <td className={cn(td, 'font-medium text-foreground')}>{s.nome}</td>
                <td className={cn(td, 'text-right tabular-nums')}>{fmtInt(s.quotas)}</td>
                <td className={cn(td, 'text-right tabular-nums')}>{fmtMoney(s.valor)}</td>
                <td className={cn(td, 'text-right tabular-nums')}>{fmtPct(socioPct(empresa, s))}</td>
              </tr>
            ))}
            <tr className="bg-osg-50/50 font-semibold text-osg-700">
              <td className="border-t border-osg-200 px-3 py-2">TOTAL</td>
              <td className="border-t border-osg-200 px-3 py-2 text-right tabular-nums">{fmtInt(empresa.totalQuotas)}</td>
              <td className="border-t border-osg-200 px-3 py-2 text-right tabular-nums">{fmtMoney(empresa.totalValor)}</td>
              <td className="border-t border-osg-200 px-3 py-2 text-right tabular-nums">100,00%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- organograma societário (SVG, data-driven) ----------
type OrgNode = { id: string; label: string; sub: string | null; kind: 'empresa' | 'pf' | 'pj'; tier: number };
type OrgEdge = { from: string; to: string; pct: string; strong: boolean };

// Quebra o nome em até `maxLines` linhas de ~`max` chars (nomes inteiros, sem cortar).
const wrapLabel = (s: string, max = 20, maxLines = 2): string[] => {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (t.length <= max || !cur) cur = t;
    else if (lines.length < maxLines - 1) { lines.push(cur); cur = w; }
    else { cur = `${cur} ${w}`; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) lines.length = maxLines;
  return lines;
};

// Organograma derivado do quadro societário: sócios (topo) → empresa/controladas (baixo),
// caixas ligadas por arestas com o %. Reutilizado no Fiscal.
export function EstruturaControle({ empresas, titulo = 'Organograma societário (atual)' }: { empresas: EmpresaSocietaria[]; titulo?: string }) {
  const layout = useMemo(() => {
    if (!empresas.length) return null;
    const empresaIds = new Set(empresas.map((e) => e.empresaId));
    const empById = new Map(empresas.map((e) => [e.empresaId, e]));

    // Profundidade de controle: 1 + maior profundidade das PJs-sócias do grupo.
    const depthCache = new Map<string, number>();
    const depth = (id: string, seen = new Set<string>()): number => {
      if (depthCache.has(id)) return depthCache.get(id)!;
      if (seen.has(id)) return 1;
      seen.add(id);
      const e = empById.get(id);
      let d = 1;
      if (e) for (const s of e.socios) if (s.pessoaId && empresaIds.has(s.pessoaId)) d = Math.max(d, depth(s.pessoaId, seen) + 1);
      depthCache.set(id, d);
      return d;
    };

    const nodeMap = new Map<string, OrgNode>();
    empresas.forEach((e) =>
      nodeMap.set(e.empresaId, {
        id: e.empresaId,
        label: e.nome,
        sub: [papelTxt(e.tipoEmpresa), fmtMoney(e.totalValor)].filter(Boolean).join(' · '),
        kind: 'empresa',
        tier: depth(e.empresaId),
      }),
    );
    const edges: OrgEdge[] = [];
    empresas.forEach((e) =>
      e.socios.forEach((s, idx) => {
        const sid = s.pessoaId ?? `s:${e.empresaId}:${idx}`;
        const strong = empresaIds.has(sid); // controle PJ→PJ do grupo
        if (!strong) {
          const ownerTier = Math.max(0, depth(e.empresaId) - 1);
          const cur = nodeMap.get(sid);
          if (!cur) nodeMap.set(sid, { id: sid, label: s.nome, sub: null, kind: s.tipo === 'PJ' ? 'pj' : 'pf', tier: ownerTier });
          else cur.tier = Math.min(cur.tier, ownerTier);
        }
        edges.push({ from: sid, to: e.empresaId, pct: fmtPct(socioPct(e, s)), strong });
      }),
    );

    const nodes = [...nodeMap.values()];
    const byTier = new Map<number, OrgNode[]>();
    nodes.forEach((n) => {
      if (!byTier.has(n.tier)) byTier.set(n.tier, []);
      byTier.get(n.tier)!.push(n);
    });
    const maxTier = Math.max(...nodes.map((n) => n.tier));
    const maxN = Math.max(...[...byTier.values()].map((a) => a.length), 1);

    const padL = 96, padR = 28, padTop = 22, rowGap = 128, boxH = 60, colW = 202;
    const W = Math.max(960, padL + padR + maxN * colW);
    const pos = new Map<string, { cx: number; y: number; boxW: number }>();
    for (const [t, arr] of byTier.entries()) {
      arr.sort((a, b) => (a.kind === 'empresa' ? 1 : 0) - (b.kind === 'empresa' ? 1 : 0) || a.label.localeCompare(b.label, 'pt-BR'));
      const n = arr.length;
      const boxW = Math.min(196, (W - padL - padR) / n - 18);
      arr.forEach((nd, i) => pos.set(nd.id, { cx: padL + (i + 0.5) * ((W - padL - padR) / n), y: padTop + t * rowGap, boxW }));
    }
    const tierLabel = (t: number) => (t === 0 ? 'SÓCIOS' : maxTier === 1 ? 'SOCIEDADE' : t === maxTier ? 'CONTROLADAS' : 'CONTROLADORAS');
    const tierRows = [...new Set(nodes.map((n) => n.tier))].sort((a, b) => a - b).map((t) => ({ y: padTop + t * rowGap, label: tierLabel(t) }));
    const H = padTop * 2 + maxTier * rowGap + boxH;
    return { nodes, edges, pos, tierRows, W, H, boxH };
  }, [empresas]);

  return (
    <section className="overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm">
      <header className="flex items-center gap-2.5 border-b border-osg-100 bg-osg-50/60 px-4 py-2.5">
        <Network className="h-4 w-4 text-osg-600" />
        <h3 className="text-sm font-semibold text-osg-moss">{titulo}</h3>
        <span className="ml-auto text-[11px] text-muted-foreground">derivado do quadro societário</span>
      </header>
      {!layout ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma empresa com quadro societário cadastrado — preencha no módulo <b className="font-medium text-muted-foreground">Quadro Societário</b> para o organograma aparecer.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto p-4">
            <svg
              viewBox={`0 0 ${layout.W} ${layout.H}`}
              width="100%"
              style={{ minWidth: layout.W > 1400 ? layout.W : undefined, fontFamily: 'system-ui, sans-serif' }}
              role="img"
              aria-label={titulo}
            >
              {/* faixas (Sócios / Sociedade / Controladas) */}
              {layout.tierRows.map((r, i) => (
                <text key={`t${i}`} x={12} y={r.y + layout.boxH / 2 + 3} fontSize={9} fontWeight={700} letterSpacing="0.06em" fill="#9aa7b4">{r.label}</text>
              ))}
              {/* arestas */}
              {layout.edges.map((ed, i) => {
                const p = layout.pos.get(ed.from);
                const c = layout.pos.get(ed.to);
                if (!p || !c) return null;
                const y1 = p.y + layout.boxH;
                const y2 = c.y;
                const my = (y1 + y2) / 2;
                const lx = (p.cx + c.cx) / 2;
                return (
                  <g key={i}>
                    <path
                      d={`M ${p.cx} ${y1} C ${p.cx} ${my} ${c.cx} ${my} ${c.cx} ${y2}`}
                      fill="none"
                      stroke={ed.strong ? '#275668' : '#94a3b8'}
                      strokeWidth={ed.strong ? 2 : 1.3}
                    />
                    {ed.pct && ed.pct !== '—' && (
                      <>
                        <rect x={lx - 22} y={my - 9} width={44} height={17} rx={4} fill="#fff" stroke="#e2e8f0" />
                        <text x={lx} y={my + 3} textAnchor="middle" fontSize={10} fontWeight={700} fill="#334155">{ed.pct}</text>
                      </>
                    )}
                  </g>
                );
              })}
              {/* caixas */}
              {layout.nodes.map((n) => {
                const p = layout.pos.get(n.id)!;
                const x = p.cx - p.boxW / 2;
                const fill = n.kind === 'empresa' ? '#eef7f2' : n.kind === 'pj' ? '#eef6f9' : '#ffffff';
                const stroke = n.kind === 'empresa' ? '#125837' : n.kind === 'pj' ? '#1b8ea3' : '#cbd5e1';
                const lines = wrapLabel(n.label, n.kind === 'empresa' ? 24 : 22, 2);
                const blockH = lines.length * 13 + (n.sub ? 12 : 0);
                const top = p.y + (layout.boxH - blockH) / 2;
                return (
                  <g key={n.id}>
                    <rect x={x} y={p.y} width={p.boxW} height={layout.boxH} rx={10} fill={fill} stroke={stroke} strokeWidth={n.kind === 'empresa' ? 1.7 : 1.2} />
                    {lines.map((ln, li) => (
                      <text key={li} x={p.cx} y={top + 11 + li * 13} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1e293b">{ln}</text>
                    ))}
                    {n.sub && <text x={p.cx} y={top + lines.length * 13 + 9} textAnchor="middle" fontSize={10} fill="#64748b">{n.sub}</text>}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="flex flex-wrap gap-4 border-t border-osg-100 px-4 py-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border" style={{ background: '#eef7f2', borderColor: '#125837' }} /> Empresa do grupo</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border" style={{ background: '#ffffff', borderColor: '#cbd5e1' }} /> Pessoa física</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-3 w-4 rounded-sm border" style={{ background: '#eef6f9', borderColor: '#1b8ea3' }} /> PJ externa / holding</span>
          </div>
        </>
      )}
    </section>
  );
}

export function SocietarioReport({ clienteId }: { clienteId: string }) {
  const { data: clientes = [] } = useClientesLista();
  const { data: empresas = [], isLoading } = useRelatorioSocietario(clienteId);
  const clienteNome = clientes.find((c) => c.id === clienteId)?.nome ?? '';

  const totais = useMemo(() => {
    const socioSet = new Set<string>();
    empresas.forEach((e) => e.socios.forEach((s) => s.pessoaId && socioSet.add(s.pessoaId)));
    return { nEmp: empresas.length, capital: empresas.reduce((s, e) => s + e.totalValor, 0), nSocios: socioSet.size };
  }, [empresas]);

  if (isLoading) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Carregando quadro societário…</p>;
  }
  if (empresas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center">
        <PieChart className="h-10 w-10 text-osg-500" />
        <p className="text-sm text-muted-foreground">Nenhuma empresa com quadro societário cadastrado para {clienteNome || 'este cliente'}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            Quadro Societário — <span className="text-osg-700">{clienteNome}</span>
          </h2>
          <span className="text-xs text-muted-foreground">Espelha os slides de Organização Societária · fonte: módulo Quadro Societário</span>
        </div>
        <GerarDeckButton clienteId={clienteId} tipo="societaria" label="Gerar deck Societária" />
      </div>

      <div className="flex overflow-hidden rounded-xl border border-osg-200 bg-background shadow-sm max-sm:flex-col">
        <ResumoCel titulo="Empresas" valor={`${totais.nEmp}`} desc="com quadro societário" first />
        <ResumoCel titulo="Capital social" valor={fmtMoney(totais.capital)} desc="somado das empresas" dot="bg-osg-moss" />
        <ResumoCel titulo="Sócios" valor={`${totais.nSocios}`} desc="pessoas distintas" dot="bg-slate-400" />
      </div>

      {/* Estrutura de controle (organograma derivado) */}
      <EstruturaControle empresas={empresas} />

      {/* Uma tabela por empresa (= slides 17-18) */}
      {empresas.map((e) => <QuadroTabela key={e.empresaId} empresa={e} />)}

      <div className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span>
          Tabelas idênticas aos slides de quadro societário/capital — use <b className="font-semibold text-muted-foreground">Gerar deck Societária</b> para montar os slides no modelo PSA.
          A <b className="font-semibold text-muted-foreground">Estrutura de controle</b> mostra quem controla quem (holding → controladas) a partir do cadastro atual.
          {' '}Pendências de migration (🔴): organograma <b className="font-semibold text-muted-foreground">antes (AS-IS) × depois (TO-BE)</b> e <b className="font-semibold text-muted-foreground">% de exploração por sócio</b> dependem de campo de cenário/versão.
        </span>
      </div>
    </div>
  );
}

function ResumoCel({
  titulo, valor, desc, dot = 'bg-osg-moss', first = false,
}: { titulo: string; valor: string; desc: string; dot?: string; first?: boolean }) {
  return (
    <div className={cn('flex-1 px-5 py-3.5', !first && 'sm:border-l max-sm:border-t border-osg-100')}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className={cn('h-2 w-2 rounded-sm', dot)} /> {titulo}
      </div>
      <div className="mt-1 text-[22px] font-semibold leading-tight text-foreground">{valor}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}

export default SocietarioReport;
