/**
 * Clientes na leitura da diretoria: de quem a carteira depende.
 * Mapa e lista são recorte, não o cadastro.
 */
import type { ReactNode } from 'react';
import type { Concentracao } from '@/lib/boardEstrategico';

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

export function BoardBriefingClientes({
  concentracao,
  ticket,
  ativos,
  mapa,
  lista,
}: {
  concentracao: Concentracao;
  ticket: number | null;
  ativos: number;
  mapa?: ReactNode;
  lista?: ReactNode;
}) {
  return (
    <>
      <div className="stat-strip" data-cols="3">
        <div className="stat-item">
          <div className="stat-label">Clientes com contrato</div>
          <div className="stat-num">{concentracao.clientes}</div>
          <div className="stat-sub">{ativos} ativos no cadastro</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Metade do contratado</div>
          <div className="stat-num">
            {concentracao.clientesParaMetade === null ? <span className="bd-dash">—</span> : concentracao.clientesParaMetade}
          </div>
          <div className="stat-sub">quantos carregam 50%</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Ticket médio</div>
          <div className="stat-num">{ticket === null ? <span className="bd-dash">—</span> : brl(ticket)}</div>
          <div className="stat-sub">ano · por cliente</div>
        </div>
      </div>

      {concentracao.top.length > 0 && (
        <section className="bd-figure">
          <div className="bd-kicker">Dependência</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Quem carrega o contratado</div>
            <div className="bd-figure-meta">{brl(concentracao.total)}</div>
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

      {mapa && (
        <section className="bd-figure">
          <div className="bd-kicker">Onde</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Carteira por estado</div>
          </div>
          {mapa}
        </section>
      )}

      {lista && (
        <details className="bd-figure">
          <summary className="bd-figure-title" style={{ cursor: 'pointer' }}>Localizar cliente</summary>
          <div style={{ marginTop: 16 }}>{lista}</div>
        </details>
      )}
    </>
  );
}
