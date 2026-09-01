/**
 * Ferramentas na leitura da diretoria: benefício primeiro.
 * Uso (quem clica) fica atrás do disclosure — a reunião de 28/08 pediu isso.
 */
import type { ReactNode } from 'react';
import type { MelhoriaRoi } from '@/lib/boardExecutivo';
import { fteDeHoras, somaHorasSalvas } from '@/lib/boardDiretoria';

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

const Dash = ({ children }: { children?: ReactNode }) => (
  <span className="bd-dash" title={typeof children === 'string' ? children : undefined}>—</span>
);

export function BoardBriefingFerramentas({
  melhorias,
  quemUsa,
}: {
  melhorias: MelhoriaRoi[];
  quemUsa?: ReactNode;
}) {
  const horas = somaHorasSalvas(melhorias.map((m) => m.time_saved_hours));
  const { fte } = fteDeHoras(horas);
  const comAntesDepois = melhorias.filter((m) => m.baseline_time_hours != null && m.improved_time_hours != null).length;

  return (
    <>
      <div className="stat-strip" data-cols="3">
        <div className="stat-item">
          <div className="stat-label">Horas liberadas / mês</div>
          <div className="stat-num">{horas === null ? <Dash /> : horas.toLocaleString('pt-BR')}</div>
          <div className="stat-sub">{horas === null ? 'antes × depois ausente' : `${comAntesDepois} com antes e depois`}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">FTE</div>
          <div className="stat-num">{fte === null ? <Dash /> : fte.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</div>
          <div className="stat-sub">176 h / mês</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Demanda vs FTE</div>
          <div className="stat-num"><Dash /></div>
          <div className="stat-sub">sem série de demanda</div>
        </div>
      </div>

      <section className="bd-figure">
        <div className="bd-kicker">Benefício</div>
        <div className="bd-figure-head">
          <div className="bd-figure-title">O que a ferramenta devolve</div>
          <div className="bd-figure-meta">interno × cliente: —</div>
        </div>
        {melhorias.length === 0 ? (
          <p className="bd-motivo">Nenhuma melhoria avaliada. Horas e FTE ficam — até existir medição.</p>
        ) : (
          <table className="v4-tbl">
            <thead>
              <tr>
                <th>Processo</th>
                <th>Área</th>
                <th className="num">Antes</th>
                <th className="num">Depois</th>
                <th className="num">Ganho</th>
                <th className="num">FTE</th>
                <th className="num">Economia / mês</th>
              </tr>
            </thead>
            <tbody>
              {melhorias.map((m) => {
                const linha = fteDeHoras(m.time_saved_hours ?? null);
                const nome = m.process_name?.trim() || m.improvement_description?.trim() || '—';
                return (
                  <tr key={m.id}>
                    <td>{nome}</td>
                    <td>{m.process_area?.trim() || '—'}</td>
                    <td className="num">{m.baseline_time_hours == null ? '—' : `${m.baseline_time_hours}h`}</td>
                    <td className="num">{m.improved_time_hours == null ? '—' : `${m.improved_time_hours}h`}</td>
                    <td className="num">
                      {m.time_saved_percent == null
                        ? '—'
                        : `${m.time_saved_percent.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`}
                    </td>
                    <td className="num">{linha.fte == null ? '—' : linha.fte.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                    <td className="num">{m.cost_saved_monthly == null ? '—' : brl(m.cost_saved_monthly)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {quemUsa && (
        <details className="bd-figure">
          <summary className="bd-figure-title" style={{ cursor: 'pointer' }}>Quem usa</summary>
          <div style={{ marginTop: 16 }}>{quemUsa}</div>
        </details>
      )}
    </>
  );
}
