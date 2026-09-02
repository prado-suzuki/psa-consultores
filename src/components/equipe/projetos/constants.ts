import type { ProcessDraft, ProjectDraft } from '@/components/equipe/projetos/types';

export const PROJECT_FRONTS = [
  { value: 'processo', label: 'Melhoria de Processo' },
  { value: 'automacao', label: 'Automação' },
  { value: 'sistema', label: 'Sistema/Ferramenta' },
  { value: 'integracao', label: 'Integração' },
  { value: 'relatorio', label: 'Relatório/Dashboard' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'capacitacao', label: 'Capacitação' },
  { value: 'outro', label: 'Outro' },
];

export const JUSTIFICATION_TYPES = [
  {
    value: 'financeiro',
    label: 'Economia Financeira',
    description: 'Redução de custos ou aumento de receita',
  },
  { value: 'tempo', label: 'Economia de Tempo', description: 'Redução de horas de trabalho' },
  { value: 'automacao', label: 'Automação', description: 'Eliminação de tarefas manuais' },
  { value: 'qualidade', label: 'Qualidade', description: 'Redução de erros e retrabalho' },
  {
    value: 'comunicacao',
    label: 'Comunicação',
    description: 'Melhoria na comunicação interna/externa',
  },
  {
    value: 'compliance',
    label: 'Compliance',
    description: 'Atendimento a requisitos legais/regulatórios',
  },
  {
    value: 'estrategico',
    label: 'Estratégico',
    description: 'Alinhamento com objetivos estratégicos',
  },
];

export const PROCESS_STAGES = [
  { value: 'discovery', label: 'Descoberta', color: 'bg-muted text-gray-700' },
  { value: 'mapping', label: 'Mapeamento', color: 'bg-blue-100 text-blue-700' },
  { value: 'analysis', label: 'Análise', color: 'bg-purple-100 text-purple-700' },
  { value: 'improvement', label: 'Melhoria', color: 'bg-orange-100 text-orange-700' },
  { value: 'automation', label: 'Automação', color: 'bg-accent/10 text-teal-700' },
  { value: 'completed', label: 'Concluído', color: 'bg-green-100 text-green-700' },
];

/**
 * A etapa, com rótulo e cor, caindo na PRIMEIRA quando o valor não é conhecido.
 *
 * ⚠️ Esse fallback faz etapa desconhecida aparecer como "Descoberta" — mostra um
 * rótulo errado em vez de mostrar que não sabe. Está aqui porque era o que as duas
 * cópias faziam, e trocar isso é decisão de produto, não de consolidação.
 *
 * `getStageBadge`, em `projectPresentation.tsx`, resolve o mesmo caso ao contrário:
 * sem etapa conhecida ele desenha o valor cru num badge `outline`. As duas leituras
 * convivem de propósito até alguém decidir qual é a certa.
 */
export const getProcessStageInfo = (stage: string) =>
  PROCESS_STAGES.find((item) => item.value === stage) || PROCESS_STAGES[0];

export const createEmptyProjectDraft = (): ProjectDraft => ({
  name: '',
  description: '',
  client_name: '',
  external_client_id: '',
  leader_id: '',
  equipe_id: '',
  cluster_id: '',
  product_service: '',
  project_front: '',
  justification_type: '',
  justification_detail: '',
  start_date: '',
  end_date: '',
});

export const createEmptyProcessDraft = (): ProcessDraft => ({
  name: '',
  description: '',
  equipe_id: '',
  stage: 'discovery',
  priority: 'medium',
  frequency: '',
  volume_month: '',
  financial_impact: '',
});
