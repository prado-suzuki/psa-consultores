import { Tooltip } from './Tooltip';
import AnimatedCounter from './AnimatedCounter';

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
 * Faixa de indicadores globais no topo das páginas de listagem.
 * Cards com hover lift suave e contagem animada quando o valor é numérico.
 */
export default function PageStats({ stats }: { stats: PageStat[] }) {
  if (!stats.length) return null;
  return (
    <div className="page-stats-v2">
      {stats.map((s) => {
        const num = Number(s.value.replace(/[^\d.-]/g, ''));
        const isPureNumber = /^\d+$/.test(s.value);
        return (
          <div key={s.label} className="page-stat-v2">
            <div className="page-stat-label">
              {s.tooltip ? <Tooltip text={s.tooltip}>{s.label}</Tooltip> : s.label}
            </div>
            <div className="page-stat-value" style={s.cor ? { color: s.cor } : undefined}>
              {isPureNumber && Number.isFinite(num)
                ? <AnimatedCounter value={num} />
                : s.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
