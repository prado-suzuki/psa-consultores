/**
 * Projetos na leitura da diretoria: de onde veio o ativo e até quando o
 * caixa está contratado. Sem faturamento total — cadastro incompleto mente.
 */
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AXIS_STYLE, CHART_COLORS, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import {
  MIX_ROTULO, addDaysIso, classificarMix, primeiraOsPorCliente, rotuloMesIso, ticketMedioAno,
  type MixAtivos, type MixClasse, type PontoHorizonte, type PontoMixMensal,
} from '@/lib/boardDiretoria';
import type { OsRow } from '@/lib/dashboardClientesOs/types';

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

const brlEixo = (v: number) => (v === 0 ? '0' : `${Math.round(v / 1000)}k`);

export function BoardBriefingProjetos({
  mix,
  caixa,
  horizonte,
  serieMix,
  os,
  hoje,
}: {
  mix: MixAtivos;
  caixa: number;
  horizonte: { serie: PontoHorizonte[]; semFim: number };
  serieMix: PontoMixMensal[];
  os: OsRow[];
  hoje: string;
}) {
  const ticket = ticketMedioAno(os, hoje);
  const primeira = primeiraOsPorCliente(os);
  const janelaDe = addDaysIso(hoje, -30);
  const linhas = os
    .filter((o) => {
      const s = (o.situacao ?? '').toLowerCase();
      return s !== 'concluido' && s !== 'cancelado';
    })
    .map((o) => ({ o, classe: classificarMix(o, primeira, janelaDe) as MixClasse }))
    .sort((a, b) => b.o.faturamento - a.o.faturamento)
    .slice(0, 12);

  return (
    <>
      <div className="stat-strip" data-cols="5">
        <div className="stat-item">
          <div className="stat-label">Ativos</div>
          <div className="stat-num">{mix.ativos}</div>
          <div className="stat-sub">{mix.delta === 0 ? 'estável vs 30d' : `${mix.delta > 0 ? '+' : ''}${mix.delta} vs 30d`}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Cliente novo</div>
          <div className="stat-num">{mix.fatias.cliente_novo}</div>
          <div className="stat-sub">primeira OS</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Aditivo</div>
          <div className="stat-num">{mix.fatias.aditivo}</div>
          <div className="stat-sub">cliente já na casa</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Ticket médio</div>
          <div className="stat-num">{ticket === null ? <span className="bd-dash">—</span> : brl(ticket)}</div>
          <div className="stat-sub">ano · por cliente</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Caixa vigente</div>
          <div className="stat-num">{brl(caixa)}</div>
          <div className="stat-sub">folha: —</div>
        </div>
      </div>

      <div className="bd-grid-2">
        <section className="bd-figure">
          <div className="bd-kicker">Mix</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">De onde veio o ativo</div>
            <div className="bd-figure-meta">novo × aditivo × já no livro</div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieMix} barCategoryGap="28%" margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="mes" tickFormatter={rotuloMesIso} {...AXIS_STYLE} />
                <YAxis allowDecimals={false} {...AXIS_STYLE} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  labelFormatter={(m: string) => rotuloMesIso(m)}
                  formatter={(v: number, n: string) => [v, MIX_ROTULO[n as keyof typeof MIX_ROTULO] ?? n]}
                />
                <Bar dataKey="cliente_novo" stackId="m" fill={CHART_COLORS.accent} />
                <Bar dataKey="aditivo" stackId="m" fill={CHART_COLORS.tax} />
                <Bar dataKey="entrega_planejada" stackId="m" fill={CHART_COLORS.accentSoft} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="bd-figure">
          <div className="bd-kicker">Horizonte</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Caixa que vence à frente</div>
            {horizonte.semFim > 0 && <div className="bd-figure-meta">{horizonte.semFim} OS sem data de fim</div>}
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={horizonte.serie} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="mes" tickFormatter={rotuloMesIso} {...AXIS_STYLE} />
                <YAxis tickFormatter={brlEixo} {...AXIS_STYLE} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => brl(v)} labelFormatter={(m: string) => rotuloMesIso(m)} />
                <Area type="monotone" dataKey="valor" stroke={CHART_COLORS.accent} fill={CHART_COLORS.accentSoft} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="bd-figure">
        <div className="bd-kicker">Livro</div>
        <div className="bd-figure-head">
          <div className="bd-figure-title">OS ativas · até quando geram caixa</div>
        </div>
        {linhas.length === 0 ? (
          <p className="bd-motivo">Nenhuma OS ativa no recorte.</p>
        ) : (
          <table className="v4-tbl">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Mix</th>
                <th className="num">Contratado</th>
                <th className="num">Fim</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ o, classe }) => (
                <tr key={o.os_id}>
                  <td>{o.cliente_nome}</td>
                  <td>{o.servico_nome?.trim() || '—'}</td>
                  <td>{MIX_ROTULO[classe]}</td>
                  <td className="num">{brl(o.faturamento)}</td>
                  <td className="num">{o.data_fim ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
