// Rótulos compartilhados entre as abas de Auditoria (Histórico, Produtividade,
// Atividade e Pessoas).
//
// As janelas do seletor de período moraram aqui até virarem cálculo de datas:
// agora são `periodosAuditoria` / `janelaDoPeriodo`, em `@/lib/auditPeriodos`.

export const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'Criação', color: 'bg-status-feito-soft text-status-feito' },
  updated: { label: 'Edição', color: 'bg-status-andamento-soft text-status-andamento' },
  deleted: { label: 'Exclusão', color: 'bg-status-ajuste-soft text-status-ajuste' },
};

export const ENTITY_LABELS: Record<string, string> = {
  project: 'Projeto',
  task: 'Tarefa',
  subtask: 'Subtarefa',
  solicitacao_item_nao_aplicavel: 'Documento não aplicável',
};
