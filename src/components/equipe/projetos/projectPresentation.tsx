import { Badge } from '@/components/ui/badge';
import { PROCESS_STAGES } from '@/components/equipe/projetos/constants';

export const extractPriority = (description: string | null): string => {
  if (!description) return '-';
  const match = description.match(/Prioridade:\s*([^|]+)/);
  return match ? match[1].trim() : '-';
};

export const extractPhase = (description: string | null): string => {
  if (!description) return '-';
  const match = description.match(/Fase:\s*([^|]+)/);
  return match ? match[1].trim() : '-';
};

export const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Ativo</Badge>;
    case 'completed':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Concluído</Badge>;
    case 'blocked':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Bloqueado</Badge>;
    case 'archived':
      return <Badge className="bg-status-neutro-soft text-status-neutro hover:bg-status-neutro-soft">Arquivado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const getPriorityBadge = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'crítica':
    case 'urgent':
    case 'high':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Alta</Badge>;
    case 'alta':
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Alta</Badge>;
    case 'média':
    case 'medium':
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Média</Badge>;
    case 'baixa':
    case 'low':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Baixa</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
};

export const getAreaBadge = (area: string) => {
  const colors: Record<string, string> = {
    Consultoria: 'bg-purple-100 text-purple-700',
    Fiscal: 'bg-blue-100 text-blue-700',
    Fixos: 'bg-teal-100 text-teal-700',
    'Fixos/Previdenciário': 'bg-indigo-100 text-indigo-700',
  };
  const colorClass = colors[area] || 'bg-gray-100 text-gray-700';
  return <Badge className={`${colorClass} hover:${colorClass}`}>{area}</Badge>;
};

export const getStageBadge = (stage: string) => {
  const stageConfig = PROCESS_STAGES.find((item) => item.value === stage);
  if (!stageConfig) return <Badge variant="outline">{stage}</Badge>;
  return <Badge className={stageConfig.color}>{stageConfig.label}</Badge>;
};
