export interface BoardReportConfig {
  id: string;
  label: string;
  description: string;
  embedUrl: string;
  clusterParamNames?: string[];
}

export const BOARD_REPORTS: BoardReportConfig[] = [
  {
    id: 'clientes-os-projetos',
    label: 'Clientes, OS e Projetos',
    description: 'Dashboard com visao de clientes, ordens de servico e projetos.',
    embedUrl: 'https://datastudio.google.com/embed/reporting/0c5f3a3e-35d4-4e71-ac48-832a1c2bfe51/page/p_ilwof7ab2d',
    clusterParamNames: ['ds108.cluster_id_param'],
  },
  {
    id: 'controle-uso-envio-documentos',
    label: 'Dashboard de controle de uso e envio de documentos',
    description: 'Dashboard com metricas de uso do sistema e envio de documentos.',
    embedUrl: 'https://datastudio.google.com/embed/reporting/dc399d74-18be-453b-814f-f124f18fdb18/page/p_c97l3bpm3d',
    clusterParamNames: ['ds13.cluster_id_param'],
  },
];
