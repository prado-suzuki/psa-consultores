import type { CategoriaDiagnostico, ItemDiagnostico, StatusItem } from '@/utils/diagnosticoRoi';
import { formatDecimal } from '@/utils/format';
import { Icon, StatusGlyph, type RoiIconName } from '@/components/icons/RoiIcons';
import { CAT_ICON } from '@/components/equipe/mapa/wizard-roi/constants';
import { temDestino } from '@/components/equipe/mapa/wizard-roi/navigation';

type StatusKey = 'ok' | 'warn' | 'crit' | 'zero';

function statusKey(status: StatusItem): StatusKey {
  if (status === 'ok') return 'ok';
  if (status === 'zerado') return 'zero';
  if (status === 'incompleto') return 'warn';
  return 'crit';
}

function statusLabel(status: StatusItem): string {
  if (status === 'ok') return 'OK';
  if (status === 'zerado') return 'Vazio';
  if (status === 'incompleto') return 'Pendente';
  return 'Faltando';
}

export function StatusBadge({ status }: { status: StatusItem }) {
  const key = statusKey(status);
  const icon: RoiIconName = key === 'ok' ? 'check' : key === 'warn' ? 'alert' : key === 'crit' ? 'cross' : 'minus';
  return (
    <span className={`roi-status-badge is-${key}`}>
      <Icon name={icon} size={11} strokeWidth={2.4} />
      {statusLabel(status)}
    </span>
  );
}

export function StatusDot({ status }: { status: StatusItem }) {
  const key = statusKey(status);
  return (
    <span className={`roi-status-dot is-${key}`} aria-label={statusLabel(status)}>
      <StatusGlyph status={key} size={8} />
    </span>
  );
}

export function FormulaChip({ formula }: { formula?: string }) {
  if (!formula) return null;
  return <code className="roi-formula" title={formula}>{formula}</code>;
}

export function FieldChips({ campos }: { campos?: string[] }) {
  if (!campos || campos.length === 0) return null;
  return <div className="roi-fields">{campos.map(c => <span key={c} className="roi-field-chip">{c}</span>)}</div>;
}

export function CategoryCard({
  cat,
  onItemClick,
}: {
  cat: CategoriaDiagnostico;
  onItemClick?: (item: ItemDiagnostico) => void;
}) {
  const key = statusKey(cat.status);
  const nOk = cat.itens.filter(i => i.status === 'ok').length;
  return (
    <div className={`roi-cat-card is-${key}`}>
      <div className="roi-cat-head">
        <span className="roi-cat-title"><Icon name={CAT_ICON[cat.icone]} size={16} />{cat.nome}</span>
        <span className="roi-cat-count">{nOk}/{cat.itens.length}</span>
      </div>
      <div className="roi-cat-items">
        {cat.itens.slice(0, 3).map((item, index) => {
          const editavel = item.status !== 'ok' && !!onItemClick && temDestino(item);
          return (
            <div
              key={index}
              className="roi-cat-row"
              style={editavel ? { cursor: 'pointer' } : undefined}
              title={editavel ? 'Clique para editar' : undefined}
              onClick={editavel ? () => onItemClick(item) : undefined}
            >
              <StatusDot status={item.status} />
              <span>{item.campo}</span>
            </div>
          );
        })}
        {cat.itens.length > 3 && <div className="roi-cat-more">+{cat.itens.length - 3} itens — veja tabela consolidada abaixo</div>}
      </div>
    </div>
  );
}

export function RoiDataMap({
  categorias,
  onItemClick,
}: {
  categorias: CategoriaDiagnostico[];
  onItemClick?: (item: ItemDiagnostico) => void;
}) {
  const todos = categorias.flatMap(c => c.itens);
  const ok = todos.filter(i => i.status === 'ok').length;
  const pend = todos.filter(i => i.status === 'incompleto' || i.status === 'faltando').length;
  const zero = todos.filter(i => i.status === 'zerado').length;
  return (
    <div className="roi-data-map">
      <div className="roi-data-map-head">
        <h4>Mapa de dados do ROI</h4>
        <div className="roi-data-map-counts">
          <span>OK: <em>{ok}</em></span><span>Pendentes: <em>{pend}</em></span>
          <span>Vazios: <em>{zero}</em></span><span>Total: <em>{todos.length}</em></span>
        </div>
      </div>
      <div className="roi-table-wrap" style={{ border: 'none', borderRadius: 0, margin: 0 }}>
        <table className="roi-data-map-table">
          <thead><tr><th className="col-indicator">Indicador</th><th className="col-formula">Fórmula</th><th className="col-fields">Campos-fonte</th><th className="col-value">Valor atual</th><th className="col-status">Status</th></tr></thead>
          <tbody>
            {todos.map((item, index) => {
              const editavel = item.status !== 'ok' && !!onItemClick && temDestino(item);
              return (
                <tr key={index} style={editavel ? { cursor: 'pointer' } : undefined} title={editavel ? 'Clique para editar este campo' : undefined} onClick={editavel ? () => onItemClick(item) : undefined}>
                  <td className="col-indicator">{item.campo}</td>
                  <td>{item.formula ? <FormulaChip formula={item.formula} /> : <span style={{ color: 'hsl(var(--slate-400))' }}>—</span>}</td>
                  <td><FieldChips campos={item.camposFonte} /></td>
                  <td className="col-value">{item.valor != null && item.valor !== '' ? (typeof item.valor === 'number' ? formatDecimal(item.valor) : item.valor) : <span style={{ color: 'hsl(var(--slate-400))' }}>—</span>}</td>
                  <td className="col-status"><StatusBadge status={item.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type KpiVariant = 'default' | 'investment' | 'payback' | 'atual' | 'estimado' | 'economia';

export function KpiExec({ label, value, formula, variant = 'default' }: { label: string; value: string; formula?: string; variant?: KpiVariant }) {
  const cls = variant === 'default' ? 'roi-kpi-exec' : `roi-kpi-exec is-${variant}`;
  return <div className={cls}><div className="roi-kpi-label">{label}</div><div className="roi-kpi-value">{value}</div>{formula && <div className="roi-kpi-formula">{formula}</div>}</div>;
}

export function Compare({ atual, ficou, fmt, melhorMenor = true }: { atual: number; ficou: number; fmt: (n: number) => string; melhorMenor?: boolean }) {
  const sameValue = Math.abs(atual - ficou) < 1e-9;
  if (sameValue) return <span className={`roi-compare-single${Math.abs(atual) < 1e-9 ? ' is-muted' : ''}`}>{fmt(atual)}</span>;
  const cls = (melhorMenor ? ficou < atual : ficou > atual) ? 'is-better' : 'is-worse';
  return <span className="roi-compare"><span className="roi-compare-atual">{fmt(atual)}</span><Icon name="arrowRight" size={10} className="roi-compare-arrow" /><span className={`roi-compare-ficou ${cls}`}>{fmt(ficou)}</span></span>;
}

export function Delta({ atual, ficou, fmt, melhorMenor = true }: { atual: number; ficou: number; fmt: (n: number) => string; melhorMenor?: boolean }) {
  const diff = melhorMenor ? atual - ficou : ficou - atual;
  const cls = Math.abs(diff) < 1e-9 ? 'is-zero' : diff > 0 ? 'is-positive' : 'is-negative';
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  return <span className={`roi-delta ${cls}`}>{sign}{fmt(Math.abs(diff))}</span>;
}
