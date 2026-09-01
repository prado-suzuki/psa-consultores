/**
 * Ferramentas implementadas: redução de tempo, benefício e FTE na área.
 */
import { useState, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AXIS_STYLE, CHART_COLORS, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
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
            <div className="bd-figure-title">Antes × depois e o que a área ganha</div>
          </div>
          {catalogo.length === 0 ? (
            <p className="bd-motivo">Nenhuma ferramenta concluída com medição neste recorte.</p>
          ) : (
            <>
              <div style={{ height: 220, marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={catalogo.filter((c) => c.horasLiberadas != null).slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid {...GRID_STYLE} horizontal={false} />
                    <XAxis type="number" {...AXIS_STYLE} />
                    <YAxis type="category" dataKey="nome" width={150} {...AXIS_STYLE} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${qtde(v)} h / mês`, '']} />
                    <Bar dataKey="horasLiberadas" fill={CHART_COLORS.accent} radius={[0, 3, 3, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
