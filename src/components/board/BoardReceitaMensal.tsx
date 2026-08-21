import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { BarChart2 } from 'lucide-react';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE } from '@/lib/board-chart-defaults';
import type { MesComparado, ReceitaAno } from '@/lib/boardEstrategico';

interface BoardReceitaMensalProps {
  serie: MesComparado[];
  receita: ReceitaAno;
  nota?: string;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloMes = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1];
const brlCurto = (v: number) => `R$${Math.round(v / 1000).toLocaleString('pt-BR')}k`;
const brlCheio = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

/**
 * Receita contratada mês a mês, com o mesmo mês do ano anterior ao lado.
 *
 * Barras lado a lado (e não uma linha acumulada) porque a pergunta do sócio é
 * "este mês foi melhor que o mesmo mês do ano passado?" — sazonalidade de
 * consultoria tributária torna a comparação mês-contra-mês-anterior enganosa.
 */
export const BoardReceitaMensal: React.FC<BoardReceitaMensalProps> = ({ serie, receita, nota }) => {
  const anoAtual = serie[0]?.mes.slice(0, 4) ?? '';
  const anoAnterior = anoAtual ? String(Number(anoAtual) - 1) : '';
  const temDados = serie.some((m) => m.atual > 0 || m.anterior > 0);

  return (
    <div className="v4-card" data-reveal>
      <div className="v4-card-title" style={{ marginBottom: 4 }}>Receita contratada por mês</div>
      <div style={{ fontSize: 11, color: 'var(--board-v4-ink3)', marginBottom: 10 }}>
        {anoAtual} contra os mesmos meses de {anoAnterior} · por data de início da OS
      </div>

      {temDados ? (
        <>
          <ResponsiveContainer width="100%" height={168}>
            <BarChart data={serie} barCategoryGap="22%">
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="mes" tickFormatter={rotuloMes} {...AXIS_STYLE} />
              <YAxis tickFormatter={(v: number) => (v === 0 ? '0' : brlCurto(v))} {...AXIS_STYLE} />
              <Tooltip
                formatter={(v: number) => brlCheio(v)}
                labelFormatter={(m: string) => `${rotuloMes(m)}/${m.slice(2, 4)}`}
                {...TOOLTIP_STYLE}
              />
              {/* O `wrapperStyle` sozinho não pegava: o Recharts pinta o rótulo
                  de cada item com a cor da SÉRIE, inline, e isso ganha do
                  invólucro. O rótulo "2025" saía em #CBD5E1 (a barra do ano
                  anterior) — 1,48:1, o texto mais ilegível da tela. O
                  `formatter` devolve o rótulo com cor de texto própria; o
                  quadradinho colorido continua fazendo a ligação com a barra,
                  que é o trabalho da legenda. A barra segue #CBD5E1: área
                  grande não precisa do mínimo de texto. */}
              <Legend
                iconType="square"
                iconSize={9}
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                formatter={(value: string) => (
                  <span style={{ color: 'var(--board-v4-ink2)' }}>{value}</span>
                )}
              />
              <Bar dataKey="anterior" name={anoAnterior} fill="#CBD5E1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="atual" name={anoAtual} fill={CHART_COLORS.accent} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 11, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--board-v4-ink2)' }}>
              Acumulado {anoAtual}: <strong>{brlCheio(receita.atual)}</strong>
            </span>
            <span style={{ color: 'var(--board-v4-ink3)' }}>
              {anoAnterior}: {brlCheio(receita.anterior)}
            </span>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>
          <BarChart2 style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />
          Nenhuma OS com data de início nos meses comparados
        </div>
      )}

      {nota && (
        <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)', marginTop: 8, lineHeight: 1.5 }}>
          {nota}
        </div>
      )}
    </div>
  );
};
