/**
 * Briefing da diretoria: faixa de decisão + tendência + projeção.
 * Rótulo curto. Sem parágrafo. O gráfico carrega a leitura.
 */
import type { ReactNode } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AXIS_STYLE, CHART_COLORS, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import type { MesComparado } from '@/lib/boardEstrategico';
import type { Concentracao } from '@/lib/boardEstrategico';
import {
  MIX_ROTULO, rotuloMesIso, type MixAtivos, type PontoHorizonte,
  type PontoMixMensal, type PontoOsg, type SaudeOsg,
} from '@/lib/boardDiretoria';

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

const brlEixo = (v: number) => (v === 0 ? '0' : `${Math.round(v / 1000)}k`);

/** Ritmo vira 10,666… — o tooltip não pode vazar o float cru. */
const qtde = (v: number) =>
  typeof v === 'number' && Number.isFinite(v)
    ? v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
    : '—';

export interface BoardBriefingDiretoriaProps {
  mix: MixAtivos;
  serieMix: PontoMixMensal[];
  ticket: number | null;
  caixa: number;
  serieReceita: MesComparado[];
  horizonte: { serie: PontoHorizonte[]; semFim: number };
  osg: SaudeOsg;
  serieOsg: PontoOsg[];
  concentracao: Concentracao;
  onProjetos: () => void;
  onFerramentas: () => void;
}

const Figura = ({
  kicker, title, meta, children, height = 200,
}: {
  kicker: string; title: string; meta?: string; children: ReactNode; height?: number;
}) => (
  <section className="bd-figure">
    <div className="bd-kicker">{kicker}</div>
    <div className="bd-figure-head">
      <div className="bd-figure-title">{title}</div>
      {meta && <div className="bd-figure-meta">{meta}</div>}
    </div>
    <div style={{ height }}>{children}</div>
  </section>
);

