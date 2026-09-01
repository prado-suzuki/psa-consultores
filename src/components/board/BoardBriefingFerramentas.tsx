/**
 * Ferramentas implementadas: redução de tempo, benefício e FTE na área.
 */
import { useState, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AXIS_STYLE, BAR_RADIUS, CHART_COLORS, GRID_STYLE, LEGEND_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import { BoardAbas } from '@/components/board/BoardAbas';
import type { MelhoriaRoi } from '@/lib/boardExecutivo';
import { somaHorasSalvas, fteDeHoras } from '@/lib/boardDiretoria';
import { catalogoFerramentas, ftePorArea } from '@/lib/boardFerramentasLeitura';

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

const qtde = (v: number | null, casas = 1) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: casas });

const Dash = ({ children }: { children?: ReactNode }) => (
  <span className="bd-dash" title={typeof children === 'string' ? children : undefined}>—</span>
);

type Aba = 'implementadas' | 'area';

export function BoardBriefingFerramentas({
  melhorias,
  quemUsa,
}: {
  melhorias: MelhoriaRoi[];
  quemUsa?: ReactNode;
}) {
  const [aba, setAba] = useState<Aba>('implementadas');
  const catalogo = catalogoFerramentas(melhorias);
  const areas = ftePorArea(melhorias);
  const horas = somaHorasSalvas(catalogo.map((c) => c.horasLiberadas));
  const { fte } = fteDeHoras(horas);
  const serieAntesDepois = catalogo
    .filter((c) => c.horasAntes != null && c.horasDepois != null)
    .slice(0, 8)
    .map((c) => ({
      nome: c.nome.length > 22 ? `${c.nome.slice(0, 20)}…` : c.nome,
      nomeCheio: c.nome,
      antes: c.horasAntes as number,
      depois: c.horasDepois as number,
      ganho: c.ganhoPct ?? (c.horasAntes && c.horasAntes > 0
        ? ((c.horasAntes - (c.horasDepois ?? 0)) / c.horasAntes) * 100
        : null),
    }));

  return (
    <>
      <div className="stat-strip" data-cols="4" data-reveal>
        <div className="stat-item">
          <div className="stat-label">Implementadas</div>
          <div className="stat-num">{catalogo.length}</div>
          <div className="stat-sub">processos com medição</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Horas liberadas / mês</div>
          <div className="stat-num">{horas === null ? <Dash>antes × depois ausente</Dash> : qtde(horas, 1)}</div>
          <div className="stat-sub">soma das implementações</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">FTE projetado</div>
          <div className="stat-num">{fte === null ? <Dash /> : qtde(fte)}</div>
          <div className="stat-sub">176 h / mês</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Áreas com ganho</div>
          <div className="stat-num">{areas.length}</div>
          <div className="stat-sub">onde a ferramenta entrou</div>
        </div>
      </div>

      <BoardAbas
        value={aba}
        onChange={setAba}
        items={[
          { id: 'implementadas', label: 'Por ferramenta' },
          { id: 'area', label: 'FTE por área' },
        ]}
      />

      {aba === 'implementadas' && (
        <section className="bd-figure">
          <div className="bd-kicker">Redução</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Antes × depois e o ganho de eficiência</div>
            <div className="bd-figure-meta">barras = hora / mês · linha = ganho %</div>
          </div>
          {catalogo.length === 0 ? (
            <p className="bd-motivo">Nenhuma ferramenta concluída com medição neste recorte.</p>
          ) : (
            <>
              {serieAntesDepois.length === 0 ? (
                <p className="bd-motivo">Sem hora antes × depois no cadastro — a tabela abaixo traz o que existe.</p>
              ) : (
              <div style={{ height: 280, marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={serieAntesDepois} margin={{ top: 8, right: 12, left: 0, bottom: 28 }}>
                    <CartesianGrid {...GRID_STYLE} />
                    <XAxis
                      dataKey="nome"
                      interval={0}
                      angle={-28}
                      textAnchor="end"
                      height={56}
                      {...AXIS_STYLE}
                    />
                    <YAxis
                      yAxisId="horas"
                      {...AXIS_STYLE}
                      tickFormatter={(v: number) => `${qtde(v, 0)}h`}
                    />
                    <YAxis
                      yAxisId="pct"
                      orientation="right"
                      {...AXIS_STYLE}
                      tickFormatter={(v: number) => `${qtde(v, 0)}%`}
                    />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.nomeCheio ?? ''}
                      formatter={(v: number, name: string) => (
                        name === 'Ganho'
                          ? [`${qtde(v, 0)}%`, name]
                          : [`${qtde(v)} h / mês`, name]
                      )}
                    />
                    <Legend
                      {...LEGEND_STYLE}
                      formatter={(v) => <span style={{ color: 'var(--bd-ink2)' }}>{v}</span>}
                    />
                    <Bar yAxisId="horas" dataKey="antes" name="Antes" fill={CHART_COLORS.accentSoft} radius={BAR_RADIUS} maxBarSize={22} />
                    <Bar yAxisId="horas" dataKey="depois" name="Depois" fill={CHART_COLORS.accent} radius={BAR_RADIUS} maxBarSize={22} />
                    <Line
                      yAxisId="pct"
                      type="monotone"
                      dataKey="ganho"
                      name="Ganho"
                      stroke={CHART_COLORS.warn}
                      strokeWidth={2}
                      dot={{ r: 3, fill: CHART_COLORS.warn }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              )}
            <table className="v4-tbl">
              <thead>
                <tr>
                  <th>Ferramenta</th>
                  <th>Área</th>
                  <th className="num">Antes</th>
                  <th className="num">Depois</th>
                  <th className="num">Horas / mês</th>
                  <th className="num">Ganho</th>
                  <th className="num">FTE</th>
                  <th className="num">Economia / mês</th>
                </tr>
              </thead>
              <tbody>
                {catalogo.map((c) => (
                  <tr key={c.chave}>
                    <td>{c.nome}{c.implementacoes > 1 ? ` · ${c.implementacoes}` : ''}</td>
                    <td>{c.area ?? '—'}</td>
                    <td className="num">{c.horasAntes == null ? '—' : `${qtde(c.horasAntes)}h`}</td>
                    <td className="num">{c.horasDepois == null ? '—' : `${qtde(c.horasDepois)}h`}</td>
                    <td className="num">{qtde(c.horasLiberadas)}</td>
                    <td className="num">{c.ganhoPct == null ? '—' : `${qtde(c.ganhoPct, 0)}%`}</td>
                    <td className="num">{qtde(c.fte, 2)}</td>
                    <td className="num">{c.economiaMensal == null ? '—' : brl(c.economiaMensal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          )}
        </section>
      )}

      {aba === 'area' && (
        <section className="bd-figure">
          <div className="bd-kicker">Projeção</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">FTE liberado na área que implementou</div>
            <div className="bd-figure-meta">não é folha — é hora medida ÷ 176</div>
          </div>
          {areas.length === 0 ? (
            <p className="bd-motivo">Sem área no cadastro da melhoria.</p>
          ) : (
            <>
              <div style={{ height: 220, marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areas} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid {...GRID_STYLE} horizontal={false} />
                    <XAxis type="number" {...AXIS_STYLE} />
                    <YAxis type="category" dataKey="area" width={130} {...AXIS_STYLE} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${qtde(v, 2)} FTE`, '']} />
                    <Bar dataKey="fte" fill={CHART_COLORS.accent} radius={[0, 3, 3, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="v4-tbl">
                <thead>
                  <tr>
                    <th>Área</th>
                    <th className="num">Ferramentas</th>
                    <th className="num">Horas / mês</th>
                    <th className="num">FTE</th>
                    <th className="num">Economia / mês</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((a) => (
                    <tr key={a.area}>
                      <td>{a.area}</td>
                      <td className="num">{a.ferramentas}</td>
                      <td className="num">{qtde(a.horasLiberadas)}</td>
                      <td className="num">{qtde(a.fte, 2)}</td>
                      <td className="num">{a.economiaMensal == null ? '—' : brl(a.economiaMensal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}

      {quemUsa && (
        <details className="bd-figure">
          <summary className="bd-figure-title" style={{ cursor: 'pointer' }}>Quem usa</summary>
          <div style={{ marginTop: 16 }}>{quemUsa}</div>
        </details>
      )}
    </>
  );
}
