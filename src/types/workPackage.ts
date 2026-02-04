// Work Package Types and Enums

export type WorkPackageType = 'fase' | 'tarefa' | 'epico';
export type WorkPackageStatus = 'novo' | 'pendente_agendamento' | 'agendado' | 'em_progresso' | 'em_revisao' | 'concluido' | 'rejeitado';
export type WorkPackagePriority = 'alta' | 'normal' | 'baixa';
export type WorkPackageArea = 'fiscal' | 'osg' | 'fixos' | 'pontuais';
export type WorkPackageStage = 'solicitacao_documentos' | 'analise_documentacao' | 'elaboracao_wp' | 'elaboracao_relatorios' | 'entrega_cliente' | 'conclusao';
export type WorkPackageRelationType = 'filho' | 'relacionado' | 'anterior' | 'sucessor' | 'pai' | 'duplicado';
export type WorkPackageActivityType = 'status_change' | 'assignment' | 'comment' | 'file_upload' | 'relation_change' | 'field_update' | 'created';

export interface WorkPackage {
  id: string;
  code: number;
  title: string;
  description: string | null;
  type: WorkPackageType;
  status: WorkPackageStatus;
  priority: WorkPackagePriority;
  assigned_to: string | null;
  responsible: string | null;
  parent_id: string | null;
  project_id: string | null;
  client_id: string | null;
  area: WorkPackageArea;
  estimated_hours: number | null;
  spent_hours: number | null;
  remaining_hours: number | null;
  completion_percent: number | null;
  start_date: string | null;
  due_date: string | null;
  stage: WorkPackageStage | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_to_profile?: { first_name: string; last_name: string } | null;
  responsible_profile?: { first_name: string; last_name: string } | null;
  parent?: { id: string; code: number; title: string } | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; name: string; color: string | null } | null;
  children?: WorkPackage[];
}

export interface WorkPackageActivity {
  id: string;
  work_package_id: string;
  user_id: string | null;
  action_type: WorkPackageActivityType;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  comment: string | null;
  created_at: string;
  user?: { first_name: string; last_name: string } | null;
}

export interface WorkPackageRelation {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: WorkPackageRelationType;
  created_by: string | null;
  created_at: string;
  source?: { id: string; code: number; title: string; type: WorkPackageType; status: WorkPackageStatus } | null;
  target?: { id: string; code: number; title: string; type: WorkPackageType; status: WorkPackageStatus } | null;
}

export interface WorkPackageFile {
  id: string;
  work_package_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
  uploader?: { first_name: string; last_name: string } | null;
}

export interface WorkPackageWatcher {
  id: string;
  work_package_id: string;
  user_id: string;
  created_at: string;
  user?: { first_name: string; last_name: string; email: string | null } | null;
}

// Status labels and colors
export const STATUS_CONFIG: Record<WorkPackageStatus, { label: string; color: string; bgColor: string }> = {
  novo: { label: 'Novo', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  pendente_agendamento: { label: 'Pendente agendamento', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  agendado: { label: 'Agendado', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  em_progresso: { label: 'Em progresso', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  em_revisao: { label: 'Em revisão', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  concluido: { label: 'Concluído', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejeitado: { label: 'Rejeitado', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export const TYPE_CONFIG: Record<WorkPackageType, { label: string; color: string; bgColor: string }> = {
  fase: { label: 'FASE', color: 'text-violet-700', bgColor: 'bg-violet-100' },
  tarefa: { label: 'TAREFA', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  epico: { label: 'ÉPICO', color: 'text-amber-700', bgColor: 'bg-amber-100' },
};

export const PRIORITY_CONFIG: Record<WorkPackagePriority, { label: string; color: string; icon: string }> = {
  alta: { label: 'Alta', color: 'text-red-600', icon: '🔴' },
  normal: { label: 'Normal', color: 'text-yellow-600', icon: '🟡' },
  baixa: { label: 'Baixa', color: 'text-green-600', icon: '🟢' },
};

export const AREA_CONFIG: Record<WorkPackageArea, { label: string; color: string }> = {
  fiscal: { label: 'Fiscal', color: 'text-emerald-600' },
  osg: { label: 'OSG', color: 'text-orange-600' },
  fixos: { label: 'Fixos', color: 'text-blue-600' },
  pontuais: { label: 'Pontuais', color: 'text-purple-600' },
};

export const STAGE_CONFIG: Record<WorkPackageStage, { label: string; order: number }> = {
  solicitacao_documentos: { label: 'Solicitação de documentos', order: 1 },
  analise_documentacao: { label: 'Análise de documentação', order: 2 },
  elaboracao_wp: { label: 'Elaboração de WP', order: 3 },
  elaboracao_relatorios: { label: 'Elaboração de relatórios', order: 4 },
  entrega_cliente: { label: 'Entrega ao cliente', order: 5 },
  conclusao: { label: 'Conclusão', order: 6 },
};

export const RELATION_TYPE_CONFIG: Record<WorkPackageRelationType, { label: string; icon: string }> = {
  filho: { label: 'Filho', icon: '↳' },
  relacionado: { label: 'Relacionado a', icon: '↔' },
  anterior: { label: 'Anterior (antes)', icon: '←' },
  sucessor: { label: 'Sucessor (depois)', icon: '→' },
  pai: { label: 'Pai', icon: '↑' },
  duplicado: { label: 'Duplicado', icon: '⊜' },
};
