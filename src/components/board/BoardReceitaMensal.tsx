import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { CHART_COLORS, AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, LEGEND_STYLE, BAR_RADIUS } from '@/lib/board-chart-defaults';
import type { MesComparado, ReceitaAno } from '@/lib/boardEstrategico';
import { BoardCard, BoardCardEmpty } from './ui/BoardCard';

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
 *
 * ── O par de cores ───────────────────────────────────────────────────
 * O ano anterior era pintado no #CBD5E1 do Tailwind — um cinza de estoque, que
 * não pertencia a paleta nenhuma e lia como "sem dado". Passou a ser o degrau
 * CLARO do próprio acento (`accentSoft`): duas barras da mesma matiz dizem "é
 * a mesma medida, em outro período", que é exatamente o que o gráfico compara.
 * A separação entre elas vem da luminosidade, que é o canal que sobrevive ao
 * daltonismo — e a legenda continua nomeando os dois anos.
 */
export const BoardReceitaMensal: React.FC<BoardReceitaMensalProps> = ({ serie, receita, nota }) => {
  const anoAtual = serie[0]?.mes.slice(0, 4) ?? '';
  const anoAnterior = anoAtual ? String(Number(anoAtual) - 1) : '';
  const temDados = serie.some((m) => m.atual > 0 || m.anterior > 0);
  const variacao = receita.anterior > 0
    ? ((receita.atual - receita.anterior) / receita.anterior) * 100
    : null;

  return (
    <BoardCard
      title="Receita contratada por mês"
      subtitle={`${anoAtual} contra os mesmos meses de ${anoAnterior} · por data de início da OS`}
      note={nota}
      actions={variacao !== null ? (
        <span className={`pill ${variacao >= 0 ? 'pill-up' : 'pill-down'}`}>
          {variacao >= 0 ? '+' : ''}{variacao.toFixed(1)}% vs {anoAnterior}
        </span>
      ) : undefined}
    >
      {temDados ? (
        <>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={serie} barCategoryGap="26%" margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid {...GRID_STYLE} />
              <XAxis dataKey="mes" tickFormatter={rotuloMes} {...AXIS_STYLE} />
              <YAxis tickFormatter={(v: number) => (v === 0 ? '0' : brlCurto(v))} {...AXIS_STYLE} />
              <Tooltip
                formatter={(v: number) => brlCheio(v)}
                labelFormatter={(m: string) => `${rotuloMes(m)}/${m.slice(2, 4)}`}
                {...TOOLTIP_STYLE}
              />
              {/* O `wrapperStyle` sozinho não pega: o Recharts pinta o rótulo de
                  cada item com a cor da SÉRIE, inline, e isso ganha do
                  invólucro. Foi assim que o rótulo "2025" saiu a 1,48:1 — na
                  cor da barra clara. O `formatter` devolve o rótulo com cor de
                  TEXTO própria; o disco colorido continua fazendo a ligação
                  com a barra, que é o trabalho da legenda. */}
              <Legend
                {...LEGEND_STYLE}
                formatter={(value: string) => (
                  <span style={{ color: 'var(--bd-ink2)' }}>{value}</span>
                )}
              />
              <Bar dataKey="anterior" name={anoAnterior} fill={CHART_COLORS.accentSoft} radius={BAR_RADIUS} />
              <Bar dataKey="atual" name={anoAtual} fill={CHART_COLORS.accent} radius={BAR_RADIUS} />
            </BarChart>
          </ResponsiveContainer>

          <div style={{
            display: 'flex', gap: 22, marginTop: 12, paddingTop: 12, flexWrap: 'wrap',
            borderTop: '1px solid var(--bd-line2)',
          }}>
            <div>
              <div style={{ fontSize: 10.5, color: 'var(--bd-ink3)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600 }}>
                Acumulado {anoAtual}
              </div>
              <div style={{
                fontFamily: "'Instrument Sans', sans-serif", fontSize: 19, fontWeight: 700,
                letterSpacing: '-.03em', color: 'var(--bd-ink)', marginTop: 3, fontVariantNumeric: 'tabular-nums',
              }}>
                {brlCheio(receita.atual)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: 'var(--bd-ink3)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600 }}>
                Mesmo período de {anoAnterior}
              </div>
              <div style={{
                fontFamily: "'Instrument Sans', sans-serif", fontSize: 19, fontWeight: 700,
                letterSpacing: '-.03em', color: 'var(--bd-ink3)', marginTop: 3, fontVariantNumeric: 'tabular-nums',
              }}>
                {brlCheio(receita.anterior)}
              </div>
            </div>
          </div>
        </>
      ) : (
        <BoardCardEmpty>Nenhuma OS com data de início nos meses comparados.</BoardCardEmpty>
      )}
    </BoardCard>
  );
};
