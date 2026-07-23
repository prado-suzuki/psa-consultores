import type { ProjetoStatus } from '@/types';

export type DashboardRoiAba = 'sumario' | 'mapeamento' | 'diagnostico' | 'melhorias' | 'futuro' | 'evolucao';
export type DashboardRoiFiltroMaturidade = '' | 'mapeado' | 'diagnosticado' | 'futuro' | 'implementado';

export const DASHBOARD_ROI_STATUS_ORDEM: ProjetoStatus[] = ['Mapeamento', 'Diagnóstico', 'Melhorias', 'ROI'];
export const DASHBOARD_ROI_ABA_STATUS_MIN: Record<DashboardRoiAba, ProjetoStatus> = {
  mapeamento: 'Mapeamento', diagnostico: 'Diagnóstico', melhorias: 'Melhorias',
  futuro: 'Melhorias', evolucao: 'Melhorias', sumario: 'Mapeamento',
};
export const DASHBOARD_ROI_MATURIDADE_OPCOES: { value: DashboardRoiFiltroMaturidade; label: string }[] = [
  { value: '', label: 'Todas as fases' }, { value: 'mapeado', label: 'Mapeado' },
  { value: 'diagnosticado', label: 'Diagnosticado' }, { value: 'futuro', label: 'Com cenário futuro' },
  { value: 'implementado', label: 'Implementado' },
];
export const DASHBOARD_ROI_ABAS: { id: DashboardRoiAba; label: string; numero: string; subtitulo: string }[] = [
  { id: 'sumario', label: 'Sumário Executivo', numero: '1', subtitulo: 'A história em um olhar' },
  { id: 'mapeamento', label: 'O Mapeamento', numero: '2', subtitulo: 'Escopo analisado' },
  { id: 'diagnostico', label: 'Diagnóstico', numero: '3', subtitulo: 'Como era — dores e custos' },
  { id: 'melhorias', label: 'As Melhorias', numero: '4', subtitulo: 'Plano de ação e investment' },
  { id: 'futuro', label: 'Cenário Futuro', numero: '5', subtitulo: 'Como ficará — estado projetado' },
  { id: 'evolucao', label: 'Evolução', numero: '6', subtitulo: 'Realizado vs Potencial' },
];

export const dashboardRoiFmtBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
export const dashboardRoiFmtNum = (value: number, digits = 1) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const dashboardRoiFmtPct = (value: number) => `${dashboardRoiFmtNum(value, 1)}%`;
export const dashboardRoiFmtPlain = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
export const dashboardRoiDelta = (atual: number, futuro: number) => atual - futuro;
export const dashboardRoiDeltaPct = (atual: number, futuro: number) => atual > 0 ? ((atual - futuro) / atual) * 100 : 0;
