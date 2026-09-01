/**
 * Clientes: ocorrência de serviço e similaridade de praça.
 * Sem mapa — a pergunta é o que vender / aditar, não onde pintar o Brasil.
 */
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AXIS_STYLE, CHART_COLORS, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import type { FatiaRegiao, FatiaServico, LacunaAditivo } from '@/lib/boardOportunidade';

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

export function BoardBriefingClientes({
  regioes,
  servicos,
  lacunas,
  ticket,
  ativos,
}: {
  regioes: FatiaRegiao[];
  servicos: FatiaServico[];
  lacunas: LacunaAditivo[];
  ticket: number | null;
  ativos: number;
}) {
  const topServico = servicos.find((s) => s.chave !== 'sem_servico');
  const chartRegiao = regioes.slice(0, 8);
  const chartServico = servicos.filter((s) => s.chave !== 'sem_servico').slice(0, 8);

  return (
    <>
      <div className="stat-strip" data-cols="3">
        <div className="stat-item">
          <div className="stat-label">Clientes ativos</div>
          <div className="stat-num">{ativos}</div>
          <div className="stat-sub">{regioes.length} praças</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Serviço mais recorrente</div>
          <div className="stat-num" style={{ fontSize: topServico && topServico.rotulo.length > 18 ? 18 : undefined }}>
            {topServico ? topServico.rotulo : <span className="bd-dash">—</span>}
          </div>
          <div className="stat-sub">{topServico ? `${topServico.clientes} clientes` : 'sem serviço na OS'}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Ticket médio</div>
          <div className="stat-num">{ticket === null ? <span className="bd-dash">—</span> : brl(ticket)}</div>
          <div className="stat-sub">ano · por cliente</div>
        </div>
      </div>

      <div className="bd-grid-2">
        <section className="bd-figure">
          <div className="bd-kicker">Onde</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Clientes por região</div>
          </div>
          {chartRegiao.length === 0 ? (
            <p className="bd-motivo">Nenhum cliente no recorte.</p>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRegiao} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} {...AXIS_STYLE} />
                  <YAxis type="category" dataKey="rotulo" width={110} {...AXIS_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v} clientes`, '']} />
                  <Bar dataKey="clientes" fill={CHART_COLORS.accent} radius={[0, 3, 3, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="bd-figure">
          <div className="bd-kicker">O quê</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Ocorrência por serviço</div>
            <div className="bd-figure-meta">clientes distintos</div>
          </div>
          {chartServico.length === 0 ? (
            <p className="bd-motivo">OS sem serviço cadastrado. Ocorrência fica —.</p>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartServico} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid {...GRID_STYLE} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} {...AXIS_STYLE} />
                  <YAxis type="category" dataKey="rotulo" width={130} {...AXIS_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v} clientes`, '']} />
                  <Bar dataKey="clientes" fill={CHART_COLORS.accent} radius={[0, 3, 3, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="bd-figure">
        <div className="bd-kicker">Ticket</div>
        <div className="bd-figure-head">
          <div className="bd-figure-title">Serviço · ocorrência e ticket</div>
        </div>
        {servicos.length === 0 ? (
          <p className="bd-motivo">Nenhuma OS no recorte.</p>
        ) : (
          <table className="v4-tbl">
            <thead>
              <tr>
                <th>Serviço</th>
                <th className="num">Clientes</th>
                <th className="num">OS</th>
                <th className="num">Ticket</th>
              </tr>
            </thead>
            <tbody>
              {servicos.slice(0, 10).map((s) => (
                <tr key={s.chave}>
                  <td>{s.rotulo}</td>
                  <td className="num">{s.clientes}</td>
                  <td className="num">{s.os}</td>
                  <td className="num">{s.ticket === null ? '—' : brl(s.ticket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bd-figure">
        <div className="bd-kicker">Aditivo</div>
        <div className="bd-figure-head">
          <div className="bd-figure-title">Pares da praça já contratam e este cliente não</div>
          <div className="bd-figure-meta">mín. 3 clientes na região · serviço em ≥ 30%</div>
        </div>
        {lacunas.length === 0 ? (
          <p className="bd-motivo">
            Sem similaridade suficiente: praça com poucos clientes, ou ninguém compartilha serviço o bastante.
          </p>
        ) : (
          <table className="v4-tbl">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Região</th>
                <th>Serviço ausente</th>
                <th className="num">Já têm na praça</th>
              </tr>
            </thead>
            <tbody>
              {lacunas.map((l) => (
                <tr key={`${l.cliente_id}-${l.servico}`}>
                  <td>{l.cliente_nome}</td>
                  <td>{l.rotuloRegiao}</td>
                  <td>{l.rotuloServico}</td>
                  <td className="num">{l.ocorreNaRegiao}/{l.clientesNaRegiao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
