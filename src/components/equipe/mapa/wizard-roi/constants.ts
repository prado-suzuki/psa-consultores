import type { CategoriaIcone } from '@/utils/diagnosticoRoi';
import type { RoiIconName } from '@/components/icons/RoiIcons';
import type { Passo } from '@/components/equipe/mapa/wizard-roi/types';

export const PASSOS: { id: Passo; label: string }[] = [
  { id: 1, label: 'Diagnóstico' },
  { id: 2, label: 'Equipe & Horas' },
  { id: 3, label: 'Qualidade' },
  { id: 4, label: 'Sistemas & Invest.' },
  { id: 5, label: 'Prévia & Salvar' },
];

export const CAT_ICON: Record<CategoriaIcone, RoiIconName> = {
  process: 'process',
  team: 'team',
  quality: 'quality',
  system: 'system',
};
