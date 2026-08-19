import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart2 } from 'lucide-react';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';

export interface PontoRoi {
  name: string;
  value: number;
}

interface BoardEconomiaAcumuladaProps {
  serie: PontoRoi[];
  economiaAnual: number;
  investimento: number;
  melhorias: number;
}

/**
 * Economia validada acumulada — o retorno das melhorias de processo.
 *
 * É o outro lado da receita: dinheiro que a empresa deixou de gastar. Fica ao
 * lado do gráfico de receita porque as duas curvas juntas são o resultado
 * econômico do ano; separadas, viram dois relatórios.
 */
export const BoardEconomiaAcumulada: React.FC<BoardEconomiaAcumuladaProps> = ({
  serie,
  economiaAnual,
  investimento,
  melhorias,
}) => (
  <div className="v4-card" data-reveal>
    <div className="v4-card-title" style={{ marginBottom: 4 }}>Economia validada acumulada</div>
    <div style={{ fontSize: 11, color: 'var(--board-v4-ink3)', marginBottom: 10 }}>
      Ganho anualizado das melhorias já avaliadas
    </div>

    {serie.length > 0 ? (
      <>
        <ResponsiveContainer width="100%" height={168}>
          <AreaChart data={serie}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="name" {...AXIS_STYLE} />
            <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} {...AXIS_STYLE} />
            <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} {...TOOLTIP_STYLE} />
            <defs>
              <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.osg} stopOpacity={0.22} />
                <stop offset="100%" stopColor={CHART_COLORS.osg} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" fill="url(#roiGrad)" stroke={CHART_COLORS.osg} strokeWidth={2.2} />
          </AreaChart>
        </ResponsiveContainer>

        <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--board-v4-go)' }}>
            Economia: <strong>R${Math.round(economiaAnual / 1000)}k/ano</strong>
          </span>
          <span style={{ color: 'var(--board-v4-ink3)' }}>
            {/* Sem investimento cadastrado não existe ROI — o rótulo diz isso em vez de mostrar 0. */}
            Investimento: {investimento > 0 ? `R$${Math.round(investimento / 1000)}k` : 'não informado'}
          </span>
          <span style={{ color: 'var(--board-v4-ink3)' }}>{melhorias} melhorias</span>
        </div>
      </>
    ) : (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>
        <BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />
        Nenhuma melhoria avaliada ainda
      </div>
    )}
  </div>
);
