export interface BoardReportConfig {
  id: string;
  label: string;
  description: string;
  embedUrl: string;
}

export const BOARD_REPORTS: BoardReportConfig[] = [
  {
    id: 'clientes-os-projetos',
    label: 'Dashboard de Clientes, OS e Projetos',
    description: 'Dashboard com visao de clientes, ordens de servico e projetos.',
    embedUrl: 'https://datastudio.google.com/embed/reporting/0c5f3a3e-35d4-4e71-ac48-832a1c2bfe51/page/p_ilwof7ab2d',
  },
];
