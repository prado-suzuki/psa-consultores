import type { Melhoria, Responsavel, Sistema } from '@/types';
import type { RoiProcesso } from '@/utils/roiCalculator';
import { formatarMoeda } from '@/utils/format';
import { Icon } from '@/components/icons/RoiIcons';
import { KpiExec } from '@/components/equipe/mapa/wizard-roi/primitives';

export function StepSistemasInvestimento({
  calc,
  sistemas,
  melhorias,
  custoHM,
  respById,
}: {
  calc: RoiProcesso | undefined;
  sistemas: Sistema[];
  melhorias: Melhoria[];
  custoHM: number;
  respById: Map<string, Responsavel>;
}) {
  return (
    <>
      <div className="roi-section-head"><h3>Sistemas &amp; Investimento</h3><p>Custo recorrente dos <strong>sistemas</strong> (custo fixo/licença mensal × 12 × rateio%) e<strong> investment</strong> one-shot das melhorias do processo — entradas que determinam <strong>ROI %</strong> e <strong>payback</strong>.</p></div>
      <div className="roi-kpi-grid">
        <KpiExec label="Sistemas / Ano" value={formatarMoeda(calc?.custosCategoria.sistemas ?? 0)} formula="= Σ custo fixo/licença × 12 × rateio%" variant="atual" />
        <KpiExec label="Investimento Total" value={formatarMoeda(calc?.investimento ?? 0)} formula="= treino + execução + externo" variant="investment" />
        <KpiExec label="Melhorias vinculadas" value={String(melhorias.length)} formula="vinculadas a este processo" />
      </div>
      <div className="roi-subhead">Sistemas utilizados<span className="roi-subhead-rule" /></div>
      <div className="roi-table-wrap"><table className="roi-table">
        <thead><tr><th>Sistema</th><th>Custo fixo/licença / mês</th><th style={{ textAlign: 'right' }}>Total / ano (×12)</th></tr></thead>
        <tbody>{sistemas.length === 0 ? <tr><td colSpan={3} className="is-empty">Nenhum sistema vinculado às etapas do processo.</td></tr> : sistemas.map(sistema => {
          const valor = sistema.custo_variavel_por_uso ?? 0;
          const total = valor * 12;
          return <tr key={sistema.id}><td>{sistema.nome}</td><td className={valor > 0 ? '' : 'is-muted'}>{formatarMoeda(valor)}</td><td style={{ textAlign: 'right' }} className={total > 0 ? '' : 'is-muted'}>{formatarMoeda(total)}</td></tr>;
        })}</tbody>
      </table></div>
      <div className="roi-subhead">Composição do investment<span className="roi-subhead-rule" /></div>
      <div className="roi-table-wrap"><table className="roi-table">
        <thead><tr><th>Melhoria</th><th>Treino</th><th>Execução</th><th>Externo</th><th style={{ textAlign: 'right' }}>Total invest.</th></tr></thead>
        <tbody>{melhorias.length === 0 ? <tr><td colSpan={5} className="is-empty">Nenhuma melhoria vinculada a este processo.</td></tr> : melhorias.map(melhoria => {
          const treino = (melhoria.training_hours || 0) * custoHM;
          const execucao = (melhoria.executadoPor || []).reduce((acc, item) => {
            const custo = (item.responsavelId && respById.get(item.responsavelId)?.hourly_rate) || custoHM;
            return acc + (item.horas || 0) * custo;
          }, 0);
          const externo = melhoria.one_time_external_cost || 0;
          const total = treino + execucao + externo;
          return <tr key={melhoria.id}><td>{melhoria.improvement_description}</td><td className={treino > 0 ? '' : 'is-muted'}>{formatarMoeda(treino)}</td><td className={execucao > 0 ? '' : 'is-muted'}>{formatarMoeda(execucao)}</td><td className={externo > 0 ? '' : 'is-muted'}>{formatarMoeda(externo)}</td><td style={{ textAlign: 'right' }} className={total > 0 ? '' : 'is-muted'}>{formatarMoeda(total)}</td></tr>;
        })}</tbody>
      </table></div>
      {calc && <div className="roi-callout is-info"><span className="roi-callout-icon"><Icon name="info" size={16} /></span><div className="roi-callout-body"><div className="roi-summary-grid"><div>Treino melhorias: <strong>{formatarMoeda(calc.investimentoBreakdown.treinamentoMelhorias)}</strong></div><div>Execução melhorias: <strong>{formatarMoeda(calc.investimentoBreakdown.execucaoMelhorias)}</strong></div><div>Externo: <strong>{formatarMoeda(calc.investimentoBreakdown.externo)}</strong></div></div></div></div>}
    </>
  );
}
