// Rótulos compartilhados entre as abas de Auditoria (Histórico, Produtividade,
// Atividade e Pessoas).
//
// As janelas do seletor de período moraram aqui até virarem cálculo de datas:
// agora são `periodosAuditoria` / `janelaDoPeriodo`, em `@/lib/auditPeriodos`.

export const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'Criação', color: 'bg-emerald-100 text-emerald-700' },
  updated: { label: 'Edição', color: 'bg-blue-100 text-blue-700' },
  deleted: { label: 'Exclusão', color: 'bg-red-100 text-red-700' },
};

export const ENTITY_LABELS: Record<string, string> = {
  project: 'Projeto',
  task: 'Tarefa',
  subtask: 'Subtarefa',
  solicitacao_item_nao_aplicavel: 'Documento não aplicável',
};
