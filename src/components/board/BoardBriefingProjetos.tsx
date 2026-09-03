/**
 * Projetos: carga (hora, gente, valor) e quantos a mais as ferramentas cobrem.
 */
import { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AXIS_STYLE, CHART_COLORS, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import { BoardAbas } from '@/components/board/BoardAbas';
import type { ProjetoRow } from '@/lib/dashboardClientesOs/types';
import {
  absorcaoPorFerramentas, cargaDosProjetos, type MembroProjeto,
} from '@/lib/boardProjetosCarga';

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

const qtde = (v: number | null, casas = 1) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: casas });

type Aba = 'carga' | 'capacidade';

export function BoardBriefingProjetos({
  projetos,
  membros,
  horasLiberadasMes,
}: {
  projetos: ProjetoRow[];
  membros: MembroProjeto[];
  horasLiberadasMes: number | null;
}) {
  const [aba, setAba] = useState<Aba>('carga');
  const carga = cargaDosProjetos(projetos, membros);
  const absorcao = absorcaoPorFerramentas(horasLiberadasMes, projetos);
  const horasEst = carga.reduce((acc, p) => acc + p.horasEstimadas, 0);
  const horasReal = carga.reduce((acc, p) => acc + p.horasRealizadas, 0);
  const pessoas = new Set(membros.map((m) => m.user_id)).size;
  const valor = carga.reduce((acc, p) => acc + p.valor, 0);

  return (
    <>
      <div className="stat-strip" data-cols="5" data-reveal>
        <div className="stat-item">
          <div className="stat-label">Projetos</div>
          <div className="stat-num">{carga.length}</div>
          <div className="stat-sub">no recorte</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Horas estimadas</div>
          <div className="stat-num">{qtde(horasEst, 0)}</div>
          <div className="stat-sub">{qtde(horasReal, 0)} feitas</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Pessoas</div>
          <div className="stat-num">{pessoas}</div>
          <div className="stat-sub">no time dos projetos</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Contratado</div>
          <div className="stat-num">{brl(valor)}</div>
          <div className="stat-sub">custo interno: — · sem cargo/hora</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Cabe a mais</div>
          <div className="stat-num">{absorcao.projetosAbsorviveis == null ? <span className="bd-dash">—</span> : qtde(absorcao.projetosAbsorviveis)}</div>
          <div className="stat-sub">hora das ferramentas ÷ mediana do projeto</div>
        </div>
      </div>

      <BoardAbas<Aba>
        value={aba}
        onChange={setAba}
        items={[
          { id: 'carga', label: 'Carga' },
          { id: 'capacidade', label: 'Capacidade' },
        ]}
      />

      {aba === 'carga' && (
        <section className="bd-figure">
          <div className="bd-kicker">Tempo</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Hora, gente e valor por projeto</div>
            <div className="bd-figure-meta">papel = líder / responsável / membro · cargo/hora não está no cadastro</div>
          </div>
          {carga.length === 0 ? (
            <p className="bd-motivo">Nenhum projeto no recorte.</p>
          ) : (
            <>
              <div style={{ height: 240, marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={carga.filter((p) => p.horasEstimadas > 0).slice(0, 10).map((p) => ({
                      nome: p.projeto_nome.length > 28 ? `${p.projeto_nome.slice(0, 26)}…` : p.projeto_nome,
                      horas: p.horasEstimadas,
                    }))}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid {...GRID_STYLE} horizontal={false} />
                    <XAxis type="number" {...AXIS_STYLE} />
                    <YAxis type="category" dataKey="nome" width={160} {...AXIS_STYLE} />
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${qtde(v, 0)} h`, 'estimadas']} />
                    <Bar dataKey="horas" fill={CHART_COLORS.accent} radius={[0, 3, 3, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            <table className="v4-tbl">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Cliente</th>
                  <th>Área</th>
                  <th className="num">Pessoas</th>
                  <th className="num">Papéis</th>
                  <th className="num">Horas est.</th>
                  <th className="num">h / pessoa</th>
                  <th className="num">Horas feitas</th>
                  <th className="num">Contratado</th>
                </tr>
              </thead>
              <tbody>
                {carga.slice(0, 20).map((p) => (
                  <tr key={p.projeto_id}>
                    <td>{p.projeto_nome}</td>
                    <td>{p.cliente_nome ?? '—'}</td>
                    <td>{p.area_nome ?? '—'}</td>
                    <td className="num">{p.pessoas || '—'}</td>
                    <td className="num">{p.pessoas === 0 ? '—' : `${p.lideres}L · ${p.responsaveis}R · ${p.membros}M`}</td>
                    <td className="num">{qtde(p.horasEstimadas, 0)}</td>
                    <td className="num">{qtde(p.horasPorPessoa, 0)}</td>
                    <td className="num">{qtde(p.horasRealizadas, 0)}</td>
                    <td className="num">{p.valor ? brl(p.valor) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {carga.length > 20 && (
              <p className="bd-motivo" style={{ marginTop: 8 }}>
                {carga.length - 20} projetos fora da lista — ordenada por hora estimada.
              </p>
            )}
            </>
          )}
        </section>
      )}

      {aba === 'capacidade' && (
        <section className="bd-figure">
          <div className="bd-kicker">Ferramentas → projetos</div>
          <div className="bd-figure-head">
            <div className="bd-figure-title">Quantos projetos a hora liberada cobre</div>
          </div>
          {absorcao.projetosAbsorviveis == null ? (
            <p className="bd-motivo">
              {absorcao.horasLiberadasMes == null
                ? 'Sem hora liberada medida nas ferramentas deste recorte.'
                : 'Projetos sem hora estimada — não dá para converter FTE em capacidade.'}
            </p>
          ) : (
            <table className="v4-tbl">
              <thead>
                <tr>
                  <th>Leitura</th>
                  <th className="num">Número</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Horas liberadas / mês (ferramentas)</td>
                  <td className="num">{qtde(absorcao.horasLiberadasMes)}</td>
                </tr>
                <tr>
                  <td>Mediana de horas de um projeto ativo</td>
                  <td className="num">{qtde(absorcao.medianaHorasProjeto, 0)}</td>
                </tr>
                <tr>
                  <td>Projetos com hora no cadastro</td>
                  <td className="num">{absorcao.projetosComHora}</td>
                </tr>
                <tr>
                  <td>Projetos a mais que essa hora cobre</td>
                  <td className="num">{qtde(absorcao.projetosAbsorviveis)}</td>
                </tr>
              </tbody>
            </table>
          )}
          <p className="bd-motivo" style={{ marginTop: 12 }}>
            Não é folha. É hora medida das ferramentas contra a mediana de hora dos projetos.
          </p>
        </section>
      )}
    </>
  );
}
