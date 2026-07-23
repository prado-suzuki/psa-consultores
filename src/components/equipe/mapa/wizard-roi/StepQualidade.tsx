import type { RoiProcesso } from '@/utils/roiCalculator';
import { formatarMoeda } from '@/utils/format';
import type { EtapaBreakdown } from '@/components/equipe/mapa/wizard-roi/types';
import { Delta, KpiExec } from '@/components/equipe/mapa/wizard-roi/primitives';

export function StepQualidade({ calc, ann, etapas }: { calc: RoiProcesso | undefined; ann: number; etapas: EtapaBreakdown[] }) {
  const reA = calc?.custosCategoria.retrabalho ?? 0;
  const reF = calc?.custosCategoriaFicou.retrabalho ?? 0;
  return (
    <>
      <div className="roi-section-head"><h3>Custo da Não-Qualidade</h3><p>Quanto o processo <strong>perde por ano</strong> em retrabalho — no cenário atual e no projetado após melhorias. O <em>driver</em> de cálculo (taxa de retrabalho × custo de pessoas da etapa) é editado em <em> Editar etapas → Métricas</em>.</p></div>
      <div className="roi-kpi-grid">
        <KpiExec label="Retrabalho Atual / Ano" value={formatarMoeda(reA)} formula="= Σ rework_rate × custoPessoas (hoje)" variant="atual" />
        <KpiExec label="Retrabalho Projetado / Ano" value={formatarMoeda(reF)} formula="= Σ rework_rate × custoPessoas (após melhorias)" variant="estimado" />
        <KpiExec label="Economia Projetada / Ano" value={formatarMoeda(Math.max(0, reA - reF))} formula="= atual − projetado" variant="economia" />
      </div>
      <div className="roi-subhead">Perdas por etapa — R$ / ano<span className="roi-subhead-rule" /></div>
      <div className="roi-table-wrap"><table className="roi-table">
        <thead><tr><th>Etapa</th><th>Retrabalho atual</th><th style={{ textAlign: 'right' }}>Retrabalho projetado</th><th style={{ textAlign: 'right' }}>Economia projetada</th></tr></thead>
        <tbody>{etapas.length === 0 ? <tr><td colSpan={4} className="is-empty">Sem etapas cadastradas.</td></tr> : etapas.map(etapa => {
          const retrabA = etapa.custoRetrabExec * ann;
          const retrabF = etapa.custoRetrabExecFicou * ann;
          return <tr key={etapa.id}><td>{etapa.nome}</td><td>{formatarMoeda(retrabA)}</td><td style={{ textAlign: 'right' }}>{formatarMoeda(retrabF)}</td><td style={{ textAlign: 'right' }}><Delta atual={retrabA} ficou={retrabF} fmt={formatarMoeda} /></td></tr>;
        })}</tbody>
      </table></div>
    </>
  );
}
