import type { ItemDiagnostico, DiagnosticoRoi } from '@/utils/diagnosticoRoi';
import { Icon } from '@/components/icons/RoiIcons';
import { CategoryCard, RoiDataMap } from '@/components/equipe/mapa/wizard-roi/primitives';

export function StepDiagnostico({ diag, onEditarItem }: { diag: DiagnosticoRoi; onEditarItem: (item: ItemDiagnostico) => void }) {
  return (
    <>
      <div className="roi-section-head">
        <h3>Diagnóstico do mapeamento</h3>
        <p>Cada indicador abaixo identifica <strong>de onde o valor é extraído</strong> e qual métrica do ROI ele alimenta. Itens marcados como <strong>Faltando</strong> bloqueiam o cálculo; itens<strong> Pendentes</strong> precisam de ajuste.</p>
      </div>
      <div className={`roi-callout is-${diag.podeCalcular ? 'ok' : 'warn'}`}>
        <span className="roi-callout-icon"><Icon name={diag.podeCalcular ? 'check' : 'alert'} size={16} /></span>
        <div className="roi-callout-body"><strong>{diag.podeCalcular ? 'Pronto para calcular.' : 'Há campos pendentes.'}</strong>{' '}{diag.resumo}</div>
      </div>
      <div className="roi-subhead">Visão por categoria<span className="roi-subhead-rule" /></div>
      <div className="roi-cat-grid">{diag.categorias.map(cat => <CategoryCard key={cat.id} cat={cat} onItemClick={onEditarItem} />)}</div>
      <div className="roi-subhead">Visão consolidada<span className="roi-subhead-rule" /></div>
      <RoiDataMap categorias={diag.categorias} onItemClick={onEditarItem} />
    </>
  );
}
