/** Faixa de KPIs do dashboard Clientes e OS: TÍTULO acima do número, em cor
 * legível (não o cinza apagado do stat-label padrão do board). */
export interface KpiItem {
  value: React.ReactNode;
  label: string;
  color: string;
  subText?: string;
}

export const KpiStrip = ({ items }: { items: KpiItem[] }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`,
    background: 'var(--board-v4-surface)', border: '1px solid var(--board-v4-line)',
    borderRadius: 12, overflow: 'hidden', marginBottom: 16,
  }}>
    {items.map((it, i) => (
      <div key={i} style={{ padding: '18px 22px 16px', position: 'relative', borderLeft: i > 0 ? '1px solid var(--board-v4-line)' : undefined }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: it.color }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--board-v4-ink2)', marginBottom: 8 }}>{it.label}</div>
        <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1, color: 'var(--board-v4-ink)', fontVariantNumeric: 'tabular-nums' }}>{it.value}</div>
        {it.subText && <div style={{ fontSize: 11.5, color: 'var(--board-v4-ink3)', marginTop: 8 }}>{it.subText}</div>}
      </div>
    ))}
  </div>
);