export function BoardBriefingDiretoria({
  mix, serieMix, ticket, caixa, serieReceita, horizonte, osg, serieOsg, concentracao, onProjetos, onFerramentas,
}: BoardBriefingDiretoriaProps) {
  const deltaCls = mix.delta > 0 ? 'pill-up' : mix.delta < 0 ? 'pill-down' : 'pill-neutral';
  const deltaTxt = mix.delta === 0 ? 'estável' : `${mix.delta > 0 ? '+' : ''}${mix.delta} vs 30d`;

  return (
    <>
      <div className="stat-strip" data-cols="5" data-reveal>
        <button type="button" className="stat-item" data-clickable="true" onClick={onProjetos}>
          <div className="stat-label">Ativos</div>
          <div className="stat-num">{mix.ativos}</div>
          <span className={`pill ${deltaCls}`}>{deltaTxt}</span>
        </button>
        <div className="stat-item">
          <div className="stat-label">Ticket médio</div>
          <div className="stat-num">{ticket === null ? <span className="bd-dash">—</span> : brl(ticket)}</div>
          <div className="stat-sub">ano · por cliente</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Caixa contratado</div>
          <div className="stat-num">{brl(caixa)}</div>
          <div className="stat-sub">vigente</div>
        </div>
        <button type="button" className="stat-item" data-clickable="true" onClick={onFerramentas}>
          <div className="stat-label">FTE liberado</div>
          <div className="stat-num"><span className="bd-dash">—</span></div>
          <div className="stat-sub">hora antes/depois ausente</div>
        </button>
        <div className="stat-item">
          <div className="stat-label">OSG · clientes</div>
          <div className="stat-num">{osg.clientesAno}<span style={{ fontSize: 16, color: 'var(--bd-ink3)', fontWeight: 500 }}>/{osg.meta}</span></div>
          <div className="stat-sub">projeção {Math.round(osg.projecaoAno)}</div>
        </div>
      </div>

      <div className="bd-grid-2">
        <Figura kicker="Mix" title="De onde veio o ativo" meta="30 dias · novo × aditivo × já no livro">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serieMix} barCategoryGap="28%" margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="mes" tickFormatter={rotuloMesIso} {...AXIS_STYLE} />
              <YAxis allowDecimals={false} {...AXIS_STYLE} />
              <Tooltip
                {...TOOLTIP_STYLE}
                labelFormatter={(m: string) => rotuloMesIso(m)}
                formatter={(v: number, n: string) => [qtde(v), MIX_ROTULO[n as keyof typeof MIX_ROTULO] ?? n]}
              />
              <Bar dataKey="cliente_novo" stackId="m" fill={CHART_COLORS.accent} />
              <Bar dataKey="aditivo" stackId="m" fill={CHART_COLORS.tax} />
              <Bar dataKey="entrega_planejada" stackId="m" fill={CHART_COLORS.accentSoft} />
            </BarChart>
          </ResponsiveContainer>
        </Figura>

        <Figura kicker="Tendência" title="Contratado × mesmo mês do ano anterior">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serieReceita} barCategoryGap="26%" margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="mes" tickFormatter={rotuloMesIso} {...AXIS_STYLE} />
              <YAxis tickFormatter={brlEixo} {...AXIS_STYLE} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => brl(v)} labelFormatter={(m: string) => rotuloMesIso(m)} />
              <Bar dataKey="anterior" fill={CHART_COLORS.accentSoft} />
              <Bar dataKey="atual" fill={CHART_COLORS.accent} />
            </BarChart>
          </ResponsiveContainer>
        </Figura>

        <Figura
          kicker="Projeção"
          title="Caixa que vence à frente"
          meta={horizonte.semFim > 0 ? `${horizonte.semFim} OS sem data de fim` : undefined}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={horizonte.serie} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="mes" tickFormatter={rotuloMesIso} {...AXIS_STYLE} />
              <YAxis tickFormatter={brlEixo} {...AXIS_STYLE} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => brl(v)} labelFormatter={(m: string) => rotuloMesIso(m)} />
              <Area type="monotone" dataKey="valor" stroke={CHART_COLORS.accent} fill={CHART_COLORS.accentSoft} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Figura>

        <Figura kicker="OSG" title="Clientes no ano × meta 30" meta="reta = ritmo atual">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serieOsg} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="mes" tickFormatter={rotuloMesIso} {...AXIS_STYLE} />
              <YAxis allowDecimals={false} {...AXIS_STYLE} />
              <Tooltip
                {...TOOLTIP_STYLE}
                labelFormatter={(m: string) => rotuloMesIso(m)}
                formatter={(v: number) => qtde(v)}
              />
              <Line type="monotone" dataKey="meta" stroke={CHART_COLORS.accentSoft} strokeDasharray="4 4" dot={false} name="Meta" />
              <Line type="monotone" dataKey="projecao" stroke={CHART_COLORS.warn} strokeDasharray="3 3" dot={false} name="Projeção" />
              <Line type="monotone" dataKey="acumulado" stroke={CHART_COLORS.accent} strokeWidth={2} dot={{ r: 3 }} name="Real" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </Figura>
      </div>

      {concentracao.top.length > 0 && (
        <section className="bd-figure">
          <div className="bd-kicker">Dependência</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Quem carrega o contratado</div>
            <div className="bd-figure-meta">
              {concentracao.clientesParaMetade === null
                ? '—'
                : `${concentracao.clientesParaMetade} clientes = metade`}
            </div>
          </div>
          <table className="v4-tbl">
            <thead>
              <tr>
                <th>Cliente</th>
                <th className="num">Contratado</th>
                <th className="num">Fatia</th>
              </tr>
            </thead>
            <tbody>
              {concentracao.top.map((c) => (
                <tr key={c.cliente_id}>
                  <td>{c.nome}</td>
                  <td className="num">{brl(c.receita)}</td>
                  <td className="num">{(c.share * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="bd-motivo" style={{ marginTop: 18 }}>
        Folha, senior OSG e hora interna × cliente: — · cadastro ainda não entrega.
      </p>
    </>
  );
}

export default BoardBriefingDiretoria;
