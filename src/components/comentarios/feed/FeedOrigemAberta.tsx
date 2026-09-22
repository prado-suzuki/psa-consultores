import { useEffect, useMemo, useRef } from 'react';

import { TaskModal } from '@/components/equipe/fiscal/tasks/TaskModal';
import { ProjetoDeleteDialog } from '@/components/equipe/projetos-cadastro/ProjetoDeleteDialog';
import { ProjetoDialog } from '@/components/equipe/projetos-cadastro/ProjetoDialog';
import { ProjetosCadastroContext } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';
import type { OrgCommentEntityType } from '@/hooks/useDomainOrgComments';
import { useOrgProjects } from '@/hooks/useOrgProjects';
import { useOrgTaskById, useOrgTasks, type OrgTask } from '@/hooks/useOrgTasks';
import { useProjetosCadastroController } from '@/hooks/useProjetosCadastroController';
import { useClusterIdByPageCategory, useTeamMembersForTasks } from '@/hooks/useTaxReferenceData';
import type { AreaDeProjetos } from '@/lib/feedComentarios';

export interface OrigemAberta {
  tipo: OrgCommentEntityType;
  id: string;
}

interface FeedOrigemAbertaProps {
  origem: OrigemAberta | null;
  area: AreaDeProjetos;
  onFechar: () => void;
}

/**
 * Abre a tarefa ou o projeto de um bloco do feed por cima do próprio feed, com
 * os mesmos modais do painel de projetos e tarefas. Só monta os controllers
 * enquanto há origem aberta: o de projeto baixa a carteira inteira.
 */
export function FeedOrigemAberta({ origem, area, onFechar }: FeedOrigemAbertaProps) {
  if (!origem) return null;
  return origem.tipo === 'org_project' ? (
    <ProjetoAberto key={origem.id} projetoId={origem.id} area={area} onFechar={onFechar} />
  ) : (
    <TarefaAberta key={origem.id} tarefaId={origem.id} area={area} onFechar={onFechar} />
  );
}

function ProjetoAberto({
  projetoId,
  area,
  onFechar,
}: {
  projetoId: string;
  area: AreaDeProjetos;
  onFechar: () => void;
}) {
  const controller = useProjetosCadastroController(area);
  // Lista crua, e não `controller.projects`: aquela é recortada pelo cluster da
  // área, e o feed mostra projetos das duas áreas.
  const { data: todosOsProjetos = [] } = useOrgProjects();
  const abriuRef = useRef(false);
  const abrirRef = useRef(controller.handleOpenModal);
  abrirRef.current = controller.handleOpenModal;

  useEffect(() => {
    if (abriuRef.current) return;
    const projeto = todosOsProjetos.find((item) => item.id === projetoId);
    if (!projeto) return;
    abriuRef.current = true;
    abrirRef.current(projeto);
  }, [todosOsProjetos, projetoId]);

  useEffect(() => {
    if (abriuRef.current && !controller.isModalOpen && !controller.deleteProjectId) onFechar();
  }, [controller.isModalOpen, controller.deleteProjectId, onFechar]);

  return (
    <ProjetosCadastroContext.Provider value={controller}>
      <ProjetoDialog />
      <ProjetoDeleteDialog />
    </ProjetosCadastroContext.Provider>
  );
}

function TarefaAberta({
  tarefaId,
  area,
  onFechar,
}: {
  tarefaId: string;
  area: AreaDeProjetos;
  onFechar: () => void;
}) {
  const { data: tarefa } = useOrgTaskById(tarefaId);
  const { data: clusterId } = useClusterIdByPageCategory(area);
  const { data: teamMembers = [] } = useTeamMembersForTasks(clusterId ?? undefined);

  if (!tarefa) return null;
  const props = { tarefa, area, teamMembers, onFechar };
  return tarefa.project_id ? (
    <ModalDeTarefaDeProjeto {...props} projetoId={tarefa.project_id} />
  ) : (
    <ModalDeTarefa {...props} tarefasMae={[]} />
  );
}

interface ModalDeTarefaProps {
  tarefa: OrgTask;
  area: AreaDeProjetos;
  teamMembers: { id: string; name: string }[];
  onFechar: () => void;
}

/**
 * O modal valida o prazo contra a tarefa-mãe e oferece as mães do projeto: sem
 * esta lista, uma subtarefa abriria sem a mãe selecionável.
 */
function ModalDeTarefaDeProjeto({ projetoId, ...props }: ModalDeTarefaProps & { projetoId: string }) {
  const { data: tarefasDoProjeto = [] } = useOrgTasks({ projectId: projetoId });
  const tarefasMae = useMemo(
    () => tarefasDoProjeto.filter((item) => !item.parent_task_id),
    [tarefasDoProjeto],
  );
  return <ModalDeTarefa {...props} tarefasMae={tarefasMae} />;
}

function ModalDeTarefa({
  tarefa,
  area,
  teamMembers,
  onFechar,
  tarefasMae,
}: ModalDeTarefaProps & { tarefasMae: OrgTask[] }) {
  return (
    <TaskModal
      open
      onOpenChange={(aberto) => {
        if (!aberto) onFechar();
      }}
      task={tarefa}
      area={area}
      teamMembers={teamMembers}
      parentTasks={tarefasMae}
    />
  );
}
