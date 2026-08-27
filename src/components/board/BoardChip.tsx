import React from 'react';

type ChipVariant = 'risk' | 'warn' | 'go' | 'blue' | 'purple' | 'cyan' | 'gy' | 'solid'
  | 'ppr-s' | 'ppr-a' | 'ppr-p' | 'ppr-b'
  | 'tax' | 'osg' | 'dev';

interface BoardChipProps {
  variant: ChipVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_MAP: Record<ChipVariant, string> = {
  risk: 'chip-risk',
  warn: 'chip-warn',
  go: 'chip-go',
  blue: 'chip-blue',
  purple: 'chip-purple',
  cyan: 'chip-cyan',
  gy: 'chip-gy',
  /** Chip cheio no acento escuro, com texto branco — para o estado ATIVO de um
   *  recorte (empresa selecionada, filtro aplicado), onde o tint não basta. */
  solid: 'chip-solid',
  'ppr-s': 'chip-ppr-s',
  'ppr-a': 'chip-ppr-a',
  'ppr-p': 'chip-ppr-p',
  'ppr-b': 'chip-ppr-b',
  tax: 'chip-blue',
  osg: 'chip-go',
  dev: 'chip-purple',
};

export const BoardChip: React.FC<BoardChipProps> = ({ variant, children, className = '' }) => {
  return <span className={`board-v4-chip ${VARIANT_MAP[variant]} ${className}`}>{children}</span>;
};
