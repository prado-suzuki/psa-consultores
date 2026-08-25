import React from 'react';
import { CountUp } from './CountUp';
import { BoardRing } from './ui/BoardRing';

interface StatItem {
  value: number | string;
  prefix?: string;
  suffix?: string;
  label: string;
  /** Token da cor de acento do cartão (anel, ícone, barra). */
  color: string;
  animateCount?: boolean;
  dots?: { color: string; text: string }[];
  pill?: { text: string; variant: 'up' | 'down' | 'neutral' };
  subText?: string;
  barValue?: number;
  onClick?: () => void;
  /**
   * Ícone do canto — recebe o tint do `color` como fundo, no lugar da faixa
   * de 3px que a v4 punha no topo do cartão.
   */
  icon?: React.ComponentType<{ style?: React.CSSProperties }>;
  /**
   * Anel de proporção no canto (0–100). Só para o que É proporção; número
   * absoluto com anel mente sobre o denominador.
   *
   * O anel é um MEDIDOR: ele não repete o número por dentro. A primeira versão
   * escrevia "54%" no centro do anel ao lado do "54%" grande do cartão — o
   * mesmo dado duas vezes, a 2cm de distância. `mostrarValor` existe para o
   * caso em que o anel aparece SEM o número grande do lado.
   */
  ring?: { pct: number; label?: string; title?: string; mostrarValor?: boolean };
  /** Cartão de destaque: fundo tingido no acento. Um por faixa, no máximo. */
  hero?: boolean;
}

interface BoardStatStripProps {
  items: StatItem[];
  cols?: 3 | 4 | 5 | 6;
  className?: string;
}

/**
 * A faixa de KPIs do Board.
 *
 * Deixou de ser uma "strip" — uma caixa só com divisórias verticais — e virou
 * uma GRADE de cartões, que é o que a referência usa. Três consequências
 * práticas, e é por elas que a mudança valeu:
 *
 * 1. cada número passa a ter borda e sombra próprias, então a leitura é
 *    "seis coisas", não "uma tabela sem cabeçalho";
 * 2. dá para destacar UM cartão (`hero`) sem quebrar o alinhamento dos outros;
 * 3. em tela estreita a grade quebra em duas colunas em vez de comprimir seis
 *    números até o número encostar no rótulo.
 *
 * `cols` vira `data-cols`, e o CSS escolhe uma contagem de colunas que DIVIDE o
 * número de itens: 2 no estreito, 3 no médio, `cols` quando há largura de sobra.
 * A primeira versão usava `auto-fit`, que com seis itens cabia cinco na largura
 * de um notebook e deixava o sexto órfão numa segunda linha — foi o primeiro
 * defeito que a usuária viu ao abrir a tela.
 */
export const BoardStatStrip: React.FC<BoardStatStripProps> = ({ items, cols = 5, className = '' }) => {
  return (
    <div className={`stat-strip ${className}`} data-cols={cols} data-reveal>
      {items.map((item, i) => {
        const Icone = item.icon;
        return (
          <div
            key={i}
            className={`stat-item${item.hero ? ' stat-item-hero' : ''}`}
            onClick={item.onClick}
            onKeyDown={item.onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.onClick?.(); } } : undefined}
            role={item.onClick ? 'button' : undefined}
            tabIndex={item.onClick ? 0 : undefined}
            data-clickable={item.onClick ? 'true' : undefined}
          >
            <div className="stat-head">
              <div style={{ minWidth: 0 }}>
                <div className="stat-label">{item.label}</div>
                <div className="stat-num">
                  {typeof item.value === 'number' && item.animateCount !== false ? (
                    <CountUp value={item.value} prefix={item.prefix} suffix={item.suffix} />
                  ) : (
                    <>{item.prefix}{item.value}{item.suffix}</>
                  )}
                </div>
              </div>

              {item.ring ? (
                <BoardRing
                  pct={item.ring.pct}
                  color={item.color}
                  size={54}
                  stroke={6}
                  value={item.ring.mostrarValor ? `${Math.round(item.ring.pct)}%` : undefined}
                  title={item.ring.title}
                />
              ) : Icone ? (
                <div className="stat-icon" style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)` }}>
                  <Icone style={{ width: 16, height: 16, color: item.color }} />
                </div>
              ) : null}
            </div>

            {item.dots && item.dots.length > 0 && (
              <div className="stat-dots">
                {item.dots.map((d, j) => (
                  <div key={j} className="sdot">
                    <span className="sdot-c" style={{ background: d.color }} />
                    {d.text}
                  </div>
                ))}
              </div>
            )}

            {item.pill && (
              <span className={`pill pill-${item.pill.variant}`}>{item.pill.text}</span>
            )}

            {item.subText && <div className="stat-sub">{item.subText}</div>}

            {item.barValue !== undefined && (
              <div className="stat-bar">
                <div className="pb" style={{ width: `${item.barValue}%`, background: item.color }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
