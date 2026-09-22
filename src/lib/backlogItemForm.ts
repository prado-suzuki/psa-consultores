// Estado do formulário de item do backlog (strings, como os inputs devolvem).
export interface BacklogItemForm {
  title: string;
  description: string;
  priority: string;
  estimated_hours: string;
  project_id: string;
  cluster_id: string;
}

export const blankBacklogItemForm = (): BacklogItemForm => ({
  title: '',
  description: '',
  priority: 'medium',
  estimated_hours: '',
  project_id: '',
  cluster_id: '',
});
