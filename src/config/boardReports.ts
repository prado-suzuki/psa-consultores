export interface BoardReportConfig {
  id: string;
  label: string;
  description: string;
  embedUrl: string;
}

export const BOARD_REPORTS: BoardReportConfig[] = [
  {
    id: 'painel-executivo',
    label: 'Painel executivo',
    description: 'Visao consolidada de clientes, projetos e ordens de servico em um unico painel.',
    embedUrl: 'https://datastudio.google.com/embed/reporting/0c5f3a3e-35d4-4e71-ac48-832a1c2bfe51/page/p_dau13t4i2d',
  },
];
