/**
 * Faixa de KPIs do dashboard Clientes e OS.
 *
 * Usa as MESMAS classes da faixa do Estratégico (`.stat-strip` / `.stat-item`)
 * em vez de repetir a anatomia inline. Era o único lugar do Board onde o KPI
 * tinha borda, raio e padding próprios — e, por isso, o único que não
 * acompanhou nenhuma das mudanças de estilo anteriores.
 *
 * O `color` de cada item pinta o PONTO ao lado do rótulo (a faixa de 3px no
 * topo do cartão saiu em toda a área — ver o comentário do `.si-bar`). Este
 * dashboard roda no Board, na Tax e na OSG a partir do mesmo componente, e as
 * cores que chegam aqui já vêm por papel (`ACENTO`, `PAPEL`, `SERIES`), então
 * o ponto veste o tema de quem hospeda sem condicional.
 */
export interface KpiItem {
  value: React.ReactNode;
  label: string;
  color: string;
  subText?: string;
}

export const KpiStrip = ({ items }: { items: KpiItem[] }) => (
  <div className="stat-strip" data-cols={items.length} data-reveal>
    {items.map((it, i) => (
      <div key={i} className="stat-item">
        <div
          className="stat-label"
          style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'none', letterSpacing: 0, fontSize: 12, color: 'var(--bd-ink2)' }}
        >
          <span className="sdot-c" style={{ background: it.color }} />
          {it.label}
        </div>
        <div className="stat-num">{it.value}</div>
        {it.subText && <div className="stat-sub">{it.subText}</div>}
      </div>
    ))}
  </div>
);
