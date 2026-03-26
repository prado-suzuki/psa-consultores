import React from 'react';
import { CountUp } from './CountUp';

interface StatItem {
  value: number | string;
  prefix?: string;
  suffix?: string;
  label: string;
  color: string;
  animateCount?: boolean;
  dots?: { color: string; text: string }[];
  pill?: { text: string; variant: 'up' | 'down' | 'neutral' };
  subText?: string;
  barValue?: number;
  onClick?: () => void;
}

interface BoardStatStripProps {
  items: StatItem[];
  cols?: 4 | 5;
  className?: string;
}

export const BoardStatStrip: React.FC<BoardStatStripProps> = ({ items, cols = 5, className = '' }) => {
  return (
    <div
      className={`stat-strip ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      data-reveal
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="stat-item"
          onClick={item.onClick}
          style={{ cursor: item.onClick ? 'pointer' : undefined }}
        >
          <div className="si-bar" style={{ background: item.color }} />

          <div className="stat-num">
            {typeof item.value === 'number' && item.animateCount !== false ? (
              <CountUp value={item.value} prefix={item.prefix} suffix={item.suffix} />
            ) : (
              <>{item.prefix}{item.value}{item.suffix}</>
            )}
          </div>

          <div className="stat-label">{item.label}</div>

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
      ))}
    </div>
  );
};
