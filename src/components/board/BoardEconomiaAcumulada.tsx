import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import { BoardCard, BoardCardEmpty } from './ui/BoardCard';

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
  <BoardCard
    title="Economia validada acumulada"
    subtitle="Ganho anualizado das melhorias já avaliadas"
  >

    {serie.length > 0 ? (
      <>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={serie}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey="name" {...AXIS_STYLE} />
            <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} {...AXIS_STYLE} />
            <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString('pt-BR')}`} {...TOOLTIP_STYLE} />
            <defs>
              <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.26} />
                <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" fill="url(#roiGrad)" stroke={CHART_COLORS.accent} strokeWidth={2.4} />
          </AreaChart>
        </ResponsiveContainer>

        <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--bd-go-d)' }}>
            Economia: <strong>R${Math.round(economiaAnual / 1000)}k/ano</strong>
          </span>
          <span style={{ color: 'var(--bd-ink3)' }}>
            {/* Sem investimento cadastrado não existe ROI — o rótulo diz isso em vez de mostrar 0. */}
            Investimento: {investimento > 0 ? `R$${Math.round(investimento / 1000)}k` : 'não informado'}
          </span>
          <span style={{ color: 'var(--bd-ink3)' }}>{melhorias} melhorias</span>
        </div>
      </>
    ) : (
      <BoardCardEmpty>Nenhuma melhoria avaliada ainda.</BoardCardEmpty>
    )}
  </BoardCard>
);
