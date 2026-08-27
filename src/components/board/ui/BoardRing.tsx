import React from 'react';

interface BoardRingProps {
  /** 0 a 100. Acima de 100 o anel fecha (não vaza para uma segunda volta). */
  pct: number;
  /** Diâmetro externo em px. */
  size?: number;
  /** Espessura do traço. */
  stroke?: number;
  /** Cor do arco. Token, nunca hexadecimal. */
  color?: string;
  /** Texto grande no centro. Sem ele, o anel fica só como indicador. */
  value?: React.ReactNode;
  /**
   * Rótulo minúsculo embaixo do valor (ex.: "no prazo"). SÓ é renderizado em
   * anel de 72px ou mais: em 58px ele é mais largo que o próprio anel e vazava
   * por cima da borda do cartão — foi o que apareceu na primeira olhada da
   * usuária no Estratégico. Em anel pequeno, o rótulo pertence ao `subText` do
   * cartão, que tem a largura toda para ele.
   */
  label?: string;
  /** Lido por leitor de tela — o anel é decorativo por si só. */
  title?: string;
}

/**
 * Anel de proporção — a forma que a referência usa para "X de Y".
 *
 * Quando usar anel e quando usar barra:
 *
 * - ANEL responde "quanto de um todo", num número só, e ocupa canto de card
 *   (é o KPI de pontualidade, de preenchimento, de meta do ciclo);
 * - BARRA responde "quem é maior", em lista, porque barras alinhadas na mesma
 *   base se comparam entre si e anéis não.
 *
 * Por isso o ranking (concentração da carteira, projetos críticos) continua em
 * barra: trocar por anel ali destruiria a comparação, que é o ponto do bloco.
 *
 * O arco começa às 12h (`rotate(-90deg)`, no CSS) e cresce no sentido do
 * relógio. `strokeDasharray`/`strokeDashoffset` vão inline porque dependem do
 * perímetro, que depende do raio — não há como deixá-los no CSS.
 */
export const BoardRing: React.FC<BoardRingProps> = ({
  pct, size = 62, stroke = 6, color = 'var(--bd-accent)', value, label, title,
}) => {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const offset = len * (1 - clamped / 100);

  return (
    <div className="v4-ring-wrap" style={{ width: size, height: size }}>
      <svg className="v4-ring" width={size} height={size} role="img" aria-label={title ?? `${Math.round(clamped)}%`}>
        <circle className="v4-ring-bg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="v4-ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke={color}
          strokeDasharray={len}
          strokeDashoffset={offset}
        />
      </svg>
      {(value !== undefined || (label && size >= 72)) && (
        <div className="v4-ring-val">
          {value !== undefined && (
            <span className="v4-ring-num" style={{ fontSize: Math.round(size * 0.29) }}>{value}</span>
          )}
          {label && size >= 72 && <span className="v4-ring-lbl">{label}</span>}
        </div>
      )}
    </div>
  );
};
