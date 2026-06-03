import { Tooltip } from './Tooltip';

export interface PageStat {
  /** Rótulo curto do indicador (ex.: "Processos", "Horas totais"). */
  label: string;
  /** Valor já formatado (ex.: "41", "1.234h", "R$ 12.000"). */
  value: string;
  /** Texto de ajuda opcional exibido ao passar o mouse no rótulo. */
  tooltip?: string;
  /** Cor de destaque do valor (default: cor de acento). */
  cor?: string;
}

/**
 * Faixa de indicadores globais exibida no topo das páginas de listagem
 * (Processos, Responsáveis, etc.). Layout responsivo em cards compactos —
 * estilo consistente com o restante do app sem depender de classes do CSS.
 */
export default function PageStats({ stats }: { stats: PageStat[] }) {
  if (!stats.length) return null;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 10,
        margin: '4px 0 18px',
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: '10px 14px',
          }}
        >
          <div
            style={{
              fontSize: '0.68rem',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontWeight: 700,
              marginBottom: 2,
            }}
          >
            {s.tooltip ? <Tooltip text={s.tooltip}>{s.label}</Tooltip> : s.label}
          </div>
          <div
            style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              color: s.cor || 'var(--accent-color)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.1,
            }}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
