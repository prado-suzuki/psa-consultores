// Histórico de medições (baselines de ROI) de um processo — migrado da tela
// de Mapeamento para o Dashboard ROI, onde a análise faz sentido. Lista as
// mensurações salvas em ordem, com o Δ de custo entre uma e a anterior.
// Reusa o visual de tabela do dashboard (dashv2-table) — sem CSS novo.

import { useSnapshots } from '@/hooks/useSnapshots';
import { formatDecimal, formatarMoeda } from '@/utils/format';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';

interface Props {
  processId: string;
  processoNome?: string;
}

export default function HistoricoMedicoes({ processId, processoNome }: Props) {
  const { data: snapshots = [] } = useSnapshots(processId);

  if (snapshots.length === 0) {
    return (
      <p className="dashv2-empty-row" style={{ padding: 16 }}>
        Nenhuma medição salva para {processoNome ? `"${processoNome}"` : 'este processo'}. Abra o
        mapeamento, vá em <strong>"Configurar ROI"</strong> e salve uma baseline.
      </p>
    );
  }

  return (
    <div className="dashv2-table-wrap">
      <table className="dashv2-table">
        <thead>
          <tr>
            <th><Tooltip text={dica('historico.col.quando')}>Quando</Tooltip></th>
            <th><Tooltip text={dica('historico.col.custoAno')}>Custo / ano</Tooltip></th>
            <th><Tooltip text={dica('historico.col.horasAno')}>Horas / ano</Tooltip></th>
            <th><Tooltip text={dica('historico.col.economiaAno')}>Economia / ano</Tooltip></th>
            <th><Tooltip text={dica('historico.col.roi')}>ROI</Tooltip></th>
            <th><Tooltip text={dica('historico.col.payback')}>Payback</Tooltip></th>
            <th><Tooltip text={dica('historico.col.horasLiberadas')}>Horas liberadas</Tooltip></th>
            <th><Tooltip text={dica('historico.col.deltaCusto')}>Δ custo</Tooltip></th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s, i) => {
            const anterior = i > 0 ? snapshots[i - 1] : null;
            const deltaCusto = anterior ? s.annual_cost - anterior.annual_cost : 0;
            const quando = new Date(s.snapshot_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            const deltaCor = deltaCusto < 0 ? '#16a34a' : deltaCusto > 0 ? '#dc2626' : '#64748b';
            return (
              <tr key={s.id}>
                <td>{quando}</td>
                <td>{formatarMoeda(s.annual_cost)}</td>
                <td>{formatDecimal(s.annual_hours, ' h')}</td>
                <td>{formatarMoeda(s.annual_savings)}</td>
                <td>{formatDecimal(s.roi_percent, '%')}</td>
                <td>{formatDecimal(s.payback_months, ' m')}</td>
                <td>{formatDecimal(s.hours_freed, ' h')}</td>
                <td>
                  {anterior
                    ? <span style={{ color: deltaCor, fontWeight: 600 }}>{deltaCusto === 0 ? '—' : formatarMoeda(deltaCusto)}</span>
                    : <span style={{ color: '#94a3b8' }}>baseline</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
