import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClusterAgents } from '@/hooks/useTickets';

interface AssignAgentCellProps {
  ticketId: string;
  clusterId: string | null;
  value: string | null;
  onAssign: (ticketId: string, agentId: string | null, agentName: string | null) => void;
}

/**
 * Dropdown de atribuição de responsável em chamados.
 * Lista APENAS membros internos vinculados ao cluster do próprio chamado
 * (via RPC `get_cluster_members`), evitando vazamento entre clusters.
 */
export function AssignAgentCell({ ticketId, clusterId, value, onAssign }: AssignAgentCellProps) {
  const { data: agents = [], isLoading } = useClusterAgents(clusterId);

  const handleChange = (v: string) => {
    if (v === 'none') {
      onAssign(ticketId, null, null);
      return;
    }
    const agent = agents.find((a) => a.id === v);
    const agentName = agent ? `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() : null;
    onAssign(ticketId, v, agentName);
  };

  return (
    <Select value={value || 'none'} onValueChange={handleChange}>
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder={isLoading ? 'Carregando...' : 'Atribuir'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Não atribuído</SelectItem>
        {!clusterId && (
          <SelectItem value="__no_cluster" disabled>
            Sem cluster definido
          </SelectItem>
        )}
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.first_name} {agent.last_name}
          </SelectItem>
        ))}
        {clusterId && !isLoading && agents.length === 0 && (
          <SelectItem value="__empty" disabled>
            Nenhum membro neste cluster
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
