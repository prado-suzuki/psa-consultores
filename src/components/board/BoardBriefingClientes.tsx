/**
 * Clientes: receita, renovação, oferta (produto) e tempo de aditivo.
 */
import { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AXIS_STYLE, CHART_COLORS, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import { BoardAbas } from '@/components/board/BoardAbas';
import type { FatiaRegiao, FatiaServico, LacunaAditivo } from '@/lib/boardOportunidade';
import { clientesCicloVencido, type ClienteCarteira } from '@/lib/boardCarteira';

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

const qtde = (v: number | null, casas = 0) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: casas });

type Aba = 'receita' | 'oferta' | 'aditivo';

export function BoardBriefingClientes({
  regioes,
  servicos,
  lacunas,
  ticket,
  ativos,
  carteira,
  diasAditivo,
}: {
  regioes: FatiaRegiao[];
  servicos: FatiaServico[];
  lacunas: LacunaAditivo[];
  ticket: number | null;
  ativos: number;
  carteira: ClienteCarteira[];
  diasAditivo: number | null;
}) {
  const [aba, setAba] = useState<Aba>('receita');
  const topServico = servicos.find((s) => s.chave !== 'sem_servico');
  const topGasto = carteira[0];
  const topRenovacao = [...carteira].sort((a, b) => b.renovacoes - a.renovacoes)[0];
  const chartServico = servicos.filter((s) => s.chave !== 'sem_servico').slice(0, 8);
  const porGasto = carteira.slice(0, 12);
  const porRenovacao = [...carteira].sort((a, b) => b.renovacoes - a.renovacoes || b.gasto - a.gasto).slice(0, 12);
  const cicloVencido = clientesCicloVencido(carteira);

  return (
    <>
      <div className="stat-strip" data-cols="5" data-reveal>
        <div className="stat-item">
          <div className="stat-label">Clientes ativos</div>
          <div className="stat-num">{ativos}</div>
          <div className="stat-sub">{regioes.length} praças</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Oferta mais recorrente</div>
          <div className="stat-num" style={{ fontSize: topServico && topServico.rotulo.length > 16 ? 16 : undefined }}>
            {topServico ? topServico.rotulo : <span className="bd-dash">—</span>}
          </div>
          <div className="stat-sub">{topServico ? `${topServico.clientes} clientes` : 'sem produto na OS'}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Quem mais gera receita</div>
          <div className="stat-num" style={{ fontSize: 18 }}>{topGasto ? topGasto.cliente_nome : <span className="bd-dash">—</span>}</div>
          <div className="stat-sub">{topGasto ? brl(topGasto.gasto) : 'sem OS'}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Quem mais renova</div>
          <div className="stat-num" style={{ fontSize: 18 }}>{topRenovacao && topRenovacao.renovacoes > 0 ? topRenovacao.cliente_nome : <span className="bd-dash">—</span>}</div>
          <div className="stat-sub">{topRenovacao && topRenovacao.renovacoes > 0 ? `${topRenovacao.renovacoes} aditivos` : 'sem segunda OS'}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Tempo médio de aditivo</div>
          <div className="stat-num">{diasAditivo == null ? <span className="bd-dash">—</span> : qtde(diasAditivo)}</div>
          <div className="stat-sub">{diasAditivo == null ? 'um contrato só' : 'dias entre OS do mesmo cliente'}</div>
        </div>
      </div>

      <BoardAbas<Aba>
        value={aba}
        onChange={setAba}
        items={[
          { id: 'receita', label: 'Receita e renovação' },
          { id: 'oferta', label: 'Oferta' },
          { id: 'aditivo', label: 'Aditivo' },
        ]}
      />

      {aba === 'receita' && (
        <div className="bd-grid-2">
          <section className="bd-figure">
            <div className="bd-kicker">Gasto</div>
            <div className="bd-figure-head">
              <div className="bd-figure-title">Quem mais gera receita na PSA</div>
              <div className="bd-figure-meta">soma do contratado das OS</div>
            </div>
            {porGasto.length === 0 ? (
              <p className="bd-motivo">Nenhuma OS no recorte.</p>
            ) : (
              <>
              <div style={{ height: 220, marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={porGasto.slice(0, 8).map((c) => ({
                      nome: c.cliente_nome.length > 22 ? `${c.cliente_nome.slice(0, 20)}…` : c.cliente_nome,
                      gasto: c.gasto,
                    }))}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid {...GRID_STYLE} horizontal={false} />
                    <XAxis type="number" {...AXIS_STYLE} tickFormatter={(v: number) => brl(v)} />
                    <YAxis type="category" dataKey="nome" width={140} {...AXIS_STYLE} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [brl(v), 'contratado']} />
                    <Bar dataKey="gasto" fill={CHART_COLORS.accent} radius={[0, 3, 3, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="v4-tbl">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th className="num">Contratado</th>
                    <th className="num">OS</th>
                    <th className="num">Renovações</th>
                  </tr>
                </thead>
                <tbody>
                  {porGasto.map((c) => (
                    <tr key={c.cliente_id}>
                      <td>{c.cliente_nome}</td>
                      <td className="num">{brl(c.gasto)}</td>
                      <td className="num">{c.os}</td>
                      <td className="num">{c.renovacoes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </section>
          <section className="bd-figure">
            <div className="bd-kicker">Renovação</div>
            <div className="bd-figure-head">
              <div className="bd-figure-title">Quem volta a contratar</div>
              <div className="bd-figure-meta">OS depois da primeira</div>
            </div>
            {porRenovacao.every((c) => c.renovacoes === 0) ? (
              <p className="bd-motivo">Nenhum cliente com segunda OS datada no recorte.</p>
            ) : (
              <table className="v4-tbl">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th className="num">Renovações</th>
                    <th className="num">Dias até aditivo</th>
                    <th className="num">Contratado</th>
                  </tr>
                </thead>
                <tbody>
                  {porRenovacao.filter((c) => c.renovacoes > 0).map((c) => (
                    <tr key={c.cliente_id}>
                      <td>{c.cliente_nome}</td>
                      <td className="num">{c.renovacoes}</td>
                      <td className="num">{qtde(c.diasMedioAditivo)}</td>
                      <td className="num">{brl(c.gasto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {aba === 'oferta' && (
        <>
          <section className="bd-figure">
            <div className="bd-kicker">O quê</div>
            <div className="bd-figure-head">
              <div className="bd-figure-title">Ocorrência por produto contratado</div>
              <div className="bd-figure-meta">
                {ticket == null ? 'ticket da carteira: —' : `ticket médio ${brl(ticket)}`}
                · serviço da OS está vazio — usamos o produto
              </div>
            </div>
            {chartServico.length === 0 ? (
              <p className="bd-motivo">OS sem serviço e sem produto. Ocorrência fica —.</p>
            ) : (
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartServico} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid {...GRID_STYLE} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} {...AXIS_STYLE} />
                    <YAxis type="category" dataKey="rotulo" width={170} {...AXIS_STYLE} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v} clientes`, '']} />
                    <Bar dataKey="clientes" fill={CHART_COLORS.accent} radius={[0, 3, 3, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
          {servicos.length > 0 && (
            <section className="bd-figure">
              <div className="bd-kicker">Ticket</div>
              <div className="bd-figure-head">
                <div className="bd-figure-title">Produto · clientes e ticket</div>
              </div>
              <table className="v4-tbl">
                <thead>
                  <tr>
                    <th>Oferta</th>
                    <th className="num">Clientes</th>
                    <th className="num">OS</th>
                    <th className="num">Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {servicos.filter((s) => s.chave !== 'sem_servico').slice(0, 12).map((s) => (
                    <tr key={s.chave}>
                      <td>{s.rotulo}</td>
                      <td className="num">{s.clientes}</td>
                      <td className="num">{s.os}</td>
                      <td className="num">{s.ticket == null ? '—' : brl(s.ticket)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      {aba === 'aditivo' && (
        <>
        <section className="bd-figure">
          <div className="bd-kicker">Decisão</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Quem já passou o próprio ciclo de aditivo</div>
            <div className="bd-figure-meta">
              dias desde a última OS ≥ intervalo médio daquele cliente
              · tempo médio da carteira {diasAditivo == null ? '—' : `${qtde(diasAditivo)} dias`}
            </div>
          </div>
          {cicloVencido.length === 0 ? (
            <p className="bd-motivo">
              Ninguém com segunda OS datada e intervalo já vencido neste recorte.
            </p>
          ) : (
            <table className="v4-tbl">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="num">Dias desde a última</th>
                  <th className="num">Ciclo médio</th>
                  <th className="num">Renovações</th>
                  <th className="num">Contratado</th>
                </tr>
              </thead>
              <tbody>
                {cicloVencido.slice(0, 12).map((c) => (
                  <tr key={c.cliente_id}>
                    <td>{c.cliente_nome}</td>
                    <td className="num">{qtde(c.diasDesdeUltima)}</td>
                    <td className="num">{qtde(c.diasMedioAditivo)}</td>
                    <td className="num">{c.renovacoes}</td>
                    <td className="num">{brl(c.gasto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="bd-figure">
          <div className="bd-kicker">Vender</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Pares da praça já contratam e este cliente não</div>
            <div className="bd-figure-meta">mín. 3 clientes na região · oferta em ≥ 30%</div>
          </div>
          {lacunas.length === 0 ? (
            <p className="bd-motivo">
              Sem similaridade suficiente: praça com poucos clientes, ou a oferta ainda não se repete o bastante.
            </p>
          ) : (
            <table className="v4-tbl">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Região</th>
                  <th>Oferta ausente</th>
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
      )}
    </>
  );
}
