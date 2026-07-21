import type { Processo } from '@/types';
import type { RoiProcesso } from '@/utils/roiCalculator';
import { formatarMoeda, formatDecimal } from '@/utils/format';
import { Icon } from '@/components/icons/RoiIcons';
import type { EtapaBreakdown } from '@/components/equipe/mapa/wizard-roi/types';
import { Compare, Delta, KpiExec } from '@/components/equipe/mapa/wizard-roi/primitives';

export function StepEquipeHoras({ processo, calc, ann, etapas }: { processo: Processo; calc: RoiProcesso | undefined; ann: number; etapas: EtapaBreakdown[] }) {
  const pAtual = calc?.custosCategoria.pessoas ?? 0;
  const pFicou = calc?.custosCategoriaFicou.pessoas ?? 0;
  const horasA = calc?.horasAnual ?? 0;
  const horasF = calc?.horasAnualFicou ?? 0;
  return (
    <>
      <div className="roi-section-head"><h3>Mão de obra — atual × estimado</h3><p>Custo de pessoas e horas alocadas no processo, comparando o cenário atual ao projetado após as melhorias. Detalhamento dos campos faltantes está no passo <strong>Diagnóstico</strong>.</p></div>
      <div className="roi-kpi-grid">
        <KpiExec label="Custo Atual / Ano" value={formatarMoeda(pAtual)} formula={`= pessoas × ${formatDecimal(ann, 'exec./ano')}`} variant="atual" />
        <KpiExec label="Estimado / Ano" value={formatarMoeda(pFicou)} formula="= pessoas após melhorias" variant="estimado" />
        <KpiExec label="Economia / Ano" value={formatarMoeda(Math.max(0, pAtual - pFicou))} formula="= atual − estimado" variant="economia" />
        <KpiExec label="Horas Liberadas / Ano" value={formatDecimal(Math.max(0, horasA - horasF), 'h')} formula={`= ${formatDecimal(horasA, 'h')} − ${formatDecimal(horasF, 'h')}`} variant="economia" />
      </div>
      <div className="roi-subhead">Por etapa<span className="roi-subhead-rule" /></div>
      <div className="roi-table-wrap">
        <table className="roi-table">
          <thead><tr><th>Etapa</th><th>Horas / exec</th><th>Custo / exec</th><th style={{ textAlign: 'right' }}>Δ Custo / ano</th></tr></thead>
          <tbody>{etapas.length === 0 ? <tr><td colSpan={4} className="is-empty">Sem etapas cadastradas.</td></tr> : etapas.map(etapa => (
            <tr key={etapa.id}><td>{etapa.nome}</td><td><Compare atual={etapa.horasExec} ficou={etapa.horasFicou} fmt={n => formatDecimal(n, 'h')} /></td><td><Compare atual={etapa.custoExec} ficou={etapa.custoFicou} fmt={formatarMoeda} /></td><td style={{ textAlign: 'right' }}><Delta atual={etapa.custoExec * ann} ficou={etapa.custoFicou * ann} fmt={formatarMoeda} /></td></tr>
          ))}</tbody>
        </table>
      </div>
      {!processo.volume_executions && !processo.frequency && <div className="roi-callout is-warn"><span className="roi-callout-icon"><Icon name="alert" size={16} /></span><div className="roi-callout-body">Volume anual do processo não definido — projeção anual está zerada. Defina o Volume Anual (execuções/ano) no card do processo para ativar o cálculo.</div></div>}
    </>
  );
}
