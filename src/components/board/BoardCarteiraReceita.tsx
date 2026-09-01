/**
 * Receita e renovação: duas planilhas lado a lado, gráfico de linha ao clicar.
 */
import { useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AXIS_STYLE, CHART_COLORS, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import {
  LINHAS_TABELA_CARTEIRA,
  rankingPorGasto,
  rankingPorRenovacao,
  type ClienteCarteira,
} from '@/lib/boardCarteira';

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

const qtde = (v: number | null, casas = 0) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: casas });

const rotuloEixo = (nome: string) =>
  nome.length > 16 ? `${nome.slice(0, 14)}…` : nome;

function serieLinha(rows: ClienteCarteira[], valor: (c: ClienteCarteira) => number) {
  return rows.map((c) => ({
    nome: rotuloEixo(c.cliente_nome),
    nomeCheio: c.cliente_nome,
    valor: valor(c),
  }));
}

export function BoardCarteiraReceita({ carteira }: { carteira: ClienteCarteira[] }) {
  const [mais, setMais] = useState(false);
  const [grafico, setGrafico] = useState(false);

  const porGasto = useMemo(() => rankingPorGasto(carteira), [carteira]);
  const porRenovacao = useMemo(() => rankingPorRenovacao(carteira), [carteira]);
  const gastoVisivel = mais ? porGasto : porGasto.slice(0, LINHAS_TABELA_CARTEIRA);
  const renoVisivel = mais ? porRenovacao : porRenovacao.slice(0, LINHAS_TABELA_CARTEIRA);
  const temMais = porGasto.length > LINHAS_TABELA_CARTEIRA || porRenovacao.length > LINHAS_TABELA_CARTEIRA;

  return (
    <>
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
            <TabelaGasto rows={gastoVisivel} />
          )}
        </section>
        <section className="bd-figure">
          <div className="bd-kicker">Renovação</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Quem volta a contratar</div>
            <div className="bd-figure-meta">OS depois da primeira</div>
          </div>
          {porRenovacao.length === 0 ? (
            <p className="bd-motivo">Nenhum cliente com segunda OS datada no recorte.</p>
          ) : (
            <TabelaRenovacao rows={renoVisivel} />
          )}
        </section>
      </div>

      {(temMais || porGasto.length > 0) && (
        <div className="bd-acoes">
          {temMais && (
            <button type="button" className="bd-acao" onClick={() => setMais((v) => !v)}>
              {mais
                ? 'Recolher'
                : `Ver mais · ${porGasto.length + porRenovacao.length - gastoVisivel.length - renoVisivel.length} linhas`}
            </button>
          )}
          {porGasto.length > 0 && (
            <button type="button" className="bd-acao" onClick={() => setGrafico((v) => !v)}>
              {grafico ? 'Ocultar gráfico' : 'Ver gráfico'}
            </button>
          )}
        </div>
      )}

      {grafico && porGasto.length > 0 && (
        <div className="bd-grid-2">
          <GraficoLinhaCarteira
            kicker="Gasto"
            title="Contratado por cliente"
            data={serieLinha(gastoVisivel, (c) => c.gasto)}
            formatar={brl}
          />
          {porRenovacao.length > 0 && (
            <GraficoLinhaCarteira
              kicker="Renovação"
              title="Quantas vezes voltou"
              data={serieLinha(renoVisivel, (c) => c.renovacoes)}
              formatar={(v) => qtde(v)}
            />
          )}
        </div>
      )}
    </>
  );
}

function TabelaGasto({ rows }: { rows: ClienteCarteira[] }) {
  return (
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
        {rows.map((c) => (
          <tr key={c.cliente_id}>
            <td>{c.cliente_nome}</td>
            <td className="num">{brl(c.gasto)}</td>
            <td className="num">{c.os}</td>
            <td className="num">{c.renovacoes || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabelaRenovacao({ rows }: { rows: ClienteCarteira[] }) {
  return (
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
        {rows.map((c) => (
          <tr key={c.cliente_id}>
            <td>{c.cliente_nome}</td>
            <td className="num">{c.renovacoes}</td>
            <td className="num">{qtde(c.diasMedioAditivo)}</td>
            <td className="num">{brl(c.gasto)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GraficoLinhaCarteira({
  kicker,
  title,
  data,
  formatar,
}: {
  kicker: string;
  title: string;
  data: { nome: string; nomeCheio: string; valor: number }[];
  formatar: (v: number) => string;
}) {
  return (
    <section className="bd-figure">
      <div className="bd-kicker">{kicker}</div>
      <div className="bd-figure-head">
        <div className="bd-figure-title">{title}</div>
      </div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 28 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis
              dataKey="nome"
              interval={0}
              angle={-28}
              textAnchor="end"
              height={56}
              {...AXIS_STYLE}
            />
            <YAxis {...AXIS_STYLE} tickFormatter={(v: number) => formatar(v)} />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.nomeCheio ?? ''}
              formatter={(v: number) => [formatar(v), '']}
            />
            <Line
              type="monotone"
              dataKey="valor"
              stroke={CHART_COLORS.accent}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_COLORS.accent }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
