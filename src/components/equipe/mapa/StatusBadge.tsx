import type { ReactNode } from 'react';

export type StatusVariant =
  | 'mapping'
  | 'diagnostic'
  | 'improvement'
  | 'roi'
  | 'neutral'
  | 'accent';

interface StatusBadgeProps {
  /** Variante semântica (mapeia para cor/background). */
  variant?: StatusVariant;
  /**
   * Status textual livre. Se informado e `variant` for omitido,
   * inferimos a variante a partir do nome (Mapeamento, Diagnóstico, Melhorias, ROI).
   */
  status?: string;
  /** Conteúdo do badge. Se omitido, usa `status`. */
  children?: ReactNode;
  /** Classes adicionais. */
  className?: string;
}

const STATUS_VARIANT_MAP: Record<string, StatusVariant> = {
  mapeamento: 'mapping',
  diagnostico: 'diagnostic',
  'diagnóstico': 'diagnostic',
  melhorias: 'improvement',
  roi: 'roi',
};

function inferVariant(status?: string): StatusVariant {
  if (!status) return 'neutral';
  const key = status.toLowerCase().trim();
  return STATUS_VARIANT_MAP[key] ?? 'neutral';
}

/**
 * Badge unificado de status. Centraliza cores/tamanhos para chips de status,
 * cluster, contagem etc. Substitui inline styles esparsos com `.status-badge`.
 */
export default function StatusBadge({
  variant,
  status,
  children,
  className,
}: StatusBadgeProps) {
  const v = variant ?? inferVariant(status);
  const cls = `status-badge-v2 variant-${v}${className ? ` ${className}` : ''}`;
  return <span className={cls}>{children ?? status}</span>;
}
