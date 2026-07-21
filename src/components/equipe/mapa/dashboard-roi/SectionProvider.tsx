import type { PropsWithChildren } from 'react';
import { DashboardRoiContext, type DashboardRoiSectionModel } from '@/components/equipe/mapa/dashboard-roi/SectionContext';

export function DashboardRoiSectionProvider({ children, value }: PropsWithChildren<{ value: DashboardRoiSectionModel }>) {
  return <DashboardRoiContext.Provider value={value}>{children}</DashboardRoiContext.Provider>;
}
