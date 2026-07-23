import type { ProcessSnapshot } from '@/types';
import type { DiagnosticoRoi } from '@/utils/diagnosticoRoi';
import type { RoiProcesso } from '@/utils/roiCalculator';
import { formatarMoeda, formatDecimal } from '@/utils/format';
import { fmtPayback, fmtRoi } from '@/utils/roiGuards';
import { Icon } from '@/components/icons/RoiIcons';
import type { IndicadoresRoi } from '@/components/equipe/mapa/wizard-roi/types';
import { KpiExec } from '@/components/equipe/mapa/wizard-roi/primitives';

export function StepPrevia({
  snapshots,
  snapshotSelecionado,
  onSelecionarSnapshot,
  snapAtivo,
  indicadores,
  diag,
  calc,
  ann,
  erro,
}: {
  snapshots: ProcessSnapshot[];
  snapshotSelecionado: 'ao-vivo' | string;
  onSelecionarSnapshot: (id: string) => void;
  snapAtivo: ProcessSnapshot | undefined;
  indicadores: IndicadoresRoi;
  diag: DiagnosticoRoi;
  calc: RoiProcesso | undefined;
  ann: number;
  erro: string;
}) {
  const historico = !!snapAtivo;
  return (
    <>
      <div className="roi-section-head"><h3>Prévia do ROI</h3><p>Indicadores consolidados conforme o estado atual do mapeamento. Salve para registrar uma nova <strong>mensuração</strong> no histórico cronológico do processo.</p></div>
      {snapshots.length > 0 && <div className="roi-callout is-info"><span className="roi-callout-icon"><Icon name="info" size={16} /></span><div className="roi-callout-body" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label htmlFor="roi-snapshot-selector" style={{ fontWeight: 600 }}>Visualizar mensuração:</label>
        <select id="roi-snapshot-selector" className="roi-snapshot-select" value={snapshotSelecionado} onChange={event => onSelecionarSnapshot(event.target.value)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', minWidth: 280 }}>
          <option value="ao-vivo">Ao vivo (cálculo atual)</option>
          {[...snapshots].reverse().map(snapshot => <option key={snapshot.id} value={snapshot.id}>Mensuração de {new Date(snapshot.snapshot_at).toLocaleString('pt-BR')}</option>)}
        </select>
        {historico && <span style={{ fontSize: '0.78rem', color: '#475569' }}>Você está vendo dados <strong>estáticos</strong> de uma mensuração anterior. Voltar para "Ao vivo" para salvar nova mensuração.</span>}
      </div></div>}
      {!historico && (!diag.podeCalcular ? <div className="roi-callout is-warn"><span className="roi-callout-icon"><Icon name="alert" size={16} /></span><div className="roi-callout-body"><strong>Há {diag.criticos.length} campo{diag.criticos.length !== 1 ? 's' : ''} pendente{diag.criticos.length !== 1 ? 's' : ''}.</strong>{' '}Os valores abaixo podem estar subestimados. Volte aos passos anteriores para preencher os dados faltantes.</div></div> : <div className="roi-callout is-ok"><span className="roi-callout-icon"><Icon name="check" size={16} /></span><div className="roi-callout-body"><strong>Todos os campos críticos estão preenchidos.</strong> O cálculo abaixo reflete fielmente o mapeamento atual.</div></div>)}
      <div className="roi-subhead">Indicadores consolidados{historico && <span style={{ marginLeft: 8, fontSize: '0.78rem', color: '#0d9488', fontWeight: 600 }}>· Mensuração de {new Date(snapAtivo.snapshot_at).toLocaleString('pt-BR')}</span>}<span className="roi-subhead-rule" /></div>
      <div className="roi-kpi-grid">
        <KpiExec label="Custo Anual" value={formatarMoeda(indicadores.annual_cost)} formula="= pessoas + sistemas + erros + retrabalho" />
        <KpiExec label="Horas Anuais" value={formatDecimal(indicadores.annual_hours, 'h')} formula={`= horas/exec × ${formatDecimal(ann, 'exec/ano')}`} />
        <KpiExec label="Economia Anual" value={formatarMoeda(indicadores.annual_savings)} formula="= annual_cost − custoAnualFicou" />
        <KpiExec label="ROI" value={historico ? formatDecimal(indicadores.roi_percent, '%') : fmtRoi(calc?.roiPercentual)} formula="= economia ÷ investment × 100" />
        <KpiExec label="Payback" value={historico ? formatDecimal(indicadores.payback_months, ' meses') : fmtPayback(calc?.paybackMeses)} formula="= investment ÷ (economia / 12)" variant="payback" />
        <KpiExec label="Horas Liberadas" value={formatDecimal(indicadores.hours_freed, 'h/ano')} formula="= annual_hours − horasAnualFicou" />
        <KpiExec label="Investimento" value={formatarMoeda(indicadores.investment)} formula="= treino + execução + externo" variant="investment" />
      </div>
      {!historico && calc && <><div className="roi-subhead">Composição do custo anual<span className="roi-subhead-rule" /></div><div className="roi-callout is-info"><span className="roi-callout-icon"><Icon name="info" size={16} /></span><div className="roi-callout-body"><div className="roi-summary-grid"><div>Pessoas: <strong>{formatarMoeda(calc.custosCategoria.pessoas)}</strong></div><div>Sistemas: <strong>{formatarMoeda(calc.custosCategoria.sistemas)}</strong></div><div>Retrabalho: <strong>{formatarMoeda(calc.custosCategoria.retrabalho)}</strong></div></div></div></div></>}
      {erro && <div className="roi-callout is-crit"><span className="roi-callout-icon"><Icon name="alert" size={16} /></span><div className="roi-callout-body">{erro}</div></div>}
    </>
  );
}
